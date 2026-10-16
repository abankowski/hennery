# OAuth denial popup closure (flake 18)

## Execution status

Built on main `10abd28f`, branch `fix/flake-oauth-denial`. Local verification
is complete, with controlled RED/GREEN, three copy challenges, loaded runs
and a fresh replay. Independent review and Linux/macOS CI remain parent-owned.

## Scope and root cause

CI run 38854889980 failed Chromium's denial test at 1280 px while performing
the Close click. The denial text, script count, gateway report, working grant
and preserved mounts had already passed. The callback's failure page closes
only in its Close listener; its one-second auto-close belongs to success.

The test awaited acknowledgment of a click whose handler destroys its own
page. Chromium can report that destruction before Playwright completes its
pointer action, yielding `locator.click: Target page, context or browser has
been closed`. This is a test/driver ordering race. A minimal self-closing
popup reproduced the same failure (1/40 clicks); a controlled acknowledgment
barrier reproduced it in the real collector callback at both viewport widths.
The browser event ordering is not inherently macOS-specific, although the
reported CI failure and local reproduction were on macOS.

## Decisions and constraints

- Register a positive popup close-event wait before clicking its real Close
  button, then require both the event and completion of the click operation.
- Accept only that click's specific target-closure error. Other click errors
  still fail. No retries, sleeps, extra deadlines or product changes.
- Read the working grant and preserved mounts afterward through the main
  page's request context. Closing the entire context/browser still fails.
- Keep all existing exact locators, escaped denial text, script-count, CSP
  and gateway-report checks. Retain real browser input and the real callback.

## Review focus

Check the close-event registration and the narrow driver-error predicate.
The error alone cannot pass the test: the popup must close and the main
context must remain usable for the original state-preservation assertions.

## File structure

- `web/e2e/mcp-oauth.spec.ts`: synchronization and preserved assertions.
- `docs/README.md`: record index.
- This execution record; diagnostic instrumentation stays in the ledger.

## Task 1: reproduce, synchronize and verify

- [x] Original real OAuth subset: 12 repetitions, four workers and four nice
  CPU competitors; 72 passed (24 denial executions), exit 0. No spontaneous
  reproduction in those real-flow runs.
- [x] Deterministic RED before the fix: 2 failed / 4 passed, exit 1, both
  1280 and 390 px. GREEN with the same seam: 6 passed, exit 0.
- [x] Final loaded subset, same 12 repetitions / four workers / four CPU
  competitors: 72 passed (24 denial executions), exit 0.
- [x] Frozen install, typecheck and build: exit 0. Vitest: 1862 tests in
  111 files passed, exit 0. Embedded UI binary and fake-agent build: exit 0.
- [x] Full `CI=1 pnpm --dir web e2e`: 98 passed / 11 existing skips, exit 0,
  including all 28 OAuth cases. Its PWA binary preparation also exited 0.
- [x] APFS-cloned probe copy: original click plus acknowledgment barrier
  failed at both widths (2 failed / 4 passed, exit 1); restored fix with the
  same barrier passed (6 passed, exit 0). An unrelated non-recoverable
  pointer error failed immediately at the click (2 failed / 4 passed,
  exit 1). Whole-context closure failed at the subsequent API reads
  (2 failed / 4 passed, exit 1). Restored driver and source bytes match;
  the ordinary restored copy passed (6 passed, exit 0).
- [x] Fresh replay: one extracted diff block, two patched files, 892 tracked
  files plus this metadata record match byte for byte. The replay's own
  embedded binary/fake-agent build exited 0; browser subset: 6 passed,
  exit 0. Both copies have independent APFS-cloned targets.
- [x] `cargo fmt --all --check`, both required clippy commands and both
  generator checks: exit 0; no generated diff.

The first unrelated-error challenge used a generic driver error, which
Playwright internally retried until the existing test deadline. That receipt
is discarded; the recorded probe uses `NonRecoverableDOMError` and fails
immediately. No diagnostic error or barrier is committed.

The full Rust workspace test suite is outside this web-only change: Rust
source, fixtures and the embedded UI are unchanged. Nix is untouched, so no
flake check. Linux verification remains the parent's CI check.

The diagnostic seam is installed only in a copied inode of Playwright's
untracked bundle. Immediately after its existing
`await action(progress3, point)`, it holds only callback-page clicks until
that page's actual native closure aborts the action's existing scope:

