# Commands and keyboard shortcuts (UI R6) Implementation Plan

- **Date:** 2026-10-21
- **Branch:** `plan/ui-r6`, integrating through `redesign` only.
- **Base:** `fbe7d974798217c8dc2632d9b1285ce00ac57867` (reviewed R1/R2 foundation).
- **Contract:** [UI redesign](../specs/2026-10-20-ui-redesign-design.md) §§5.5, 8–10; R1/R2's After this plan.
- **Method:** built first, exact final source embedded below, then a fresh replay from the base. Code blocks are authoritative. Independent review and PR/CI actions belong to the fleet parent.

## Execution status (2026-10-20)

Built on branch `plan/ui-r6`; Task 1 pushed as `aeb77a46`, Task 2 as `8115364b`. Task 3 records the final guarded implementation and evidence. Independent review and Linux/macOS PR CI remain with the parent; no approval is claimed here.

| Check | Observed result |
|---|---|
| Frozen web install | Exit 0; lockfile unchanged |
| Baseline → final web tests | Exit 0; 2,155 → 2,208 tests; 120 → 124 files |
| Task checks | Exit 0; Task 1 44 tests, Task 2 9 tests, Task 3 typecheck |
| Final typecheck / build | Exit 0 each; 3 emitted-CSS guard tests and 3 same-origin CSS assets |
| Embedded hennery/testkit build | Exit 0, locked dependencies |
| Owned browser suite | Exit 0, 4/4 width/theme cases; all 4 also pass in final full suite |
| Full e2e | Exit 0; 111 passed, 11 pre-existing skipped; 4.5 minutes; one full run |
| Fresh replay | One copy; 11 nonempty extracted blocks; 1,044 source files match exactly |
| Removal probes | 41/41 detected by assertion failures in one cloned guard copy |
| Async search load | 4 processes × 3 rounds, 12/12 exit 0; 3 selected tests/run, 36 executions |
| Visual acceptance | 12 screenshots inspected: palette loaded/search and help × 390×844/1280×900 × light/dark |

The first whole-web run passed all 2,206 assertions but exited 1 with unhandled errors because existing jsdom app fixtures do not always provide matchMedia. The dispatcher now follows the shared optional-media contract and has a regression; the final replay passes 2,208 with no unhandled errors. Browser test development first exposed lazy-host readiness and an ambiguous theme-status locator; the final suite retains precise focus/query/typing assertions. No existing assertion or type was weakened.

The one fresh replay applied each task from this plan. During the probe audit three negative hint assertions were strengthened after initial extraction; its first final comparison correctly failed on that test file. The final block was re-extracted from the updated plan, its 44 tests rerun, and all 1,044 source files then matched. There was no second fresh replay. One initial listener-cleanup mutation was invalid syntax and was not counted; a valid no-op mutation was rerun and detected. Every classifier outcome has a positive assertion and an independent removal probe.

Visual files are `palette-loaded-{390,1280}-{light,dark}.png`, `palette-search-{390,1280}-{light,dark}.png`, and `shortcut-help-{390,1280}-{light,dark}.png` under the gitignored ledger's `screenshots/`. The matrix/reference/deviation notes are in `.superpowers/sdd/ui-r6/visual-acceptance.md`. Reference: Desktop paletteOpen; Design System input/keycaps; help has no dedicated frame. Intentional differences are hat-derived accent, provider/real-summary content, safe-area mobile layout, 44/48 px targets, no direct launch/answer and no fake device chrome. Width captures use Desktop Chrome's fine pointer; installed-iOS acceptance remains parent-owned.

No ownership exceptions, other-lane edits, dependency/hash changes, design-bundle assets, README index edit, GitHub action or shared-memory write. Backend-only full Rust/clippy/generator gates were not repeated for this frontend-only lane (spec §9.1). Contextual R3–R5 live integration awaits those providers. Scratch copies `.superpowers/sdd/ui-r6/probe-1` and `replay-1` retain private APFS-cloned targets for parent cleanup per AGENTS.md.

### PR #209 amendment (2026-10-20)

The independent review of `fbe7d974..55ee77e8` returned APPROVE AFTER AMENDMENTS. All four P2 findings are addressed in this delta; parent scoped re-confirmation and current PR CI remain pending. The original replay/check matrix above is historical evidence for `55ee77e8`; the code blocks below now reflect the amended implementation. No new full replay or full e2e run is claimed for the amendment, per the parent's verification budget.

1. **Authentication lifetime:** the real App retains CommandHost while navigating to sign-in. The host now unmounts stateful controls on Login/Setup and keys their lifetime to the existing session capability. Cached results, query and pending reads disappear, modal inertness is released, and old overlays cannot revive on the next sign-in. Real-App regressions cover confirmed cross-tab logout and search-triggered 401; retained-provider cases cover auth routes before cleanup and capability loss/return.
2. **Summary freshness:** cached search rows replace shared summaries only when strictly newer by `last_event_at`, matching the shared list reducer's page/stream rule. Shared stream state wins ties. Real reducer upserts cover completed and delayed search responses after reassignment, ties and newer HTTP summaries; hat filtering runs after reconciliation.
3. **Server matches:** current-query server membership is preserved independently of abbreviated display fields. Local substring matching remains for loaded-only rows, and current freshness/hat checks still apply. The regression follows SessionItem::bounded's 128-byte cwd tail rule and retains a match on an omitted stored prefix.
4. **IME Escape:** the dialog skips its modal trap for isComposing/keyCode 229, allowing native composition cancellation without closing the query. Enter and ordinary topmost Escape retain their existing tests; both IME Escape forms also run in the browser matrix.

Observed RED before implementation: 8 intended failures / 9 existing passes, exit 1. Amendment checks completed on the staged source bytes:

| Amendment check | Observed result |
|---|---|
| Focused command/shortcut suites | Exit 0; 64 tests, 4 files |
| Fresh copy before mutation | Exit 0; 20 component tests |
| New guard probes | 9/9 detected by assertion failures; source restored exactly |
| Web typecheck | Exit 0 |
| Complete web tests | Exit 0; 2,219 tests, 124 files (2,208 before amendment) |
| Web build | Exit 0; 3 CSS guard tests, 3 same-origin CSS assets |
| Embedded hennery/testkit build | Exit 0; locked dependencies |
| Owned commands browser spec | Exit 0; 4/4 width/theme cases, 28.3 seconds |
| Staged/source/plan check | Seven changed files match the tested bytes; all 11 source blocks match |

The nine probes independently remove the auth-route lifetime, capability lifetime, newer-stream preference, tie preference, newer-HTTP preference, server membership, local-match bypass, composing Escape and keyCode-229 protections. New screenshots retain the same 12 frame names under `amendment-1/screenshots/`; no CSS or presentation change is introduced. No full replay, full e2e suite, Rust workspace gates or additional load run was repeated under the explicit amendment budget. The new response-order cases use explicit deferred completion rather than new timing thresholds.

 The unchanged fresh guard copy passes 20 component cases. The owned browser matrix adds real App cross-tab logout, password sign-in without cache revival, search 401, bounded prefix matching and both IME Escape forms at 390/1280 px in both themes. Source ownership, dependencies, wire/API contracts and CSS are unchanged. No old assertion is weakened.

Amendment evidence: `.superpowers/sdd/ui-r6/amendment-1/`. Fresh guard copy: `amendment-1/probe-1`, with a private APFS-cloned target. Parent retains cleanup ownership. No new timing threshold or concurrency mechanism is introduced; the deferred-response regressions control completion order explicitly.

## Scope

Implement the App-mounted R6 entry point, Command palette and Keyboard shortcuts dialogs, global keyboard guard and command definitions. Read enabled handlers from R2's action registry and summaries from `useLoadedSessions()`. Use existing summary-search HTTP reads and the shared Client. No second store, list/item stream, transcript scan, new runtime dependency, wire change or screen mutation implementation.

The palette groups Needs you (real operator attention), Actions and Recent/Matching sessions. Empty-query results explicitly describe loaded summaries. Queries use the current registry hat context, 250 ms debounce, abort/generation fences and explicit cursor paging. Errors keep loaded matches and offer Retry. A result only executes on click or local Enter; arrows/Home/End select locally. Untrusted titles/paths remain text in bidi isolation.

## Decisions this plan makes where the spec is silent

1. Keep the gateway Jump to entry disabled, matching R2's session-search seam; gateway navigation remains in its existing rail/More. No session API request is introduced there.
2. Use provider labels verbatim. R3's higher-priority `new-session` is “New session in this project”; absent Details/composer/defaults/Add-host providers are never guessed. Hosts navigates through its registered provider; no pairing mutation is copied. Contextual launch opens the provider's reviewable form.
3. J/K list movement and desktop permission-card digits stay with their existing local owners (R2/R3). Mod+Enter and Escape stay local. The global dispatcher contains no answering, sending, starting or draft-clearing code.
4. Global shortcuts pause under every modal. Mod+K inside an existing palette leaves the query intact through the editing/modal guards. Palette input handlers retain arrows/Home/End/Enter/Escape. One global listener is cleaned up on route changes/unmount.
5. Restore the opener on dismiss, or focus a safe main heading if the opener disappeared. Execute a selected command on the next animation frame after dismiss, allowing shared modal inertness/focus cleanup to finish before the provider focuses/navigates.
6. Use the shared modal layer and media-query hook. Desktop theme announcements reuse the existing rail status; mobile has a polite host announcement. Unsupported matchMedia in a test/embedding environment falls back to mobile semantics.
7. Desktop geometry follows the local paletteOpen frame (620 px wide, 96 px top offset); narrow screens use safe-area padding and viewport-bounded scrolling. Use 44/48 px result/close targets rather than the prototype's 36 px options. Coarse pointers hide incidental keyboard hints and show an X close icon. Help has no dedicated prototype frame and uses the same surface/keycap primitives.

