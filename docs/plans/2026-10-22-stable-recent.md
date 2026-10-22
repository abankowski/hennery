# Stable Recent positions

> Base: `7630ebc3`; branch: `fix/recent-stable`; one implementation task.
> Operator-approved product amendment, 2026-10-22.

## Execution status

Implemented. Independent task/branch review and Linux/macOS CI remain parent-owned. No deployment or release is part of this change.

Integration update (2026-10-22): independent read-only review approved the
implementation at `29f9b3b6` with no findings. During PR #246, main advanced to
`02f2cf82` with New like this and protocol changes. The branch was rebased onto
that main; the only conflict was the plan index in `docs/README.md`, resolved
by retaining both entries. Recent implementation and test bytes remain those
reviewed and replayed below. The original base and embedded patch are retained
as historical replay evidence. Post-rebase verification and final CI are
tracked on PR #246.

All commands below ran in the Nix dev shell. Successful workspace suites plus the isolated retry and continuation cover 2952 passed / 9 ignored Rust tests. The first workspace command exited 101 on storage exhaustion; it is not reported as a green full run.

| Command | Result |
|---|---|
| `pnpm --dir web install --frozen-lockfile` (scratch-local store) | Frozen install; lockfile unchanged |
| `pnpm --dir web test src/lib/sessionHistory.test.ts src/hooks/useSessionHistory.test.tsx src/components/SessionList.test.tsx` | 100 passed |
| `pnpm --dir web typecheck` | Passed |
| `pnpm --dir web test` | 2,660 passed in 157 files |
| `pnpm --dir web build` | Passed; 3 build-script tests; 3 emitted CSS assets passed origin checks |
| `cargo fmt --all --check` | Passed |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | Passed |
| `cargo clippy -p hennery --locked -- -D warnings` | Passed |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | Passed |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | Passed |
| `cargo build -p hennery -p hennery-testkit --bins --locked` | Passed, production UI embedded |
| `CI=1 pnpm --dir web exec playwright test session-switching.spec.ts --project chromium` | 4 passed: desktop/phone × light/dark, including cross-window navigation |
| `cargo test --workspace --locked` | Exit 101: e2e stopped with 20 passed / 17 failed; all 17 failures reported ENOSPC/StorageFull. Earlier suites passed |
| `cargo test -p hennery-testkit --test e2e --locked` | Exit 0: isolated retry, 37 passed |
| `cargo test -p hennery-testkit --locked --test fake_acp --test forget --test forget_claude --test forget_codex --test forget_host --test hats --test host_connection --test host_session --test images --test join --test login --test logos --test owner_filter --test pairing --test passkeys --test place_fd --test plugin_control --test plugin_feed --test plugin_http --test plugin_startup --test plugin_startup_host --test projects --test proxy_attribution --test public_url --test public_url_log --test purge --test push --test reconcile --test resolve --test reverse_proxy --test session_defaults --test session_gateway --test session_gateway_log --test session_mcp --test session_mcp_log --test session_titles --test setup --test step_up --test stream --test view --test web --test ws_ingest_error` | Exit 0: all remaining testkit binaries after e2e |
| `cargo test -p hennery-view --lib --bins --tests --locked` | Exit 0: remaining view tests |
| `cargo test --workspace --doc --locked` | Exit 0: remaining workspace doctests |
| Copied guard probes (revisit, hat scope, numbered targets, activity ordering) | 4/4 detected; each targeted regression exited 1 |
| Fresh replay: typecheck and targeted frontend tests | Exit 0; 100 passed; 10 patch files, all 1,165 tracked files matched |

RED-first evidence: history/hook regressions failed on the old implementation (3 failed / 26 passed); the app click/shortcut regression also failed (1 failed / 70 skipped). Initial typecheck caught an ES2023-only test helper; the fixture now uses the existing compiler target.

The storage failure did not reproduce in the isolated e2e retry (37/37). Available disk space was about 12 GiB immediately after the first run and 29 GiB at the retry. No unrelated Rust fix or scratch cleanup was made. The continuation ran only the testkit binaries lexically after e2e, view tests and workspace doctests, rather than repeating suites that had already passed.

Scratch copies remain under `.superpowers/sdd/recent-stable/` for parent cleanup: `probe-1` and `replay-1`–`replay-4`. Only replay-4 reached verification. Earlier setup attempts stopped on a missing patch newline, GNU cp lacking macOS's clone option, and cloning target/ during compilation; the successful replay used native /bin/cp after compilation finished. Every verified copy had its own cloned target/; no target directory was shared. No 4×3 load runs: timing/concurrency implementation is unchanged.

