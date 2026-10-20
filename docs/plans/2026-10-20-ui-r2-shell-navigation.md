# UI R2 — shell, navigation, overview and operator attention

- **Date:** 2026-10-20
- **Base:** `4d461fb0`, branch `plan/ui-r2`, integration target `redesign`.
- **Contract:** [UI redesign](../specs/2026-10-20-ui-redesign-design.md), especially §§4, 5.1–5.2, 8–10; R1's [handoff](2026-10-20-ui-r1-tokens-appearance.md#after-this-plan).
- **Method:** build source first, embed exact task patches, extract and replay them sequentially onto the base, then compare implementation bytes. Code wins over task prose.

## Execution status (2026-10-20)

Implementation complete on `plan/ui-r2`, based on `4d461fb0`. Task 1 is `51fb8a4a`; Task 2 is `3bc3ea4`. Source-only staged tree: `4df9244336f0e41439b7b7e71fca67f1dbd1b86c`. Independent task and whole-branch reviews are **requested, not yet performed**; the parent owns PR creation, checks, reviewDecision, mergeStateStatus, unresolved threads, index integration and release approval. No GitHub action was taken by this lane.

| Verification | Actual result |
|---|---|
| Frozen web install | Exit 0; lock and dependencies unchanged |
| Baseline web tests | Exit 0; 2,095 tests, 113 files |
| Final replay typecheck / tests / build | Each exit 0; 2,134 tests, 119 files; 3 emitted-CSS guard tests; 2 CSS assets same-origin |
| Final replay embedded binary/testkit build | Exit 0 |
| Final replay full E2E | Exit 0; 107 passed, 11 pre-existing skipped, 4.1 minutes; real-producer click cases pass at 390 / 1280 px |
| Rust format, workspace/all-target clippy, hennery clippy | Each exit 0 |
| Protocol and view generator checks | Each exit 0 |
| Workspace Rust tests | 2,665 passed, 8 ignored, 171 successful unit/integration suites; command exit 1 at the later doctest compilation stage because a concurrent web rebuild removed previously embedded hashed assets |
| Stable-dist doc recovery | `HENNERY_WEB_DIST="$PWD/web/dist" cargo test --workspace --locked --doc`: exit 0, 9 doc suites (0 examples); completes the failed stage without repeating the full workspace run |
| Final concurrency load | 4 processes × 3 rounds, 12/12 exit 0, 49 tests per run (588 executions); query/preview/queue concurrency only |
| Removal probes | All 47 detected, each mutation exit 1; restored source matches all 58 implementation paths |
| Embedded plan proof | Four nonempty patches with 9 / 53 / 5 / 2 file diffs; sequential base replay; all 1,028 tracked files match before and after final gates. Final normalized-context patch index also equals the source tree above |

Evidence lives in `.superpowers/sdd/ui-r2/`: `replay-complete*.log`, `replay-result.json`, `plan-index-verification.json`, `rust-*.log`, `current-gates.exit`, `probe-logs/results.json`, `final-probe.log`, `availability-probe.log`, `defaults-probes.log`, `freshness-probe.log`, `load-final.log`, and `load-logs/`. The single fresh replay is `replay-1`, with amendments applied there sequentially; `probes-1` holds the restored removal/load copy. Both were APFS-cloned before builds. Target cleanup was attempted with Cargo and refused (exit 101): `missing or invalid CACHEDIR.TAG file`. The original and both APFS-cloned targets lack that marker. No safety marker was fabricated and no deletion workaround was used. Parent cleanup is required for `probes-1` (27 GB logical target) and `replay-1` (30 GB logical target); the lane target is 21 GB logical. APFS shared extents make these logical sizes different from additional disk use.

The first full browser run was 105 passed, 2 failed, 11 existing skipped. Both failures exposed the hidden mobile family attention count. The compact Needs you link fixed that behavior; unchanged family assertions pass in the final suite. Later code-first refinements covered disabled command availability, Defaults capability gating and changed status-only preview reasons; each has a regression and removal probe. Intermediate replay comparisons correctly rejected source drift while these refinements were being built; final equality is the acceptance result. An ignored-but-tracked `.envrc` was explicitly added to the replay's private index before comparing its source tree.

**Visual acceptance:** 104 ignored PNGs in `.superpowers/sdd/ui-r2/screenshots/`, indexed individually against prototype names in `screenshots.md` beside that directory. Both 390 × 844 and 1280 × 900, light/dark; desktop-only collapsed rail and mobile-only filters. Families: overview-hat, overview-host, overview-collapsed, overview-filters, needs-you-populated, needs-you-empty, more, defaults-placeholder, new-session-frame, not-found, gateway-unavailable, gateway-more; existing appearance fixtures also cover sessions, session-permission, new-session, hosts, hats, MCP, Settings, login/setup, confirmation, step-up and typography. Representative PNGs were visually inspected; all captures are browser-asserted and available for parent review.

**Intentional prototype adaptations:** hat-derived accent; no logo; read-only canonical queue actions; real loaded/complete counts; omit unavailable snippets/progress; native tokenized filters; compact mobile session attention reachability; neutral Defaults/command host; existing launcher form and session/management internals remain assigned to R4/R3/R5. More/auth/gateway/unavailable states use DS primitives where no dedicated frame exists.

**Ownership exceptions:** mechanical compatibility edits in `Markdown.test.tsx`, `StepUpDialog.test.tsx`, `NewSession.test.tsx`, and `e2e/sessions.spec.ts` accompany CSS/chrome changes. Markdown sanitization, step-up outcomes, stream count, composer sizing/back controls and lifecycle/delivery assertions remain. Existing list/link tests were adapted to explicit overview navigation and hat/host grouping; auto-selection/day/side-list expectations were replaced by the new contract. No production session internals changed beyond its CSS import.

**Known limits / deferred work:** the push test uses actual Rust producer bytes and emitted worker code, with a browser response shim omitting the live card from the first page; it does not create a naturally aged transcript or deliver encrypted push through a real service. OS notification permission/installed iOS behavior and Linux CI are parent checks. R4 owns launcher draft/configuration enhancements. Existing E2E skips remain untouched. No dependency/hash update, README index edit, Rust production change, rebase, shared-home memory write or design artifact commit. See **After this plan** for exact R3–R6 exports and ownership.

## Scope

Two implementation tasks and one execution-record task:

1. Establish routes, a stable action/context registry, shared generated-type delegation wrappers and neutral R4/R6 entry points.
2. Build the responsive navigation, explicit Sessions overview, independently queried Needs you queue, route-backed launcher frame, CSS ownership boundaries and producer-to-click browser acceptance.
3. Record final verification, one fresh replay, removal probes, screenshots and the parallel-lane handoff.

No Rust production changes, dependency additions, protocol/schema edits, backend defaults, session renderer redesign, management redesign or global shortcut dispatcher. R3–R6 replace their owned entry points after this foundation. No GitHub action, deployment or design-bundle files.

## Decisions

1. Retain History API links and the existing list/item stores. The route selects a session; Sessions never selects one automatically. Scoped rail hat links carry `?hat=` so modified clicks and reloads preserve that explicit scope. Ordinary overview choices remain document state, with existing persisted hat/Hide closed and new persisted grouping/collapse preferences.
2. Keep one list controller per signed-in tab. A page key includes `overview`/`attention` even when the HTTP query is identical. Query changes close the old stream, abort reads and fence late responses; reset cursor/page membership while retaining known summaries for direct session headers and the existing hat-scoped waiting-count carry.
3. Needs you sends only the selected hat across all lifecycles. Local overview host/status and saved q/lifecycle/Hide closed never constrain it. Scan the initial page plus at most two more automatically, or at most three per explicit Load more. Failures require a deliberate retry; totals and empty states remain honest.
4. Use a visit-local reader with at most two concurrent detail/question/attention requests. Only visible queue cards request previews. Never render raw pending payloads or mount AnswerBook/item streams there. Immutable summary upserts and focus invalidate previews; session/pending/item identity and version prevent older question replacement. Every result/error retains a canonical session/card link.
5. The registry owns availability and cleanup, while screen providers own their operations. Screen priority 0 overrides shell fallback priority -1 independently of React effect order. A disabled higher-priority handler shadows a fallback; R6 cannot guess an unavailable mutation. Context uses the same precedence, so a session's actual hat can override overview scope.
6. R2 supplies a modal route frame around the existing launcher, with a safe known-app return destination, inert background, containment, Escape and focus return. R4 owns subsequent draft/configuration behavior and the form's presentation. Direct `/new` closes to Sessions.
7. Compile a tiny fixture under `web/e2e/` against Cargo's exact current library artifacts. It executes public Rust `notice_for` → `payload_for` and prints the actual PushPayload. Feed it to the emitted worker, then click the worker's emitted `data.url`. No production push ingress/egress guard or crate source is changed. A real question route serves a card omitted from the initial browser page window.
8. Extract session and launch CSS into their owned modules and freeze shared `index.css`. Four mechanical cross-lane test compatibility edits accompany the foundation: Markdown's CSS path, Step-up's main-form status scope, the launcher's one-list-stream assertion, and R3 browser navigation name/hidden-session-bar assertions. Existing authorization, sizing, delivery and sanitization assertions are retained.

## Global Constraints

- Use the flake toolchain, plain `nix develop`, private targets and scratch test homes. No global installs. Every replay/probe copy has an APFS-cloned target before builds; never share CARGO_TARGET_DIR.
- Preserve generated DTOs, shared Client authentication/step-up, AnswerBook, item/removal/version fences, drafts, attachments and worker receipt/click allowlists. A notification never answers or changes the overview hat.
- New text locators are exact or use named roles. Local J/K moves focus without navigation/answering; global keys are R6's responsibility.
- No prototype HTML, fixture text or private design data enters source control. Only synthetic acceptance data is used.
- Use the repository's personal author identity and unsigned Conventional Commits. Inspect staged bytes and author range before every push. No GitHub access from this lane.
- Run changed browser suites before committing; run one full final web/browser verification and the Rust gates once. Only concurrency/timing guards receive 4×3 repetition. Review amendments use targeted tests/new probes, not another fresh replay.

## Review Focus

- Attention cannot inherit restrictive overview filters or the same cursor merely because two wire queries match. Late responses cannot overwrite a new page baseline.
- At most one list SSE per tab and one selected-session item SSE; queue previews are typed, bounded, read-only, visible-card reads with current-state links.
- Closed-session status-only work remains reachable, while parent-handled and queued answers do not become operator work. Incomplete paging never claims an empty queue.
- Real producer URL → emitted worker `data.url` → click → exact session/card, including auth return, excluded hat, omitted first-page card, exact-target no reload and dirty-window preservation.
- Gateway/unavailable routes do not make session/default/delegation calls. Registry scope, handler precedence and unmount cleanup cannot leave stale enabled operations.
- Modal focus/inert behavior stacks with step-up; hidden controls do not remain keyboard targets. Session card/composer accessible names stay stable.
- CSS extraction preserves Markdown markers and session geometry; R3/R4/R5/R6 need no shared-file edits to mount their owned work.

## File structure

| Area | Files |
|---|---|
| Shared integration | `app-actions.tsx`, `api/delegation.ts`, `router.tsx`, `lib/views.ts`, `App.tsx` |
| Shell | `components/Shell.tsx`, `NavigationRail.tsx`, `BottomNavigation.tsx`, `CommandEntry.tsx`; `screens/More.tsx`, `Placeholder.tsx` |
| Overview | `SessionScope.tsx`, `SessionList.tsx`, `SessionRow.tsx`, `SessionFilters.tsx`, `HatSwitch.tsx`, `lib/sessionGroups.ts`, `lib/status.ts` |
| Attention | `screens/NeedsYou.tsx`, `NeedsYouQueue.tsx`, `AttentionPreview.tsx`, abortable `api/view.ts`/`attention.ts`, persistent `store/useSessionList.ts` |
| Ownership transfer | `styles/shell.css` (R2), `session.css` (R3), `launch.css`, `NewSessionFrame.tsx`, `screens/Defaults.tsx` (R4), `components/CommandHost.tsx` (R6); `index.css` frozen |
| Acceptance | Colocated tests; `web/e2e/shell.spec.ts`, `pwa.spec.ts`, producer fixture/compiler; narrow compatibility edits listed above |

## Task 1: Shared routes, actions and API seams

- [x] Build shared exports and generated-type wrappers. Register new route names without changing push receipt destinations. Mount the R6 entry point under the action provider; provide neutral Defaults/CommandHost implementations.
- [x] Run targeted registry/API/router tests and typecheck. Inspect staged bytes/identity, commit `feat(ui): establish redesign action and delegation seams`, push `git push origin plan/ui-r2`.

Apply the exact patch below to the base. Later Task 2 strengthens priority/route integration and its regressions.

```diff
diff --git a/web/src/App.tsx b/web/src/App.tsx
index 88a61a26..31bfb88b 100644
--- a/web/src/App.tsx
+++ b/web/src/App.tsx
@@ -11,6 +11,8 @@ import Setup from './screens/Setup'
 import PwaStatus from './components/PwaStatus'
 import { completeLogout } from './pwa/logout'
 import NotificationNavigation from './components/NotificationNavigation'
+import { AppActionsProvider } from './app-actions'
+import CommandHost from './components/CommandHost'

 interface Waiting {
   resolve: () => void
@@ -52,6 +54,7 @@ export default function App({ fetchImpl }: { fetchImpl?: typeof fetch }) {

   return (
     <ClientContext.Provider value={client}>
+      <AppActionsProvider>
       <div className="application-root">
       <PwaStatus />
       <NotificationNavigation />
@@ -61,7 +64,9 @@ export default function App({ fetchImpl }: { fetchImpl?: typeof fetch }) {
         {route.name === 'setup' ? <Setup /> : route.name === 'login' ? <Login /> : <Shell route={route} />}
       </div>
       {waiting && <StepUpDialog returnTo={focusBeforeStepUp.current} onDone={() => close('done')} onCancel={() => close('cancelled')} />}
+      <CommandHost />
       </div>
+      </AppActionsProvider>
     </ClientContext.Provider>
   )
 }
diff --git a/web/src/api/delegation.test.ts b/web/src/api/delegation.test.ts
new file mode 100644
index 00000000..dfcc8de2
--- /dev/null
+++ b/web/src/api/delegation.test.ts
@@ -0,0 +1,19 @@
+import { expect, it } from 'vitest'
+import { routed, json } from '../test-stream'
+import { executionPolicy, runtimeCatalog, sessionTools, setExecutionPolicy, setSessionTools } from './delegation'
+it('encodes ids and catalog context and preserves generated policy/flag requests', async () => {
+  const server = routed(() => json({ revision: 3, allowed: {}, delegation_enabled: false }))
+  await sessionTools(server.client, 'hat/a?b')
+  await setSessionTools(server.client, 'hat/a?b', { delegation_enabled: false })
+  await executionPolicy(server.client, 'hat/a?b')
+  const grant = { allowed: { custom: { sandbox: [false, 'value'] } } }
+  await setExecutionPolicy(server.client, 'hat/a?b', grant)
+  await runtimeCatalog(server.client, 'host/a', 'custom & agent', '/project/?')
+  expect(server.calls.map(c => [c.method, c.path])).toEqual([
+    ['GET', '/api/hats/hat%2Fa%3Fb/session-tools'], ['PATCH', '/api/hats/hat%2Fa%3Fb/session-tools'],
+    ['GET', '/api/hats/hat%2Fa%3Fb/delegation-policy'], ['PATCH', '/api/hats/hat%2Fa%3Fb/delegation-policy'],
+    ['GET', '/api/hosts/host%2Fa/runtime-catalog?agent=custom+%26+agent&cwd=%2Fproject%2F%3F'],
+  ])
+  expect(JSON.parse(String(server.fetch.mock.calls[1][1]?.body))).toEqual({ delegation_enabled: false })
+  expect(JSON.parse(String(server.fetch.mock.calls[3][1]?.body))).toEqual(grant)
+})
diff --git a/web/src/api/delegation.ts b/web/src/api/delegation.ts
new file mode 100644
index 00000000..796136e3
--- /dev/null
+++ b/web/src/api/delegation.ts
@@ -0,0 +1,20 @@
+// Shared facade owned by R2; R4/R5 consume it without duplicating wire types.
+import type { ExecutionPolicy, HatSessionTools, HostCatalog, SetExecutionPolicy, SetSessionTools } from '../generated/protocol'
+import type { Client } from './client'
+const hatPath = (hat: string) => `/api/hats/${encodeURIComponent(hat)}`
+export function sessionTools(client: Client, hat: string): Promise<HatSessionTools> {
+  return client.request('GET', `${hatPath(hat)}/session-tools`)
+}
+export function setSessionTools(client: Client, hat: string, value: SetSessionTools): Promise<HatSessionTools> {
+  return client.request('PATCH', `${hatPath(hat)}/session-tools`, value)
+}
+export function executionPolicy(client: Client, hat: string): Promise<ExecutionPolicy> {
+  return client.request('GET', `${hatPath(hat)}/delegation-policy`)
+}
+export function setExecutionPolicy(client: Client, hat: string, value: SetExecutionPolicy): Promise<ExecutionPolicy> {
+  return client.request('PATCH', `${hatPath(hat)}/delegation-policy`, value)
+}
+export function runtimeCatalog(client: Client, host: string, agent: string, cwd: string, signal?: AbortSignal): Promise<HostCatalog> {
+  const query = new URLSearchParams({ agent, cwd })
+  return client.request('GET', `/api/hosts/${encodeURIComponent(host)}/runtime-catalog?${query}`, undefined, { signal })
+}
diff --git a/web/src/app-actions.test.tsx b/web/src/app-actions.test.tsx
new file mode 100644
index 00000000..c8a18d16
--- /dev/null
+++ b/web/src/app-actions.test.tsx
@@ -0,0 +1,26 @@
+import { expect, it, vi } from 'vitest'
+import { AppActions } from './app-actions'
+it('dispatches only the current enabled provider and unregisters by identity', () => {
+  const actions = new AppActions(), first = vi.fn(), second = vi.fn()
+  expect(actions.dispatch('focus-composer')).toBe(false)
+  const removeFirst = actions.register('focus-composer', { label: 'Reply', enabled: true, run: first })
+  const removeSecond = actions.register('focus-composer', { label: 'Reply', enabled: false, run: second })
+  expect(actions.dispatch('focus-composer')).toBe(false)
+  expect(actions.available()).toEqual([])
+  removeFirst()
+  expect(actions.get('focus-composer')?.enabled).toBe(false)
+  removeSecond()
+  actions.register('focus-composer', { label: 'Reply', enabled: true, run: second })
+  expect(actions.dispatch('focus-composer')).toBe(true)
+  expect(second).toHaveBeenCalledOnce(); expect(first).not.toHaveBeenCalled()
+})
+it('restores contexts without retaining a departed session', () => {
+  const actions = new AppActions(), changed = vi.fn()
+  const stop = actions.subscribe(changed)
+  const shell = actions.registerContext({ hatId: 'hat' })
+  const session = actions.registerContext({ sessionId: 's', hostId: 'h', cwd: '/project' })
+  expect(actions.context()).toEqual({ hatId: 'hat', sessionId: 's', hostId: 'h', cwd: '/project' })
+  session(); expect(actions.context()).toEqual({ hatId: 'hat' })
+  shell(); expect(actions.context()).toEqual({})
+  expect(changed).toHaveBeenCalledTimes(4); stop()
+})
diff --git a/web/src/app-actions.tsx b/web/src/app-actions.tsx
new file mode 100644
index 00000000..2b576a0d
--- /dev/null
+++ b/web/src/app-actions.tsx
@@ -0,0 +1,55 @@
+import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
+
+/** Stable R2 integration contract. Providers own mutations and capability checks;
+ * the command host only discovers and dispatches enabled actions. */
+export type AppActionId = 'new-session' | 'search-sessions' | 'toggle-rail' | 'toggle-details' | 'focus-composer' | 'open-needs-you' | 'open-sessions' | 'open-hosts' | 'open-mcp' | 'open-hats' | 'open-defaults' | 'open-settings' | 'open-commands'
+export interface AppAction { label: string; enabled: boolean; run: () => void }
+export interface AppContext { sessionId?: string; hostId?: string; cwd?: string; hatId?: string }
+export class AppActions {
+  private entries = new Map<AppActionId, { token: symbol; action: AppAction }[]>()
+  private contexts: { token: symbol; context: AppContext }[] = []
+  private listeners = new Set<() => void>()
+  private revision = 0
+  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
+  snapshot = () => this.revision
+  private changed() { this.revision++; this.listeners.forEach(fn => fn()) }
+  register(id: AppActionId, action: AppAction) {
+    const token = Symbol(id)
+    this.entries.set(id, [...(this.entries.get(id) ?? []), { token, action }]); this.changed()
+    return () => {
+      const entries = (this.entries.get(id) ?? []).filter(entry => entry.token !== token)
+      if (entries.length) this.entries.set(id, entries); else this.entries.delete(id)
+      this.changed()
+    }
+  }
+  get(id: AppActionId) { return this.entries.get(id)?.at(-1)?.action }
+  available() { return [...this.entries.keys()].flatMap(id => { const action = this.get(id); return action?.enabled ? [{ id, ...action }] : [] }) }
+  dispatch(id: AppActionId): boolean { const action = this.get(id); if (!action?.enabled) return false; action.run(); return true }
+  registerContext(context: AppContext) {
+    const token = Symbol('context'); this.contexts.push({ token, context }); this.changed()
+    return () => { this.contexts = this.contexts.filter(entry => entry.token !== token); this.changed() }
+  }
+  context(): AppContext { return Object.assign({}, ...this.contexts.map(entry => entry.context)) }
+}
+const Context = createContext<AppActions | null>(null)
+export function AppActionsProvider({ children }: { children: ReactNode }) {
+  const [actions] = useState(() => new AppActions())
+  return <Context.Provider value={actions}>{children}</Context.Provider>
+}
+/** Nullable outside App so existing standalone screen tests remain usable. */
+export function useAppActions() { return useContext(Context) }
+export function useActionSnapshot() {
+  const actions = useAppActions()
+  useSyncExternalStore(actions?.subscribe ?? noSubscribe, actions?.snapshot ?? zero)
+  return actions
+}
+const noSubscribe = () => () => {}
+const zero = () => 0
+export function useRegisterAction(id: AppActionId, action: AppAction) {
+  const actions = useAppActions()
+  useEffect(() => actions?.register(id, action), [actions, id, action.enabled, action.label, action.run])
+}
+export function useRegisterContext(context: AppContext) {
+  const actions = useAppActions()
+  useEffect(() => actions?.registerContext(context), [actions, context.sessionId, context.hostId, context.cwd, context.hatId])
+}
diff --git a/web/src/components/CommandEntry.tsx b/web/src/components/CommandEntry.tsx
new file mode 100644
index 00000000..9f1065b6
--- /dev/null
+++ b/web/src/components/CommandEntry.tsx
@@ -0,0 +1,8 @@
+import { useAppActions } from '../app-actions'
+import { Icon } from './ui'
+export default function CommandEntry({ compact = false }: { compact?: boolean }) {
+  const actions = useAppActions()
+  return <button type="button" className="command-entry" aria-label="Jump to" onClick={() => {
+    if (!actions?.dispatch('open-commands')) actions?.dispatch('search-sessions')
+  }}><Icon name="magnifying-glass" size={18} />{!compact && <span>Jump to…</span>}</button>
+}
diff --git a/web/src/components/CommandHost.tsx b/web/src/components/CommandHost.tsx
new file mode 100644
index 00000000..f5c7838a
--- /dev/null
+++ b/web/src/components/CommandHost.tsx
@@ -0,0 +1,2 @@
+// R6 owns this lazy entry point after R2. Jump to already opens real search.
+export default function CommandHost() { return null }
diff --git a/web/src/router.tsx b/web/src/router.tsx
index c93def96..6496cb00 100644
--- a/web/src/router.tsx
+++ b/web/src/router.tsx
@@ -6,6 +6,9 @@ export type RouteName =
   | 'setup'
   | 'login'
   | 'sessions'
+  | 'needs-you'
+  | 'more'
+  | 'defaults'
   | 'session'
   | 'new'
   | 'hosts'
@@ -24,6 +27,9 @@ const STATIC: Record<string, RouteName> = {
   '/setup': 'setup',
   '/login': 'login',
   '/sessions': 'sessions',
+  '/needs-you': 'needs-you',
+  '/more': 'more',
+  '/defaults': 'defaults',
   '/new': 'new',
   '/hosts': 'hosts',
   '/mcp': 'mcp',
diff --git a/web/src/screens/Defaults.tsx b/web/src/screens/Defaults.tsx
new file mode 100644
index 00000000..eba42850
--- /dev/null
+++ b/web/src/screens/Defaults.tsx
@@ -0,0 +1,5 @@
+// R4 owns this lazy entry point after R2.
+import Placeholder from './Placeholder'
+export default function Defaults() {
+  return <Placeholder title="Defaults" text="Per-hat session defaults will be available with the launcher update." />
+}
```

## Task 2: Responsive shell, overview, attention and real push boundary

- [x] Replace automatic selection with the grouped overview; add desktop expanded/compact rail, mobile five-item navigation and More. Preserve gateway behavior and known routes; register navigation/search/rail actions, lazy launcher/Defaults entry points and safe launcher dismissal.
- [x] Separate attention page scope from every overview filter. Retain one controller, abort/fence transitions, bound scanning and previews, preserve real attention distinctions and honest partial/error states. Observe new queue, same-wire-query, action-order, preview-version and retry regressions RED, then GREEN.
- [x] Extract CSS and move source-level assertions to the corresponding owned CSS paths. Keep card/composer controls stable. Add the real Rust producer fixture and click the emitted worker notification's `data.url` in browser acceptance.
- [x] Run final gates, new guard removal probes in the copied tree and the single fresh replay below. Review the complete diff against the rules, confirm staged bytes match tested files, commit `feat(ui): build responsive overview and attention navigation`, and push the named branch.

```diff
diff --git a/web/e2e/build-push-notice.sh b/web/e2e/build-push-notice.sh
new file mode 100644
index 00000000..64a94c65
--- /dev/null
+++ b/web/e2e/build-push-notice.sh
@@ -0,0 +1,19 @@
+#!/bin/sh
+# Run inside the dev shell. Reuse Cargo's exact current dependency artifacts.
+set -eu
+cd "$(dirname "$0")/../.."
+mkdir -p target
+cargo build -p hennery-sessions --lib --locked --message-format=json > target/ui-r2-push-artifacts.json
+node --input-type=module <<'JS'
+import { readFileSync, writeFileSync } from 'node:fs'
+const rows = readFileSync('target/ui-r2-push-artifacts.json', 'utf8').trim().split('\n').map(line => JSON.parse(line))
+const args = ['--edition=2024', 'web/e2e/push-notice.rs', '-L', 'dependency=target/debug/deps', '-o', 'target/hennery-push-notice']
+for (const name of ['hennery_sessions', 'hennery_kernel']) {
+  const paths = [...new Set(rows.filter(row => row.reason === 'compiler-artifact' && row.target.name === name).flatMap(row => row.filenames.filter(path => path.endsWith('.rlib'))))]
+  if (paths.length !== 1) throw Error(`Expected one current artifact for ${name}; got ${paths.length}`)
+  args.push('--extern', `${name}=${paths[0]}`)
+}
+// rustc response files take exactly one argument per line, without shell parsing.
+writeFileSync('target/ui-r2-push-rustc.args', args.join('\n'))
+JS
+rustc @target/ui-r2-push-rustc.args
diff --git a/web/e2e/producer.ts b/web/e2e/producer.ts
new file mode 100644
index 00000000..0b180ad2
--- /dev/null
+++ b/web/e2e/producer.ts
@@ -0,0 +1,18 @@
+import { mkdtemp, rm } from 'node:fs/promises'
+import { tmpdir } from 'node:os'
+import { join, resolve } from 'node:path'
+import { spawnHennery } from './spawn'
+import type { PushPayload } from '../src/generated/protocol'
+/** Public Rust producer -> complete JSON; does not replace URL encoding in JS. */
+export async function producerNotice(session: string, pending: string): Promise<PushPayload> {
+  const dir = await mkdtemp(join(tmpdir(), 'hennery-push-producer-'))
+  try {
+    const child = spawnHennery([session, pending], dir, {}, ['ignore', 'pipe', 'pipe'], resolve('../target/hennery-push-notice'))
+    let stdout = '', stderr = ''
+    child.stdout!.on('data', chunk => { stdout += String(chunk) })
+    child.stderr!.on('data', chunk => { stderr += String(chunk) })
+    const code = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
+    if (code !== 0) throw Error(`Notification producer failed (${code}): ${stderr}`)
+    return JSON.parse(stdout) as PushPayload
+  } finally { await rm(dir, { recursive: true, force: true }) }
+}
diff --git a/web/e2e/push-notice.rs b/web/e2e/push-notice.rs
new file mode 100644
index 00000000..9a9f334a
--- /dev/null
+++ b/web/e2e/push-notice.rs
@@ -0,0 +1,33 @@
+// Browser fixture: execute the real session-notification producer and privacy fold.
+use hennery_kernel::{
+    delivery::{padded, payload_for},
+    push::PushPolicy,
+};
+use hennery_sessions::{
+    notify::notice_for,
+    store::{EdgeSession, PushEdge},
+};
+fn main() {
+    let mut args = std::env::args().skip(1);
+    let id = args.next().expect("session id");
+    let pending_id = args.next().expect("pending id");
+    assert!(args.next().is_none());
+    let notice = notice_for(
+        &PushEdge::Blocked {
+            pending_id,
+            title: None,
+        },
+        &EdgeSession {
+            id,
+            hat_id: "fixture-hat".into(),
+            title: Some("Fixture session".into()),
+            cwd: "/fixture".into(),
+        },
+    )
+    .expect("question notice");
+    let payload = payload_for(&notice, PushPolicy::default()).expect("unmuted fixture");
+    println!(
+        "{}",
+        String::from_utf8(padded(&payload).expect("push JSON")).expect("UTF-8 push JSON")
+    );
+}
diff --git a/web/e2e/pwa.spec.ts b/web/e2e/pwa.spec.ts
index 79c8d196..09c8b2c5 100644
--- a/web/e2e/pwa.spec.ts
+++ b/web/e2e/pwa.spec.ts
@@ -5,6 +5,7 @@ import type { HostItem, SessionDetail, StartSessionResponse } from '../src/gener
 import { readFileSync } from 'node:fs'
 import { resolve } from 'node:path'
 import { deployProxy } from './pwa-proxy'
+import { producerNotice } from './producer'
 import { fakeAgent, testHost, type TestHost } from './host'

 const PASSWORD = 'correct horse battery staple'
@@ -182,15 +183,54 @@ for (const width of [1280, 390]) test(`notification click reaches the live card
     const detail = async () => (await (await context.request.get(`${collector.origin}/api/sessions/${id}`)).json()) as SessionDetail
     await expect.poll(async () => (await detail()).pending.length).toBe(1)
     const pending = (await detail()).pending[0].pending_id
-    const target = `/sessions/${id}?pending=${encodeURIComponent(pending)}`
+    const payload = await producerNotice(id, pending)
+    const target = payload.url
+    const filteredHat = await context.request.post(collector.origin + '/api/hats', { headers, data: { name: `Notification scope ${width}`, colour: '#336699' } })
+    expect(filteredHat.ok()).toBe(true)
+    const selectedHat = (await filteredHat.json() as { id: string }).id
+    await page.evaluate(hat => localStorage.setItem('hennery.hat', hat), selectedHat)
+    await page.goto(collector.origin + '/needs-you')
+    await expect(page.getByText('Nothing needs you', { exact: true })).toBeVisible()
+    let olderQuestionReads = 0
+    await page.route(collector.origin + '/api/view/sessions/' + id, async route => {
+      // Exercise a first-page window excluding this live card; its bounded
+      // question route and all answers still use the actual collector.
+      const response = await route.fetch()
+      const body = await response.json() as { items: { kind: string; pending_id?: string }[]; older: boolean }
+      body.items = body.items.filter(item => item.pending_id !== pending)
+      body.older = true
+      await route.fulfill({ response, json: body })
+    })
+    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/questions/' + pending)) olderQuestionReads++ })
     const code = await (await context.request.get(`${collector.origin}/sw.js`)).text()
     const harness = workerHarness(code, undefined, { origin: collector.origin, clients: browserWindows(context, collector.origin) })
-    await harness.push(JSON.stringify({ title: 'Needs your answer', body: 'Open current state', tag: id, url: target }))
+    await harness.push(JSON.stringify(payload))
     expect(harness.notifications).toHaveLength(1)
-    await harness.click(target)
+    const options = harness.notifications[0].options as { data: { url: string }; actions?: unknown[] }
+    expect(options.data.url).toBe(target)
+    expect(options.actions).toBeUndefined()
+    await harness.click(options.data.url)
     await expect(page).toHaveURL(collector.origin + target)
     const card = page.getByRole('region', { name: 'Question from Claude', exact: true })
     await expect(card.getByText('Write notes.txt', { exact: true })).toBeVisible()
+    await expect(card).toHaveAttribute('data-pending-id', pending)
+    await expect(card).toBeFocused()
+    expect(olderQuestionReads).toBeGreaterThan(0)
+    expect(await page.evaluate(() => localStorage.getItem('hennery.hat'))).toBe(selectedHat)
+    // The same worker-emitted destination survives a signed-out return.
+    const signedOut = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'allow' })
+    try {
+      const authHarness = workerHarness(code, undefined, { origin: collector.origin, clients: browserWindows(signedOut, collector.origin) })
+      await authHarness.push(JSON.stringify(payload))
+      const emitted = authHarness.notifications[0].options as { data: { url: string } }
+      await authHarness.click(emitted.data.url)
+      const returned = signedOut.pages()[0]
+      await expect(returned).toHaveURL(collector.origin + '/login?next=' + encodeURIComponent(target))
+      await returned.getByLabel('Password', { exact: true }).fill(PASSWORD)
+      await returned.getByRole('button', { name: 'Sign in', exact: true }).click()
+      await expect(returned).toHaveURL(collector.origin + target)
+      await expect(returned.getByRole('region', { name: 'Question from Claude', exact: true })).toHaveAttribute('data-pending-id', pending)
+    } finally { await signedOut.close() }
     const draft = page.getByLabel('Prompt', { exact: true })
     await draft.fill('Keep this unsent text')
     await page.evaluate(() => { (window as unknown as { __documentSentinel: string }).__documentSentinel = 'same-document' })