## Global Constraints

- Work only in this lane. Never edit App, registry, router, Shell, shared primitives, index/manage CSS, another lane's screens or existing browser files. No ownership exception is used.
- Use plain `nix develop -c`; no global tools, dependencies, asset fetch, CSP change or design-bundle import. Test collectors use the existing isolated spawn helper. Probe/replay copies have private APFS-cloned targets; no shared CARGO_TARGET_DIR.
- Do not mutate during typing: composed paths cover inputs, textarea, select, editable/ARIA descendants and shadow DOM. Reject prior preventDefault, repeat, composition and Alt. Use Meta on macOS and Ctrl elsewhere; do not capture reserved quick launch, Mod+Enter, digits or J/K globally.
- Exact text locators or named roles only. Preserve all existing tests. Run the new browser file before committing it and the full e2e suite once at final acceptance, per the parent brief's shared-load instruction.
- Final gates follow the frontend contract in spec §9.1: frozen install, typecheck/test/build, embedded hennery/testkit build and full browser suite. Backend-only full Rust/clippy/generator gates belong to R4; R6 changes no Rust/protocol/schema/dependencies. No lockfile/hash update is required unless a dependency unexpectedly changes.
- Commit per task with the repository gmail identity and Conventional Commits; signing disabled explicitly. Check staged bytes against the tested tree before every commit and Gmail authors before each SSH push. No GitHub action from this lane.
- One fresh replay and one cloned guard-family copy. Record every probe outcome, not a narrative claim. Repeat only timing/concurrency tests (search debounce, stale-response and retry) 4×3. Scratch copies/screenshots remain gitignored and are handed to the parent for cleanup.

## Review Focus

- Keystrokes in composer, New session, question controls, select/ARIA/contenteditable or shadow descendants must not dispatch a mutation or navigation. Guard tests include both platform modifiers and the exact global key map; existing card-focus digit tests remain unchanged.
- Current provider availability wins at execution time. No handler/data from an absent parallel lane is invented. R3–R5 integration acceptance is parent-owned after providers merge.
- Palette requests must remain hat-scoped, abort/fence query changes, expose partial pages and never create an SSE/controller. An ignored-abort late response must not erase newer matches.
- Named modal/combobox/listbox/option semantics, active descendant, focus containment and trigger restoration must hold at 390/1280 px in both themes. Key hints must match the current route, viewport and enabled provider.
- Parent reviews the full SHA range and checks Linux/macOS CI; no self-review approval is implied by local diff inspection.

## File structure

| File | Responsibility | Task |
|---|---|---|
| `lib/commands.ts`, `lib/commands.test.ts` | Registry command discovery, summary matching, exact key map and guards/hints | 1 |
| `hooks/useShortcuts.ts`, `hooks/useShortcuts.test.tsx` | One global listener, modal guard, shared appearance cycle, focus fallback | 1 |
| `components/CommandPalette.tsx`, its test | Search, selection, paging and modal/combobox semantics | 2 |
| `components/ShortcutHelp.tsx` | Route/provider-aware help dialog | 2 |
| `components/CommandHost.tsx`, its test | Replace R2's lazy placeholder; registry and loaded-map integration | 2 |
| `styles/commands.css` | Owned token-based responsive overlay styling | 2 |
| `web/e2e/commands.spec.ts` | Embedded shell actions, typing safety, one stream and visual matrix | 3 |

Paths in the table are relative to web/src except the browser file. No shared files or local design assets are written.

## Replay protocol

Create a fresh local clone at the base, then APFS-clone this lane's target and node_modules into it before any build. A replay harness extracts the exact Create/Replace blocks below; it must report a nonzero block count and apply tasks in order. Stage newly extracted files so the flake sees them. Record baseline and per-task targeted test counts. At the end run the web gates and compare every tracked source byte (excluding this execution record) to this lane. The embedded binary and full e2e commands are final acceptance gates on the lane after replay, so those integration builds are not duplicated in the replay copy.

Read the blocks as plan 3c does: “Create” writes the file plus its final newline; “Replace the whole” replaces the whole file. No hidden patch or copy from another lane is needed.

### Task 1: Command definitions and the guarded keyboard listener

**Files:** `web/src/lib/commands.ts`, `web/src/lib/commands.test.ts`, `web/src/hooks/useShortcuts.ts`, `web/src/hooks/useShortcuts.test.tsx`.

**Interfaces:** Consumes the stable AppActions types and exports command/shortcut helpers. No provider mutation logic.

**Failing and passing checks:** Observe the relevant guard removals fail in the isolated probe copy; the unchanged implementation must pass the following task command. No live worktree probe is used.

Run: `nix develop -c pnpm --dir web test src/lib/commands.test.ts src/hooks/useShortcuts.test.tsx`.

Create `web/src/lib/commands.ts` with:

```ts
import type { AppActionId, AppActions } from '../app-actions'
import type { SessionSummary } from '../generated/view'

export const COMMAND_ACTIONS: readonly AppActionId[] = [
  'new-session', 'search-sessions', 'open-needs-you', 'open-sessions',
  'open-hosts', 'open-mcp', 'open-hats', 'open-defaults', 'open-settings',
  'toggle-rail', 'toggle-details', 'focus-composer',
]
export function registeredCommands(actions: AppActions, desktop = true) {
  return COMMAND_ACTIONS.filter(id => desktop || id !== 'toggle-rail').flatMap(id => {
    const action = actions.get(id)
    return action?.enabled ? [{ id, label: action.label }] : []
  })
}
export function sessionMatches(session: SessionSummary, query: string) {
  const q = query.trim().toLocaleLowerCase()
  return [session.title, session.cwd, session.git_branch, session.session_id].some(value => value?.toLocaleLowerCase().includes(q))
}
export function recentSessions(rows: Iterable<SessionSummary>, query: string, hat?: string, serverMatches?: ReadonlySet<string>) {
  // The server searches full stored fields; bounded display summaries can
  // omit the matching prefix. Only loaded-only rows need local matching.
  return [...rows].filter(row => (!hat || row.hat_id === hat) && (serverMatches?.has(row.session_id) || sessionMatches(row, query)))
    .sort((a, b) => b.last_event_at.localeCompare(a.last_event_at) || a.session_id.localeCompare(b.session_id))
}
export const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="searchbox"]'
export function isEditing(event: KeyboardEvent) {
  return event.composedPath().some(node => node instanceof Element && !!node.closest(EDITABLE))
}
export function isMac() { return /Mac|iPhone|iPad/.test(navigator.platform) }
export const modLabel = () => isMac() ? '⌘' : 'Ctrl'
export function shortcutAction(event: KeyboardEvent, route: string, desktop: boolean): AppActionId | 'theme' | 'help' | null {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || isEditing(event)) return null
  const key = event.key.toLowerCase()
  const mod = isMac() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
  if (mod && !event.shiftKey && key === 'k') return 'open-commands'
  if (mod && event.shiftKey && key === 'l') return 'theme'
  if (event.metaKey || event.ctrlKey) return null
  if (event.key === '?') return 'help'
  if (event.shiftKey) return null
  if (key === 'n') return 'new-session'
  if (key === '[' && desktop) return 'toggle-rail'
  if (key === ']' && route === 'session') return 'toggle-details'
  if (key === 'r' && route === 'session') return 'focus-composer'
  if (key === '/' && ['sessions', 'needs-you'].includes(route)) return 'search-sessions'
  return null
}
/** Hints describe the global key only where that binding is active. */
export function commandHint(id: AppActionId, route: string, desktop: boolean): string {
  if (id === 'new-session') return 'N'
  if (id === 'search-sessions' && ['sessions', 'needs-you'].includes(route)) return '/'
  if (id === 'toggle-rail' && desktop) return '['
  if (id === 'toggle-details' && route === 'session') return ']'
  if (id === 'focus-composer' && route === 'session') return 'R'
  return ''
}
```

Create `web/src/lib/commands.test.ts` with:

```ts
import { afterEach, expect, it, vi } from 'vitest'
import { AppActions } from '../app-actions'
import { isEditing, recentSessions, registeredCommands, shortcutAction } from './commands'
import type { SessionSummary } from '../generated/view'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })
const event = (key: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key, cancelable: true, ...init })
function platform(mac = false) { vi.spyOn(navigator, 'platform', 'get').mockReturnValue(mac ? 'MacIntel' : 'Linux') }
it('lists only enabled registered commands and keeps the contextual provider label', () => {
  const actions = new AppActions()
  actions.register('new-session', { label: 'New session', enabled: true, run() {} }, -1)
  actions.register('new-session', { label: 'New session in this project', enabled: true, run() {} })
  actions.register('open-defaults', { label: 'Defaults', enabled: false, run() {} })
  expect(registeredCommands(actions)).toEqual([{ id: 'new-session', label: 'New session in this project' }])
})
it.each([false, true])('uses only the platform modifier (mac=%s)', mac => {
  platform(mac)
  expect(shortcutAction(event('k', { metaKey: mac, ctrlKey: !mac }), 'sessions', true)).toBe('open-commands')
  expect(shortcutAction(event('L', { metaKey: mac, ctrlKey: !mac, shiftKey: true }), 'sessions', true)).toBe('theme')
  expect(shortcutAction(event('k', { metaKey: !mac, ctrlKey: mac }), 'sessions', true)).toBeNull()
  expect(shortcutAction(event('k', { ctrlKey: true, metaKey: true }), 'sessions', true)).toBeNull()
})
it.each([
  ['n', 'hosts', false, 'new-session'], ['[', 'sessions', true, 'toggle-rail'], ['[', 'sessions', false, null],
  [']', 'session', false, 'toggle-details'], [']', 'sessions', true, null], ['r', 'session', true, 'focus-composer'],
  ['r', 'needs-you', true, null], ['/', 'sessions', true, 'search-sessions'], ['/', 'needs-you', false, 'search-sessions'],
  ['/', 'session', true, null], ['?', 'settings', false, 'help'], ['1', 'session', true, null], ['9', 'needs-you', true, null],
  ['j', 'sessions', true, null], ['k', 'needs-you', true, null], ['Enter', 'new', true, null], ['Escape', 'session', true, null],
  ['e', 'session', true, null],
] as const)('key %s on %s desktop=%s returns %s', (key, route, desktop, expected) => {
  platform(); expect(shortcutAction(event(key), route, desktop)).toBe(expected)
})
it.each([{ repeat: true }, { isComposing: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }])('ignores modified/repeated/composing N: %j', init => {
  platform(); expect(shortcutAction(event('n', init), 'sessions', true)).toBeNull()
})
it('ignores already handled events and reserved quick-launch/send bindings', () => {
  platform(); const prevented = event('n'); prevented.preventDefault()
  expect(shortcutAction(prevented, 'sessions', true)).toBeNull()
  expect(shortcutAction(event('Enter', { ctrlKey: true }), 'session', true)).toBeNull()
  expect(shortcutAction(event('N', { ctrlKey: true, shiftKey: true }), 'session', true)).toBeNull()
})
it.each(['input', 'textarea', 'select', '[contenteditable]', '[role="textbox"]', '[role="combobox"]', '[role="searchbox"]'])('blocks every shortcut inside %s, including descendant/composed paths', selector => {
  platform()
  const node = document.createElement(selector.startsWith('[') ? 'div' : selector)
  if (selector === '[contenteditable]') node.setAttribute('contenteditable', 'true')
  if (selector.startsWith('[role=')) node.setAttribute('role', selector.slice(7, -2))
  const span = document.createElement('span'); node.append(span); document.body.append(node)
  for (const key of ['n', '[', ']', '/', 'r', '?', '1', '9', 'k', 'L']) {
    const e = event(key, { ctrlKey: ['k', 'L'].includes(key), shiftKey: key === 'L' })
    vi.spyOn(e, 'composedPath').mockReturnValue([span, node, document.body, window])
    expect(isEditing(e)).toBe(true)
    expect(shortcutAction(e, 'session', true)).toBeNull()
  }
})
it('uses the shadow composed path even when the target is retargeted to the host', () => {
  const host = document.createElement('div'), input = document.createElement('input')
  host.attachShadow({ mode: 'open' }).append(input); document.body.append(host)
  host.addEventListener('keydown', e => { expect(e.target).toBe(host); expect(isEditing(e)).toBe(true) })
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', composed: true, bubbles: true }))
})
it('filters authorized summaries by scope and title/path/branch/id, with stable recent ordering', () => {
  const row = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, host_id: 'h', hat_id: 'hat', agent: 'claude', cwd: '/srv/demo', lifecycle: 'active', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0, ...patch })
  const rows = [row('b', { title: 'Parser' }), row('a', { git_branch: 'feature' }), row('c', { hat_id: 'other' }), row('d', { last_event_at: '2026-10-21' })]
  expect(recentSessions(rows, '', 'hat').map(r => r.session_id)).toEqual(['d', 'a', 'b'])
  for (const q of ['parser', 'DEMO', 'feature', 'b']) expect(recentSessions(rows, q, 'hat').length).toBeGreaterThan(0)
})
it('omits the desktop rail command from a mobile palette', () => {
  const actions = new AppActions()
  actions.register('toggle-rail', { label: 'Toggle navigation', enabled: true, run() {} })
  expect(registeredCommands(actions, false)).toEqual([])
  expect(registeredCommands(actions, true).map(action => action.id)).toEqual(['toggle-rail'])
})
it('shows key hints only on the routes and viewports that bind them', async () => {
  const { commandHint } = await import('./commands')
  expect(commandHint('new-session', 'hosts', false)).toBe('N')
  expect(commandHint('search-sessions', 'sessions', true)).toBe('/')
  expect(commandHint('search-sessions', 'session', true)).toBe('')
  expect(commandHint('toggle-rail', 'session', false)).toBe('')
  expect(commandHint('toggle-rail', 'session', true)).toBe('[')
  expect(commandHint('toggle-details', 'session', false)).toBe(']')
  expect(commandHint('toggle-details', 'sessions', true)).toBe('')
  expect(commandHint('focus-composer', 'session', true)).toBe('R')
  expect(commandHint('focus-composer', 'sessions', true)).toBe('')
  expect(commandHint('open-settings', 'sessions', true)).toBe('')
})
```

Create `web/src/hooks/useShortcuts.ts` with:

```ts
import { useEffect } from 'react'
import type { AppActions } from '../app-actions'
import { shortcutAction } from '../lib/commands'
import { cycleAppearance, getTheme } from '../lib/theme'

/** One listener, with screen providers retaining all capability/mutation checks. */
export function useShortcuts(actions: AppActions | null, route: string, help: () => void, announce: (text: string) => void) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]')) return
      const action = shortcutAction(event, route, window.matchMedia?.('(min-width: 768px)').matches ?? false)
      if (!action) return
      if (action === 'help') { event.preventDefault(); help() }
      else if (action === 'theme') { event.preventDefault(); cycleAppearance(); announce('Appearance: ' + getTheme().preference.replace(/^./, letter => letter.toUpperCase())) }
      else if (actions?.dispatch(action)) event.preventDefault()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [actions, route, help, announce])
}

/** The shared modal layer owns containment and inertness; remember the opener. */
export function restoreCommandFocus(before: HTMLElement | null) {
  if (before?.isConnected && before !== document.body) { before.focus(); return }
  const heading = document.querySelector<HTMLElement>('main h1, main h2')
  if (heading) { heading.tabIndex = -1; heading.focus() }
}
```

Create `web/src/hooks/useShortcuts.test.tsx` with:

```tsx
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppActions } from '../app-actions'
import { useShortcuts } from './useShortcuts'
import { getTheme, setAppearance } from '../lib/theme'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren() })
function Harness({ actions, route = 'sessions', help, announce }: { actions: AppActions; route?: string; help: () => void; announce: (text: string) => void }) { useShortcuts(actions, route, help, announce); return <button>Page focus</button> }
function setup() {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux')
  const actions = new AppActions(), run = vi.fn(), help = vi.fn(), announce = vi.fn()
  actions.register('new-session', { label: 'New session', enabled: true, run })
  return { actions, run, help, announce }
}
it('registers exactly once across rerenders and removes the listener at unmount', () => {
  const props = setup(), view = render(<Harness {...props} />)
  view.rerender(<Harness {...props} route="hosts" />)
  fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledTimes(1)
  view.unmount(); fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledTimes(1)
})
it('does not consume a key when the current provider is absent or disabled', () => {
  const props = setup(); props.actions.register('new-session', { label: 'Unavailable', enabled: false, run: props.run })
  render(<Harness {...props} />)
  const event = new KeyboardEvent('keydown', { key: 'n', cancelable: true }); window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false); expect(props.run).not.toHaveBeenCalled()
})
it('leaves every shortcut alone under a modal, including theme and help', () => {
  const props = setup(); render(<Harness {...props} />)
  const dialog = document.createElement('div'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); document.body.append(dialog)
  setAppearance('light')
  for (const key of ['n', '?', 'L']) fireEvent.keyDown(window, { key, ctrlKey: key === 'L', shiftKey: key === 'L' })
  expect(props.run).not.toHaveBeenCalled(); expect(props.help).not.toHaveBeenCalled(); expect(getTheme().preference).toBe('light')
})
it('cycles the shared theme and announces it, opens help, and respects prior preventDefault', () => {
  const props = setup(); render(<Harness {...props} />); setAppearance('system')
  fireEvent.keyDown(window, { key: 'L', ctrlKey: true, shiftKey: true })
  expect(getTheme().preference).toBe('light'); expect(props.announce).toHaveBeenCalledWith('Appearance: Light')
  fireEvent.keyDown(window, { key: '?' }); expect(props.help).toHaveBeenCalledOnce()
  const e = new KeyboardEvent('keydown', { key: 'n', cancelable: true }); e.preventDefault(); window.dispatchEvent(e)
  expect(props.run).not.toHaveBeenCalled()
})
it('keeps app typing usable when matchMedia is unavailable', () => {
  const props = setup(); vi.stubGlobal('matchMedia', undefined)
  render(<Harness {...props} />)
  fireEvent.keyDown(window, { key: 'n' }); expect(props.run).toHaveBeenCalledOnce()
  const rail = vi.fn(); props.actions.register('toggle-rail', { label: 'Navigation', enabled: true, run: rail })
  fireEvent.keyDown(window, { key: '[' }); expect(rail).not.toHaveBeenCalled()
})
```

**Verify and commit:** run the task command, inspect `git diff --cached` and its stat against the tested files, commit the task and push `git push origin plan/ui-r6`. Parent owns independent review.

### Task 2: Palette, shortcut help and the lazy command host

**Files:** `web/src/components/CommandPalette.tsx`, `web/src/components/CommandPalette.test.tsx`, `web/src/components/ShortcutHelp.tsx`, `web/src/components/CommandHost.tsx`, `web/src/components/CommandHost.test.tsx`, `web/src/styles/commands.css`.

**Interfaces:** Consumes useLoadedSessions, useActionSnapshot, useRegisterAction, summaries, Client, modal layer and semantic tokens.

**Failing and passing checks:** Observe the relevant guard removals fail in the isolated probe copy; the unchanged implementation must pass the following task command. No live worktree probe is used.