## Scope

Clicking an existing Recent row previously moved it to the top and renumbered the other rows. Keep the visible set in place while switching sessions, renaming them and receiving activity updates.

## Decisions

- Preserve the six visible positions after authorized hydration and hat filtering.
- A session opened outside the visible set enters first. The sixth existing row leaves the visible set and remains in the bounded 50-id history.
- Option/Alt+1–5 always address the first five positions, including the selected session. The sixth row remains clickable.
- Retain the separate two-id, window-local Back history and palette preselection of the previous session.
- Reuse persisted history without clearing it or introducing another storage format. Windows share Recent order, so opening a new entry in either window changes that shared set.
- Do not add pins, drag sorting, new streams, server fields, migrations or dependencies.

## Global constraints

Only authorized summaries may enter the displayed set. Preserve existing hat isolation, deletion pruning, hydration bounds and transient-error handling. Keep real operator data untouched; browser fixtures are synthetic and collectors run in scratch homes. Preserve reduced-motion, mobile editing and shortcut guards.

## Review focus

Check that preserving visible entries does not prevent restoring an older hidden entry; membership is scoped after hat filtering; selection does not renumber shortcuts; Back and palette preselection still use window history; another window cannot overwrite this window's Back history.

## File structure

- `docs/README.md`
- `docs/specs/2026-10-20-ui-redesign-design.md`
- `web/e2e/session-switching.spec.ts`
- `web/src/components/NavigationRail.tsx`
- `web/src/components/SessionList.test.tsx`
- `web/src/components/SessionScope.tsx`
- `web/src/hooks/useSessionHistory.test.tsx`
- `web/src/hooks/useSessionHistory.ts`
- `web/src/lib/sessionHistory.test.ts`
- `web/src/lib/sessionHistory.ts`

## Task 1 — preserve positions and numbered targets

Apply this exact patch to the base. It includes the operator decision in the UI specification, regression coverage and the updated browser acceptance scenario.