diff --git a/web/e2e/sessions.spec.ts b/web/e2e/sessions.spec.ts
index f1d534ef..56c2b4f4 100644
--- a/web/e2e/sessions.spec.ts
+++ b/web/e2e/sessions.spec.ts
@@ -127,7 +127,7 @@ for (const width of [1280, 390]) {
     test('New Session starts a session with its first prompt, and opens it', async () => {
       // The rail's link on a desktop, the tab bar's on a phone.
       if (narrow) {
-        await page.getByRole('navigation', { name: 'Tabs', exact: true }).getByRole('link', { name: 'New', exact: true }).click()
+        await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link', { name: 'New', exact: true }).click()
       } else {
         await page.getByRole('link', { name: 'New session', exact: true }).click()
       }
@@ -190,7 +190,7 @@ for (const width of [1280, 390]) {
         await expect(back).toBeVisible()
         await expect(back).toBeInViewport()
         expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
-        await expect(page.getByRole('navigation', { name: 'Tabs', exact: true })).toBeVisible()
+        await expect(page.locator('.tabbar')).toBeHidden()
       } else {
         // Not shown, so out of the accessibility tree: found by its class.
         await expect(back).toHaveCount(0)
diff --git a/web/e2e/shell.spec.ts b/web/e2e/shell.spec.ts
index 7d9b758c..a2cb7774 100644
--- a/web/e2e/shell.spec.ts
+++ b/web/e2e/shell.spec.ts
@@ -84,12 +84,12 @@ test('the shell: a rail from 1280 px, a bottom tab bar at 390 px', async () => {
   await page.setViewportSize({ width: 1280, height: 800 })
   expect(await display('.rail')).toBe('flex')
   expect(await display('.tabbar')).toBe('none')
-  expect(await display('.mtopbar')).toBe('none')
+  await expect(page.locator('.mtopbar')).toHaveCount(0)
   await page.setViewportSize({ width: 390, height: 844 })
   expect(await display('.rail')).toBe('none')
   expect(await display('.tabbar')).toBe('flex')
-  expect(await display('.mtopbar')).toBe('flex')
-  const tab = page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Hosts' })
+  await expect(page.locator('.mtopbar')).toHaveCount(0)
+  const tab = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Hosts' })
   await expect(tab).toBeVisible()
   const box = await tab.boundingBox()
   expect(box!.height).toBeGreaterThanOrEqual(44)
@@ -135,3 +135,119 @@ test('the password signs in, and a step-up from the page is accepted', async ()
 test('the pages broke no Content-Security-Policy rule', async () => {
   expect(await cspViolations()).toEqual([])
 })
+
+// Deterministic browser acceptance over the actual embedded app. These API
+// fixtures are synthetic; the push flow in pwa.spec.ts uses the real producer.
+for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const) test(`R2 overview, attention, routes and focus at ${width}px ${theme}`, async ({ browser }) => {
+  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme, reducedMotion: 'reduce' })
+  const visual = await context.newPage()
+  const captures = process.env.HENNERY_UI_R2_CAPTURES
+  const { mkdir } = await import('node:fs/promises')
+  const { resolve } = await import('node:path')
+  const ts = '2026-10-20T10:00:00Z'
+  const base = { host_id: 'fixture-host', hat_id: 'fixture-hat', agent: 'claude', cwd: '/srv/project', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: 0, parent_handled_questions: 0, created_at: ts, last_event_at: ts }
+  const rows = [
+    { ...base, session_id: 'permission', title: 'Review project access', activity: 'blocked', operator_attention: 1, question_waits: true },
+    { ...base, session_id: 'closed-attention', title: 'Review child outcome', lifecycle: 'closed', operator_attention: 1 },
+    { ...base, session_id: 'running', title: 'Implement parser', activity: 'running', agent: 'codex', git_branch: 'parser' },
+    { ...base, session_id: 'idle', title: 'Plan next steps', hat_id: 'fixture-other' },
+  ]
+  let empty = false, gateway = false, activeLists = 0, maximumLists = 0
+  const held: (() => Promise<void>)[] = []
+  await context.route('**/api/**', async route => {
+    const url = new URL(route.request().url()), path = url.pathname
+    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
+    if (path === '/api/capabilities') return json({ mode: gateway ? 'gateway' : 'full', features: ['mcp_connections'] })
+    if (path === '/api/hats') return json([{ id: 'fixture-hat', name: 'Personal', colour: '#8050d0', created_at: ts, default_for_new_hosts: true }, { id: 'fixture-other', name: 'Other', colour: '#087c70', created_at: ts, default_for_new_hosts: false }])
+    if (path === '/api/hosts') return json([{ host_id: 'fixture-host', name: 'Development host', platform: 'linux', host_version: '0.1.4', capabilities: [], default_hat_id: 'fixture-hat', workspace_roots: [], connected: true, created_at: ts, last_seen_at: ts }])
+    if (path === '/api/view/sessions') return json({ sessions: empty ? [] : rows.filter(row => (!url.searchParams.has('hat') || row.hat_id === url.searchParams.get('hat')) && (!url.searchParams.has('lifecycle') || url.searchParams.get('lifecycle')!.split(',').includes(row.lifecycle))), epoch: 'fixture', revision: 1, waiting: empty ? 0 : 2 })
+    if (path.startsWith('/api/stream/')) {
+      if (path === '/api/stream/sessions') { activeLists++; maximumLists = Math.max(maximumLists, activeLists) }
+      held.push(() => route.abort().catch(() => {})); return
+    }
+    if (path === '/api/sessions/permission') return json({ ...rows[0], pending: [{ pending_id: 'fixture-pending', kind: 'permission', state: 'open', answered: false, payload: { title: 'Payload is not rendered' } }] })
+    if (path === '/api/sessions/closed-attention') return json({ ...rows[1], pending: [] })
+    if (path.endsWith('/questions/fixture-pending')) return json({ id: 'question:fixture-pending', version: 2, ts, kind: 'question', pending_id: 'fixture-pending', question_kind: 'permission', request: { type: 'permission', title: 'Read project files', options: [{ option_id: 'allow', name: 'Allow', option_kind: 'allow_once' }] }, answerable: true, answered: false, state: 'open' })
+    if (path === '/api/delegation/attention') return json([{ id: 'attention', child_id: 'closed-attention', hat_id: 'fixture-hat', pending_id: null, reason: 'child_failed' }])
+    if (path === '/api/mcp/connections') return json([])
+    if (path === '/api/hosts/fixture-host/agents' || path.endsWith('/recent-projects')) return json([])
+    return json({ code: 'not_found', message: 'Unavailable in synthetic shell fixture' }, 404)
+  })
+  context.on('requestfailed', request => { if (new URL(request.url()).pathname === '/api/stream/sessions') activeLists = Math.max(0, activeLists - 1) })
+  const capture = async (name: string) => {
+    await visual.evaluate(async () => {
+      for (const family of ['Inter', 'Roboto']) for (const weight of [400, 500, 600, 700]) await document.fonts.load(`${weight} 16px "${family}"`, 'Zażółć gęślą jaźń')
+      await document.fonts.ready
+    })
+    expect(await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
+    if (captures) { await mkdir(captures, { recursive: true }); await visual.screenshot({ path: resolve(captures, `${name}-${width}-${theme}.png`), fullPage: true }) }
+  }
+  try {
+    await visual.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'))
+    await visual.goto(collector.origin + '/sessions')
+    await expect(visual.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
+    await expect(visual).toHaveURL(collector.origin + '/sessions')
+    await expect(visual.getByRole('link', { name: /Review project access/ })).toBeVisible()
+    await capture('overview-hat')
+    const links = visual.locator('[data-session-link]')
+    await links.nth(0).focus(); await links.nth(0).press('j'); await expect(links.nth(1)).toBeFocused()
+    await links.nth(1).press('k'); await expect(links.nth(0)).toBeFocused()
+    await visual.getByRole('radio', { name: 'By host', exact: true }).check()
+    await capture('overview-host')
+    if (width === 1280) {
+      const collapse = visual.getByRole('button', { name: 'Collapse navigation', exact: true })
+      await collapse.click()
+      expect(await visual.locator('.rail').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(56)
+      await capture('overview-collapsed')
+      await visual.getByRole('button', { name: 'Expand navigation', exact: true }).click()
+    } else {
+      const nav = visual.getByRole('navigation', { name: 'Primary navigation', exact: true })
+      await expect(nav.getByRole('link')).toHaveCount(5)
+      for (const link of await nav.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
+      await visual.getByRole('button', { name: 'Filters', exact: true }).click()
+      const dialog = visual.getByRole('dialog', { name: 'Session filters', exact: true })
+      await expect(dialog).toBeVisible()
+      await expect(dialog.getByRole('searchbox')).toBeFocused()
+      await capture('overview-filters')
+      await visual.keyboard.press('Escape')
+      await expect(dialog).toHaveCount(0)
+      await expect(visual.getByRole('button', { name: 'Filters', exact: true })).toBeFocused()
+    }
+    await visual.goto(collector.origin + '/needs-you')
+    await expect(visual.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible()
+    await expect(visual.getByText('Read project files', { exact: true })).toBeVisible()
+    await expect(visual.getByText('child_failed', { exact: true })).toBeVisible()
+    await expect(visual.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(0)
+    await capture('needs-you-populated')
+    await visual.getByRole('button', { name: 'Search', exact: true }).click()
+    await expect(visual.getByRole('searchbox', { name: 'Search sessions', exact: true })).toBeFocused()
+    if (width === 390) await visual.keyboard.press('Escape')
+    empty = true
+    await visual.goto(collector.origin + '/needs-you')
+    await expect(visual.getByText('Nothing needs you', { exact: true })).toBeVisible()
+    await capture('needs-you-empty')
+    await visual.goto(collector.origin + '/more')
+    const more = visual.getByRole('navigation', { name: 'More navigation', exact: true })
+    await expect(more.getByRole('link')).toHaveCount(4)
+    await capture('more')
+    await more.getByRole('link', { name: 'Defaults', exact: true }).click()
+    await expect(visual.getByRole('heading', { name: 'Defaults', exact: true })).toBeVisible()
+    await capture('defaults-placeholder')
+    await visual.goto(collector.origin + '/new')
+    const launcher = visual.getByRole('dialog', { name: 'New session', exact: true })
+    await expect(launcher).toBeVisible()
+    await capture('new-session-frame')
+    await visual.keyboard.press('Escape')
+    await expect(visual).toHaveURL(collector.origin + '/sessions')
+    await visual.goto(collector.origin + '/missing')
+    await expect(visual.getByRole('heading', { name: 'Not found', exact: true })).toBeVisible()
+    await capture('not-found')
+    gateway = true
+    await visual.goto(collector.origin + '/needs-you')
+    await expect(visual.getByText('This view is not part of this deployment.', { exact: true })).toBeVisible()
+    await capture('gateway-unavailable')
+    await visual.goto(collector.origin + '/more')
+    await expect(visual.getByRole('navigation', { name: 'More navigation', exact: true }).getByRole('link')).toHaveCount(2)
+    await capture('gateway-more')
+  } finally { for (const release of held) await release(); await context.close() }
+})
diff --git a/web/package.json b/web/package.json
index 5a69d138..e13b2e36 100644
--- a/web/package.json
+++ b/web/package.json
@@ -9,7 +9,7 @@
     "build": "vite build --config theme.config.ts && tsc -b && vite build && node --test scripts/*.test.mjs && node scripts/check-css-origins.mjs dist",
     "test": "vitest run",
     "typecheck": "tsc -b --noEmit && tsc -p tsconfig.node.json",
-    "e2e": "sh ../packaging/pwa-test-builds.sh && playwright test"
+    "e2e": "sh ../packaging/pwa-test-builds.sh && sh e2e/build-push-notice.sh && playwright test"
   },
   "dependencies": {
     "react": "19.3.1",
diff --git a/web/src/App.test.tsx b/web/src/App.test.tsx
index d6dc2700..d8a3d19c 100644
--- a/web/src/App.test.tsx
+++ b/web/src/App.test.tsx
@@ -23,11 +23,12 @@ describe('the shell', () => {
     const rail = await screen.findByRole('complementary', { name: 'Views' })
     const names = within(rail)
       .getAllByRole('link')
+      .filter(a => a.classList.contains('nav-item'))
       .map((a) => a.textContent?.trim())
-    expect(names).toEqual(['New session', 'Sessions', 'Hosts', 'MCP', 'Hats', 'Settings'])
+    expect(names).toEqual(['Needs you', 'All sessions', 'New session', 'Defaults', 'Hosts', 'MCP', 'Hats', 'Settings'])
     expect(within(rail).getByRole('link', { name: 'Hosts' })).toHaveAttribute('aria-current', 'page')
-    const tabs = screen.getByRole('navigation', { name: 'Tabs' })
-    expect(within(tabs).getAllByRole('link').map((a) => a.textContent)).toEqual(['Sessions', 'New', 'Hosts', 'Settings'])
+    const tabs = screen.getByRole('navigation', { name: 'Primary navigation' })
+    expect(within(tabs).getAllByRole('link').map((a) => a.textContent)).toEqual(['Needs you', 'Sessions', 'New', 'Hosts', 'More'])
   })

   it('shows only MCP and Settings in gateway mode, and no other view', async () => {
@@ -36,8 +37,8 @@ describe('the shell', () => {
     render(<App fetchImpl={server.fetch} />)
     const rail = await screen.findByRole('complementary', { name: 'Views' })
     expect(within(rail).getAllByRole('link').map((a) => a.textContent?.trim())).toEqual(['MCP', 'Settings'])
-    const tabs = screen.getByRole('navigation', { name: 'Tabs' })
-    expect(within(tabs).getAllByRole('link').map((a) => a.textContent)).toEqual(['MCP', 'Settings'])
+    const tabs = screen.getByRole('navigation', { name: 'Primary navigation' })
+    expect(within(tabs).getAllByRole('link').map((a) => a.textContent)).toEqual(['MCP', 'More'])
     expect(screen.getByText('This view is not part of this deployment.')).toBeInTheDocument()
   })

@@ -55,7 +56,7 @@ describe('the shell', () => {
     const rail = await screen.findByRole('complementary', { name: 'Views' })
     await userEvent.click(within(rail).getByRole('link', { name: 'Hats' }))
     expect(location.pathname).toBe('/hats')
-    expect(screen.getByRole('heading', { name: 'Hats' })).toBeInTheDocument()
+    expect(await screen.findByRole('heading', { name: 'Hats' })).toBeInTheDocument()
     act(() => {
       history.back()
     })
@@ -149,3 +150,19 @@ describe('the shell', () => {
     expect(sessionStorage.getItem('hennery.hideClosed')).toBe('1')
   })
 })
+
+it.each(['/needs-you', '/defaults', '/new', '/hats', '/sessions/one'])('gateway refuses %s without session/default/delegation reads', async path => {
+  at(path)
+  const server = stubServer({ 'GET /api/capabilities': json(200, GATEWAY) })
+  render(<App fetchImpl={server.fetch} />)
+  await screen.findByText('This view is not part of this deployment.', { exact: true })
+  expect(server.sent.map(request => request.path)).toEqual(['/api/capabilities'])
+})
+it('More contains every configured destination and sign out', async () => {
+  at('/more')
+  const server = stubServer({ 'GET /api/capabilities': json(200, FULL) })
+  render(<App fetchImpl={server.fetch} />)
+  const nav = await screen.findByRole('navigation', { name: 'More navigation' })
+  expect(within(nav).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/mcp', '/hats', '/defaults', '/settings'])
+  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
+})
diff --git a/web/src/App.tsx b/web/src/App.tsx
index 31bfb88b..52c27b1d 100644
--- a/web/src/App.tsx
+++ b/web/src/App.tsx
@@ -1,6 +1,6 @@
 // The app: the route decides between setup, login and the signed-in shell;
 // the step-up dialog opens over any of them when a request needs it.
-import { useEffect, useMemo, useRef, useState } from 'react'
+import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
 import { StepUpCancelled } from './api/errors'
 import { ClientContext, browserClient } from './app-client'
 import Shell from './components/Shell'
@@ -12,7 +12,7 @@ import PwaStatus from './components/PwaStatus'
 import { completeLogout } from './pwa/logout'
 import NotificationNavigation from './components/NotificationNavigation'
 import { AppActionsProvider } from './app-actions'
-import CommandHost from './components/CommandHost'
+const CommandHost = lazy(() => import('./components/CommandHost'))

 interface Waiting {
   resolve: () => void
@@ -64,7 +64,7 @@ export default function App({ fetchImpl }: { fetchImpl?: typeof fetch }) {
         {route.name === 'setup' ? <Setup /> : route.name === 'login' ? <Login /> : <Shell route={route} />}
       </div>
       {waiting && <StepUpDialog returnTo={focusBeforeStepUp.current} onDone={() => close('done')} onCancel={() => close('cancelled')} />}
-      <CommandHost />
+      <Suspense fallback={null}><CommandHost /></Suspense>
       </div>
       </AppActionsProvider>
     </ClientContext.Provider>
diff --git a/web/src/api/attention.ts b/web/src/api/attention.ts
index 4bdabf4b..012e424b 100644
--- a/web/src/api/attention.ts
+++ b/web/src/api/attention.ts
@@ -10,10 +10,10 @@ export interface OperatorAttention {
   pending_id: string | null
 }

-export async function attentionPage(client: Client, hat: string, after?: string): Promise<OperatorAttention[]> {
+export async function attentionPage(client: Client, hat: string, after?: string, signal?: AbortSignal): Promise<OperatorAttention[]> {
   const query = new URLSearchParams({ hat_id: hat })
   if (after !== undefined) query.set('after', after)
-  const value = await client.request<unknown>('GET', `/api/delegation/attention?${query}`)
+  const value = await client.request<unknown>('GET', `/api/delegation/attention?${query}`, undefined, { signal })
   if (!Array.isArray(value) || value.length > 100 || !value.every(isAttention)) throw new Error('Invalid delegation attention response.')
   return value
 }
diff --git a/web/src/api/view.ts b/web/src/api/view.ts
index cc234a13..716ab770 100644
--- a/web/src/api/view.ts
+++ b/web/src/api/view.ts
@@ -8,8 +8,8 @@ import type { SessionCatalog, SessionDetail } from '../generated/protocol'

 const enc = encodeURIComponent

-export function questionCard(client: Client, id: string, pending: string): Promise<Item> {
-  return client.request<Item>('GET', `/api/view/sessions/${enc(id)}/questions/${enc(pending)}`)
+export function questionCard(client: Client, id: string, pending: string, signal?: AbortSignal): Promise<Item> {
+  return client.request<Item>('GET', `/api/view/sessions/${enc(id)}/questions/${enc(pending)}`, undefined, { signal })
 }

 /** `?a=1&b=2` of the params that are set, or nothing. */
@@ -49,7 +49,7 @@ export interface SummaryQuery {
 }

 /** `GET /api/view/sessions`: one page of summaries, newest first. */
-export function summaries(client: Client, q: SummaryQuery = {}): Promise<SummaryPage> {
+export function summaries(client: Client, q: SummaryQuery = {}, signal?: AbortSignal): Promise<SummaryPage> {
   return client.request<SummaryPage>(
     'GET',
     `/api/view/sessions${query({
@@ -59,6 +59,7 @@ export function summaries(client: Client, q: SummaryQuery = {}): Promise<Summary
       hat: q.hat || undefined,
       lifecycle: q.lifecycle && q.lifecycle.length > 0 ? q.lifecycle.join(',') : undefined,
     })}`,
+    undefined, { signal },
   )
 }

@@ -76,7 +77,8 @@ export function catalog(client: Client, id: string): Promise<SessionCatalog> {
 /** `GET /api/sessions/{id}`: the session, its open turn and pending requests. */
 const detailReads = new WeakMap<Client, Map<string, Promise<SessionDetail>>>()

-export function sessionDetail(client: Client, id: string): Promise<SessionDetail> {
+export function sessionDetail(client: Client, id: string, signal?: AbortSignal): Promise<SessionDetail> {
+  if (signal) return client.request<SessionDetail>('GET', `/api/sessions/${enc(id)}`, undefined, { signal })
   let reads = detailReads.get(client)
   if (!reads) { reads = new Map(); detailReads.set(client, reads) }
   const held = reads.get(id)
diff --git a/web/src/app-actions.test.tsx b/web/src/app-actions.test.tsx
index c8a18d16..79f0ed2e 100644
--- a/web/src/app-actions.test.tsx
+++ b/web/src/app-actions.test.tsx
@@ -24,3 +24,22 @@ it('restores contexts without retaining a departed session', () => {
   shell(); expect(actions.context()).toEqual({})
   expect(changed).toHaveBeenCalledTimes(4); stop()
 })
+it('does not dispatch a departed action and notifies command subscribers', () => {
+  const actions = new AppActions(), run = vi.fn(), notify = vi.fn()
+  const unsubscribe = actions.subscribe(notify)
+  const remove = actions.register('toggle-details', { label: 'Details', enabled: true, run })
+  expect(actions.available().map(action => action.id)).toEqual(['toggle-details'])
+  remove(); expect(actions.dispatch('toggle-details')).toBe(false)
+  expect(run).not.toHaveBeenCalled(); expect(notify).toHaveBeenCalledTimes(2)
+  unsubscribe()
+})
+it('gives screen providers precedence over shell fallbacks regardless of effect order', () => {
+  const actions = new AppActions(), screen = vi.fn(), shell = vi.fn()
+  actions.register('search-sessions', { label: 'Search', enabled: true, run: screen }, 0)
+  actions.register('search-sessions', { label: 'Search', enabled: true, run: shell }, -1)
+  actions.dispatch('search-sessions')
+  expect(screen).toHaveBeenCalledOnce(); expect(shell).not.toHaveBeenCalled()
+  actions.registerContext({ hatId: 'session-hat', sessionId: 's' }, 0)
+  actions.registerContext({ hatId: 'overview-hat' }, -1)
+  expect(actions.context()).toEqual({ hatId: 'session-hat', sessionId: 's' })
+})
diff --git a/web/src/app-actions.tsx b/web/src/app-actions.tsx
index 2b576a0d..db1894c2 100644
--- a/web/src/app-actions.tsx
+++ b/web/src/app-actions.tsx
@@ -6,30 +6,30 @@ export type AppActionId = 'new-session' | 'search-sessions' | 'toggle-rail' | 't
 export interface AppAction { label: string; enabled: boolean; run: () => void }
 export interface AppContext { sessionId?: string; hostId?: string; cwd?: string; hatId?: string }
 export class AppActions {
-  private entries = new Map<AppActionId, { token: symbol; action: AppAction }[]>()
-  private contexts: { token: symbol; context: AppContext }[] = []
+  private entries = new Map<AppActionId, { token: symbol; action: AppAction; priority: number }[]>()
+  private contexts: { token: symbol; context: AppContext; priority: number }[] = []
   private listeners = new Set<() => void>()
   private revision = 0
   subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
   snapshot = () => this.revision
   private changed() { this.revision++; this.listeners.forEach(fn => fn()) }
-  register(id: AppActionId, action: AppAction) {
+  register(id: AppActionId, action: AppAction, priority = 0) {
     const token = Symbol(id)
-    this.entries.set(id, [...(this.entries.get(id) ?? []), { token, action }]); this.changed()
+    this.entries.set(id, [...(this.entries.get(id) ?? []), { token, action, priority }]); this.changed()
     return () => {
       const entries = (this.entries.get(id) ?? []).filter(entry => entry.token !== token)
       if (entries.length) this.entries.set(id, entries); else this.entries.delete(id)
       this.changed()
     }
   }
-  get(id: AppActionId) { return this.entries.get(id)?.at(-1)?.action }
+  get(id: AppActionId) { return this.entries.get(id)?.reduce((chosen, entry) => entry.priority >= chosen.priority ? entry : chosen).action }
   available() { return [...this.entries.keys()].flatMap(id => { const action = this.get(id); return action?.enabled ? [{ id, ...action }] : [] }) }
   dispatch(id: AppActionId): boolean { const action = this.get(id); if (!action?.enabled) return false; action.run(); return true }
-  registerContext(context: AppContext) {
-    const token = Symbol('context'); this.contexts.push({ token, context }); this.changed()
+  registerContext(context: AppContext, priority = 0) {
+    const token = Symbol('context'); this.contexts.push({ token, context, priority }); this.changed()
     return () => { this.contexts = this.contexts.filter(entry => entry.token !== token); this.changed() }
   }
-  context(): AppContext { return Object.assign({}, ...this.contexts.map(entry => entry.context)) }
+  context(): AppContext { return Object.assign({}, ...[...this.contexts].sort((a, b) => a.priority - b.priority).map(entry => entry.context)) }
 }
 const Context = createContext<AppActions | null>(null)
 export function AppActionsProvider({ children }: { children: ReactNode }) {
@@ -45,11 +45,11 @@ export function useActionSnapshot() {
 }
 const noSubscribe = () => () => {}
 const zero = () => 0
-export function useRegisterAction(id: AppActionId, action: AppAction) {
+export function useRegisterAction(id: AppActionId, action: AppAction, priority = 0) {
   const actions = useAppActions()
-  useEffect(() => actions?.register(id, action), [actions, id, action.enabled, action.label, action.run])
+  useEffect(() => actions?.register(id, action, priority), [actions, id, action.enabled, action.label, action.run, priority])
 }
-export function useRegisterContext(context: AppContext) {
+export function useRegisterContext(context: AppContext, priority = 0) {
   const actions = useAppActions()
-  useEffect(() => actions?.registerContext(context), [actions, context.sessionId, context.hostId, context.cwd, context.hatId])
+  useEffect(() => actions?.registerContext(context, priority), [actions, context.sessionId, context.hostId, context.cwd, context.hatId, priority])
 }
diff --git a/web/src/components/AttentionPreview.test.tsx b/web/src/components/AttentionPreview.test.tsx
new file mode 100644
index 00000000..6699f370
--- /dev/null
+++ b/web/src/components/AttentionPreview.test.tsx
@@ -0,0 +1,97 @@
+import { act, render, screen, waitFor } from '@testing-library/react'
+import { expect, it, vi } from 'vitest'
+import type { SessionSummary, Item } from '../generated/view'
+import { routed, json } from '../test-stream'
+import AttentionPreview, { AttentionPreviews, PreviewReader } from './AttentionPreview'
+const session = (id: string): SessionSummary => ({ session_id: id, host_id: 'h', hat_id: 'hat', agent: 'claude', cwd: '/project', lifecycle: 'active', activity: 'blocked', presumed_parked: false, question_waits: true, operator_attention: 1, parent_handled_questions: 0, created_at: '2026-10-20T10:00:00Z', last_event_at: '2026-10-20T10:00:00Z' })
+const question = (pending: string): Item => ({ id: 'question:' + pending, version: 2, ts: '', kind: 'question', pending_id: pending, question_kind: 'permission', request: { type: 'permission', title: 'Typed read-only request', options: [{ option_id: 'allow', name: 'Allow', option_kind: 'allow_once' }] }, answerable: true, answered: false, state: 'open' })
+it('limits every preview request to two, caches a snapshot and invalidates a same-time attention upsert', async () => {
+  let active = 0, maximum = 0
+  const releases: (() => void)[] = []
+  const t = routed(call => {
+    active++; maximum = Math.max(active, maximum)
+    return new Promise<Response>(resolve => { releases.push(() => { active--; resolve(call.path.includes('/questions/') ? json(question(call.path.split('/').at(-1)!)) : json({ pending: [{ pending_id: 'pending-' + call.path.split('/').at(-1), state: 'open', answered: false, payload: { title: 'Never render payload' } }] })) }) })
+  })
+  const reader = new PreviewReader(t.client), a = session('a'), b = session('b'), c = session('c')
+  const reads = [reader.read(a), reader.read(b), reader.read(c)]
+  expect(reader.read(a)).toBe(reads[0])
+  expect(t.calls).toHaveLength(2)
+  for (let i = 0; i < 6; i++) { await waitFor(() => expect(releases.length).toBeGreaterThan(i)); releases[i]() }
+  const values = await Promise.all(reads)
+  expect(maximum).toBe(2)
+  expect(values[0].question).toEqual(question('pending-a'))
+  const changed = reader.read({ ...a })
+  await waitFor(() => expect(releases).toHaveLength(7)); releases[6]()
+  await waitFor(() => expect(releases).toHaveLength(8)); releases[7]()
+  await changed
+  expect(t.calls.filter(call => call.path === '/api/sessions/a')).toHaveLength(2)
+  reader.stop()
+})
+it('uses the bounded typed question route, exposes only Open, and refetches on focus', async () => {
+  const t = routed(call => call.path.includes('/questions/') ? json(question('pending/a')) : json({ pending: [{ pending_id: 'pending/a', state: 'open', answered: false, payload: { title: 'Never render payload' } }] }))
+  render(<AttentionPreviews><AttentionPreview session={session('s/a')} /></AttentionPreviews>, { wrapper: t.wrapper })
+  const link = await screen.findByRole('link', { name: 'Open s/a' })
+  await screen.findByText('Typed read-only request', { exact: true })
+  expect(link).toHaveAttribute('href', '/sessions/s%2Fa?pending=pending%2Fa')
+  expect(screen.queryByText('Never render payload', { exact: true })).toBeNull()
+  expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull()
+  expect(t.calls.every(call => call.method === 'GET' && !call.path.includes('/stream/'))).toBe(true)
+  const count = t.calls.length
+  act(() => window.dispatchEvent(new Event('focus')))
+  await waitFor(() => expect(t.calls.length).toBe(count + 2))
+})
+it('keeps the canonical session link when previews fail and aborts reads on unmount', async () => {
+  let signal: AbortSignal | null | undefined
+  const t = routed(() => json({ code: 'unavailable', message: 'Preview failed' }, 503))
+  t.fetch.mockImplementationOnce(async (_input, options) => { signal = options?.signal; return json({ code: 'unavailable', message: 'Preview failed' }, 503) })
+  const { unmount } = render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
+  await screen.findByText(/Preview unavailable:/, { exact: true })
+  expect(screen.getByRole('link', { name: 'Open s' })).toHaveAttribute('href', '/sessions/s')
+  unmount(); expect(signal?.aborted).toBe(true)
+})
+it('does not replace a cached typed question with an older item version', async () => {
+  let version = 7
+  const t = routed(call => call.path.includes('/questions/') ? json({ ...question('p'), version }) : json({ pending: [{ pending_id: 'p', state: 'open', answered: false }] }))
+  const reader = new PreviewReader(t.client)
+  expect((await reader.read(session('s'))).question?.version).toBe(7)
+  version = 3
+  expect((await reader.read(session('s'))).question?.version).toBe(7)
+  reader.stop()
+})
+
+it.each([question('wrong-pending'), { id: 'message', version: 1, ts: '', kind: 'message', text: 'Unrelated content' }])('refuses a mismatched typed question while retaining the session link', async item => {
+  const t = routed(call => call.path.includes('/questions/') ? json(item) : json({ pending: [{ pending_id: 'expected', state: 'open', answered: false }] }))
+  render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
+  await screen.findByText('Question preview unavailable.', { exact: true })
+  expect(screen.getByRole('link', { name: 'Open s' })).toHaveAttribute('href', '/sessions/s')
+  expect(screen.queryByText('Unrelated content', { exact: true })).toBeNull()
+})
+it('does not read previews before visibility or after a card scrolls out', async () => {
+  const callbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = []
+  vi.stubGlobal('IntersectionObserver', class {
+    constructor(callback: typeof callbacks[number]) { callbacks.push(callback) }
+    observe() {}
+    disconnect() {}
+  })
+  const t = routed(call => call.path.includes('/questions/') ? json(question('p')) : json({ pending: [{ pending_id: 'p', state: 'open', answered: false }] }))
+  const view = render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
+  try {
+    await act(async () => {})
+    expect(t.calls).toHaveLength(0)
+    act(() => callbacks[0]([{ isIntersecting: true }]))
+    await screen.findByText('Typed read-only request', { exact: true })
+    expect(t.calls).toHaveLength(2)
+    act(() => callbacks[0]([{ isIntersecting: false }]))
+    view.rerender(<AttentionPreviews><AttentionPreview session={{ ...session('s'), operator_attention: 2 }} /></AttentionPreviews>)
+    await act(async () => {})
+    expect(t.calls).toHaveLength(2)
+  } finally { view.unmount(); vi.unstubAllGlobals() }
+})
+it('qualifies an incomplete real attention page without scanning more records', async () => {
+  const rows = Array.from({ length: 100 }, (_, i) => ({ id: String(i), child_id: 'another', hat_id: 'hat', pending_id: null, reason: 'child_failed' }))
+  const t = routed(call => call.path.startsWith('/api/delegation/attention') ? json(rows) : json({ pending: [] }))
+  const reader = new PreviewReader(t.client)
+  expect(await reader.read(session('s'))).toEqual({ attention: undefined, partial: true })
+  expect(t.calls.filter(call => call.path.startsWith('/api/delegation/attention'))).toHaveLength(1)
+  reader.stop()
+})
diff --git a/web/src/components/AttentionPreview.tsx b/web/src/components/AttentionPreview.tsx
new file mode 100644
index 00000000..58894adf
--- /dev/null
+++ b/web/src/components/AttentionPreview.tsx
@@ -0,0 +1,106 @@
+import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
+import { attentionPage, type OperatorAttention } from '../api/attention'
+import { messageOf } from '../api/errors'
+import { questionCard, sessionDetail } from '../api/view'
+import { useClient } from '../app-client'
+import type { Client } from '../api/client'
+import type { Item, SessionSummary } from '../generated/view'
+import { Link } from '../router'
+import { sessionPath } from './SessionRow'
+
+type Preview = { question?: Extract<Item, { kind: 'question' }>; attention?: OperatorAttention; partial?: boolean }
+/** One scheduler per visit, including detail, question and attention reads. */
+export class PreviewReader {
+  private active = 0
+  private queue: (() => void)[] = []
+  private stopped = false
+  private abort = new AbortController()
+  private cache = new WeakMap<SessionSummary, Promise<Preview>>()
+  private questions = new Map<string, Extract<Item, { kind: 'question' }>>()
+  private attention = new Map<string, Promise<OperatorAttention[]>>()
+  constructor(private client: Client) {}
+  stop() { this.stopped = true; this.abort.abort(); this.queue = []; this.cache = new WeakMap(); this.questions.clear(); this.attention.clear() }
+  private task<T>(read: () => Promise<T>): Promise<T> {
+    return new Promise<T>((resolve, reject) => {
+      const begin = () => {
+        if (this.stopped) return
+        this.active++
+        void read().then(resolve, reject).finally(() => { this.active--; if (!this.stopped) this.queue.shift()?.() })
+      }
+      if (this.active < 2) begin(); else this.queue.push(begin)
+    })
+  }
+  read(session: SessionSummary): Promise<Preview> {
+    // Every immutable summary upsert can change which pending id is live,
+    // even when its timestamp/count ties. Focus creates a new visit reader.
+    let held = this.cache.get(session)
+    if (!held) {
+      held = this.load(session); this.cache.set(session, held)
+    }
+    return held
+  }
+  private async load(session: SessionSummary): Promise<Preview> {
+    const detail = await this.task(() => sessionDetail(this.client, session.session_id, this.abort.signal))
+    if (this.stopped) return {}
+    const pending = detail.pending?.find(p => p.state === 'open' && !p.answered && !p.delivered)
+    if (pending) {
+      const item = await this.task(() => questionCard(this.client, session.session_id, pending.pending_id, this.abort.signal))
+      if (item.kind !== 'question' || item.pending_id !== pending.pending_id) throw new Error('Question preview unavailable.')
+      const key = JSON.stringify([session.session_id, pending.pending_id, item.id])
+      const before = this.questions.get(key)
+      const question = before && before.version > item.version ? before : item
+      this.questions.set(key, question)
+      return { question }
+    }
+    let rows = this.attention.get(session.hat_id)
+    if (!rows) { rows = this.task(() => attentionPage(this.client, session.hat_id, undefined, this.abort.signal)); this.attention.set(session.hat_id, rows) }
+    const page = await rows
+    return { attention: page.find(row => row.hat_id === session.hat_id && row.child_id === session.session_id && row.pending_id === null), partial: page.length === 100 }
+  }
+}
+const Context = createContext<PreviewReader | null>(null)
+export function AttentionPreviews({ children }: { children: ReactNode }) {
+  const client = useClient(), [visit, setVisit] = useState(0)
+  const [reader, setReader] = useState<PreviewReader | null>(null)
+  useEffect(() => {
+    const next = new PreviewReader(client); setReader(next)
+    return () => next.stop()
+  }, [client, visit])
+  useEffect(() => {
+    const refresh = () => setVisit(n => n + 1)
+    window.addEventListener('focus', refresh)
+    return () => window.removeEventListener('focus', refresh)
+  }, [])
+  return <Context.Provider value={reader}>{children}</Context.Provider>
+}
+export default function AttentionPreview({ session }: { session: SessionSummary }) {
+  const reader = useContext(Context), box = useRef<HTMLDivElement>(null)
+  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')
+  const [state, setState] = useState<{ reader: PreviewReader; session: SessionSummary; value?: Preview; error?: string } | null>(null)
+  useEffect(() => {
+    if (typeof IntersectionObserver === 'undefined') return
+    const observer = new IntersectionObserver(entries => setVisible(entries.some(e => e.isIntersecting)))
+    if (box.current) observer.observe(box.current)
+    return () => observer.disconnect()
+  }, [])
+  useEffect(() => {
+    if (!reader || !visible) return
+    let live = true
+    reader.read(session).then(value => { if (live) setState({ reader, session, value }) }, error => { if (live) setState({ reader, session, error: messageOf(error) }) })
+    return () => { live = false }
+  }, [reader, visible, session])
+  const held = state?.reader === reader && state?.session === session ? state : null
+  const question = held?.value?.question
+  const request = question?.request
+  const title = request?.type === 'permission' ? request.title || 'Permission request' : request?.type === 'elicitation' ? request.message : undefined
+  const target = question ? `${sessionPath(session.session_id)}?pending=${encodeURIComponent(question.pending_id)}` : sessionPath(session.session_id)
+  return <div ref={box} className="attention-preview">
+    {title && <p className="preview-question"><bdi>{title}</bdi></p>}
+    {question && (!question.answerable || question.answered || question.state !== 'open') && <p>The request changed. Open the session for its current state.</p>}
+    {held?.value?.attention && <p><bdi>{held.value.attention.reason}</bdi></p>}
+    {held?.value?.partial && !held.value.attention && <p>More attention records are available in the session.</p>}
+    {held?.error && <p className="preview-error">Preview unavailable: <bdi>{held.error}</bdi></p>}
+    {!held && <p className="preview-note">Open the session to review the current request.</p>}
+    <Link data-session-link to={target} className="btn btn-ghost" aria-label={`Open ${session.title || session.session_id}`}>{question ? request?.type === 'permission' ? 'Open request' : 'Open question' : 'Open session'}</Link>
+  </div>
+}
diff --git a/web/src/components/BottomNavigation.tsx b/web/src/components/BottomNavigation.tsx
new file mode 100644
index 00000000..fde71c7c
--- /dev/null
+++ b/web/src/components/BottomNavigation.tsx
@@ -0,0 +1,9 @@
+import { Link } from '../router'
+import type { DeploymentMode } from '../generated/protocol'
+import { LABEL, PATH, tabsOf, type View } from '../lib/views'
+import { Icon } from './ui'
+import { NAV_ICON } from './NavigationRail'
+import { WaitingBadge } from './SessionScope'
+export default function BottomNavigation({ mode, current }: { mode: DeploymentMode; current: View | null }) {
+  return <nav className="tabbar" aria-label="Primary navigation">{tabsOf(mode).map(v => <Link key={v} to={PATH[v]} className={'tab' + (v === current ? ' on' : '')} aria-label={v === 'new' ? 'New' : LABEL[v]} aria-current={v === current ? 'page' : undefined}><Icon name={NAV_ICON[v]} size={20} /><span>{v === 'new' ? 'New' : LABEL[v]}</span>{v === 'needs-you' && <WaitingBadge />}</Link>)}</nav>
+}
diff --git a/web/src/components/HatSwitch.tsx b/web/src/components/HatSwitch.tsx
index 34d5ce04..8e1dfa4b 100644
--- a/web/src/components/HatSwitch.tsx
+++ b/web/src/components/HatSwitch.tsx
@@ -1,6 +1,7 @@
 // The hat selector (frontend spec §5): every hat, or one. The hats are the
 // server's; the app never computes a session's hat.
 import type { HatItem } from '../generated/protocol'
+import { HatChip } from './ui'

 interface Props {
   hats: readonly HatItem[] | null
@@ -10,7 +11,7 @@ interface Props {
 }

 export default function HatSwitch({ hats, hat, onHat }: Props) {
-  const choices = [{ id: '', name: 'All hats' }, ...(hats ?? []).map((h) => ({ id: h.id, name: h.name }))]
+  const choices = [{ id: '', name: 'All hats', colour: undefined }, ...(hats ?? []).map((h) => ({ id: h.id, name: h.name, colour: h.colour }))]
   return (
     <div className="hat-switch list-hats" role="group" aria-label="Hat">
       {choices.map((c) => (
@@ -19,9 +20,10 @@ export default function HatSwitch({ hats, hat, onHat }: Props) {
           type="button"
           className={'chip' + (hat === c.id ? ' on' : '')}
           aria-pressed={hat === c.id}
+          aria-label={c.name}
           onClick={() => onHat(c.id)}
         >
-          <bdi>{c.name}</bdi>
+          {c.id ? <HatChip colour={c.colour}><bdi>{c.name}</bdi></HatChip> : <bdi>{c.name}</bdi>}
         </button>
       ))}
     </div>
diff --git a/web/src/components/Markdown.test.tsx b/web/src/components/Markdown.test.tsx
index 5f9d7127..e926e43c 100644
--- a/web/src/components/Markdown.test.tsx
+++ b/web/src/components/Markdown.test.tsx
@@ -150,7 +150,7 @@ describe('Markdown', () => {
   // rules themselves: Tailwind's preflight sets lists to no markers, and the
   // two places Markdown renders into must put them back (client view §5.3).
   it('has its containers restore list markers over the reset', () => {
-    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8').replace(/\s+/g, ' ')
+    const css = readFileSync(join(process.cwd(), 'src/styles/session.css'), 'utf8').replace(/\s+/g, ' ')
     for (const scope of ['.bubble', '.think-body']) {
       expect(css).toMatch(new RegExp(`${scope.replace('.', '\\.')} ul[^{]*\\{[^}]*list-style:disc`))
       expect(css).toMatch(new RegExp(`${scope.replace('.', '\\.')} ol[^{]*\\{[^}]*list-style:decimal`))
diff --git a/web/src/components/NavigationRail.tsx b/web/src/components/NavigationRail.tsx
new file mode 100644
index 00000000..bba2b79a
--- /dev/null
+++ b/web/src/components/NavigationRail.tsx
@@ -0,0 +1,29 @@
+import { useSessionScope, WaitingBadge } from './SessionScope'
+import { Link } from '../router'
+import { LABEL, PATH, type View } from '../lib/views'
+import { AppearanceButton, HatChip, Icon, type IconName } from './ui'
+import CommandEntry from './CommandEntry'
+import { McpBadge } from './McpScope'
+import SignOut from './SignOut'
+import { needsOperator } from '../lib/status'
+export const NAV_ICON: Record<View, IconName> = { 'needs-you': 'hand-raised', sessions: 'rectangle-stack', new: 'plus', defaults: 'adjustments-horizontal', hosts: 'server-stack', mcp: 'puzzle-piece', hats: 'rectangle-stack', settings: 'adjustments-horizontal', more: 'ellipsis-horizontal' }
+export default function NavigationRail({ views, current, collapsed, toggle }: { views: readonly View[]; current: View | null; collapsed: boolean; toggle: () => void }) {
+  const scope = useSessionScope()
+  const hosts = scope?.hosts?.filter(h => h.revoked_at == null)
+  const navigation = (view: View) => <Link key={view} to={PATH[view]} aria-label={LABEL[view]} title={LABEL[view]} className={'nav-item' + (current === view ? ' on' : '')} aria-current={current === view ? 'page' : undefined}><Icon name={NAV_ICON[view]} size={18} /><span className="nav-label">{view === 'sessions' ? 'All sessions' : LABEL[view]}</span>{view === 'needs-you' && <WaitingBadge />}{view === 'mcp' && <McpBadge />}</Link>
+  const hatLinks = scope ? [{ id: '', name: 'All hats', colour: undefined }, ...(scope.hats ?? [])] : []
+  return <aside className={'rail' + (collapsed ? ' rail-collapsed' : '')} aria-label="Views">
+    <div className="rail-head"><span className="brand-name" title="hennery">hennery</span><button type="button" className="rail-collapse" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={toggle}><Icon name={collapsed ? 'chevron-double-right' : 'chevron-double-left'} size={18} /></button></div>
+    <CommandEntry compact={collapsed} />
+    <nav className="rail-nav" aria-label="Main navigation">
+      <div>{views.filter(view => ['needs-you', 'sessions', 'new'].includes(view)).map(navigation)}</div>
+      {scope && <div className="rail-hats"><div className="nav-label nav-section-label">Hats</div>{hatLinks.map(hat => {
+        const loaded = scope.list.shown.filter(s => !hat.id || s.hat_id === hat.id)
+        const waiting = loaded.filter(needsOperator).length
+        return <Link key={hat.id} to={`/sessions?hat=${encodeURIComponent(hat.id)}`} className={'rail-hat' + (scope.hat === hat.id ? ' on' : '')} aria-label={hat.name} title={`${hat.name} · ${loaded.length} loaded · ${waiting} need you`}><HatChip colour={hat.colour}><span className="nav-label"><bdi>{hat.name}</bdi></span></HatChip><span className="nav-label hat-loaded">{loaded.length} loaded</span>{waiting > 0 && <span className="hat-attention" aria-label={`${waiting} loaded sessions need you`}>●</span>}</Link>
+      })}</div>}
+      <div><div className="nav-label nav-section-label">Configure</div>{views.filter(view => !['more', 'needs-you', 'sessions', 'new'].includes(view)).map(navigation)}</div>
+    </nav>
+    <div className="rail-foot"><span className="owner-mark">O<span className="nav-label">Owner</span></span>{scope && <span className="host-fraction" title="Online / owned non-revoked hosts">{hosts ? `${hosts.filter(h => h.connected).length}/${hosts.length} hosts online` : 'Hosts unknown'}</span>}<AppearanceButton />{current !== 'settings' && current !== 'more' && <SignOut />}</div>
+  </aside>
+}
diff --git a/web/src/components/NeedsYou.test.tsx b/web/src/components/NeedsYou.test.tsx
new file mode 100644
index 00000000..6707591e
--- /dev/null
+++ b/web/src/components/NeedsYou.test.tsx
@@ -0,0 +1,129 @@
+import { act, render, screen, waitFor, within } from '@testing-library/react'
+import userEvent from '@testing-library/user-event'
+import { afterEach, expect, it } from 'vitest'
+import App from '../App'
+import { navigate } from '../router'
+import { hat, host } from '../test-fixtures'
+import { json, liveStream, routed, type LiveStream } from '../test-stream'
+import type { SessionSummary } from '../generated/view'
+const ts = '2026-10-20T10:00:00Z'
+const row = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, host_id: 'host-1', hat_id: 'hat-b', agent: 'claude', cwd: '/project', title: id, lifecycle: 'active', activity: 'blocked', presumed_parked: false, question_waits: false, operator_attention: 1, parent_handled_questions: 0, created_at: ts, last_event_at: ts, ...patch })
+const page = (sessions: SessionSummary[], next?: string) => json({ sessions, next_cursor: next, waiting: 2, epoch: 'list', revision: 1 })
+afterEach(() => { history.replaceState(null, '', '/'); localStorage.clear() })
+it('isolates hat-only/all-lifecycle queue pages and restores restrictive overview filters without another live SSE', async () => {
+  localStorage.setItem('hennery.hat', 'hat-b')
+  history.replaceState(null, '', '/sessions')
+  const streams: LiveStream[] = []
+  const server = routed(({ path }) => {
+    const url = new URL(path, 'http://fixture')
+    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
+    if (path === '/api/hats') return json([hat()])
+    if (path === '/api/hosts') return json([host(), host({ host_id: 'excluded', name: 'Excluded host' })])
+    if (url.pathname === '/api/view/sessions') {
+      if (url.searchParams.has('q') || url.searchParams.has('lifecycle')) return page([row('overview', { operator_attention: 0, lifecycle: 'parked' })])
+      if (!url.searchParams.has('cursor')) return page([row('parent-handled', { operator_attention: 0, parent_handled_questions: 1 }), row('queued-answer', { operator_attention: 0, question_waits: true })], 'next')
+      return page([row('active-request'), row('closed-status', { lifecycle: 'closed' })])
+    }
+    if (url.pathname === '/api/stream/sessions') { const stream = liveStream(); streams.push(stream); return stream.response }
+    if (url.pathname.startsWith('/api/sessions/')) return json({ pending: [], ...row(url.pathname.split('/').at(-1)!) })
+    if (url.pathname === '/api/delegation/attention') return json([{ id: 'attention', child_id: 'closed-status', hat_id: 'hat-b', pending_id: null, reason: 'child_failed' }])
+    return json({ code: 'not_found', message: 'missing fixture' }, 404)
+  })
+  render(<App fetchImpl={server.fetch as typeof fetch} />)
+  const overview = await screen.findByRole('region', { name: 'Session list' })
+  await userEvent.selectOptions(within(overview).getByRole('combobox', { name: 'Lifecycle' }), 'parked')
+  await userEvent.selectOptions(within(overview).getByRole('combobox', { name: 'Host' }), 'excluded')
+  await userEvent.click(within(overview).getByRole('button', { name: /^Failed/ }))
+  await userEvent.type(within(overview).getByRole('searchbox', { name: 'Search sessions' }), 'unrelated')
+  await waitFor(() => expect(server.calls.some(c => c.path.includes('q=unrelated'))).toBe(true))
+  act(() => navigate('/needs-you'))
+  const queue = await screen.findByRole('region', { name: 'Attention queue' })
+  await within(queue).findByRole('link', { name: 'Open closed-status' })
+  expect(within(queue).getByRole('link', { name: 'Open active-request' })).toBeInTheDocument()
+  expect(within(queue).queryByText('parent-handled', { exact: true })).toBeNull()
+  expect(within(queue).queryByText('queued-answer', { exact: true })).toBeNull()
+  expect(within(queue).getByText('child_failed', { exact: true })).toBeInTheDocument()
+  const reads = server.calls.filter(c => c.path.startsWith('/api/view/sessions?')).slice(-2).map(c => new URL(c.path, 'http://fixture').searchParams)
+  expect(reads.map(params => [...params.keys()])).toEqual([['hat'], ['cursor', 'hat']])
+  expect(reads.every(params => params.get('hat') === 'hat-b')).toBe(true)
+  expect(streams.filter(s => !s.cancelled)).toHaveLength(1)
+  const before = server.calls.filter(c => c.path.startsWith('/api/view/sessions')).length
+  act(() => streams.at(-1)!.event('session_upsert', row('active-request', { operator_attention: 0 })))
+  await waitFor(() => expect(within(queue).queryByRole('link', { name: 'Open active-request' })).toBeNull())
+  expect(server.calls.filter(c => c.path.startsWith('/api/view/sessions'))).toHaveLength(before)
+  act(() => navigate('/more')); act(() => navigate('/sessions'))
+  const restored = await screen.findByRole('region', { name: 'Session list' })
+  expect(within(restored).getByRole('searchbox')).toHaveValue('unrelated')
+  expect(within(restored).getByRole('combobox', { name: 'Lifecycle' })).toHaveValue('parked')
+  expect(within(restored).getByRole('combobox', { name: 'Host' })).toHaveValue('excluded')
+  expect(within(restored).getByRole('button', { name: /^Failed/ })).toHaveAttribute('aria-pressed', 'true')
+  expect(within(restored).getByRole('button', { name: 'Hide closed' })).toHaveAttribute('aria-pressed', 'true')
+  await waitFor(() => expect(streams.filter(s => !s.cancelled)).toHaveLength(1))
+  expect(server.calls.filter(c => c.path.startsWith('/api/stream/view/'))).toHaveLength(0)
+})
+it('scans at most three pages per deliberate visit/load more and never claims an incomplete queue is empty', async () => {
+  history.replaceState(null, '', '/needs-you')
+  let pages = 0
+  const server = routed(({ path }) => {
+    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
+    if (path === '/api/hats') return json([hat()])
+    if (path === '/api/hosts') return json([])
+    if (path.startsWith('/api/view/sessions')) { pages++; return page([], pages < 5 ? String(pages) : undefined) }
+    if (path.startsWith('/api/stream/sessions')) return liveStream().response
+    return json({}, 404)
+  })
+  render(<App fetchImpl={server.fetch as typeof fetch} />)
+  await waitFor(() => expect(pages).toBe(3))
+  expect(screen.getByText('0 loaded · 2 need you', { exact: true })).toBeInTheDocument()
+  expect(screen.queryByText('Nothing needs you', { exact: true })).toBeNull()
+  await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
+  await waitFor(() => expect(pages).toBe(5))
+  expect(screen.getByText('0 loaded · 2 need you', { exact: true })).toBeInTheDocument()
+  expect(screen.queryByText('Nothing needs you', { exact: true })).toBeNull()
+  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
+})
+it('retries a failed queue page deliberately and resumes its bounded batch', async () => {
+  history.replaceState(null, '', '/needs-you')
+  let pages = 0
+  const server = routed(({ path }) => {
+    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
+    if (path === '/api/hats' || path === '/api/hosts') return json([])
+    if (path.startsWith('/api/view/sessions')) {
+      pages++
+      if (pages === 2) return json({ code: 'unavailable', message: 'Page unavailable' }, 503)
+      return page([], pages < 5 ? String(pages) : undefined)
+    }
+    if (path.startsWith('/api/stream/sessions')) return liveStream().response
+    return json({}, 404)
+  })
+  render(<App fetchImpl={server.fetch as typeof fetch} />)
+  await screen.findByRole('alert')
+  expect(pages).toBe(2)
+  await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
+  await waitFor(() => expect(pages).toBe(5))
+  expect(screen.queryByRole('alert')).toBeNull()
+})
+it('opens a fresh attention baseline when the overview already requests every lifecycle', async () => {
+  localStorage.setItem('hennery.hideClosed', 'false')
+  history.replaceState(null, '', '/sessions')
+  const reads: URL[] = []
+  const server = routed(({ path }) => {
+    const url = new URL(path, 'http://fixture')
+    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
+    if (path === '/api/hats' || path === '/api/hosts') return json([])
+    if (url.pathname === '/api/view/sessions') {
+      reads.push(url)
+      return reads.length === 1 ? page([], 'overview-cursor') : page([row('closed', { lifecycle: 'closed' })])
+    }
+    if (path.startsWith('/api/stream/sessions')) return liveStream().response
+    if (path.startsWith('/api/sessions/')) return json({ pending: [] })
+    if (path.startsWith('/api/delegation/attention')) return json([])
+    return json({}, 404)
+  })
+  render(<App fetchImpl={server.fetch as typeof fetch} />)
+  await screen.findByRole('button', { name: 'Load more' })
+  act(() => navigate('/needs-you'))
+  await screen.findByRole('link', { name: 'Open closed' })
+  expect(reads).toHaveLength(2)
+  expect(reads.every(read => read.search === '')).toBe(true)
+})
diff --git a/web/src/components/NeedsYouQueue.tsx b/web/src/components/NeedsYouQueue.tsx
new file mode 100644
index 00000000..e62f4773
--- /dev/null
+++ b/web/src/components/NeedsYouQueue.tsx
@@ -0,0 +1,46 @@
+import { useEffect, useRef } from 'react'
+import { needsOperator, statusOf } from '../lib/status'
+import { relTime } from '../lib/time'
+import { useNow } from '../hooks/useNow'
+import { Link } from '../router'
+import { agentLabel } from '../lib/agent'
+import { useSessionScope } from './SessionScope'
+import AttentionPreview, { AttentionPreviews } from './AttentionPreview'
+import { moveListFocus } from './SessionList'
+import { HatChip } from './ui'
+export default function NeedsYouQueue() {
+  const scope = useSessionScope(), now = useNow(60_000)
+  const scan = useRef({ key: '', remaining: 2 })
+  const list = scope?.list
+  useEffect(() => {
+    if (!list) return
+    if (scan.current.key !== list.queryKey) scan.current = { key: list.queryKey, remaining: 2 }
+    if (list.loading || list.loadingMore || list.error || !list.hasMore || scan.current.remaining === 0) return
+    scan.current.remaining--
+    void list.loadMore()
+  }, [list?.queryKey, list?.loading, list?.loadingMore, list?.hasMore, list?.error, list?.loadMore])
+  if (!scope || !list) return null
+  const rows = list.shown.filter(needsOperator)
+  const total = list.counts.waiting
+  const complete = !list.loading && !list.hasMore && !list.error
+  return <section className="needs-queue" aria-label="Attention queue" onKeyDown={moveListFocus}>
+    <div className="queue-heading"><span>{rows.length} loaded · {list.loading ? 'checking attention' : `${total} need you`}</span><span>Most recent first</span></div>
+    <p className="queue-help">Permissions, questions and delegation attention. Open a session to respond.</p>
+    {list.error && <p role="alert" className="form-error"><bdi>{list.error}</bdi></p>}
+    {list.stream === 'reconnecting' && <p role="status">Reconnecting…</p>}
+    {list.loading && <p role="status">Loading attention…</p>}
+    {!list.loading && !rows.length && <p className="queue-empty">{complete && total === 0 ? 'Nothing needs you' : 'No attention loaded yet'}</p>}
+    <AttentionPreviews>{rows.map(session => {
+      const hat = scope.hats?.find(h => h.id === session.hat_id)
+      return <article key={session.session_id} className="attention-card" aria-label={session.title || session.session_id}>
+        <div className="attention-card-meta"><span className="attention-status">{statusOf(session).label}</span><span>{relTime(session.last_event_at, now)}</span></div>
+        <h2><bdi>{session.title || session.session_id}</bdi></h2>
+        <div className="attention-origin"><HatChip colour={hat?.colour}><bdi>{hat?.name || 'Unknown hat'}</bdi></HatChip><bdi>{scope.hostNames.get(session.host_id) || 'Unknown host'}</bdi><bdi>{agentLabel(session.agent)}</bdi></div>
+        <AttentionPreview session={session} />
+      </article>
+    })}</AttentionPreviews>
+    {!list.loading && list.hasMore && <button type="button" className="btn btn-ghost" disabled={list.loadingMore} onClick={() => { scan.current.remaining = 2; void list.loadMore() }}>{list.loadingMore ? 'Loading…' : 'Load more'}</button>}
+    <p className="queue-help queue-keys">J / K moves between focused cards. Enter opens the current request.</p>
+    <Link className="queue-summary" to="/sessions">View sessions · {list.shown.filter(s => s.lifecycle === 'active' && s.activity === 'running').length} running · {list.shown.filter(s => s.lifecycle === 'active' && s.activity === 'idle').length} idle · {list.shown.filter(s => s.lifecycle === 'parked').length} parked{list.hasMore ? ' (loaded)' : ''}</Link>
+  </section>
+}
diff --git a/web/src/components/NewSessionFrame.test.tsx b/web/src/components/NewSessionFrame.test.tsx
new file mode 100644
index 00000000..c7277f29
--- /dev/null
+++ b/web/src/components/NewSessionFrame.test.tsx
@@ -0,0 +1,29 @@
+import { render, screen, waitFor, within } from '@testing-library/react'
+import userEvent from '@testing-library/user-event'
+import { afterEach, expect, it } from 'vitest'
+import App from '../App'
+import { FULL, json, stubServer } from '../test-server'
+const server = () => stubServer({ 'GET /api/capabilities': json(200, FULL), 'GET /api/hosts': json(200, []), 'GET /api/hats': json(200, []), 'GET /api/view/sessions?lifecycle=starting%2Cactive%2Cparked%2Cfailed': json(200, { sessions: [], waiting: 0, epoch: 'e', revision: 1 }) })
+afterEach(() => { history.replaceState(null, '', '/'); localStorage.clear() })
+it('direct launcher Escape returns to Sessions without Back into unrelated history', async () => {
+  history.replaceState(null, '', '/new?host=unknown')
+  render(<App fetchImpl={server().fetch} />)
+  const dialog = await screen.findByRole('dialog', { name: 'New session' })
+  expect(dialog).toHaveAttribute('aria-modal', 'true')
+  expect(document.querySelector<HTMLElement>('.rail')?.inert).toBe(true)
+  await userEvent.keyboard('{Escape}')
+  await waitFor(() => expect(location.pathname).toBe('/sessions'))
+  expect(screen.queryByRole('dialog')).toBeNull()
+  expect(document.querySelector<HTMLElement>('.rail')?.inert).toBe(false)
+  await waitFor(() => expect(screen.getByRole('heading', { name: 'Sessions' })).toHaveFocus())
+})
+it('Close returns to the known app opener and restores its trigger focus', async () => {
+  history.replaceState(null, '', '/more')
+  render(<App fetchImpl={server().fetch} />)
+  const rail = await screen.findByRole('complementary', { name: 'Views' })
+  await userEvent.click(within(rail).getByRole('link', { name: 'New session' }))
+  const dialog = await screen.findByRole('dialog', { name: 'New session' })
+  await userEvent.click(within(dialog).getByRole('button', { name: 'Close new session' }))
+  await waitFor(() => expect(location.pathname).toBe('/more'))
+  await waitFor(() => expect(within(rail).getByRole('link', { name: 'New session' })).toHaveFocus())
+})
diff --git a/web/src/components/NewSessionFrame.tsx b/web/src/components/NewSessionFrame.tsx
new file mode 100644
index 00000000..fa4f288b
--- /dev/null
+++ b/web/src/components/NewSessionFrame.tsx
@@ -0,0 +1,28 @@
+// Route frame handed to R4; form state and configuration remain screen-owned.
+import { useEffect, useRef, type ReactNode } from 'react'
+import { launcherReturn, navigate } from '../router'
+import { Icon, useModalLayer } from './ui'
+import Sessions from '../screens/Sessions'
+export default function NewSessionFrame({ children }: { children: ReactNode }) {
+  const ref = useRef<HTMLDivElement>(null), closing = useRef(false)
+  const { trap, holdFocus } = useModalLayer(ref)
+  const close = () => { closing.current = true; navigate(launcherReturn(), { replace: true }) }
+  useEffect(() => {
+    const before = document.activeElement as HTMLElement | null
+    ref.current?.focus()
+    const observer = new MutationObserver(() => {
+      if (document.activeElement !== ref.current) return
+      ref.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled])')?.focus()
+    })
+    if (ref.current) observer.observe(ref.current, { childList: true, subtree: true })
+    return () => {
+      observer.disconnect()
+      if (!closing.current) return
+      requestAnimationFrame(() => {
+        if (before?.isConnected && before !== document.body) before.focus()
+        else { const heading = document.querySelector<HTMLElement>('main h1'); if (heading) { heading.tabIndex = -1; heading.focus() } }
+      })
+    }
+  }, [])
+  return <><div inert aria-hidden="true"><Sessions /></div><div className="overlay" onMouseDown={holdFocus}><div ref={ref} className="modal launcher-frame" role="dialog" aria-label="New session" aria-modal="true" tabIndex={-1} onKeyDown={event => trap(event, close)}><button type="button" className="modal-x" aria-label="Close new session" onClick={close}><Icon name="x-mark" size={18} /></button>{children}</div></div></>
+}
diff --git a/web/src/components/SessionFilters.tsx b/web/src/components/SessionFilters.tsx
new file mode 100644
index 00000000..95fb9a66
--- /dev/null
+++ b/web/src/components/SessionFilters.tsx
@@ -0,0 +1,21 @@
+import { useEffect, useRef } from 'react'
+import { useLocation } from '../router'
+import { LIFECYCLES } from '../store/sessionList'
+import { STATUS_FILTERS, STATUS_LABEL, matchesStatus } from '../lib/status'
+import { SEARCH_MAX_CHARS, useSessionScope } from './SessionScope'
+export default function SessionFilters() {
+  const scope = useSessionScope(), searchRef = useRef<HTMLInputElement>(null)
+  const { search } = useLocation()
+  useEffect(() => { if (new URLSearchParams(search).has('search')) searchRef.current?.focus() }, [search])
+  if (!scope) return null
+  const { list, query, setQuery, hideClosed, setHideClosed, lifecycle, setLifecycle, host, setHost, status, setStatus, group, setGroup, hosts } = scope
+  return <div className="overview-filters">
+    <fieldset className="group-choice"><legend>Group by</legend>{(['hat', 'host'] as const).map(value => <label key={value}><input type="radio" name="group" value={value} checked={group === value} onChange={() => setGroup(value)} />By {value}</label>)}</fieldset>
+    <div className="status-filters" role="group" aria-label="Status">{STATUS_FILTERS.map(value => <button type="button" key={value} aria-pressed={status === value} disabled={list.searching} className={'chip' + (status === value ? ' on' : '')} onClick={() => setStatus(value)}>{STATUS_LABEL[value]} <span>{list.shown.filter(s => matchesStatus(s, value)).length}{list.hasMore ? ' loaded' : ''}</span></button>)}</div>
+    <div className="filter-fields"><label>Search sessions<input ref={searchRef} type="search" aria-label="Search sessions" placeholder="Title, path or branch…" value={query} onChange={e => setQuery(e.target.value)} maxLength={SEARCH_MAX_CHARS} /></label>
+    <label>Host<select aria-label="Host" value={host} onChange={e => setHost(e.target.value)} disabled={list.searching}><option value="">All hosts</option>{hosts?.filter(h => h.revoked_at == null).map(h => <option key={h.host_id} value={h.host_id}>{h.name}</option>)}</select></label>
+    <button type="button" className={'toggle' + (hideClosed ? ' on' : '')} aria-pressed={hideClosed} disabled={list.searching} onClick={() => setHideClosed(!hideClosed)}>Hide closed</button>
+    <label>Lifecycle<select aria-label="Lifecycle" value={lifecycle} disabled={list.searching} onChange={e => setLifecycle(e.target.value)}><option value="">Any lifecycle</option>{LIFECYCLES.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label></div>
+    {list.searching && <p className="list-note">Searching every session in this hat.</p>}
+  </div>
+}
diff --git a/web/src/components/SessionLink.test.tsx b/web/src/components/SessionLink.test.tsx
index b9f7cab7..299b0f3f 100644
--- a/web/src/components/SessionLink.test.tsx
+++ b/web/src/components/SessionLink.test.tsx
@@ -7,6 +7,7 @@ import { readFileSync } from 'node:fs'
 import { join } from 'node:path'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import App from '../App'
+import { navigate } from '../router'
 import type { HatItem, SessionDetail } from '../generated/protocol'
 import type { Item, SessionSummary, SummaryPage } from '../generated/view'
 import { json, liveStream, type LiveStream } from '../test-stream'
@@ -170,13 +171,15 @@ describe('the session’s header, from the list (F-4)', () => {
     render(<App fetchImpl={s.fetch} />)
     await titled('Task a')
     const list = await screen.findByRole('complementary', { name: 'Views' })
-    expect(within(list).getByText('Task a', { exact: true })).toBeInTheDocument()
+    expect(within(list).getByRole('link', { name: 'All hats' })).toHaveAttribute('title', 'All hats · 3 loaded · 0 need you')
     await waitFor(() => expect(s.itemStreams).toHaveLength(1))
     // The item stream says so; the list stream has not yet.
     act(() => s.itemStreams[0].event('session_removed', { session_id: 'a' }))
     expect(await within(main()).findByRole('heading', { name: 'This session was deleted' })).toBeInTheDocument()
-    await waitFor(() => expect(within(list).queryByText('Task a', { exact: true })).toBeNull())
-    expect(within(list).getByText('Task a-old', { exact: true })).toBeInTheDocument()
+    act(() => navigate('/sessions'))
+    const overview = await screen.findByRole('region', { name: 'Session list' })
+    expect(within(overview).queryByText('Task a', { exact: true })).toBeNull()
+    expect(within(overview).getByText('Task a-old', { exact: true })).toBeInTheDocument()
   })

   it('uses the same detail for the header when the list does not hold the session', async () => {
@@ -189,16 +192,17 @@ describe('the session’s header, from the list (F-4)', () => {
     expect(s.of('/api/sessions/a')).toHaveLength(0)
   })

-  it('keeps the header while the list starts over for a search', async () => {
-    at('/sessions/a')
+  it('retains the known header while an overview search page is still pending', async () => {
+    at('/sessions')
     // The search's page never comes.
     const s = server({ list: (params) => (params.get('q') ? new Promise<Response>(() => {}) : json(listPage(ROWS))) })
     render(<App fetchImpl={s.fetch} />)
-    await titled('Task a')
-    const views = await rail()
-    await userEvent.type(within(views).getByRole('searchbox', { name: 'Search sessions' }), 'zzz')
+    const overview = await screen.findByRole('region', { name: 'Session list' })
+    await within(overview).findByText('Task a', { exact: true })
+    await userEvent.type(within(overview).getByRole('searchbox', { name: 'Search sessions' }), 'zzz')
     await waitFor(() => expect(s.of(LIST).some((u) => u.searchParams.get('q') === 'zzz')).toBe(true), { timeout: 3000 })
-    expect(title()).toHaveTextContent('Task a')
+    act(() => navigate('/sessions/a'))
+    await titled('Task a')
     expect(s.of('/api/sessions/a')).toHaveLength(1)
   })

@@ -222,7 +226,8 @@ describe('a session’s link (F-11, F-19)', () => {
     await titled('Detail b')
     expect(await within(main()).findByText('b says hello')).toBeInTheDocument()
     const views = await rail()
-    await waitFor(() => expect(within(views).queryAllByRole('link').filter((l) => l.classList.contains('sess'))).toHaveLength(2))
+    expect(screen.queryByRole('region', { name: 'Session list' })).toBeNull()
+    expect(localStorage.getItem('hennery.hat')).toBe('hat-a')
     expect(within(views).queryByText('Task b')).toBeNull()
     expect(location.pathname).toBe('/sessions/b')
     expect(s.of('/api/sessions/b')).toHaveLength(1)
@@ -247,16 +252,16 @@ describe('a session’s link (F-11, F-19)', () => {
     await waitFor(() => expect(s.listStreams).toHaveLength(1))
     act(() => s.listStreams[0].event('session_upsert', summary('newest', { last_event_at: '2026-10-02T12:00:00.000Z' }), 'e1:2'))
     const views = await rail()
-    await within(views).findByText('Task newest')
+    await waitFor(() => expect(within(views).getByRole('link', { name: 'All hats' })).toHaveAttribute('title', 'All hats · 4 loaded · 0 need you'))
     expect(location.pathname).toBe('/sessions/a-old')
     expect(title()).toHaveTextContent('Task a-old')
   })

   it('is restored by a reload', async () => {
-    at('/sessions/a')
+    at('/sessions')
     const s = server()
     const first = render(<App fetchImpl={s.fetch} />)
-    await userEvent.click(await within(await rail()).findByText('Task a-old'))
+    await userEvent.click(await within(await screen.findByRole('region', { name: 'Session list' })).findByText('Task a-old', { exact: true }))
     await within(main()).findByText('a-old says hello')
     first.unmount()
     // A reload: a new app at the same address.
@@ -266,11 +271,12 @@ describe('a session’s link (F-11, F-19)', () => {
     expect(location.pathname).toBe('/sessions/a-old')
   })

-  it('shows the list in the rail and the session beside it on a desktop', async () => {
+  it('shows navigation and the selected session without an overview side list on desktop', async () => {
     at('/sessions/a')
     const s = server()
     render(<App fetchImpl={s.fetch} />)
-    expect(await within(await rail()).findByRole('region', { name: 'Session list' })).toBeInTheDocument()
+    expect(within(await rail()).getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
+    expect(screen.queryByRole('region', { name: 'Session list' })).toBeNull()
     expect(await within(main()).findByText('a says hello')).toBeInTheDocument()
     expect(within(main()).queryByRole('region', { name: 'Session list' })).toBeNull()
   })
@@ -297,7 +303,7 @@ describe('a session’s link (F-11, F-19)', () => {
   // jsdom applies no media query: the rules themselves. The way back is
   // hidden by default and shown under 768 px by a later rule.
   it('has its way back shown under 768 px', () => {
-    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8').replace(/\s+/g, ' ')
+    const css = readFileSync(join(process.cwd(), 'src/styles/session.css'), 'utf8').replace(/\s+/g, ' ')
     const hidden = css.indexOf('.back-btn { display:none; }')
     expect(hidden).toBeGreaterThan(-1)
     const mobile = /@media \(max-width:767px\) \{((?:[^{}]*\{[^}]*\})*)[^{}]*\}/g
diff --git a/web/src/components/SessionList.test.tsx b/web/src/components/SessionList.test.tsx
index bd8bd187..2630a0f9 100644
--- a/web/src/components/SessionList.test.tsx
+++ b/web/src/components/SessionList.test.tsx
@@ -127,8 +127,8 @@ afterEach(() => {
   vi.useRealTimers()
 })

-describe('day headings', () => {
-  it('are headings, in order, from calendar-local midnights', async () => {
+describe('group headings and clock', () => {
+  it('groups dates under the actual hat instead of day headings', async () => {
     vi.useFakeTimers({ toFake: ['Date'] })
     vi.setSystemTime(new Date(2026, 9, 2, 12, 0))
     const local = (d: number, h = 10) => new Date(2026, 9, d, h, 0).toISOString()
@@ -150,10 +150,10 @@ describe('day headings', () => {
     const headings = within(region)
       .getAllByRole('heading', { level: 2 })
       .map((h) => h.querySelector('.grp-title')?.textContent)
-    expect(headings).toEqual(['Today', 'Yesterday', 'This week', 'This month', 'Earlier'])
+    expect(headings).toEqual(['Work'])
   })

-  it('move on with the clock on an idle list: across midnight Today becomes Yesterday, and 29m ago 31m ago', async () => {
+  it('retains the hat group across midnight while relative time advances without refetch', async () => {
     // No list event and no fetch after the first page: only the clock moves.
     vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
     vi.setSystemTime(new Date(2026, 9, 2, 23, 59))
@@ -167,10 +167,10 @@ describe('day headings', () => {
         .getAllByRole('heading', { level: 2 })
         .map((h) => h.querySelector('.grp-title')?.textContent)
     const time = () => region.querySelector('.sess-time')?.textContent
-    expect(headings()).toEqual(['Today'])
+    expect(headings()).toEqual(['Work'])
     expect(time()).toBe('29m ago')
     act(() => vi.advanceTimersByTime(2 * 60_000))
-    expect(headings()).toEqual(['Yesterday'])
+    expect(headings()).toEqual(['Work'])
     expect(time()).toBe('31m ago')
     expect(s.of(LIST)).toHaveLength(1)
   })
@@ -303,7 +303,7 @@ describe('rows', () => {
     const s = server({ list: () => page([summary('a')]) })
     render(<App fetchImpl={s.fetch} />)
     const region = await list()
-    expect(await within(region).findByText('laptop')).toBeInTheDocument()
+    expect(await within(region).findByRole('cell', { name: 'laptop' })).toBeInTheDocument()
     await waitFor(() => expect(s.streams).toHaveLength(1))
     act(() => s.streams[0].event('session_upsert', summary('b', { last_event_at: '2026-10-02T11:00:00.000Z' }), 'e1:2'))
     await waitFor(() => expect(names(region)).toEqual(['b', 'a']))
@@ -322,12 +322,12 @@ describe('rows', () => {
 })

 describe('the waiting count', () => {
-  it('shows on a phone in the top bar', async () => {
+  it('shows on a phone in primary navigation', async () => {
     at('/sessions')
     const s = server({ list: () => page([summary('asks', { question_waits: true }), summary('calm')]) })
     const { container } = render(<App fetchImpl={s.fetch} />)
     await waitFor(() => expect(document.title).toBe('(1) hennery'))
-    const bar = container.querySelector('.mtopbar') as HTMLElement
+    const bar = container.querySelector('.tabbar') as HTMLElement
     expect(within(bar).getByRole('status', { name: '1 waiting on you' })).toHaveTextContent('1')
   })

@@ -370,7 +370,7 @@ describe('the waiting count', () => {
     const s = server({ list: hatsList })
     const { container } = render(<App fetchImpl={s.fetch} />)
     const region = await list()
-    const bar = container.querySelector('.mtopbar') as HTMLElement
+    const bar = container.querySelector('.tabbar') as HTMLElement
     const counted = () => {
       expect(document.title).toBe('(1) hennery')
       expect(within(bar).getByRole('status', { name: '1 waiting on you' })).toHaveTextContent('1')
@@ -422,7 +422,7 @@ describe('the waiting count', () => {
     const s = server({ list: countedList })
     const { container } = render(<App fetchImpl={s.fetch} />)
     const region = await list()
-    const bar = container.querySelector('.mtopbar') as HTMLElement
+    const bar = container.querySelector('.tabbar') as HTMLElement
     const counted = () => {
       expect(document.title).toBe('(3) hennery')
       expect(within(bar).getByRole('status', { name: '3 waiting on you' })).toHaveTextContent('3')
@@ -453,7 +453,7 @@ describe('the waiting count', () => {
     })
     const { container } = render(<App fetchImpl={s.fetch} />)
     const region = await list()
-    const bar = container.querySelector('.mtopbar') as HTMLElement
+    const bar = container.querySelector('.tabbar') as HTMLElement
     await waitFor(() => expect(names(region)).toEqual(['calm', 'asks']))
     expect(document.title).toBe('(3) hennery')
     await userEvent.click(within(region).getByRole('searchbox', { name: 'Search sessions' }))
@@ -508,147 +508,41 @@ describe('the waiting count', () => {
   })
 })

-describe('selection (F-11)', () => {
-  const rows = () =>
-    page([
-      summary('closed-newest', { lifecycle: 'closed', activity: undefined, last_event_at: '2026-10-02T12:00:00.000Z' }),
-      summary('a', { last_event_at: '2026-10-02T11:00:00.000Z' }),
-      summary('b', { hat_id: 'hat-b', last_event_at: '2026-10-02T10:00:00.000Z' }),
-      summary('a-old', { last_event_at: '2026-10-02T09:00:00.000Z' }),
-    ])
-
-  it('on a desktop, /sessions opens the newest visible row, never a hidden one', async () => {
-    width(true)
-    at('/sessions')
-    const s = server({ list: rows })
-    render(<App fetchImpl={s.fetch} />)
-    await waitFor(() => expect(location.pathname).toBe('/sessions/a'))
-    const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await waitFor(() => expect(names(rail)).toContain('a'))
-    const current = within(rail)
-      .getAllByRole('link', { current: 'page' })
-      .filter((l) => l.classList.contains('sess'))
-    expect(current.map((l) => l.querySelector('.sess-name')?.textContent)).toEqual(['a'])
-  })
-
-  it('on a desktop, /sessions with no row to open says to pick one, not that the screen comes later', async () => {
-    width(true)
-    at('/sessions')
-    const s = server()
-    render(<App fetchImpl={s.fetch} />)
-    expect(await screen.findByText('Pick a session from the list, or start a new one.')).toBeInTheDocument()
-    expect(screen.queryByText('This screen arrives in a later part of the web UI.')).toBeNull()
+describe('route selection and overview', () => {
+  const rows = () => page([summary('a'), summary('b', { hat_id: 'hat-b' }), summary('a-old', { last_event_at: '2026-10-01T00:00:00Z' }), summary('closed', { lifecycle: 'closed' })])
+  it.each([false, true])('keeps /sessions as an overview at desktop=%s', async desktop => {
+    width(desktop); at('/sessions'); const s = server({ list: rows }); render(<App fetchImpl={s.fetch} />)
+    const region = await list(); await waitFor(() => expect(names(region)).toEqual(['b', 'a', 'a-old']))
     expect(location.pathname).toBe('/sessions')
+    expect(s.calls.filter(u => u.pathname.startsWith('/api/stream/view/'))).toHaveLength(0)
   })
-
-  it('on a phone, /sessions stays the list', async () => {
-    at('/sessions')
-    const s = server({ list: rows })
-    render(<App fetchImpl={s.fetch} />)
-    const region = await list()
-    await waitFor(() => expect(names(region)).toEqual(['a', 'b', 'a-old']))
-    expect(location.pathname).toBe('/sessions')
-  })
-
-  it('honours a session outside the hat that the address names', async () => {
-    localStorage.setItem('hennery.hat', 'hat-a')
-    width(true)
-    at('/sessions/b')
-    const s = server({ list: rows })
-    render(<App fetchImpl={s.fetch} />)
-    const region = await list()
-    await waitFor(() => expect(names(region)).toEqual(['a', 'a-old']))
-    expect(location.pathname).toBe('/sessions/b')
-  })
-
-  it('a click opens the session', async () => {
-    at('/sessions')
-    const s = server({ list: rows })
-    render(<App fetchImpl={s.fetch} />)
-    const region = await list()
-    await waitFor(() => expect(names(region)).toEqual(['a', 'b', 'a-old']))
-    await userEvent.click(within(region).getAllByRole('link')[1])
-    expect(location.pathname).toBe('/sessions/b')
-  })
-
-  /** The app on a desktop at `start`, with `hatBefore` chosen. */
-  function openAt(start: string, hatBefore = '') {
-    width(true)
-    localStorage.setItem('hennery.hat', hatBefore)
-    at(start)
-    const s = server({ list: rows })
-    render(<App fetchImpl={s.fetch} />)
-    return s
-  }
-
-  it('switching hats clears a selection outside the new hat', async () => {
-    openAt('/sessions/a')
-    const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await waitFor(() => expect(names(rail)).toContain('a'))
-    await userEvent.click(await within(rail).findByRole('button', { name: 'Home' }))
-    // Cleared, then the newest visible row of the new hat is opened.
-    await waitFor(() => expect(location.pathname).toBe('/sessions/b'))
-    expect(localStorage.getItem('hennery.hat')).toBe('hat-b')
-  })
-
-  it('switching hats clears a selection inside the new hat too', async () => {
-    // Not the hat's newest: kept, it would stay on a-old.
-    const s = openAt('/sessions/a-old')
-    const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await waitFor(() => expect(names(rail)).toContain('a-old'))
-    const before = s.of(LIST).length
-    await userEvent.click(await within(rail).findByRole('button', { name: 'Work' }))
-    await waitFor(() => expect(s.of(LIST).length).toBeGreaterThan(before))
-    await waitFor(() => expect(names(rail)).toEqual(['a', 'a-old']))
-    await waitFor(() => expect(location.pathname).toBe('/sessions/a'))
+  it('shows an empty overview with a new-session link', async () => {
+    at('/sessions'); render(<App fetchImpl={server().fetch} />)
+    const region = await list(); expect(await within(region).findByText('No sessions', { exact: true })).toBeInTheDocument()
+    expect(within(region).getByRole('link', { name: 'New session' })).toHaveAttribute('href', '/new')
   })
-
-  it('switching to every hat clears the selection', async () => {
-    const s = openAt('/sessions/a-old', 'hat-a')
-    const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await waitFor(() => expect(names(rail)).toEqual(['a', 'a-old']))
-    await userEvent.click(within(rail).getByRole('button', { name: 'All hats' }))
-    await waitFor(() => expect(names(rail)).toEqual(['a', 'b', 'a-old']))
-    await waitFor(() => expect(location.pathname).toBe('/sessions/a'))
-    expect(s.of(LIST).at(-1)!.searchParams.get('hat')).toBeNull()
+  it('opens the selected row through its encoded native link', async () => {
+    at('/sessions'); render(<App fetchImpl={server({ list: () => page([summary('x/y z', { title: 'Odd id' })]) }).fetch} />)
+    const region = await list(); const link = await within(region).findByRole('link', { name: /Odd id/ })
+    expect(link).toHaveAttribute('href', '/sessions/x%2Fy%20z'); await userEvent.click(link)
+    expect(location.pathname).toBe('/sessions/x%2Fy%20z')
   })
-
-  it('switching hats clears a session the list does not hold', async () => {
-    openAt('/sessions/unknown')
-    const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await waitFor(() => expect(names(rail)).toContain('a'))
-    await userEvent.click(await within(rail).findByRole('button', { name: 'Work' }))
-    await waitFor(() => expect(location.pathname).toBe('/sessions/a'))
+  it.each(['/sessions/b', '/sessions/unknown', '/sessions/x%2Fy%20z'])('honours %s outside the selected hat without a side list', async path => {
+    localStorage.setItem('hennery.hat', 'hat-a'); at(path); const s = server({ list: rows }); render(<App fetchImpl={s.fetch} />)
+    const rail = await screen.findByRole('complementary', { name: 'Views' }); await within(rail).findByRole('link', { name: 'Work' })
+    await waitFor(() => expect(s.of(LIST)).toHaveLength(1)); expect(location.pathname).toBe(path)
+    expect(screen.queryByRole('region', { name: 'Session list' })).toBeNull()
   })
-
-  it('selects a session whose id needs encoding, through the address, and a hat switch clears it', async () => {
-    width(true)
-    localStorage.setItem('hennery.hat', '')
-    at('/sessions/x%2Fy%20z')
-    const odd = summary('x/y z', { title: 'Odd id', last_event_at: '2026-10-02T11:30:00.000Z' })
-    const s = server({ list: () => page([odd, ...rows().sessions]) })
-    render(<App fetchImpl={s.fetch} />)
-    const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await waitFor(() => expect(names(rail)).toContain('Odd id'))
-    const current = within(rail)
-      .getAllByRole('link', { current: 'page' })
-      .filter((l) => l.classList.contains('sess'))
-    expect(current.map((l) => l.querySelector('.sess-name')?.textContent)).toEqual(['Odd id'])
-    expect(current[0]).toHaveAttribute('href', '/sessions/x%2Fy%20z')
-    expect(location.pathname).toBe('/sessions/x%2Fy%20z')
-    await userEvent.click(within(rail).getByRole('button', { name: 'Home' }))
-    // Cleared, then the new hat's newest row is opened.
-    await waitFor(() => expect(location.pathname).toBe('/sessions/b'))
-    expect(s.of(LIST).at(-1)!.searchParams.get('hat')).toBe('hat-b')
+  it.each([['', 'Home', 'hat-b'], ['', 'Work', 'hat-a'], ['hat-a', 'All hats', '']])('hat switch %s → %s clears selection and returns to overview', async (before, name, next) => {
+    localStorage.setItem('hennery.hat', before); at('/sessions/a-old'); render(<App fetchImpl={server({ list: rows }).fetch} />)
+    const rail = await screen.findByRole('complementary', { name: 'Views' }); await userEvent.click(await within(rail).findByRole('link', { name }))
+    await waitFor(() => expect(location.pathname).toBe('/sessions')); expect(localStorage.getItem('hennery.hat')).toBe(next)
+    await list()
   })
-
-  it('choosing the hat already chosen keeps the selection', async () => {
-    const s = openAt('/sessions/a-old', 'hat-a')
-    const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await waitFor(() => expect(names(rail)).toEqual(['a', 'a-old']))
-    await userEvent.click(within(rail).getByRole('button', { name: 'Work' }))
-    expect(location.pathname).toBe('/sessions/a-old')
-    expect(s.of(LIST)).toHaveLength(1)
+  it('the current rail hat opens its scoped overview without auto-selecting a session', async () => {
+    localStorage.setItem('hennery.hat', 'hat-a'); at('/sessions/a-old?pending=older'); const s = server({ list: rows }); render(<App fetchImpl={s.fetch} />)
+    const rail = await screen.findByRole('complementary', { name: 'Views' }); await userEvent.click(await within(rail).findByRole('link', { name: 'Work' }))
+    expect(location.pathname + location.search).toBe('/sessions?hat=hat-a'); expect(localStorage.getItem('hennery.hat')).toBe('hat-a')
   })
 })

@@ -706,8 +600,7 @@ describe('hats and hosts, changed on their screens', () => {
   /** The rail, once the session list's own hats and host names are read. */
   async function railRead() {
     const rail = await screen.findByRole('complementary', { name: 'Views' })
-    await within(rail).findByRole('button', { name: 'Work' })
-    await within(rail).findByText('laptop')
+    await within(rail).findByRole('link', { name: 'Work' })
     return rail
   }

@@ -724,8 +617,9 @@ describe('hats and hosts, changed on their screens', () => {
     const rail = await railRead()
     change()
     act(() => navigate(to))
-    expect(await within(rail).findByRole('button', { name: 'Clients' })).toBeInTheDocument()
-    expect(await within(rail).findByText('build box')).toBeInTheDocument()
+    expect(await within(rail).findByRole('link', { name: 'Clients' })).toBeInTheDocument()
+    act(() => navigate('/sessions'))
+    expect(await within(await list()).findByRole('cell', { name: 'build box' })).toBeInTheDocument()
     expect(s.of(LIST)).toHaveLength(1)
   })

@@ -739,10 +633,11 @@ describe('hats and hosts, changed on their screens', () => {
     await screen.findByRole('heading', { name: 'laptop' })
     change()
     await new Promise((r) => setTimeout(r, 100))
-    expect(within(rail).getByText('laptop')).toBeInTheDocument()
+    expect(s.of('/api/hosts')).toHaveLength(3)
     act(() => navigate('/sessions/a'))
-    expect(await within(rail).findByText('build box')).toBeInTheDocument()
-    expect(within(rail).getByRole('button', { name: 'Clients' })).toBeInTheDocument()
+    act(() => navigate('/sessions'))
+    expect(await within(await list()).findByRole('cell', { name: 'build box' })).toBeInTheDocument()
+    expect(within(rail).getByRole('link', { name: 'Clients' })).toBeInTheDocument()
   })

   it('are not read again between the session list and a session', async () => {
@@ -753,13 +648,14 @@ describe('hats and hosts, changed on their screens', () => {
     const rail = await railRead()
     change()
     act(() => navigate('/sessions'))
-    await waitFor(() => expect(location.pathname).toBe('/sessions/a'))
+    await waitFor(() => expect(location.pathname).toBe('/sessions'))
     act(() => navigate('/sessions/b'))
     // The session view reads the hats for itself: the rail shows the
     // session list's own.
     await new Promise((r) => setTimeout(r, 100))
-    expect(within(rail).queryByRole('button', { name: 'Clients' })).toBeNull()
-    expect(within(rail).getByText('laptop')).toBeInTheDocument()
+    expect(within(rail).queryByRole('link', { name: 'Clients' })).toBeNull()
+    act(() => navigate('/sessions'))
+    expect(await within(await list()).findByRole('cell', { name: 'laptop' })).toBeInTheDocument()
   })
 })

@@ -924,6 +820,19 @@ it('counts status-only operator attention while excluding parent-handled questio
   ]) })
   const { container } = render(<App fetchImpl={s.fetch} />)
   await waitFor(() => expect(document.title).toBe('(1) hennery'))
-  const bar = container.querySelector('.mtopbar') as HTMLElement
+  const bar = container.querySelector('.tabbar') as HTMLElement
+  expect(within(bar).getByRole('status', { name: '1 waiting on you' })).toHaveTextContent('1')
+})
+
+it('keeps the shared attention count reachable on a phone session while its tab bar is hidden', async () => {
+  at('/sessions/failed')
+  const s = server({ list: () => page([summary('failed', { lifecycle: 'failed', operator_attention: 1 })], undefined, 1) })
+  const { container } = render(<App fetchImpl={s.fetch} />)
+  await waitFor(() => expect(document.title).toBe('(1) hennery'))
+  const bar = container.querySelector('.session-scope-status') as HTMLElement
   expect(within(bar).getByRole('status', { name: '1 waiting on you' })).toHaveTextContent('1')
+  expect(within(bar).getByRole('link')).toHaveAttribute('href', '/needs-you')
+  await waitFor(() => expect(s.streams).toHaveLength(1))
+  act(() => s.streams[0].event('waiting_changed', { count: 0 }))
+  await waitFor(() => expect(container.querySelector('.session-scope-status')).toBeNull())
 })
diff --git a/web/src/components/SessionList.tsx b/web/src/components/SessionList.tsx
index 1cf192b8..ae59e785 100644
--- a/web/src/components/SessionList.tsx
+++ b/web/src/components/SessionList.tsx
@@ -1,154 +1,69 @@
-// The session list (frontend spec §5; plan 4c decisions 6–12): the hat
-// selector, a search box, Hide closed and a lifecycle filter, then the rows
-// newest first under sticky day headings. In the rail from 768 px; the
-// whole screen at `/sessions` under it.
-//
-// - A search runs on the server across every lifecycle: while it is active
-//   Hide closed and the lifecycle filter are set aside, and only the hat
-//   applies (F-10).
-// - Rows render 50 at a time; past the rows held, "Load more" fetches the
-//   next page by `next_cursor`. A new server query (hat, filter, search)
-//   opens at 50 rows again.
-// - Day headings and relative times follow a clock read every minute and
-//   when the tab comes back (`useNow`), not only the list's events: an idle
-//   list left open overnight moves today's rows under "Yesterday" (F-8).
-// - The list stream's state shows as "Reconnecting…", and "Resynced" for a
-//   moment after the rows were replaced (frontend spec §4.1).
-import { useState } from 'react'
+import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
 import { useNow } from '../hooks/useNow'
 import type { SessionSummary } from '../generated/view'
-import { BUCKET_LABEL, BUCKET_ORDER, bucketOf, type Bucket } from '../lib/time'
-import { Icon } from '../lib/ui'
-import { LIFECYCLES } from '../store/sessionList'
-import HatSwitch from './HatSwitch'
+import { BUCKET_ORDER, bucketOf, type Bucket } from '../lib/time'
+import { sessionGroups } from '../lib/sessionGroups'
+import { matchesStatus } from '../lib/status'
+import { Link, useLocation } from '../router'
+import { useMediaQuery } from '../hooks/useMediaQuery'
+import { useModalLayer } from './ui'
+import { useRegisterAction } from '../app-actions'
 import SessionRow from './SessionRow'
-import { SEARCH_MAX_CHARS, useSessionScope } from './SessionScope'
-
+import HatSwitch from './HatSwitch'
+import SessionFilters from './SessionFilters'
+import { useSessionScope } from './SessionScope'
 export const PAGE_ROWS = 50
-
-const LIFECYCLE_LABEL: Record<(typeof LIFECYCLES)[number], string> = {
-  starting: 'Starting',
-  active: 'Active',
-  parked: 'Parked',
-  closed: 'Closed',
-  failed: 'Failed',
-}
-
-/** How often the day headings and relative times are read again. */
 export const CLOCK_MS = 60_000
-
-/** `rows` (newest first) under their day headings relative to `now`, in
- *  display order; an empty day has no heading. */
+// Retained for consumers of the old calendar helper; overview uses hats/hosts.
 export function byDay(rows: readonly SessionSummary[], now: number): [Bucket, SessionSummary[]][] {
   const days = new Map<Bucket, SessionSummary[]>()
-  for (const s of rows) {
-    const b = bucketOf(s.last_event_at, now)
-    const list = days.get(b)
-    if (list) list.push(s)
-    else days.set(b, [s])
-  }
-  return BUCKET_ORDER.filter((b) => days.has(b)).map((b) => [b, days.get(b)!])
+  for (const row of rows) { const key = bucketOf(row.last_event_at, now); const group = days.get(key) ?? []; group.push(row); days.set(key, group) }
+  return BUCKET_ORDER.filter(key => days.has(key)).map(key => [key, days.get(key)!])
+}
+/** Local J/K only: focus moves within visible links, never activates them. */
+export function moveListFocus(event: KeyboardEvent<HTMLElement>) {
+  if (event.defaultPrevented || event.repeat || event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || !['j', 'k'].includes(event.key)) return
+  if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"], [role="searchbox"]')) return
+  const links = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-session-link]')]
+  const index = links.indexOf(document.activeElement as HTMLElement)
+  if (index < 0) return
+  const next = links[index + (event.key === 'j' ? 1 : -1)]
+  if (next) { event.preventDefault(); next.focus() }
+}
+function FilterDialog({ children, close }: { children: ReactNode; close: () => void }) {
+  const ref = useRef<HTMLDivElement>(null)
+  const { trap, holdFocus } = useModalLayer(ref)
+  useEffect(() => {
+    const before = document.activeElement as HTMLElement | null
+    ref.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
+    return () => { if (before?.isConnected) before.focus() }
+  }, [])
+  return <div className="overlay" onMouseDown={holdFocus}><div ref={ref} className="modal filter-sheet" role="dialog" aria-modal="true" aria-label="Session filters" tabIndex={-1} onKeyDown={event => trap(event, close)}><header className="overview-head"><h2>Session filters</h2><button type="button" className="btn btn-ghost" onClick={close}>Close filters</button></header>{children}</div></div>
 }
-
 export default function SessionList({ screen = false }: { screen?: boolean }) {
-  const scope = useSessionScope()
-  const now = useNow(CLOCK_MS)
-  // The rows shown, for one server query: a new query starts at a page.
+  const scope = useSessionScope(), now = useNow(CLOCK_MS)
+  const desktop = useMediaQuery('(min-width: 768px)')
+  const { pathname, search } = useLocation()
   const [shownRows, setShownRows] = useState({ query: '', n: PAGE_ROWS })
+  const [filters, setFilters] = useState(false)
+  useEffect(() => { if (new URLSearchParams(search).has('search')) setFilters(true) }, [search])
+  useRegisterAction('search-sessions', { label: 'Search sessions', enabled: pathname === '/sessions', run: () => {
+    setFilters(true)
+    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search sessions"]')?.focus())
+  } })
   if (!scope) return null
-  const { list, hats, hat, chooseHat, hostNames, hideClosed, setHideClosed, lifecycle, setLifecycle, query, setQuery, selectedId } =
-    scope
-  const searching = list.searching
+  const { list, hats, hat, chooseHat, hostNames, host, status, group, selectedId } = scope
   const limit = shownRows.query === list.queryKey ? shownRows.n : PAGE_ROWS
-  const rows = list.shown.slice(0, limit)
-  const more = list.shown.length > limit || list.hasMore
-  const showMore = () => {
-    setShownRows({ query: list.queryKey, n: limit + PAGE_ROWS })
-    if (list.shown.length <= limit) void list.loadMore()
-  }
-  const streamNote = list.loading ? '' : list.stream === 'reconnecting' ? 'Reconnecting…' : list.resynced ? 'Resynced' : ''
-
-  return (
-    <section className={'slist' + (screen ? ' slist-screen' : '')} aria-label="Session list">
-      {screen && <h1 className="slist-title">Sessions</h1>}
-      <HatSwitch hats={hats} hat={hat} onHat={chooseHat} />
-      <div className="rail-search">
-        <Icon.Search size={15} />
-        <input
-          type="search"
-          value={query}
-          onChange={(e) => setQuery(e.target.value)}
-          maxLength={SEARCH_MAX_CHARS}
-          placeholder="Search sessions…"
-          aria-label="Search sessions"
-        />
-      </div>
-      <div className="list-filters">
-        <button
-          type="button"
-          className={'toggle' + (hideClosed && !searching ? ' on' : '')}
-          aria-pressed={hideClosed}
-          disabled={searching}
-          onClick={() => setHideClosed(!hideClosed)}
-        >
-          Hide closed
-        </button>
-        <select
-          className="list-select"
-          aria-label="Lifecycle"
-          value={lifecycle}
-          disabled={searching}
-          onChange={(e) => setLifecycle(e.target.value)}
-        >
-          <option value="">Any lifecycle</option>
-          {LIFECYCLES.map((l) => (
-            <option key={l} value={l}>
-              {LIFECYCLE_LABEL[l]}
-            </option>
-          ))}
-        </select>
-      </div>
-      {searching && <p className="list-note">Searching every session in this hat.</p>}
-      {streamNote && (
-        <p className="list-note" role="status">
-          {streamNote}
-        </p>
-      )}
-      {list.error && (
-        <p className="form-error list-note" role="alert">
-          <bdi>{list.error}</bdi>
-        </p>
-      )}
-      {list.loading ? (
-        <p className="list-note" role="status">
-          Loading…
-        </p>
-      ) : rows.length === 0 ? (
-        <p className="list-note">{searching ? 'No matches' : 'No sessions'}</p>
-      ) : (
-        byDay(rows, now).map(([bucket, day]) => (
-          <div className="grp" key={bucket}>
-            <h2 className="grp-head">
-              <span className="grp-title">{BUCKET_LABEL[bucket]}</span>
-              <span className="grp-count">{day.length}</span>
-            </h2>
-            {day.map((s) => (
-              <SessionRow
-                key={s.session_id}
-                session={s}
-                selected={s.session_id === selectedId}
-                hostName={hostNames.get(s.host_id)}
-                now={now}
-              />
-            ))}
-          </div>
-        ))
-      )}
-      {!list.loading && more && (
-        <button type="button" className="btn btn-ghost btn-sm list-more" disabled={list.loadingMore} onClick={showMore}>
-          {list.loadingMore ? 'Loading…' : 'Load more'}
-        </button>
-      )}
-    </section>
-  )
+  const filtered = list.shown.filter(s => list.searching || ((!host || s.host_id === host) && matchesStatus(s, status)))
+  const rows = filtered.slice(0, limit)
+  const more = filtered.length > limit || list.hasMore
+  return <section className={'slist overview' + (screen ? ' slist-screen' : '')} aria-label="Session list" onKeyDown={moveListFocus}>
+    <header className="overview-head"><h1>Sessions</h1><span>{filtered.length}{list.hasMore ? ' loaded' : ' sessions'}</span><button type="button" className="btn btn-ghost filter-trigger" onClick={() => setFilters(!filters)} aria-expanded={filters}>Filters</button><Link to="/new" className="btn btn-primary">New session</Link></header>
+    <HatSwitch hats={hats} hat={hat} onHat={chooseHat} />
+    {!desktop && filters ? <FilterDialog close={() => setFilters(false)}><SessionFilters /></FilterDialog> : <div className="filters-default"><SessionFilters /></div>}
+    {list.error && <p role="alert" className="form-error list-note"><bdi>{list.error}</bdi></p>}
+    {!list.loading && (list.stream === 'reconnecting' || list.resynced) && <p className="list-note" role="status">{list.stream === 'reconnecting' ? 'Reconnecting…' : 'Resynced'}</p>}
+    {list.loading ? <p className="list-note" role="status">Loading…</p> : !rows.length ? <p className="list-note">{list.searching ? 'No matches' : 'No sessions'}</p> : sessionGroups(rows, group).map(([id, sessions]) => <div className="grp" key={id}><h2 className="grp-head"><span className="grp-title"><bdi>{group === 'hat' ? hats?.find(h => h.id === id)?.name ?? 'Unknown hat' : hostNames.get(id) ?? 'Unknown host'}</bdi></span><span className="grp-count">{sessions.length}{list.hasMore ? ' loaded' : ''}</span></h2><table className="session-table"><thead><tr><th>Session</th><th>Doing</th><th>Host</th><th>Agent / model</th><th>Last</th></tr></thead><tbody>{sessions.map(s => <SessionRow key={s.session_id} session={s} selected={s.session_id === selectedId} hostName={hostNames.get(s.host_id)} now={now} table indent={!!s.family?.parent && sessions.some(p => p.session_id === s.family?.parent?.session_id)} />)}</tbody></table></div>)}
+    {!list.loading && more && <button type="button" className="btn btn-ghost list-more" disabled={list.loadingMore} onClick={() => { setShownRows({ query: list.queryKey, n: limit + PAGE_ROWS }); if (filtered.length <= limit) void list.loadMore() }}>{list.loadingMore ? 'Loading…' : 'Load more'}</button>}
+  </section>
 }
diff --git a/web/src/components/SessionRow.tsx b/web/src/components/SessionRow.tsx
index b71f037c..bbd6b117 100644
--- a/web/src/components/SessionRow.tsx
+++ b/web/src/components/SessionRow.tsx
@@ -31,18 +31,21 @@ interface Props {
   hostName?: string
   /** The list's clock (`useNow`): the relative time moves with it. */
   now: number
+  table?: boolean
+  indent?: boolean
 }

-export default function SessionRow({ session, selected, hostName, now }: Props) {
+export default function SessionRow({ session, selected, hostName, now, table, indent }: Props) {
   const [why, setWhy] = useState(false)
   const status = statusOf(session)
   const { title, where } = rowText(session)
   const reason = status.tone === 'fail' ? session.failure_reason : undefined
   const markerTitle = reason ? `${status.label}: ${reason}` : status.label
-  return (
-    <div className="sess-item">
+  const content = (
+    <div className={'sess-item' + (indent ? ' sess-child' : '')}>
       <Link
         to={sessionPath(session.session_id)}
+        data-session-link
         className={'sess' + (selected ? ' active' : '')}
         aria-current={selected ? 'page' : undefined}
       >
@@ -90,4 +93,5 @@ export default function SessionRow({ session, selected, hostName, now }: Props)
       )}
     </div>
   )
+  return table ? <tr><td data-label="Session">{content}</td><td data-label="Doing"><span className={'row-status row-status-' + status.tone}>{status.label}</span></td><td data-label="Host"><bdi>{hostName || 'Unknown host'}</bdi></td><td data-label="Agent / model"><bdi>{agentLabel(session.agent)}{session.model ? ` · ${session.model}` : ''}</bdi></td><td data-label="Last">{relTime(session.last_event_at, now)}</td></tr> : content
 }
diff --git a/web/src/components/SessionScope.tsx b/web/src/components/SessionScope.tsx
index 2d797b83..c8d024b5 100644
--- a/web/src/components/SessionScope.tsx
+++ b/web/src/components/SessionScope.tsx
@@ -13,8 +13,9 @@ import type { HatItem, HostItem } from '../generated/protocol'
 import { usePersistentToggle } from '../hooks/usePersistentToggle'
 import { readHat, themeOf, writeHat } from '../lib/hats'
 import { saveTheme } from '../lib/theme'
-import { navigate, type Route } from '../router'
+import { navigate, useLocation, type Route } from '../router'
 import { useSessionList, type SessionList } from '../store/useSessionList'
+import type { StatusFilter } from '../lib/status'

 export const HIDE_CLOSED_KEY = 'hennery.hideClosed'
 /** How long typing rests before a search goes to the server. */
@@ -34,6 +35,13 @@ export interface SessionScopeValue {
   chooseHat: (hat: string) => void
   /** Host names by host id, for the rows' second line. */
   hostNames: ReadonlyMap<string, string>
+  hosts: HostItem[] | null
+  host: string
+  setHost: (host: string) => void
+  status: StatusFilter
+  setStatus: (status: StatusFilter) => void
+  group: 'hat' | 'host'
+  setGroup: (group: 'hat' | 'host') => void
   hideClosed: boolean
   setHideClosed: (on: boolean) => void
   /** One lifecycle, or `''` for any. */
@@ -66,17 +74,34 @@ export function titleOf(waiting: number): string {
   return waiting > 0 ? `(${waiting}) hennery` : 'hennery'
 }

-export default function SessionScope({ route, desktop, children }: { route: Route; desktop: boolean; children: ReactNode }) {
+export default function SessionScope({ route, children }: { route: Route; desktop?: boolean; children: ReactNode }) {
   const client = useClient()
-  const [hat, setHat] = useState(readHat)
+  const { search } = useLocation()
+  const [hat, setHat] = useState(() => route.name === 'sessions' && new URLSearchParams(search).has('hat') ? new URLSearchParams(search).get('hat')! : readHat())
   const [hats, setHats] = useState<HatItem[] | null>(null)
   const [hostNames, setHostNames] = useState<ReadonlyMap<string, string>>(new Map())
+  const [hosts, setHosts] = useState<HostItem[] | null>(null)
+  const [host, setHost] = useState('')
+  const [status, setStatus] = useState<StatusFilter>('all')
+  const [group, updateGroup] = useState<'hat' | 'host'>(() => {
+    try { return localStorage.getItem('hennery.group') === 'host' ? 'host' : 'hat' } catch { return 'hat' }
+  })
+  const setGroup = useCallback((next: 'hat' | 'host') => {
+    updateGroup(next)
+    try { localStorage.setItem('hennery.group', next) } catch { /* document only */ }
+  }, [])
   const [hideClosed, setHideClosed] = usePersistentToggle(HIDE_CLOSED_KEY, true)
   const [lifecycle, setLifecycle] = useState('')
   const [query, setQuery] = useState('')
   const q = useDebounced(query, SEARCH_DEBOUNCE_MS)
-  const list = useSessionList({ hat: hat || null, hideClosed, lifecycle: lifecycle ? [lifecycle] : undefined, q })
+  const attention = route.name === 'needs-you'
+  const list = useSessionList({ pageScope: attention ? 'attention' : 'overview', hat: hat || null, hideClosed: attention ? false : hideClosed, lifecycle: !attention && lifecycle ? [lifecycle] : undefined, q: attention ? '' : q })
   const selectedId = route.name === 'session' && route.id !== undefined ? route.id : null
+  useEffect(() => {
+    if (route.name !== 'sessions') return
+    const params = new URLSearchParams(search)
+    if (params.has('hat')) { const next = params.get('hat')!; setHat(next); writeHat(next) }
+  }, [route.name, search])

   // Hats and hosts: on mount, and again on leaving /hats or /hosts, the
   // screens that change them (a new or recoloured hat, a renamed or revoked
@@ -101,6 +126,7 @@ export default function SessionScope({ route, desktop, children }: { route: Rout
     client.request<HostItem[]>('GET', '/api/hosts').then(
       (items) => {
         if (!live || !Array.isArray(items)) return
+        setHosts(items)
         setHostNames(new Map(items.map((h) => [h.host_id, h.name])))
       },
       () => {
@@ -140,20 +166,13 @@ export default function SessionScope({ route, desktop, children }: { route: Rout
   const chooseHat = useCallback(
     (next: string) => {
       if (next === hat) return
-      if (selectedId !== null) navigate('/sessions')
+      if (selectedId !== null || (route.name === 'sessions' && new URLSearchParams(search).has('hat'))) navigate('/sessions')
       setHat(next)
       writeHat(next)
     },
-    [hat, selectedId],
+    [hat, selectedId, route.name, search],
   )

-  // Desktop auto-select: only on `/sessions` with no id, only a visible row.
-  const first = list.shown[0]?.session_id
-  useEffect(() => {
-    if (!desktop || route.name !== 'sessions' || first === undefined) return
-    navigate(`/sessions/${encodeURIComponent(first)}`, { replace: true })
-  }, [desktop, route.name, first])
-
   const value = useMemo<SessionScopeValue>(
     () => ({
       list,
@@ -161,6 +180,7 @@ export default function SessionScope({ route, desktop, children }: { route: Rout
       hat,
       chooseHat,
       hostNames,
+      hosts, host, setHost, status, setStatus, group, setGroup,
       hideClosed,
       setHideClosed,
       lifecycle,
@@ -169,7 +189,7 @@ export default function SessionScope({ route, desktop, children }: { route: Rout
       setQuery,
       selectedId,
     }),
-    [list, hats, hat, chooseHat, hostNames, hideClosed, setHideClosed, lifecycle, query, selectedId],
+    [list, hats, hat, chooseHat, hostNames, hosts, host, status, group, setGroup, hideClosed, setHideClosed, lifecycle, query, selectedId],
   )
   return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
 }
diff --git a/web/src/components/Shell.tsx b/web/src/components/Shell.tsx
index 85df7efb..391bf381 100644
--- a/web/src/components/Shell.tsx
+++ b/web/src/components/Shell.tsx
@@ -1,218 +1,89 @@
-// The signed-in app's frame (frontend spec §2): one component tree for every
-// width (F-3). From 768 px a rail with the views beside the content; under
-// it a top bar and a bottom tab bar. Which views exist comes from
-// `GET /api/capabilities`, which also tells a signed-out browser to sign in.
 import { lazy, Suspense, useEffect, useState } from 'react'
 import { capabilities } from '../api/auth'
 import { messageOf } from '../api/errors'
 import { useClient } from '../app-client'
+import { useRegisterAction, useRegisterContext, type AppActionId } from '../app-actions'
 import type { CapabilitiesResponse } from '../generated/protocol'
-import { LABEL, PATH, tabsOf, viewOf, viewsOf, type View } from '../lib/views'
-import { Icon } from '../lib/ui'
+import { LABEL, PATH, viewOf, viewsOf, type View } from '../lib/views'
 import { Link, navigate, type Route } from '../router'
 import Hats from '../screens/Hats'
 import Hosts from '../screens/Hosts'
-import NewSession from '../screens/NewSession'
 import Mcp from '../screens/Mcp'
 import Placeholder from '../screens/Placeholder'
+import Sessions from '../screens/Sessions'
+import NeedsYou from '../screens/NeedsYou'
+import More from '../screens/More'
 import PushForeground from './PushForeground'
-import SignOut from './SignOut'
 import SessionView from '../screens/Session'
-import { useMediaQuery } from '../hooks/useMediaQuery'
-import SessionList from './SessionList'
-import SessionScope, { WaitingBadge, useSessionScope } from './SessionScope'
+import SessionScope, { useSessionScope, WaitingBadge } from './SessionScope'
 import McpScope, { McpBadge } from './McpScope'
-
+import NavigationRail from './NavigationRail'
+import BottomNavigation from './BottomNavigation'
+import { usePersistentToggle } from '../hooks/usePersistentToggle'
+import '../styles/shell.css'
 const Settings = lazy(() => import('../screens/Settings'))
-
-/** The rail's width and up (frontend spec §2). */
+const Defaults = lazy(() => import('../screens/Defaults'))
+const NewSessionFrame = lazy(() => import('./NewSessionFrame'))
+const NewSession = lazy(() => import('../screens/NewSession'))
 export const DESKTOP = '(min-width: 768px)'
-
-const ICON: Record<View, (p: { size?: number }) => React.JSX.Element> = {
-  sessions: Icon.List,
-  new: Icon.Plus,
-  hosts: Icon.Cpu,
-  mcp: Icon.Wrench,
-  hats: Icon.Sparkle,
-  settings: Icon.Shield,
-}
-
-/** `/sessions/:id`: the session, its header fed by the list store's summary
- *  (kept current by the list stream) when the list holds it. A session the
- *  view finds gone leaves the list. While the
- *  list's first page is on its way the header waits for it; only a session
- *  the list does not hold fetches its detail. The address is the selection
- *  (F-11, F-19): shown whatever the hat, and whether or not the list holds it. */
 function SessionRoute({ id }: { id: string }) {
   const list = useSessionScope()?.list
-  return (
-    <SessionView
-      id={id}
-      summary={list?.all.get(id)}
-      awaitSummary={!!list && list.loading && !list.error}
-      onRemoved={list?.remove}
-    />
-  )
+  return <SessionView id={id} summary={list?.all.get(id)} awaitSummary={!!list && list.loading && !list.error} onRemoved={list?.remove} />
+}
+function NavigationAction({ view, enabled }: { view: View; enabled: boolean }) {
+  const id = view === 'new' ? 'new-session' : `open-${view}` as AppActionId
+  useRegisterAction(id, { label: LABEL[view], enabled, run: () => navigate(PATH[view]) }, -1)
+  return null
+}
+function Frame({ caps, route }: { caps: CapabilitiesResponse; route: Route }) {
+  const [collapsed, setCollapsed] = usePersistentToggle('hennery.railCollapsed', false)
+  const views = viewsOf(caps.mode)
+  const current = viewOf(route.name)
+  const shown = current !== null && views.includes(current)
+  const scope = useSessionScope()
+  useRegisterContext({ hatId: scope?.hat || undefined }, -1)
+  useRegisterAction('toggle-rail', { label: 'Toggle navigation', enabled: true, run: () => setCollapsed(!collapsed) }, -1)
+  useRegisterAction('search-sessions', { label: 'Search sessions', enabled: caps.mode === 'full', run: () => {
+    navigate('/sessions?search=1')
+    // A request on another route focuses only after the overview has mounted.
+    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search sessions"]')?.focus())
+  } }, -1)
+  return <div className={'app' + (collapsed ? ' app-collapsed' : '') + (route.name === 'session' ? ' app-session' : '')}>
+    {(['needs-you', 'sessions', 'new', 'hosts', 'mcp', 'hats', 'defaults', 'settings'] as const).map(view => <NavigationAction key={view} view={view} enabled={views.includes(view) && (view !== 'mcp' || caps.features.includes('mcp_connections'))} />)}
+    {caps.features.includes('web_push') && <PushForeground />}
+    <NavigationRail views={views} current={current} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
+    <div className="shell">{!['sessions', 'needs-you', 'session'].includes(route.name) && <header className="mtopbar"><span className="mtb-title">{current ? LABEL[current] : 'hennery'}</span><McpBadge link /></header>}{route.name === 'session' && (scope?.list.counts.waiting ?? 0) > 0 && <div className="session-scope-status"><Link to="/needs-you">Needs you <WaitingBadge /></Link></div>}<main className="main">
+      <Suspense fallback={<p role="status">Loading…</p>}>
+      {route.name === 'not_found' ? <Placeholder title="Not found" text="No page lives at this address." />
+      : !shown ? <Placeholder title={current ? LABEL[current] : 'hennery'} text="This view is not part of this deployment." />
+      : route.name === 'sessions' ? <Sessions />
+      : route.name === 'needs-you' ? <NeedsYou />
+      : route.name === 'more' ? <More views={views} />
+      : route.name === 'defaults' ? <Defaults />
+      : route.name === 'hosts' ? <Hosts />
+      : route.name === 'hats' ? <Hats />
+      : route.name === 'settings' ? <Settings push={caps.features.includes('web_push')} sessions={caps.mode === 'full'} />
+      : route.name === 'new' ? <NewSessionFrame><NewSession /></NewSessionFrame>
+      : route.name === 'mcp' ? caps.features.includes('mcp_connections') ? <Mcp stdio={caps.features.includes('mcp_stdio')} oauth={caps.features.includes('mcp_oauth')} /> : <Placeholder title="MCP" text="The MCP gateway is not part of this deployment." />
+      : route.name === 'session' ? <SessionRoute key={route.id} id={route.id ?? ''} /> : null}
+      </Suspense>
+    </main><BottomNavigation mode={caps.mode} current={current} /></div>
+  </div>
 }
-
 export default function Shell({ route }: { route: Route }) {
   const client = useClient()
   const [caps, setCaps] = useState<CapabilitiesResponse | null>(null)
   const [error, setError] = useState<string | null>(null)
   const [attempt, setAttempt] = useState(0)
-  const desktop = useMediaQuery(DESKTOP)
-
   useEffect(() => {
-    let live = true
-    setError(null)
-    capabilities(client).then(
-      (c) => live && setCaps(c),
-      (err) => {
-        // A 401 has already sent the browser to sign in.
-        if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err))
-      },
-    )
-    return () => {
-      live = false
-    }
+    let live = true; setError(null)
+    capabilities(client).then(c => { if (live) setCaps(c) }, err => { if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err)) })
+    return () => { live = false }
   }, [client, attempt])
-  useEffect(() => {
-    if (caps?.mode === 'gateway' && route.name === 'sessions') navigate('/mcp', { replace: true })
-  }, [caps?.mode, route.name])
-  useEffect(() => {
-    const online = () => { if (!caps) setAttempt((n) => n + 1) }
-    window.addEventListener('online', online)
-    return () => window.removeEventListener('online', online)
-  }, [caps])
-
-  if (!caps) {
-    return (
-      <main className="auth">
-        <div className="auth-card" role="status">
-          {error ? (
-            <>
-              <p className="form-error">
-                <bdi>{error}</bdi>
-              </p>
-              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
-                Try again
-              </button>
-            </>
-          ) : (
-            'Loading…'
-          )}
-        </div>
-      </main>
-    )
-  }
-
-  const views = viewsOf(caps.mode)
-  const current = viewOf(route.name)
-  const shown = current !== null && views.includes(current)
-  const title = route.name === 'not_found' ? 'Not found' : current ? LABEL[current] : 'hennery'
-
-  const frame = (
-    <div className="app">
-      {caps.features.includes('web_push') && <PushForeground />}
-      <aside className="rail" aria-label="Views">
-        <div className="rail-head">
-          <span className="brand-name">hennery</span>
-          <WaitingBadge />
-        </div>
-        {views.includes('new') && (
-          <Link to={PATH.new} className="new-btn">
-            <Icon.Plus size={17} /> New session
-          </Link>
-        )}
-        <nav className="rail-nav">
-          {views
-            .filter((v) => v !== 'new')
-            .map((v) => {
-              const Glyph = ICON[v]
-              return (
-                <Link
-                  key={v}
-                  to={PATH[v]}
-                  className={'nav-item' + (v === current ? ' on' : '')}
-                  aria-current={v === current ? 'page' : undefined}
-                >
-                  <Glyph size={17} /> {LABEL[v]}{v === 'mcp' && <McpBadge />}
-                </Link>
-              )
-            })}
-        </nav>
-        <div className="rail-scroll">{desktop && <SessionList />}</div>
-        <div className="rail-foot">
-          {route.name !== 'settings' && <SignOut />}
-        </div>
-      </aside>
-      <div className="shell">
-        <header className="mtopbar">
-          <div className="mtb-mid">
-            <div className="mtb-eyebrow">hennery</div>
-            <div className="mtb-title">{title}</div>
-          </div>
-          <WaitingBadge />
-          <McpBadge link />
-        </header>
-        <main className="main">
-          {route.name === 'not_found' ? (
-            <Placeholder title="Not found" text="No page lives at this address." />
-          ) : !shown ? (
-            <Placeholder title={title} text="This view is not part of this deployment." />
-          ) : route.name === 'hosts' ? (
-            <Hosts />
-          ) : route.name === 'hats' ? (
-            <Hats />
-          ) : route.name === 'settings' ? (
-            <Suspense fallback={<p role="status">Loading Settings…</p>}><Settings push={caps.features.includes('web_push')} sessions={caps.mode === 'full'} /></Suspense>
-          ) : route.name === 'sessions' && !desktop ? (
-            <SessionList screen />
-          ) : route.name === 'new' ? (
-            <NewSession />
-          ) : route.name === 'mcp' ? (
-            // The gateway's screen exists only where its API is served
-            // (4b: a screen behind a feature checks `features`).
-            caps.features.includes('mcp_connections') ? (
-              <Mcp stdio={caps.features.includes('mcp_stdio')} oauth={caps.features.includes('mcp_oauth')} />
-            ) : (
-              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
-            )
-          ) : route.name === 'session' ? (
-            <SessionRoute key={route.id} id={route.id ?? ''} />
-          ) : route.name === 'sessions' ? (
-            // A desktop at /sessions with no row to open: an empty hat, a
-            // search with no match, or before the first page has come.
-            <Placeholder title={title} text="Pick a session from the list, or start a new one." />
-          ) : (
-            <Placeholder title={title} text="This screen arrives in a later part of the web UI." />
-          )}
-        </main>
-        <nav className="tabbar" aria-label="Tabs">
-          {tabsOf(caps.mode).map((v) => {
-            const Glyph = ICON[v]
-            return (
-              <Link
-                key={v}
-                to={PATH[v]}
-                className={'tab' + (v === current ? ' on' : '')}
-                aria-current={v === current ? 'page' : undefined}
-              >
-                <Glyph size={20} />
-                <span>{v === 'new' ? 'New' : LABEL[v]}</span>{v === 'mcp' && <McpBadge />}
-              </Link>
-            )
-          })}
-        </nav>
-      </div>
-    </div>
-  )
-  const scoped = views.includes('sessions') ? (
-    <SessionScope route={route} desktop={desktop}>
-      {frame}
-    </SessionScope>
-  ) : (
-    frame
-  )
+  useEffect(() => { if (caps?.mode === 'gateway' && route.name === 'sessions') navigate('/mcp', { replace: true }) }, [caps?.mode, route.name])
+  useEffect(() => { const online = () => { if (!caps) setAttempt(n => n + 1) }; window.addEventListener('online', online); return () => window.removeEventListener('online', online) }, [caps])
+  if (!caps) return <main className="auth"><div className="auth-card" role="status">{error ? <><p className="form-error"><bdi>{error}</bdi></p><button type="button" className="btn btn-ghost" onClick={() => setAttempt(n => n + 1)}>Try again</button></> : 'Loading…'}</div></main>
+  const frame = <Frame caps={caps} route={route} />
+  const scoped = caps.mode === 'full' ? <SessionScope route={route}>{frame}</SessionScope> : frame
   return caps.features.includes('mcp_connections') && caps.features.includes('mcp_oauth') ? <McpScope active={route.name === 'mcp'}>{scoped}</McpScope> : scoped
 }
diff --git a/web/src/components/StepUpDialog.test.tsx b/web/src/components/StepUpDialog.test.tsx
index 61d4332a..426b331a 100644
--- a/web/src/components/StepUpDialog.test.tsx
+++ b/web/src/components/StepUpDialog.test.tsx
@@ -1,4 +1,4 @@
-import { render, screen, waitFor } from '@testing-library/react'
+import { render, screen, waitFor, within } from '@testing-library/react'
 import userEvent from '@testing-library/user-event'
 import { useState } from 'react'
 import { afterEach, describe, expect, it, vi } from 'vitest'
@@ -54,7 +54,7 @@ describe('the step-up dialog', () => {
     expect(screen.getByLabelText('Your password')).toHaveFocus()
     await userEvent.type(screen.getByLabelText('Your password'), 'correct horse battery')
     await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
-    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('done'))
+    await waitFor(() => expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('done'))
     expect(screen.queryByRole('dialog')).toBeNull()
     expect(screen.getByLabelText('Name')).toHaveValue('laptop')
     const paths = server.sent.map((s) => `${s.method} ${s.path}`)
@@ -83,7 +83,7 @@ describe('the step-up dialog', () => {
     })
     await open(server)
     await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
-    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('StepUpCancelled'))
+    await waitFor(() => expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('StepUpCancelled'))
     expect(screen.queryByRole('dialog')).toBeNull()
     expect(screen.getByLabelText('Name')).toHaveValue('laptop')
     expect(server.sent.filter((s) => s.path === '/api/hosts/pairing-codes')).toHaveLength(1)
@@ -112,7 +112,7 @@ describe('the step-up dialog', () => {
     })
     await open(server)
     await userEvent.keyboard('{Escape}')
-    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('StepUpCancelled'))
+    await waitFor(() => expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('StepUpCancelled'))
   })

   it('offers the passkey first when there is one, and confirms with it', async () => {
@@ -130,7 +130,7 @@ describe('the step-up dialog', () => {
     })
     await open(server)
     await userEvent.click(await screen.findByRole('button', { name: 'Confirm with passkey' }))
-    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('done'))
+    await waitFor(() => expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('done'))
     expect(server.sent.find((s) => s.path === '/api/auth/step-up/passkey/finish')?.body).toEqual({
       ceremony_id: 's-1',
       credential: { id: 'cred' },
diff --git a/web/src/index.css b/web/src/index.css
index 062e57c7..644fff9c 100644
--- a/web/src/index.css
+++ b/web/src/index.css
@@ -22,97 +22,6 @@ input,textarea { font-family:inherit; }

 .mono { font-family:var(--font-mono); }

-/* App shell. The single grid row is pinned to the viewport (grid-template-rows)
-   and overflow is clipped here, so only the inner regions scroll: the sidebar's
-   .rail-scroll and the conversation's .transcript. Without the explicit row the
-   track sizes to content and the whole page scrolls instead. */
-/* minmax(0,1fr) (not bare 1fr, which is minmax(auto,1fr)) lets the content
-   column shrink below its content's intrinsic width — without it a long
-   unbreakable path keeps the track wider than the viewport. */
-.app { display:grid; grid-template-columns:300px minmax(0,1fr); grid-template-rows:100dvh; height:100dvh; overflow:hidden; }
-.application-root { height:100dvh; display:flex; flex-direction:column; }
-.application-root .app { flex:1; height:0; grid-template-rows:minmax(0,1fr); }
-.shell { display:flex; flex-direction:column; min-width:0; min-height:0; }
-
-/* Sidebar */
-/* min-width:0 lets the rail shrink to its grid column (a grid item defaults to
-   min-width:auto, so a long unbreakable session path would otherwise stretch it
-   past the viewport — the cause of horizontal overflow on mobile). */
-.rail { background:var(--rail); border-right:1px solid var(--border); display:flex; flex-direction:column; min-height:0; min-width:0; }
-.rail-head { padding:18px 18px 14px; display:flex; align-items:center; gap:10px; }
-.brand-name { font-family:var(--font-display); font-weight:500; font-size:16px; letter-spacing:-.01em; }
-.brand-name .dot { color:var(--accent); }
-.new-btn { margin:0 14px 8px; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--accent-grad); color:var(--on-accent); border:none; font-weight:700; font-size:14px; padding:11px 14px; border-radius:var(--r-md); box-shadow:var(--sh-accent); transition:transform var(--ease) .15s, box-shadow var(--ease) .15s; font-family:var(--font-display); }
-.new-btn:hover { transform:translateY(-1px); box-shadow:var(--sh-accent-hover); }
-.new-btn:active { transform:translateY(0); }
-.new-btn-ghost { background:none; color:var(--fg-2); border:1px solid var(--border-strong); box-shadow:none; font-weight:600; }
-.new-btn-ghost:hover { transform:none; border-color:var(--fg-muted); color:var(--fg-1); box-shadow:none; }
-.rail-search { margin:6px 14px 10px; position:relative; }
-.rail-search input { width:100%; border:1px solid var(--border-strong); background:var(--surface); color:var(--fg-1); border-radius:var(--r-sm); padding:8px 10px 8px 30px; font-size:13px; transition:border-color .15s; }
-.rail-search input:focus { outline:none; border-color:var(--accent); }
-.rail-search svg { position:absolute; left:9px; top:50%; transform:translateY(-50%); color:var(--fg-quiet); }
-/* Filter toggles in the drawer — desktop keeps these in the topbar, so this row
-   is hidden until the mobile breakpoint flips it to flex. */
-.rail-filters { display:none; gap:8px; margin:0 14px 10px; }
-.rail-filters .toggle { flex:1; justify-content:center; }
-.rail-scroll { overflow-y:auto; flex:1; padding:4px 8px 16px; }
-
-.grp { margin-top:10px; }
-.grp-head { display:flex; align-items:center; gap:8px; padding:6px 8px 4px; position:sticky; top:0; z-index:1; background:var(--rail); }
-.grp-title { font-family:var(--font-display); font-weight:700; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--fg-muted); }
-.grp-count { font-size:11px; color:var(--fg-quiet); font-weight:600; }
-/* Project sub-groups inside a day. Not sticky: stacking under the sticky day
-   header would need its exact height as an offset. */
-.grp-sub { margin-top:4px; }
-.grp-sub-head { display:flex; align-items:center; gap:6px; padding:4px 10px 2px; }
-.grp-sub-title { font-size:12px; font-weight:600; color:var(--fg-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
-
-.sess { display:block; width:100%; text-align:left; border:1px solid transparent; background:none; border-radius:var(--r-sm); padding:9px 10px; margin:1px 0; transition:background .12s, border-color .12s; position:relative; }
-.sess:hover { background:var(--rail-2); }
-.sess.active { background:var(--surface); border-color:var(--border); box-shadow:var(--sh-sm); }
-.sess-row1 { display:flex; align-items:center; gap:8px; }
-.sess-led { width:8px; height:8px; border-radius:50%; flex:none; }
-.sess-name { font-weight:700; font-size:14px; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
-.sess-time { font-size:11px; color:var(--fg-quiet); flex:none; }
-.sess-kind { display:flex; align-items:center; color:var(--fg-quiet); flex:none; }
-.sess-row2 { display:flex; align-items:center; gap:7px; margin-top:2px; }
-.sess-where { font-family:var(--font-mono); font-size:11px; color:var(--fg-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
-.sess-machine { font-size:11px; color:var(--fg-quiet); flex:none; }
-.sess-resume { font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--accent); background:var(--accent-wash); border-radius:var(--r-full); padding:1px 7px; flex:none; }
-
-.led-attn { background:var(--st-attn); }
-.led-wait { background:var(--st-wait); }
-.led-run  { background:var(--st-run); box-shadow:0 0 0 0 rgba(47,158,68,.5); animation:pulse 2s var(--ease) infinite; }
-.led-idle { background:var(--st-idle); }
-@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(47,158,68,.5);} 70%{box-shadow:0 0 0 6px rgba(47,158,68,0);} 100%{box-shadow:0 0 0 0 rgba(47,158,68,0);} }
-
-/* Topbar */
-.topbar { height:60px; flex:none; border-bottom:1px solid var(--border); background:var(--bg); display:flex; align-items:center; gap:20px; padding:0 24px; overflow-x:auto; }
-.stat { display:flex; align-items:center; gap:7px; font-size:13px; color:var(--fg-2); font-weight:500; white-space:nowrap; flex:none; }
-.stat b { color:var(--fg-1); font-weight:700; }
-.stat .led { width:8px; height:8px; border-radius:50%; }
-.topbar-spacer { flex:1; }
-.toggle { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--fg-2); background:var(--surface); border:1px solid var(--border); border-radius:var(--r-full); padding:7px 14px; transition:border-color .15s,color .15s; }
-.toggle:hover { border-color:var(--border-strong); color:var(--fg-1); }
-.toggle.on { background:var(--accent-wash); border-color:transparent; color:var(--accent); }
-.live { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--st-run); }
-.live.off { color:var(--fg-quiet); }
-
-/* Push toggle */
-.push-toggle { background:none; border:1px solid var(--border); cursor:pointer; padding:7px 14px; border-radius:var(--r-full); color:var(--fg-2); display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; font-family:var(--font-display); transition:border-color .15s,color .15s; }
-.push-toggle:hover { border-color:var(--border-strong); color:var(--fg-1); }
-.push-toggle.subscribed { background:var(--accent-wash); border-color:transparent; color:var(--accent); }
-.push-toggle:disabled { opacity:.5; cursor:not-allowed; }
-
-/* Main canvas */
-.main { flex:1; min-height:0; min-width:0; display:flex; flex-direction:column; }
-.welcome { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px; }
-.welcome h1 { font-family:var(--font-display); font-weight:500; font-size:34px; letter-spacing:-.02em; margin:0 0 10px; }
-.welcome p { color:var(--fg-2); font-size:16px; max-width:440px; margin:0 0 28px; }
-
-/* Conversation header — kept compact so the chat gets the space */
-.conv-head { flex:none; border-bottom:1px solid var(--border); padding:11px 20px; background:var(--surface); }
-.conv-title-row { display:flex; align-items:center; gap:10px; }
 .badge { display:inline-flex; align-items:center; gap:6px; font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.08em; text-transform:uppercase; padding:4px 9px; border-radius:var(--r-full); flex:none; white-space:nowrap; }
 .badge .led { width:6px; height:6px; border-radius:50%; flex:none; }
 .badge-attn { background:var(--st-wait-bg); color:var(--st-wait-fg); }
@@ -121,223 +30,6 @@ input,textarea { font-family:inherit; }
 .badge-idle { background:var(--surface-3); color:var(--fg-muted); }
 /* Failed: a hollow red ring, as the list's marker; red fill means a question. */
 .badge-fail { background:transparent; color:var(--st-attn); box-shadow:inset 0 0 0 1px var(--st-attn); }
-.conv-name { font-family:var(--font-display); font-weight:500; font-size:18px; letter-spacing:-.01em; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
-.icon-btn { flex:none; padding:6px 8px; margin-left:auto; }
-.conv-meta { display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:8px; }
-.meta-item { font-size:12px; color:var(--fg-muted); }
-.meta-item b { color:var(--fg-1); font-weight:700; }
-.meta-pill { display:inline-flex; align-items:center; gap:5px; font-family:var(--font-mono); font-size:11.5px; color:var(--fg-2); background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:3px 9px; max-width:100%; overflow-wrap:anywhere; }
-.meta-cwd { max-width:min(46ch,60vw); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
-.meta-toggle { background:none; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:3px; font-family:var(--font-display); font-weight:600; font-size:12px; color:var(--fg-muted); padding:3px 4px; transition:color .12s; }
-.meta-toggle:hover { color:var(--accent); }
-.meta-toggle svg { transition:transform .15s var(--ease); }
-.meta-toggle svg.rot-90 { transform:rotate(90deg); }
-
-/* Transcript. Rendered Markdown lives in .bubble (messages) and .think-body
-   (thinking); both scopes restore what Tailwind's preflight strips. */
-.transcript { flex:1; min-width:0; overflow-y:auto; overflow-x:hidden; padding:24px 28px 8px; }
-.transcript-inner { margin:0 auto; }
-.msg { display:flex; gap:14px; margin-bottom:22px; min-width:0; }
-.avatar { width:30px; height:30px; border-radius:8px; flex:none; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:500; font-family:var(--font-display); }
-.avatar-ai { background:var(--accent-grad); color:var(--on-accent); }
-.avatar-user { background:var(--hn-term-bg); color:var(--hn-term-fg); }
-.avatar-sys { background:var(--surface-3); color:var(--fg-muted); }
-.msg-body { flex:1; min-width:0; }
-.msg-head { display:flex; align-items:baseline; gap:9px; margin-bottom:5px; }
-.msg-who { font-weight:700; font-size:14px; }
-.msg-when { font-size:12px; color:var(--fg-quiet); }
-.bubble { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:16px 18px; box-shadow:var(--sh-sm); overflow-wrap:anywhere; }
-.bubble.user { background:var(--surface-2); }
-.bubble p { margin:0 0 10px; }
-.bubble p:last-child { margin-bottom:0; }
-.bubble h1,.bubble h2,.bubble h3,.bubble h4 { font-family:var(--font-display); font-weight:700; font-size:16px; margin:14px 0 8px; }
-/* Tailwind's preflight (@import "tailwindcss") resets ol/ul to list-style:none,
-   so markdown lists lost their bullets and numbers; restore them for rendered
-   markdown. Task lists opt back out below. */
-.bubble ol, .bubble ul, .think-body ol, .think-body ul { margin:0 0 8px; padding-left:22px; }
-.bubble ul, .think-body ul { list-style:disc; }
-.bubble ul ul, .think-body ul ul { list-style:circle; margin-bottom:0; }
-.bubble ol, .think-body ol { list-style:decimal; }
-.think-body li { margin-bottom:4px; }
-.bubble li { margin-bottom:6px; }
-.bubble a { color:var(--accent); text-decoration:none; }
-.bubble a:hover { text-decoration:underline; }
-.bubble code { font-family:var(--font-mono); font-size:.86em; background:var(--surface-3); border:1px solid var(--border); border-radius:5px; padding:1px 6px; color:var(--fg-1); }
-.bubble pre { font-family:var(--font-mono); font-size:13px; background:var(--hn-term-bg); color:var(--hn-term-fg); border-radius:var(--r-sm); padding:13px 15px; margin:10px 0; overflow-x:auto; }
-.bubble pre code { background:none; border:none; padding:0; color:inherit; font-size:13px; }
-/* GFM tables: remark-gfm emits real <table>s but they were unstyled. display:block
-   + overflow-x:auto lets a wide table scroll inside the bubble instead of blowing
-   out the transcript (which is overflow-x:hidden). */
-.bubble table { display:block; width:max-content; max-width:100%; overflow-x:auto; border-collapse:collapse; margin:10px 0; font-size:13.5px; }
-.bubble th, .bubble td { border:1px solid var(--border); padding:6px 11px; text-align:left; vertical-align:top; }
-.bubble th { background:var(--surface-2); font-weight:700; color:var(--fg-1); }
-.bubble tr:nth-child(even) td { background:var(--surface-2); }
-/* h5/h6 sit below the h1–h4 display size so the heading hierarchy still reads. */
-.bubble h5,.bubble h6 { font-family:var(--font-display); font-weight:700; font-size:13.5px; color:var(--fg-2); margin:12px 0 6px; }
-.bubble blockquote { margin:10px 0; padding:2px 14px; border-left:3px solid var(--accent); color:var(--fg-muted); }
-.bubble blockquote > :last-child { margin-bottom:0; }
-.bubble hr { border:none; border-top:1px solid var(--border); margin:16px 0; }
-.bubble del { color:var(--fg-quiet); }
-.bubble img { max-width:100%; height:auto; border-radius:var(--r-sm); margin:6px 0; display:block; }
-/* GFM task lists: drop the bullet so the checkbox reads as the marker. */
-.bubble ul.contains-task-list { padding-left:4px; list-style:none; }
-.bubble li.task-list-item { list-style:none; }
-.bubble li.task-list-item input[type="checkbox"] { margin-right:8px; vertical-align:middle; }
-/* highlight.js theme for fenced code blocks: the transcript's dark code
-   surface (#2A2826) and the same palette as the tool input's .tk-* tokens. */
-.bubble pre code.hljs { display:block; }
-.hljs-comment,.hljs-quote { color:#7C766E; font-style:italic; }
-.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-type,.hljs-name,.hljs-built_in { color:#FF9E6D; }
-.hljs-string,.hljs-attr,.hljs-regexp,.hljs-addition,.hljs-symbol,.hljs-bullet { color:#B7D88C; }
-.hljs-number,.hljs-meta { color:#F0B86E; }
-.hljs-title,.hljs-section,.hljs-function .hljs-title,.hljs-class .hljs-title { color:#FFB088; }
-.hljs-variable,.hljs-property,.hljs-params,.hljs-attribute,.hljs-tag { color:#8EC9C4; }
-.hljs-operator,.hljs-punctuation { color:#9a948d; }
-.hljs-deletion { color:#E5766B; }
-.hljs-emphasis { font-style:italic; }
-.hljs-strong { font-weight:700; }
-
-.divider { display:flex; align-items:center; gap:14px; margin:8px 0 22px; color:var(--st-wait); font-size:13px; font-weight:600; }
-.divider::before,.divider::after { content:''; height:1px; flex:1; background:var(--st-wait-line); }
-
-/* Tool call (collapsible) */
-.tool-line { display:flex; align-items:center; gap:9px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:11px 14px; font-size:14px; color:var(--fg-2); width:100%; min-width:0; text-align:left; transition:border-color .12s; }
-.tool-line:hover { border-color:var(--border-strong); }
-.tool-line svg { color:var(--fg-muted); flex:none; }
-.tool-name { font-weight:700; color:var(--fg-1); flex:none; }
-.tool-summary { font-family:var(--font-mono); font-size:12px; color:var(--fg-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
-.tool-status { margin-left:auto; font-size:11px; font-weight:700; flex:none; }
-.tool-io { font-family:var(--font-mono); font-size:12px; background:var(--hn-term-bg); color:var(--hn-term-fg); border-radius:var(--r-sm); padding:11px 14px; margin:6px 0 0; overflow-x:auto; white-space:pre-wrap; word-break:break-word; }
-.tool-io .io-label { color:#8A857F; display:block; margin-bottom:4px; }
-/* A tool call's JSON input, one line per element, tokenised into the .tk-* classes below. */
-.tool-io .io-json-ln { display:block; }
-/* Thinking: muted, collapsible reasoning */
-.think-line { font-style:italic; }
-.think-line svg { color:var(--accent); }
-.think-body { font-size:13.5px; line-height:1.55; color:var(--fg-muted); background:var(--surface-2); border:1px solid var(--border); border-left:2px solid var(--accent); border-radius:var(--r-sm); padding:10px 14px; margin:6px 0 0; }
-.think-body > :first-child { margin-top:0; }
-.think-body > :last-child { margin-bottom:0; }
-/* Fabrication warning — loud, can't-miss banner */
-.fab-warn { display:flex; flex-direction:column; gap:5px; margin:10px 0 18px; padding:12px 15px; font-size:13.5px; line-height:1.5; color:var(--st-fail-fg); background:var(--st-fail-bg); border:1.5px solid var(--st-attn); border-left:4px solid var(--st-attn); border-radius:var(--r-sm); }
-.fab-warn-tag { font-family:var(--font-display); font-weight:500; font-size:12px; letter-spacing:.02em; color:var(--st-attn); }
-
-/* Composer */
-.composer { flex:none; border-top:1px solid var(--border); background:var(--bg); padding:14px 28px 18px; }
-.composer-inner { max-width:900px; margin:0 auto; position:relative; } /* positioning context for the slash menu */
-.composer-controls { display:flex; align-items:center; gap:14px; margin-bottom:10px; flex-wrap:wrap; row-gap:6px; }
-.switcher { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--fg-muted); }
-.switcher select { font-family:var(--font-body); font-weight:600; font-size:12px; text-transform:none; letter-spacing:0; color:var(--fg-1); background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--r-sm); padding:5px 8px; transition:border-color .15s; }
-.switcher select:focus { outline:none; border-color:var(--accent); }
-.adv-axes { margin:8px 0; }
-.adv-axes summary { cursor:pointer; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--fg-muted); }
-.adv-axes .switcher { margin-top:6px; }
-.composer-box { position:relative; background:var(--surface); border:1.5px solid var(--border-strong); border-radius:var(--r-md); padding:6px 6px 6px 16px; display:flex; align-items:flex-end; gap:10px; transition:border-color .15s,box-shadow .15s; }
-/* Slash-command autocomplete, floating above the input */
-.slash-menu { position:absolute; left:0; right:0; bottom:calc(100% + 8px); max-height:280px; overflow-y:auto; margin:0; padding:6px; list-style:none; background:var(--surface); border:1.5px solid var(--border-strong); border-radius:var(--r-md); box-shadow:0 8px 28px rgba(0,0,0,.14); z-index:20; }
-.slash-item { display:flex; flex-direction:column; gap:2px; padding:8px 10px; border-radius:var(--r-sm); cursor:pointer; }
-.slash-item.sel { background:var(--accent-wash); }
-.slash-name { font-family:var(--font-mono); font-size:13px; font-weight:600; color:var(--accent); }
-.slash-desc { font-size:12px; color:var(--fg-quiet); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
-.composer-box:focus-within { border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-wash); }
-.composer-box textarea { flex:1; border:none; outline:none; resize:none; background:none; font-size:15px; line-height:1.5; padding:10px 0; max-height:160px; color:var(--fg-1); font-family:var(--font-body); }
-.send-btn { width:40px; height:40px; flex:none; border:none; border-radius:var(--r-sm); background:var(--accent-grad); color:var(--on-accent); display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-accent); transition:transform .15s var(--ease),opacity .15s; }
-.send-btn:hover:not(:disabled) { transform:translateY(-1px); }
-.send-btn:disabled { opacity:.4; box-shadow:none; transform:none; cursor:not-allowed; background:var(--border-strong); }
-.composer-hint { display:flex; align-items:center; gap:14px; margin-top:9px; font-size:12px; color:var(--fg-quiet); }
-.composer-hint kbd { font-family:var(--font-mono); background:var(--surface-3); border:1px solid var(--border); border-radius:4px; padding:1px 6px; font-size:11px; color:var(--fg-2); }
-.composer-label { margin:0 0 8px; font-size:12px; font-weight:600; color:var(--accent); }
-
-/* Image attachments: the attach button, the drag-over state and the thumbnail chips. */
-.attach-btn { display:flex; align-items:center; justify-content:center; flex:none; width:34px; height:34px; border-radius:var(--r-sm); border:1px solid var(--border); background:var(--surface); color:var(--fg-muted); transition:border-color .12s,color .12s; }
-.attach-btn:hover { border-color:var(--border-strong); color:var(--fg-1); }
-.composer-box.dragging { border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-wash); }
-.att-strip { display:flex; flex-wrap:wrap; gap:8px; margin-top:9px; }
-.att-chip { position:relative; width:54px; height:54px; border-radius:var(--r-sm); overflow:hidden; border:1px solid var(--border); background:var(--surface-2); }
-.att-chip img { width:100%; height:100%; object-fit:cover; display:block; }
-.att-n { position:absolute; left:3px; bottom:2px; font-size:10px; font-weight:700; color:#fff; background:rgba(0,0,0,.55); border-radius:4px; padding:0 4px; }
-.att-x { position:absolute; top:2px; right:2px; width:18px; height:18px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; background:rgba(0,0,0,.6); color:#fff; }
-.att-x:hover { background:var(--st-fail-bg); color:var(--st-fail-fg); }
-
-/* Resume bar */
-.resume-bar { flex:none; border-top:1px solid var(--border); background:var(--bg); padding:16px 28px; display:flex; align-items:center; gap:14px; }
-.resume-bar .txt { font-size:13.5px; color:var(--fg-muted); }
-.resume-bar .txt { margin:0; }
-.session-footer { flex-wrap:wrap; }
-.session-footer-text { flex:1 1 260px; min-width:0; display:flex; flex-direction:column; gap:4px; }
-.session-footer-text .form-error p { margin:0; }
-.session-footer-offline { color:var(--st-attn) !important; }
-.spinner { width:16px; height:16px; flex:none; border-radius:50%; border:2px solid var(--border-strong); border-top-color:var(--accent); animation:spin .8s linear infinite; }
-@keyframes spin { to { transform:rotate(360deg); } }
-
-/* The session header's menu: a disclosure of plain buttons */
-.session-menu { position:relative; margin-left:auto; flex:none; }
-.session-menu-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--fg-1); }
-.session-menu-btn:hover { background:var(--surface-2); }
-.session-menu-list { position:absolute; right:0; top:calc(100% + 6px); min-width:190px; display:flex; flex-direction:column; padding:6px; background:var(--surface); border:1.5px solid var(--border-strong); border-radius:var(--r-md); box-shadow:0 8px 28px rgba(0,0,0,.14); z-index:30; }
-.session-menu-list button { text-align:left; border:none; background:none; padding:9px 12px; border-radius:var(--r-sm); font-size:14px; color:var(--fg-1); }
-.session-menu-list button:hover:not(:disabled), .session-menu-list button:focus-visible { background:var(--surface-2); }
-.session-menu-list button.danger { color:var(--st-attn); }
-.session-menu-error { position:absolute; right:0; top:calc(100% + 6px); width:max-content; max-width:min(360px,80vw); background:var(--surface); padding:8px 10px; border-radius:var(--r-sm); box-shadow:var(--sh-sm); z-index:29; }
-.delete-note { font-size:14px !important; margin:0 0 12px !important; }
-/* Touch: every control of the footer and the menu is at least 44px. */
-@media (pointer: coarse), (max-width:767px) {
-  .session-menu-btn { width:44px; height:44px; }
-  .session-menu-list button, .session-footer .btn { min-height:44px; }
-}
-
-/* Interactive / permission card */
-.ask { background:var(--surface); border:1.5px solid var(--accent); border-radius:var(--r-md); padding:18px 20px; box-shadow:var(--sh-accent); }
-.ask.stale { border-color:var(--border); box-shadow:none; opacity:.7; }
-.ask-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
-.ask-eyebrow .e-tag { font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); }
-.ask-q { font-family:var(--font-display); font-weight:700; font-size:17px; margin:0 0 10px; letter-spacing:-.005em; }
-.cmd-card { background:var(--hn-term-bg); border-radius:var(--r-sm); overflow:hidden; margin:4px 0 0; }
-.cmd-head { display:flex; align-items:center; gap:8px; padding:9px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
-.cmd-head .tag { font-family:var(--font-mono); font-size:11px; color:#C9C4BC; font-weight:500; }
-.cmd-head .danger-tag { margin-left:auto; font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#FF8A6B; }
-.cmd-body { font-family:var(--font-mono); font-size:13px; color:var(--hn-term-fg); padding:13px 15px; white-space:pre-wrap; word-break:break-all; }
-.ask-actions { display:flex; align-items:center; gap:10px; margin-top:16px; flex-wrap:wrap; }
-.answered { display:flex; align-items:center; gap:9px; font-size:13.5px; color:var(--fg-2); padding:6px 0; }
-.answered .check { width:18px; height:18px; border-radius:50%; background:var(--st-run); color:var(--on-accent); display:flex; align-items:center; justify-content:center; flex:none; }
-.answered b { color:var(--fg-1); font-weight:700; }
-
-.elic-fields { display:flex; flex-direction:column; gap:14px; margin-top:14px; }
-.elic-field { display:flex; flex-direction:column; gap:7px; }
-.elic-label { font-weight:700; font-size:13px; color:var(--fg-2); }
-.elic-hint { font-size:12.5px; color:var(--fg-2); margin-top:-3px; }
-.elic-opts { display:flex; flex-wrap:wrap; gap:8px; }
-.elic-opt { display:flex; flex-direction:column; align-items:flex-start; gap:2px; text-align:left; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:9px 13px; cursor:pointer; transition:background .12s; }
-.elic-opt.sel { border:2px solid var(--accent); background:var(--accent-wash); padding:8px 12px; }
-.elic-opt-value { font-size:13.5px; font-weight:600; }
-.elic-opt-desc { font-size:12px; color:var(--fg-2); }
-.elic-text { width:100%; border:1px solid var(--border); border-radius:var(--r-sm); padding:9px 12px; font-size:13.5px; background:var(--surface-2); }
-.elic-text:focus { outline:none; border:2px solid var(--accent); padding:8px 11px; }
-.elic-unsupported-msg { font-size:12.5px; color:var(--fg-2); }
-.elic-dead { margin-top:10px; }
-
-/* Tool JSON tokens (lib/highlight.ts tokJSON) */
-.tk-key { color:#FFB088; }
-.tk-str { color:#B7D88C; }
-.tk-num { color:#F0B86E; }
-.tk-kw { color:#E88; }
-.tk-punc { color:#9a948d; }
-.tk-redact { color:#E5766B; font-style:italic; }
-
-/* Step list: the session's own plan, streamed by the agent. Shown in the
-   header (collapsible) and as a plan item in the transcript. */
-.steps { flex:none; border-bottom:1px solid var(--border); background:var(--surface-2); font-size:12.5px; }
-.steps > summary { display:flex; align-items:center; gap:10px; padding:9px 22px; cursor:pointer; color:var(--fg-2); list-style:none; }
-.steps > summary::-webkit-details-marker { display:none; }
-.steps > summary::before { content:'▸'; color:var(--fg-quiet); font-size:10px; }
-.steps[open] > summary::before { content:'▾'; }
-.steps-count { flex:none; font-family:var(--font-mono); font-weight:700; color:var(--fg-1); }
-.steps-current { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
-.steps ol { margin:0; padding:0 22px 11px 46px; display:flex; flex-direction:column; gap:4px; }
-.steps li { color:var(--fg-2); }
-.steps li.done { color:var(--fg-quiet); text-decoration:line-through; }
-.steps li.on { color:var(--accent); font-weight:700; }
-
-
 /* New Session modal */
 .overlay { position:fixed; inset:0; background:var(--hn-scrim); display:flex; align-items:center; justify-content:center; padding:32px; z-index:50; }
 .modal { background:var(--surface); border-radius:var(--r-lg); width:100%; max-width:620px; max-height:90dvh; display:flex; flex-direction:column; box-shadow:var(--sh-lg); overflow:hidden; position:relative; animation:rise .26s var(--ease); }
@@ -352,42 +44,6 @@ input,textarea { font-family:inherit; }
 .modal-foot .spacer { flex:1; }
 .field { margin-bottom:20px; }
 .field-label { display:flex; align-items:center; gap:8px; font-family:var(--font-display); font-weight:700; font-size:14px; color:var(--fg-1); margin-bottom:9px; }
-.field-label .hint { font-weight:500; font-size:12px; color:var(--fg-muted); }
-.seg { display:flex; gap:8px; flex-wrap:wrap; }
-.seg-item { display:flex; align-items:center; gap:9px; padding:11px 15px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--surface); transition:all .12s; }
-.seg-item:hover { border-color:var(--border-strong); }
-.seg-item.sel { border-color:var(--accent); background:var(--accent-wash); }
-/* New Session form: hosts, the project picker, agents and the first prompt */
-.seg-led { width:8px; height:8px; border-radius:50%; }
-.seg-name { font-weight:600; font-size:14px; text-align:left; }
-.seg-host { font-family:var(--font-mono); font-size:11px; color:var(--fg-muted); }
-.path-input { position:relative; }
-.path-input input { width:100%; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); padding:11px 13px 11px 36px; font-family:var(--font-mono); font-size:13px; color:var(--fg-1); background:var(--surface-2); outline:none; transition:border-color .15s,box-shadow .15s; }
-.path-input input:focus { border-color:var(--accent); background:var(--surface); box-shadow:0 0 0 3px var(--accent-wash); }
-.path-input .ic { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--fg-quiet); }
-.picker-row { display:flex; align-items:flex-start; gap:8px; }
-.picker-row .picker-anchor { flex:1; min-width:0; }
-.picker-anchor { position:relative; }
-.picker-list { position:absolute; z-index:20; left:0; right:0; top:calc(100% + 4px); margin:0; padding:4px; list-style:none; max-height:220px; overflow-y:auto; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:0 8px 24px rgba(0,0,0,.18); }
-.picker-item { display:block; width:100%; text-align:left; border:none; background:none; font-family:var(--font-mono); font-size:12.5px; color:var(--fg-2); padding:7px 10px; border-radius:var(--r-sm); cursor:pointer; }
-.picker-item:hover, .picker-item.active { background:var(--surface-3); color:var(--accent); }
-.picker-item.git { color:var(--accent); font-weight:600; }
-.picker-path { font-family:var(--font-mono); font-size:11px; color:var(--fg-muted); margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
-.model-grid { display:flex; flex-direction:column; gap:9px; }
-.model { display:flex; align-items:center; gap:13px; padding:13px 15px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--surface); text-align:left; width:100%; transition:all .12s; }
-.model:hover { border-color:var(--border-strong); }
-.model.sel { border-color:var(--accent); background:var(--accent-wash); }
-.model-ic { width:34px; height:34px; border-radius:9px; flex:none; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:500; font-size:13px; color:var(--on-accent); }
-.model-main { flex:1; min-width:0; }
-.model-name { font-weight:700; font-size:14.5px; }
-.model-name .id { font-family:var(--font-mono); font-weight:500; font-size:11px; color:var(--fg-muted); margin-left:7px; }
-.model-desc { font-size:12.5px; color:var(--fg-muted); margin-top:1px; }
-.model-tag { font-size:11px; font-weight:700; color:var(--fg-2); background:var(--surface-3); border-radius:var(--r-full); padding:3px 9px; flex:none; }
-.model-radio { width:18px; height:18px; border-radius:50%; border:2px solid var(--border-strong); flex:none; }
-.model.sel .model-radio { border-color:var(--accent); background:var(--accent); box-shadow:inset 0 0 0 3px var(--surface); }
-.prompt-box textarea { width:100%; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); padding:13px 15px; font-size:14.5px; line-height:1.55; resize:vertical; min-height:96px; outline:none; color:var(--fg-1); background:var(--surface-2); font-family:var(--font-body); transition:border-color .15s,box-shadow .15s; }
-.prompt-box textarea:focus { border-color:var(--accent); background:var(--surface); box-shadow:0 0 0 3px var(--accent-wash); }
-

 .td { width:7px; height:7px; border-radius:50%; background:var(--fg-quiet); animation:td 1.2s var(--ease) infinite; }
 .td:nth-child(2){ animation-delay:.18s; } .td:nth-child(3){ animation-delay:.36s; }
@@ -396,113 +52,6 @@ input,textarea { font-family:inherit; }
 @keyframes fadeUp { from{transform:translateY(8px);} to{transform:none;} }
 @media (prefers-reduced-motion: reduce) { .fade-in,.led-run,.td,.spinner { animation:none; } }

-/* ── Mobile bar and tab bar (hidden on desktop) ─────────────
-   Both are part of the mobile layout; the desktop grid never shows them. */
-.mtopbar { display:none; }
-.tabbar { display:none; }
-
-/* ── Mobile (under 768px, frontend spec §2) ─────────────────
-   One column: a top bar with the view's title, the view, and a bottom tab
-   bar in place of the rail. New Session slides up as a bottom sheet. */
-@media (max-width:767px) {
-  .app { grid-template-columns:minmax(0,1fr); }
-  .rail { display:none; }
-
-  /* the bottom tab bar: four targets of at least 44px, above the home
-     indicator */
-  .tabbar {
-    display:flex; flex:none; border-top:1px solid var(--border); background:var(--bg);
-    padding:4px 4px calc(4px + env(safe-area-inset-bottom));
-  }
-  .tab {
-    flex:1; min-height:52px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;
-    color:var(--fg-muted); text-decoration:none; font-size:11px; font-weight:600; border-radius:var(--r-sm);
-  }
-  .tab.on { color:var(--accent); }
-
-  /* mobile top bar (replaces the desktop status strip) */
-  .mtopbar {
-    display:flex; align-items:center; gap:12px; min-height:58px; flex:none;
-    padding:env(safe-area-inset-top) 12px 0;
-    border-bottom:1px solid var(--border); background:var(--bg); position:sticky; top:0; z-index:20;
-  }
-  .mtb-btn { width:44px; height:44px; flex:none; border-radius:11px; border:1px solid var(--border); background:var(--surface); display:flex; align-items:center; justify-content:center; color:var(--fg-1); }
-  .mtb-btn:active { background:var(--surface-2); }
-  .mtb-btn.on { color:var(--accent); border-color:var(--accent); background:var(--accent-wash); }
-  .mtb-btn:disabled { opacity:.5; }
-  .mtb-mid { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; }
-  .mtb-eyebrow { font-family:var(--font-display); font-weight:700; font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); line-height:1.3; }
-  .mtb-title { font-family:var(--font-display); font-weight:500; font-size:16px; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
-  .mtb-new { width:44px; height:44px; flex:none; border-radius:11px; border:none; background:var(--accent-grad); color:var(--on-accent); display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-accent); }
-
-  /* hide desktop status strip; surface filters in the drawer instead */
-  .topbar { display:none; }
-  .rail-filters { display:flex; }
-
-  /* condensed conversation */
-  .conv-head { padding:9px 14px; }
-  /* The mobile top bar already shows the session title, so drop the duplicate
-     big title here — saves a whole row and keeps the header tiny. */
-  .conv-name { display:none; }
-  .conv-title-row { gap:8px; }
-  .conv-meta { gap:6px; margin-top:7px; }
-  .transcript { padding:14px 14px 6px; }
-  .msg { gap:10px; margin-bottom:18px; }
-  .avatar { width:27px; height:27px; }
-  .bubble { padding:14px 15px; }
-  .composer,.resume-bar { padding:11px 14px 16px; }
-  .composer-hint { gap:10px; }
-  .composer-hint span:nth-child(3) { display:none; }
-
-  /* welcome */
-  .welcome { padding:28px 24px; }
-  .welcome h1 { font-size:27px; }
-  .welcome p { font-size:15px; }
-
-  /* New Session → bottom sheet */
-  .overlay { align-items:flex-end; justify-content:center; padding:0; }
-  .modal {
-    width:100%; max-width:none; height:auto; max-height:94dvh;
-    border-radius:var(--r-lg) var(--r-lg) 0 0; animation:sheet .34s var(--ease);
-  }
-  @keyframes sheet { from { transform:translateY(100%); } to { transform:none; } }
-  .modal-head { padding-top:26px; }
-  .modal-head::before { content:""; position:absolute; top:11px; left:50%; transform:translateX(-50%); width:38px; height:4px; border-radius:99px; background:var(--border-strong); }
-  .modal-x { top:20px; }
-  .seg-item { flex:1 1 calc(50% - 4px); }
-  .modal-foot { flex-wrap:wrap; }
-  .modal-foot .meta-item { order:3; flex-basis:100%; }
-  .modal-foot .btn { flex:1; }
-
-  /* view switcher (mobile copy, sidebar drawer) */
-  .view-switch-mobile { display:flex; margin:0 14px 10px; }
-  .view-switch-mobile .vs-item { flex:1; justify-content:center; }
-  .hat-switch-mobile { display:flex; margin:0 14px 10px; }
-  .hat-switch-mobile .chip { flex:1; display:inline-flex; align-items:center; justify-content:center; }
-}
-
-@media (max-width:400px) {
-  .seg-item { flex:1 1 100%; }
-}
-
-/* ── View switcher (topbar segmented control + mobile copy) ── */
-.view-switch { display:flex; gap:2px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-full); padding:3px; }
-.vs-item { display:flex; align-items:center; gap:6px; border:none; background:none; color:var(--fg-2); font-family:var(--font-display); font-weight:700; font-size:13px; padding:7px 14px; border-radius:var(--r-full); transition:color .15s, background .15s; white-space:nowrap; flex:none; }
-.vs-item:hover { color:var(--fg-1); }
-.vs-item.on { background:var(--surface); color:var(--accent); box-shadow:var(--sh-sm); }
-.hat-switch { display:flex; gap:7px; }
-.topbar-div { width:1px; height:26px; background:var(--border); margin:0 4px; }
-
-/* ── Desktop (768px and wider) hide the mobile-only copies ──
-   Both .view-switch-mobile and .hat-switch-mobile are shown via @media (max-width:767px).
-   We hide them on desktop via a min-width query instead of unconditional display:none,
-   because the unconditional rule would come later in source order and win at every width,
-   hiding the controls even under 768px where the max-width:767px rules should apply. */
-@media (min-width:768px) {
-  .view-switch-mobile { display:none; }
-  .hat-switch-mobile { display:none; }
-}
-
 /* ── Machine filter chips ── */
 .chip-row { display:flex; gap:7px; flex-wrap:wrap; }
 .chip { border:1.5px solid var(--border); background:var(--surface); color:var(--fg-2); font-family:var(--font-mono); font-size:12px; font-weight:500; padding:6px 12px; border-radius:var(--r-full); transition:all .12s; white-space:nowrap; flex:none; }
@@ -510,15 +59,6 @@ input,textarea { font-family:inherit; }
 .chip.on { border-color:var(--accent); background:var(--accent-wash); color:var(--accent); }


-/* ── The rail's views (desktop) ── */
-.new-btn { text-decoration:none; }
-.rail-nav { display:flex; flex-direction:column; gap:2px; padding:6px 8px; }
-.nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:var(--r-sm); color:var(--fg-2); text-decoration:none; font-weight:600; font-size:14px; }
-.nav-item:hover { background:var(--rail-2); color:var(--fg-1); }
-.nav-item.on { background:var(--surface); color:var(--accent); box-shadow:var(--sh-sm); }
-.rail-foot { padding:12px 14px calc(12px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); }
-.main { overflow-y:auto; }
-
 /* ── Sign-in screens: setup and login ── */
 .auth { min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom)); }
 .auth-card { width:100%; max-width:420px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--sh-md); padding:28px; }
@@ -531,114 +71,12 @@ input,textarea { font-family:inherit; }
 .form-error { color:var(--st-attn); font-size:14px; margin:0 0 14px; overflow-wrap:anywhere; }
 .dialog .modal-body p { margin:0 0 14px; }

-/* ── The session list (4c): in the rail from 768px, the whole screen under it ── */
-.slist { display:flex; flex-direction:column; min-width:0; }
-.slist-screen { padding:8px 8px 16px; }
-.slist-title { font-family:var(--font-display); font-weight:500; font-size:20px; margin:8px 10px 10px; }
-.slist .rail-search { margin:6px 6px 10px; }
-.list-hats { flex-wrap:wrap; margin:4px 6px 8px; }
-.list-filters { display:flex; gap:8px; align-items:center; margin:0 6px 8px; }
-.list-filters .toggle:disabled, .list-select:disabled { opacity:.5; }
-.list-select { flex:1; min-width:0; border:1px solid var(--border); background:var(--surface); color:var(--fg-2); border-radius:var(--r-full); padding:7px 12px; font-size:13px; font-weight:600; }
-.list-note { font-size:12.5px; color:var(--fg-muted); margin:6px 10px; }
-.list-more { margin:10px 6px 0; }
-h2.grp-head { margin:0; font-size:inherit; font-weight:inherit; }
-.slist-screen .grp-head { background:var(--bg); }
-.sess { text-decoration:none; color:inherit; }
-.sess-agent { font-size:10.5px; font-weight:600; }
-.sess-flag { font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; flex:none; }
-.sess-flag-attn { color:var(--st-wait-fg); }
-.sess-flag-fail { color:var(--st-attn); }
-.sess-flag-idle { color:var(--fg-muted); }
-.sess-why { margin:0 10px 4px; border:none; background:none; padding:2px 0; font-size:11px; font-weight:600; color:var(--st-attn); text-decoration:underline; }
-.sess-reason { margin:0 10px 6px; font-size:12px; color:var(--fg-2); overflow-wrap:anywhere; }
-.led-fail { background:transparent; box-shadow:inset 0 0 0 2px var(--st-attn); }
-.rail-head .badge, .mtopbar .badge { margin-left:auto; }
-
-/* ── The session view (frontend spec §6) ──
-   The view fills .main and only .transcript scrolls. Scroll anchoring is
-   off: the view keeps the reader's place itself when older turns are
-   prepended, and the browser's own anchoring would move it twice. */
-.session { flex:1; min-height:0; display:flex; flex-direction:column; }
-.session .transcript { overflow-anchor:none; }
-.session .transcript-inner { max-width:900px; }
-.session-head .conv-name { margin:0; }
-.back-btn { display:none; }
-.rot-180 { transform:rotate(180deg); }
 /* Heard, not seen: kept in the accessibility tree (never display:none). */
 .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; }
-.stream-state:empty { display:none; }
-.stream-state { flex:none; padding:6px 20px; font-size:12.5px; font-weight:600; color:var(--st-wait); background:var(--surface-2); border-bottom:1px solid var(--border); }
-.session-error { padding:8px 20px 0; margin:0; }
-.start-notice { padding:8px 20px; margin:0; font-size:14px; color:var(--st-attn); overflow-wrap:anywhere; }
-.transcript-empty { color:var(--fg-quiet); padding:20px 0; }
-.load-earlier { display:flex; justify-content:center; margin:0 0 18px; }
-.item-note { font-size:12.5px; color:var(--fg-muted); margin:6px 0 0; }
-.item-failed { color:var(--st-attn); }
-.user-text { white-space:pre-wrap; overflow-wrap:anywhere; margin:0 0 8px; }
-.user-text:last-child { margin-bottom:0; }
-.user-image, .tool-image { display:block; max-width:min(100%, 480px); height:auto; border-radius:var(--r-sm); margin:6px 0; }
-.md-img-link { font-style:italic; }
-.tool-detail { display:flex; flex-direction:column; }
-.tool-diff pre { margin:0 0 6px; white-space:pre-wrap; font:inherit; }
-.tool-diff .diff-old { color:#E5766B; }
-.tool-diff .diff-new { color:#B7D88C; }
-.tool-locations { margin:6px 0 0; padding:0; list-style:none; font-family:var(--font-mono); font-size:12px; color:var(--fg-muted); }
-.marker { margin:0 0 22px; }
-.marker .divider { margin-bottom:4px; }
-.marker-when { font-weight:500; color:var(--fg-quiet); }
-.marker-text summary, .unrec summary { cursor:pointer; font-size:12.5px; color:var(--fg-muted); }
-.marker-text pre { white-space:pre-wrap; overflow-wrap:anywhere; font-family:var(--font-mono); font-size:12px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:9px 12px; margin:6px 0 0; }
-.unrec { margin:0 0 22px; }
-.ask { margin:0 0 22px; }
-.q-opts { display:flex; flex-wrap:wrap; gap:8px; margin:0; padding:0; list-style:none; }
-li.q-opt { border-radius:var(--r-full); padding:6px 14px; font-size:13px; font-weight:600; border:1.5px solid var(--border-strong); background:var(--surface); }
-li.q-opt-allow { border-color:var(--accent); color:var(--accent); }
-li.q-opt-always { border-style:dashed; color:var(--fg-2); }
-li.q-opt-reject { border-color:var(--st-attn); color:var(--st-attn); }
-.q-key { font-family:var(--font-mono); font-size:11px; font-weight:500; opacity:.65; }
-.q-state { margin:12px 0 0; font-size:13px; font-weight:700; color:var(--fg-2); display:flex; flex-wrap:wrap; gap:0 8px; }
-.q-note { font-weight:500; color:var(--fg-muted); }
-.q-error { margin:10px 0 0; font-size:13px; }
-.ask:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
-.elic-field { border:0; margin:0; padding:0; min-width:0; }
-.elic-field > legend { padding:0; margin-bottom:7px; }
-.elic-opt { flex-direction:row; align-items:flex-start; gap:9px; }
-.elic-opt input { margin:3px 0 0; accent-color:var(--accent); flex:none; }
-.elic-opt > .elic-opt-desc { flex-basis:100%; margin-left:22px; }
-.elic-opts .elic-opt { flex-wrap:wrap; }
-.elic-opts { list-style:none; margin:0; padding:0; }
-.steps-item { border:1px solid var(--border); border-radius:var(--r-sm); }
-.meta-dirty { color:var(--st-wait); font-weight:600; }

 @media (max-width:767px) {
-  /* The session's header is the bar: a way back, and its title shown. */
-  .back-btn { display:flex; align-items:center; justify-content:center; width:44px; height:44px; flex:none; border-radius:11px; border:1px solid var(--border); background:var(--surface); color:var(--fg-1); }
-  .session-head .conv-name { display:block; font-size:16px; }
-  .q-opts { flex-direction:column; }
-  .q-opts .btn, .ask-actions .btn, .elic-opt { min-height:44px; }
-}
-
-/* Last-start/resume MCP metadata, separate from the streamed transcript. */
-.mcp-delivery { margin:8px 20px; padding:12px; border:1px solid var(--border); border-radius:var(--r-sm); font-size:13px; }
-.mcp-delivery p { margin:0 0 4px; overflow-wrap:anywhere; }
-
-/* Family navigation preserves independent session rows and touch targets. */
-.sess-family { display: flex; flex-wrap: wrap; gap: .35rem .75rem; padding: 0 .85rem .55rem 2.2rem; font-size: .75rem; color: var(--fg-muted); }
-.sess-family a { text-decoration: underline; overflow-wrap: anywhere; }
-.family-panel { flex: 0 0 auto; border-bottom: 1px solid var(--border); padding: .55rem 1rem; font-size: .8rem; max-height: 32vh; overflow: auto; }
-.family-panel summary { cursor: pointer; padding: .35rem 0; }
-.family-panel a { text-decoration: underline; overflow-wrap: anywhere; }
-.family-child { margin-top: .65rem; padding-top: .65rem; border-top: 1px solid var(--border); }
-.family-meta { display: flex; flex-wrap: wrap; gap: .25rem .65rem; margin: .35rem 0; }
-.family-meta bdi, .family-child p, .q-routing { overflow-wrap: anywhere; }
-.family-child p { margin: .3rem 0; }
-.q-routing { margin-top: .6rem; color: var(--fg-muted); font-size: .8rem; }
-@media (max-width: 767px) {
-  .family-panel button, .family-panel summary, .family-panel a, .sess-family a { min-height: 44px; }
-  .family-panel a, .sess-family a { display: inline-flex; align-items: center; }
-  .family-panel { padding-inline: .75rem; }
+.overlay { align-items:flex-end; padding:0; }
+.modal { width:100%; max-width:none; max-height:94dvh; border-radius:20px 20px 0 0; }
+.modal-foot { flex-wrap:wrap; }
+.modal-foot .btn { flex:1; }
 }
-.family-attention { margin-block: .65rem; padding-block: .5rem; border-bottom: 1px solid var(--border); }
-.family-attention h2 { font-weight: 600; }
-.family-attention p { margin-block: .35rem; overflow-wrap: anywhere; }
diff --git a/web/src/lib/sessionGroups.test.ts b/web/src/lib/sessionGroups.test.ts
new file mode 100644
index 00000000..103701e1
--- /dev/null
+++ b/web/src/lib/sessionGroups.test.ts
@@ -0,0 +1,9 @@
+import { expect, it } from 'vitest'
+import type { SessionSummary } from '../generated/view'
+import { sessionGroups } from './sessionGroups'
+const row = (id: string, hat: string, host: string, ts: string) => ({ session_id: id, hat_id: hat, host_id: host, last_event_at: ts }) as SessionSummary
+it('groups stable newest-first rows by actual hat/host, preserving deterministic id ties', () => {
+  const rows = [row('a', 'h1', 'x', '1'), row('b', 'h2', 'x', '2'), row('c', 'h1', 'y', '1')]
+  expect(sessionGroups(rows, 'hat').map(([key, group]) => [key, group.map(s => s.session_id)])).toEqual([['h2', ['b']], ['h1', ['c', 'a']]])
+  expect(sessionGroups(rows, 'host').map(([key, group]) => [key, group.map(s => s.session_id)])).toEqual([['x', ['b', 'a']], ['y', ['c']]])
+})
diff --git a/web/src/lib/sessionGroups.ts b/web/src/lib/sessionGroups.ts
new file mode 100644
index 00000000..15ae8537
--- /dev/null
+++ b/web/src/lib/sessionGroups.ts
@@ -0,0 +1,10 @@
+import type { SessionSummary } from '../generated/view'
+import { compareSummaries } from '../store/sessionList'
+export function sessionGroups(rows: readonly SessionSummary[], by: 'hat' | 'host') {
+  const groups = new Map<string, SessionSummary[]>()
+  for (const row of [...rows].sort(compareSummaries)) {
+    const key = by === 'hat' ? row.hat_id : row.host_id
+    const group = groups.get(key) ?? []; group.push(row); groups.set(key, group)
+  }
+  return [...groups]
+}
diff --git a/web/src/lib/status.test.ts b/web/src/lib/status.test.ts
index c1ce165b..8c0d1b46 100644
--- a/web/src/lib/status.test.ts
+++ b/web/src/lib/status.test.ts
@@ -63,3 +63,21 @@ describe('statusOf', () => {
     expect(of({ lifecycle: '', activity: undefined }).label).toBe('Unknown')
   })
 })
+
+it('filters only actual operator work and keeps lifecycle/status predicates separate', async () => {
+  const { needsOperator, matchesStatus } = await import('./status')
+  const base = { lifecycle: 'closed', question_waits: true, presumed_parked: false, operator_attention: 0, parent_handled_questions: 1 }
+  expect(needsOperator(base)).toBe(false)
+  expect(needsOperator({ ...base, operator_attention: 1 })).toBe(true)
+  expect(needsOperator({ ...base, operator_attention: undefined })).toBe(false)
+  expect(matchesStatus(base, 'all')).toBe(true)
+  expect(matchesStatus({ ...base, operator_attention: 1 }, 'attention')).toBe(true)
+  expect(matchesStatus({ ...base, lifecycle: 'active', activity: 'running' }, 'running')).toBe(true)
+  expect(matchesStatus(base, 'running')).toBe(false)
+  expect(matchesStatus({ ...base, lifecycle: 'active', activity: 'idle' }, 'idle')).toBe(true)
+  expect(matchesStatus(base, 'idle')).toBe(false)
+  expect(matchesStatus({ ...base, lifecycle: 'parked' }, 'parked')).toBe(true)
+  expect(matchesStatus(base, 'parked')).toBe(false)
+  expect(matchesStatus({ ...base, lifecycle: 'failed' }, 'failed')).toBe(true)
+  expect(matchesStatus(base, 'failed')).toBe(false)
+})
diff --git a/web/src/lib/status.ts b/web/src/lib/status.ts
index 132da323..f70fa4c8 100644
--- a/web/src/lib/status.ts
+++ b/web/src/lib/status.ts
@@ -58,3 +58,19 @@ export function statusOf(s: StatusInput): Marker {
       return { tone: 'idle', label: s.lifecycle || 'Unknown', resume: false }
   }
 }
+
+export const STATUS_FILTERS = ['all', 'attention', 'running', 'idle', 'parked', 'failed'] as const
+export type StatusFilter = typeof STATUS_FILTERS[number]
+export const STATUS_LABEL: Record<StatusFilter, string> = { all: 'All', attention: 'Needs you', running: 'Running', idle: 'Idle', parked: 'Parked / offline', failed: 'Failed' }
+/** Modern operator counts are authoritative, including closed status-only work. */
+export function needsOperator(s: StatusInput): boolean { return (s.operator_attention ?? 0) > 0 }
+export function matchesStatus(s: StatusInput, filter: StatusFilter): boolean {
+  switch (filter) {
+    case 'all': return true
+    case 'attention': return needsOperator(s)
+    case 'running': return s.lifecycle === 'active' && s.activity === 'running'
+    case 'idle': return s.lifecycle === 'active' && s.activity === 'idle'
+    case 'parked': return s.lifecycle === 'parked' || s.presumed_parked
+    case 'failed': return s.lifecycle === 'failed'
+  }
+}
diff --git a/web/src/lib/views.ts b/web/src/lib/views.ts
index aeea1996..5023bad6 100644
--- a/web/src/lib/views.ts
+++ b/web/src/lib/views.ts
@@ -1,59 +1,15 @@
-// Which views a deployment shows (frontend spec §2): the whole cockpit, or
-// the gateway alone. The mode comes from `GET /api/capabilities`.
 import type { DeploymentMode } from '../generated/protocol'
 import type { RouteName } from '../router'
-
-export type View = 'sessions' | 'new' | 'hosts' | 'mcp' | 'hats' | 'settings'
-
+export type View = 'needs-you' | 'sessions' | 'new' | 'hosts' | 'mcp' | 'hats' | 'defaults' | 'settings' | 'more'
 const BY_MODE: Record<DeploymentMode, readonly View[]> = {
-  full: ['sessions', 'new', 'hosts', 'mcp', 'hats', 'settings'],
-  gateway: ['mcp', 'settings'],
+  full: ['needs-you', 'sessions', 'new', 'defaults', 'hosts', 'mcp', 'hats', 'settings', 'more'],
+  gateway: ['mcp', 'settings', 'more'],
 }
-
-export function viewsOf(mode: DeploymentMode): readonly View[] {
-  return BY_MODE[mode]
-}
-
-/** The view a route belongs to; the sign-in screens and unknown paths
- *  belong to none. */
+export function viewsOf(mode: DeploymentMode): readonly View[] { return BY_MODE[mode] }
 export function viewOf(route: RouteName): View | null {
-  switch (route) {
-    case 'sessions':
-    case 'session':
-      return 'sessions'
-    case 'new':
-    case 'hosts':
-    case 'mcp':
-    case 'hats':
-    case 'settings':
-      return route
-    default:
-      return null
-  }
-}
-
-export const LABEL: Record<View, string> = {
-  sessions: 'Sessions',
-  new: 'New session',
-  hosts: 'Hosts',
-  mcp: 'MCP',
-  hats: 'Hats',
-  settings: 'Settings',
-}
-
-export const PATH: Record<View, string> = {
-  sessions: '/sessions',
-  new: '/new',
-  hosts: '/hosts',
-  mcp: '/mcp',
-  hats: '/hats',
-  settings: '/settings',
-}
-
-/** The bottom tab bar under 768 px (frontend spec §2): Sessions, New,
- *  Hosts (MCP in gateway mode), Settings — those the mode shows. */
-export function tabsOf(mode: DeploymentMode): View[] {
-  const shown = viewsOf(mode)
-  const tabs: View[] = mode === 'gateway' ? ['mcp', 'settings'] : ['sessions', 'new', 'hosts', 'settings']
-  return tabs.filter((v) => shown.includes(v))
+  if (route === 'session') return 'sessions'
+  return route === 'setup' || route === 'login' || route === 'not_found' ? null : route
 }
+export const LABEL: Record<View, string> = { 'needs-you': 'Needs you', sessions: 'Sessions', new: 'New session', defaults: 'Defaults', hosts: 'Hosts', mcp: 'MCP', hats: 'Hats', settings: 'Settings', more: 'More' }
+export const PATH: Record<View, string> = { 'needs-you': '/needs-you', sessions: '/sessions', new: '/new', defaults: '/defaults', hosts: '/hosts', mcp: '/mcp', hats: '/hats', settings: '/settings', more: '/more' }
+export function tabsOf(mode: DeploymentMode): View[] { return mode === 'full' ? ['needs-you', 'sessions', 'new', 'hosts', 'more'] : ['mcp', 'more'] }
diff --git a/web/src/pwa/shell.test.ts b/web/src/pwa/shell.test.ts
index 1708b045..41814bde 100644
--- a/web/src/pwa/shell.test.ts
+++ b/web/src/pwa/shell.test.ts
@@ -100,3 +100,13 @@ describe('verified static shell', () => {
   it.each(['/sessions', '/sessions/s-1', '/new', '/hosts', '/hats', '/settings', '/mcp'])('recognizes app route %s', (path) => expect(appRoute(path)).toBe(true))
   it.each(['/api', '/login', '/setup', '/mcp/', '/mcp/mount', '/sessions/a/b', '/sessions/%2f', '/sessions/..', '//sessions'])('bypasses %s', (path) => expect(appRoute(path)).toBe(false))
 })
+
+it('recognizes new app shell routes without widening notification receipt targets', async () => {
+  const { appRoute } = await import('./shell')
+  const { notificationTarget } = await import('./notification')
+  for (const route of ['/needs-you', '/more', '/defaults']) {
+    expect(appRoute(route)).toBe(true)
+    expect(notificationTarget(route)).toBe('/sessions')
+  }
+  expect(appRoute('/needs-you/arbitrary')).toBe(false)
+})
diff --git a/web/src/pwa/shell.ts b/web/src/pwa/shell.ts
index ef90b6c2..d1d8f134 100644
--- a/web/src/pwa/shell.ts
+++ b/web/src/pwa/shell.ts
@@ -42,7 +42,7 @@ export async function selectShell(storage: CacheStorage, build: string): Promise
 }

 export function appRoute(path: string): boolean {
-  return ['/sessions', '/new', '/hosts', '/hats', '/settings', '/mcp'].includes(path)
+  return ['/sessions', '/needs-you', '/more', '/defaults', '/new', '/hosts', '/hats', '/settings', '/mcp'].includes(path)
     || /^\/sessions\/[A-Za-z0-9_-]{1,128}$/.test(path)
 }

diff --git a/web/src/router.test.tsx b/web/src/router.test.tsx
index 1dfd5000..d2dac14a 100644
--- a/web/src/router.test.tsx
+++ b/web/src/router.test.tsx
@@ -13,6 +13,9 @@ describe('match', () => {
     ['/sessions', 'sessions'],
     ['/sessions/', 'sessions'],
     ['/new', 'new'],
+    ['/needs-you', 'needs-you'],
+    ['/more', 'more'],
+    ['/defaults', 'defaults'],
     ['/hosts', 'hosts'],
     ['/mcp', 'mcp'],
     ['/hats', 'hats'],
@@ -50,3 +53,17 @@ describe('Link', () => {
     expect(location.pathname).toBe('/')
   })
 })
+
+it('retains a known app return route for the launcher and refuses foreign/auth return state', async () => {
+  const { navigate, launcherReturn } = await import('./router')
+  history.replaceState(null, '', '/hosts?pair=1')
+  navigate('/new?host=h&cwd=%2Fproject')
+  expect(launcherReturn()).toBe('/hosts?pair=1')
+  expect(location.search).toBe('?host=h&cwd=%2Fproject')
+  for (const raw of ['https://example.invalid', '//example.invalid', '/login', '/new', '/missing']) {
+    history.replaceState({ launcherFrom: raw }, '', '/new')
+    expect(launcherReturn()).toBe('/sessions')
+  }
+  history.replaceState(null, '', '/new')
+  expect(launcherReturn()).toBe('/sessions')
+})
diff --git a/web/src/router.tsx b/web/src/router.tsx
index 6496cb00..8f0dfb88 100644
--- a/web/src/router.tsx
+++ b/web/src/router.tsx
@@ -1,6 +1,7 @@
 // A small router for real links (frontend spec §2): a push or a reload opens
 // the view its URL names (F-19). History API only; no dependency.
 import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type Ref } from 'react'
+import { safeNext } from './api/next'

 export type RouteName =
   | 'setup'
@@ -59,11 +60,22 @@ const CHANGE = 'hennery:navigate'
 /** Go to `to`, a path of this app: a new history entry, or this one
  *  replaced. */
 export function navigate(to: string, options: { replace?: boolean } = {}): void {
-  if (options.replace) history.replaceState(null, '', to)
-  else history.pushState(null, '', to)
+  const before = location.pathname + location.search
+  const source = match(location.pathname).name
+  const state = to.split('?')[0] === '/new' && !['setup', 'login', 'new', 'not_found'].includes(source) ? { launcherFrom: before } : null
+  if (options.replace) history.replaceState(state, '', to)
+  else history.pushState(state, '', to)
   window.dispatchEvent(new Event(CHANGE))
 }

+/** R4's route frame consumes this safe return seam; never Back into a foreign site. */
+export function launcherReturn(): string {
+  const raw: unknown = history.state?.launcherFrom
+  const path = safeNext(typeof raw === 'string' ? raw : null, location.origin)
+  const name = match(path.split('?')[0]).name
+  return ['setup', 'login', 'new', 'not_found'].includes(name) ? '/sessions' : path
+}
+
 function subscribe(onChange: () => void): () => void {
   window.addEventListener('popstate', onChange)
   window.addEventListener(CHANGE, onChange)
diff --git a/web/src/screens/More.tsx b/web/src/screens/More.tsx
new file mode 100644
index 00000000..a53b28ac
--- /dev/null
+++ b/web/src/screens/More.tsx
@@ -0,0 +1,6 @@
+import { LABEL, PATH, type View } from '../lib/views'
+import { Link } from '../router'
+import SignOut from '../components/SignOut'
+export default function More({ views }: { views: readonly View[] }) {
+  return <section className="overview"><header className="overview-head"><h1>More</h1></header><nav className="more-nav" aria-label="More navigation">{(['mcp', 'hats', 'defaults', 'settings'] as const).filter(v => views.includes(v)).map(v => <Link key={v} to={PATH[v]}>{LABEL[v]}</Link>)}</nav><SignOut /></section>
+}
diff --git a/web/src/screens/NeedsYou.tsx b/web/src/screens/NeedsYou.tsx
new file mode 100644
index 00000000..0b540ca4
--- /dev/null
+++ b/web/src/screens/NeedsYou.tsx
@@ -0,0 +1,9 @@
+import { useAppActions } from '../app-actions'
+import HatSwitch from '../components/HatSwitch'
+import NeedsYouQueue from '../components/NeedsYouQueue'
+import { useSessionScope } from '../components/SessionScope'
+export default function NeedsYou() {
+  const scope = useSessionScope(), actions = useAppActions()
+  const hosts = scope?.hosts?.filter(h => h.revoked_at == null)
+  return <div className="overview"><header className="overview-head"><h1>Needs you</h1><span title="Online / owned non-revoked hosts">{hosts ? `${hosts.filter(h => h.connected).length}/${hosts.length} hosts online` : 'Hosts unknown'}</span><button type="button" className="btn btn-ghost" onClick={() => actions?.dispatch('search-sessions')}>Search</button></header>{scope && <HatSwitch hats={scope.hats} hat={scope.hat} onHat={scope.chooseHat} />}<NeedsYouQueue /></div>
+}
diff --git a/web/src/screens/NewSession.test.tsx b/web/src/screens/NewSession.test.tsx
index 30268b71..ca11057a 100644
--- a/web/src/screens/NewSession.test.tsx
+++ b/web/src/screens/NewSession.test.tsx
@@ -611,8 +611,8 @@ describe('in the app', () => {
     const user = await fill('/srv/work/cat')
     await user.click(startButton())
     await waitFor(() => expect(location.pathname).toBe('/sessions/s-new'))
-    // The list has loaded, and its newest visible row did not take over.
-    await screen.findByText('old')
+    // The list stream opened, and its known rows did not replace the explicit route.
+    await waitFor(() => expect(fetch.mock.calls.filter(([input]) => new URL(String(input), 'http://h').pathname === '/api/stream/sessions')).toHaveLength(1))
     await new Promise((r) => setTimeout(r, 50))
     expect(location.pathname).toBe('/sessions/s-new')
     // @ts-expect-error jsdom has none; each test sets its own
diff --git a/web/src/screens/NewSession.tsx b/web/src/screens/NewSession.tsx
index 594762f2..aa594ad6 100644
--- a/web/src/screens/NewSession.tsx
+++ b/web/src/screens/NewSession.tsx
@@ -1,3 +1,4 @@
+import '../styles/launch.css'
 import McpPrediction from '../components/McpPrediction'
 import { predictionHat } from '../lib/mcpDelivery'
 // New session (frontend spec §7): a host, an agent, a project, the hat the
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index 737bb7e0..eb31cec8 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -1,3 +1,4 @@
+import '../styles/session.css'
 // One session (frontend spec §6): its header, its transcript, whose question
 // cards answer, and its composer.
 //
diff --git a/web/src/screens/Sessions.tsx b/web/src/screens/Sessions.tsx
new file mode 100644
index 00000000..e2b8afd6
--- /dev/null
+++ b/web/src/screens/Sessions.tsx
@@ -0,0 +1,2 @@
+import SessionList from '../components/SessionList'
+export default function Sessions() { return <SessionList screen /> }
diff --git a/web/src/store/sessionList.ts b/web/src/store/sessionList.ts
index 245b213d..26630c34 100644
--- a/web/src/store/sessionList.ts
+++ b/web/src/store/sessionList.ts
@@ -21,6 +21,8 @@ import type { SessionSummary, SummaryPage } from '../generated/view'
 export const LIFECYCLES = ['starting', 'active', 'parked', 'closed', 'failed'] as const

 export interface ListFilters {
+  /** Distinct page baselines even when the wire query happens to match. */
+  pageScope?: 'overview' | 'attention'
   /** A hat's id, or none for every hat. */
   hat?: string | null
   /** Only these lifecycles. When set, it alone decides: Hide closed applies
diff --git a/web/src/store/useSessionList.test.ts b/web/src/store/useSessionList.test.ts
index 0c9bd06d..dbcc58b5 100644
--- a/web/src/store/useSessionList.test.ts
+++ b/web/src/store/useSessionList.test.ts
@@ -549,3 +549,36 @@ describe('useSessionList', () => {
     expect(result.current.counts.waiting).toBe(1)
   })
 })
+
+it('fences an overview response arriving after the attention query and keeps one store/stream', async () => {
+  let release!: (response: Response) => void
+  const streams: LiveStream[] = []
+  const t = routed(call => {
+    if (call.path.startsWith(STREAM)) { const stream = liveStream(); streams.push(stream); return stream.response }
+    if (call.path.includes('q=overview')) return new Promise<Response>(resolve => { release = resolve })
+    return json(page([summary('closed-attention', { lifecycle: 'closed', operator_attention: 1 })], 20, undefined, 1))
+  })
+  const { result, rerender } = renderHook((filters: ListFilters) => useSessionList(filters, FAST), { wrapper: t.wrapper, initialProps: { hat: 'hat-a', hideClosed: true, q: 'overview' } as ListFilters })
+  await waitFor(() => expect(release).toBeDefined())
+  rerender({ hat: 'hat-a', hideClosed: false })
+  await waitFor(() => expect(ids(result.current.shown)).toEqual(['closed-attention']))
+  await act(async () => release(json(page([summary('old-overview')], 1, 'old-cursor', 0))))
+  expect(ids(result.current.shown)).toEqual(['closed-attention'])
+  expect(result.current.hasMore).toBe(false)
+  expect(result.current.counts.waiting).toBe(1)
+  expect(streams.filter(stream => !stream.cancelled)).toHaveLength(1)
+})
+
+it('starts a distinct attention baseline even when overview has the same hat-only wire query', async () => {
+  const t = server([page([summary('overview-only')], 1, 'overview-cursor'), page([summary('attention-only', { lifecycle: 'closed', operator_attention: 1 })], 2)])
+  const initial: ListFilters = { hat: 'hat-a', hideClosed: false, pageScope: 'overview' }
+  const { result, rerender } = renderHook((filters: ListFilters) => useSessionList(filters, FAST), { wrapper: t.wrapper, initialProps: initial })
+  await waitFor(() => expect(ids(result.current.shown)).toEqual(['overview-only']))
+  const before = result.current.queryKey
+  rerender({ ...initial, pageScope: 'attention' })
+  await waitFor(() => expect(ids(result.current.shown)).toEqual(['attention-only']))
+  expect(result.current.queryKey).not.toBe(before)
+  expect(t.of(LIST)).toHaveLength(2)
+  expect(result.current.hasMore).toBe(false)
+  expect(t.streams.filter(stream => !stream.cancelled)).toHaveLength(1)
+})
diff --git a/web/src/store/useSessionList.ts b/web/src/store/useSessionList.ts
index 879b0346..3ff4cc8f 100644
--- a/web/src/store/useSessionList.ts
+++ b/web/src/store/useSessionList.ts
@@ -85,8 +85,12 @@ export class SessionListController {
   private retryTimer: ReturnType<typeof setTimeout> | undefined
   private resyncedTimer: ReturnType<typeof setTimeout> | undefined
   private readonly client: Client
-  private readonly query: SummaryQuery
-  private readonly search: boolean
+  private query: SummaryQuery
+  private search: boolean
+  private abort = new AbortController()
+  private known = new Map<string, SessionSummary>()
+  queryKey = ''
+  knownSummaries = () => this.known
   private readonly timing: Timing
   private readonly backoff: ResyncBackoff

@@ -105,8 +109,12 @@ export class SessionListController {

   getSnapshot = (): SessionListSnapshot => this.snapshot

-  start(): void {
+  start(query: SummaryQuery = this.query, key = JSON.stringify(query)): void {
     this.stop()
+    this.query = query
+    this.queryKey = key
+    this.search = !!query.q
+    this.abort = new AbortController()
     this.snapshot = INITIAL
     this.attempt = 0
     this.backoff.reset()
@@ -116,6 +124,7 @@ export class SessionListController {

   stop(): void {
     this.run++
+    this.abort.abort()
     this.closeStream()
     clearTimeout(this.retryTimer)
     clearTimeout(this.resyncedTimer)
@@ -130,9 +139,9 @@ export class SessionListController {
     if (cursor === undefined || this.snapshot.loadingMore) return
     const run = this.run
     const generation = this.generation
-    this.update({ loadingMore: true })
+    this.update({ loadingMore: true, error: null })
     try {
-      const page = await summaries(this.client, { ...this.query, cursor })
+      const page = await summaries(this.client, { ...this.query, cursor }, this.abort.signal)
       if (run !== this.run || generation !== this.generation) return
       this.apply({ type: 'more', page })
     } catch (err) {
@@ -154,6 +163,10 @@ export class SessionListController {

   private apply(action: ListAction): void {
     const store = listReducer(this.snapshot.store, action)
+    const known = new Map(this.known)
+    for (const [id, summary] of store.all) known.set(id, summary)
+    if (action.type === 'removed') known.delete(action.id)
+    this.known = known
     if (store !== this.snapshot.store) this.update({ store })
   }

@@ -164,13 +177,14 @@ export class SessionListController {

   private async load(run: number, resync: boolean): Promise<void> {
     try {
-      const page = await summaries(this.client, this.query)
+      const page = await summaries(this.client, this.query, this.abort.signal)
       if (run !== this.run) return
       if (!isFirstPage(page)) throw new Error('The session list could not be read.')
       this.generation++
+      if (resync) this.known = new Map()
       this.attempt = 0
+      this.apply({ type: 'first', page, search: this.search })
       this.update({
-        store: listReducer(this.snapshot.store, { type: 'first', page, search: this.search }),
         loading: false,
         error: null,
         resynced: resync || this.snapshot.resynced,
@@ -234,6 +248,8 @@ export class SessionListController {
    *  waits as `ResyncBackoff` says. */
   private resync(): void {
     this.run++
+    this.abort.abort()
+    this.abort = new AbortController()
     this.closeStream()
     clearTimeout(this.retryTimer)
     this.update({ stream: 'reconnecting', loadingMore: false })
@@ -267,15 +283,16 @@ export interface SessionList extends Omit<SessionListSnapshot, 'store'> {
 export function useSessionList(filters: ListFilters, timing?: Partial<Timing>): SessionList {
   const client = useClient()
   const query = serverQuery(filters)
-  const key = JSON.stringify(query)
+  const key = JSON.stringify({ scope: filters.pageScope ?? 'overview', query })
   const timingRef = useRef(timing)
   // A new query starts over; a new object with the same query does not.
-  const controller = useMemo(() => new SessionListController(client, query, timingRef.current), [client, key])
+  const controller = useMemo(() => new SessionListController(client, query, timingRef.current), [client])
   useEffect(() => {
-    controller.start()
+    controller.start(query, key)
     return () => controller.stop()
-  }, [controller])
-  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
+  }, [controller, key])
+  const currentSnapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
+  const snapshot = controller.queryKey === key ? currentSnapshot : INITIAL
   const { store, ...rest } = snapshot
   const { hat, lifecycle, hideClosed, q } = filters
   const shown = useMemo(
@@ -316,7 +333,7 @@ export function useSessionList(filters: ListFilters, timing?: Partial<Timing>):
   const counts = useMemo(() => ({ waiting }), [waiting])
   return {
     ...rest,
-    all: store.all,
+    all: controller.knownSummaries(),
     shown,
     counts,
     hasMore: store.nextCursor !== undefined,
diff --git a/web/src/styles/launch.css b/web/src/styles/launch.css
new file mode 100644
index 00000000..6d64d31b
--- /dev/null
+++ b/web/src/styles/launch.css
@@ -0,0 +1,44 @@
+.field-label .hint { font-weight:500; font-size:12px; color:var(--fg-muted); }
+.seg { display:flex; gap:8px; flex-wrap:wrap; }
+.seg-item { display:flex; align-items:center; gap:9px; padding:11px 15px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--surface); transition:all .12s; }
+.seg-item:hover { border-color:var(--border-strong); }
+.seg-item.sel { border-color:var(--accent); background:var(--accent-wash); }
+/* New Session form: hosts, the project picker, agents and the first prompt */
+.seg-led { width:8px; height:8px; border-radius:50%; }
+.seg-name { font-weight:600; font-size:14px; text-align:left; }
+.seg-host { font-family:var(--font-mono); font-size:11px; color:var(--fg-muted); }
+.path-input { position:relative; }
+.path-input input { width:100%; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); padding:11px 13px 11px 36px; font-family:var(--font-mono); font-size:13px; color:var(--fg-1); background:var(--surface-2); outline:none; transition:border-color .15s,box-shadow .15s; }
+.path-input input:focus { border-color:var(--accent); background:var(--surface); box-shadow:0 0 0 3px var(--accent-wash); }
+.path-input .ic { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--fg-quiet); }
+.picker-row { display:flex; align-items:flex-start; gap:8px; }
+.picker-row .picker-anchor { flex:1; min-width:0; }
+.picker-anchor { position:relative; }
+.picker-list { position:absolute; z-index:20; left:0; right:0; top:calc(100% + 4px); margin:0; padding:4px; list-style:none; max-height:220px; overflow-y:auto; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:0 8px 24px rgba(0,0,0,.18); }
+.picker-item { display:block; width:100%; text-align:left; border:none; background:none; font-family:var(--font-mono); font-size:12.5px; color:var(--fg-2); padding:7px 10px; border-radius:var(--r-sm); cursor:pointer; }
+.picker-item:hover, .picker-item.active { background:var(--surface-3); color:var(--accent); }
+.picker-item.git { color:var(--accent); font-weight:600; }
+.picker-path { font-family:var(--font-mono); font-size:11px; color:var(--fg-muted); margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
+.model-grid { display:flex; flex-direction:column; gap:9px; }
+.model { display:flex; align-items:center; gap:13px; padding:13px 15px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--surface); text-align:left; width:100%; transition:all .12s; }
+.model:hover { border-color:var(--border-strong); }
+.model.sel { border-color:var(--accent); background:var(--accent-wash); }
+.model-ic { width:34px; height:34px; border-radius:9px; flex:none; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:500; font-size:13px; color:var(--on-accent); }
+.model-main { flex:1; min-width:0; }
+.model-name { font-weight:700; font-size:14.5px; }
+.model-name .id { font-family:var(--font-mono); font-weight:500; font-size:11px; color:var(--fg-muted); margin-left:7px; }
+.model-desc { font-size:12.5px; color:var(--fg-muted); margin-top:1px; }
+.model-tag { font-size:11px; font-weight:700; color:var(--fg-2); background:var(--surface-3); border-radius:var(--r-full); padding:3px 9px; flex:none; }
+.model-radio { width:18px; height:18px; border-radius:50%; border:2px solid var(--border-strong); flex:none; }
+.model.sel .model-radio { border-color:var(--accent); background:var(--accent); box-shadow:inset 0 0 0 3px var(--surface); }
+.prompt-box textarea { width:100%; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); padding:13px 15px; font-size:14.5px; line-height:1.55; resize:vertical; min-height:96px; outline:none; color:var(--fg-1); background:var(--surface-2); font-family:var(--font-body); transition:border-color .15s,box-shadow .15s; }
+.prompt-box textarea:focus { border-color:var(--accent); background:var(--surface); box-shadow:0 0 0 3px var(--accent-wash); }
+
+
+@media (max-width:767px) { .seg-item { flex:1 1 calc(50% - 4px); } }
+@media (max-width:400px) { .seg-item { flex:1 1 100%; } }
+.launcher-frame { width:min(620px,100%); }
+.launcher-frame .new-session { min-height:0; display:flex; flex-direction:column; }
+.launcher-frame .modal-body { min-height:0; }
+@media (max-width:767px) { .launcher-frame .modal-x { width:44px; height:44px; }.launcher-frame input,.launcher-frame textarea { font-size:16px; }.launcher-frame .modal-head { padding-right:64px; } }
+@media (max-width:767px) { .launcher-frame { padding-bottom:env(safe-area-inset-bottom); } }
diff --git a/web/src/styles/session.css b/web/src/styles/session.css
new file mode 100644
index 00000000..4c28b08d
--- /dev/null
+++ b/web/src/styles/session.css
@@ -0,0 +1,318 @@
+/* Conversation header — kept compact so the chat gets the space */
+.conv-head { flex:none; border-bottom:1px solid var(--border); padding:11px 20px; background:var(--surface); }
+.conv-title-row { display:flex; align-items:center; gap:10px; }
+.conv-name { font-family:var(--font-display); font-weight:500; font-size:18px; letter-spacing:-.01em; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
+.icon-btn { flex:none; padding:6px 8px; margin-left:auto; }
+.conv-meta { display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:8px; }
+.meta-item { font-size:12px; color:var(--fg-muted); }
+.meta-item b { color:var(--fg-1); font-weight:700; }
+.meta-pill { display:inline-flex; align-items:center; gap:5px; font-family:var(--font-mono); font-size:11.5px; color:var(--fg-2); background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:3px 9px; max-width:100%; overflow-wrap:anywhere; }
+.meta-cwd { max-width:min(46ch,60vw); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
+.meta-toggle { background:none; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:3px; font-family:var(--font-display); font-weight:600; font-size:12px; color:var(--fg-muted); padding:3px 4px; transition:color .12s; }
+.meta-toggle:hover { color:var(--accent); }
+.meta-toggle svg { transition:transform .15s var(--ease); }
+.meta-toggle svg.rot-90 { transform:rotate(90deg); }
+
+/* Transcript. Rendered Markdown lives in .bubble (messages) and .think-body
+   (thinking); both scopes restore what Tailwind's preflight strips. */
+.transcript { flex:1; min-width:0; overflow-y:auto; overflow-x:hidden; padding:24px 28px 8px; }
+.transcript-inner { margin:0 auto; }
+.msg { display:flex; gap:14px; margin-bottom:22px; min-width:0; }
+.avatar { width:30px; height:30px; border-radius:8px; flex:none; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:500; font-family:var(--font-display); }
+.avatar-ai { background:var(--accent-grad); color:var(--on-accent); }
+.avatar-user { background:var(--hn-term-bg); color:var(--hn-term-fg); }
+.avatar-sys { background:var(--surface-3); color:var(--fg-muted); }
+.msg-body { flex:1; min-width:0; }
+.msg-head { display:flex; align-items:baseline; gap:9px; margin-bottom:5px; }
+.msg-who { font-weight:700; font-size:14px; }
+.msg-when { font-size:12px; color:var(--fg-quiet); }
+.bubble { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:16px 18px; box-shadow:var(--sh-sm); overflow-wrap:anywhere; }
+.bubble.user { background:var(--surface-2); }
+.bubble p { margin:0 0 10px; }
+.bubble p:last-child { margin-bottom:0; }
+.bubble h1,.bubble h2,.bubble h3,.bubble h4 { font-family:var(--font-display); font-weight:700; font-size:16px; margin:14px 0 8px; }
+/* Tailwind's preflight (@import "tailwindcss") resets ol/ul to list-style:none,
+   so markdown lists lost their bullets and numbers; restore them for rendered
+   markdown. Task lists opt back out below. */
+.bubble ol, .bubble ul, .think-body ol, .think-body ul { margin:0 0 8px; padding-left:22px; }
+.bubble ul, .think-body ul { list-style:disc; }
+.bubble ul ul, .think-body ul ul { list-style:circle; margin-bottom:0; }
+.bubble ol, .think-body ol { list-style:decimal; }
+.think-body li { margin-bottom:4px; }
+.bubble li { margin-bottom:6px; }
+.bubble a { color:var(--accent); text-decoration:none; }
+.bubble a:hover { text-decoration:underline; }
+.bubble code { font-family:var(--font-mono); font-size:.86em; background:var(--surface-3); border:1px solid var(--border); border-radius:5px; padding:1px 6px; color:var(--fg-1); }
+.bubble pre { font-family:var(--font-mono); font-size:13px; background:var(--hn-term-bg); color:var(--hn-term-fg); border-radius:var(--r-sm); padding:13px 15px; margin:10px 0; overflow-x:auto; }
+.bubble pre code { background:none; border:none; padding:0; color:inherit; font-size:13px; }
+/* GFM tables: remark-gfm emits real <table>s but they were unstyled. display:block
+   + overflow-x:auto lets a wide table scroll inside the bubble instead of blowing
+   out the transcript (which is overflow-x:hidden). */
+.bubble table { display:block; width:max-content; max-width:100%; overflow-x:auto; border-collapse:collapse; margin:10px 0; font-size:13.5px; }
+.bubble th, .bubble td { border:1px solid var(--border); padding:6px 11px; text-align:left; vertical-align:top; }
+.bubble th { background:var(--surface-2); font-weight:700; color:var(--fg-1); }
+.bubble tr:nth-child(even) td { background:var(--surface-2); }
+/* h5/h6 sit below the h1–h4 display size so the heading hierarchy still reads. */
+.bubble h5,.bubble h6 { font-family:var(--font-display); font-weight:700; font-size:13.5px; color:var(--fg-2); margin:12px 0 6px; }
+.bubble blockquote { margin:10px 0; padding:2px 14px; border-left:3px solid var(--accent); color:var(--fg-muted); }
+.bubble blockquote > :last-child { margin-bottom:0; }
+.bubble hr { border:none; border-top:1px solid var(--border); margin:16px 0; }
+.bubble del { color:var(--fg-quiet); }
+.bubble img { max-width:100%; height:auto; border-radius:var(--r-sm); margin:6px 0; display:block; }
+/* GFM task lists: drop the bullet so the checkbox reads as the marker. */
+.bubble ul.contains-task-list { padding-left:4px; list-style:none; }
+.bubble li.task-list-item { list-style:none; }
+.bubble li.task-list-item input[type="checkbox"] { margin-right:8px; vertical-align:middle; }
+/* highlight.js theme for fenced code blocks: the transcript's dark code
+   surface (#2A2826) and the same palette as the tool input's .tk-* tokens. */
+.bubble pre code.hljs { display:block; }
+.hljs-comment,.hljs-quote { color:#7C766E; font-style:italic; }
+.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-type,.hljs-name,.hljs-built_in { color:#FF9E6D; }
+.hljs-string,.hljs-attr,.hljs-regexp,.hljs-addition,.hljs-symbol,.hljs-bullet { color:#B7D88C; }
+.hljs-number,.hljs-meta { color:#F0B86E; }
+.hljs-title,.hljs-section,.hljs-function .hljs-title,.hljs-class .hljs-title { color:#FFB088; }
+.hljs-variable,.hljs-property,.hljs-params,.hljs-attribute,.hljs-tag { color:#8EC9C4; }
+.hljs-operator,.hljs-punctuation { color:#9a948d; }
+.hljs-deletion { color:#E5766B; }
+.hljs-emphasis { font-style:italic; }
+.hljs-strong { font-weight:700; }
+
+.divider { display:flex; align-items:center; gap:14px; margin:8px 0 22px; color:var(--st-wait); font-size:13px; font-weight:600; }
+.divider::before,.divider::after { content:''; height:1px; flex:1; background:var(--st-wait-line); }
+
+/* Tool call (collapsible) */
+.tool-line { display:flex; align-items:center; gap:9px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:11px 14px; font-size:14px; color:var(--fg-2); width:100%; min-width:0; text-align:left; transition:border-color .12s; }
+.tool-line:hover { border-color:var(--border-strong); }
+.tool-line svg { color:var(--fg-muted); flex:none; }
+.tool-name { font-weight:700; color:var(--fg-1); flex:none; }
+.tool-summary { font-family:var(--font-mono); font-size:12px; color:var(--fg-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
+.tool-status { margin-left:auto; font-size:11px; font-weight:700; flex:none; }
+.tool-io { font-family:var(--font-mono); font-size:12px; background:var(--hn-term-bg); color:var(--hn-term-fg); border-radius:var(--r-sm); padding:11px 14px; margin:6px 0 0; overflow-x:auto; white-space:pre-wrap; word-break:break-word; }
+.tool-io .io-label { color:#8A857F; display:block; margin-bottom:4px; }
+/* A tool call's JSON input, one line per element, tokenised into the .tk-* classes below. */
+.tool-io .io-json-ln { display:block; }
+/* Thinking: muted, collapsible reasoning */
+.think-line { font-style:italic; }
+.think-line svg { color:var(--accent); }
+.think-body { font-size:13.5px; line-height:1.55; color:var(--fg-muted); background:var(--surface-2); border:1px solid var(--border); border-left:2px solid var(--accent); border-radius:var(--r-sm); padding:10px 14px; margin:6px 0 0; }
+.think-body > :first-child { margin-top:0; }
+.think-body > :last-child { margin-bottom:0; }
+/* Fabrication warning — loud, can't-miss banner */
+.fab-warn { display:flex; flex-direction:column; gap:5px; margin:10px 0 18px; padding:12px 15px; font-size:13.5px; line-height:1.5; color:var(--st-fail-fg); background:var(--st-fail-bg); border:1.5px solid var(--st-attn); border-left:4px solid var(--st-attn); border-radius:var(--r-sm); }
+.fab-warn-tag { font-family:var(--font-display); font-weight:500; font-size:12px; letter-spacing:.02em; color:var(--st-attn); }
+
+/* Composer */
+.composer { flex:none; border-top:1px solid var(--border); background:var(--bg); padding:14px 28px 18px; }
+.composer-inner { max-width:900px; margin:0 auto; position:relative; } /* positioning context for the slash menu */
+.composer-controls { display:flex; align-items:center; gap:14px; margin-bottom:10px; flex-wrap:wrap; row-gap:6px; }
+.switcher { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--fg-muted); }
+.switcher select { font-family:var(--font-body); font-weight:600; font-size:12px; text-transform:none; letter-spacing:0; color:var(--fg-1); background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--r-sm); padding:5px 8px; transition:border-color .15s; }
+.switcher select:focus { outline:none; border-color:var(--accent); }
+.adv-axes { margin:8px 0; }
+.adv-axes summary { cursor:pointer; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--fg-muted); }
+.adv-axes .switcher { margin-top:6px; }
+.composer-box { position:relative; background:var(--surface); border:1.5px solid var(--border-strong); border-radius:var(--r-md); padding:6px 6px 6px 16px; display:flex; align-items:flex-end; gap:10px; transition:border-color .15s,box-shadow .15s; }
+/* Slash-command autocomplete, floating above the input */
+.slash-menu { position:absolute; left:0; right:0; bottom:calc(100% + 8px); max-height:280px; overflow-y:auto; margin:0; padding:6px; list-style:none; background:var(--surface); border:1.5px solid var(--border-strong); border-radius:var(--r-md); box-shadow:0 8px 28px rgba(0,0,0,.14); z-index:20; }
+.slash-item { display:flex; flex-direction:column; gap:2px; padding:8px 10px; border-radius:var(--r-sm); cursor:pointer; }
+.slash-item.sel { background:var(--accent-wash); }
+.slash-name { font-family:var(--font-mono); font-size:13px; font-weight:600; color:var(--accent); }
+.slash-desc { font-size:12px; color:var(--fg-quiet); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
+.composer-box:focus-within { border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-wash); }
+.composer-box textarea { flex:1; border:none; outline:none; resize:none; background:none; font-size:15px; line-height:1.5; padding:10px 0; max-height:160px; color:var(--fg-1); font-family:var(--font-body); }
+.send-btn { width:40px; height:40px; flex:none; border:none; border-radius:var(--r-sm); background:var(--accent-grad); color:var(--on-accent); display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-accent); transition:transform .15s var(--ease),opacity .15s; }
+.send-btn:hover:not(:disabled) { transform:translateY(-1px); }
+.send-btn:disabled { opacity:.4; box-shadow:none; transform:none; cursor:not-allowed; background:var(--border-strong); }
+.composer-hint { display:flex; align-items:center; gap:14px; margin-top:9px; font-size:12px; color:var(--fg-quiet); }
+.composer-hint kbd { font-family:var(--font-mono); background:var(--surface-3); border:1px solid var(--border); border-radius:4px; padding:1px 6px; font-size:11px; color:var(--fg-2); }
+.composer-label { margin:0 0 8px; font-size:12px; font-weight:600; color:var(--accent); }
+
+/* Image attachments: the attach button, the drag-over state and the thumbnail chips. */
+.attach-btn { display:flex; align-items:center; justify-content:center; flex:none; width:34px; height:34px; border-radius:var(--r-sm); border:1px solid var(--border); background:var(--surface); color:var(--fg-muted); transition:border-color .12s,color .12s; }
+.attach-btn:hover { border-color:var(--border-strong); color:var(--fg-1); }
+.composer-box.dragging { border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-wash); }
+.att-strip { display:flex; flex-wrap:wrap; gap:8px; margin-top:9px; }
+.att-chip { position:relative; width:54px; height:54px; border-radius:var(--r-sm); overflow:hidden; border:1px solid var(--border); background:var(--surface-2); }
+.att-chip img { width:100%; height:100%; object-fit:cover; display:block; }
+.att-n { position:absolute; left:3px; bottom:2px; font-size:10px; font-weight:700; color:#fff; background:rgba(0,0,0,.55); border-radius:4px; padding:0 4px; }
+.att-x { position:absolute; top:2px; right:2px; width:18px; height:18px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; background:rgba(0,0,0,.6); color:#fff; }
+.att-x:hover { background:var(--st-fail-bg); color:var(--st-fail-fg); }
+
+/* Resume bar */
+.resume-bar { flex:none; border-top:1px solid var(--border); background:var(--bg); padding:16px 28px; display:flex; align-items:center; gap:14px; }
+.resume-bar .txt { font-size:13.5px; color:var(--fg-muted); }
+.resume-bar .txt { margin:0; }
+.session-footer { flex-wrap:wrap; }
+.session-footer-text { flex:1 1 260px; min-width:0; display:flex; flex-direction:column; gap:4px; }
+.session-footer-text .form-error p { margin:0; }
+.session-footer-offline { color:var(--st-attn) !important; }
+.spinner { width:16px; height:16px; flex:none; border-radius:50%; border:2px solid var(--border-strong); border-top-color:var(--accent); animation:spin .8s linear infinite; }
+@keyframes spin { to { transform:rotate(360deg); } }
+
+/* The session header's menu: a disclosure of plain buttons */
+.session-menu { position:relative; margin-left:auto; flex:none; }
+.session-menu-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--fg-1); }
+.session-menu-btn:hover { background:var(--surface-2); }
+.session-menu-list { position:absolute; right:0; top:calc(100% + 6px); min-width:190px; display:flex; flex-direction:column; padding:6px; background:var(--surface); border:1.5px solid var(--border-strong); border-radius:var(--r-md); box-shadow:0 8px 28px rgba(0,0,0,.14); z-index:30; }
+.session-menu-list button { text-align:left; border:none; background:none; padding:9px 12px; border-radius:var(--r-sm); font-size:14px; color:var(--fg-1); }
+.session-menu-list button:hover:not(:disabled), .session-menu-list button:focus-visible { background:var(--surface-2); }
+.session-menu-list button.danger { color:var(--st-attn); }
+.session-menu-error { position:absolute; right:0; top:calc(100% + 6px); width:max-content; max-width:min(360px,80vw); background:var(--surface); padding:8px 10px; border-radius:var(--r-sm); box-shadow:var(--sh-sm); z-index:29; }
+.delete-note { font-size:14px !important; margin:0 0 12px !important; }
+/* Touch: every control of the footer and the menu is at least 44px. */
+@media (pointer: coarse), (max-width:767px) {
+  .session-menu-btn { width:44px; height:44px; }
+  .session-menu-list button, .session-footer .btn { min-height:44px; }
+}
+
+/* Interactive / permission card */
+.ask { background:var(--surface); border:1.5px solid var(--accent); border-radius:var(--r-md); padding:18px 20px; box-shadow:var(--sh-accent); }
+.ask.stale { border-color:var(--border); box-shadow:none; opacity:.7; }
+.ask-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
+.ask-eyebrow .e-tag { font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); }
+.ask-q { font-family:var(--font-display); font-weight:700; font-size:17px; margin:0 0 10px; letter-spacing:-.005em; }
+.cmd-card { background:var(--hn-term-bg); border-radius:var(--r-sm); overflow:hidden; margin:4px 0 0; }
+.cmd-head { display:flex; align-items:center; gap:8px; padding:9px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
+.cmd-head .tag { font-family:var(--font-mono); font-size:11px; color:#C9C4BC; font-weight:500; }
+.cmd-head .danger-tag { margin-left:auto; font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#FF8A6B; }
+.cmd-body { font-family:var(--font-mono); font-size:13px; color:var(--hn-term-fg); padding:13px 15px; white-space:pre-wrap; word-break:break-all; }
+.ask-actions { display:flex; align-items:center; gap:10px; margin-top:16px; flex-wrap:wrap; }
+.answered { display:flex; align-items:center; gap:9px; font-size:13.5px; color:var(--fg-2); padding:6px 0; }
+.answered .check { width:18px; height:18px; border-radius:50%; background:var(--st-run); color:var(--on-accent); display:flex; align-items:center; justify-content:center; flex:none; }
+.answered b { color:var(--fg-1); font-weight:700; }
+
+.elic-fields { display:flex; flex-direction:column; gap:14px; margin-top:14px; }
+.elic-field { display:flex; flex-direction:column; gap:7px; }
+.elic-label { font-weight:700; font-size:13px; color:var(--fg-2); }
+.elic-hint { font-size:12.5px; color:var(--fg-2); margin-top:-3px; }
+.elic-opts { display:flex; flex-wrap:wrap; gap:8px; }
+.elic-opt { display:flex; flex-direction:column; align-items:flex-start; gap:2px; text-align:left; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:9px 13px; cursor:pointer; transition:background .12s; }
+.elic-opt.sel { border:2px solid var(--accent); background:var(--accent-wash); padding:8px 12px; }
+.elic-opt-value { font-size:13.5px; font-weight:600; }
+.elic-opt-desc { font-size:12px; color:var(--fg-2); }
+.elic-text { width:100%; border:1px solid var(--border); border-radius:var(--r-sm); padding:9px 12px; font-size:13.5px; background:var(--surface-2); }
+.elic-text:focus { outline:none; border:2px solid var(--accent); padding:8px 11px; }
+.elic-unsupported-msg { font-size:12.5px; color:var(--fg-2); }
+.elic-dead { margin-top:10px; }
+
+/* Tool JSON tokens (lib/highlight.ts tokJSON) */
+.tk-key { color:#FFB088; }
+.tk-str { color:#B7D88C; }
+.tk-num { color:#F0B86E; }
+.tk-kw { color:#E88; }
+.tk-punc { color:#9a948d; }
+.tk-redact { color:#E5766B; font-style:italic; }
+
+/* Step list: the session's own plan, streamed by the agent. Shown in the
+   header (collapsible) and as a plan item in the transcript. */
+.steps { flex:none; border-bottom:1px solid var(--border); background:var(--surface-2); font-size:12.5px; }
+.steps > summary { display:flex; align-items:center; gap:10px; padding:9px 22px; cursor:pointer; color:var(--fg-2); list-style:none; }
+.steps > summary::-webkit-details-marker { display:none; }
+.steps > summary::before { content:'▸'; color:var(--fg-quiet); font-size:10px; }
+.steps[open] > summary::before { content:'▾'; }
+.steps-count { flex:none; font-family:var(--font-mono); font-weight:700; color:var(--fg-1); }
+.steps-current { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
+.steps ol { margin:0; padding:0 22px 11px 46px; display:flex; flex-direction:column; gap:4px; }
+.steps li { color:var(--fg-2); }
+.steps li.done { color:var(--fg-quiet); text-decoration:line-through; }
+.steps li.on { color:var(--accent); font-weight:700; }
+
+
+
+@media (max-width:767px) {
+  .conv-head { padding:9px 14px; }
+  /* The mobile top bar already shows the session title, so drop the duplicate
+     big title here — saves a whole row and keeps the header tiny. */
+  .conv-name { display:none; }
+  .conv-title-row { gap:8px; }
+  .conv-meta { gap:6px; margin-top:7px; }
+  .transcript { padding:14px 14px 6px; }
+  .msg { gap:10px; margin-bottom:18px; }
+  .avatar { width:27px; height:27px; }
+  .bubble { padding:14px 15px; }
+  .composer,.resume-bar { padding:11px 14px 16px; }
+  .composer-hint { gap:10px; }
+  .composer-hint span:nth-child(3) { display:none; }
+}
+/* ── The session view (frontend spec §6) ──
+   The view fills .main and only .transcript scrolls. Scroll anchoring is
+   off: the view keeps the reader's place itself when older turns are
+   prepended, and the browser's own anchoring would move it twice. */
+.session { flex:1; min-height:0; display:flex; flex-direction:column; }
+.session .transcript { overflow-anchor:none; }
+.session .transcript-inner { max-width:900px; }
+.session-head .conv-name { margin:0; }
+.back-btn { display:none; }
+.rot-180 { transform:rotate(180deg); }
+.stream-state:empty { display:none; }
+.stream-state { flex:none; padding:6px 20px; font-size:12.5px; font-weight:600; color:var(--st-wait); background:var(--surface-2); border-bottom:1px solid var(--border); }
+.session-error { padding:8px 20px 0; margin:0; }
+.start-notice { padding:8px 20px; margin:0; font-size:14px; color:var(--st-attn); overflow-wrap:anywhere; }
+.transcript-empty { color:var(--fg-quiet); padding:20px 0; }
+.load-earlier { display:flex; justify-content:center; margin:0 0 18px; }
+.item-note { font-size:12.5px; color:var(--fg-muted); margin:6px 0 0; }
+.item-failed { color:var(--st-attn); }
+.user-text { white-space:pre-wrap; overflow-wrap:anywhere; margin:0 0 8px; }
+.user-text:last-child { margin-bottom:0; }
+.user-image, .tool-image { display:block; max-width:min(100%, 480px); height:auto; border-radius:var(--r-sm); margin:6px 0; }
+.md-img-link { font-style:italic; }
+.tool-detail { display:flex; flex-direction:column; }
+.tool-diff pre { margin:0 0 6px; white-space:pre-wrap; font:inherit; }
+.tool-diff .diff-old { color:#E5766B; }
+.tool-diff .diff-new { color:#B7D88C; }
+.tool-locations { margin:6px 0 0; padding:0; list-style:none; font-family:var(--font-mono); font-size:12px; color:var(--fg-muted); }
+.marker { margin:0 0 22px; }
+.marker .divider { margin-bottom:4px; }
+.marker-when { font-weight:500; color:var(--fg-quiet); }
+.marker-text summary, .unrec summary { cursor:pointer; font-size:12.5px; color:var(--fg-muted); }
+.marker-text pre { white-space:pre-wrap; overflow-wrap:anywhere; font-family:var(--font-mono); font-size:12px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:9px 12px; margin:6px 0 0; }
+.unrec { margin:0 0 22px; }
+.ask { margin:0 0 22px; }
+.q-opts { display:flex; flex-wrap:wrap; gap:8px; margin:0; padding:0; list-style:none; }
+li.q-opt { border-radius:var(--r-full); padding:6px 14px; font-size:13px; font-weight:600; border:1.5px solid var(--border-strong); background:var(--surface); }
+li.q-opt-allow { border-color:var(--accent); color:var(--accent); }
+li.q-opt-always { border-style:dashed; color:var(--fg-2); }
+li.q-opt-reject { border-color:var(--st-attn); color:var(--st-attn); }
+.q-key { font-family:var(--font-mono); font-size:11px; font-weight:500; opacity:.65; }
+.q-state { margin:12px 0 0; font-size:13px; font-weight:700; color:var(--fg-2); display:flex; flex-wrap:wrap; gap:0 8px; }
+.q-note { font-weight:500; color:var(--fg-muted); }
+.q-error { margin:10px 0 0; font-size:13px; }
+.ask:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
+.elic-field { border:0; margin:0; padding:0; min-width:0; }
+.elic-field > legend { padding:0; margin-bottom:7px; }
+.elic-opt { flex-direction:row; align-items:flex-start; gap:9px; }
+.elic-opt input { margin:3px 0 0; accent-color:var(--accent); flex:none; }
+.elic-opt > .elic-opt-desc { flex-basis:100%; margin-left:22px; }
+.elic-opts .elic-opt { flex-wrap:wrap; }
+.elic-opts { list-style:none; margin:0; padding:0; }
+.steps-item { border:1px solid var(--border); border-radius:var(--r-sm); }
+.meta-dirty { color:var(--st-wait); font-weight:600; }
+
+@media (max-width:767px) {
+  /* The session's header is the bar: a way back, and its title shown. */
+  .back-btn { display:flex; align-items:center; justify-content:center; width:44px; height:44px; flex:none; border-radius:11px; border:1px solid var(--border); background:var(--surface); color:var(--fg-1); }
+  .session-head .conv-name { display:block; font-size:16px; }
+  .q-opts { flex-direction:column; }
+  .q-opts .btn, .ask-actions .btn, .elic-opt { min-height:44px; }
+}
+
+/* Last-start/resume MCP metadata, separate from the streamed transcript. */
+.mcp-delivery { margin:8px 20px; padding:12px; border:1px solid var(--border); border-radius:var(--r-sm); font-size:13px; }
+.mcp-delivery p { margin:0 0 4px; overflow-wrap:anywhere; }
+
+.family-panel { flex: 0 0 auto; border-bottom: 1px solid var(--border); padding: .55rem 1rem; font-size: .8rem; max-height: 32vh; overflow: auto; }
+.family-panel summary { cursor: pointer; padding: .35rem 0; }
+.family-panel a { text-decoration: underline; overflow-wrap: anywhere; }
+.family-child { margin-top: .65rem; padding-top: .65rem; border-top: 1px solid var(--border); }
+.family-meta { display: flex; flex-wrap: wrap; gap: .25rem .65rem; margin: .35rem 0; }
+.family-meta bdi, .family-child p, .q-routing { overflow-wrap: anywhere; }
+.family-child p { margin: .3rem 0; }
+.q-routing { margin-top: .6rem; color: var(--fg-muted); font-size: .8rem; }
+@media (max-width: 767px) {
+  .family-panel button, .family-panel summary, .family-panel a, .sess-family a { min-height: 44px; }
+  .family-panel a, .sess-family a { display: inline-flex; align-items: center; }
+  .family-panel { padding-inline: .75rem; }
+}
+.family-attention { margin-block: .65rem; padding-block: .5rem; border-bottom: 1px solid var(--border); }
+.family-attention h2 { font-weight: 600; }
+.family-attention p { margin-block: .35rem; overflow-wrap: anywhere; }
diff --git a/web/src/styles/shell.css b/web/src/styles/shell.css
new file mode 100644
index 00000000..8fb3146d
--- /dev/null
+++ b/web/src/styles/shell.css
@@ -0,0 +1,151 @@
+/* R2 owns shell/overview/queue geometry. Other lanes import their owned CSS. */
+.application-root { height:100dvh; display:flex; flex-direction:column; }
+.app { display:grid; grid-template-columns:240px minmax(0,1fr); grid-template-rows:minmax(0,1fr); flex:1; height:0; min-height:0; overflow:hidden; }
+.app-collapsed { grid-template-columns:56px minmax(0,1fr); }
+.shell,.main { display:flex; flex-direction:column; min-width:0; min-height:0; }
+.main { flex:1; overflow-y:auto; }
+.rail { display:flex; flex-direction:column; min-width:0; min-height:0; background:var(--hn-panel); border-right:1px solid var(--hn-line); overflow-y:auto; padding:0 8px; }
+.rail-head { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 8px; gap:8px; }
+.brand-name { font:600 18px var(--font-display); }
+.rail-collapse { display:flex; align-items:center; justify-content:center; width:28px; height:28px; color:var(--hn-fg-2); border:0; background:transparent; border-radius:6px; }
+.rail-collapse:hover { background:var(--hn-hover); }
+.command-entry { display:flex; align-items:center; gap:8px; text-align:left; margin:8px 0; padding:8px; border:1px solid var(--hn-control-strong); border-radius:6px; color:var(--hn-fg-3); background:var(--hn-sunken); font-size:13px; }
+.rail-nav { display:flex; flex-direction:column; gap:3px; }
+.nav-item { display:flex; align-items:center; gap:10px; min-height:34px; padding:6px 10px; border-radius:6px; font:500 13px var(--font-display); text-decoration:none; color:var(--hn-fg-2); }
+.nav-item:hover { background:var(--hn-hover); }
+.nav-item.on { background:var(--hn-accent-wash); color:var(--hn-accent-fg); }
+.nav-item .badge { margin-left:auto; }
+.nav-item:nth-child(4) { margin-top:20px; }
+.rail-hats { margin-top:24px; }
+.rail-hats .nav-section-label { margin:0 10px 8px; text-transform:uppercase; letter-spacing:.08em; font:700 11px var(--font-display); color:var(--hn-fg-3); }
+.hat-switch { display:flex; gap:8px; overflow-x:auto; padding:8px 24px; }
+.rail-hats .hat-switch { flex-direction:column; padding:0; overflow:visible; }
+.rail-hats .chip { text-align:left; border:0; border-radius:6px; background:transparent; }
+.rail-hats .chip.on { color:var(--hn-accent-fg); background:var(--hn-accent-wash); }
+.hat-dot { display:inline-block; width:9px; height:9px; border-radius:3px; background:var(--hn-accent); margin-right:8px; }
+.rail-foot { margin-top:auto; border-top:1px solid var(--hn-line); padding:12px 4px; display:flex; flex-direction:column; gap:8px; }
+.owner-mark { display:flex; align-items:center; gap:10px; font:500 13px var(--font-display); }
+.owner-mark::first-letter { border-radius:50%; }
+.host-fraction { color:var(--hn-fg-3); font-size:11px; }
+.rail-collapsed .nav-label,.rail-collapsed .rail-hats,.rail-collapsed .host-fraction { display:none; }
+.rail-collapsed .rail-head { padding:0; flex-wrap:wrap; gap:0; justify-content:center; }
+.rail-collapsed .brand-name { display:none; }
+.rail-collapsed .nav-item { padding:10px; justify-content:center; position:relative; }
+.rail-collapsed .badge { position:absolute; right:0; top:0; padding:0 3px; font-size:8px; }
+.rail-collapsed .command-entry { padding:8px; justify-content:center; }
+.rail-collapsed .rail-foot { align-items:center; }
+.tabbar,.mtopbar { display:none; }
+.overview { display:flex; flex-direction:column; min-width:0; padding-bottom:24px; }
+.overview-head { display:flex; align-items:center; gap:12px; min-height:52px; padding:8px 24px; border-bottom:1px solid var(--hn-line); background:var(--hn-panel); }
+.overview-head h1 { font:500 18px/1.2 var(--font-display); margin:0; }
+.overview-head > span { color:var(--hn-fg-3); font-size:12px; margin-right:auto; }
+.overview-head .btn { font-size:12px; }
+.overview-filters { display:flex; flex-wrap:wrap; gap:12px; padding:12px 24px; border-bottom:1px solid var(--hn-line); }
+.group-choice { display:flex; align-items:center; gap:12px; padding:0; margin:0; border:0; font-size:12px; }
+.group-choice legend { float:left; margin-right:12px; color:var(--hn-fg-3); }
+.group-choice label { display:flex; align-items:center; gap:5px; cursor:pointer; }
+.status-filters { display:flex; gap:6px; flex-wrap:wrap; flex-basis:100%; }
+.status-filters .chip { font:500 12px var(--font-display); }
+.status-filters span { color:var(--hn-fg-3); font-size:11px; margin-left:4px; }
+.filter-fields { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; width:100%; }
+.filter-fields label { display:flex; flex-direction:column; gap:4px; min-width:0; color:var(--hn-fg-3); font-size:11px; }
+.filter-fields label:first-child { flex:1; }
+.filter-fields input,.filter-fields select { width:100%; min-width:0; background:var(--hn-panel); border:1px solid var(--hn-control-strong); border-radius:6px; color:var(--hn-fg-1); padding:6px 10px; font-size:13px; }
+.toggle { border:1px solid var(--hn-control-strong); border-radius:6px; padding:6px 10px; color:var(--hn-fg-2); background:var(--hn-panel); font-size:12px; }
+.toggle.on { color:var(--hn-accent-fg); background:var(--hn-accent-wash); }
+.list-note { font-size:13px; color:var(--hn-fg-3); margin:12px 24px; }
+.list-more { margin:16px 24px; align-self:flex-start; }
+.grp { margin:16px 24px 0; border:1px solid var(--hn-line); border-radius:8px; overflow:hidden; background:var(--hn-surface); }
+.grp-head { display:flex; align-items:center; gap:10px; padding:10px 12px; margin:0; background:var(--hn-sunken); font:500 13px var(--font-display); }
+.grp-count { font:400 11px var(--font-body); color:var(--hn-fg-3); }
+.session-table { table-layout:fixed; width:100%; border-collapse:collapse; }
+.session-table th { text-align:left; padding:6px 12px; font:400 11px var(--font-body); color:var(--hn-fg-3); border-bottom:1px solid var(--hn-line); }
+.session-table th:first-child { width:34%; }
+.session-table th:nth-child(2) { width:21%; }
+.session-table th:last-child { width:12%; }
+.session-table td { padding:8px 12px; vertical-align:middle; font-size:12px; overflow-wrap:anywhere; border-bottom:1px solid var(--hn-line); }
+.session-table tr:last-child td { border-bottom:0; }
+.session-table tr:focus-within,.session-table tr:hover { background:var(--hn-hover); }
+.sess { display:block; min-height:28px; color:var(--hn-fg-1); text-decoration:none; border-radius:4px; }
+.sess.active { background:var(--hn-selected); }
+.sess-row1 { display:flex; gap:8px; align-items:center; }
+.sess-name { font:500 13px/1.3 var(--font-display); overflow:hidden; text-overflow:ellipsis; }
+.sess-led { width:7px; height:7px; flex:none; border-radius:50%; }
+.led-attn { background:var(--st-wait-solid); }.led-run { background:var(--st-run-solid); }.led-wait { background:var(--st-start-solid); }.led-idle { background:var(--st-idle-solid); }.led-fail { border:2px solid var(--st-fail-fg); }
+.sess-row2 { font-size:11px; color:var(--hn-fg-3); display:flex; gap:8px; flex-wrap:wrap; }
+.sess-where { font-family:var(--font-mono); overflow-wrap:anywhere; }
+.session-table .sess-time,.session-table .sess-agent,.session-table .sess-machine,.session-table .sess-flag { display:none; }
+.sess-resume { font-size:10px; color:var(--hn-accent-fg); }
+.sess-family { display:flex; flex-wrap:wrap; gap:8px; font-size:11px; color:var(--hn-fg-3); }
+.sess-family a { text-decoration:underline; overflow-wrap:anywhere; }
+.sess-child { padding-left:14px; border-left:2px solid var(--hn-line); }
+.row-status { font-size:11px; color:var(--hn-fg-2); }.row-status-attn { color:var(--st-wait-fg); }.row-status-fail { color:var(--st-fail-fg); }.row-status-run { color:var(--st-run-fg); }
+.sess-why { font-size:11px; color:var(--st-fail-fg); padding:4px 0; background:transparent; border:0; text-decoration:underline; }
+.sess-reason { font-size:12px; margin:4px 0; overflow-wrap:anywhere; }
+.more-nav { display:flex; flex-direction:column; gap:8px; padding:24px; }
+.more-nav a { display:flex; align-items:center; min-height:44px; padding:12px; border:1px solid var(--hn-line); border-radius:8px; background:var(--hn-panel); color:var(--hn-fg-1); text-decoration:none; }
+.overview > .sign-out { margin:0 24px; }
+.welcome { flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:32px; }
+.welcome h1 { font:500 24px var(--font-display); }.welcome p { max-width:440px; color:var(--hn-fg-3); }
+@media (min-width:768px) and (max-width:1023px) {
+.app { grid-template-columns:56px minmax(0,1fr); }
+.rail .nav-label,.rail .rail-hats,.rail .host-fraction,.rail .brand-name { display:none; }
+.rail .nav-item { justify-content:center; padding:10px; }.rail .command-entry span { display:none; }.rail .rail-head { padding:0; justify-content:center; }
+}
+@media (max-width:767px) {
+.app { grid-template-columns:minmax(0,1fr); }.rail { display:none; }
+.tabbar { display:flex; flex:none; background:var(--hn-panel); border-top:1px solid var(--hn-line); padding:4px 4px calc(4px + env(safe-area-inset-bottom)); }
+.tab { display:flex; flex:1; min-width:0; min-height:52px; flex-direction:column; align-items:center; justify-content:center; gap:3px; position:relative; font:500 10px var(--font-display); color:var(--hn-fg-3); text-decoration:none; border-radius:6px; }
+.tab.on { color:var(--hn-accent-fg); }.tab .badge { position:absolute; top:0; right:12%; padding:0 4px; font-size:9px; }
+.app-session .tabbar { display:none; }
+.overview-head { padding:12px 16px; flex-wrap:wrap; min-height:52px; padding-top:calc(12px + env(safe-area-inset-top)); }
+.overview-head h1 { font-size:20px; }.overview-head .btn { min-height:44px; }
+.hat-switch { padding:8px 16px; }.hat-switch .chip { min-height:44px; }
+.overview-filters { padding:12px 16px; }.group-choice label { min-height:44px; }
+.filters-default .filter-fields { display:none; }.filters-open .filter-fields { display:flex; }
+.filter-fields label { flex:1 1 45%; }.filter-fields label:first-child { flex-basis:100%; }
+.filter-fields input,.filter-fields select { font-size:16px; min-height:44px; }.toggle,.status-filters .chip { min-height:44px; }
+.grp { margin:12px 16px 0; border-radius:14px; }.session-table,.session-table tbody { display:block; }.session-table thead { display:none; }
+.session-table tr { display:flex; flex-wrap:wrap; padding:10px; border-bottom:1px solid var(--hn-line); }.session-table td { display:block; border:0; padding:2px 4px; font-size:11px; }
+.session-table td:first-child { width:100%; }.session-table td:not(:first-child)::before { content:attr(data-label) ': '; color:var(--hn-fg-3); }
+.session-table .sess { min-height:44px; }.sess-name { font-size:16px; }.session-table .sess-row2 { font-size:12px; }
+.session-table .sess-time { display:inline; margin-left:auto; font-size:11px; }.session-table td:last-child { display:none; }
+.sess-family a,.sess-why { display:inline-flex; align-items:center; min-height:44px; }
+.list-note { margin:12px 16px; }.list-more { min-height:44px; }
+}
+.needs-queue { padding:20px 24px; min-width:0; max-width:1080px; width:100%; margin:0 auto; }
+.queue-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:13px; color:var(--hn-fg-3); }
+.queue-heading span:first-child { color:var(--st-wait-fg); font-weight:600; }
+.queue-help { color:var(--hn-fg-3); font-size:12px; margin:8px 0 16px; }
+.queue-empty { margin:32px 0; font-size:15px; }
+.attention-card { border:1px solid var(--st-wait-line); border-radius:12px; padding:16px; margin-bottom:12px; background:var(--hn-surface); box-shadow:var(--shadow-xs); }
+.attention-card:focus-within { outline:2px solid var(--hn-focus-ring); outline-offset:2px; }
+.attention-card h2 { font:500 15px/1.3 var(--font-display); margin:10px 0; overflow-wrap:anywhere; }
+.attention-card-meta { display:flex; justify-content:space-between; gap:8px; color:var(--hn-fg-3); font-size:11px; }
+.attention-status { color:var(--st-wait-fg); }
+.attention-origin { display:flex; align-items:center; flex-wrap:wrap; gap:8px; color:var(--hn-fg-3); font-size:11px; }
+.attention-preview p { font-size:13px; margin:12px 0; overflow-wrap:anywhere; }
+.attention-preview .btn { margin-top:8px; min-height:32px; }
+.preview-question { padding:12px; background:var(--hn-sunken); border-radius:6px; color:var(--hn-fg-1); }
+.preview-note,.preview-error { color:var(--hn-fg-3); }
+.queue-summary { display:block; margin-top:16px; padding:16px; border:1px solid var(--hn-line); border-radius:8px; font-size:13px; text-decoration:none; background:var(--hn-panel); color:var(--hn-fg-2); }
+@media (max-width:767px) { .needs-queue { padding:12px 16px; }.attention-card { border-radius:14px; }.attention-card h2 { font-size:16px; }.attention-preview .btn { min-height:44px; }.queue-heading { font-size:12px; } }
+@media (max-width:767px) { .mtopbar { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:52px; padding:8px 16px; padding-top:calc(8px + env(safe-area-inset-top)); border-bottom:1px solid var(--hn-line); background:var(--hn-panel); }.mtb-title { font:500 16px var(--font-display); } }
+@media (min-width:768px) and (max-width:1023px) { .rail-foot > button { overflow:hidden; font-size:10px; min-width:0; padding:4px; } }
+.rail-collapsed .rail-foot > button { overflow:hidden; font-size:10px; min-width:0; padding:4px; }
+.rail-nav { gap:20px; }.rail-hats { margin-top:0; }
+.rail-nav .nav-section-label { margin:0 10px 8px; font:700 11px var(--font-display); letter-spacing:.08em; text-transform:uppercase; color:var(--hn-fg-3); }
+.rail-nav .nav-item:nth-child(4) { margin-top:0; }
+.rail-hat { display:flex; align-items:center; gap:6px; min-height:32px; padding:4px 6px; border-radius:6px; text-decoration:none; color:var(--hn-fg-2); }
+.rail-hat.on { background:var(--hn-selected); }.rail-hat .ui-hat { border:0; background:transparent; padding:0; min-width:0; overflow:hidden; }
+.hat-loaded { margin-left:auto; font-size:10px; color:var(--hn-fg-3); white-space:nowrap; }.hat-attention { font-size:8px; color:var(--st-wait-fg); }
+.rail-collapsed .rail-hats { display:block; }.rail-collapsed .rail-hat { justify-content:center; position:relative; }.rail-collapsed .hat-attention { position:absolute; right:2px; top:2px; }
+@media (min-width:768px) and (max-width:1023px) { .rail .rail-hats { display:block; }.rail .rail-hat { justify-content:center; position:relative; }.rail .hat-attention { position:absolute; right:2px; top:2px; } }
+.filter-sheet { overflow-y:auto; max-height:90dvh; }.filter-sheet .overview-head { flex:none; justify-content:space-between; }.filter-sheet h2 { margin:0; font:500 18px var(--font-display); }.filter-sheet .filter-fields { display:flex; }
+@media (min-width:768px) { .overview-head .filter-trigger { display:none; } }
+@media (pointer:coarse), (max-width:767px) { .queue-keys { display:none; } }
+.session-scope-status { display:none; }
+@media (max-width:767px) { .session-scope-status { display:flex; justify-content:flex-end; padding:0 16px; border-bottom:1px solid var(--hn-line); background:var(--hn-panel); }.session-scope-status a { display:inline-flex; align-items:center; gap:8px; min-height:44px; font-size:12px; color:var(--hn-fg-2); text-decoration:none; } }
+.hat-switch .chip { font-family:var(--font-display); }
+.hat-switch .ui-hat { background:transparent; border:0; padding:0; }
+@media (max-width:767px) { .app-session .shell { padding-top:env(safe-area-inset-top); padding-bottom:env(safe-area-inset-bottom); }.filter-sheet { padding-bottom:env(safe-area-inset-bottom); } }
```

### Task 2 verification refinement: capabilities, availability and one mobile header

The neutral R6 host has no palette handler yet. Before R6 registers one, Jump to falls back to session search in full mode and is natively disabled in gateway mode. Subscribe to registry availability so a later provider enables the entry without a shared-file edit. The gateway and Defaults regressions were observed RED, then the registry/App suite passed 24 tests. The Defaults lazy entry and command availability require the advertised `session_defaults` feature; R4 activates both by adding its backend capability without changing Shell. More also owns its single mobile header, without duplicating the legacy chrome title. Apply this exact refinement after the preceding Task 2 patch; it is part of the same implementation task.

```diff
diff --git a/web/e2e/shell.spec.ts b/web/e2e/shell.spec.ts
index a2cb7774..0e1bfb4f 100644
--- a/web/e2e/shell.spec.ts
+++ b/web/e2e/shell.spec.ts
@@ -227,6 +227,7 @@ for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const)
     await expect(visual.getByText('Nothing needs you', { exact: true })).toBeVisible()
     await capture('needs-you-empty')
     await visual.goto(collector.origin + '/more')
+    await expect(visual.locator('.mtopbar')).toHaveCount(0)
     const more = visual.getByRole('navigation', { name: 'More navigation', exact: true })
     await expect(more.getByRole('link')).toHaveCount(4)
     await capture('more')
@@ -248,6 +249,7 @@ for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const)
     await capture('gateway-unavailable')
     await visual.goto(collector.origin + '/more')
     await expect(visual.getByRole('navigation', { name: 'More navigation', exact: true }).getByRole('link')).toHaveCount(2)
+    if (width === 1280) await expect(visual.getByRole('button', { name: 'Jump to', exact: true })).toBeDisabled()
     await capture('gateway-more')
   } finally { for (const release of held) await release(); await context.close() }
 })
diff --git a/web/src/App.test.tsx b/web/src/App.test.tsx
index d8a3d19c..838ced1f 100644
--- a/web/src/App.test.tsx
+++ b/web/src/App.test.tsx
@@ -1,10 +1,16 @@
 import { act, render, screen, waitFor, within } from '@testing-library/react'
 import userEvent from '@testing-library/user-event'
-import { afterEach, describe, expect, it } from 'vitest'
+import { afterEach, describe, expect, it, vi } from 'vitest'
 import App from './App'
 import { heldFor, hold } from './lib/attachments'
 import { sendingFor, track } from './lib/sending'
 import { FULL, GATEWAY, json, stubServer } from './test-server'
+import { useActionSnapshot } from './app-actions'
+vi.mock('./screens/Defaults', () => ({ default: () => <h1>Defaults entry point</h1> }))
+vi.mock('./components/CommandHost', () => ({ default: () => {
+  const actions = useActionSnapshot()
+  return <output aria-label="Defaults action availability">{String(actions?.get('open-defaults')?.enabled ?? false)}</output>
+} }))

 function at(path: string) {
   history.replaceState(null, '', path)
@@ -166,3 +172,21 @@ it('More contains every configured destination and sign out', async () => {
   expect(within(nav).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/mcp', '/hats', '/defaults', '/settings'])
   expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
 })
+
+it('disables the command entry until this deployment has an enabled provider', async () => {
+  at('/more')
+  render(<App fetchImpl={stubServer({ 'GET /api/capabilities': json(200, GATEWAY) }).fetch} />)
+  const rail = await screen.findByRole('complementary', { name: 'Views' })
+  expect(within(rail).getByRole('button', { name: 'Jump to' })).toBeDisabled()
+})
+
+it.each([false, true])('mounts the Defaults entry point only with its backend capability: %s', async enabled => {
+  at('/defaults')
+  render(<App fetchImpl={stubServer({ 'GET /api/capabilities': json(200, { ...FULL, features: enabled ? ['session_defaults'] : [] }), 'GET /api/hats': json(200, []), 'GET /api/hosts': json(200, []) }).fetch} />)
+  if (enabled) expect(await screen.findByRole('heading', { name: 'Defaults entry point' })).toBeInTheDocument()
+  else {
+    expect(await screen.findByRole('heading', { name: 'Defaults' })).toBeInTheDocument()
+    expect(screen.queryByRole('heading', { name: 'Defaults entry point' })).toBeNull()
+  }
+  await waitFor(() => expect(screen.getByRole('status', { name: 'Defaults action availability' })).toHaveTextContent(String(enabled)))
+})
diff --git a/web/src/components/CommandEntry.tsx b/web/src/components/CommandEntry.tsx
index 9f1065b6..484a20ed 100644
--- a/web/src/components/CommandEntry.tsx
+++ b/web/src/components/CommandEntry.tsx
@@ -1,8 +1,9 @@
-import { useAppActions } from '../app-actions'
+import { useActionSnapshot } from '../app-actions'
 import { Icon } from './ui'
 export default function CommandEntry({ compact = false }: { compact?: boolean }) {
-  const actions = useAppActions()
-  return <button type="button" className="command-entry" aria-label="Jump to" onClick={() => {
+  const actions = useActionSnapshot()
+  const enabled = actions?.get('open-commands')?.enabled || actions?.get('search-sessions')?.enabled
+  return <button type="button" className="command-entry" aria-label="Jump to" disabled={!enabled} onClick={() => {
     if (!actions?.dispatch('open-commands')) actions?.dispatch('search-sessions')
   }}><Icon name="magnifying-glass" size={18} />{!compact && <span>Jump to…</span>}</button>
 }
diff --git a/web/src/components/Shell.tsx b/web/src/components/Shell.tsx
index 391bf381..85c19b06 100644
--- a/web/src/components/Shell.tsx
+++ b/web/src/components/Shell.tsx
@@ -49,17 +49,17 @@ function Frame({ caps, route }: { caps: CapabilitiesResponse; route: Route }) {
     requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search sessions"]')?.focus())
   } }, -1)
   return <div className={'app' + (collapsed ? ' app-collapsed' : '') + (route.name === 'session' ? ' app-session' : '')}>
-    {(['needs-you', 'sessions', 'new', 'hosts', 'mcp', 'hats', 'defaults', 'settings'] as const).map(view => <NavigationAction key={view} view={view} enabled={views.includes(view) && (view !== 'mcp' || caps.features.includes('mcp_connections'))} />)}
+    {(['needs-you', 'sessions', 'new', 'hosts', 'mcp', 'hats', 'defaults', 'settings'] as const).map(view => <NavigationAction key={view} view={view} enabled={views.includes(view) && (view !== 'mcp' || caps.features.includes('mcp_connections')) && (view !== 'defaults' || caps.features.includes('session_defaults'))} />)}
     {caps.features.includes('web_push') && <PushForeground />}
     <NavigationRail views={views} current={current} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
-    <div className="shell">{!['sessions', 'needs-you', 'session'].includes(route.name) && <header className="mtopbar"><span className="mtb-title">{current ? LABEL[current] : 'hennery'}</span><McpBadge link /></header>}{route.name === 'session' && (scope?.list.counts.waiting ?? 0) > 0 && <div className="session-scope-status"><Link to="/needs-you">Needs you <WaitingBadge /></Link></div>}<main className="main">
+    <div className="shell">{!['sessions', 'needs-you', 'session', 'more'].includes(route.name) && <header className="mtopbar"><span className="mtb-title">{current ? LABEL[current] : 'hennery'}</span><McpBadge link /></header>}{route.name === 'session' && (scope?.list.counts.waiting ?? 0) > 0 && <div className="session-scope-status"><Link to="/needs-you">Needs you <WaitingBadge /></Link></div>}<main className="main">
       <Suspense fallback={<p role="status">Loading…</p>}>
       {route.name === 'not_found' ? <Placeholder title="Not found" text="No page lives at this address." />
       : !shown ? <Placeholder title={current ? LABEL[current] : 'hennery'} text="This view is not part of this deployment." />
       : route.name === 'sessions' ? <Sessions />
       : route.name === 'needs-you' ? <NeedsYou />
       : route.name === 'more' ? <More views={views} />
-      : route.name === 'defaults' ? <Defaults />
+      : route.name === 'defaults' ? caps.features.includes('session_defaults') ? <Defaults /> : <Placeholder title="Defaults" text="Per-hat session defaults are not part of this deployment." />
       : route.name === 'hosts' ? <Hosts />
       : route.name === 'hats' ? <Hats />
       : route.name === 'settings' ? <Settings push={caps.features.includes('web_push')} sessions={caps.mode === 'full'} />
diff --git a/web/src/styles/shell.css b/web/src/styles/shell.css
index 8fb3146d..db512901 100644
--- a/web/src/styles/shell.css
+++ b/web/src/styles/shell.css
@@ -149,3 +149,4 @@
 .hat-switch .chip { font-family:var(--font-display); }
 .hat-switch .ui-hat { background:transparent; border:0; padding:0; }
 @media (max-width:767px) { .app-session .shell { padding-top:env(safe-area-inset-top); padding-bottom:env(safe-area-inset-bottom); }.filter-sheet { padding-bottom:env(safe-area-inset-bottom); } }
+.command-entry:disabled { opacity:.55; cursor:not-allowed; }
```

### Task 2 verification refinement: status-only preview freshness

A per-hat attention-page promise could outlive a changed immutable session summary and retain an old reason. Keep caching at the session-summary/item-version boundary and read the real attention page again for a changed status-only summary, through the same two-request scheduler. The new regression was observed RED, then the preview/queue suites passed. Apply after the preceding Task 2 refinement.

```diff
diff --git a/web/src/components/AttentionPreview.test.tsx b/web/src/components/AttentionPreview.test.tsx
index 6699f370..8c402735 100644
--- a/web/src/components/AttentionPreview.test.tsx
+++ b/web/src/components/AttentionPreview.test.tsx
@@ -95,3 +95,13 @@ it('qualifies an incomplete real attention page without scanning more records',
   expect(t.calls.filter(call => call.path.startsWith('/api/delegation/attention'))).toHaveLength(1)
   reader.stop()
 })
+it('refreshes a real status-only reason when an immutable attention summary changes', async () => {
+  let reason = 'child_failed'
+  const t = routed(call => call.path.startsWith('/api/delegation/attention') ? json([{ id: 'a', child_id: 's', hat_id: 'hat', pending_id: null, reason }]) : json({ pending: [] }))
+  const reader = new PreviewReader(t.client)
+  expect((await reader.read(session('s'))).attention?.reason).toBe('child_failed')
+  reason = 'operator_takeover'
+  expect((await reader.read({ ...session('s'), operator_attention: 2 })).attention?.reason).toBe('operator_takeover')
+  expect(t.calls.filter(call => call.path.startsWith('/api/delegation/attention'))).toHaveLength(2)
+  reader.stop()
+})
diff --git a/web/src/components/AttentionPreview.tsx b/web/src/components/AttentionPreview.tsx
index 58894adf..69a09108 100644
--- a/web/src/components/AttentionPreview.tsx
+++ b/web/src/components/AttentionPreview.tsx
@@ -17,9 +17,8 @@ export class PreviewReader {
   private abort = new AbortController()
   private cache = new WeakMap<SessionSummary, Promise<Preview>>()
   private questions = new Map<string, Extract<Item, { kind: 'question' }>>()
-  private attention = new Map<string, Promise<OperatorAttention[]>>()
   constructor(private client: Client) {}
-  stop() { this.stopped = true; this.abort.abort(); this.queue = []; this.cache = new WeakMap(); this.questions.clear(); this.attention.clear() }
+  stop() { this.stopped = true; this.abort.abort(); this.queue = []; this.cache = new WeakMap(); this.questions.clear() }
   private task<T>(read: () => Promise<T>): Promise<T> {
     return new Promise<T>((resolve, reject) => {
       const begin = () => {
@@ -52,9 +51,7 @@ export class PreviewReader {
       this.questions.set(key, question)
       return { question }
     }
-    let rows = this.attention.get(session.hat_id)
-    if (!rows) { rows = this.task(() => attentionPage(this.client, session.hat_id, undefined, this.abort.signal)); this.attention.set(session.hat_id, rows) }
-    const page = await rows
+    const page = await this.task(() => attentionPage(this.client, session.hat_id, undefined, this.abort.signal))
     return { attention: page.find(row => row.hat_id === session.hat_id && row.child_id === session.session_id && row.pending_id === null), partial: page.length === 100 }
   }
 }
```

### Verification commands

Run from this worktree root inside the dev shell; preserve real exit statuses in the ledger. Full E2E builds its embedded PWA variants and the real notification fixture through the package script.

```sh
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web typecheck
nix develop -c pnpm --dir web test
nix develop -c pnpm --dir web build
nix develop -c cargo build -p hennery -p hennery-testkit --bins --locked
nix develop -c bash -c 'CI=1 pnpm --dir web e2e'
nix develop -c cargo fmt --all --check
nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
nix develop -c cargo clippy -p hennery --locked -- -D warnings
nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
nix develop -c cargo run -p hennery-view --bin gen-view --locked -- --check
nix develop -c cargo test --workspace --locked
```

If the web lock changes, run `sh packaging/update-web-hash.sh` and commit the Nix hash; no dependency/lock change is planned.

### Fresh replay and removal probes

Extract Task 1 and all three Task 2 `diff` blocks (four patches) into fresh ignored replay storage. Require each to contain more than zero `diff --git` files before applying with `git apply --check` and `git apply`. Archive `4d461fb0`, initialize the copy's own git root, and APFS-clone the completed target and web dependencies. Apply patches in task order, run their targeted checks, then compare every implementation path byte for byte against the tested worktree and run final web checks/build/embed/browser acceptance there. Do not count an empty extraction or only a subset comparison as success.

In a separate cloned probe copy, remove one guard at a time, run the named regression and require a nonzero exit, then restore the exact copied bytes. Probe registry availability/cleanup/precedence, API id encoding, queue attention/query isolation and page budget/retry, late-response fences, preview concurrency/typed data/version/link retention, scoped route return, capability gating, grouping/status outcomes and the separate app/notification allowlists. Verify copied files match tested source after all probes. Probes never mutate the real worktree. Record every probe and its exit; unresolved detection gaps block handoff.

## Task 3: Record execution and request parent review

Complete Execution status with actual command exits/counts, replay extraction/matching-file counts, each probe outcome, 4×3 concurrency runs, screenshot names/reference frames, intentional deviations and ownership exceptions. Do not edit `docs/README.md`. Commit `docs(plan): record UI R2 verification and parallel handoff` and push. Request independent task and whole-branch review through the parent; do not claim self-review as approval.

## After this plan

R3–R6 branch from the reviewed R2 head. The parent serializes integration/index changes and handles shared-contract amendments.

- **Routes/lazy entry points:** `/needs-you`, `/sessions`, `/sessions/:id?pending=…`, `/new?host=…&cwd=…`, `/more`, `/defaults`, `/hosts`, `/mcp`, `/hats`, `/settings`. Full/gateway checks live in R2's Shell/views. R4 replaces `screens/Defaults.tsx`, `screens/NewSession.tsx` and `components/NewSessionFrame.tsx`; R6 replaces the App-mounted lazy `components/CommandHost.tsx`. Neither edits Shell/router/views/App to insert its screen. `router.launcherReturn()` exposes the safe route-frame return; `navigate` retains a known app opener for `/new`. Rail `?hat=` navigation is scope, never a push permission.
- **Registry:** `AppActionsProvider`, `AppActions`, `AppActionId`, `AppAction`, `AppContext`, `useAppActions`, `useActionSnapshot`, `useRegisterAction(id, action, priority?)`, `useRegisterContext(context, priority?)`. Actions: `new-session`, `search-sessions`, `toggle-rail`, `toggle-details`, `focus-composer`, `open-needs-you`, `open-sessions`, `open-hosts`, `open-mcp`, `open-hats`, `open-defaults`, `open-settings`, `open-commands`. Handlers contain `{label, enabled, run}`; dispatch returns false for missing/disabled handlers. Screen priority is 0; shell fallback is -1. Context fields are `sessionId`, `hostId`, `cwd`, `hatId`. R3 registers actual session context/details/composer/contextual launch; R4/R5 register their enabled actions in owned files; R6 discovers/dispatches rather than copying mutations. Unmount cleanup is by registration identity. R6 owns command definitions, help, palette and global typing/IME/modal guards.
- **Delegation facade:** `sessionTools(client, hat)`, `setSessionTools(client, hat, SetSessionTools)`, `executionPolicy(client, hat)`, `setExecutionPolicy(client, hat, SetExecutionPolicy)`, `runtimeCatalog(client, host, agent, cwd, signal?)`. Return generated `HatSessionTools`, `ExecutionPolicy`, `HostCatalog`. All use shared Client and exact encoded identifiers. R4 reads policy security-axis identities; R5 consumes reads/writes with existing step-up. No optimistic revision request is invented. Both lanes consume this file read-only.
- **CSS:** R2 owns `styles/shell.css`; R3 owns `styles/session.css`, imported by its screen; R4 owns `styles/launch.css`, imported by its screen; R5 owns `manage.css`; R6 adds/imports `styles/commands.css` from its owned modules. Shared `index.css` is frozen. The only initial Session/NewSession source change for extraction is the owned CSS import.
- **UI primitives:** continue using `components/ui/index.ts`: Button/IconButton, Input/Select/Textarea, RadioGroup, StatusBadge, HatChip/CountPill/ConfigChip/Keycap, bundled Icon, AppearanceButton/AppearanceOptions and useModalLayer. ConfirmDialog/StepUpDialog props remain unchanged. R1 owns these components/tests. R3 consumes `lib/catalog.ts` read-only; R4 preserves its existing parser exports/semantics when extending it.
- **Session/queue seam:** `useSessionScope()` exposes the one list, owned hats/hosts, selected hat and retained overview filters/grouping. Needs you uses its separate hat-only page scope; previews never answer. R3 owns actual-server-hat accent scoping, session details/actions and canonical AnswerBook controls. A session/card link does not change overview scope. R2 owns `shell.spec.ts`/`pwa.spec.ts`; R3 owns session/family/windowing; R4 adds launcher/default cases in `new-session.spec.ts`; R5 owns management/MCP/delegation; R6 adds `commands.spec.ts`.

Generated with Claude AI — please review before distribution.