Run: `nix develop -c pnpm --dir web test src/components/CommandPalette.test.tsx src/components/CommandHost.test.tsx`.

Create `web/src/components/CommandPalette.tsx` with:

```tsx
import { useEffect, useId, useRef, useState } from 'react'
import type { AppActions } from '../app-actions'
import { useClient } from '../app-client'
import { summaries } from '../api/view'
import { messageOf } from '../api/errors'
import type { SessionSummary } from '../generated/view'
import { commandHint, recentSessions, registeredCommands } from '../lib/commands'
import { match, navigate, useLocation } from '../router'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { restoreCommandFocus } from '../hooks/useShortcuts'
import { Icon, Keycap, useModalLayer } from './ui'

interface SearchState { key: string; rows: SessionSummary[]; cursor?: string; loading: boolean; error?: string }
export default function CommandPalette({ actions, loaded, close }: {
  actions: AppActions; loaded: ReadonlyMap<string, SessionSummary>; close: () => void
}) {
  const { pathname } = useLocation()
  const desktop = useMediaQuery('(min-width: 768px)')
  const client = useClient(), dialog = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null)
  const { trap, holdFocus } = useModalLayer(dialog)
  const [query, setQuery] = useState(''), [selected, select] = useState(0), [attempt, retry] = useState(0)
  const hat = actions.context().hatId, q = query.trim(), key = JSON.stringify([hat, q])
  const generation = useRef(0), controller = useRef<AbortController | null>(null)
  const [search, setSearch] = useState<SearchState>({ key: '', rows: [], loading: false })
  const listId = useId()
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    input.current?.focus()
    return () => restoreCommandFocus(before)
  }, [])
  useEffect(() => {
    const current = ++generation.current
    const abort = new AbortController(); controller.current = abort
    if (!q) return () => abort.abort()
    setSearch({ key, rows: [], loading: true })
    const timer = setTimeout(() => {
      summaries(client, { q, hat, limit: 30 }, abort.signal).then(page => {
        if (!abort.signal.aborted && current === generation.current) setSearch({ key, rows: page.sessions, cursor: page.next_cursor, loading: false })
      }, error => {
        if (!abort.signal.aborted && current === generation.current) setSearch({ key, rows: [], loading: false, error: messageOf(error) })
      })
    }, 250)
    return () => { clearTimeout(timer); abort.abort() }
  }, [client, key, q, hat, attempt])
  const current = search.key === key ? search : undefined
  const more = () => {
    if (!current?.cursor || current.loading) return
    const epoch = generation.current, abort = controller.current!
    setSearch({ ...current, loading: true, error: undefined })
    summaries(client, { q, hat, limit: 30, cursor: current.cursor }, abort.signal).then(page => {
      if (!abort.signal.aborted && epoch === generation.current) setSearch({ key, rows: [...current.rows, ...page.sessions], cursor: page.next_cursor, loading: false })
    }, error => {
      if (!abort.signal.aborted && epoch === generation.current) setSearch({ ...current, loading: false, error: messageOf(error) })
    })
  }
  const merged = new Map(loaded)
  const serverMatches = new Set<string>()
  if (q) for (const row of current?.rows ?? []) {
    serverMatches.add(row.session_id)
    const held = merged.get(row.session_id)
    // Match the list store's page/stream reconciliation: a page must be
    // strictly newer; the shared stream wins ties (including a hat change).
    if (!held || row.last_event_at > held.last_event_at) merged.set(row.session_id, row)
  }
  const rows = recentSessions(merged.values(), q, hat, serverMatches)
  const run = (action: () => void) => { close(); requestAnimationFrame(action) }
  const sessionResult = (row: SessionSummary) => ({
    id: `session:${row.session_id}`, label: row.title || row.session_id,
    hint: '', detail: [row.cwd, row.git_branch].filter(Boolean).join(' · '),
    run: () => navigate(`/sessions/${encodeURIComponent(row.session_id)}`),
  })
  const groups = [
    { label: 'Needs you', results: rows.filter(row => row.operator_attention > 0).map(sessionResult) },
    { label: 'Actions', results: registeredCommands(actions, desktop).filter(action => action.label.toLocaleLowerCase().includes(q.toLocaleLowerCase())).map(action => ({ id: `action:${action.id}`, label: action.label, hint: commandHint(action.id, match(pathname).name, desktop), detail: '', run: () => { actions.dispatch(action.id) } })) },
    { label: q ? 'Matching sessions' : 'Recent sessions', results: rows.filter(row => row.operator_attention === 0).map(sessionResult) },
  ]
  const results = groups.flatMap(group => group.results)
  const active = Math.min(selected, results.length - 1)
  const activeId = results[active]?.id
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' }) }, [active, activeId, listId])
  const choose = (index: number) => { if (results[index]) run(results[index].run) }
  let offset = 0
  return <div className="command-overlay" onMouseDown={holdFocus}>
    <div className="command-dialog" ref={dialog} role="dialog" aria-modal="true" aria-label="Command palette" tabIndex={-1} onKeyDown={event => {
      // Let Escape cancel native IME composition without dismissing its draft.
      if (event.nativeEvent.isComposing || event.keyCode === 229) return
      trap(event, close)
    }}>
      <div className="command-search"><Icon name="magnifying-glass" size={20} />
        <input ref={input} role="combobox" aria-label="Jump to a session or command" placeholder="Jump to a session, or type a command…" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} value={query} onChange={event => { setQuery(event.target.value); select(0) }} onKeyDown={event => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key)) {
            event.preventDefault()
            if (event.key === 'Enter') choose(active)
            else if (event.key === 'Home') select(0)
            else if (event.key === 'End') select(Math.max(0, results.length - 1))
            else select(Math.max(0, Math.min(results.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))))
          }
        }} />
        <button type="button" className="command-close" aria-label="Close command palette" onClick={close}><Icon name="x-mark" size={18} /><Keycap>Esc</Keycap></button>
      </div>
      <div className="command-results" id={listId} role="listbox" aria-label="Sessions and actions">
        {groups.map(group => {
          const start = offset; offset += group.results.length
          return group.results.length > 0 && <div role="group" aria-label={group.label} key={group.label}><div className="command-group" aria-hidden="true">{group.label}</div>{group.results.map((result, index) => <div role="option" aria-label={[result.label, result.detail].filter(Boolean).join(" ")} id={`${listId}-${start + index}`} aria-selected={active === start + index} className="command-option" key={result.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(start + index)}>
            <Icon name={group.label === 'Actions' ? 'arrow-right' : group.label === 'Needs you' ? 'hand-raised' : 'chat-bubble-left-right'} size={18} />
            <span><bdi>{result.label}</bdi>{result.detail && <small><bdi>{result.detail}</bdi></small>}</span>{result.hint && <Keycap>{result.hint}</Keycap>}
          </div>)}</div>
        })}
      </div>
      {results.length === 0 && <p className="command-note">No matches in the sessions loaded so far.</p>}
      <p className="command-note" role="status">{q ? current?.loading || !current ? 'Searching sessions…' : current.error ? 'Search unavailable. Loaded matches are still shown.' : current.cursor ? 'More matching sessions are available.' : 'Session search complete.' : 'Showing loaded sessions. Type to search all sessions.'}</p>
      {q && current?.error && <p className="command-note" role="alert"><bdi>{current.error}</bdi><button type="button" className="btn btn-ghost" onClick={() => retry(n => n + 1)}>Retry search</button></p>}
      {q && current?.cursor && <button type="button" className="btn btn-ghost command-more" disabled={current.loading} onClick={more}>Load more matches</button>}
      <footer className="command-footer"><span><Keycap>↑</Keycap> <Keycap>↓</Keycap> to move</span><span><Keycap>Enter</Keycap> to open</span><span><Keycap>Esc</Keycap> to close</span></footer>
    </div>
  </div>
}
```

Create `web/src/components/CommandPalette.test.tsx` with:

```tsx
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AppActions } from '../app-actions'
import { ClientContext, browserClient } from '../app-client'
import type { SessionSummary } from '../generated/view'
import { json } from '../test-server'
import CommandPalette from './CommandPalette'
import ShortcutHelp from './ShortcutHelp'

const summary = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, title: id, host_id: 'h', hat_id: 'hat', agent: 'claude', cwd: '/srv/demo', lifecycle: 'active', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0, ...patch })
const page = (sessions: SessionSummary[], next_cursor?: string) => json(200, { sessions, next_cursor, epoch: 'e', revision: 1, waiting: 0 })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); history.replaceState(null, '', '/') })
function setup(fetchImpl: typeof fetch = vi.fn(async () => page([])), loaded = new Map<string, SessionSummary>()) {
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { fn(0); return 0 })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const actions = new AppActions(), run = vi.fn()
  actions.register('new-session', { label: 'New session in this project', enabled: true, run })
  actions.register('open-settings', { label: 'Settings', enabled: false, run })
  actions.registerContext({ hatId: 'hat' })
  function Fixture() {
    const [open, setOpen] = useState(false)
    return <ClientContext.Provider value={browserClient(async () => {}, fetchImpl)}><button onClick={() => setOpen(true)}>Jump to</button>{open && <CommandPalette actions={actions} loaded={loaded} close={() => setOpen(false)} />}</ClientContext.Provider>
  }
  render(<Fixture />)
  return { actions, run, user: userEvent.setup() }
}
it('has grouped semantic options, omits disabled providers, selects locally without executing on focus', async () => {
  const loaded = new Map([['wait', summary('wait', { title: '<b>Review access</b>', operator_attention: 1 })], ['recent', summary('recent')], ['foreign', summary('foreign', { hat_id: 'other' })]])
  const { run, user } = setup(undefined, loaded)
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  const input = screen.getByRole('combobox'); expect(input).toHaveFocus()
  expect(screen.getByRole('group', { name: 'Needs you' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Recent sessions' })).toBeInTheDocument()
  expect(screen.getAllByRole('option')).toHaveLength(3)
  expect(screen.queryByText('Settings', { exact: true })).not.toBeInTheDocument()
  expect(screen.queryByText('foreign', { exact: true })).not.toBeInTheDocument()
  expect(screen.getByText('<b>Review access</b>', { exact: true }).querySelector('b')).toBeNull()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('New session in this project')
  expect(run).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'End' }); expect(screen.getByRole('option', { selected: true })).toHaveTextContent('recent')
  fireEvent.keyDown(input, { key: 'Home' }); expect(screen.getByRole('option', { selected: true })).toHaveTextContent('<b>Review access</b>')
  fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' })
  expect(run).toHaveBeenCalledOnce(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('traps tab, preserves the query on composition, closes with Escape and returns focus', async () => {
  const { user } = setup()
  const trigger = screen.getByRole('button', { name: 'Jump to' }); await user.click(trigger)
  const input = screen.getByRole('combobox'); await user.type(input, 'project')
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(input).toHaveValue('project'); expect(screen.getByRole('dialog')).toBeInTheDocument()
  const close = screen.getByRole('button', { name: 'Close command palette' })
  close.focus(); fireEvent.keyDown(close, { key: 'Tab' }); expect(input).toHaveFocus()
  fireEvent.keyDown(input, { key: 'Tab', shiftKey: true }); expect(close).toHaveFocus()
  fireEvent.keyDown(close, { key: 'Escape' }); expect(trigger).toHaveFocus()
})
it('uses encoded session URLs and never dispatches a mutation for a session selection', async () => {
  const { user, run } = setup(undefined, new Map([['s/one', summary('s/one')]]))
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.click(screen.getByRole('option', { name: 's/one /srv/demo' }))
  expect(location.pathname).toBe('/sessions/s%2Fone'); expect(run).not.toHaveBeenCalled()
})
it('debounces server search, follows explicit pages, scopes the query and never subscribes to a stream', async () => {
  const calls: string[] = []
  const fetchImpl = vi.fn(async (url: RequestInfo | URL) => { calls.push(String(url)); return String(url).includes('cursor=') ? page([summary('second', { title: 'Parser second' })]) : page([summary('first', { title: 'Parser first' })], 'next /') })
  const { user } = setup(fetchImpl)
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  expect(calls).toEqual([])
  await user.type(screen.getByRole('combobox'), 'Parser')
  await screen.findByRole('option', { name: 'Parser first /srv/demo' })
  expect(calls).toEqual(['/api/view/sessions?limit=30&q=Parser&hat=hat'])
  await user.click(screen.getByRole('button', { name: 'Load more matches' }))
  await screen.findByRole('option', { name: 'Parser second /srv/demo' })
  expect(calls[1]).toBe('/api/view/sessions?cursor=next+%2F&limit=30&q=Parser&hat=hat')
  expect(screen.getByText('Session search complete.', { exact: true })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Load more matches' })).not.toBeInTheDocument()
})
it('fences ignored-abort responses after a changed query and aborts when closed', async () => {
  let resolveOld!: (response: Response) => void
  const signals: (AbortSignal | null | undefined)[] = []
  const fetchImpl = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    signals.push(init?.signal)
    if (String(url).includes('q=old')) return new Promise<Response>(resolve => { resolveOld = resolve })
    return Promise.resolve(page([summary('new', { title: 'new answer' })]))
  })
  const { user } = setup(fetchImpl)
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  const input = screen.getByRole('combobox'); await user.type(input, 'old')
  await waitFor(() => expect(fetchImpl).toHaveBeenCalledOnce())
  await user.clear(input); await user.type(input, 'new')
  await screen.findByRole('option', { name: 'new answer /srv/demo' })
  expect(signals[0]?.aborted).toBe(true)
  await act(async () => { resolveOld(page([summary('old', { title: 'new stale' })])) })
  expect(screen.queryByRole('option', { name: 'new stale /srv/demo' })).not.toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'new answer /srv/demo' })).toBeInTheDocument()
  await user.keyboard('{Escape}'); expect(signals.at(-1)?.aborted).toBe(true)
})
it('keeps loaded matches on search error and offers a deliberate retry', async () => {
  let failed = true
  const fetchImpl = vi.fn(async () => failed ? json(503, { code: 'unavailable', message: 'Try again later.' }) : page([summary('fixed', { title: 'Parser remote' })]))
  const { user } = setup(fetchImpl, new Map([['local', summary('local', { title: 'Parser local' })]]))
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'Parser')
  await screen.findByRole('alert'); expect(screen.getByRole('option', { name: 'Parser local /srv/demo' })).toBeInTheDocument()
  failed = false; await user.click(screen.getByRole('button', { name: 'Retry search' }))
  await screen.findByRole('option', { name: 'Parser remote /srv/demo' })
})
it('does not execute a provider that became unavailable after rendering', async () => {
  const { actions, user, run } = setup()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  actions.register('new-session', { label: 'No longer available', enabled: false, run })
  await user.keyboard('{Enter}'); expect(run).not.toHaveBeenCalled()
})
it('help shows route/provider-appropriate keys and restores the trigger', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const actions = new AppActions()
  actions.register('focus-composer', { label: 'Focus composer', enabled: true, run() {} })
  function Fixture() { const [open, show] = useState(false); return <><button onClick={() => show(true)}>Help</button>{open && <ShortcutHelp actions={actions} route="session" close={() => show(false)} />}</> }
  render(<Fixture />); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Help' }))
  const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' })
  expect(within(dialog).getByText('Focus composer', { exact: true })).toBeInTheDocument()
  expect(within(dialog).queryByText('Focus session search', { exact: true })).not.toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Close shortcuts' })).toHaveFocus()
  await user.keyboard('{Escape}'); expect(screen.getByRole('button', { name: 'Help' })).toHaveFocus()
})

// Review amendment: exercise the same shared reducer that receives stream upserts.
it.each(['completed', 'in-flight'] as const)('fences a %s search hit after the shared stream reassigns its session', async phase => {
  const { EMPTY_LIST, listReducer } = await import('../store/sessionList')
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const old = summary('moved', { title: 'Parser project', last_event_at: '2026-10-20T10:00:00Z' })
  const initial = listReducer(EMPTY_LIST, { type: 'first', search: false, page: { sessions: [old], epoch: 'e', revision: 1, waiting: 0 } })
  let answer!: (response: Response) => void
  const fetchImpl = vi.fn(() => new Promise<Response>(resolve => { answer = resolve }))
  const client = browserClient(async () => {}, fetchImpl), actions = new AppActions()
  actions.registerContext({ hatId: 'hat' })
  const view = (loaded: ReadonlyMap<string, SessionSummary>) => <ClientContext.Provider value={client}><CommandPalette actions={actions} loaded={loaded} close={() => {}} /></ClientContext.Provider>
  const rendered = render(view(initial.all))
  await userEvent.type(screen.getByRole('combobox'), 'Parser')
  await waitFor(() => expect(fetchImpl).toHaveBeenCalledOnce())
  if (phase === 'completed') {
    await act(async () => answer(page([old])))
    expect(screen.getByRole('option', { name: 'Parser project /srv/demo' })).toBeInTheDocument()
  }
  const updated = listReducer(initial, { type: 'upsert', summary: { ...old, hat_id: 'other', last_event_at: '2026-10-20T11:00:00Z' } })
  rendered.rerender(view(updated.all))
  if (phase === 'in-flight') await act(async () => answer(page([old])))
  await screen.findByText('Session search complete.', { exact: true })
  expect(screen.queryByRole('option', { name: 'Parser project /srv/demo' })).not.toBeInTheDocument()
})
it('keeps shared stream state on equal versions and newer HTTP state over older loaded state', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const old = summary('moved', { title: 'Parser project', last_event_at: '2026-10-20T10:00:00Z' })
  const newer = { ...old, hat_id: 'other', last_event_at: '2026-10-20T11:00:00Z' }
  const client = browserClient(async () => {}, async () => page([old, { ...newer, session_id: 'http-newer' }]))
  const actions = new AppActions(); actions.registerContext({ hatId: 'hat' })
  render(<ClientContext.Provider value={client}><CommandPalette actions={actions} loaded={new Map([['moved', { ...old, hat_id: 'other' }], ['http-newer', { ...old, session_id: 'http-newer' }]])} close={() => {}} /></ClientContext.Provider>)
  await userEvent.type(screen.getByRole('combobox'), 'Parser')
  await screen.findByText('Session search complete.', { exact: true })
  expect(screen.queryAllByRole('option')).toHaveLength(0)
})
it('preserves a server match when bounding omitted its matching path prefix', async () => {
  // SessionItem::bounded keeps the tail within CWD_MAX_JSON_BYTES=128.
  // The stored path is /needle/ followed by 140 x characters.
  const boundedCwd = '…' + 'x'.repeat(125)
  const { user } = setup(async () => page([summary('bounded', { title: 'Project', cwd: boundedCwd })]), new Map([['unmatched', summary('unmatched')]]))
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'needle')
  await screen.findByText('Session search complete.', { exact: true })
  expect(screen.getByRole('option', { name: `Project ${boundedCwd}` })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'unmatched /srv/demo' })).not.toBeInTheDocument()
})
it.each([{ isComposing: true }, { keyCode: 229 }])('lets IME Escape cancel composition without dismissing the query: %j', async composition => {
  const { user } = setup()
  const trigger = screen.getByRole('button', { name: 'Jump to' }); await user.click(trigger)
  const input = screen.getByRole('combobox'); await user.type(input, 'project')
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...composition })
  fireEvent(input, event)
  expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  expect(input).toHaveValue('project'); expect(event.defaultPrevented).toBe(false)
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
```