```diff
diff --git a/docs/README.md b/docs/README.md
index 1f43aa41..723b4ead 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -32,6 +32,7 @@ slice); everything else is design. The maintainer's decisions are recorded below
    - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
      and its [harness](../spikes/2026-09-25-mcp-per-session/).
 4. Plans:
+   - [Stable Recent positions](plans/2026-10-22-stable-recent.md) — operator-approved fixed positions for six visible visited sessions, position-based numbered shortcuts and independent window-local Back history. Implementation, regression probes and replay are recorded in the plan; independent review and CI remain parent-owned.
    - [Local OAuth callback](plans/2026-10-22-local-oauth-callback.md) — opt-in per-flow localhost provider redirect, a loopback CLI browser relay to the fixed collector, exact DCR/exchange matching and explicit command-before-Connect UI. API/CLI guards, real HTTPS domain-cookie browser tests, removal probes and timing load are recorded in the plan; independent review and Linux/macOS CI remain parent-owned. No deployment or live configuration change.
    - [Needs you result inbox](plans/2026-10-22-needs-you-inbox.md) — approved operator follow-up for v0.3.1, held until v0.3.0 is live: durable result review, explicit/read-on-visible acknowledgement, captured-result prompt acknowledgement, and delegated-child completion suppression. Implementation and local verification are recorded in the plan; independent review and merge remain parent-owned. No release or version bump.
    - [Idle parking holds](plans/2026-10-20-park-hold.md) — keeps a parent attached while a direct child remains attached or a family notice awaits delivery; adds a persisted operator pin API and capability-gated host restoration. Real Codex probes reproduced background-job loss and parent parking/automatic resume; Claude scratch authentication was unavailable. Local gates, 49 removal probes, 96 loaded passes and a fresh 969-file replay are recorded. Review requested amendments to offline/reconnect lock order and deleted pin cleanup; these have RED-first regressions, 3 copied probes and 96 loaded passes. Scoped re-review and Linux/macOS CI remain parent-owned; the UI toggle belongs to redesign R3.
diff --git a/docs/specs/2026-10-20-ui-redesign-design.md b/docs/specs/2026-10-20-ui-redesign-design.md
index 4f559ad6..c7ba0835 100644
--- a/docs/specs/2026-10-20-ui-redesign-design.md
+++ b/docs/specs/2026-10-20-ui-redesign-design.md
@@ -1340,7 +1340,7 @@ operator-level product question is introduced by this specification.
 ## 12. Redesign v2 — session switching and hat scope (2026-10-21)

 The operator's local Desktop v2 prototype defines session switching. The
-sidebar has up to six most recently **visited** sessions, independent of
+sidebar has up to six recently **visited** sessions, independent of
 agent activity. Each row has a status icon, an 8 px hat-colour dot before the
 title (hat name in its tooltip), and a highlight for the current session.
 Collapsed navigation retains 18 px status icons with a hat-colour badge,
@@ -1361,12 +1361,18 @@ attention without a pending question uses the permission hand. Distinguishing
 permission requests from other pending questions requires a future summary
 contract addition; this UI lane does not add backend requests or fields.

-The current session stays pinned first and unnumbered, even when another
-window changes this browser's visit order. The other visible Recent entries are
-numbered Option/Alt+1–5 in visit order, as in the prototype. Backtick opens
+Operator amendment (2026-10-22): visible Recent entries keep their positions
+when opened, renamed or updated. Selection only changes the highlight. Opening
+a session outside the six visible entries inserts it first; the oldest slot
+leaves the visible set but remains in the bounded history. Determine visibility
+after hat filtering and authorized hydration. Existing persisted history is
+used in place, without a reset or a new storage format. Other windows share
+this order; new entries from either window can change the visible set.
+Option/Alt+1–5 target the first five visible positions, including the current
+session; the sixth entry remains clickable. Backtick opens
 this window's previous visited session, using a two-id sessionStorage history.
 Other windows share only the browser-wide Recent order and numbered targets.
-The command palette puts **Recent** first in shared visit order and
+The command palette puts **Recent** first in shared Recent order and
 preselects that previous visit, so Command/Ctrl+K followed by Enter also goes
 back. Searching still searches authorized sessions through the existing API;
 unvisited loaded sessions are labelled Sessions rather than Recent. The
diff --git a/web/e2e/session-switching.spec.ts b/web/e2e/session-switching.spec.ts
index 7f3ff2e2..a976f9d2 100644
--- a/web/e2e/session-switching.spec.ts
+++ b/web/e2e/session-switching.spec.ts
@@ -52,7 +52,7 @@ for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const)
   const routeIs = async (n: number) => {
     await expect(page).toHaveURL(collector.origin + `/sessions/${sessionId(n)}`)
     await expect(page.getByRole('heading', { level: 1, name: `Plan ${n}`, exact: true })).toBeVisible()
-    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hennery.visitedSessions') ?? '[]')[0])).toBe(sessionId(n))
+    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('hennery.windowSessions') ?? '[]')[0])).toBe(sessionId(n))
   }
   try {
     await page.goto(collector.origin + '/sessions')
@@ -70,6 +70,14 @@ for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const)
       await expect(recent.locator('.recent-hat').first()).toHaveAttribute('title', 'Work')
       await expect(recent.locator('.recent-hat').first()).toHaveCSS('width', '8px')
       const original: string[] = await page.evaluate(() => JSON.parse(localStorage.getItem('hennery.visitedSessions')!))
+      await recent.getByRole('link', { name: /^Plan 4 ·/ }).click()
+      await routeIs(4)
+      await expect(recent.locator('.recent-title')).toHaveText(['Plan 6', 'Plan 5', 'Plan 4', 'Plan 3', 'Plan 2', 'Plan 1'])
+      await expect(recent.getByRole('link').nth(2)).toHaveAttribute('aria-current', 'page')
+      await expect(recent.getByRole('link').nth(2).locator('kbd')).toHaveText(/(?:⌥|Alt\+)3/)
+      await page.keyboard.press('Alt+Digit3'); await routeIs(4)
+      await page.keyboard.press('Backquote'); await routeIs(6)
+      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hennery.visitedSessions')!))).toEqual(original)
       const otherWindow = await context.newPage()
       try {
         await otherWindow.goto(collector.origin + `/sessions/${sessionId(7)}`)
@@ -77,7 +85,7 @@ for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const)
         await otherWindow.goto(collector.origin + `/sessions/${sessionId(0)}`)
         await expect(otherWindow.locator('.rail .command-entry')).toBeEnabled()
         await expect.poll(() => otherWindow.evaluate(() => JSON.parse(sessionStorage.getItem('hennery.windowSessions') ?? '[]')[0])).toBe(sessionId(0))
-        await expect(recent.locator('.recent-title')).toHaveText(['Plan 6', 'Plan 0', 'Plan 7', 'Plan 5', 'Plan 4', 'Plan 3'])
+        await expect(recent.locator('.recent-title')).toHaveText(['Plan 0', 'Plan 7', 'Plan 6', 'Plan 5', 'Plan 4', 'Plan 3'])
         await expect(recent.locator('[aria-current="page"]')).toContainText('Plan 6')
         await page.bringToFront()
         await page.locator('body').click({ position: { x: width - 2, y: 2 } })
@@ -104,13 +112,12 @@ for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const)
       } finally { await otherWindow.close() }
     }
     await page.locator('body').click({ position: { x: width - 2, y: 2 } })
-    await page.keyboard.press('Alt+Digit2'); await routeIs(4)
+    await page.keyboard.press('Alt+Digit3'); await routeIs(4)
     await page.keyboard.press('Backquote'); await routeIs(6)
     await page.keyboard.press(`${mod}+k`)
     const palette = page.getByRole('dialog', { name: 'Command palette', exact: true })
     const visits = palette.getByRole('group', { name: 'Recent', exact: true })
-    await expect(visits.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
-    await expect(visits.getByRole('option').first()).toContainText('Plan 4')
+    await expect(visits.getByRole('option', { selected: true })).toContainText('Plan 4')
     await capture('palette')
     await page.keyboard.press('Enter'); await routeIs(4)
     // Focused composer, IME, and contenteditable leave switching keys alone.
@@ -160,7 +167,7 @@ for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const)
     const queue = page.getByRole('region', { name: 'Attention queue', exact: true })
     if (width === 1280) {
       await expect(queue.getByRole('article')).toHaveCount(1)
-      await expect(recent.locator('.recent-title')).toHaveText(['Plan 4', 'Plan 6', 'Plan 2', 'Plan 0'])
+      await expect(recent.locator('.recent-title')).toHaveText(['Plan 6', 'Plan 4', 'Plan 2', 'Plan 0'])
     }
     await expect(page).toHaveTitle('(1) hennery')
     await page.locator('body').click({ position: { x: width - 2, y: 2 } })
@@ -176,14 +183,14 @@ for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const)
     await expect(page).toHaveTitle('(2) hennery')
     await page.getByRole('navigation', { name: width === 1280 ? 'Main navigation' : 'Primary navigation', exact: true }).getByRole('link', { name: 'Sessions', exact: true }).click()
     await expect(list.locator('.session-table [data-session-link]')).toHaveCount(8)
-    if (width === 1280) await expect(recent.locator('.recent-title')).toHaveText(['Plan 4', 'Plan 5', 'Plan 6', 'Plan 3', 'Plan 2', 'Plan 1'])
+    if (width === 1280) await expect(recent.locator('.recent-title')).toHaveText(['Plan 6', 'Plan 5', 'Plan 4', 'Plan 3', 'Plan 2', 'Plan 1'])
     await capture('overview')
     await page.reload()
     await expect(list).toBeVisible()
     await expect(page.locator('.rail .command-entry')).toBeEnabled()
     await page.locator('body').click({ position: { x: width - 2, y: 2 } })
     await page.keyboard.press(`${mod}+k`)
-    await expect(visits.getByRole('option').first()).toContainText('Plan 4')
+    await expect(visits.getByRole('option', { selected: true })).toContainText('Plan 4')
     await expect(visits.getByRole('option', { name: 'Plan 5 /srv/project', exact: true })).toBeVisible()
     await page.keyboard.press('Escape')
     if (width === 1280) {
diff --git a/web/src/components/NavigationRail.tsx b/web/src/components/NavigationRail.tsx
index 6da6e6f3..c83b14b6 100644
--- a/web/src/components/NavigationRail.tsx
+++ b/web/src/components/NavigationRail.tsx
@@ -21,8 +21,8 @@ export default function NavigationRail({ views, current, collapsed, toggle }: {
   const hosts = scope?.hosts?.filter(h => h.revoked_at == null)
   const navigation = (view: View) => <Link key={view} to={PATH[view]} aria-label={LABEL[view]} title={LABEL[view]} className={'nav-item' + (current === view && !scope?.selectedId ? ' on' : '')} aria-current={current === view && !scope?.selectedId ? 'page' : undefined}><Icon name={NAV_ICON[view]} size={18} /><span className="nav-label">{view === 'sessions' ? 'All sessions' : LABEL[view]}</span>{view === 'needs-you' && <WaitingBadge />}{view === 'mcp' && <McpBadge />}</Link>
   const hatLinks = scope ? [{ id: '', name: 'All hats', colour: undefined }, ...(scope.hats ?? [])] : []
-  const recent = sidebarSessions(scope?.recentSessions ?? [], scope?.selectedId ?? null)
-  const targets = recentSessionTargets(recent, scope?.selectedId ?? null)
+  const recent = sidebarSessions(scope?.recentSessions ?? [])
+  const targets = recentSessionTargets(recent)
   return <aside className={'rail' + (collapsed ? ' rail-collapsed' : '')} aria-label="Views">
     <div className="rail-head"><span className="brand-name" title="hennery">hennery</span><button type="button" className="rail-collapse" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={toggle}><Icon name={collapsed ? 'chevron-double-right' : 'chevron-double-left'} size={18} /></button></div>
     <CommandEntry compact={collapsed} />
diff --git a/web/src/components/SessionList.test.tsx b/web/src/components/SessionList.test.tsx
index 55d7a911..c63fa0d6 100644
--- a/web/src/components/SessionList.test.tsx
+++ b/web/src/components/SessionList.test.tsx
@@ -1084,6 +1084,35 @@ it('scopes Recent, list and attention counts together, restores All hats, and pr
   expect(localStorage.getItem('hennery.visitedSessions')).not.toContain('019a0180-1234-7000-8000-000000000002')
 })

+it('keeps Recent slots and numbered shortcuts stable across clicks, switching back and streamed updates', async () => {
+  width(true); at('/sessions')
+  const rows = Array.from({ length: 6 }, (_, n) => summary(`019a0180-1234-7000-8000-${String(n).padStart(12, '0')}`, { title: `Visit ${n}` }))
+  const ids = rows.map(row => row.session_id)
+  localStorage.setItem('hennery.visitedSessions', JSON.stringify(ids))
+  const s = server({ list: () => page(rows) })
+  render(<App fetchImpl={s.fetch} />)
+  const recent = await screen.findByRole('region', { name: 'Recent sessions' })
+  const links = () => within(recent).getAllByRole('link')
+  const order = () => links().map(link => link.getAttribute('href'))
+  await waitFor(() => expect(links()).toHaveLength(6))
+  const before = order(), hints = links().map(link => link.querySelector('kbd')?.textContent)
+  await userEvent.click(links()[2])
+  await waitFor(() => expect(location.pathname).toBe(`/sessions/${ids[2]}`))
+  expect(order()).toEqual(before)
+  expect(links()[2]).toHaveAttribute('aria-current', 'page')
+  expect(links().map(link => link.querySelector('kbd')?.textContent)).toEqual(hints)
+  await userEvent.keyboard('{Alt>}2{/Alt}')
+  await waitFor(() => expect(location.pathname).toBe(`/sessions/${ids[1]}`))
+  await userEvent.keyboard('{Alt>}2{/Alt}')
+  expect(location.pathname).toBe(`/sessions/${ids[1]}`)
+  await userEvent.keyboard('`')
+  await waitFor(() => expect(location.pathname).toBe(`/sessions/${ids[2]}`))
+  act(() => s.streams[0].event('session_upsert', { ...rows[4], title: 'Renamed visit', activity: 'running', last_event_at: '2099-01-01T00:00:00Z' }, 'e1:2'))
+  await waitFor(() => expect(links()[4]).toHaveTextContent('Renamed visit'))
+  expect(order()).toEqual(before)
+  expect(links().map(link => link.querySelector('kbd')?.textContent)).toEqual(hints)
+})
+
 it('does not repeat history id lookups for search keystrokes or hat switches', async () => {
   width(true); at('/sessions')
   const id = '019a0180-1234-7000-8000-000000000001'
diff --git a/web/src/components/SessionScope.tsx b/web/src/components/SessionScope.tsx
index 40532241..62273414 100644
--- a/web/src/components/SessionScope.tsx
+++ b/web/src/components/SessionScope.tsx
@@ -245,7 +245,7 @@ export default function SessionScope({ route, children, onReconnect }: { route:
     }),
     [list, recentSessions, visibleWaiting, attentionRows, isAttentionDismissed, reportAttentionKey, hats, hat, chooseHat, hostNames, hosts, host, status, group, setGroup, subgroup, setSubgroup, sort, setSort, hideClosed, setHideClosed, lifecycle, query, selectedId],
   )
-  const targets = recentSessionTargets(recentSessions, selectedId)
+  const targets = recentSessionTargets(recentSessions)
   return <ScopeContext.Provider value={value}>
     <SessionJumpAction id="previous-session" target={recentSessions.find(row => row.session_id === previousSessionId)} />
     {([1, 2, 3, 4, 5] as const).map((n) => <SessionJumpAction key={n} id={`recent-session-${n}`} target={targets[n - 1]} />)}
diff --git a/web/src/hooks/useSessionHistory.test.tsx b/web/src/hooks/useSessionHistory.test.tsx
index 32fe73ff..244eeec0 100644
--- a/web/src/hooks/useSessionHistory.test.tsx
+++ b/web/src/hooks/useSessionHistory.test.tsx
@@ -108,7 +108,7 @@ it('records route visits once and ignores summary/activity updates and hat chang
   view.rerender({ loaded, selectedId: null, hat: '' })
   expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000001'])
   view.rerender({ loaded, selectedId: '019a0180-1234-7000-8000-000000000001', hat: '' })
-  await waitFor(() => expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000001', '019a0180-1234-7000-8000-000000000002']))
+  await waitFor(() => expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000001']))
   expect(fetchImpl).not.toHaveBeenCalled()
 })
 it('records direct links only after an authorized exact-id read; cancels stale reads on unmount', async () => {
@@ -232,16 +232,34 @@ it('keeps an in-flight lookup alive across a hat switch', async () => {
   await act(async () => finish(page([row(id, 'work')])))
   await waitFor(() => expect(view.result.current).toHaveLength(1))
 })
-it('does not restart pending reads when another visit only reorders shared history', async () => {
+it('does not restart pending reads when another window changes shared history order', async () => {
   const a = '019a0180-1234-7000-8000-000000000001', b = '019a0180-1234-7000-8000-000000000002'
   visitSession(a); visitSession(b)
   const finish: ((response: Response) => void)[] = []
   const signals: (AbortSignal | null | undefined)[] = []
   const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => { signals.push(init?.signal); return new Promise<Response>(resolve => finish.push(resolve)) })
   const view = setup(fetchImpl)
-  act(() => visitSession(a))
+  act(() => {
+    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify([a, b]))
+    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_HISTORY_KEY }))
+  })
   expect(fetchImpl).toHaveBeenCalledTimes(2)
   expect(signals.every(signal => !signal?.aborted)).toBe(true)
   await act(async () => { for (const resolve of finish) resolve(page([row(a), row(b)])) })
   await waitFor(() => expect(view.result.current.map(row => row.session_id)).toEqual([a, b]))
 })
+
+it('preserves visible slots after hat filtering, and promotes visits outside the six visible rows', async () => {
+  const work = Array.from({ length: 7 }, (_, n) => row(`019a0180-1234-7000-8000-${String(n).padStart(12, '0')}`, 'work'))
+  const home = Array.from({ length: 7 }, (_, n) => row(`019a0180-1234-7000-9000-${String(n).padStart(12, '0')}`, 'home'))
+  const all = [...home, ...work], loaded = new Map(all.map(row => [row.session_id, row]))
+  localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(all.map(row => row.session_id)))
+  const fetchImpl = vi.fn(async () => page([])), view = setup(fetchImpl, loaded)
+  view.rerender({ loaded, selectedId: work[4].session_id, hat: 'work' })
+  await waitFor(() => expect(JSON.parse(sessionStorage.getItem('hennery.windowSessions')!)[0]).toBe(work[4].session_id))
+  expect(view.result.current).toEqual(work)
+  expect(JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(all.map(row => row.session_id))
+  view.rerender({ loaded, selectedId: work[6].session_id, hat: 'work' })
+  await waitFor(() => expect(view.result.current).toEqual([work[6], ...work.slice(0, 6)]))
+  expect(fetchImpl).not.toHaveBeenCalled()
+})
diff --git a/web/src/hooks/useSessionHistory.ts b/web/src/hooks/useSessionHistory.ts
index d3b501a0..35ec0b45 100644
--- a/web/src/hooks/useSessionHistory.ts
+++ b/web/src/hooks/useSessionHistory.ts
@@ -3,7 +3,7 @@ import { useClient } from '../app-client'
 import { summaries } from '../api/view'
 import { ApiFailure } from '../api/errors'
 import type { SessionSummary } from '../generated/view'
-import { forgetVisitedSession, useVisitedSessionIds, visitSession, visitedSessions } from '../lib/sessionHistory'
+import { forgetVisitedSession, RECENT_SESSION_LIMIT, useVisitedSessionIds, visitSession, visitedSessions } from '../lib/sessionHistory'

 function retryDelay(ms: number, signal: AbortSignal): Promise<void> {
   return new Promise(resolve => {
@@ -37,7 +37,7 @@ export function useSessionHistory(loaded: ReadonlyMap<string, SessionSummary>, s
   cached.current = resolved
   const wanted = [...new Set([...ids, ...(selectedId ? [selectedId] : [])])].sort()
   const heldCandidates = useRef(wanted)
-  // Only membership changes restart reads. MRU reordering from another
+  // Only membership changes restart reads. Shared reordering from another
   // window, or leaving an already visited session, keeps pending reads alive.
   if (wanted.length !== heldCandidates.current.length || wanted.some((id, index) => id !== heldCandidates.current[index])) heldCandidates.current = wanted
   const candidates = heldCandidates.current
@@ -138,14 +138,15 @@ export function useSessionHistory(loaded: ReadonlyMap<string, SessionSummary>, s
     }
     return merged
   }, [loaded, resolved])
+  const recent = useMemo(() => visitedSessions(ids, rows, hat), [ids, rows, hat])
   const visitedRoute = useRef<string | null>(null)
   const selected = selectedId ? rows.get(selectedId) : undefined
   useEffect(() => {
     if (!selectedId) { visitedRoute.current = null; return }
     if (selected && visitedRoute.current !== selectedId) {
       visitedRoute.current = selectedId
-      visitSession(selectedId)
+      visitSession(selectedId, recent.slice(0, RECENT_SESSION_LIMIT).map(row => row.session_id))
     }
-  }, [selectedId, selected])
-  return useMemo(() => visitedSessions(ids, rows, hat), [ids, rows, hat])
+  }, [selectedId, selected, recent])
+  return recent
 }