```js
if (actionName === "click" && this._page.mainFrame().url().endsWith("/api/mcp/oauth/callback"))
  await progress3.race(this._page.openScope.race(new Promise(() => {})));
```

It generates no closure or error itself. The real callback handler still
calls native `window.close()`; the barrier forces closure before the click
acknowledgment. Driver bytes are restored and compared before ordinary gates.
Diagnostic scripts and raw receipts are in `.superpowers/sdd/flake-18/`.

Targeted command (three serial cases at each width, preserving prerequisites):

```sh
CI=1 pnpm --dir web exec playwright test e2e/mcp-oauth.spec.ts --project=chromium --grep 'creates DCR|mounts the OAuth|denial is inert'
```

All build/test commands run through `nix develop -c`. Loaded verification
adds `--repeat-each=12 --workers=4` with four nice CPU competitors whose
recorded PIDs are killed on exit. Full acceptance uses
`CI=1 pnpm --dir web e2e`, including its embedded PWA binary preparation.

### Exact replay patch

Extract this diff block onto base `10abd28f`; apply with `git apply`.
Copy only this final execution record separately. The extracted file count
must be positive and the complete tracked tree must match.

```diff
diff --git a/docs/README.md b/docs/README.md
index 3aef91f9..74aed34d 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -31,6 +31,7 @@ slice); everything else is design. The maintainer's decisions are recorded below
    - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
      and its [harness](../spikes/2026-09-25-mcp-per-session/).
 4. Plans:
+   - [OAuth denial popup closure (flake 18)](plans/2026-11-04-flake-oauth-denial.md) — requires the popup's close event while accepting its self-closing click's target-closure acknowledgment; retains denial, grant and mount assertions. Controlled regression, copy probes, load and web verification are recorded; independent review and CI remain parent-owned.
    - [List-stream and MCP timing (flakes 13–14)](plans/2026-11-02-flake-list-stream.md) — paused-clock deletion checks and an awaited OAuth popup cleanup assertion, with controlled regressions, guard probes, load and replay evidence. Independent review and Linux/macOS CI remain parent-owned.
    - [Proxy fixture port lifetimes (flake 15)](plans/2026-11-03-flake-proxy-ports.md) — leases stable proxy ports across pauses and test processes outside the kernel ephemeral ranges; deterministic contention regressions, copy probes, load and replay evidence recorded. Parent review and Linux/macOS CI remain pending.
    - [Walking skeleton](plans/2026-09-26-walking-skeleton.md) — the first
diff --git a/web/e2e/mcp-oauth.spec.ts b/web/e2e/mcp-oauth.spec.ts
index 7228dfa0..aeb0bbbe 100644
--- a/web/e2e/mcp-oauth.spec.ts
+++ b/web/e2e/mcp-oauth.spec.ts
@@ -86,9 +86,15 @@ for (const width of [1280, 390]) test.describe(`OAuth at ${width} px`, () => {
     await expect(p.getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
     expect(await p.evaluate(() => document.querySelectorAll('script').length)).toBe(1)
     await expect(card().getByRole('region', { name: 'Gateway report', exact: true }).getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
+    // The handler closes its own page before Chromium may acknowledge the click.
+    // Require that close event, and preserve failures unrelated to target closure.
+    const closed = p.waitForEvent('close')
+    await Promise.all([closed, p.getByRole('button', { name: 'Close', exact: true }).click().catch((error: unknown) => {
+      if (!(error instanceof Error) || !error.message.startsWith('locator.click: Target page, context or browser has been closed')) throw error
+    })])
     expect((await listed()).status).toBe('ok'); expect((await listed()).has_credential).toBe(true)
     expect((await listed()).mounts).toEqual([mountedHost])
-    await p.getByRole('button', { name: 'Close', exact: true }).click(); vendor.config.deny = false
+    vendor.config.deny = false
   })
   test('COOP severs the handle without ending consent', async () => {
     vendor.config.coop = true; const p = await popup()
```

## After this plan

The parent owns independent review, PR creation, checks, reviewDecision,
mergeStateStatus and unresolved review threads. This lane makes no GitHub
request. The retained probe/replay copies are listed in the report for parent
cleanup. This change does not alter the gateway callback or the OAuth flow.

Generated with Claude AI — please review before distribution.