Create `web/src/components/ShortcutHelp.tsx` with:

```tsx
import { useEffect, useRef } from 'react'
import type { AppActionId, AppActions } from '../app-actions'
import { modLabel } from '../lib/commands'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { restoreCommandFocus } from '../hooks/useShortcuts'
import { Keycap, useModalLayer } from './ui'

export default function ShortcutHelp({ actions, route, close }: { actions: AppActions | null; route: string; close: () => void }) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const ref = useRef<HTMLDivElement>(null), { trap, holdFocus } = useModalLayer(ref)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ref.current?.querySelector('button')?.focus()
    return () => restoreCommandFocus(before)
  }, [])
  const enabled = (id: AppActionId) => actions?.get(id)?.enabled
  const bindings = [
    ...(enabled('open-commands') ? [[`${modLabel()}+K`, 'Jump to a session or command']] : []),
    ...(enabled('new-session') ? [['N', actions!.get('new-session')!.label]] : []),
    ...(desktop && enabled('toggle-rail') ? [['[', 'Collapse or expand navigation']] : []),
    ...(route === 'session' && enabled('toggle-details') ? [[']', 'Toggle session details']] : []),
    ...(['sessions', 'needs-you'].includes(route) && enabled('search-sessions') ? [['/', 'Focus session search'], ['J / K', 'Move between focused session links'], ['Enter', 'Open the focused link or button']] : []),
    ...(route === 'session' && enabled('focus-composer') ? [['R', 'Focus composer']] : []),
    [`${modLabel()}+Shift+L`, 'Cycle System, Light and Dark'],
    ['?', 'Show keyboard shortcuts'],
    ['Escape', 'Close the active overlay; keep drafts'],
  ]
  return <div className="command-overlay" onMouseDown={holdFocus}><div className="command-dialog shortcut-dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" ref={ref} tabIndex={-1} onKeyDown={event => trap(event, close)}>
    <header><h2>Keyboard shortcuts</h2><button type="button" className="btn btn-ghost" onClick={close}>Close shortcuts</button></header>
    <p>Global shortcuts pause while you type or use a dialog.</p>
    <dl>{bindings.map(([key, label]) => <div key={key}><dt><Keycap>{key}</Keycap></dt><dd>{label}</dd></div>)}</dl>
    <p>In a composer or New session form, {modLabel()}+Enter sends or starts only when enabled. Permission keys 1–9 belong to the focused card on desktop. They never answer from a session list.</p>
  </div></div>
}
```

Replace the whole of `web/src/components/CommandHost.tsx` with:

```tsx
import { useCallback, useState } from 'react'
import { useActionSnapshot, useLoadedSessions, useRegisterAction } from '../app-actions'
import { match, useLocation } from '../router'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useShortcuts } from '../hooks/useShortcuts'
import CommandPalette from './CommandPalette'
import ShortcutHelp from './ShortcutHelp'
import '../styles/commands.css'

export default function CommandHost() {
  const { pathname } = useLocation()
  const actions = useActionSnapshot()
  // App keeps this lazy host mounted across authentication routes. Unmount
  // its stateful controls so cached hits and pending reads cannot cross login.
  return ['login', 'setup'].includes(match(pathname).name) ? null
    : <CommandControls key={actions?.get('open-sessions')?.enabled ? 'sessions' : 'gateway'} />
}

function CommandControls() {
  const actions = useActionSnapshot(), loaded = useLoadedSessions()
  const { pathname } = useLocation()
  const [overlay, setOverlay] = useState<'palette' | 'help' | null>(null)
  const [announcement, announce] = useState('')
  const desktop = useMediaQuery('(min-width: 768px)')
  const open = useCallback(() => setOverlay('palette'), [])
  const help = useCallback(() => setOverlay('help'), [])
  const close = useCallback(() => setOverlay(null), [])
  // The session-search entry is absent in gateway deployments, as in R2.
  const enabled = !!actions?.get('open-sessions')?.enabled
  useRegisterAction('open-commands', { label: 'Jump to', enabled, run: open })
  useShortcuts(actions, match(pathname).name, help, announce)
  return <><span className="sr-only command-announcement" aria-live="polite">{desktop ? '' : announcement}</span>
    {overlay === 'palette' && actions && <CommandPalette actions={actions} loaded={loaded} close={close} />}
    {overlay === 'help' && <ShortcutHelp actions={actions} route={match(pathname).name} close={close} />}
  </>
}
```

Create `web/src/components/CommandHost.test.tsx` with:

```tsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AppActionsProvider, useAppActions, useRegisterAction, type AppActions } from '../app-actions'
import { ClientContext, browserClient } from '../app-client'
import { navigate } from '../router'
import CommandHost from './CommandHost'
import { json } from '../test-server'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); history.replaceState(null, '', '/') })
it('consumes live registry providers, keeps an open query on Mod+K and suppresses global keys under overlays', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux')
  let actions!: AppActions
  const details = vi.fn(), composer = vi.fn(), launch = vi.fn()
  function Providers() {
    actions = useAppActions()!
    useRegisterAction('open-sessions', { label: 'Sessions', enabled: true, run() {} })
    useRegisterAction('new-session', { label: 'New session in this project', enabled: true, run: launch })
    useRegisterAction('toggle-details', { label: 'Details', enabled: true, run: details })
    useRegisterAction('focus-composer', { label: 'Composer', enabled: true, run: composer })
    return <button onClick={() => actions.dispatch('open-commands')}>Jump to</button>
  }
  navigate('/sessions/one')
  render(<ClientContext.Provider value={browserClient(async () => {}, async () => json(200, { sessions: [], waiting: 0, epoch: 'e', revision: 1 }))}><AppActionsProvider><Providers /><CommandHost /></AppActionsProvider></ClientContext.Provider>)
  fireEvent.keyDown(window, { key: ']' }); expect(details).toHaveBeenCalledOnce()
  fireEvent.keyDown(window, { key: 'r' }); expect(composer).toHaveBeenCalledOnce()
  fireEvent.keyDown(window, { key: 'n' }); expect(launch).toHaveBeenCalledOnce()
  const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Jump to' }))
  const input = screen.getByRole('combobox'); await user.type(input, 'project')
  fireEvent.keyDown(input, { key: 'k', ctrlKey: true }); expect(input).toHaveValue('project')
  fireEvent.keyDown(window, { key: ']' }); fireEvent.keyDown(window, { key: 'r' }); fireEvent.keyDown(window, { key: 'n' })
  expect(details).toHaveBeenCalledOnce(); expect(composer).toHaveBeenCalledOnce(); expect(launch).toHaveBeenCalledOnce()
  await user.keyboard('{Escape}')
  act(() => { actions.register('focus-composer', { label: 'Unavailable', enabled: false, run: composer }) })
  fireEvent.keyDown(window, { key: 'r' }); expect(composer).toHaveBeenCalledOnce()
  fireEvent.keyDown(window, { key: '?' }); expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  expect(screen.queryByText('Focus composer', { exact: true })).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

// Keep auth regressions at the real App boundary: App.test mocks this lazy host.
it.each(['cross-tab logout', 'search 401'] as const)('drops cached palette metadata on %s and does not revive it after sign-in', async reason => {
  const { default: App } = await import('../App')
  const { stubServer } = await import('../test-server')
  const channels: { name: string; onmessage: ((event: MessageEvent) => void) | null }[] = []
  vi.stubGlobal('BroadcastChannel', class {
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor(readonly name: string) { channels.push(this) }
    postMessage() {}
    close() {}
  })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  localStorage.clear(); sessionStorage.clear()
  const hit = { session_id: 'private', title: 'Private project', host_id: 'host', hat_id: 'hat', agent: 'claude', cwd: '/srv/private', lifecycle: 'parked', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0 }
  const response = (sessions: unknown[]) => json(200, { sessions, epoch: 'e', revision: 1, waiting: 0 })
  const server = stubServer({
    'GET /api/capabilities': json(200, { mode: 'full', features: [] }),
    'GET /api/view/sessions': response([]),
    'GET /api/view/sessions?limit=30&q=Private': response([hit]),
    'GET /api/view/sessions?limit=30&q=expired': json(401, { code: 'unauthenticated', message: 'Sign in.' }),
  })
  const signals: AbortSignal[] = []
  const fetchImpl: typeof fetch = (url, init) => { if (String(url).includes('limit=30') && init?.signal) signals.push(init.signal); return server.fetch(url, init) }
  act(() => navigate('/sessions'))
  render(<App fetchImpl={fetchImpl} />)
  const user = userEvent.setup()
  const open = async () => {
    const trigger = await screen.findByRole('button', { name: 'Jump to' })
    await waitFor(() => expect(trigger).toBeEnabled())
    await waitFor(() => expect(document.querySelector('.command-announcement')).not.toBeNull())
    await user.click(trigger)
    return screen.findByRole('combobox', { name: 'Jump to a session or command' })
  }
  const input = await open(); await user.type(input, 'Private')
  await screen.findByRole('option', { name: 'Private project /srv/private' })
  if (reason === 'cross-tab logout') {
    await act(async () => { channels.find(channel => channel.name === 'hennery-auth')!.onmessage!(new MessageEvent('message', { data: { version: 1, kind: 'logout' } })) })
  } else { await user.clear(input); await user.type(input, 'expired') }
  await waitFor(() => expect(location.pathname).toBe('/login'))
  expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument()
  expect(screen.queryByText('Private project', { exact: true })).not.toBeInTheDocument()
  expect(document.querySelector('.page')).not.toHaveAttribute('inert')
  expect(signals.every(signal => signal.aborted)).toBe(true)
  act(() => navigate('/sessions')) // Simulate successful sign-in returning to the app.
  await screen.findByRole('heading', { name: 'Sessions' })
  expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument()
  const fresh = await open(); expect(fresh).toHaveValue('')
  expect(screen.queryByText('Private project', { exact: true })).not.toBeInTheDocument()
})

function retainedProviderHost() {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  let actions!: AppActions
  function Provider() {
    actions = useAppActions()!
    useRegisterAction('open-sessions', { label: 'Sessions', enabled: true, run() {} })
    return <button onClick={() => actions.dispatch('open-commands')}>Jump to</button>
  }
  act(() => navigate('/sessions'))
  render(<ClientContext.Provider value={browserClient(async () => {}, async () => json(200, { sessions: [], epoch: 'e', revision: 1, waiting: 0 }))}><AppActionsProvider><Provider /><CommandHost /></AppActionsProvider></ClientContext.Provider>)
  return { actions, user: userEvent.setup() }
}
it.each(['/login', '/setup'])('clears overlay state on %s even before session providers disappear', async route => {
  const { actions, user } = retainedProviderHost()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'private')
  act(() => navigate(route))
  expect(actions.get('open-sessions')?.enabled).toBe(true) // Intentionally stale provider.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  act(() => navigate('/sessions'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  expect(screen.getByRole('combobox')).toHaveValue('')
})
it('unmounts cached controls when session capability disappears, without reviving them on return', async () => {
  const { actions, user } = retainedProviderHost()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'private')
  let remove!: () => void
  act(() => { remove = actions.register('open-sessions', { label: 'Unavailable', enabled: false, run() {} }) })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  act(() => remove())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  expect(screen.getByRole('combobox')).toHaveValue('')
})
```