diff --git a/web/src/lib/sessionHistory.test.ts b/web/src/lib/sessionHistory.test.ts
index ff4296cc..9fed80bc 100644
--- a/web/src/lib/sessionHistory.test.ts
+++ b/web/src/lib/sessionHistory.test.ts
@@ -46,8 +46,8 @@ it('filters Recent by the selected hat before bounding shortcut targets, ignorin
   rows.set('old-visit', { ...row('old-visit'), last_event_at: '2099-01-01' })
   expect(visitedSessions(ids, rows, '019a0180-1234-7000-8000-000000000001').slice(0, 2).map(s => s.session_id)).toEqual(['newest-visit', 'old-visit'])
   expect(visitedSessions(ids, rows).map(s => s.session_id)).toContain('019a0180-1234-7000-8000-000000000009')
-  const targets = recentSessionTargets(visitedSessions(ids, rows, '019a0180-1234-7000-8000-000000000001'), 'newest-visit')
-  expect(targets.map(s => s.session_id)).toEqual(['old-visit', 'a0', 'a1', 'a2', 'a3'])
+  const targets = recentSessionTargets(visitedSessions(ids, rows, '019a0180-1234-7000-8000-000000000001'))
+  expect(targets.map(s => s.session_id)).toEqual(['newest-visit', 'old-visit', 'a0', 'a1', 'a2'])
   expect(ids).toContain('unknown') // a page/filter miss is never deletion
 })
 it('keeps in-memory history usable when localStorage is unavailable', () => {
@@ -57,10 +57,20 @@ it('keeps in-memory history usable when localStorage is unavailable', () => {
   vi.restoreAllMocks(); visitSession('019a0180-1234-7000-8000-000000000011')
   expect(parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(['019a0180-1234-7000-8000-000000000011', '019a0180-1234-7000-8000-000000000010'])
 })
-it('pins this window’s current session ahead of visits from other windows, with five numbered alternatives', () => {
+it('keeps visible visits in their slots while recording this window’s previous session', () => {
+  const ids = Array.from({ length: 7 }, (_, n) => `019a0180-1234-7000-8000-${String(n).padStart(12, '0')}`)
+  for (const id of ids.slice(0, 6).reverse()) visitSession(id)
+  visitSession(ids[2]); visitSession(ids[5]); visitSession(ids[0])
+  expect(parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(ids.slice(0, 6))
+  expect(JSON.parse(sessionStorage.getItem('hennery.windowSessions')!)).toEqual([ids[0], ids[5]])
+  visitSession(ids[6])
+  expect(parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual([ids[6], ...ids.slice(0, 6)])
+  // The evicted row is still in stored history, but opening it adds it back on top.
+  visitSession(ids[5])
+  expect(parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual([ids[5], ids[6], ...ids.slice(0, 5)])
+})
+it('keeps the numbered targets aligned with the first five visible slots, including the current session', () => {
   const rows = Array.from({ length: 8 }, (_, n) => row(String(n)))
-  expect(sidebarSessions(rows, '7').map(row => row.session_id)).toEqual(['7', '0', '1', '2', '3', '4'])
-  expect(recentSessionTargets(sidebarSessions(rows, '7'), '7').map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4'])
-  expect(sidebarSessions(rows, null).map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4', '5'])
-  expect(sidebarSessions(rows, 'outside-hat').map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4', '5'])
+  expect(sidebarSessions(rows).map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4', '5'])
+  expect(recentSessionTargets(sidebarSessions(rows)).map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4'])
 })
diff --git a/web/src/lib/sessionHistory.ts b/web/src/lib/sessionHistory.ts
index 2986d843..4c84a510 100644
--- a/web/src/lib/sessionHistory.ts
+++ b/web/src/lib/sessionHistory.ts
@@ -26,14 +26,19 @@ function write(ids: readonly string[]) {
   try { localStorage.setItem(SESSION_HISTORY_KEY, text); volatile = undefined } catch { volatile = text }
   notify()
 }
-export function visitSession(id: string) {
+/** Revisiting a visible slot records Back without moving Recent. The caller
+ * supplies the visible ids after hat filtering and authorized hydration. */
+export function visitSession(id: string, visibleIds?: readonly string[]) {
   const held = parseSessionHistory(windowSnapshot())
   if (held[0] !== id) {
     const text = JSON.stringify(parseSessionHistory(JSON.stringify([id, ...held.filter(other => other !== id)])).slice(0, 2))
     try { sessionStorage.setItem(WINDOW_SESSION_KEY, text); windowVolatile = undefined } catch { windowVolatile = text }
     notify()
   }
-  write(parseSessionHistory(JSON.stringify([id, ...parseSessionHistory(snapshot()).filter(held => held !== id)])))
+  const ids = parseSessionHistory(snapshot())
+  if (!(visibleIds ?? ids.slice(0, RECENT_SESSION_LIMIT)).includes(id)) {
+    write(parseSessionHistory(JSON.stringify([id, ...ids.filter(held => held !== id)])))
+  }
 }
 export function forgetVisitedSession(id: string) { write(parseSessionHistory(snapshot()).filter(held => held !== id)) }
 export function clearSessionHistory() {
@@ -63,12 +68,10 @@ export function visitedSessions(ids: readonly string[], rows: ReadonlyMap<string
     return row && (!hat || row.hat_id === hat) ? [row] : []
   })
 }
-export function recentSessionTargets(rows: readonly SessionSummary[], selectedId: string | null) {
-  return rows.filter(row => row.session_id !== selectedId).slice(0, 5)
+export function recentSessionTargets(rows: readonly SessionSummary[]) {
+  return rows.slice(0, 5)
 }
-/** Each window keeps its current session first even when another window
- * changes the browser's shared visit order. */
-export function sidebarSessions(rows: readonly SessionSummary[], selectedId: string | null) {
-  const current = rows.find(row => row.session_id === selectedId)
-  return current ? [current, ...recentSessionTargets(rows, selectedId)] : rows.slice(0, RECENT_SESSION_LIMIT)
+/** Selection and summary updates change the row, never its position. */
+export function sidebarSessions(rows: readonly SessionSummary[]) {
+  return rows.slice(0, RECENT_SESSION_LIMIT)
 }
```

Run inside the dev shell, with package-manager configuration and Cargo home under this worktree's gitignored scratch directory:

```sh
pnpm --dir web install --frozen-lockfile
pnpm --dir web test src/lib/sessionHistory.test.ts src/hooks/useSessionHistory.test.tsx src/components/SessionList.test.tsx
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web build
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo clippy -p hennery --locked -- -D warnings
cargo run -p hennery-proto --bin gen --locked -- --check
cargo run -p hennery-view --bin gen-view --locked -- --check
cargo build -p hennery -p hennery-testkit --bins --locked
CI=1 pnpm --dir web exec playwright test session-switching.spec.ts --project chromium
cargo test --workspace --locked
```

RED-first regressions: the old implementation must fail the visible-revisit and hat-scope tests, and the app-level click/shortcut regression. In one scratch copy, remove each of the visible-revisit guard, scoped membership, fixed numbering and activity-independent ordering; its corresponding test must fail. Never run mutations in the implementation worktree.

Fresh replay: extract the nonempty diff block above, apply it to a fresh archive of the base, copy this execution document as metadata, and compare every tracked file with the implementation tree. Clone target/ into the copy before building; do not share CARGO_TARGET_DIR. Run typecheck and the 100 targeted frontend tests in that replay. Full Rust verification is paid once in the implementation tree; no Rust source is changed. Keep copies for parent cleanup.

## After this plan

Request independent review of the single commit, including the four guard regressions and desktop/mobile, light/dark, cross-window browser acceptance. The parent owns GitHub actions, PR creation, merge and any later deployment. No timing/concurrency code changed, so skip 4×3 load runs.

Generated with Claude AI — please review before distribution.