Create `web/src/styles/commands.css` with:

```css
.command-overlay { position: fixed; inset: 0; z-index: 80; background: var(--hn-scrim); display: flex; align-items: flex-start; justify-content: center; padding: 96px 16px 24px; overflow: auto; }
.command-dialog { width: 620px; max-width: 100%; max-height: calc(100dvh - 120px); display: flex; flex-direction: column; background: var(--hn-surface); color: var(--hn-fg-1); border: 1px solid var(--hn-control); border-radius: 12px; box-shadow: var(--hn-pop-shadow); overflow: hidden; }
.command-search { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 4px 12px 4px 16px; border-bottom: 1px solid var(--hn-line); }
.command-search input { width: 100%; min-width: 0; padding: 10px 0; color: var(--hn-fg-1); background: transparent; border: 0; font: 400 15px/1.4 var(--font-body); }
.command-search input:focus-visible { outline-offset: 2px; }
.command-close { border: 0; border-radius: 6px; background: transparent; color: var(--hn-fg-2); min-width: 44px; min-height: 44px; cursor: pointer; }
.command-results { overflow-y: auto; min-height: 0; padding: 6px; }
.command-group { padding: 12px 10px 6px; color: var(--hn-fg-3); font: 700 11px/1.4 var(--font-display); text-transform: uppercase; letter-spacing: .04em; }
.command-option { display: flex; align-items: center; gap: 10px; padding: 10px; min-height: 44px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.command-option > span { min-width: 0; overflow-wrap: anywhere; }
.command-option > svg { flex-shrink: 0; }
.command-option small { display: block; margin-top: 2px; color: var(--hn-fg-2); font-size: 12px; }
.command-option[aria-selected="true"] { background: var(--hn-accent-wash); color: var(--hn-accent-fg); box-shadow: inset 3px 0 var(--hn-accent); }
.command-option:hover { background: var(--hn-hover); }
.command-note { padding: 6px 16px; margin: 0; color: var(--hn-fg-2); font-size: 12px; overflow-wrap: anywhere; }
.command-more { margin: 6px 16px; align-self: flex-start; }
.command-footer { display: flex; flex-wrap: wrap; gap: 16px; padding: 12px 16px; border-top: 1px solid var(--hn-line); color: var(--hn-fg-2); font-size: 12px; }
.shortcut-dialog { padding: 20px; overflow-y: auto; }
.shortcut-dialog header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.shortcut-dialog h2 { margin: 0; font-size: 18px; }
.shortcut-dialog p { font-size: 13px; color: var(--hn-fg-2); line-height: 1.6; }
.shortcut-dialog dl { margin: 8px 0; }
.shortcut-dialog dl > div { display: flex; align-items: center; gap: 20px; min-height: 40px; padding: 8px 0; border-bottom: 1px solid var(--hn-line); }
.shortcut-dialog dt { min-width: 110px; }
.shortcut-dialog dd { margin: 0; font-size: 13px; }
@media (max-width: 767px) {
  .command-overlay { padding: max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom)); align-items: flex-start; }
  .command-dialog { width: 100%; max-height: calc(100dvh - 48px); border-radius: 16px; }
  .command-search input { font-size: 16px; }
  .command-option { font-size: 15px; min-height: 48px; }
  .shortcut-dialog { padding: 16px; }
  .shortcut-dialog dt { min-width: 100px; }
}
@media (pointer: coarse) { .command-footer { display: none; } }
.command-close > svg { display: none; }
@media (pointer: coarse) {
  .command-close > svg { display: inline-block; }
  .command-close > .ui-keycap { display: none; }
}
.command-option > .ui-keycap { margin-left: auto; flex-shrink: 0; }
@media (pointer: coarse) { .command-option > .ui-keycap { display: none; } }
```

**Verify and commit:** run the task command, inspect `git diff --cached` and its stat against the tested files, commit the task and push `git push origin plan/ui-r6`. Parent owns independent review.

### Task 3: Embedded browser acceptance and visual evidence

**Files:** `web/e2e/commands.spec.ts`.

**Interfaces:** Uses the actual embedded app with synthetic owner-authorized API fixtures; capability checks/action registration are production code.

**Failing and passing checks:** Observe the relevant guard removals fail in the isolated probe copy; the unchanged implementation must pass the following task command. No live worktree probe is used.

Run: `nix develop -c pnpm --dir web typecheck`.

Create `web/e2e/commands.spec.ts` with:

```ts
// R6 acceptance against the embedded app. API data is synthetic; command
// actions still come from the real shell registry and its capability checks.
import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startCollector, type Collector } from './collector'

let collector: Collector
test.beforeAll(async () => { collector = await startCollector() })
test.afterAll(async () => { await collector?.stop() })

for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const) test(`commands and help at ${width}px ${theme}`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme, reducedMotion: 'reduce' })
  const page = await context.newPage(), requests: { method: string; path: string }[] = []
  const held: (() => Promise<void>)[] = [], violations: string[] = []
  const ts = '2026-10-20T10:00:00Z'
  const row = (id: string, title: string, attention = 0) => ({ session_id: id, title, host_id: 'fixture-host', hat_id: 'fixture-hat', cwd: '/srv/project', agent: 'claude', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: attention, parent_handled_questions: 0, created_at: ts, last_event_at: ts })
  const rows = [row('waiting', 'Review project access', 1), row('recent', 'Parser plan')]
  let listStreams = 0, slow: (() => Promise<void>) | undefined, gateway = false
  page.on('console', message => { if (message.text().includes('Content Security Policy')) violations.push(message.text()) })
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    requests.push({ method: route.request().method(), path: path + url.search })
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/login') return route.fulfill({ status: 204 })
    if (path === '/api/auth/passkeys/login/start') return json({ code: 'no_passkeys', message: 'No passkeys.' }, 409)
    if (path === '/api/capabilities') return json({ mode: gateway ? 'gateway' : 'full', features: ['mcp_connections'] })
    if (path === '/api/hats') return json([{ id: 'fixture-hat', name: 'Personal', colour: '#8050d0', created_at: ts, default_for_new_hosts: true }])
    if (path === '/api/hosts') return json([{ host_id: 'fixture-host', name: 'Development host', platform: 'linux', host_version: '0.1.4', capabilities: ['projects', 'resolve_path'], default_hat_id: 'fixture-hat', workspace_roots: [], connected: true, created_at: ts, last_seen_at: ts }])
    if (path === '/api/view/sessions') {
      const q = url.searchParams.get('q')
      const envelope = (sessions: unknown[], next_cursor?: string) => ({ sessions, next_cursor, epoch: 'fixture', revision: 1, waiting: 1 })
      if (q === 'expired') return json({ code: 'unauthenticated', message: 'Sign in.' }, 401)
      if (q === 'needle') return json(envelope([{ ...row('bounded', 'Project'), cwd: '…' + 'x'.repeat(125) }]))
      if (q === 'slow') { slow = () => json(envelope([row('stale', 'fresh stale result')])); return }
      if (q === 'fresh') return json(envelope([row('fresh', 'fresh result')]))
      if (q?.toLowerCase() === 'parser') return json(envelope([url.searchParams.has('cursor') ? row('remote/second', 'Parser remote second') : row('remote', 'Parser remote')], url.searchParams.has('cursor') ? undefined : 'second'))
      return json(envelope(q ? [] : rows))
    }
    if (path.startsWith('/api/stream/')) {
      if (path === '/api/stream/sessions') listStreams++
      held.push(() => route.abort().catch(() => {})); return
    }
    if (path === '/api/hosts/fixture-host/projects') return json({ recents_hat_id: 'fixture-hat', recents: [], items: [{ path: '/srv/project' }], partial: false, home: '/srv' })
    if (path.endsWith('/agents') || path.endsWith('/recent-projects') || path === '/api/mcp/connections') return json([])
    return json({ code: 'not_found', message: 'Not available in this fixture.' }, 404)
  })
  const captures = process.env.HENNERY_UI_R6_CAPTURES
  const capture = async (name: string) => {
    await page.evaluate(async () => {
      for (const family of ['Inter', 'Roboto']) for (const weight of [400, 500, 600, 700]) await document.fonts.load(`${weight} 16px "${family}"`, 'Zażółć gęślą jaźń')
      await document.fonts.ready
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (captures) { await mkdir(captures, { recursive: true }); await page.screenshot({ path: resolve(captures, `${name}-${width}-${theme}.png`), fullPage: true }) }
  }
  try {
    await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'))
    await page.goto(collector.origin + '/sessions')
    const nav = page.getByRole('navigation', { name: width === 390 ? 'Primary navigation' : 'Main navigation', exact: true })
    const focus = nav.getByRole('link', { name: 'Sessions', exact: true })
    await expect(page.getByRole('link', { name: /Parser plan/ })).toBeVisible()
    await expect.poll(() => listStreams).toBe(1)
    await expect(page.locator('.command-announcement')).toHaveCount(1)
    const mod = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform) ? 'Meta' : 'Control')
    await focus.focus(); await page.keyboard.press(`${mod}+k`)
    const palette = page.getByRole('dialog', { name: 'Command palette', exact: true })
    const input = palette.getByRole('combobox', { name: 'Jump to a session or command', exact: true })
    await expect(input).toBeFocused()
    await expect(palette.getByRole('group', { name: 'Needs you', exact: true })).toBeVisible()
    await expect(palette.getByRole('group', { name: 'Actions', exact: true })).toBeVisible()
    await expect(palette.getByRole('group', { name: 'Recent sessions', exact: true })).toBeVisible()
    await expect(palette.getByRole('option', { name: 'Defaults', exact: true })).toHaveCount(0)
    await expect(palette.getByRole('option', { name: 'Focus composer', exact: true })).toHaveCount(0)
    expect(await page.locator('.page').evaluate(el => el instanceof HTMLElement && el.inert)).toBe(true)
    await capture('palette-loaded')
    await input.fill('parser')
    await expect(palette.getByRole('option', { name: 'Parser remote /srv/project', exact: true })).toBeVisible()
    await expect(palette.getByText('More matching sessions are available.', { exact: true })).toBeVisible()
    await input.press(`${mod}+k`); await expect(input).toHaveValue('parser')
    for (const composition of [{ isComposing: true }, { keyCode: 229 }]) {
      const native = await input.evaluate((element, composition) => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...composition })
        element.dispatchEvent(event)
        return event.defaultPrevented
      }, composition)
      expect(native).toBe(false)
      await expect(input).toHaveValue('parser'); await expect(palette).toBeVisible()
    }
    await palette.getByRole('button', { name: 'Load more matches', exact: true }).click()
    await expect(palette.getByRole('option', { name: 'Parser remote second /srv/project', exact: true })).toBeVisible()
    await expect(palette.getByText('Session search complete.', { exact: true })).toBeVisible()
    await input.focus(); await input.press('End'); const selectedId = await palette.getByRole('option', { selected: true }).getAttribute('id'); expect(selectedId).not.toBeNull(); await expect(input).toHaveAttribute('aria-activedescendant', selectedId!)
    await input.press('Home'); await input.press('ArrowDown'); await input.press('ArrowUp')
    await capture('palette-search')
    await input.fill('slow'); await expect.poll(() => !!slow).toBe(true)
    await input.fill('fresh'); await expect(palette.getByRole('option', { name: 'fresh result /srv/project', exact: true })).toBeVisible()
    await slow!().catch(() => {})
    await expect(palette.getByRole('option', { name: 'fresh stale result /srv/project', exact: true })).toHaveCount(0)
    await input.press('Escape'); await expect(palette).toHaveCount(0); await expect(focus).toBeFocused()
    expect(listStreams).toBe(1)
    expect(requests.filter(r => r.path.startsWith('/api/stream/view/'))).toHaveLength(0)
    expect(requests.filter(r => r.method !== 'GET')).toHaveLength(0)
    await focus.press('?')
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })
    await expect(help.getByRole('button', { name: 'Close shortcuts', exact: true })).toBeFocused()
    await page.keyboard.press('n'); await expect(help).toBeVisible()
    await capture('shortcut-help')
    await page.keyboard.press('Escape'); await expect(focus).toBeFocused()
    if (width === 1280) {
      await focus.press('['); expect(await page.locator('.rail').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(56)
      await focus.press('['); expect(await page.locator('.rail').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(240)
    }
    await focus.press(`${mod}+Shift+l`)
    if (width === 390) await expect(page.locator('.command-announcement')).toHaveText('Appearance: Light')
    else await expect(page.getByRole('status').filter({ hasText: /^Appearance: light$/ })).toHaveText('Appearance: light')
    await focus.press('/')
    const search = page.getByRole('searchbox', { name: 'Search sessions', exact: true }); await expect(search).toBeFocused()
    await search.fill('n?[]/rk19')
    await search.press(`${mod}+k`); await expect(palette).toHaveCount(0)
    const appearance = await page.evaluate(() => document.documentElement.dataset.theme)
    await search.press(`${mod}+Shift+l`); expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(appearance)
    await expect(search).toHaveValue('n?[]/rk19')
    if (width === 390) await search.press('Escape')
    await focus.focus(); await focus.press('n')
    const launcher = page.getByRole('dialog', { name: 'New session', exact: true }); await expect(launcher).toBeVisible()
    const prompt = launcher.getByRole('textbox', { name: /^First prompt/ }); await prompt.fill('n?[]/rk19')
    await prompt.press(`${mod}+k`); await expect(palette).toHaveCount(0); await expect(prompt).toHaveValue('n?[]/rk19')
    expect(requests.filter(r => r.method !== 'GET')).toHaveLength(0)
    await prompt.press('Escape')
    await focus.focus(); await focus.press(`${mod}+k`)
    await input.fill('needle')
    await expect(palette.getByRole('option', { name: 'Project …' + 'x'.repeat(125), exact: true })).toBeVisible()
    await input.fill('parser')
    await expect(palette.getByRole('option', { name: 'Parser remote /srv/project', exact: true })).toBeVisible()
    // A second same-origin channel delivers the production cross-tab logout.
    await page.evaluate(() => {
      const channel = new BroadcastChannel('hennery-auth')
      channel.postMessage({ version: 1, kind: 'logout' }); channel.close()
    })
    await expect(page).toHaveURL(collector.origin + '/login')
    await expect(palette).toHaveCount(0)
    expect(await page.locator('.page').evaluate(el => el instanceof HTMLElement && el.inert)).toBe(false)
    const signIn = async () => {
      await page.getByLabel('Password', { exact: true }).fill('synthetic password')
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
      await expect(palette).toHaveCount(0)
      await focus.focus(); await focus.press(`${mod}+k`)
      await expect(input).toHaveValue('')
      await expect(palette.getByRole('option', { name: 'Parser remote /srv/project', exact: true })).toHaveCount(0)
    }
    await signIn()
    await input.fill('parser')
    await expect(palette.getByRole('option', { name: 'Parser remote /srv/project', exact: true })).toBeVisible()
    await input.fill('expired')
    await expect(page).toHaveURL(collector.origin + '/login?next=%2Fsessions')
    await expect(palette).toHaveCount(0)
    expect(await page.locator('.page').evaluate(el => el instanceof HTMLElement && el.inert)).toBe(false)
    await signIn()
    await input.press('Escape')
    gateway = true
    await page.goto(collector.origin + '/more')
    await expect(page.getByRole('navigation', { name: 'More navigation', exact: true })).toBeVisible()
    await page.keyboard.press(`${mod}+k`); await expect(palette).toHaveCount(0)
    if (width === 1280) await expect(page.getByRole('button', { name: 'Jump to', exact: true })).toBeDisabled()
    expect(violations).toEqual([])
  } finally { for (const release of held) await release(); await context.close() }
})
```

**Verify and commit:** run the task command, inspect `git diff --cached` and its stat against the tested files, commit the task and push `git push origin plan/ui-r6`. Parent owns independent review.

## Final verification and guard probes

Run in the dev shell, from the lane root:

```sh
pnpm --dir web install --frozen-lockfile
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web build
cargo build -p hennery -p hennery-testkit --bins --locked
CI=1 pnpm --dir web e2e
```

Run the owned browser suite locally before its commit; collect palette loaded/search and help at 390×844 and 1280×900, both light/dark, after self-hosted fonts load. Compare with Desktop paletteOpen and the Design System input/keycap surface primitives. Screenshots and notes live in .superpowers/sdd/ui-r6/screenshots, never in Git.

In the one cloned probe copy, independently remove prevented/repeat/IME/Alt/editable/composed-path/platform/shift/route/desktop/provider/hat/modal/listener guards; remove search debounce/abort/late-response/cursor/dispatch/URL-encoding/local-IME/focus/loaded-summary/attention behavior. Every mutated run must fail an actual assertion. Keep parse failures and missed probes distinct, then repair the probe/test and rerun. Repeat search debounce/stale/retry checks in four processes, three rounds; no timing threshold is relaxed.

## After this plan

R6 consumes only R2's public seams. R3 registers session details/composer/contextual launch; R4/R5 own their launcher/management actions. Integrating those providers makes their enabled labels/actions appear automatically. Parent verifies actual contextual prefill and the final integrated keyboard/card/form flows; no session mutation code is copied here. Existing J/K, card digits, local Mod+Enter and topmost Escape remain with their owners.

Parent owns independent plan/whole-branch review, full PR status (checks, reviewDecision, mergeStateStatus and unresolved bot/human threads), integration into redesign, final installed-device/release acceptance and scratch cleanup. No GitHub action, production data write, shared-memory write or README index edit was performed by this lane.

Generated with Claude AI — please review before distribution.
