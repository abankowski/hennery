# UI R3 — Session implementation plan

> For agentic workers: execute one task at a time with the ledger in .superpowers/sdd/ui-r3/. The superpowers execution skills are unavailable in this session; follow the fleet process manually. Independent reviews belong to the parent.

**Goal:** Rebuild the selected session around its actual server hat, canonical transcript/AnswerBook, responsive Family/Plan/Details, catalog read-back, adaptive question actions and the persisted operator idle pin. Preserve drafts, attachment limits, delivery/version fences and the 200-item tail window.

**Architecture:** React/native controls and the existing generated view/protocol DTOs. The session retains one item controller/SSE; SessionScope retains the one list controller/SSE. FamilyPanel owns one bounded selected-family reader; an explicit parent-family read pages siblings on demand. App action handlers register in the session, and commands dispatch those handlers. No dependency, backend, generated type, CSP or authorization changes.

**Tech stack:** Existing React 19, TypeScript, Vite, pnpm, bundled icons/fonts and semantic tokens. No new dependency or lockfile change.

**Spec:** [UI redesign](../specs/2026-10-20-ui-redesign-design.md), especially §§3.5, 5.3, 6.4, 8–10; [idle pin](2026-10-20-park-hold.md). O1–O8 and D2–D12 remain settled. Builds on the R1/R2 After this plan contracts.

**Base:** origin/redesign at fbe7d974798217c8dc2632d9b1285ce00ac57867; branch plan/ui-r3. Code was built first; the two original implementation patches below are its executable record, followed by the exact review-amendment patch. The Task 1 replay patch includes the test-source type corrections discovered during Task 2 (Testing Library role queries are exact by default; only text-query options use exact). Those corrections landed in the Task 2 commit; the Task 1 replay remains independently typecheckable.

## Execution status

<!-- execution:start -->
**Executed** on plan/ui-r3. Implementation commits: 098ce3fa (layout, panel, routing/attention words and idle pin), fa34d3ba (canonical adaptive answers, read-back, siblings and acceptance). Independent task/whole-branch review, integration/index and Linux/macOS PR CI remain parent-owned; no approval is claimed.

| Check | Actual result |
|---|---|
| Frozen dependency install | exit 0; no lock/dependency/hash changes |
| Typecheck | exit 0, both worktree and fresh replay |
| Web tests | baseline 2155/120 files → 2170/124 files; exit 0 |
| Web build | exit 0; three emitted-CSS regression tests passed, two shipped CSS assets remain same-origin |
| Embedded binaries | cargo build -p hennery -p hennery-testkit --bins --locked: exit 0 |
| Full browser gate | exit 0; 111 passed, 11 expected skips (10 optional windowing + one desktop phone-target case) |
| Optional windowing | exit 0, all 10 size/CPU cases; original 200-item window and complete reveal assertions retained. All 10 timing rows invalid under shared load (still-frame p95 >20 ms), so no speed claim |
| Rust formatting | cargo fmt --all --check: exit 0 |
| Both clippy commands | workspace/all-targets and shipped hennery: exit 0 |
| Both generator checks | protocol and view: exit 0 |
| Full workspace Rust run | tool exit 1 at doctest compilation after 2689 binary tests passed across 171 result groups, eight existing ignored tests; no binary test failure |
| Workspace doctest recovery | cargo test --workspace --doc --locked: exit 0; every component checked, zero executable doctests |

The original full Rust command is **not recorded as green**. A concurrent frontend rebuild removed the older hashed dist filenames named by its already-generated kernel include_bytes file when rustdoc eventually started. This was verification scheduling, not a Rust source change. A workspace-wide doctest retry passed with stable assets. The one-full-run budget was retained; serialize frontend rebuilds with the complete Rust gate in future. Rust source is unchanged in this plan.

**RED and guard proof:** archived-base pin/action tests failed four regressions (exit 1); archived-base pending config/effort and stricter digit cases failed five (exit 1). The real phone resume test exposed a lost answer click when focus relocated the button mid-gesture; the fixed case and an explicit synthetic inline-click regression pass. Thirty-nine copied removal probes detected their mutations: 35 state/focus/scope/config/digit/word probes, two rebuilt-browser card-scroll/desktop-focus probes, returned pin PATCH and no-button-relocation probes. Source bytes were restored after each. Four deliberately interleaved late-response/config/question tests passed in four copies × three rounds: 48 test executions, all exits 0.

**One fresh replay:** extracted two nonempty diff blocks (19/20 file blocks), applied in order from the named base. Task 1 typecheck and 97 tests passed; Task 2 typecheck, all 2170 web tests, build/embed and owned browser suites passed (29 passed, 11 expected skips: optional windowing plus the desktop-only skip of the phone tap-size case). Before and after verification, all **1041** baseline/implementation files matched the worktree; 29 unique implementation paths changed. No empty extraction/subset comparison was accepted. Only this execution record is outside the replay output.

The additional staged-byte helper initially had a syntax error and its shell continued to the Task 2 commit. The prior whole-source replay comparison had passed; a corrected direct comparison then confirmed all 24 Task 2 committed files equal the tested worktree/replay, and the private-identifier scan passed. Future mutation prerequisites must use checked separate tool calls or fail-fast shells. This did not require an implementation amendment.

**Captures:** 44 PNGs in .superpowers/sdd/ui-r3/screenshots/, with exact filenames in screenshots.txt beside that directory. Every pattern below expands over {390,1280} × {light,dark}; heights are 844/900 respectively. Captures use actual embedded assets, synthetic DTO-typed items, reduced motion, stable UTC timestamps and loaded self-hosted fonts.

| Filename pattern | Reference / acceptance |
|---|---|
| permission-WIDTH-THEME.png | Mobile 3; Desktop permission live; selected title and one action set visible together |
| elicitation-WIDTH-THEME.png | Mobile 4; Design System Question card; native choices/text and truthful Sent acknowledgement |
| family-WIDTH-THEME.png | Mobile 1c; Desktop session Family; modal/panel and actual parent/current facts |
| plan-WIDTH-THEME.png | Desktop Plan; mobile sheet adaptation; actual steps only |
| details-WIDTH-THEME.png | Desktop Details; mobile sheet adaptation; actual host/cwd/model/MCP snapshot |
| composer-WIDTH-THEME.png | Desktop composer; mobile normal composer; offered model/mode/effort, retained draft and clamp explanation |
| running-WIDTH-THEME.png | Desktop session; Mobile 1c background; parent provenance, thinking/tool rows |
| tool-expanded-WIDTH-THEME.png | Desktop expanded tool; real input/output/diff, plain-text fallback retained |
| parked-WIDTH-THEME.png | No dedicated prototype frame; actual parked footer and retained draft/Resume |
| parking-menu-WIDTH-THEME.png | Session actions; added operator idle pin, effective family reason and saved state |
| delete-confirmation-WIDTH-THEME.png | No dedicated prototype frame; shared R1 dialog, retained related-session warning |

Intentional deviations: real hat accent replaces fixed prototype blue; no fake device chrome, sample paths or private text. Actual adapter option names/order/ids replace wildcard/note inventions. Parent prompts take over; there is no hand-back toggle. Queued answers say Sent, never Allowed on 202. Only loaded selected-session plans have fractions; no fabricated sibling progress. Siblings require a bounded explicit parent read. Missing command/detail fields are not invented; actual tool input/output stays in the transcript. Desktop Back remains visible by contract. Browser captures do not prove installed-iOS keyboard/safe-area or OS push presentation.

**Ownership exceptions:** mcp-delivery.spec.ts adds only Details-tab navigation around its original assertions; pwa.spec.ts adds one explicit phone Write a prompt selection before filling the draft. Existing producer, dirty-window, concurrent answer, capability, secret and delivery assertions remain intact. No shared shell/router/action/catalog/generated file, launcher/management implementation, README index, lockfile or design bundle changed.

Blank context-only lines in the embedded patches omit trailing spaces for documentation hygiene. Both formatted blocks were reapplied in patch-check-1; all 1041 files matched the tested replay/worktree, without repeating tests against identical source bytes.

**Retained scratch:** patch-check-1 (format-only patch equivalence), red-1 (archived-base RED), plan-bytes-1 (patch preparation only), probes-1 and replay-1 under the ledger. Both Rust-building copies received independent APFS target clones; none shares CARGO_TARGET_DIR. Kept for parent cleanup per AGENTS.md. All command logs, per-probe outcomes, 4×3 runs, source comparisons and captures are in the ledger. No GitHub operation was performed.
<!-- execution:end -->

## Scope

1. Session header/meta/back/queue neighbors, actual-hat scope, parent banner, action/context registration, tabbed information panel and mobile modal, truthful family/attention words, persisted Do not park preference.
2. Canonical mobile answer presentation, no pointer-gesture relocation, focused-card digits, catalog effort choices/read-back/pending gate, retained transcript rendering, browser coverage and captures.
3. Exact fresh replay, copied guard probes, checks/captures, execution record and parent review request. Do not edit docs/README.md.

Out: launcher/defaults, management implementations, global shortcuts/palette, backend/grants, release/deploy and actual installed-iOS proof. The parent integrates all lanes through redesign and owns GitHub actions/reviews.

## Decisions

- Details starts closed. The one Family reader remains mounted across panel/tab visibility; below 1024px the same panel becomes a named modal sheet with inert background, trapped focus, Escape and trigger focus return. Native tabs implement arrow/Home/End navigation.
- Sibling information is an explicit bounded parent-family read, with encoded ids, paging, current-session exclusion and returned-parent/hat/generation checks. No sibling transcript or invented progress is fetched.
- Mobile answer buttons stay inside the canonical card in the accessibility tree. Only its selected action set occupies the bottom region; fields stay mounted and AnswerBook retains drafts by pending id. Write a prompt returns to the retained composer; Next explicitly focuses another loaded live card without answering.
- Focusing an action button does not reposition it. Otherwise a pointer-down could focus and move the button before pointer-up, losing the click. Card/field focus selects the adaptive region; a direct inline answer remains a direct answer.
- Session configuration uses only offered ids/values. Small effort catalogs use native radios; other supported options remain selects/booleans. Pending switches serialize and disable Send; the returned catalog wins. Missing/clamped read-back is explained, without writing hat defaults or changing execution grants.
- Do not park reads/patches the generated IdleHoldState/SetIdlePinRequest contract through Client, only on deliberate menu use. The switch reflects pinned, separately naming family work/pending updates. Read/write refusal retains the prior preference, and late reads cannot overwrite a reopened menu.
- Local Sent acknowledgement uses deliveryOf wording; 202 never becomes Allowed or delivered. Permission digits require focus on the card itself, a fine desktop pointer, and no modifiers/repeat/composition.
- Actual session hat colors are scoped locally and cached for reload; leaving restores the overview palette without changing its selected hat. All data remains escaped and bidi-isolated.

## Global Constraints

- Own only §10 R3 files. Narrow exceptions: web/e2e/mcp-delivery.spec.ts opens/closes Details around unchanged snapshot assertions; web/e2e/pwa.spec.ts chooses Write a prompt before filling the phone draft. Both preserve all existing security/delivery assertions and need parent integration with R2/R5.
- Consume app-actions.tsx, api/delegation.ts, lib/catalog.ts, generated DTOs and ui primitives read-only. No index.css/manage.css/Shell/router/App edits.
- Keep AnswerBook, sanitized Markdown, provenance, drafts, attachments, safe links, version/removal fences and bounded history. No raw ACP fold, new stream, lock-screen answer, hand-back toggle, fabricated command/pattern, diagnosis, rule or sibling progress.
- Text locators are exact or named roles. Native role names are exact by default in Testing Library; Playwright retains exact:true.
- Every tool/build runs in the dev shell. Copies have independently cloned targets, never a shared CARGO_TARGET_DIR. Probes restore exact bytes and never mutate the worktree. No scratch deletion or GitHub access.
- Review staged bytes/identity and push each task over SSH. No copied design bundle or private example data is committed. No dependency hash update is needed without a lockfile change.

## Review Focus

- Pointer/focus sequencing must not lose an answer; typing, IME, repeats, other cards and dialogs must never send a digit answer. Mobile selection cannot remount forms or lose draft/attachment state.
- Exactly one canonical answer action set, truthful queued/uncertain/conflict/withdrawn/delivered states, explicit Next and directly answerable parent-handled questions.
- Parent banner/takeover and status-only attention retain server authority. Sibling reads remain bounded, owner/hat scoped and generation fenced; no raw routing/receipt codes reach operator copy.
- Actual read-back wins over optimistic choices; no send while applying config and no preference/grant mutation. Idle pin is a reversible resource preference, independent from family-derived holds and explicit Park/Close.
- Modal stacking/focus return, hidden keyboard targets, tabs, actual hat accent/cache and action registration cleanup. One list/item stream and unchanged tail/reveal assertions.
- Backend code is unchanged. Review the verification scheduling exception and invalid timing measurements honestly; no macOS/load claim substitutes for Linux or installed-iOS acceptance.

## File structure

| Area | Files |
|---|---|
| Session | screens/Session.tsx, SessionHeader.tsx, SessionMenu.tsx, SessionDetails.tsx, styles/session.css |
| Answers | QuestionActions.tsx, items/QuestionCard.tsx, items/Elicitation.tsx and existing AnswerBook consumers |
| Configuration | Composer.tsx, SessionConfig.tsx; shared catalog parser remains untouched |
| Family | FamilyPanel.tsx, StatusAttention.tsx; bounded selected/parent pages, actual links/receipt words |
| Acceptance | Corresponding colocated/session tests; sessions.spec.ts, family.spec.ts, windowing.spec.ts; two navigation-only exceptions above |
| Scratch | .superpowers/sdd/ui-r3/: ledger, logs, patches, snapshots, copies and screenshots (gitignored) |

## Task 1: Session layout, family/details and idle pin

- [x] Build the actual session layout/context/actions, panel/sheet and persisted pin controls on the R2 seams.
- [x] Add positive/failure/focus/scope tests. Observe pin/action regressions RED on archived base, then run targeted tests and typecheck.
- [x] Inspect staged diff, commit feat(ui): rebuild the session layout and parking controls, push plan/ui-r3. Parent review pending.

Apply this exact patch to the base:

```diff
diff --git a/web/src/components/Composer.tsx b/web/src/components/Composer.tsx
index 28be5f2..28b5d35 100644
--- a/web/src/components/Composer.tsx
+++ b/web/src/components/Composer.tsx
@@ -51,6 +51,7 @@ import { CANCEL_OUTCOME, SEND_AGAIN_LABEL, cancelRefusal, configRefusal, promptR

 /** What the session screen may ask of its composer. */
 export interface ComposerHandle {
+  focus(): void
   /** Put `text` in the draft, after what is there (an empty draft is
    *  replaced), with `label` shown above it until it is sent; the cursor
    *  goes to its end. Sends nothing. */
@@ -258,6 +259,7 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
   }

   useImperativeHandle(handle, () => ({
+    focus: () => taRef.current?.focus(),
     // Words an agent wrote never link a held image. A turn put back is the
     // operator's own, and goes back as it was sent.
     prefill: (words: string, why?: string) => addToDraft([{ type: 'text', text: inertMarkers(words) }], why ?? null),
diff --git a/web/src/components/FamilyPanel.attention.test.tsx b/web/src/components/FamilyPanel.attention.test.tsx
index 2bfbbb6..86111a7 100644
--- a/web/src/components/FamilyPanel.attention.test.tsx
+++ b/web/src/components/FamilyPanel.attention.test.tsx
@@ -33,7 +33,7 @@ it('acknowledges status explicitly, keeps question attention linked to its card,
     return json(page)
   })
   show(s, page)
-  expect(await screen.findByText('child_failed', { exact: true })).toBeInTheDocument()
+  expect(await screen.findByText('Child session failed', { exact: true })).toBeInTheDocument()
   expect(within(region()).getAllByRole('link', { name: 'Review parser' })[0]).toHaveAttribute('href', '/sessions/child')
   expect(within(region()).getByRole('link', { name: 'Open question' })).toHaveAttribute('href', '/sessions/child?pending=q%2F1')
   expect(within(region()).getAllByRole('button', { name: /^Acknowledge / })).toHaveLength(1)
@@ -42,16 +42,16 @@ it('acknowledges status explicitly, keeps question attention linked to its card,
   expect(within(region()).queryByText('cross_hat_child_secret', { exact: true })).not.toBeInTheDocument()
   expect(within(region()).queryByRole('link', { name: 'foreign title' })).not.toBeInTheDocument()
   const before = s.calls.length
-  await userEvent.click(within(region()).getByRole('button', { name: 'Acknowledge child_failed for Review parser' }))
-  expect(screen.getByText('child_failed', { exact: true })).toBeInTheDocument()
+  await userEvent.click(within(region()).getByRole('button', { name: 'Acknowledge Child session failed for Review parser' }))
+  expect(screen.getByText('Child session failed', { exact: true })).toBeInTheDocument()
   expect(s.calls).toHaveLength(before + 1)
   expect(s.calls.at(-1)?.path).toBe('/api/delegation/attention/status%2F1/acknowledge')
   await act(async () => { finish(new Response(null, { status: 204 })); await ack })
-  await waitFor(() => expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument())
+  await waitFor(() => expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument())
   expect(s.calls.filter(c => c.path.includes('/family'))).toHaveLength(2)
   expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention?'))).toHaveLength(2)
   expect(within(region()).queryByRole('button', { name: /^Acknowledge / })).not.toBeInTheDocument()
-  expect(within(region()).getByText('permission_required', { exact: true })).toBeInTheDocument()
+  expect(within(region()).getByText('Session needs your attention', { exact: true })).toBeInTheDocument()
 })

 it('pages at most 100 attention records per click, using the last raw id even when unrelated rows are hidden', async () => {
@@ -60,9 +60,9 @@ it('pages at most 100 attention records per click, using the last raw id even wh
   show(s)
   const more = await screen.findByRole('button', { name: 'Load more attention' })
   expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention'))).toHaveLength(1)
-  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
+  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
   await userEvent.click(more)
-  expect(await screen.findByText('child_failed', { exact: true })).toBeInTheDocument()
+  expect(await screen.findByText('Child session failed', { exact: true })).toBeInTheDocument()
   expect(s.calls.at(-1)?.path).toBe('/api/delegation/attention?hat_id=hat1&after=opaque%2F99')
   expect(screen.queryByRole('button', { name: 'Load more attention' })).not.toBeInTheDocument()
 })
@@ -76,7 +76,7 @@ it('reads no attention for zero counts but supports an orphan deep link with sta
   const page: FamilyPage = { summary: { ...parent, session_id: 'orphan', operator_attention: 1, family: undefined }, children: [], questions: [] }
   const orphan = routed(c => c.path.startsWith('/api/delegation/attention') ? json([{ ...status, child_id: 'orphan' }]) : json(page))
   render(<FamilyPanel id="orphan" hosts={new Map()} resync={0} />, { wrapper: orphan.wrapper })
-  expect(await screen.findByRole('button', { name: 'Acknowledge child_failed for orphan' })).toBeEnabled()
+  expect(await screen.findByRole('button', { name: 'Acknowledge Child session failed for orphan' })).toBeEnabled()
 })

 it('shows read/ack failures without resolving attention or refreshing the family on a refused ack', async () => {
@@ -89,9 +89,9 @@ it('shows read/ack failures without resolving attention or refreshing the family
   show(s)
   expect(await screen.findByRole('alert')).toHaveTextContent('Read unavailable')
   await userEvent.click(screen.getByRole('button', { name: 'Retry attention' }))
-  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge child_failed for Review parser' }))
+  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge Child session failed for Review parser' }))
   expect(await screen.findByRole('alert')).toHaveTextContent('Could not acknowledge')
-  expect(screen.getByText('child_failed', { exact: true })).toBeInTheDocument()
+  expect(screen.getByText('Child session failed', { exact: true })).toBeInTheDocument()
   expect(s.calls.filter(c => c.path.includes('/family'))).toHaveLength(1)
 })

@@ -109,17 +109,17 @@ it('hides cached scope data immediately and ignores an old hat response after th
     return json(nextHat ? next : old)
   })
   const view = show(s, old)
-  await screen.findByText('child_failed', { exact: true })
+  await screen.findByText('Child session failed', { exact: true })
   view.rerender(<FamilyPanel id="parent" summary={old.summary} hosts={new Map()} resync={1} />)
   await waitFor(() => expect(oldReads).toBe(2))
-  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
+  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
   nextHat = true
   view.rerender(<FamilyPanel id="parent" summary={next.summary} hosts={new Map()} resync={1} />)
-  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
-  expect(await screen.findByText('new_hat_attention', { exact: true })).toBeInTheDocument()
+  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
+  expect(await screen.findByText('Session needs your attention', { exact: true })).toBeInTheDocument()
   await act(async () => { oldRead(json([status])); await late })
-  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
-  expect(screen.getByText('new_hat_attention', { exact: true })).toBeInTheDocument()
+  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
+  expect(screen.getByText('Session needs your attention', { exact: true })).toBeInTheDocument()
 })

 it('does not refresh a new selection when an old status acknowledgement completes late', async () => {
@@ -133,11 +133,11 @@ it('does not refresh a new selection when an old status acknowledgement complete
     return json(c.path.includes('/other/') ? other : page)
   })
   const view = show(s, page)
-  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge child_failed for Review parser' }))
+  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge Child session failed for Review parser' }))
   view.rerender(<FamilyPanel id="other" summary={other.summary} hosts={new Map()} resync={0} />)
-  await screen.findByText('other_failed', { exact: true })
+  await screen.findByText('Session needs your attention', { exact: true })
   const before = s.calls.length
   await act(async () => { finish(new Response(null, { status: 204 })); await late })
-  expect(screen.getByText('other_failed', { exact: true })).toBeInTheDocument()
+  expect(screen.getByText('Session needs your attention', { exact: true })).toBeInTheDocument()
   expect(s.calls).toHaveLength(before)
 })
diff --git a/web/src/components/FamilyPanel.test.tsx b/web/src/components/FamilyPanel.test.tsx
index 4590d73..a869e5c 100644
--- a/web/src/components/FamilyPanel.test.tsx
+++ b/web/src/components/FamilyPanel.test.tsx
@@ -2,7 +2,7 @@ import { act, render, screen, waitFor } from '@testing-library/react'
 import userEvent from '@testing-library/user-event'
 import { describe, expect, it } from 'vitest'
 import { json, routed } from '../test-stream'
-import FamilyPanel from './FamilyPanel'
+import FamilyPanel, { operationWords } from './FamilyPanel'

 import { parent, familyPage } from '../test-family'

@@ -11,7 +11,7 @@ describe('FamilyPanel', () => {
     const s = routed(c => json(familyPage(c.path.includes('after=child') ? 'child2' : 'child')))
     render(<FamilyPanel id="parent" summary={parent} hosts={new Map([['h1', 'worker host']])} resync={0} />, { wrapper: s.wrapper })
     expect(await screen.findByRole('link', { name: 'Review parser' })).toHaveAttribute('href', '/sessions/child')
-    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'spawn: accepted', 'Parent is handling']) {
+    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'Start child: Accepted', 'Parent is handling']) {
       expect(screen.getByText(text, { exact: true })).toBeInTheDocument()
     }
     expect(screen.getByRole('link', { name: 'Open question' })).toHaveAttribute('href', '/sessions/child?pending=q%2F1')
@@ -31,7 +31,7 @@ describe('FamilyPanel', () => {
     })
     render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
     await userEvent.click(await screen.findByRole('button', { name: 'Take over Review parser' }))
-    expect(await screen.findByText('operator_takeover', { exact: true })).toBeInTheDocument()
+    expect(await screen.findByText('You took over this session', { exact: true })).toBeInTheDocument()
     expect(screen.getByText('Operator answer required', { exact: true })).toBeInTheDocument()
     expect(s.calls.filter(c => c.method === 'POST')).toEqual([expect.objectContaining({ path: '/api/view/sessions/child/takeover' })])
     expect(screen.queryByRole('button', { name: 'Take over Review parser' })).not.toBeInTheDocument()
@@ -83,7 +83,7 @@ it('names queued answers and unknown routing states without claiming delivery',
   const s = routed(() => json(page))
   render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
   expect(await screen.findByText('Answer queued', { exact: true })).toBeInTheDocument()
-  expect(screen.getByText('future_routing_state', { exact: true })).toBeInTheDocument()
+  expect(screen.getByText('Question routing is unavailable', { exact: true })).toBeInTheDocument()
 })

 it('labels the saturated receipt history as latest 16 and preserves truthful receipt states', async () => {
@@ -93,5 +93,5 @@ it('labels the saturated receipt history as latest 16 and preserves truthful rec
   const s = routed(() => json(page))
   render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
   expect(await screen.findByText('Latest 16 operations', { exact: true })).toBeInTheDocument()
-  for (let i = 0; i < states.length; i++) expect(screen.getByText(`tool${i}: ${states[i]}`, { exact: true })).toBeInTheDocument()
+  for (let i = 0; i < states.length; i++) expect(screen.getAllByText(`Session operation: ${operationWords(states[i])}`, { exact: true })).toHaveLength(2)
 })
diff --git a/web/src/components/FamilyPanel.tsx b/web/src/components/FamilyPanel.tsx
index 4ac1f50..b441356 100644
--- a/web/src/components/FamilyPanel.tsx
+++ b/web/src/components/FamilyPanel.tsx
@@ -6,6 +6,7 @@ import { familyPage, takeOver } from '../api/view'
 import { useClient } from '../app-client'
 import type { FamilyChild, FamilyPage, SessionSummary } from '../generated/view'
 import { agentLabel } from '../lib/agent'
+import { attentionReason } from '../lib/attentionReason'
 import { Link } from '../router'
 import { sessionPath } from './SessionRow'
 import StatusAttention from './StatusAttention'
@@ -23,10 +24,21 @@ export function handlingWords(handling: string): string {
     case 'parent_queued': case 'parent_delivered': return 'Parent is handling'
     case 'operator_required': return 'Operator answer required'
     case 'answer_queued': return 'Answer queued'
-    default: return handling
+    default: return 'Question routing is unavailable'
   }
 }

+export function routingWords(routing: string): string {
+  return routing === 'active' ? 'Parent-driven' : routing === 'detached' ? 'Operator-driven' : routing === 'suspended' ? 'Delegation paused' : 'Routing unavailable'
+}
+export function operationWords(state: string): string {
+  const labels = new Map([['accepted', 'Accepted'], ['waiting_config', 'Checking configuration'], ['dispatching', 'Sending'], ['delivered', 'Delivered'], ['done', 'Done'], ['failed', 'Failed'], ['cancelled', 'Cancelled']])
+  return labels.get(state) ?? 'Operation status unavailable'
+}
+export function operationName(tool: string): string {
+  return new Map([['spawn', 'Start child'], ['prompt', 'Prompt'], ['resume', 'Resume'], ['cancel', 'Cancel'], ['close', 'Close'], ['answer', 'Answer']]).get(tool) ?? 'Session operation'
+}
+
 export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Props) {
   const client = useClient()
   const [loadedPage, setPage] = useState<FamilyPage | null>(null)
@@ -80,13 +92,13 @@ export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Prop
   const family = summary ? summary.family : page?.summary.family
   const selected = summary ?? page?.summary
   const hasAttention = (selected?.operator_attention ?? 0) > 0 || (selected?.family?.attention ?? 0) > 0 || (page?.summary.operator_attention ?? 0) > 0 || (page?.summary.family?.attention ?? 0) > 0
-  if (!family?.parent && !family?.child_counts.total && !error && !hasAttention) return null
+  if (!family?.parent && !family?.child_counts.total && !error && !hasAttention) return <p className="item-note">{busy ? 'Loading family…' : 'No related sessions.'}</p>
   return <section className="family-panel" aria-label="Session family">
-    <details>
+    <details open>
       <summary>{family?.parent || family?.child_counts.total ? 'Family' : 'Attention'}{family?.child_counts.total ? ` · ${family.child_counts.total} children` : ''}</summary>
       {selected && <StatusAttention session={selected} children={page?.children.map(child => child.summary) ?? []} enabled={hasAttention && page !== null} refreshKey={`${familyKey}:${resync}:${refresh}`} onAcknowledged={() => setRefresh(n => n + 1)} />}
       {family?.parent && <p>Parent: <Link to={sessionPath(family.parent.session_id)}><bdi>{family.parent.title || agentLabel(family.parent.agent)}</bdi></Link></p>}
-      {page?.routing && <p>Routing: {page.routing}{page.reason && <> · <bdi>{page.reason}</bdi></>}</p>}
+      {page?.routing && <p>{routingWords(page.routing)}{page.reason && <> · {attentionReason(page.reason)}</>}</p>}
       {family?.parent && page?.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" disabled={taking !== null} onClick={() => void takeover({ summary: page.summary })}>{taking === id ? 'Taking over…' : 'Take over'}</button>}
       {page?.children.map(child => {
         const s = child.summary
@@ -97,13 +109,13 @@ export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Prop
             <span>{agentLabel(s.agent)}</span>{s.model && <bdi>{s.model}</bdi>}
             <bdi>{hosts.get(s.host_id) || s.host_id}</bdi><bdi>{s.cwd}</bdi>
             <span>{s.lifecycle}</span>{s.activity && <span>{s.activity}</span>}
-            <span>Routing: {child.routing}</span>
+            <span>{routingWords(child.routing)}</span>
           </div>
-          {child.reason && <p><bdi>{child.reason}</bdi></p>}
+          {child.reason && <p>{attentionReason(child.reason)}</p>}
           {child.operations.length >= 16 && <p className="item-note">Latest 16 operations</p>}
-          {child.operations.map(op => <p key={op.operation_id} className="family-operation"><bdi>{op.tool}: {op.state}</bdi>{op.code && <> · <bdi>{op.code}</bdi></>}</p>)}
+          {child.operations.map(op => <p key={op.operation_id} className="family-operation">{operationName(op.tool)}: {operationWords(op.state)}{op.code && <> · {attentionReason(op.code)}</>}</p>)}
           {child.questions.map(question => <p key={question.pending_id}>
-            <span>{handlingWords(question.handling)}</span>{question.reason && <> · <bdi>{question.reason}</bdi></>}{' '}
+            <span>{handlingWords(question.handling)}</span>{question.reason && <> · {attentionReason(question.reason)}</>}{' '}
             <Link to={`${sessionPath(s.session_id)}?pending=${encodeURIComponent(question.pending_id)}`}>Open question</Link>
           </p>)}
           {child.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Take over ${title}`} disabled={taking !== null} onClick={() => void takeover(child)}>{taking === s.session_id ? 'Taking over…' : 'Take over'}</button>}
diff --git a/web/src/components/SessionDetails.test.tsx b/web/src/components/SessionDetails.test.tsx
new file mode 100644
index 0000000..a76f642
--- /dev/null
+++ b/web/src/components/SessionDetails.test.tsx
@@ -0,0 +1,51 @@
+import { useRef, useState } from 'react'
+import { fireEvent, render, screen } from '@testing-library/react'
+import userEvent from '@testing-library/user-event'
+import { describe, expect, it, vi } from 'vitest'
+import SessionDetails from './SessionDetails'
+
+function View() {
+  const [open, setOpen] = useState(false)
+  const ref = useRef<HTMLButtonElement>(null)
+  return <><button ref={ref} onClick={() => setOpen(true)}>Session details</button><input aria-label="Retained draft" defaultValue="keep this" /><SessionDetails open={open} onClose={() => setOpen(false)} trigger={ref}><a href="/sessions/child">Worker</a></SessionDetails></>
+}
+
+describe('SessionDetails', () => {
+  it('offers semantic arrow/Home/End tabs and empty states without inventing plan data', async () => {
+    render(<View />)
+    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
+    await userEvent.click(screen.getByRole('button', { name: 'Session details' }))
+    const family = screen.getByRole('tab', { name: 'Family' })
+    expect(family).toHaveAttribute('aria-selected', 'true')
+    fireEvent.keyDown(family, { key: 'ArrowRight' })
+    expect(screen.getByRole('tab', { name: 'Plan' })).toHaveFocus()
+    expect(screen.getByText('No plan has been shared.', { exact: true })).toBeVisible()
+    fireEvent.keyDown(document.activeElement!, { key: 'End' })
+    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus()
+    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('unknown')
+    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
+    expect(family).toHaveFocus()
+    expect(screen.getByRole('link', { name: 'Worker' })).toBeVisible()
+  })
+
+  it('makes the phone sheet modal, traps focus, preserves drafts and returns focus on Escape', async () => {
+    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(max-width: 1023px)', addEventListener() {}, removeEventListener() {} })))
+    render(<View />)
+    const trigger = screen.getByRole('button', { name: 'Session details' })
+    await userEvent.click(trigger)
+    const dialog = screen.getByRole('dialog', { name: 'Session details' })
+    expect(dialog).toHaveAttribute('aria-modal', 'true')
+    expect(trigger.inert).toBe(true)
+    expect(screen.getByRole('tab', { name: 'Family' })).toHaveFocus()
+    const last = screen.getByRole('link', { name: 'Worker' })
+    last.focus()
+    await userEvent.tab()
+    expect(screen.getByRole('button', { name: 'Close session details' })).toHaveFocus()
+    fireEvent.keyDown(dialog, { key: 'Escape' })
+    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
+    expect(trigger).toHaveFocus()
+    expect(trigger.inert).toBe(false)
+    expect(screen.getByRole('textbox', { name: 'Retained draft' })).toHaveValue('keep this')
+    vi.unstubAllGlobals()
+  })
+})
diff --git a/web/src/components/SessionDetails.tsx b/web/src/components/SessionDetails.tsx
new file mode 100644
index 0000000..9854469
--- /dev/null
+++ b/web/src/components/SessionDetails.tsx
@@ -0,0 +1,83 @@
+import { useEffect, useId, useRef, useState, type ReactNode, type RefObject, type KeyboardEvent } from 'react'
+import type { HeaderInfo } from './SessionHeader'
+import type { Item } from '../generated/view'
+import type { McpSessionDelivery } from '../generated/protocol'
+import { agentLabel } from '../lib/agent'
+import { useMediaQuery } from '../hooks/useMediaQuery'
+import { useModalLayer } from './ui'
+import McpDelivery from './McpDelivery'
+import StepList from './StepList'
+
+const TABS = ['Family', 'Plan', 'Details'] as const
+type Tab = typeof TABS[number]
+
+interface Props {
+  open: boolean
+  onClose: () => void
+  trigger: RefObject<HTMLButtonElement | null>
+  info?: HeaderInfo
+  hostName?: string
+  hatName?: string
+  plan?: Extract<Item, { kind: 'plan' }>
+  delivery?: McpSessionDelivery
+  children: ReactNode
+}
+
+/** Keep the family reader mounted while tabs are hidden: one bounded reader
+ * supplies both canonical routing and the panel, with no transcript stream. */
+export default function SessionDetails(props: Props) {
+  const { open, onClose, trigger } = props
+  const sheet = useMediaQuery('(max-width: 1023px)')
+  const [tab, setTab] = useState<Tab>('Family')
+  const prefix = useId()
+  const body = <>
+    <div className="session-details-heading"><h2>Session details</h2><button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close session details">×</button></div>
+    <div className="session-detail-tabs" role="tablist" aria-label="Session information">
+      {TABS.map((name, i) => <button key={name} type="button" role="tab" id={`${prefix}-${name}`} aria-controls={`${prefix}-${name}-panel`} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1}
+        onClick={() => setTab(name)} onKeyDown={e => {
+          const index = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1
+          if (index < 0) return
+          e.preventDefault(); setTab(TABS[index]); document.getElementById(`${prefix}-${TABS[index]}`)?.focus()
+        }}>{name}</button>)}
+    </div>
+    {TABS.map(name => <div key={name} role="tabpanel" tabIndex={0} id={`${prefix}-${name}-panel`} aria-labelledby={`${prefix}-${name}`} hidden={tab !== name}>
+      {name === 'Family' ? props.children : tab !== name ? null : name === 'Plan' ? props.plan?.entries.length ? <StepList entries={props.plan.entries} truncated={props.plan.truncated} open /> : <p className="item-note">No plan has been shared.</p> : <Details {...props} />}
+    </div>)}
+  </>
+  return <div className={'session-details-wrap' + (sheet ? ' is-sheet' : '')} hidden={!open}>
+    {sheet ? <Sheet open={open} onClose={onClose} trigger={trigger}>{body}</Sheet> : <aside className="session-details" aria-label="Session details">{body}</aside>}
+  </div>
+}
+
+function Sheet({ open, onClose, trigger, children }: { open: boolean; onClose: () => void; trigger: RefObject<HTMLButtonElement | null>; children: ReactNode }) {
+  const ref = useRef<HTMLDivElement>(null)
+  const keys = useRef<((e: KeyboardEvent<HTMLDivElement>) => void) | null>(null)
+  return <div className="session-details-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
+    <div ref={ref} className="session-details" role="dialog" aria-modal="true" aria-label="Session details" tabIndex={-1} onKeyDown={e => keys.current?.(e)}>{open && <SheetFocus dialog={ref} keys={keys} onClose={onClose} trigger={trigger} />}{children}</div>
+  </div>
+}
+
+function SheetFocus({ dialog: ref, keys, onClose, trigger }: { dialog: RefObject<HTMLDivElement | null>; keys: RefObject<((e: KeyboardEvent<HTMLDivElement>) => void) | null>; onClose: () => void; trigger: RefObject<HTMLButtonElement | null> }) {
+  const { trap } = useModalLayer(ref)
+  keys.current = e => trap(e, onClose)
+  useEffect(() => {
+    ref.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
+    return () => { keys.current = null; if (trigger.current?.isConnected) trigger.current.focus() }
+  }, [trigger])
+  return null
+}
+
+function Details({ info, hostName, hatName, delivery }: Props) {
+  return <>
+    {info && <dl className="session-facts">
+      <dt>Host</dt><dd><bdi>{hostName ?? info.host_id}</bdi></dd>
+      <dt>Project</dt><dd><bdi>{info.cwd}</bdi></dd>
+      {hatName && <><dt>Hat</dt><dd><bdi>{hatName}</bdi></dd></>}
+      <dt>Agent</dt><dd>{agentLabel(info.agent)}</dd>
+      {info.model && <><dt>Model</dt><dd><bdi>{info.model}</bdi></dd></>}
+      {info.mode && <><dt>Mode</dt><dd><bdi>{info.mode}</bdi></dd></>}
+      <dt>Started</dt><dd><time dateTime={info.created_at}>{new Date(info.created_at).toLocaleString()}</time></dd>
+    </dl>}
+    <McpDelivery agent={info?.agent} delivery={delivery} />
+  </>
+}
diff --git a/web/src/components/SessionHeader.tsx b/web/src/components/SessionHeader.tsx
index 20ef071..728f433 100644
--- a/web/src/components/SessionHeader.tsx
+++ b/web/src/components/SessionHeader.tsx
@@ -2,15 +2,18 @@
 // where it stands in words, model and mode, and the newest step list. On a
 // phone it carries the way back to the list, and the steps start closed.
 // The session's menu (Park, Close, Delete) sits at the end of its title row.
-import type { SessionItem } from '../generated/protocol'
-import type { ReactNode } from 'react'
+import type { SessionItem, McpSessionDelivery } from '../generated/protocol'
+import type { ReactNode, RefObject } from 'react'
 import type { FamilySummary, PlanEntry } from '../generated/view'
 import { agentLabel } from '../lib/agent'
 import { statusOf } from '../lib/status'
 import { basename } from '../lib/time'
 import { Icon } from '../lib/ui'
 import { Link } from '../router'
-import StepList from './StepList'
+import { useSessionScope } from './SessionScope'
+import { needsOperator } from '../lib/status'
+import { Icon as Glyph } from './ui'
+import { sessionPath } from './SessionRow'
 import { reasonWords } from './items/Marker'

 /** What the header reads: a list summary or a session's detail. */
@@ -29,9 +32,22 @@ interface Props {
   narrow: boolean
   /** The session's menu, at the end of the title row. */
   menu?: ReactNode
+  detailsOpen?: boolean
+  toggleDetails?: () => void
+  detailsTrigger?: RefObject<HTMLButtonElement | null>
+  hatName?: string
+  hostConnected?: boolean
+  delivery?: McpSessionDelivery
 }

-export default function SessionHeader({ id, info, hostName, plan, narrow, menu }: Props) {
+export default function SessionHeader({ id, info, hostName, menu, detailsOpen, toggleDetails, detailsTrigger, hatName, hostConnected, delivery }: Props) {
+  const scope = useSessionScope()
+  // Share the queue's recent-first summary order, never its overview filters.
+  const waiting = [...(scope?.list.all.values() ?? [])].filter(needsOperator).sort((a, b) => b.last_event_at.localeCompare(a.last_event_at) || a.session_id.localeCompare(b.session_id))
+  const position = waiting.findIndex(s => s.session_id === id)
+  const complete = scope !== null && !scope.list.loading && !scope.list.hasMore && !scope.list.error && !scope.query && !scope.lifecycle && !scope.hideClosed
+  const previous = position > 0 ? waiting[position - 1] : undefined
+  const next = position >= 0 ? waiting[position + 1] : undefined
   // The list's marker, word for word (plan 4c decision 8): the header and
   // the row never disagree.
   const status = info
@@ -52,15 +68,20 @@ export default function SessionHeader({ id, info, hostName, plan, narrow, menu }
         <Link to="/sessions" className="back-btn" aria-label="Back to sessions">
           <Icon.Chevron size={18} className="rot-180" />
         </Link>
+        {hatName && <span className="session-hat"><span aria-hidden="true" /><bdi>{hatName}</bdi></span>}
+        <h1 className="conv-name"><bdi>{titleOf(info, id)}</bdi></h1>
         {status && (
           <span className={'badge badge-' + status.tone}>
-            <span className="led" />
+            <Glyph name={status.tone === 'attn' ? 'hand-raised' : status.tone === 'run' ? 'play-circle' : status.tone === 'fail' ? 'exclamation-circle' : 'clock'} size={14} />
             {status.label}
           </span>
         )}
-        <h1 className="conv-name">
-          <bdi>{titleOf(info, id)}</bdi>
-        </h1>
+        {position >= 0 && <nav className="waiting-navigation" aria-label="Waiting sessions">
+          <span>{position + 1} / {waiting.length}{complete ? ' waiting' : ' loaded waiting'}</span>
+          {previous ? <Link to={sessionPath(previous.session_id)} aria-label="Previous waiting session">↑</Link> : <button type="button" aria-label="Previous waiting session" disabled>↑</button>}
+          {next ? <Link to={sessionPath(next.session_id)} aria-label="Next waiting session">↓</Link> : <button type="button" aria-label="Next waiting session" disabled>↓</button>}
+        </nav>}
+        {toggleDetails && <button ref={detailsTrigger} className="btn btn-ghost btn-sm session-details-toggle" type="button" aria-label="Session details" aria-pressed={detailsOpen} onClick={toggleDetails}><Glyph name="view-columns" size={16} /><span>Details</span></button>}
         {menu}
       </div>
       {info && (
@@ -70,9 +91,10 @@ export default function SessionHeader({ id, info, hostName, plan, narrow, menu }
           </span>
           {hostName && (
             <span className="meta-pill" aria-label="Host">
-              <Icon.Cpu size={12} /> <bdi>{hostName}</bdi>
+              <Icon.Cpu size={12} /> <bdi>{hostName}</bdi>{hostConnected !== undefined && <span className={hostConnected ? 'host-connected' : 'host-disconnected'}>{hostConnected ? 'Online' : 'Offline'}</span>}
             </span>
           )}
+          <span className="meta-pill meta-cwd" title={info.cwd} aria-label="Project"><bdi>{info.cwd}</bdi></span>
           {info.git_branch && (
             <span className="meta-pill" aria-label="Branch">
               <Icon.Branch size={12} /> <bdi>{info.git_branch}</bdi>
@@ -89,6 +111,8 @@ export default function SessionHeader({ id, info, hostName, plan, narrow, menu }
               <bdi>{info.mode}</bdi>
             </span>
           )}
+          {delivery && <span className="meta-pill">{delivery.servers} MCP servers</span>}
+          {info.family && (info.family.parent || info.family.child_counts.total > 0) && <button type="button" className="meta-toggle" onClick={toggleDetails}>Family{info.family.child_counts.total > 0 ? ` · ${info.family.child_counts.total}` : ''}</button>}
           {info.lifecycle === 'failed' && info.failure_reason && (
             <span className="meta-item">
               Reason: <bdi>{reasonWords('start_failed', info.failure_reason)}</bdi>
@@ -97,7 +121,6 @@ export default function SessionHeader({ id, info, hostName, plan, narrow, menu }
         </div>
       )}
     </header>
-      {plan && <StepList entries={plan.entries} truncated={plan.truncated} open={narrow ? false : undefined} />}
     </>
   )
 }
diff --git a/web/src/components/SessionMenu.family.test.tsx b/web/src/components/SessionMenu.family.test.tsx
index 6bbe66b..f574201 100644
--- a/web/src/components/SessionMenu.family.test.tsx
+++ b/web/src/components/SessionMenu.family.test.tsx
@@ -14,5 +14,5 @@ it('warns about retained family copies before deleting, with authorized encoded
   expect(within(dialog).getByText('Copies already delivered to related sessions remain in their transcripts. Those sessions are kept.', { exact: true })).toBeInTheDocument()
   expect(within(dialog).getByRole('link', { name: '<b>Worker</b>' })).toHaveAttribute('href', '/sessions/child%2F1')
   expect(dialog.querySelector('b')).toBeNull()
-  expect(s.calls).toHaveLength(0)
+  expect(s.calls).toEqual([expect.objectContaining({ method: 'GET', path: '/api/sessions/parent/idle-hold' })])
 })
diff --git a/web/src/components/SessionMenu.pin.test.tsx b/web/src/components/SessionMenu.pin.test.tsx
new file mode 100644
index 0000000..005660c
--- /dev/null
+++ b/web/src/components/SessionMenu.pin.test.tsx
@@ -0,0 +1,56 @@
+import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
+import { describe, expect, it } from 'vitest'
+import { json, routed } from '../test-stream'
+import SessionMenu from './SessionMenu'
+
+const initial = { pinned: false, family_active: true, notices_pending: true, held: true }
+function show(server: ReturnType<typeof routed>, id = 'session/1') {
+  return render(<SessionMenu id={id} lifecycle="active" canPark onDeleted={() => {}} />, { wrapper: server.wrapper })
+}
+
+describe('operator idle pin', () => {
+  it('reads on opening and persists the operator choice with the encoded id, while explaining family holds separately', async () => {
+    let pinned = false
+    const server = routed(call => { if (call.method === 'PATCH') pinned = true; return json({ ...initial, pinned }) })
+    show(server)
+    expect(server.calls).toHaveLength(0)
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    const control = await screen.findByRole('switch', { name: 'Do not park' })
+    await waitFor(() => expect(control).toBeEnabled())
+    expect(control).toHaveAttribute('aria-checked', 'false')
+    expect(screen.getByRole('status')).toHaveTextContent('Kept awake for family work. Kept awake for pending updates.')
+    fireEvent.click(control)
+    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'))
+    expect(server.calls.map(c => [c.method, c.path])).toEqual([['GET', '/api/sessions/session%2F1/idle-hold'], ['PATCH', '/api/sessions/session%2F1/idle-hold']])
+    expect(JSON.parse(String(server.fetch.mock.calls[1][1]?.body))).toEqual({ pinned: true })
+    expect(screen.getByRole('status')).toHaveTextContent('Pinned by you.')
+  })
+
+  it('keeps the saved pin on refusal and never claims that family work ended when the operator unpins', async () => {
+    let fail = true
+    const server = routed(call => call.method === 'PATCH' && fail ? json({ code: 'offline' }, 503) : json({ ...initial, pinned: call.method !== 'PATCH' }))
+    show(server)
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    const control = await screen.findByRole('switch', { name: 'Do not park' })
+    await waitFor(() => expect(control).toBeEnabled())
+    fireEvent.click(control)
+    expect(await screen.findByRole('alert')).toHaveTextContent('previous preference is kept')
+    expect(control).toHaveAttribute('aria-checked', 'true')
+    fail = false; fireEvent.click(control)
+    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'false'))
+    expect(screen.getByRole('status')).toHaveTextContent('Kept awake for family work.')
+    expect(screen.getByRole('status')).not.toHaveTextContent('Automatic idle parking is enabled.')
+  })
+
+  it('fences a late read after the menu was closed and reopened', async () => {
+    let finish!: (response: Response) => void, reads = 0
+    const late = new Promise<Response>(resolve => { finish = resolve })
+    const server = routed(() => ++reads === 1 ? late : json({ ...initial, pinned: true }))
+    show(server)
+    const trigger = screen.getByRole('button', { name: 'Session actions' })
+    fireEvent.click(trigger); fireEvent.click(trigger); fireEvent.click(trigger)
+    await waitFor(() => expect(screen.getByRole('switch', { name: 'Do not park' })).toHaveAttribute('aria-checked', 'true'))
+    await act(async () => { finish(json(initial)); await late })
+    expect(screen.getByRole('switch', { name: 'Do not park' })).toHaveAttribute('aria-checked', 'true')
+  })
+})
diff --git a/web/src/components/SessionMenu.tsx b/web/src/components/SessionMenu.tsx
index 6674cc9..991ef37 100644
--- a/web/src/components/SessionMenu.tsx
+++ b/web/src/components/SessionMenu.tsx
@@ -18,7 +18,7 @@ import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
 import { ApiFailure } from '../api/errors'
 import { close, deleteSession, park } from '../api/turns'
 import { useClient } from '../app-client'
-import type { DeleteResult } from '../generated/protocol'
+import type { DeleteResult, IdleHoldState } from '../generated/protocol'
 import type { FamilySummary } from '../generated/view'
 import { Link } from '../router'
 import { agentLabel } from '../lib/agent'
@@ -50,12 +50,38 @@ export default function SessionMenu({ id, lifecycle, family, canPark, onDeleted,
   const [confirming, setConfirming] = useState(false)
   const [busy, setBusy] = useState(false)
   const [error, setError] = useState<string | null>(null)
+  const [hold, setHold] = useState<IdleHoldState | null>(null)
+  const [pinBusy, setPinBusy] = useState(false)
+  const pinGeneration = useRef(0)
   const trigger = useRef<HTMLButtonElement>(null)
   const box = useRef<HTMLDivElement>(null)

   const showPark = lifecycle === 'active' && canPark
   const showClose = lifecycle !== undefined && lifecycle !== 'closed'

+  useEffect(() => {
+    const current = ++pinGeneration.current
+    if (!open) return
+    setHold(null); setError(null); setPinBusy(true)
+    client.request<IdleHoldState>('GET', `/api/sessions/${encodeURIComponent(id)}/idle-hold`).then(value => {
+      if (pinGeneration.current === current) setHold(value)
+    }, () => { if (pinGeneration.current === current) setError('Automatic parking settings could not be read. Reopen this menu to retry.') })
+      .finally(() => { if (pinGeneration.current === current) setPinBusy(false) })
+    return () => { pinGeneration.current++ }
+  }, [client, id, open])
+
+  const togglePin = async () => {
+    if (!hold || pinBusy) return
+    const current = pinGeneration.current
+    setPinBusy(true); setError(null)
+    try {
+      const value = await client.request<IdleHoldState>('PATCH', `/api/sessions/${encodeURIComponent(id)}/idle-hold`, { pinned: !hold.pinned })
+      if (pinGeneration.current === current) setHold(value)
+    } catch {
+      if (pinGeneration.current === current) setError('Automatic parking settings could not be saved. Your previous preference is kept.')
+    } finally { if (pinGeneration.current === current) setPinBusy(false) }
+  }
+
   // A click anywhere outside closes the menu.
   useEffect(() => {
     if (!open) return
@@ -68,7 +94,7 @@ export default function SessionMenu({ id, lifecycle, family, canPark, onDeleted,

   // Opened: focus its first entry.
   useEffect(() => {
-    if (open) box.current?.querySelector<HTMLElement>('.session-menu-list button')?.focus()
+    if (open) box.current?.querySelector<HTMLElement>('.session-menu-list button:not([disabled])')?.focus()
   }, [open])

   const dismiss = () => {
@@ -129,6 +155,8 @@ export default function SessionMenu({ id, lifecycle, family, canPark, onDeleted,
       </button>
       {open && (
         <div className="session-menu-list" id={menuId}>
+          <button type="button" role="switch" aria-checked={hold?.pinned ?? false} disabled={busy || pinBusy || hold === null} onClick={() => void togglePin()}>Do not park</button>
+          <p className="idle-hold-note" role="status">{hold ? [hold.pinned && 'Pinned by you.', hold.family_active && 'Kept awake for family work.', hold.notices_pending && 'Kept awake for pending updates.', !hold.held && 'Automatic idle parking is enabled.'].filter(Boolean).join(' ') : 'Reading automatic parking settings…'}</p>
           {showPark && (
             <button type="button" disabled={busy} onClick={() => void act(() => park(client, id), parkRefusal)}>
               Park
diff --git a/web/src/components/StatusAttention.tsx b/web/src/components/StatusAttention.tsx
index dc79a75..269de57 100644
--- a/web/src/components/StatusAttention.tsx
+++ b/web/src/components/StatusAttention.tsx
@@ -8,6 +8,7 @@ import { useClient } from '../app-client'
 import type { SessionSummary } from '../generated/view'
 import { Link } from '../router'
 import { sessionPath } from './SessionRow'
+import { attentionReason } from '../lib/attentionReason'

 interface Props {
   session: SessionSummary
@@ -84,9 +85,9 @@ export default function StatusAttention({ session, children, enabled, refreshKey
     {visible.map(row => {
       const title = sessions.get(row.child_id)?.title || row.child_id
       return <p key={row.id}>
-        <Link to={sessionPath(row.child_id)}><bdi>{title}</bdi></Link>{' · '}<bdi>{row.reason}</bdi>{' '}
+        <Link to={sessionPath(row.child_id)}><bdi>{title}</bdi></Link>{' · '}<bdi>{attentionReason(row.reason)}</bdi>{' '}
         {row.pending_id === null
-          ? <button type="button" className="btn btn-ghost btn-sm" aria-label={`Acknowledge ${row.reason} for ${title}`} disabled={ackId !== null} onClick={() => void acknowledge(row)}>{ackId === row.id ? 'Acknowledging…' : 'Acknowledge'}</button>
+          ? <button type="button" className="btn btn-ghost btn-sm" aria-label={`Acknowledge ${attentionReason(row.reason)} for ${title}`} disabled={ackId !== null} onClick={() => void acknowledge(row)}>{ackId === row.id ? 'Acknowledging…' : 'Acknowledge'}</button>
           : <Link to={`${sessionPath(row.child_id)}?pending=${encodeURIComponent(row.pending_id)}`}>Open question</Link>}
       </p>
     })}
diff --git a/web/src/components/items/QuestionCard.test.tsx b/web/src/components/items/QuestionCard.test.tsx
index 7529378..062a2ec 100644
--- a/web/src/components/items/QuestionCard.test.tsx
+++ b/web/src/components/items/QuestionCard.test.tsx
@@ -674,7 +674,8 @@ it('keeps parent-handled elicitation directly answerable and shows the server fa
   expect(screen.getByText('Waiting for an answer', { exact: true })).toBeInTheDocument()
   view.again(q, { ...env, familyQuestions: [{ pending_id: 'e1', kind: 'elicitation', handling: 'operator_required', reason: 'parent_closed' }] })
   expect(screen.getByText('Operator answer required', { exact: true })).toBeInTheDocument()
-  expect(screen.getByText('parent_closed', { exact: true })).toBeInTheDocument()
+  expect(screen.getByText('Session needs your attention', { exact: true })).toBeInTheDocument()
+  expect(screen.queryByText('parent_closed', { exact: true })).not.toBeInTheDocument()
   expect(screen.getByText('Needs your answer', { exact: true })).toBeInTheDocument()
   expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled()
 })
diff --git a/web/src/components/items/QuestionCard.tsx b/web/src/components/items/QuestionCard.tsx
index 66ecb4b..bf58a51 100644
--- a/web/src/components/items/QuestionCard.tsx
+++ b/web/src/components/items/QuestionCard.tsx
@@ -28,6 +28,7 @@ import { useAnswerState, useFormDraft } from '../../store/useAnswer'
 import Elicitation from './Elicitation'
 import { handlingWords } from '../FamilyPanel'
 import type { ItemEnv, ItemOf } from './types'
+import { attentionReason } from '../../lib/attentionReason'

 type Question = ItemOf<'question'>

@@ -153,7 +154,7 @@ export default function QuestionCard({ item, env }: Props) {
           <Elicitation request={request} live={live} busy={d.busy} draft={draft} onDraft={onDraft} onAnswer={answer} />
         </>
       )}
-      {item.answerable && routing && <p className="q-routing"><span>{handlingWords(routing.handling)}</span>{routing.reason && <> · <bdi>{routing.reason}</bdi></>}</p>}
+      {item.answerable && routing && <p className="q-routing"><span>{handlingWords(routing.handling)}</span>{routing.reason && <> · <bdi>{attentionReason(routing.reason)}</bdi></>}</p>}
       <p className="q-state">
         <span>{stateText}</span>
         {d.note && <span className="q-note">{d.note}</span>}
diff --git a/web/src/screens/Session.actions.test.tsx b/web/src/screens/Session.actions.test.tsx
new file mode 100644
index 0000000..a19adb9
--- /dev/null
+++ b/web/src/screens/Session.actions.test.tsx
@@ -0,0 +1,34 @@
+import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
+import { expect, it } from 'vitest'
+import { AppActionsProvider, useAppActions, type AppActions } from '../app-actions'
+import { deriveAccent } from '../lib/accent'
+import { setAppearance } from '../lib/theme'
+import { json } from '../test-stream'
+import SessionView from './Session'
+import { FAST, sessionServer } from './test-session'
+
+it('registers actual session context and actions, scopes its server hat, and removes handlers on unmount', async () => {
+  const server = sessionServer({ hats: () => json([{ id: 'hat1', name: 'Project hat', colour: '#e51595' }]) })
+  let actions!: AppActions
+  function Read() { actions = useAppActions()!; return null }
+  const view = render(<AppActionsProvider><Read /><SessionView id="s1" timing={FAST} /></AppActionsProvider>, { wrapper: server.wrapper })
+  await waitFor(() => expect(actions.context()).toMatchObject({ sessionId: 's1', hostId: 'h1', cwd: '/srv/work/project', hatId: 'hat1' }))
+  await waitFor(() => expect(document.querySelector('.session-hat')).toHaveTextContent('Project hat'))
+  const session = document.querySelector<HTMLElement>('.session')!
+  expect(session.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#e51595').light.accent)
+  act(() => setAppearance('dark'))
+  expect(session.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#e51595').dark.accent)
+  act(() => { actions.dispatch('toggle-details') })
+  expect(screen.getByRole('tab', { name: 'Family' })).toBeVisible()
+  act(() => { actions.dispatch('focus-composer') })
+  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus()
+  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'keep draft' } })
+  act(() => { actions.dispatch('toggle-details') })
+  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('keep draft')
+  expect(server.streams).toHaveLength(1)
+  view.unmount()
+  expect(actions.dispatch('toggle-details')).toBe(false)
+  expect(actions.dispatch('focus-composer')).toBe(false)
+  expect(actions.context()).toEqual({})
+  act(() => setAppearance('system'))
+})
diff --git a/web/src/screens/Session.family.test.tsx b/web/src/screens/Session.family.test.tsx
index 9c21105..d28b7a8 100644
--- a/web/src/screens/Session.family.test.tsx
+++ b/web/src/screens/Session.family.test.tsx
@@ -1,4 +1,4 @@
-import { act, render, screen, waitFor } from '@testing-library/react'
+import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
 import { expect, it } from 'vitest'
 import { json, liveStream, routed } from '../test-stream'
 import { familyPage } from '../test-family'
@@ -18,6 +18,7 @@ it('loads family state for a notification deep link with no list summary, and in
     return json({ code: 'not_found', message: 'no' }, 404)
   })
   render(<SessionView id="parent" timing={{ retryMs: () => 1 }} />, { wrapper: s.wrapper })
+  fireEvent.click(screen.getByRole('button', { name: 'Session details' }))
   expect(await screen.findByRole('region', { name: 'Session family' })).toBeInTheDocument()
   expect(screen.getByText('Waiting on children', { exact: true })).toBeInTheDocument()
   await waitFor(() => expect(streams).toHaveLength(1))
diff --git a/web/src/screens/Session.menu.test.tsx b/web/src/screens/Session.menu.test.tsx
index 06f0ead..d757298 100644
--- a/web/src/screens/Session.menu.test.tsx
+++ b/web/src/screens/Session.menu.test.tsx
@@ -48,7 +48,7 @@ describe('SessionView: the header menu', () => {
     expect(trigger()).toHaveAttribute('aria-expanded', 'false')
     expect(document.querySelector('.session-menu-list')).toBeNull()
     openMenu()
-    expect(entries()).toEqual(['Park', 'Close', 'Delete session'])
+    expect(entries()).toEqual(['Do not park', 'Park', 'Close', 'Delete session'])
     // Opened from a click or a key, focus goes to its first entry.
     expect(screen.getByRole('button', { name: 'Park' })).toHaveFocus()
   })
@@ -56,13 +56,13 @@ describe('SessionView: the header menu', () => {
   it('offers no Park when the host does not announce it', async () => {
     await show({}, { hosts: () => json([{ host_id: 'h1', name: 'build-box', capabilities: ['images'] }]) })
     openMenu()
-    expect(entries()).toEqual(['Close', 'Delete session'])
+    expect(entries()).toEqual(['Do not park', 'Close', 'Delete session'])
   })

   it('offers no Park while the host’s capabilities are unknown', async () => {
     await show({}, { hosts: () => json([{ host_id: 'h1', name: 'build-box' }]) })
     openMenu()
-    expect(entries()).toEqual(['Close', 'Delete session'])
+    expect(entries()).toEqual(['Do not park', 'Close', 'Delete session'])
   })

   it.each([
@@ -73,7 +73,7 @@ describe('SessionView: the header menu', () => {
   ])('a %s session offers no Park; a closed one no Close', async (lifecycle, offered) => {
     await show({ lifecycle })
     openMenu()
-    expect(entries()).toEqual(offered)
+    expect(entries()).toEqual(['Do not park', ...offered])
   })

   it('Park parks the session, and the menu closes with focus back on its button', async () => {
diff --git a/web/src/screens/Session.test.tsx b/web/src/screens/Session.test.tsx
index 409a694..9a37f6f 100644
--- a/web/src/screens/Session.test.tsx
+++ b/web/src/screens/Session.test.tsx
@@ -262,6 +262,7 @@ describe('SessionView', () => {
       resume: () => { count = 2; return json({ session_id: ID, lifecycle: 'active' }, 202) },
     })
     render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
+    await showDetailsTab('Details')
     await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('1 MCP servers.'))
     fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
     await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('2 MCP servers.'))
@@ -325,6 +326,7 @@ describe('SessionView', () => {
     expect(screen.getByText('Waiting on a question')).toBeInTheDocument()
     await screen.findByText('t5-0')
     expect(s.of(DETAIL)).toHaveLength(1)
+    await showDetailsTab('Details')
     expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
   })

@@ -386,13 +388,14 @@ describe('SessionView', () => {
     }
   })

-  it('shows the newest plan’s steps in the header', async () => {
+  it('shows the newest plan’s steps in the Plan tab', async () => {
     const plan = (id: string, step: string) =>
       ({ id, version: 1, ts: '2026-10-02T10:00:00.000Z', turn_id: 't5', kind: 'plan', entries: [{ content: step, status: 'in_progress' }] }) as Item
     const s = server({ pages: [() => json(page([plan('p1', 'old step'), plan('p2', 'new step')]))] })
     const { container } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
     await screen.findAllByText('new step')
-    const header = container.querySelector('.session > .steps') as HTMLElement
+    await showDetailsTab('Plan')
+    const header = container.querySelector('.session-details .steps') as HTMLElement
     expect(within(header).getAllByText('new step').length).toBeGreaterThan(0)
     expect(within(header).queryByText('old step')).toBeNull()
   })
@@ -407,11 +410,11 @@ describe('SessionView', () => {
     await waitFor(() => expect(container.querySelector('.marker')?.textContent).toContain('from Work to Home'))
   })

-  it('fetches no hats when no item names one', async () => {
+  it('reads hats once for the actual session accent even without a reassignment', async () => {
     const s = server({ pages: [() => json(page(rows(1, 't5')))] })
     render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
     await screen.findByText('t5-0')
-    expect(s.of('/api/hats')).toHaveLength(0)
+    expect(s.of('/api/hats')).toHaveLength(1)
   })

   it('has a way back to the list', async () => {
@@ -420,7 +423,7 @@ describe('SessionView', () => {
     expect(await screen.findByRole('link', { name: 'Back to sessions' })).toHaveAttribute('href', '/sessions')
   })

-  it('starts the header’s steps closed on a phone', async () => {
+  it('keeps the phone details closed and the transcript plan reachable', async () => {
     window.matchMedia = vi.fn().mockImplementation((query: string) => ({
       matches: query === '(max-width: 767px)',
       addEventListener: () => {},
@@ -430,7 +433,8 @@ describe('SessionView', () => {
     const s = server({ pages: [() => json(page([plan]))] })
     const { container } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
     await screen.findAllByText('a')
-    expect((container.querySelector('.session > .steps') as HTMLDetailsElement).open).toBe(false)
+    expect(screen.getByRole('button', { name: 'Session details' })).toHaveAttribute('aria-pressed', 'false')
+    expect(screen.queryByRole('tab', { name: 'Plan' })).not.toBeInTheDocument()
     expect((container.querySelector('.transcript .steps') as HTMLDetailsElement).open).toBe(true)
   })
 })
@@ -550,3 +554,8 @@ describe('the tail window', () => {
     expect(scroller().scrollTop).toBe(4 * ROW - VIEW)
   })
 })
+
+async function showDetailsTab(name: 'Family' | 'Plan' | 'Details') {
+  fireEvent.click(screen.getByRole('button', { name: 'Session details' }))
+  fireEvent.click(await screen.findByRole('tab', { name }))
+}
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index eb31cec..9fdc86c 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -48,8 +48,12 @@ import { Composer, type ComposerHandle } from '../components/Composer'
 import { ANSWER_LABEL, answerAsMessage } from '../components/composerWords'
 import SessionFooter from '../components/SessionFooter'
 import SessionHeader, { type HeaderInfo } from '../components/SessionHeader'
-import McpDelivery from '../components/McpDelivery'
 import FamilyPanel from '../components/FamilyPanel'
+import SessionDetails from '../components/SessionDetails'
+import { useSessionScope } from '../components/SessionScope'
+import { useRegisterAction, useRegisterContext } from '../app-actions'
+import { useAccentStyle } from '../lib/theme'
+import { takeOver } from '../api/view'
 import { Text } from '../lib/text'
 import { useMcpDelivery } from '../hooks/useMcpDelivery'
 import SessionMenu from '../components/SessionMenu'
@@ -231,6 +235,14 @@ function useTailWindow(items: Item[], loads: number, size: number, pending?: str

 export default function SessionView({ id, summary, awaitSummary = false, tail = TAIL, timing, onRemoved }: Props) {
   const client = useClient()
+  const scope = useSessionScope()
+  const [detailsOpen, setDetailsOpen] = useState(false)
+  const detailsTrigger = useRef<HTMLButtonElement>(null)
+  const toggleDetails = useCallback(() => setDetailsOpen(open => !open), [])
+  const closeDetails = useCallback(() => setDetailsOpen(false), [])
+  const [familyRefresh, setFamilyRefresh] = useState(0)
+  const [taking, setTaking] = useState(false)
+  const [takeError, setTakeError] = useState<string | null>(null)
   const s = useSessionItems(id, timing)
   const mcp = useMcpDelivery(id, summary?.lifecycle, Math.max(0, s.loads - 1))
   const [familyRead, setFamilyRead] = useState<{ id: string; page: FamilyPage } | null>(null)
@@ -260,9 +272,10 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   const narrow = useMediaQuery('(max-width: 767px)')
   const hostItems = useList('hosts', true)
   const hosts = useMemo(() => namesOf(hostItems, 'host_id'), [hostItems])
-  const wantsHats = useMemo(() => s.items.some((i) => i.kind === 'marker' && i.marker === 'hat_reassigned'), [s.items])
-  const hatItems = useList('hats', wantsHats)
-  const hats = useMemo(() => namesOf(hatItems, 'id'), [hatItems])
+  const hatItems = useList('hats', scope === null)
+  const hats = useMemo(() => scope?.hats ? new Map(scope.hats.map(h => [h.id, h.name])) : namesOf(hatItems, 'id'), [scope?.hats, hatItems])
+  const actualHat = (scope?.hats ?? (Array.isArray(hatItems) ? hatItems as { id: string; colour: string; name: string }[] : [])).find(h => h.id === info?.hat_id)
+  const accent = useAccentStyle(actualHat?.colour)
   const plan = useMemo(() => latestPlan(s.items), [s.items])
   const startNotice = useStartNotice(id)
   const answers = useAnswering(id, info, s.items, s.loading, s.loads, connectedOf(hostItems, info?.host_id), s.mergeQuestion, s.pinned)
@@ -272,6 +285,21 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   // The composer's handle: the item seams reach the draft through it, and
   // stay the same functions for as long as the view is shown.
   const composer = useRef<ComposerHandle>(null)
+  const focusComposer = useCallback(() => composer.current?.focus(), [])
+  const openProject = useCallback(() => {
+    if (info) navigate(`/new?host=${encodeURIComponent(info.host_id)}&cwd=${encodeURIComponent(info.cwd)}`)
+  }, [info])
+  useRegisterAction('toggle-details', { label: 'Toggle session details', enabled: !s.removed, run: toggleDetails })
+  useRegisterAction('focus-composer', { label: 'Focus composer', enabled: !s.removed, run: focusComposer })
+  useRegisterAction('new-session', { label: 'New session in this project', enabled: !s.removed && !!info, run: openProject })
+  useRegisterContext({ sessionId: s.removed ? undefined : id, hostId: s.removed ? undefined : info?.host_id, cwd: s.removed ? undefined : info?.cwd, hatId: s.removed ? undefined : info?.hat_id })
+  const takeover = async () => {
+    if (taking) return
+    setTaking(true); setTakeError(null)
+    try { await takeOver(client, id); setFamilyRefresh(n => n + 1) }
+    catch { setTakeError('This session could not be taken over. Try again.') }
+    finally { setTaking(false) }
+  }
   const onSendAgain = useCallback((item: Extract<Item, { kind: 'marker' }>) => {
     if (item.about_turn) void composer.current?.refill(item.about_turn)
   }, [])
@@ -358,13 +386,19 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   }

   return (
-    <div className="session" ref={questionRegion}>
+    <div className="session hn-accent-scope" style={accent} ref={questionRegion}>
       <SessionHeader
         id={id}
         info={info}
         hostName={info ? hosts.get(info.host_id) : undefined}
         plan={plan}
         narrow={narrow}
+        hatName={actualHat?.name}
+        hostConnected={connectedOf(hostItems, info?.host_id)}
+        delivery={mcp.detail?.mcp_delivery}
+        detailsOpen={detailsOpen}
+        toggleDetails={toggleDetails}
+        detailsTrigger={detailsTrigger}
         menu={
           <SessionMenu
             id={id}
@@ -376,8 +410,9 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
           />
         }
       />
-      <FamilyPanel key={id} id={id} summary={summary} hosts={hosts} resync={Math.max(0, s.loads - 1)} onPage={onFamilyPage} />
-      <McpDelivery agent={info?.agent ?? mcp.detail?.agent} delivery={mcp.detail?.mcp_delivery} />
+      {info?.family?.parent && family?.routing === 'active' && <div className="parent-banner" role="region" aria-label="Parent-driven session"><p>Driven by <Link to={`/sessions/${encodeURIComponent(info.family.parent.session_id)}`}><bdi>{info.family.parent.title || 'parent session'}</bdi></Link>. Answers go to this child. A prompt from you takes over this session.</p><button type="button" className="btn btn-ghost btn-sm" disabled={taking} onClick={() => void takeover()}>{taking ? 'Taking over…' : 'Take over'}</button>{takeError && <p role="alert">{takeError}</p>}</div>}
+      <div className="session-workspace">
+      <div className="session-conversation">
       {mcp.error && <p className="form-error"><Text>{mcp.error}</Text></p>}
       <div className="stream-state" role="status">
         {s.stream === 'reconnecting' ? 'Reconnecting…' : s.resynced ? 'Resynced' : ''}
@@ -430,6 +465,11 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
           onResume={onResume}
         />
       )}
+      </div>
+      <SessionDetails open={detailsOpen} onClose={closeDetails} trigger={detailsTrigger} info={info} hostName={info ? hosts.get(info.host_id) : undefined} hatName={actualHat?.name} plan={plan} delivery={mcp.detail?.mcp_delivery}>
+        <FamilyPanel key={id} id={id} summary={summary} hosts={hosts} resync={Math.max(0, s.loads - 1) + familyRefresh} onPage={onFamilyPage} />
+      </SessionDetails>
+      </div>
     </div>
   )
 }
diff --git a/web/src/styles/session.css b/web/src/styles/session.css
index 4c28b08..3010a56 100644
--- a/web/src/styles/session.css
+++ b/web/src/styles/session.css
@@ -316,3 +316,127 @@ li.q-opt-reject { border-color:var(--st-attn); color:var(--st-attn); }
 .family-attention { margin-block: .65rem; padding-block: .5rem; border-bottom: 1px solid var(--border); }
 .family-attention h2 { font-weight: 600; }
 .family-attention p { margin-block: .35rem; overflow-wrap: anywhere; }
+
+/* UI R3: one conversation column and an optional 300px information panel. */
+.session { min-width:0; background:var(--hn-bg); }
+.session-workspace { display:flex; flex:1; min-height:0; min-width:0; }
+.session-conversation { display:flex; flex-direction:column; flex:1; min-height:0; min-width:0; }
+.session .transcript { min-height:0; padding:24px 24px 12px; }
+.session .transcript-inner,.composer-inner { max-width:760px; }
+.conv-head { padding:0; background:var(--hn-panel); }
+.conv-title-row { min-height:52px; padding:6px 24px; gap:8px; }
+.conv-name { font-size:18px; font-weight:500; }
+.back-btn { display:inline-flex; align-items:center; justify-content:center; flex:none; width:28px; height:28px; border:0; border-radius:6px; color:var(--hn-fg-2); }
+.session-hat { display:inline-flex; align-items:center; gap:6px; max-width:100px; font-size:12px; color:var(--hn-fg-3); }
+.session-hat bdi { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
+.session-hat > span { width:8px; height:8px; flex:none; border-radius:2px; background:var(--hn-accent); }
+.session-head .badge { gap:4px; white-space:nowrap; }
+.conv-meta { border-top:1px solid var(--hn-line); margin:0; padding:7px 24px; gap:8px 16px; font-size:12px; }
+.meta-pill { border:0; border-radius:0; background:transparent; padding:0; font-size:12px; font-family:var(--font-body); color:var(--hn-fg-2); }
+.meta-cwd { max-width:32ch; }
+.meta-cwd bdi { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
+.host-connected { color:var(--st-run-fg); }
+.host-disconnected { color:var(--st-park-fg); }
+.session-menu { margin-left:0; }
+.session-menu-btn { width:28px; height:28px; border:0; background:transparent; }
+.session-menu-list { box-shadow:var(--hn-pop-shadow); border-color:var(--hn-control-strong); max-width:min(300px,90vw); }
+.session-menu-list [role=switch][aria-checked=true] { color:var(--hn-accent-fg); background:var(--hn-accent-wash); }
+.idle-hold-note { margin:4px 12px 8px; color:var(--hn-fg-3); font-size:12px; line-height:1.5; }
+.waiting-navigation { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--hn-fg-3); white-space:nowrap; }
+.waiting-navigation a,.waiting-navigation button { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:1px solid var(--hn-control-strong); border-radius:6px; color:var(--hn-fg-2); }
+.waiting-navigation button:disabled { opacity:.5; }
+.parent-banner { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:8px 24px; background:var(--hn-sunken); border-bottom:1px solid var(--hn-line); font-size:12px; color:var(--hn-fg-2); }
+.parent-banner p { flex:1; margin:0; min-width:160px; }
+.parent-banner a { color:var(--hn-accent-fg); text-decoration:underline; }
+.parent-banner button { flex:none; }
+.session-details-wrap { width:300px; flex:none; min-height:0; border-left:1px solid var(--hn-line); background:var(--hn-panel); }
+.session-details-wrap[hidden] { display:none; }
+.session-details { height:100%; overflow-y:auto; padding:16px; min-width:0; }
+.session-details-heading { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
+.session-details-heading h2 { flex:1; margin:0; font:500 15px/1.3 var(--font-display); }
+.session-detail-tabs { display:flex; border-bottom:1px solid var(--hn-line); margin-bottom:16px; }
+.session-detail-tabs button { flex:1; border:0; border-bottom:2px solid transparent; padding:10px 4px; color:var(--hn-fg-2); font:500 13px var(--font-display); background:transparent; }
+.session-detail-tabs [aria-selected=true] { color:var(--hn-accent-fg); border-bottom-color:var(--hn-accent); }
+.session-details [role=tabpanel][hidden] { display:none; }
+.session-facts { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; font-size:12px; }
+.session-facts dt { color:var(--hn-fg-3); }
+.session-facts dd { margin:0; color:var(--hn-fg-1); overflow-wrap:anywhere; }
+.session-details .family-panel { max-height:none; overflow:visible; padding:0; border:0; font-size:13px; }
+.family-child { border:1px solid var(--hn-line); border-radius:8px; padding:12px; margin-top:12px; background:var(--hn-surface); }
+.family-meta { font-size:12px; color:var(--hn-fg-3); }
+.session-details .mcp-delivery { margin:16px 0; padding:12px; font-size:12px; }
+.session-details .steps { border:0; background:transparent; }
+.session-details .steps summary { padding:4px 0 12px; }
+.session-details .steps ol { padding:0 0 0 20px; gap:12px; }
+.session-details .steps li::marker { color:var(--hn-fg-3); }
+.session-details .steps li.on { color:var(--hn-accent-fg); }
+.session-details .steps li.done { color:var(--hn-fg-3); }
+.session-details-wrap.is-sheet { width:0; border:0; }
+.session-details-scrim { position:fixed; inset:0; z-index:45; background:var(--hn-scrim); display:flex; align-items:flex-end; justify-content:center; }
+.is-sheet .session-details { position:relative; width:min(100%,560px); height:auto; max-height:calc(100dvh - 48px); border-radius:20px 20px 0 0; padding:12px 16px max(20px,env(safe-area-inset-bottom)); background:var(--hn-panel); box-shadow:var(--hn-pop-shadow); }
+.is-sheet .session-details::before { content:''; display:block; width:36px; height:4px; background:var(--hn-control-strong); border-radius:3px; margin:0 auto 10px; }
+.msg { gap:10px; margin-bottom:20px; }
+.avatar { width:24px; height:24px; border-radius:6px; font-size:10px; }
+.avatar-ai { background:var(--hn-accent-wash); color:var(--hn-accent-fg); }
+.msg-head { gap:8px; margin-bottom:6px; }
+.msg-who { font:500 12px var(--font-display); }
+.msg-when { font-size:11px; color:var(--hn-fg-3); }
+.bubble { background:transparent; border:0; padding:0; box-shadow:none; font-size:14px; line-height:1.6; }
+.bubble.user { background:var(--hn-sunken); border:1px solid var(--hn-line); padding:12px 16px; border-radius:8px; }
+.bubble code { color:var(--hn-code-fg); background:var(--hn-code-bg); border:0; border-radius:4px; padding:2px 4px; }
+.bubble a { color:var(--hn-accent-fg); }
+.tool-line { background:var(--hn-surface); border-color:var(--hn-line); padding:10px 12px; border-radius:6px; font-size:13px; }
+.tool-name { font-weight:500; }
+.think-body { background:transparent; border:0; padding:8px 12px; font-style:italic; }
+.composer { padding:12px 24px 16px; background:var(--hn-bg); }
+.composer-controls { gap:8px 12px; margin-bottom:8px; }
+.switcher { letter-spacing:0; text-transform:none; font-weight:500; font-size:12px; color:var(--hn-fg-3); max-width:100%; min-width:0; }
+.switcher select { max-width:180px; min-width:0; border-color:var(--hn-control-strong); background:var(--hn-surface); font-size:12px; font-weight:400; padding:5px 8px; }
+.composer-box { border:1px solid var(--hn-control-strong); padding:6px 6px 6px 12px; border-radius:12px; }
+.composer-box textarea { min-width:0; }
+.send-btn { background:var(--hn-accent); color:var(--hn-on-accent); box-shadow:none; width:32px; height:32px; border-radius:8px; }
+.send-btn:hover:not(:disabled) { background:var(--hn-accent-hover); transform:none; }
+.ask { padding:16px; border:1px solid var(--st-wait-line); border-radius:12px; box-shadow:none; background:var(--hn-surface); }
+.ask-eyebrow .e-tag { color:var(--st-wait-fg); font-size:11px; letter-spacing:.02em; }
+.ask-q { font-size:15px; font-weight:500; line-height:1.5; overflow-wrap:anywhere; }
+.ask.stale { opacity:1; color:var(--hn-fg-2); background:var(--hn-sunken); }
+.q-state { font-weight:500; font-size:12px; }
+.q-note { color:var(--hn-fg-3); }
+.ask:focus-visible { outline-color:var(--hn-focus); }
+.elic-opt { min-height:44px; border-color:var(--hn-control-strong); background:var(--hn-surface); border-radius:8px; padding:12px; }
+.elic-opt.sel { border-color:var(--hn-accent); background:var(--hn-accent-wash); padding:11px; }
+.elic-text { border-color:var(--hn-control-strong); border-radius:8px; background:var(--hn-surface); }
+.tool-diff .diff-old { color:var(--hn-del-fg); background:var(--hn-del-bg); }
+.tool-diff .diff-new { color:var(--hn-add-fg); background:var(--hn-add-bg); }
+@media (max-width:767px) {
+  .conv-title-row { padding:4px 8px; gap:4px; flex-wrap:wrap; }
+  .conv-title-row .back-btn { width:44px; height:44px; border:0; background:transparent; }
+  .session-head .conv-name { flex:1; font-size:16px; }
+  .session-hat { display:none; }
+  .session-head .badge { order:5; margin:0 0 4px 44px; }
+  .waiting-navigation { order:6; margin-left:auto; }
+  .waiting-navigation a,.waiting-navigation button { width:44px; height:44px; }
+  .session-menu-btn,.session-details-toggle { min-width:44px; min-height:44px; }
+  .session-details-toggle span { display:none; }
+  .conv-meta { padding:6px 16px; gap:6px 12px; max-height:76px; overflow:auto; }
+  .meta-pill { font-size:11px; }
+  .meta-toggle { min-height:44px; }
+  .parent-banner { padding:8px 16px; }
+  .parent-banner button { min-height:44px; }
+  .session .transcript { padding:16px 16px 8px; }
+  .bubble { font-size:15px; }
+  .composer { padding:8px 16px max(12px,env(safe-area-inset-bottom)); }
+  .composer-controls { max-height:112px; overflow-y:auto; }
+  .switcher { min-height:44px; }
+  .switcher select { min-height:44px; max-width:150px; font-size:16px; }
+  .composer-box textarea { font-size:16px; }
+  .attach-btn,.send-btn { width:44px; height:44px; }
+  .att-chip { width:64px; height:64px; }
+  .att-x { width:44px; height:44px; top:0; right:0; }
+  .composer-hint:has(kbd) { display:none; }
+  .q-opts .btn,.ask-actions .btn { min-height:48px; justify-content:center; }
+  .elic-opts { flex-direction:column; }
+  .elic-opt { min-height:56px; width:100%; }
+  .elic-text { min-height:44px; font-size:16px; }
+  .is-sheet .session-detail-tabs button,.is-sheet .session-details-heading button { min-height:44px; }
+}
```

Task verification (dev shell): pnpm --dir web typecheck; pnpm --dir web test src/screens/Session.test.tsx src/screens/Session.menu.test.tsx src/components/FamilyPanel.test.tsx src/components/FamilyPanel.attention.test.tsx src/components/SessionDetails.test.tsx src/components/SessionMenu.pin.test.tsx src/screens/Session.actions.test.tsx.

## Task 2: Canonical answers, read-back and acceptance

- [x] Keep forms/AnswerBook canonical, add the adaptive answer region and truthful local acknowledgement, protect pointer gestures and focused-card keyboard actions.
- [x] Extract SessionConfig, use offered effort values, display pending/actual state and explain mismatch/refusal without overwriting drafts or preferences.
- [x] Restyle transcript/tool/diff/plan/composer/footer geometry with scoped semantic tokens; add actual current/sibling family cards and bounded explicit sibling reads.
- [x] Add browser/capture coverage, retain real host/producer tests and unchanged window/reveal assertions. Run changed browser suites before committing.
- [x] Inspect staged tested bytes, commit feat(ui): preserve canonical answers in the redesigned session, push plan/ui-r3. Parent review pending.

Apply this exact patch after Task 1:

```diff
diff --git a/web/e2e/family.spec.ts b/web/e2e/family.spec.ts
index 1f6c323..a33ec3e 100644
--- a/web/e2e/family.spec.ts
+++ b/web/e2e/family.spec.ts
@@ -99,9 +99,9 @@ for (const width of [1280, 390]) test(`family navigation, takeover, attention an
     const page = await context.newPage(); await page.goto(`${collector.origin}/sessions/parent`)
     await expect(page.locator('.session-head .badge')).toHaveText('Waiting on children')
     const family = page.getByRole('region', { name: 'Session family', exact: true })
-    await family.locator('summary').click()
+    await page.getByRole('button', { name: 'Session details', exact: true }).click()
     const child = family.getByRole('article', { name: 'Parser worker', exact: true })
-    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'spawn: accepted', 'Parent is handling']) {
+    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'Start child: Accepted', 'Parent is handling']) {
       await expect(child.getByText(text, { exact: true })).toBeVisible()
     }
     await family.getByRole('button', { name: 'Load more children', exact: true }).click()
@@ -112,12 +112,13 @@ for (const width of [1280, 390]) test(`family navigation, takeover, attention an
     await expect(card.getByText('Parent is handling', { exact: true })).toBeVisible()
     await expect(card.getByRole('button', { name: 'Decline', exact: true })).toBeEnabled()
     await expect(page.getByRole('status', { name: '1 waiting on you', exact: true })).toHaveCount(0)
-    await family.locator('summary').click()
+    await page.getByRole('button', { name: 'Session details', exact: true }).click()
     const take = family.getByRole('button', { name: 'Take over', exact: true })
     if (width === 390) expect((await take.boundingBox())!.height).toBeGreaterThanOrEqual(44)
     await take.click()
+    await page.getByRole('button', { name: 'Close session details', exact: true }).click()
     await expect(card.getByText('Operator answer required', { exact: true })).toBeVisible()
-    await expect(card.getByText('operator_takeover', { exact: true })).toBeVisible()
+    await expect(card.getByText('You took over this session', { exact: true })).toBeVisible()
     await expect(page.locator('.session-head .badge')).toHaveText('Waiting on you')
     await expect(page.getByRole('status', { name: '1 waiting on you', exact: true }).first()).toBeVisible()
     const before = f.familyReads()
@@ -125,6 +126,7 @@ for (const width of [1280, 390]) test(`family navigation, takeover, attention an
     await expect.poll(f.familyReads).toBeGreaterThan(before)
     await expect(card.getByText('Operator answer required', { exact: true })).toBeVisible()
     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
+    if (width === 390) await card.getByRole('button', { name: 'Write a prompt', exact: true }).click()
     const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true })
     await expect(prompt).toBeInViewport()
     expect(f.answers()).toBe(0)
@@ -165,16 +167,16 @@ test('phone status-only child attention can be acknowledged without an answer ca
   try {
     const page = await context.newPage(); await page.goto(`${collector.origin}/sessions/parent`)
     const family = page.getByRole('region', { name: 'Session family', exact: true })
-    await family.locator('summary').click()
-    const attention = page.getByRole('region', { name: 'Delegation attention', exact: true })
-    await expect(attention.getByText('child_failed', { exact: true })).toBeVisible()
+    await page.getByRole('button', { name: 'Session details', exact: true }).click()
+    const attention = family.getByRole('region', { name: 'Delegation attention', exact: true })
+    await expect(attention.getByText('Child session failed', { exact: true })).toBeVisible()
     await expect(attention.getByRole('link', { name: 'Parser worker', exact: true })).toHaveAttribute('href', '/sessions/child')
     await expect(page.getByRole('status', { name: '1 waiting on you', exact: true }).first()).toBeVisible()
     const before = f.familyReads()
-    const acknowledge = attention.getByRole('button', { name: 'Acknowledge child_failed for Parser worker', exact: true })
+    const acknowledge = attention.getByRole('button', { name: 'Acknowledge Child session failed for Parser worker', exact: true })
     expect((await acknowledge.boundingBox())!.height).toBeGreaterThanOrEqual(44)
     await acknowledge.click()
-    await expect(attention.getByText('child_failed', { exact: true })).toHaveCount(0)
+    await expect(attention.getByText('Child session failed', { exact: true })).toHaveCount(0)
     await expect(page.getByRole('status', { name: '1 waiting on you', exact: true })).toHaveCount(0)
     await expect.poll(f.familyReads).toBeGreaterThan(before)
     expect(f.attentionReads()).toBeGreaterThan(0)
diff --git a/web/e2e/mcp-delivery.spec.ts b/web/e2e/mcp-delivery.spec.ts
index 848add5..9ea3142 100644
--- a/web/e2e/mcp-delivery.spec.ts
+++ b/web/e2e/mcp-delivery.spec.ts
@@ -27,6 +27,14 @@ for (const width of [1280, 390]) test.describe(`MCP delivery at ${width} px`, ()
   const records = () => existsSync(receipt) ? readFileSync(receipt, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []
   const local = () => page.getByRole('region', { name: 'Local MCP servers', exact: true })
   const report = () => page.getByRole('region', { name: 'MCP delivery', exact: true })
+  // R3 moves the last-start snapshot into the session's Details tab.
+  const openReport = async () => {
+    await page.getByRole('button', { name: 'Session details', exact: true }).click()
+    await page.getByRole('tab', { name: 'Details', exact: true }).click()
+  }
+  const closeReportOnPhone = async () => {
+    if (width === 390) await page.getByRole('button', { name: 'Close session details', exact: true }).click()
+  }
   test.beforeAll(async ({ browser }) => {
     sentinel = mkdtempSync(join(tmpdir(), 'hennery-e2e-sentinel-'))
     runnerLog = process.env.HENNERY_LOG_DIR; process.env.HENNERY_LOG_DIR = sentinel
@@ -118,13 +126,15 @@ for (const width of [1280, 390]) test.describe(`MCP delivery at ${width} px`, ()
     await form.getByRole('textbox', { name: 'First prompt optional', exact: true }).fill('Show delivery.')
     await form.getByRole('button', { name: 'Start session', exact: true }).click()
     await expect(page).toHaveURL(/\/sessions\/[^/?#]+$/, { timeout: 45_000 }); sessionUrl = page.url()
+    await openReport()
     await expect(report()).toContainText('At the last start/resume:')
     await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
     await expect(report()).toContainText('Codex also loads your own ~/.codex MCP servers.')
     expect(records()[0].method).toBe('session/new')
     expect(records()[0].params.mcpServers.map((s: { name: string }) => s.name).sort()).toEqual(['hennery-docs', 'hennery-local'])
     expect(JSON.stringify(records()[0].params.mcpServers).includes(ENV_VALUE)).toBe(true)
-    await page.reload(); await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
+    await closeReportOnPhone()
+    await page.reload(); await openReport(); await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
   })
   test('keeps the last-start snapshot until resume, and delivers none for a different hat', async () => {
     await page.goto('/mcp'); await local().getByRole('button', { name: 'Add local server', exact: true }).click()
@@ -133,11 +143,13 @@ for (const width of [1280, 390]) test.describe(`MCP delivery at ${width} px`, ()
     await local().getByRole('button', { name: 'Review local servers', exact: true }).click()
     await page.getByRole('dialog', { name: 'Save these local MCP servers?', exact: true }).getByRole('button', { name: 'Save local servers', exact: true }).click()
     await expect(page.getByRole('dialog')).toHaveCount(0)
-    await page.goto(sessionUrl); await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
+    await page.goto(sessionUrl); await openReport(); await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
     await expect(page.locator('.session-head .badge')).toHaveText('Idle')
     await host.crash(); host.run()
     await expect(page.locator('.session-head .badge')).toHaveText('Parked', { timeout: 20_000 })
+    await closeReportOnPhone()
     await page.getByRole('button', { name: 'Resume', exact: true }).click()
+    if (width === 390) await openReport()
     await expect(report()).toContainText('3 MCP servers.', { timeout: 20_000 })
     expect(records().at(-1).method).toBe('session/load'); expect(records().at(-1).params.mcpServers.length).toBe(3)
     const made = await page.request.post('/api/hats', { headers: { Origin: collector.origin }, data: { name: 'Other hat' } }); expect(made.status()).toBe(201)
@@ -148,6 +160,8 @@ for (const width of [1280, 390]) test.describe(`MCP delivery at ${width} px`, ()
     const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('button', { name: 'Codex', exact: true }).click(); await form.getByRole('combobox').fill(path)
     await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('this hat is not the host’s default')
     await form.getByRole('button', { name: 'Start session', exact: true }).click()
+    await expect(page).toHaveURL(/\/sessions\/[^/?#]+$/, { timeout: 45_000 })
+    await openReport()
     await expect(report()).toContainText('this hat is not the host’s default', { timeout: 45_000 })
     await expect(report()).toContainText('0 MCP servers.')
     expect(records().at(-1).params.mcpServers).toEqual([])
diff --git a/web/e2e/pwa.spec.ts b/web/e2e/pwa.spec.ts
index 09c8b2c..f87c53d 100644
--- a/web/e2e/pwa.spec.ts
+++ b/web/e2e/pwa.spec.ts
@@ -231,6 +231,7 @@ for (const width of [1280, 390]) test(`notification click reaches the live card
       await expect(returned).toHaveURL(collector.origin + target)
       await expect(returned.getByRole('region', { name: 'Question from Claude', exact: true })).toHaveAttribute('data-pending-id', pending)
     } finally { await signedOut.close() }
+    if (width === 390) await card.getByRole('button', { name: 'Write a prompt', exact: true }).click()
     const draft = page.getByLabel('Prompt', { exact: true })
     await draft.fill('Keep this unsent text')
     await page.evaluate(() => { (window as unknown as { __documentSentinel: string }).__documentSentinel = 'same-document' })
diff --git a/web/e2e/sessions.spec.ts b/web/e2e/sessions.spec.ts
index 56c2b4f..1c347ed 100644
--- a/web/e2e/sessions.spec.ts
+++ b/web/e2e/sessions.spec.ts
@@ -17,6 +17,7 @@ import { join } from 'node:path'
 import { startCollector, type Collector } from './collector'
 import { FAKE_ACP, fakeAgent, testHost, type TestHost } from './host'
 import { scratchEnv } from './spawn'
+import type { Item, SessionSummary } from '../src/generated/view'

 const PASSWORD = 'correct horse battery staple'
 const PROMPT = 'Write the notes, please.'
@@ -192,10 +193,9 @@ for (const width of [1280, 390]) {
         expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
         await expect(page.locator('.tabbar')).toBeHidden()
       } else {
-        // Not shown, so out of the accessibility tree: found by its class.
-        await expect(back).toHaveCount(0)
-        const hidden = page.locator('.session-head .back-btn')
-        expect(await hidden.evaluate((el) => getComputedStyle(el).display)).toBe('none')
+        await expect(back).toBeVisible()
+        await expect(back).toBeInViewport()
+        expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(28)
       }
     })

@@ -260,3 +260,144 @@ for (const width of [1280, 390]) {
     })
   })
 }
+
+// R3 acceptance uses synthetic, typed view items served over the embedded UI.
+// It covers layout/focus and mutation bodies; the real-host cases above keep
+// the collector → adapter → delivered-answer proof.
+test.describe('redesigned session', () => {
+  let app: Collector
+  test.beforeAll(async () => { app = await startCollector() })
+  test.afterAll(async () => { await app?.stop() })
+  for (const width of [1280, 390]) for (const appearance of ['light', 'dark'] as const) {
+    test(`details, answers and read-back at ${width}px in ${appearance}`, async ({ browser }) => {
+      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: appearance, reducedMotion: 'reduce', timezoneId: 'UTC' })
+      const held: import('@playwright/test').Route[] = []
+      const mutations: { path: string; body: unknown }[] = []
+      const now = '2026-10-20T10:00:00Z'
+      const info: SessionSummary = { session_id: 'worker', host_id: 'host1', hat_id: 'hat1', title: 'Review the parser', cwd: '/srv/synthetic/parser', agent: 'codex', model: 'model-a', mode: 'review', git_branch: 'parser-checks', git_dirty: true, created_at: now, last_event_at: now, lifecycle: 'active', activity: 'blocked', presumed_parked: false, question_waits: true, operator_attention: 2, parent_handled_questions: 0,
+        family: { revision: 1, parent: { session_id: 'coordinator', title: 'Coordinator', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 0 } }
+      const question: Extract<Item, { kind: 'question' }> = { id: 'question:permission', version: 1, kind: 'question', ts: now, pending_id: 'permission', question_kind: 'permission', request: { type: 'permission', title: 'Run the project checks?', options: [{ option_id: 'allow/once', name: 'Allow once', option_kind: 'allow_once' }, { option_id: 'allow/always', name: 'Always allow', option_kind: 'allow_always' }, { option_id: 'reject/once', name: 'Reject', option_kind: 'reject_once' }] }, state: 'open', answered: false, answerable: true }
+      const form: Extract<Item, { kind: 'question' }> = { ...question, id: 'question:question', pending_id: 'question', question_kind: 'elicitation', request: { type: 'elicitation', message: 'Which parser should be checked?', form_supported: true, required: ['parser'], fields: [{ key: 'parser', label: 'Parser', field_kind: 'single', options: [{ value: 'strict', label: 'Strict parser', description: 'Check every input' }, { value: 'compatible', label: 'Compatible parser', description: 'Keep the existing input rules' }] }, { key: 'notes', label: 'Notes', field_kind: 'text' }] } }
+      const plan: Extract<Item, { kind: 'plan' }> = { id: 'plan', kind: 'plan', version: 1, ts: now, entries: [{ content: 'Read the parser', status: 'completed' }, { content: 'Check the input rules', status: 'in_progress' }, { content: 'Report the findings', status: 'pending' }] }
+      let pinned = false, taken = false
+      const catalog = () => ({ session_id: 'worker', commands: [], config_options: [
+        { id: 'model', name: 'Model', category: 'model', type: 'select', currentValue: 'model-a', options: [{ value: 'model-a', name: 'Model A' }, { value: 'model-b', name: 'Model B' }] },
+        { id: 'mode', name: 'Mode', category: 'mode', type: 'select', currentValue: 'review', options: [{ value: 'review', name: 'Review' }, { value: 'edit', name: 'Edit' }] },
+        { id: 'effort', name: 'Effort', category: 'thought_level', type: 'select', currentValue: 'medium', options: ['low', 'medium', 'high'].map(value => ({ value, name: value })) },
+      ] })
+      const items: Item[] = [
+        { id: 'prompt', kind: 'user_turn', version: 1, ts: now, origin: { kind: 'parent', session_id: 'coordinator', operation_id: 'parent-instruction' }, content: [{ type: 'text', text: 'Review the parser and report what needs changing.' }] },
+        { id: 'message', kind: 'message', version: 1, ts: now, text: 'I checked the parser.\n\n- Input types are preserved.\n- The remaining checks need permission.' },
+        { id: 'thinking', kind: 'thinking', version: 1, ts: now, text: 'Consider the boundary cases before changing the parser.' },
+        { id: 'tool', kind: 'tool_call', tool_call_id: 'read-parser', version: 1, ts: now, title: 'Read', status: 'completed', input: { path: 'src/parser.ts' }, output: 'Parser input rules inspected.', content: [{ type: 'diff', path: 'src/parser.ts', old_text: 'return input;', new_text: 'return parse(input);' }] }, plan, question, form,
+      ]
+      await context.route('**/api/**', async route => {
+        const path = new URL(route.request().url()).pathname
+        const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
+        if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
+        if (path === '/api/hats') return json([{ id: 'hat1', name: 'Synthetic project', colour: '#8a3cbd' }])
+        if (path === '/api/hosts') return json([{ host_id: 'host1', name: 'Test workstation', connected: true, capabilities: ['images', 'park', 'idle_hold'] }])
+        if (path === '/api/view/sessions') return json({ sessions: [info], epoch: 'list', revision: 1, waiting: 1 })
+        if (path.startsWith('/api/stream/')) { held.push(route); return }
+        if (path === '/api/view/sessions/worker') return json({ items, epoch: 'items', revision: 1, older: false })
+        if (path === '/api/sessions/worker') return json({ ...info, pending: [], mcp_delivery: { mode: 'unisolated', servers: 2, at: now } })
+        if (path.endsWith('/catalog')) return json(catalog())
+        if (path.endsWith('/family')) return json({ summary: info, children: [], questions: [], routing: taken ? 'detached' : 'active' })
+        if (path.includes('/questions/')) return json(path.endsWith('/permission') ? question : form)
+        if (route.request().method() !== 'GET') mutations.push({ path, body: route.request().postDataJSON() })
+        if (path.endsWith('/takeover')) { taken = true; return route.fulfill({ status: 204 }) }
+        if (path.endsWith('/idle-hold')) { if (route.request().method() === 'PATCH') pinned = route.request().postDataJSON().pinned; return json({ pinned, family_active: true, notices_pending: false, held: true }) }
+        if (path.endsWith('/config')) return json(catalog(), 202)
+        if (path.endsWith('/answer')) return json({ pending_id: path.includes('/permission/') ? 'permission' : 'question', request_id: 'answer' }, 202)
+        if (path === '/api/delegation/attention') return json([])
+        throw new Error(`Unmatched session acceptance route: ${path}`)
+      })
+      const page = await context.newPage()
+      const shot = async (state: string) => {
+        if (!process.env.HENNERY_R3_SCREENSHOTS) return
+        mkdirSync(process.env.HENNERY_R3_SCREENSHOTS, { recursive: true })
+        await page.evaluate(async () => { await Promise.all([document.fonts.load('400 14px Inter'), document.fonts.load('italic 400 14px Inter'), document.fonts.load('500 18px Roboto')]); await document.fonts.ready })
+        await page.screenshot({ path: join(process.env.HENNERY_R3_SCREENSHOTS, `${state}-${width}-${appearance}.png`) })
+      }
+      try {
+        await page.goto(`${app.origin}/sessions/worker?pending=permission`)
+        await expect(page.getByRole('heading', { name: 'Review the parser', exact: true })).toBeVisible()
+        await expect(page.getByRole('region', { name: 'Parent-driven session', exact: true })).toContainText('A prompt from you takes over this session.')
+        await expect(page.locator('html')).toHaveAttribute('data-theme', appearance)
+        const permission = page.locator('[data-pending-id="permission"]')
+        await permission.focus()
+        await expect(permission.getByText('Run the project checks?', { exact: true })).toBeInViewport()
+        await expect(permission.getByRole('button', { name: 'Allow once', exact: true })).toBeInViewport()
+        if (width === 390) expect((await permission.getByRole('button', { name: 'Allow once', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(48)
+        await shot('permission')
+        await page.getByRole('button', { name: 'Session details', exact: true }).click()
+        const panel = width === 390 ? page.getByRole('dialog', { name: 'Session details', exact: true }) : page.getByRole('complementary', { name: 'Session details', exact: true })
+        await expect(panel.getByRole('link', { name: 'Coordinator', exact: true })).toBeVisible()
+        await shot('family')
+        await panel.getByRole('tab', { name: 'Plan', exact: true }).click()
+        await expect(panel.getByRole('listitem')).toHaveText(['Read the parser', 'Check the input rules', 'Report the findings'])
+        await shot('plan')
+        await panel.getByRole('tab', { name: 'Details', exact: true }).click()
+        await expect(panel.getByRole('region', { name: 'MCP delivery', exact: true })).toContainText('2 MCP servers.')
+        await shot('details')
+        await panel.getByRole('button', { name: 'Close session details', exact: true }).click()
+        await expect(page.getByRole('button', { name: 'Session details', exact: true })).toBeFocused()
+        if (width === 390) await permission.getByRole('button', { name: 'Write a prompt', exact: true }).click()
+        // A direct inline click must not move its button between down and up.
+        await permission.getByRole('button', { name: 'Allow once', exact: true }).click()
+        await expect(permission.getByText('Sent', { exact: true })).toBeVisible()
+        expect(mutations).toContainEqual({ path: '/api/sessions/worker/pending/permission/answer', body: { option_id: 'allow/once' } })
+        const elicitation = page.locator('[data-pending-id="question"]')
+        await elicitation.focus()
+        await elicitation.getByRole('radio', { name: 'Strict parser', exact: true }).check()
+        await elicitation.getByRole('textbox', { name: 'Notes', exact: true }).fill('Preserve unknown input types')
+        await expect(elicitation.getByRole('button', { name: 'Send', exact: true })).toBeInViewport()
+        await shot('elicitation')
+        await elicitation.getByRole('button', { name: 'Send', exact: true }).click()
+        await expect(elicitation.getByText('Sent', { exact: true })).toBeVisible()
+        expect(mutations).toContainEqual({ path: '/api/sessions/worker/pending/question/answer', body: { action: 'accept', content: { parser: 'strict', notes: 'Preserve unknown input types' } } })
+        const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true })
+        await expect(prompt).toBeInViewport()
+        await prompt.fill('Keep this draft')
+        await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption('model-b')
+        await expect(page.getByRole('alert')).toContainText('the agent kept model-a instead of model-b')
+        await expect(page.getByRole('combobox', { name: 'Model', exact: true })).toHaveValue('model-a')
+        await expect(prompt).toHaveValue('Keep this draft')
+        await shot('composer')
+        await page.getByRole('button', { name: 'Session actions', exact: true }).click()
+        const pin = page.getByRole('switch', { name: 'Do not park', exact: true })
+        await expect(pin).toBeEnabled()
+        await expect(pin).not.toBeChecked()
+        await expect(page.getByText('Kept awake for family work.', { exact: true })).toBeVisible()
+        await pin.click(); await expect(pin).toBeChecked()
+        await shot('parking-menu')
+        await page.keyboard.press('Escape')
+        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
+        expect(mutations.filter(m => m.path.endsWith('/prompt'))).toHaveLength(0)
+        // The same view with a running child and a retained parked draft.
+        question.answerable = false; question.answered = true; question.state = 'delivered'
+        form.answerable = false; form.answered = true; form.state = 'delivered'
+        info.operator_attention = 0; info.question_waits = false; info.activity = 'running'
+        await page.reload()
+        await expect(page.locator('.session-head .badge')).toHaveText('Running')
+        await page.locator('.transcript').evaluate(el => { el.scrollTop = 0 })
+        await shot('running')
+        await page.getByRole('button', { name: 'Read Done', exact: true }).click()
+        await expect(page.locator('.tool-diff')).toContainText('return parse(input);')
+        await shot('tool-expanded')
+        info.lifecycle = 'parked'; info.activity = 'idle'
+        await page.reload()
+        await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible()
+        await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue('Keep this draft')
+        await shot('parked')
+        await page.getByRole('button', { name: 'Session actions', exact: true }).click()
+        await page.getByRole('button', { name: 'Delete session', exact: true }).click()
+        const confirmation = page.getByRole('dialog', { name: 'Delete this session?', exact: true })
+        await expect(confirmation).toContainText('Copies already delivered to related sessions remain')
+        await shot('delete-confirmation')
+        await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
+        await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue('Keep this draft')
+      } finally { for (const route of held) await route.abort().catch(() => {}); await context.close() }
+    })
+  }
+})
diff --git a/web/e2e/windowing.spec.ts b/web/e2e/windowing.spec.ts
index 927b723..8df0c27 100644
--- a/web/e2e/windowing.spec.ts
+++ b/web/e2e/windowing.spec.ts
@@ -117,6 +117,7 @@ async function serve(page: Page, items: Raw[]): Promise<Served> {
       if (pathname === '/api/view/sessions') return json(route, list)
       if (pathname === `/api/sessions/${ID}`) return json(route, detail)
       if (pathname === `/api/sessions/${ID}/catalog`) return json(route, { session_id: ID, config_options: [], commands: [] })
+      if (pathname === `/api/view/sessions/${ID}/family`) return json(route, { summary: list.sessions[0], children: [], questions: [] })
       if (pathname === '/api/hosts') return json(route, [{ host_id: 'h1', name: 'build-box' }])
       if (pathname === '/api/hats') return json(route, [])
       // A prompt's image: one pixel, whatever its hash.
diff --git a/web/src/components/Composer.test.tsx b/web/src/components/Composer.test.tsx
index 98b405f..a2fda09 100644
--- a/web/src/components/Composer.test.tsx
+++ b/web/src/components/Composer.test.tsx
@@ -609,7 +609,7 @@ describe('Composer: config bar', () => {
     await waitFor(() => expect(model).toHaveValue('c'), WAIT)
     expect(model).toBeEnabled()
     expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('edit')
-    expect(screen.queryByRole('alert')).toBeNull()
+    expect(screen.getByRole('alert')).toHaveTextContent('the agent kept c instead of b')
   })

   it('switches an on/off option', async () => {
@@ -851,3 +851,30 @@ describe('Composer: work added while a prompt is being sent', () => {
     expect(screen.queryByRole('alert')).toBeNull()
   })
 })
+
+it('keeps Send disabled while configuration is pending and explains a missing adapter read-back', async () => {
+  let finish!: (response: Response) => void
+  const result = new Promise<Response>(resolve => { finish = resolve })
+  const c = mount(() => result, { initialCatalog: catalogOf() })
+  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'Keep this draft' } })
+  fireEvent.change(screen.getByRole('combobox', { name: 'Model' }), { target: { value: 'b' } })
+  expect(screen.getByText('Applying session settings…', { exact: true })).toBeInTheDocument()
+  expect(screen.getByRole('combobox', { name: 'Mode' })).toBeDisabled()
+  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
+  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Prompt' }), { key: 'Enter', ctrlKey: true })
+  expect(c.prompts()).toHaveLength(0)
+  await act(async () => { finish(json({ session_id: 's1', config_options: [], commands: [] }, 202)); await result })
+  expect(screen.getByRole('alert')).toHaveTextContent('the agent did not confirm this setting')
+  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Keep this draft')
+})
+
+it('renders every catalog effort choice as a native radio and sends its exact axis/value', async () => {
+  const catalog = catalogOf()
+  catalog.config_options.push({ id: 'reasoning_effort', name: 'Effort', category: 'thought_level', type: 'select', currentValue: 'balanced', options: [{ value: 'tiny', name: 'Brief' }, { value: 'balanced', name: 'Balanced' }, { value: 'deep', name: 'Thorough' }] })
+  const c = mount(() => json(catalog, 202), { initialCatalog: catalog })
+  expect(screen.getByRole('radio', { name: 'Balanced' })).toBeChecked()
+  fireEvent.click(screen.getByRole('radio', { name: 'Thorough' }))
+  await waitFor(() => expect(c.posts).toEqual([{ path: '/api/sessions/s1/config', body: { config_id: 'reasoning_effort', value: 'deep' } }]))
+  await screen.findByRole('alert')
+  expect(screen.getByRole('radio', { name: 'Balanced' })).toBeChecked()
+})
diff --git a/web/src/components/Composer.tsx b/web/src/components/Composer.tsx
index 28b5d35..7c8308b 100644
--- a/web/src/components/Composer.tsx
+++ b/web/src/components/Composer.tsx
@@ -42,11 +42,12 @@ import {
   withoutMarker,
   type Attachment,
 } from '../lib/attachments'
-import { commands, configOptions, matchCommands, type Choice, type Command, type ConfigOption } from '../lib/catalog'
+import { commands, configOptions, matchCommands, type Command, type ConfigOption } from '../lib/catalog'
 import { loadDraft, saveDraft } from '../lib/drafts'
 import { sendingFor, track } from '../lib/sending'
 import { undeliveredDraft, type DraftPart } from '../lib/sendAgain'
 import { Icon } from '../lib/ui'
+import SessionConfig from './SessionConfig'
 import { CANCEL_OUTCOME, SEND_AGAIN_LABEL, cancelRefusal, configRefusal, promptRefusal } from './composerWords'

 /** What the session screen may ask of its composer. */
@@ -137,6 +138,7 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
   // until the next such action or the next send, never cleared by a send's
   // answer (a refusal made while it was in flight would vanish with it).
   const [draftError, setDraftError] = useState<string | null>(null)
+  const configNow = useRef(false)
   const [pendingConfig, setPendingConfig] = useState<Record<string, ConfigValue>>({})
   const [configError, setConfigError] = useState<string | null>(null)
   const [sel, setSel] = useState(0)
@@ -166,7 +168,7 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
   const canResume = session?.lifecycle !== 'starting'
   // Nothing to send: Send and "Resume and send" both wait for words.
   const blank = text.trim() === ''
-  const canSend = !sending && !inFlight && !blank
+  const canSend = !sending && !inFlight && !blank && Object.keys(pendingConfig).length === 0

   // The draft as last rendered, for the handle and for a refill that
   // answers later.
@@ -350,7 +352,7 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
   }

   function send() {
-    if (canSend) begin(deliver)
+    if (canSend && !configNow.current) begin(deliver)
   }

   /** Resume, then send; tracked as one send, so a composer mounted again
@@ -386,12 +388,16 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
   /** Show the pick at once; the agent's answer replaces it, a refusal
    *  takes it back. */
   async function switchConfig(option: ConfigOption, value: ConfigValue) {
-    const settle = () =>
+    if (configNow.current) return
+    configNow.current = true
+    const settle = () => {
+      configNow.current = false
       setPendingConfig((p) => {
         const rest = { ...p }
         delete rest[option.id]
         return rest
       })
+    }
     setPendingConfig((p) => ({ ...p, [option.id]: value }))
     setConfigError(null)
     let answer: SessionCatalog
@@ -405,6 +411,8 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
     }
     // Replaced by what the agent now reports, which may differ from the pick.
     onCatalog(answer)
+    const actual = configOptions(answer).find(candidate => candidate.id === option.id)
+    if (!actual || actual.current !== value) setConfigError(actual ? `${option.name}: the agent kept ${String(actual.current)} instead of ${String(value)}. Review its current setting before sending.` : `${option.name}: the agent did not confirm this setting. Review the current settings before sending.`)
     settle()
   }

@@ -458,16 +466,17 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
         {options.length > 0 && (
           <div className="composer-controls" role="group" aria-label="Session settings">
             {options.map((option) => (
-              <Switcher
+              <SessionConfig
                 key={option.id}
                 option={option}
                 value={Object.hasOwn(pendingConfig, option.id) ? pendingConfig[option.id] : option.current}
-                busy={Object.hasOwn(pendingConfig, option.id)}
+                busy={Object.keys(pendingConfig).length > 0}
                 onPick={(value) => void switchConfig(option, value)}
               />
             ))}
           </div>
         )}
+        {Object.keys(pendingConfig).length > 0 && <p className="config-pending" role="status">Applying session settings…</p>}
         {configError && (
           <p className="form-error" role="alert">
             <bdi>{configError}</bdi>
@@ -631,57 +640,3 @@ function Thumb({ file, n }: { file: File; n: number }) {
   }, [file])
   return url ? <img src={url} alt={`Image #${n}`} /> : null
 }
-
-/** One config option: a select of its values, or an on/off box. */
-function Switcher({
-  option,
-  value,
-  busy,
-  onPick,
-}: {
-  option: ConfigOption
-  value: ConfigValue
-  busy: boolean
-  onPick: (value: ConfigValue) => void
-}) {
-  if (option.kind === 'boolean') {
-    return (
-      <label className="switcher">
-        <input type="checkbox" checked={value === true} disabled={busy} onChange={(e) => onPick(e.target.checked)} />
-        <bdi>{option.name}</bdi>
-      </label>
-    )
-  }
-  const current = String(value)
-  // A value the adapter reports but does not list is still shown as held.
-  const listed: Choice[] = option.choices.some((c) => c.value === current)
-    ? option.choices
-    : [{ value: current, name: current }, ...option.choices]
-  const groups: { name?: string; choices: Choice[] }[] = []
-  for (const c of listed) {
-    const last = groups[groups.length - 1]
-    if (last && last.name === c.group) last.choices.push(c)
-    else groups.push({ name: c.group, choices: [c] })
-  }
-  const render = (c: Choice) => (
-    <option key={c.value} value={c.value} title={c.description}>
-      {c.name}
-    </option>
-  )
-  return (
-    <label className="switcher">
-      <bdi>{option.name}</bdi>
-      <select aria-label={option.name} value={current} disabled={busy} onChange={(e) => onPick(e.target.value)}>
-        {groups.map((g, i) =>
-          g.name === undefined ? (
-            g.choices.map(render)
-          ) : (
-            <optgroup key={`${i}-${g.name}`} label={g.name}>
-              {g.choices.map(render)}
-            </optgroup>
-          ),
-        )}
-      </select>
-    </label>
-  )
-}
diff --git a/web/src/components/FamilyPanel.test.tsx b/web/src/components/FamilyPanel.test.tsx
index a869e5c..b114060 100644
--- a/web/src/components/FamilyPanel.test.tsx
+++ b/web/src/components/FamilyPanel.test.tsx
@@ -2,7 +2,7 @@ import { act, render, screen, waitFor } from '@testing-library/react'
 import userEvent from '@testing-library/user-event'
 import { describe, expect, it } from 'vitest'
 import { json, routed } from '../test-stream'
-import FamilyPanel, { operationWords } from './FamilyPanel'
+import FamilyPanel, { operationWords, operationName, routingWords, handlingWords } from './FamilyPanel'

 import { parent, familyPage } from '../test-family'

@@ -93,5 +93,56 @@ it('labels the saturated receipt history as latest 16 and preserves truthful rec
   const s = routed(() => json(page))
   render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
   expect(await screen.findByText('Latest 16 operations', { exact: true })).toBeInTheDocument()
-  for (let i = 0; i < states.length; i++) expect(screen.getAllByText(`Session operation: ${operationWords(states[i])}`, { exact: true })).toHaveLength(2)
+  const labels = ['Accepted', 'Checking configuration', 'Sending', 'Delivered', 'Done', 'Failed', 'Cancelled', 'Operation status unavailable']
+  for (let i = 0; i < labels.length; i++) expect(screen.getAllByText(`Session operation: ${labels[i]}`, { exact: true })).toHaveLength(2)
+})
+
+it('loads the parent’s other children only on request, uses the encoded parent id and excludes the current session', async () => {
+  const childPage = familyPage()
+  childPage.summary = { ...parent, session_id: 'selected', family: { ...parent.family!, parent: { session_id: 'root/1', title: 'Root', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 } } }
+  childPage.children = []
+  const root = familyPage()
+  root.summary = { ...parent, session_id: 'root/1' }
+  root.children = [root.children[0], { ...root.children[0], summary: childPage.summary }]
+  delete root.next_cursor
+  const server = routed(call => json(call.path.includes('root%2F1') ? root : childPage))
+  render(<FamilyPanel id="selected" summary={childPage.summary} hosts={new Map()} resync={0} />, { wrapper: server.wrapper })
+  await screen.findByText('Current session', { exact: true })
+  expect(server.calls).toHaveLength(1)
+  await userEvent.click(screen.getByRole('button', { name: 'Load parent’s other children' }))
+  expect(await screen.findByRole('article', { name: 'Sibling Review parser' })).toBeInTheDocument()
+  expect(screen.queryByRole('article', { name: 'Sibling selected' })).not.toBeInTheDocument()
+  expect(server.calls[1].path).toBe('/api/view/sessions/root%2F1/family?limit=20')
+})
+
+
+it('uses readable words for every operation and routing outcome, including unknown future codes', () => {
+  for (const [value, label] of [['accepted', 'Accepted'], ['waiting_config', 'Checking configuration'], ['dispatching', 'Sending'], ['delivered', 'Delivered'], ['done', 'Done'], ['failed', 'Failed'], ['cancelled', 'Cancelled'], ['future', 'Operation status unavailable']]) expect(operationWords(value)).toBe(label)
+  for (const [value, label] of [['spawn', 'Start child'], ['prompt', 'Prompt'], ['resume', 'Resume'], ['cancel', 'Cancel'], ['close', 'Close'], ['answer', 'Answer'], ['future', 'Session operation']]) expect(operationName(value)).toBe(label)
+  for (const [value, label] of [['active', 'Parent-driven'], ['detached', 'Operator-driven'], ['suspended', 'Delegation paused'], ['future', 'Routing unavailable']]) expect(routingWords(value)).toBe(label)
+  expect(handlingWords('future')).toBe('Question routing is unavailable')
+})
+
+it('rejects a parent page from a different hat and never renders its children', async () => {
+  const page = familyPage(); page.summary = { ...parent, family: { ...parent.family!, parent: { session_id: 'root', title: 'Root', agent: 'claude' } } }
+  const foreign = familyPage(); foreign.summary = { ...parent, session_id: 'root', hat_id: 'other-hat' }; foreign.children[0].summary.title = 'Private sibling'
+  const server = routed(call => json(call.path.includes('/root/') ? foreign : page))
+  render(<FamilyPanel id="parent" summary={page.summary} hosts={new Map()} resync={0} />, { wrapper: server.wrapper })
+  await userEvent.click(await screen.findByRole('button', { name: 'Load parent’s other children' }))
+  expect(await screen.findByRole('alert')).toHaveTextContent('parent family changed')
+  expect(screen.queryByRole('link', { name: 'Private sibling' })).not.toBeInTheDocument()
+})
+
+it('does not publish an old parent-page error into a new selected session', async () => {
+  let finish!: (response: Response) => void
+  const late = new Promise<Response>(resolve => { finish = resolve })
+  const page = familyPage(); page.summary = { ...parent, family: { ...parent.family!, parent: { session_id: 'root', title: 'Root', agent: 'claude' } } }
+  const other = { ...parent, session_id: 'other', family: undefined }
+  const server = routed(call => call.path.includes('/root/') ? late : json(call.path.includes('/other/') ? { summary: other, children: [], questions: [] } : page))
+  const view = render(<FamilyPanel id="parent" summary={page.summary} hosts={new Map()} resync={0} />, { wrapper: server.wrapper })
+  await userEvent.click(await screen.findByRole('button', { name: 'Load parent’s other children' }))
+  view.rerender(<FamilyPanel id="other" summary={other} hosts={new Map()} resync={0} />)
+  await act(async () => { finish(json({ code: 'unavailable', message: 'Old parent read failed' }, 503)); await late })
+  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
+  expect(screen.queryByRole('link', { name: 'Root' })).not.toBeInTheDocument()
 })
diff --git a/web/src/components/FamilyPanel.tsx b/web/src/components/FamilyPanel.tsx
index b441356..2454520 100644
--- a/web/src/components/FamilyPanel.tsx
+++ b/web/src/components/FamilyPanel.tsx
@@ -7,6 +7,7 @@ import { useClient } from '../app-client'
 import type { FamilyChild, FamilyPage, SessionSummary } from '../generated/view'
 import { agentLabel } from '../lib/agent'
 import { attentionReason } from '../lib/attentionReason'
+import { statusOf } from '../lib/status'
 import { Link } from '../router'
 import { sessionPath } from './SessionRow'
 import StatusAttention from './StatusAttention'
@@ -46,6 +47,8 @@ export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Prop
   const [busy, setBusy] = useState(false)
   const [taking, setTaking] = useState<string | null>(null)
   const [refresh, setRefresh] = useState(0)
+  const [siblings, setSiblings] = useState<{ key: string; page: FamilyPage } | null>(null)
+  const [siblingsBusy, setSiblingsBusy] = useState(false)
   const generation = useRef(0)
   const report = useRef(onPage)
   report.current = onPage
@@ -57,6 +60,7 @@ export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Prop
     setPage(held => held?.summary.session_id === id ? held : null)
     setError(null)
     setBusy(true)
+    setSiblingsBusy(false)
     familyPage(client, id).then(value => {
       if (generation.current !== current) return
       setPage(value)
@@ -92,11 +96,26 @@ export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Prop
   const family = summary ? summary.family : page?.summary.family
   const selected = summary ?? page?.summary
   const hasAttention = (selected?.operator_attention ?? 0) > 0 || (selected?.family?.attention ?? 0) > 0 || (page?.summary.operator_attention ?? 0) > 0 || (page?.summary.family?.attention ?? 0) > 0
+  const siblingKey = JSON.stringify([id, familyKey, resync, refresh])
+  const related = siblings?.key === siblingKey ? siblings.page : null
+  const readSiblings = async () => {
+    if (!family?.parent || siblingsBusy) return
+    const current = generation.current
+    setSiblingsBusy(true); setError(null)
+    try {
+      const next = await familyPage(client, family.parent.session_id, related?.next_cursor)
+      if (generation.current !== current) return
+      if (next.summary.session_id !== family.parent.session_id || next.summary.hat_id !== selected?.hat_id) throw new Error('The parent family changed. Refresh this session before loading it again.')
+      setSiblings(held => ({ key: siblingKey, page: { ...next, children: held?.key === siblingKey ? [...held.page.children, ...next.children.filter(child => !held.page.children.some(old => old.summary.session_id === child.summary.session_id))] : next.children } }))
+    } catch (err) { if (generation.current === current) setError(messageOf(err)) }
+    finally { if (generation.current === current) setSiblingsBusy(false) }
+  }
   if (!family?.parent && !family?.child_counts.total && !error && !hasAttention) return <p className="item-note">{busy ? 'Loading family…' : 'No related sessions.'}</p>
   return <section className="family-panel" aria-label="Session family">
     <details open>
-      <summary>{family?.parent || family?.child_counts.total ? 'Family' : 'Attention'}{family?.child_counts.total ? ` · ${family.child_counts.total} children` : ''}</summary>
+      <summary tabIndex={0}>{family?.parent || family?.child_counts.total ? 'Family' : 'Attention'}{family?.child_counts.total ? ` · ${family.child_counts.total} children` : ''}</summary>
       {selected && <StatusAttention session={selected} children={page?.children.map(child => child.summary) ?? []} enabled={hasAttention && page !== null} refreshKey={`${familyKey}:${resync}:${refresh}`} onAcknowledged={() => setRefresh(n => n + 1)} />}
+      {selected && <article className="family-child family-current" aria-label="Current session"><span className="item-note">Current session</span><h3><bdi>{selected.title || agentLabel(selected.agent)}</bdi></h3><p>{statusOf(selected).label}</p></article>}
       {family?.parent && <p>Parent: <Link to={sessionPath(family.parent.session_id)}><bdi>{family.parent.title || agentLabel(family.parent.agent)}</bdi></Link></p>}
       {page?.routing && <p>{routingWords(page.routing)}{page.reason && <> · {attentionReason(page.reason)}</>}</p>}
       {family?.parent && page?.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" disabled={taking !== null} onClick={() => void takeover({ summary: page.summary })}>{taking === id ? 'Taking over…' : 'Take over'}</button>}
@@ -122,6 +141,11 @@ export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Prop
         </article>
       })}
       {page?.next_cursor && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void more()}>Load more children</button>}
+      {family?.parent && <>
+        {related?.children.filter(child => child.summary.session_id !== id).map(child => <article className="family-child" key={child.summary.session_id} aria-label={`Sibling ${child.summary.title || agentLabel(child.summary.agent)}`}><Link to={sessionPath(child.summary.session_id)}><bdi>{child.summary.title || agentLabel(child.summary.agent)}</bdi></Link><p>{statusOf(child.summary).label}</p><p><bdi>{hosts.get(child.summary.host_id) || child.summary.host_id}</bdi></p>{child.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" disabled={taking !== null} onClick={() => void takeover(child)}>Take over</button>}</article>)}
+        {(!related || related.next_cursor) && <button type="button" className="btn btn-ghost btn-sm" disabled={siblingsBusy} onClick={() => void readSiblings()}>{siblingsBusy ? 'Loading related sessions…' : related ? 'Load more siblings' : 'Load parent’s other children'}</button>}
+        {related && related.children.every(child => child.summary.session_id === id) && !related.next_cursor && <p className="item-note">No other children are listed.</p>}
+      </>}
       {busy && <p role="status">Loading family…</p>}
       {error && <p className="form-error" role="alert">{error} <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefresh(n => n + 1)}>Retry family</button></p>}
     </details>
diff --git a/web/src/components/QuestionActions.tsx b/web/src/components/QuestionActions.tsx
new file mode 100644
index 0000000..47c7517
--- /dev/null
+++ b/web/src/components/QuestionActions.tsx
@@ -0,0 +1,22 @@
+import { createContext, useContext, type ReactNode } from 'react'
+
+export interface QuestionPresentation {
+  selected: string | null
+  select: (pending: string | null) => void
+  acknowledge: (text: string) => void
+  next: () => void
+  writePrompt: () => void
+}
+export const QuestionPresentationContext = createContext<QuestionPresentation | null>(null)
+
+/** One canonical action set stays inside its card in the accessibility tree.
+ * On phones the selected set occupies the bottom answer region. Fields stay
+ * mounted in the transcript and their drafts remain owned by AnswerBook. */
+export default function QuestionActions({ pendingId, children }: { pendingId: string; children: ReactNode }) {
+  const presentation = useContext(QuestionPresentationContext)
+  const selected = presentation?.selected === pendingId
+  return <div className={'question-actions' + (selected ? ' question-actions-selected' : '')} aria-label="Question actions">
+    {children}
+    {selected && <div className="question-navigation"><button type="button" className="btn btn-ghost btn-sm" onClick={presentation.writePrompt}>Write a prompt</button><button type="button" className="btn btn-ghost btn-sm" onClick={presentation.next}>Next question</button></div>}
+  </div>
+}
diff --git a/web/src/components/SessionConfig.tsx b/web/src/components/SessionConfig.tsx
new file mode 100644
index 0000000..35744dd
--- /dev/null
+++ b/web/src/components/SessionConfig.tsx
@@ -0,0 +1,59 @@
+import type { ConfigValue } from '../generated/protocol'
+import type { Choice, ConfigOption } from '../lib/catalog'
+
+/** One config option: a select of its values, or an on/off box. */
+export default function SessionConfig({
+  option,
+  value,
+  busy,
+  onPick,
+}: {
+  option: ConfigOption
+  value: ConfigValue
+  busy: boolean
+  onPick: (value: ConfigValue) => void
+}) {
+  if (option.kind === 'boolean') {
+    return (
+      <label className="switcher">
+        <input type="checkbox" checked={value === true} disabled={busy} onChange={(e) => onPick(e.target.checked)} />
+        <bdi>{option.name}</bdi>
+      </label>
+    )
+  }
+  if ((option.category === 'thought_level' || option.id === 'reasoning_effort' || option.id === 'effort') && option.choices.length > 0 && option.choices.length <= 5 && option.choices.every(c => !c.group) && option.choices.some(c => c.value === value)) {
+    return <fieldset className="session-effort"><legend>{option.name}</legend>{option.choices.map(choice => <label key={choice.value}><input type="radio" name={option.id} value={choice.value} checked={value === choice.value} disabled={busy} onChange={() => onPick(choice.value)} /><span>{choice.name}</span></label>)}</fieldset>
+  }
+  const current = String(value)
+  // A value the adapter reports but does not list is still shown as held.
+  const listed: Choice[] = option.choices.some((c) => c.value === current)
+    ? option.choices
+    : [{ value: current, name: current }, ...option.choices]
+  const groups: { name?: string; choices: Choice[] }[] = []
+  for (const c of listed) {
+    const last = groups[groups.length - 1]
+    if (last && last.name === c.group) last.choices.push(c)
+    else groups.push({ name: c.group, choices: [c] })
+  }
+  const render = (c: Choice) => (
+    <option key={c.value} value={c.value} title={c.description}>
+      {c.name}
+    </option>
+  )
+  return (
+    <label className="switcher">
+      <bdi>{option.name}</bdi>
+      <select aria-label={option.name} value={current} disabled={busy} onChange={(e) => onPick(e.target.value)}>
+        {groups.map((g, i) =>
+          g.name === undefined ? (
+            g.choices.map(render)
+          ) : (
+            <optgroup key={`${i}-${g.name}`} label={g.name}>
+              {g.choices.map(render)}
+            </optgroup>
+          ),
+        )}
+      </select>
+    </label>
+  )
+}
diff --git a/web/src/components/SessionMenu.tsx b/web/src/components/SessionMenu.tsx
index 991ef37..0a2d606 100644
--- a/web/src/components/SessionMenu.tsx
+++ b/web/src/components/SessionMenu.tsx
@@ -23,7 +23,7 @@ import type { FamilySummary } from '../generated/view'
 import { Link } from '../router'
 import { agentLabel } from '../lib/agent'
 import { sessionPath } from './SessionRow'
-import { Icon } from '../lib/ui'
+import { Icon } from './ui'
 import ConfirmDialog from './ConfirmDialog'
 import { closeRefusal, deleteRefusal, parkRefusal } from './sessionWords'

@@ -151,7 +151,7 @@ export default function SessionMenu({ id, lifecycle, family, canPark, onDeleted,
         aria-controls={open ? menuId : undefined}
         onClick={() => setOpen((o) => !o)}
       >
-        <Icon.Menu size={18} />
+        <Icon name="ellipsis-horizontal" size={18} />
       </button>
       {open && (
         <div className="session-menu-list" id={menuId}>
diff --git a/web/src/components/items/Elicitation.tsx b/web/src/components/items/Elicitation.tsx
index 514f5ce..eb1154d 100644
--- a/web/src/components/items/Elicitation.tsx
+++ b/web/src/components/items/Elicitation.tsx
@@ -13,6 +13,7 @@ import { useId } from 'react'
 import type { ElicitationAction } from '../../generated/protocol'
 import type { Field, FieldOption } from '../../generated/view'
 import { canSend, choose, contentOf, elicitationBody, hasDuplicateKeys, toggle, typeText, type Draft } from '../../lib/elicitation'
+import QuestionActions from '../QuestionActions'

 type Request = { fields: Field[]; required?: string[]; form_supported: boolean }
 type Body = ReturnType<typeof elicitationBody>
@@ -178,6 +179,7 @@ function FieldInput({ field, draft, disabled, prefix, onDraft, fields }: FieldIn
 }

 interface Props {
+  pendingId?: string
   request: Request
   /** The card can answer it now. */
   live: boolean
@@ -190,7 +192,7 @@ interface Props {
   onAnswer: (body: Body) => void
 }

-export default function Elicitation({ request, live, busy, draft, onDraft, onAnswer }: Props) {
+export default function Elicitation({ request, live, busy, draft, onDraft, onAnswer, pendingId = '' }: Props) {
   const prefix = useId()
   const { fields, required, form_supported: supported } = request
   const twice = hasDuplicateKeys(fields)
@@ -209,7 +211,7 @@ export default function Elicitation({ request, live, busy, draft, onDraft, onAns
         ) : (
           twice && <p className="item-note">This form names one field twice, so it cannot be filled in here: it can only be declined or cancelled.</p>
         )}
-        {live && <Actions busy={busy} send={false} onAction={(action) => onAnswer(elicitationBody(action))} />}
+        {live && <QuestionActions pendingId={pendingId}><Actions busy={busy} send={false} onAction={(action) => onAnswer(elicitationBody(action))} /></QuestionActions>}
       </>
     )
   }
@@ -223,11 +225,11 @@ export default function Elicitation({ request, live, busy, draft, onDraft, onAns
           ))}
         </div>
       )}
-      <Actions
+      <QuestionActions pendingId={pendingId}><Actions
         busy={busy}
         send={sendable}
         onAction={(action) => onAnswer(action === 'accept' ? elicitationBody('accept', contentOf(fields, draft)) : elicitationBody(action))}
-      />
+      /></QuestionActions>
     </>
   )
 }
diff --git a/web/src/components/items/QuestionCard.test.tsx b/web/src/components/items/QuestionCard.test.tsx
index 062a2ec..87f2137 100644
--- a/web/src/components/items/QuestionCard.test.tsx
+++ b/web/src/components/items/QuestionCard.test.tsx
@@ -226,19 +226,20 @@ describe('digit shortcuts', () => {
     media([DESKTOP])
     const t = setup({ [`POST ${PATH('p/1')}`]: json(202, { pending_id: 'p/1', request_id: 'r1' }) })
     show(permission(), { sessionId: SESSION, agent: 'Codex', answers: t.book })
+    card().focus()
     expect(card()).toHaveAttribute('tabindex', '0')
     fireEvent.keyDown(card(), { key: '2' })
     await screen.findByText('Sent')
     expect(t.posts().map((p) => p.body)).toEqual([{ option_id: 'b' }])
   })

-  it('answer from a button inside the card', async () => {
+  it('ignores digits from a button inside the card', () => {
     media([DESKTOP])
     const t = setup({ [`POST ${PATH('p/1')}`]: json(202, { pending_id: 'p/1', request_id: 'r1' }) })
     show(permission(), { sessionId: SESSION, agent: 'Codex', answers: t.book })
+    card().focus()
     fireEvent.keyDown(screen.getByRole('button', { name: 'Never' }), { key: '1' })
-    await screen.findByText('Sent')
-    expect(t.posts().map((p) => p.body)).toEqual([{ option_id: 'a' }])
+    expect(t.posts()).toHaveLength(0)
   })

   it('are never heard from the window or a field outside the card', () => {
@@ -260,6 +261,7 @@ describe('digit shortcuts', () => {
     media([DESKTOP])
     const t = setup()
     show(permission(), { sessionId: SESSION, agent: 'Codex', answers: t.book })
+    card().focus()
     const field = document.createElement('input')
     card().appendChild(field)
     fireEvent.keyDown(field, { key: '1' })
@@ -270,6 +272,7 @@ describe('digit shortcuts', () => {
     media(['(min-width: 768px)', '(pointer: fine)'])
     const t = setup()
     show(permission(), { sessionId: SESSION, agent: 'Codex', answers: t.book })
+    card().focus()
     fireEvent.keyDown(card(), { key: '1' })
     expect(t.posts()).toHaveLength(0)
     expect(document.querySelector('.q-key')).toBeNull()
@@ -279,6 +282,7 @@ describe('digit shortcuts', () => {
     media([DESKTOP])
     const t = setup()
     show(permission(), { sessionId: SESSION, agent: 'Codex', answers: t.book })
+    card().focus()
     // A digit past the options is not an option: nothing is read for it.
     const thrown: unknown[] = []
     const onError = (e: ErrorEvent) => {
@@ -298,10 +302,20 @@ describe('digit shortcuts', () => {
     expect(t.posts()).toHaveLength(0)
   })

+  it.each([{ repeat: true }, { isComposing: true }])('ignores a repeated or composed digit (%j)', props => {
+    media([DESKTOP])
+    const t = setup()
+    show(permission(), { sessionId: SESSION, agent: 'Codex', answers: t.book })
+    card().focus()
+    fireEvent.keyDown(card(), { key: '1', ...props })
+    expect(t.posts()).toHaveLength(0)
+  })
+
   it('show each digit beside its option, and keep its bare name as the option’s name', () => {
     media([DESKTOP])
     const t = setup()
     show(permission(), { sessionId: SESSION, agent: 'Codex', answers: t.book })
+    card().focus()
     expect(screen.getByRole('button', { name: 'Allow' })).toHaveTextContent('Allow2')
     expect(Array.from(document.querySelectorAll('.q-key')).map((k) => k.textContent)).toEqual(['1', '2', '3', '4', '5'])
   })
diff --git a/web/src/components/items/QuestionCard.tsx b/web/src/components/items/QuestionCard.tsx
index bf58a51..e8535d5 100644
--- a/web/src/components/items/QuestionCard.tsx
+++ b/web/src/components/items/QuestionCard.tsx
@@ -20,7 +20,7 @@
 //   view words the composer's draft around it.
 // - A form's draft lives in the answer book, by question: the card can be
 //   mounted again without losing it.
-import { useEffect, useRef, type KeyboardEvent } from 'react'
+import { useContext, useEffect, useRef, type KeyboardEvent } from 'react'
 import type { AnswerRequest } from '../../generated/protocol'
 import { useMediaQuery } from '../../hooks/useMediaQuery'
 import { deliveryOf, digitIndex, isEditable, optionTone, questionText, type OptionTone } from '../../lib/delivery'
@@ -29,6 +29,8 @@ import Elicitation from './Elicitation'
 import { handlingWords } from '../FamilyPanel'
 import type { ItemEnv, ItemOf } from './types'
 import { attentionReason } from '../../lib/attentionReason'
+import QuestionActions, { QuestionPresentationContext } from '../QuestionActions'
+import { clockTime } from '../../lib/time'

 type Question = ItemOf<'question'>

@@ -71,6 +73,15 @@ export default function QuestionCard({ item, env }: Props) {
   // Live: this card can answer now.
   const live = book !== undefined && d.controls
   const desktop = useMediaQuery(DESKTOP)
+  const presentation = useContext(QuestionPresentationContext)
+  const wasLive = useRef(live)
+  useEffect(() => {
+    if (wasLive.current && !live) {
+      presentation?.acknowledge(stateText)
+      if (presentation?.selected === item.pending_id) presentation.select(null)
+    }
+    wasLive.current = live
+  }, [live, presentation, item.pending_id])
   const ref = useRef<HTMLElement>(null)
   const { composerEmpty, agent } = env
   const kind = request.type
@@ -93,7 +104,7 @@ export default function QuestionCard({ item, env }: Props) {
   }

   const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
-    if (!live || !desktop || d.busy || request.type !== 'permission') return
+    if (!live || !desktop || d.busy || request.type !== 'permission' || e.target !== e.currentTarget || document.activeElement !== e.currentTarget || e.defaultPrevented || e.repeat || e.nativeEvent.isComposing) return
     const at = digitIndex(e)
     if (at === undefined || at >= request.options.length) return
     e.preventDefault()
@@ -108,16 +119,23 @@ export default function QuestionCard({ item, env }: Props) {
       aria-label={`Question from ${agent}`}
       tabIndex={live ? 0 : undefined}
       onKeyDown={live ? onKeyDown : undefined}
+      onFocusCapture={e => {
+        // Do not relocate a button between pointer-down (focus) and pointer-up.
+        // Card/field focus selects the adaptive region; a direct option click
+        // answers through this same control at its existing position.
+        if (live && !e.target.closest('.question-actions')) presentation?.select(item.pending_id)
+      }}
     >
       <div className="ask-eyebrow">
         <span className="e-tag">{request.type === 'permission' ? `${agent} asks for permission` : `${agent} asks`}</span>
+        <time className="q-age" dateTime={item.ts} title={item.ts}>{clockTime(item.ts)}</time>
       </div>
       {request.type === 'permission' ? (
         <>
           <p className="ask-q">{request.title || 'Permission'}</p>
           {request.options.length > 0 &&
             (live ? (
-              <div className="q-opts" role="group" aria-label="Options">
+              <QuestionActions pendingId={item.pending_id}><div className="q-opts" role="group" aria-label="Options">
                 {request.options.map((option, i) => {
                   const tone = optionTone(option.option_kind)
                   return (
@@ -137,7 +155,7 @@ export default function QuestionCard({ item, env }: Props) {
                     </button>
                   )
                 })}
-              </div>
+              </div></QuestionActions>
             ) : (
               <ul className="q-opts">
                 {request.options.map((option) => (
@@ -151,7 +169,7 @@ export default function QuestionCard({ item, env }: Props) {
       ) : (
         <>
           <p className="ask-q">{request.message}</p>
-          <Elicitation request={request} live={live} busy={d.busy} draft={draft} onDraft={onDraft} onAnswer={answer} />
+          <Elicitation request={request} live={live} busy={d.busy} draft={draft} onDraft={onDraft} onAnswer={answer} pendingId={item.pending_id} />
         </>
       )}
       {item.answerable && routing && <p className="q-routing"><span>{handlingWords(routing.handling)}</span>{routing.reason && <> · <bdi>{attentionReason(routing.reason)}</bdi></>}</p>}
diff --git a/web/src/screens/Session.actions.test.tsx b/web/src/screens/Session.actions.test.tsx
index a19adb9..6bb6f35 100644
--- a/web/src/screens/Session.actions.test.tsx
+++ b/web/src/screens/Session.actions.test.tsx
@@ -2,7 +2,7 @@ import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
 import { expect, it } from 'vitest'
 import { AppActionsProvider, useAppActions, type AppActions } from '../app-actions'
 import { deriveAccent } from '../lib/accent'
-import { setAppearance } from '../lib/theme'
+import { getTheme, setAppearance } from '../lib/theme'
 import { json } from '../test-stream'
 import SessionView from './Session'
 import { FAST, sessionServer } from './test-session'
@@ -16,12 +16,13 @@ it('registers actual session context and actions, scopes its server hat, and rem
   await waitFor(() => expect(document.querySelector('.session-hat')).toHaveTextContent('Project hat'))
   const session = document.querySelector<HTMLElement>('.session')!
   expect(session.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#e51595').light.accent)
+  expect(getTheme().source).toBe('#e51595')
   act(() => setAppearance('dark'))
   expect(session.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#e51595').dark.accent)
   act(() => { actions.dispatch('toggle-details') })
   expect(screen.getByRole('tab', { name: 'Family' })).toBeVisible()
   act(() => { actions.dispatch('focus-composer') })
-  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus()
+  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus())
   fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'keep draft' } })
   act(() => { actions.dispatch('toggle-details') })
   expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('keep draft')
diff --git a/web/src/screens/Session.family.test.tsx b/web/src/screens/Session.family.test.tsx
index d28b7a8..5583c73 100644
--- a/web/src/screens/Session.family.test.tsx
+++ b/web/src/screens/Session.family.test.tsx
@@ -20,7 +20,7 @@ it('loads family state for a notification deep link with no list summary, and in
   render(<SessionView id="parent" timing={{ retryMs: () => 1 }} />, { wrapper: s.wrapper })
   fireEvent.click(screen.getByRole('button', { name: 'Session details' }))
   expect(await screen.findByRole('region', { name: 'Session family' })).toBeInTheDocument()
-  expect(screen.getByText('Waiting on children', { exact: true })).toBeInTheDocument()
+  expect(document.querySelector('.session-head .badge')).toHaveTextContent('Waiting on children')
   await waitFor(() => expect(streams).toHaveLength(1))
   const reads = () => s.calls.filter(c => c.path.startsWith('/api/view/sessions/parent/family')).length
   const before = reads()
diff --git a/web/src/screens/Session.questions.test.tsx b/web/src/screens/Session.questions.test.tsx
new file mode 100644
index 0000000..58be1ed
--- /dev/null
+++ b/web/src/screens/Session.questions.test.tsx
@@ -0,0 +1,36 @@
+import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
+import { afterEach, expect, it, vi } from 'vitest'
+import type { Item } from '../generated/view'
+import SessionView from './Session'
+import { FAST, sessionServer } from './test-session'
+
+const question = (pending: string): Item => ({ id: `question:${pending}`, kind: 'question', version: 1, ts: '2026-10-20T10:00:00Z', pending_id: pending, question_kind: 'elicitation', request: { type: 'elicitation', message: `Question ${pending}`, fields: [{ key: 'reply', label: `Reply ${pending}`, field_kind: 'text' }], form_supported: true }, state: 'open', answered: false, answerable: true })
+afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })
+it('keeps one phone action set per card, preserves each draft, switches only on explicit focus and acknowledges queued answers honestly', async () => {
+  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({ matches: q === '(max-width: 767px)', addEventListener() {}, removeEventListener() {} })))
+  const server = sessionServer({ items: () => [question('one'), question('two')] })
+  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
+  const cards = await screen.findAllByRole('region', { name: 'Question from Claude' })
+  act(() => cards[0].focus())
+  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
+  fireEvent.change(within(cards[0]).getByRole('textbox', { name: 'Reply one' }), { target: { value: 'first draft' } })
+  expect(within(cards[0]).getAllByRole('button', { name: 'Send' })).toHaveLength(1)
+  fireEvent.click(within(cards[0]).getByRole('button', { name: 'Next question' }))
+  expect(cards[1]).toHaveFocus()
+  expect(server.changes()).toHaveLength(0)
+  fireEvent.change(within(cards[1]).getByRole('textbox', { name: 'Reply two' }), { target: { value: 'second draft' } })
+  fireEvent.click(within(cards[1]).getByRole('button', { name: 'Write a prompt' }))
+  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
+  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus())
+  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'operator draft' } })
+  act(() => within(cards[0]).getByRole('button', { name: 'Send' }).focus())
+  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
+  act(() => cards[0].focus())
+  expect(within(cards[0]).getByRole('textbox', { name: 'Reply one' })).toHaveValue('first draft')
+  expect(within(cards[1]).getByRole('textbox', { name: 'Reply two' })).toHaveValue('second draft')
+  fireEvent.click(within(cards[0]).getByRole('button', { name: 'Send' }))
+  await waitFor(() => expect(document.querySelector('.answer-acknowledgement')).toHaveTextContent('Sent'))
+  expect(document.querySelector('.answer-acknowledgement')).not.toHaveTextContent('Allowed')
+  expect(server.posted('/answer')).toEqual([{ path: '/api/sessions/s1/pending/one/answer', body: { action: 'accept', content: { reply: 'first draft' } } }])
+  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('operator draft')
+})
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index 9fdc86c..a9aec4e 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -52,8 +52,10 @@ import FamilyPanel from '../components/FamilyPanel'
 import SessionDetails from '../components/SessionDetails'
 import { useSessionScope } from '../components/SessionScope'
 import { useRegisterAction, useRegisterContext } from '../app-actions'
-import { useAccentStyle } from '../lib/theme'
+import { saveTheme, useAccentStyle } from '../lib/theme'
+import { themeOf } from '../lib/hats'
 import { takeOver } from '../api/view'
+import { QuestionPresentationContext } from '../components/QuestionActions'
 import { Text } from '../lib/text'
 import { useMcpDelivery } from '../hooks/useMcpDelivery'
 import SessionMenu from '../components/SessionMenu'
@@ -233,16 +235,22 @@ function useTailWindow(items: Item[], loads: number, size: number, pending?: str
   return { visible, held: start, reveal }
 }

-export default function SessionView({ id, summary, awaitSummary = false, tail = TAIL, timing, onRemoved }: Props) {
+export default function SessionView(props: Props) {
+  return <SelectedSession key={props.id} {...props} />
+}
+
+function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timing, onRemoved }: Props) {
   const client = useClient()
   const scope = useSessionScope()
   const [detailsOpen, setDetailsOpen] = useState(false)
   const detailsTrigger = useRef<HTMLButtonElement>(null)
   const toggleDetails = useCallback(() => setDetailsOpen(open => !open), [])
-  const closeDetails = useCallback(() => setDetailsOpen(false), [])
+  const closeDetails = useCallback(() => { setDetailsOpen(false); detailsTrigger.current?.focus() }, [])
   const [familyRefresh, setFamilyRefresh] = useState(0)
   const [taking, setTaking] = useState(false)
   const [takeError, setTakeError] = useState<string | null>(null)
+  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
+  const [answerNotice, setAnswerNotice] = useState<string | null>(null)
   const s = useSessionItems(id, timing)
   const mcp = useMcpDelivery(id, summary?.lifecycle, Math.max(0, s.loads - 1))
   const [familyRead, setFamilyRead] = useState<{ id: string; page: FamilyPage } | null>(null)
@@ -270,12 +278,28 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   }, [id, targetQuestion, s.items, s.pinned])
   const win = useTailWindow(s.items, s.loads, tail, targetQuestion)
   const narrow = useMediaQuery('(max-width: 767px)')
+  useLayoutEffect(() => {
+    if (!narrow || !selectedQuestion) return
+    // Run after the transcript's tail pin and browser focus scrolling settle.
+    // Measure the card itself: its bottom action region sits outside the card.
+    const frame = requestAnimationFrame(() => {
+      const card = [...(questionRegion.current?.querySelectorAll<HTMLElement>('[data-pending-id]') ?? [])].find(el => el.dataset.pendingId === selectedQuestion)
+      const scroll = card?.closest<HTMLElement>('.transcript')
+      if (card && scroll) scroll.scrollTop += card.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 16
+    })
+    return () => cancelAnimationFrame(frame)
+  }, [narrow, selectedQuestion, s.loads])
   const hostItems = useList('hosts', true)
   const hosts = useMemo(() => namesOf(hostItems, 'host_id'), [hostItems])
   const hatItems = useList('hats', scope === null)
   const hats = useMemo(() => scope?.hats ? new Map(scope.hats.map(h => [h.id, h.name])) : namesOf(hatItems, 'id'), [scope?.hats, hatItems])
   const actualHat = (scope?.hats ?? (Array.isArray(hatItems) ? hatItems as { id: string; colour: string; name: string }[] : [])).find(h => h.id === info?.hat_id)
   const accent = useAccentStyle(actualHat?.colour)
+  useEffect(() => {
+    if (!actualHat) return
+    saveTheme(themeOf(actualHat.colour))
+    return () => { if (scope?.hats) saveTheme(themeOf(scope.hats.find(h => h.id === scope.hat)?.colour)) }
+  }, [actualHat?.id, actualHat?.colour, scope?.hats, scope?.hat])
   const plan = useMemo(() => latestPlan(s.items), [s.items])
   const startNotice = useStartNotice(id)
   const answers = useAnswering(id, info, s.items, s.loading, s.loads, connectedOf(hostItems, info?.host_id), s.mergeQuestion, s.pinned)
@@ -285,7 +309,10 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   // The composer's handle: the item seams reach the draft through it, and
   // stay the same functions for as long as the view is shown.
   const composer = useRef<ComposerHandle>(null)
-  const focusComposer = useCallback(() => composer.current?.focus(), [])
+  const focusComposer = useCallback(() => {
+    setSelectedQuestion(null)
+    setTimeout(() => composer.current?.focus(), 0)
+  }, [])
   const openProject = useCallback(() => {
     if (info) navigate(`/new?host=${encodeURIComponent(info.host_id)}&cwd=${encodeURIComponent(info.cwd)}`)
   }, [info])
@@ -329,6 +356,13 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   )
   const back = useRef<HTMLAnchorElement>(null)
   const capabilities = capabilitiesOf(hostItems, info?.host_id)
+  const nextQuestion = useCallback(() => {
+    const cards = [...(questionRegion.current?.querySelectorAll<HTMLElement>('.ask:not(.stale)') ?? [])]
+    const at = cards.findIndex(card => card.dataset.pendingId === selectedQuestion)
+    const next = cards[at + 1] ?? cards[0]
+    next?.scrollIntoView?.({ block: 'center' }); next?.focus({ preventScroll: true })
+  }, [selectedQuestion])
+  const presentation = useMemo(() => narrow ? { selected: selectedQuestion, select: setSelectedQuestion, acknowledge: setAnswerNotice, next: nextQuestion, writePrompt: focusComposer } : null, [narrow, selectedQuestion, nextQuestion, focusComposer])

   const env: ItemEnv = useMemo(
     () => ({
@@ -386,7 +420,8 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   }

   return (
-    <div className="session hn-accent-scope" style={accent} ref={questionRegion}>
+    <QuestionPresentationContext.Provider value={presentation}>
+    <div className={'session hn-accent-scope' + (narrow && selectedQuestion ? ' has-question-actions' : '')} style={accent} ref={questionRegion}>
       <SessionHeader
         id={id}
         info={info}
@@ -413,6 +448,7 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
       {info?.family?.parent && family?.routing === 'active' && <div className="parent-banner" role="region" aria-label="Parent-driven session"><p>Driven by <Link to={`/sessions/${encodeURIComponent(info.family.parent.session_id)}`}><bdi>{info.family.parent.title || 'parent session'}</bdi></Link>. Answers go to this child. A prompt from you takes over this session.</p><button type="button" className="btn btn-ghost btn-sm" disabled={taking} onClick={() => void takeover()}>{taking ? 'Taking over…' : 'Take over'}</button>{takeError && <p role="alert">{takeError}</p>}</div>}
       <div className="session-workspace">
       <div className="session-conversation">
+      {answerNotice && <p className="answer-acknowledgement" role="status">{answerNotice}<button type="button" aria-label="Dismiss answer notice" onClick={() => setAnswerNotice(null)}>×</button></p>}
       {mcp.error && <p className="form-error"><Text>{mcp.error}</Text></p>}
       <div className="stream-state" role="status">
         {s.stream === 'reconnecting' ? 'Reconnecting…' : s.resynced ? 'Resynced' : ''}
@@ -471,6 +507,7 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
       </SessionDetails>
       </div>
     </div>
+    </QuestionPresentationContext.Provider>
   )
 }

diff --git a/web/src/styles/session.css b/web/src/styles/session.css
index 3010a56..e6406da 100644
--- a/web/src/styles/session.css
+++ b/web/src/styles/session.css
@@ -402,7 +402,7 @@ li.q-opt-reject { border-color:var(--st-attn); color:var(--st-attn); }
 .ask.stale { opacity:1; color:var(--hn-fg-2); background:var(--hn-sunken); }
 .q-state { font-weight:500; font-size:12px; }
 .q-note { color:var(--hn-fg-3); }
-.ask:focus-visible { outline-color:var(--hn-focus); }
+.ask:focus-visible { outline-color:var(--hn-focus-ring); }
 .elic-opt { min-height:44px; border-color:var(--hn-control-strong); background:var(--hn-surface); border-radius:8px; padding:12px; }
 .elic-opt.sel { border-color:var(--hn-accent); background:var(--hn-accent-wash); padding:11px; }
 .elic-text { border-color:var(--hn-control-strong); border-radius:8px; background:var(--hn-surface); }
@@ -440,3 +440,37 @@ li.q-opt-reject { border-color:var(--st-attn); color:var(--st-attn); }
   .elic-text { min-height:44px; font-size:16px; }
   .is-sheet .session-detail-tabs button,.is-sheet .session-details-heading button { min-height:44px; }
 }
+.session-effort { display:flex; align-items:center; gap:4px; min-width:0; border:0; padding:0; margin:0; font-size:12px; }
+.session-effort legend { float:left; margin-right:8px; color:var(--hn-fg-3); }
+.session-effort label { position:relative; display:flex; align-items:center; cursor:pointer; }
+.session-effort input { position:absolute; opacity:0; width:100%; height:100%; }
+.session-effort span { padding:5px 8px; border:1px solid var(--hn-control-strong); border-radius:6px; color:var(--hn-fg-2); }
+.session-effort input:checked + span { border-color:var(--hn-accent); color:var(--hn-accent-fg); background:var(--hn-accent-wash); }
+.session-effort input:focus-visible + span { outline:2px solid var(--hn-focus-ring); outline-offset:2px; }
+.config-pending { font-size:12px; color:var(--hn-fg-3); margin:0 0 8px; }
+.question-navigation { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; }
+.answer-acknowledgement { display:flex; align-items:center; gap:8px; padding:8px 16px; margin:8px 16px 0; border:1px solid var(--hn-line); border-radius:8px; background:var(--hn-surface); font-size:13px; }
+.answer-acknowledgement button { margin-left:auto; width:44px; height:44px; background:none; border:0; }
+@media (max-width:767px) {
+  .session-conversation { position:relative; }
+  .has-question-actions .composer { display:none; }
+  .has-question-actions .transcript { padding-bottom:240px; }
+  .ask:has(.question-actions-selected) { animation:none; }
+  .question-actions-selected { position:absolute; left:0; right:0; bottom:0; z-index:24; padding:12px 16px max(12px,env(safe-area-inset-bottom)); background:var(--hn-panel); border-top:1px solid var(--hn-line); box-shadow:0 -4px 16px #0000000a; }
+  .question-actions-selected .q-opts { display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); }
+  .question-actions-selected .ask-actions { margin-top:0; justify-content:stretch; }
+  .question-actions-selected .ask-actions > button { flex:1; }
+  .session-effort label { min-height:44px; }
+  .session-effort span { min-height:44px; display:flex; align-items:center; }
+}
+@media (max-width:767px) {
+  .conv-title-row { display:grid; grid-template-columns:44px minmax(0,1fr) 44px 44px; grid-template-rows:24px 24px; column-gap:4px; row-gap:0; }
+  .conv-title-row .back-btn { grid-column:1; grid-row:1 / 3; }
+  .session-head .conv-name { grid-column:2; grid-row:1; align-self:end; }
+  .session-head .badge { grid-column:2; grid-row:2; justify-self:start; align-self:start; margin:2px 0 0; padding:2px 6px; font-size:10px; }
+  .session-details-toggle { grid-column:3; grid-row:1 / 3; }
+  .session-menu { grid-column:4; grid-row:1 / 3; }
+  .waiting-navigation { grid-column:1 / -1; grid-row:3; margin:0; justify-content:flex-end; }
+  .conv-meta .meta-toggle { display:none; }
+}
+.q-age { margin-left:auto; font-size:11px; color:var(--hn-fg-3); white-space:nowrap; }
```

### Verification commands

Run from the worktree root with separate logs and real exit statuses:

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

Serialize frontend asset rebuilds with workspace doctests: generated include_bytes paths must remain present throughout rustdoc. If a concurrent rebuild invalidates those paths after all binary suites pass, rerun workspace doctests against stable assets and report both command statuses; do not mislabel the initial command green. The one-full-workspace-run budget remains in force.

For captures set HENNERY_R3_SCREENSHOTS to the ledger screenshots directory. Run the owned sessions/family suites at 390×844 and 1280×900 in both appearances, waiting for self-hosted fonts. Optional HENNERY_WINDOWING=1 re-runs all original sizes/slowdowns; row/window/reveal assertions are mandatory, while timing rows retain the original still-frame validity threshold.

### Fresh replay and copied removal probes

Extract both diff blocks from this document. Require exactly two nonempty patches and a positive file count in each before any application/check. Archive the named base into a fresh replay-1 copy; initialize its own git root, and APFS-clone target/ and web/node_modules before building. Apply Task 1, typecheck and run its targeted suites; apply Task 2, typecheck, run the full web suite/build, embed and run the owned browser suites. Compare every implementation file and every untouched tracked base file byte for byte with the tested worktree. Exclude only this execution record from the replay comparison.

In probes-1, independently remove returned-pin updates/reopen fences, actual hat scope/cache, action registration, modal inert/trap, pending Send gate, missing/clamped read-back notices, card-target/repeat/composition guards, mobile selection, sibling hat/late-error fences and every new routing/receipt-word outcome. Separately remove phone card scrolling and desktop close-focus return, rebuild only that copied UI/binary and require the corresponding browser regression to fail. Probe the no-button-relocation guard against the focused-action regression. Restore exact source bytes after each mutation and compare with the worktree. Run deterministic late-response/config/question guards with four copies, three rounds; record every exit and count.

## Task 3: Record execution and request review

- [x] Complete Execution status with actual counts/exits, RED/probe results, one fresh replay comparison, captures/references and ownership exceptions.
- [x] Check staged bytes against tested replay, author range, design/ exclusion and repository rules. Commit docs(plan): record UI R3 execution and review handoff, then push.
- [x] Request independent task/whole-branch review through the parent with the base/head range and Review Focus. Parent owns full PR status and integration.

## After this plan

R6 may dispatch registered session details/composer/contextual New session actions and read the actual session context. It must preserve editable/IME/modal guards. R4 owns launcher/defaults and the shared catalog parser; changing a live session remains separate from saving hat defaults. R5/parent must integrate the two navigation-only e2e exceptions with their owned suites. No shared source seam changed.

The parent owns independent review, Linux/macOS CI/full PR status, integration/index updates, final installed-iOS/keyboard/push evidence and the single redesign release. Screenshots prove browser geometry, not OS push display. No runtime/backend permission or delivery semantics were weakened.

## Review amendment after PR #207

The independent review of fbe7d974..53f20120 returned **APPROVE AFTER AMENDMENTS**. The parent requested all three P2 fixes and the cheap Family navigation polish. This amendment remains pending scoped re-review and parent-owned CI; it claims no independent approval.

- Reconcile phone question selection against the rendered actionable cards, including earlier pinned cards. Resync/removal restores the composer without moving focus or changing drafts. Local answer outcomes still come from the canonical card/AnswerBook.
- Both transcript-to-composer handoffs use the existing Write a prompt reveal/focus path before prefilling or asynchronously refilling. Existing append, attachment, error and no-auto-submit behavior is preserved.
- Pass the session host's idle_hold support and known connection state to the menu. Persisted pins remain editable on older/offline hosts. Explain upgrade/reconnect/unknown states; family and pending-update reasons request holds, and the DTO never claims host acknowledgement.
- Family explicitly opens the panel and selects its Family tab; the generic Details action retains toggle behavior.

**Amendment evidence:** initial original-code RED: exit 1, nine failed / three passed (selected-card resync/removal, both handoffs, unsupported/offline/unknown host states, Family). The additional pinned fixture was corrected to advertise an older page, then its retention/removal guard was independently probed. Two test-fixture corrections and an asymmetric value-matcher correction were made without weakening their behavioral assertions. Final focused checks: 86 passed / eight files, plus three parking metadata integration tests; exits 0. Full web tests: 2182 passed / 126 files, up from 2170 / 124; typecheck and production build exit 0; emitted-CSS tests 3/3; binary embed exit 0.

All **12 new removal probes** detected their mutations in amendment-probes-1 (16 failed regression assertions across the probes). This fresh copy received independent APFS clones of target/ and web/node_modules before any tools ran in it. Probe coverage: missing-card reconciliation, pinned retention, both composer handoffs, unsupported/offline/unknown support/unknown connection words, both host-metadata wires, Family open and Family tab selection. Exact source bytes were restored after every mutation. No live probe touched the worktree.

The parent explicitly scoped this amendment to targeted checks, web gates and owned browser specs: no full workspace test, full browser suite, full replay or timing/load repetitions. These new checks cover deterministic UI state transitions and introduce no timing/concurrency mechanism. Prior full-plan execution evidence above remains historical.

**Owned browser acceptance:** exit 0, 29 passed / 11 expected skips (ten opt-in windowing cases plus the desktop phone-target skip). Refreshed 44 captures under .superpowers/sdd/ui-r3/amendment-screenshots/ across 390/1280 px and light/dark; the amended parking text wraps inside the menu. The original prototype references and deliberate adaptations still apply.

**Exact amendment patch, based on 53f20120:** ten source/test files; reverse-application check against the tested worktree passed. The original two-patch fresh replay remains the original build record; review amendments use targeted checks and cloned probes under the current verification budget.

```diff
diff --git a/web/e2e/sessions.spec.ts b/web/e2e/sessions.spec.ts
index 1c347edb..ccbc2e1f 100644
--- a/web/e2e/sessions.spec.ts
+++ b/web/e2e/sessions.spec.ts
@@ -368,7 +368,8 @@ test.describe('redesigned session', () => {
         const pin = page.getByRole('switch', { name: 'Do not park', exact: true })
         await expect(pin).toBeEnabled()
         await expect(pin).not.toBeChecked()
-        await expect(page.getByText('Kept awake for family work.', { exact: true })).toBeVisible()
+        await expect(page.getByRole('status').filter({ hasText: 'Family work requests a parking hold.' })).toBeVisible()
+        await expect(page.getByRole('status').filter({ hasText: 'Parking hold requested from the host.' })).toBeVisible()
         await pin.click(); await expect(pin).toBeChecked()
         await shot('parking-menu')
         await page.keyboard.press('Escape')
diff --git a/web/src/components/SessionDetails.test.tsx b/web/src/components/SessionDetails.test.tsx
index a76f642a..86bea780 100644
--- a/web/src/components/SessionDetails.test.tsx
+++ b/web/src/components/SessionDetails.test.tsx
@@ -2,12 +2,13 @@ import { useRef, useState } from 'react'
 import { fireEvent, render, screen } from '@testing-library/react'
 import userEvent from '@testing-library/user-event'
 import { describe, expect, it, vi } from 'vitest'
-import SessionDetails from './SessionDetails'
+import SessionDetails, { type SessionDetailsTab } from './SessionDetails'

 function View() {
   const [open, setOpen] = useState(false)
+  const [tab, setTab] = useState<SessionDetailsTab>('Family')
   const ref = useRef<HTMLButtonElement>(null)
-  return <><button ref={ref} onClick={() => setOpen(true)}>Session details</button><input aria-label="Retained draft" defaultValue="keep this" /><SessionDetails open={open} onClose={() => setOpen(false)} trigger={ref}><a href="/sessions/child">Worker</a></SessionDetails></>
+  return <><button ref={ref} onClick={() => setOpen(true)}>Session details</button><input aria-label="Retained draft" defaultValue="keep this" /><SessionDetails open={open} tab={tab} onTab={setTab} onClose={() => setOpen(false)} trigger={ref}><a href="/sessions/child">Worker</a></SessionDetails></>
 }

 describe('SessionDetails', () => {
diff --git a/web/src/components/SessionDetails.tsx b/web/src/components/SessionDetails.tsx
index 9854469e..14f6a0ca 100644
--- a/web/src/components/SessionDetails.tsx
+++ b/web/src/components/SessionDetails.tsx
@@ -1,4 +1,4 @@
-import { useEffect, useId, useRef, useState, type ReactNode, type RefObject, type KeyboardEvent } from 'react'
+import { useEffect, useId, useRef, type ReactNode, type RefObject, type KeyboardEvent } from 'react'
 import type { HeaderInfo } from './SessionHeader'
 import type { Item } from '../generated/view'
 import type { McpSessionDelivery } from '../generated/protocol'
@@ -9,10 +9,12 @@ import McpDelivery from './McpDelivery'
 import StepList from './StepList'

 const TABS = ['Family', 'Plan', 'Details'] as const
-type Tab = typeof TABS[number]
+export type SessionDetailsTab = typeof TABS[number]

 interface Props {
   open: boolean
+  tab: SessionDetailsTab
+  onTab: (tab: SessionDetailsTab) => void
   onClose: () => void
   trigger: RefObject<HTMLButtonElement | null>
   info?: HeaderInfo
@@ -26,9 +28,8 @@ interface Props {
 /** Keep the family reader mounted while tabs are hidden: one bounded reader
  * supplies both canonical routing and the panel, with no transcript stream. */
 export default function SessionDetails(props: Props) {
-  const { open, onClose, trigger } = props
+  const { open, onClose, trigger, tab, onTab: setTab } = props
   const sheet = useMediaQuery('(max-width: 1023px)')
-  const [tab, setTab] = useState<Tab>('Family')
   const prefix = useId()
   const body = <>
     <div className="session-details-heading"><h2>Session details</h2><button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close session details">×</button></div>
diff --git a/web/src/components/SessionHeader.tsx b/web/src/components/SessionHeader.tsx
index 728f433c..3a0bd0f4 100644
--- a/web/src/components/SessionHeader.tsx
+++ b/web/src/components/SessionHeader.tsx
@@ -34,13 +34,14 @@ interface Props {
   menu?: ReactNode
   detailsOpen?: boolean
   toggleDetails?: () => void
+  openFamily?: () => void
   detailsTrigger?: RefObject<HTMLButtonElement | null>
   hatName?: string
   hostConnected?: boolean
   delivery?: McpSessionDelivery
 }

-export default function SessionHeader({ id, info, hostName, menu, detailsOpen, toggleDetails, detailsTrigger, hatName, hostConnected, delivery }: Props) {
+export default function SessionHeader({ id, info, hostName, menu, detailsOpen, toggleDetails, openFamily, detailsTrigger, hatName, hostConnected, delivery }: Props) {
   const scope = useSessionScope()
   // Share the queue's recent-first summary order, never its overview filters.
   const waiting = [...(scope?.list.all.values() ?? [])].filter(needsOperator).sort((a, b) => b.last_event_at.localeCompare(a.last_event_at) || a.session_id.localeCompare(b.session_id))
@@ -112,7 +113,7 @@ export default function SessionHeader({ id, info, hostName, menu, detailsOpen, t
             </span>
           )}
           {delivery && <span className="meta-pill">{delivery.servers} MCP servers</span>}
-          {info.family && (info.family.parent || info.family.child_counts.total > 0) && <button type="button" className="meta-toggle" onClick={toggleDetails}>Family{info.family.child_counts.total > 0 ? ` · ${info.family.child_counts.total}` : ''}</button>}
+          {info.family && (info.family.parent || info.family.child_counts.total > 0) && <button type="button" className="meta-toggle" onClick={openFamily}>Family{info.family.child_counts.total > 0 ? ` · ${info.family.child_counts.total}` : ''}</button>}
           {info.lifecycle === 'failed' && info.failure_reason && (
             <span className="meta-item">
               Reason: <bdi>{reasonWords('start_failed', info.failure_reason)}</bdi>
diff --git a/web/src/components/SessionMenu.pin.test.tsx b/web/src/components/SessionMenu.pin.test.tsx
index 005660ca..81099a51 100644
--- a/web/src/components/SessionMenu.pin.test.tsx
+++ b/web/src/components/SessionMenu.pin.test.tsx
@@ -9,6 +9,28 @@ function show(server: ReturnType<typeof routed>, id = 'session/1') {
 }

 describe('operator idle pin', () => {
+  it.each([
+    [false, true, 'The pin is saved, but automatic parking holds require an updated host.'],
+    [true, false, 'Parking preferences apply after the host reconnects.'],
+    [undefined, true, 'Host support for automatic parking holds is unknown.'],
+    [true, undefined, 'Host connection is unknown; parking enforcement is not confirmed.'],
+  ] as const)('explains saved intent when host support=%s and connected=%s', async (supportsIdleHold, hostConnected, explanation) => {
+    const server = routed(call => json({ ...initial, pinned: call.method === 'PATCH' }))
+    const props = { supportsIdleHold, hostConnected }
+    render(<SessionMenu id="s1" lifecycle="active" canPark {...props} onDeleted={() => {}} />, { wrapper: server.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    const control = await screen.findByRole('switch', { name: 'Do not park' })
+    await waitFor(() => expect(control).toBeEnabled())
+    fireEvent.click(control)
+    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'))
+    const status = screen.getByRole('status')
+    expect(status).toHaveTextContent(explanation)
+    expect(status).toHaveTextContent('Pinned by you.')
+    expect(status).toHaveTextContent('Family work requests a parking hold.')
+    expect(status).toHaveTextContent('Pending updates request a parking hold.')
+    expect(status).not.toHaveTextContent('Kept awake')
+  })
+
   it('reads on opening and persists the operator choice with the encoded id, while explaining family holds separately', async () => {
     let pinned = false
     const server = routed(call => { if (call.method === 'PATCH') pinned = true; return json({ ...initial, pinned }) })
@@ -18,7 +40,7 @@ describe('operator idle pin', () => {
     const control = await screen.findByRole('switch', { name: 'Do not park' })
     await waitFor(() => expect(control).toBeEnabled())
     expect(control).toHaveAttribute('aria-checked', 'false')
-    expect(screen.getByRole('status')).toHaveTextContent('Kept awake for family work. Kept awake for pending updates.')
+    expect(screen.getByRole('status')).toHaveTextContent('Family work requests a parking hold. Pending updates request a parking hold.')
     fireEvent.click(control)
     await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'))
     expect(server.calls.map(c => [c.method, c.path])).toEqual([['GET', '/api/sessions/session%2F1/idle-hold'], ['PATCH', '/api/sessions/session%2F1/idle-hold']])
@@ -38,7 +60,7 @@ describe('operator idle pin', () => {
     expect(control).toHaveAttribute('aria-checked', 'true')
     fail = false; fireEvent.click(control)
     await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'false'))
-    expect(screen.getByRole('status')).toHaveTextContent('Kept awake for family work.')
+    expect(screen.getByRole('status')).toHaveTextContent('Family work requests a parking hold.')
     expect(screen.getByRole('status')).not.toHaveTextContent('Automatic idle parking is enabled.')
   })

diff --git a/web/src/components/SessionMenu.tsx b/web/src/components/SessionMenu.tsx
index 0a2d6064..bf75a3e1 100644
--- a/web/src/components/SessionMenu.tsx
+++ b/web/src/components/SessionMenu.tsx
@@ -35,6 +35,9 @@ interface Props {
   family?: FamilySummary
   /** The session's host announced the `park` capability. */
   canPark: boolean
+  /** Undefined until host metadata is known; the DTO records intent, not acknowledgement. */
+  supportsIdleHold?: boolean
+  hostConnected?: boolean
   /** The session was deleted (`undefined`: a server that answers 204, or
    *  a session already gone). */
   onDeleted: (result: DeleteResult | undefined) => void
@@ -43,7 +46,7 @@ interface Props {
   focusAfterDelete?: () => HTMLElement | null
 }

-export default function SessionMenu({ id, lifecycle, family, canPark, onDeleted, focusAfterDelete }: Props) {
+export default function SessionMenu({ id, lifecycle, family, canPark, supportsIdleHold, hostConnected, onDeleted, focusAfterDelete }: Props) {
   const client = useClient()
   const menuId = useId()
   const [open, setOpen] = useState(false)
@@ -156,7 +159,17 @@ export default function SessionMenu({ id, lifecycle, family, canPark, onDeleted,
       {open && (
         <div className="session-menu-list" id={menuId}>
           <button type="button" role="switch" aria-checked={hold?.pinned ?? false} disabled={busy || pinBusy || hold === null} onClick={() => void togglePin()}>Do not park</button>
-          <p className="idle-hold-note" role="status">{hold ? [hold.pinned && 'Pinned by you.', hold.family_active && 'Kept awake for family work.', hold.notices_pending && 'Kept awake for pending updates.', !hold.held && 'Automatic idle parking is enabled.'].filter(Boolean).join(' ') : 'Reading automatic parking settings…'}</p>
+          <p className="idle-hold-note" role="status">{hold ? [
+            hold.pinned && 'Pinned by you.',
+            hold.family_active && 'Family work requests a parking hold.',
+            hold.notices_pending && 'Pending updates request a parking hold.',
+            !hold.held && 'No automatic parking hold is requested.',
+            supportsIdleHold === false && (hold.pinned ? 'The pin is saved, but automatic parking holds require an updated host.' : 'Automatic parking holds require an updated host.'),
+            supportsIdleHold === undefined && 'Host support for automatic parking holds is unknown.',
+            hostConnected === false && 'Parking preferences apply after the host reconnects.',
+            hostConnected === undefined && 'Host connection is unknown; parking enforcement is not confirmed.',
+            supportsIdleHold === true && hostConnected === true && hold.held && 'Parking hold requested from the host.',
+          ].filter(Boolean).join(' ') : 'Reading automatic parking settings…'}</p>
           {showPark && (
             <button type="button" disabled={busy} onClick={() => void act(() => park(client, id), parkRefusal)}>
               Park
diff --git a/web/src/screens/Session.family.test.tsx b/web/src/screens/Session.family.test.tsx
index 5583c739..6708b0a8 100644
--- a/web/src/screens/Session.family.test.tsx
+++ b/web/src/screens/Session.family.test.tsx
@@ -21,6 +21,14 @@ it('loads family state for a notification deep link with no list summary, and in
   fireEvent.click(screen.getByRole('button', { name: 'Session details' }))
   expect(await screen.findByRole('region', { name: 'Session family' })).toBeInTheDocument()
   expect(document.querySelector('.session-head .badge')).toHaveTextContent('Waiting on children')
+  fireEvent.click(screen.getByRole('tab', { name: 'Plan' }))
+  fireEvent.click(screen.getByRole('button', { name: 'Family · 2' }))
+  expect(screen.getByRole('tab', { name: 'Family' })).toHaveAttribute('aria-selected', 'true')
+  expect(screen.getByRole('region', { name: 'Session family' })).toBeVisible()
+  fireEvent.click(screen.getByRole('tab', { name: 'Details' }))
+  fireEvent.click(screen.getByRole('button', { name: 'Close session details' }))
+  fireEvent.click(screen.getByRole('button', { name: 'Family · 2' }))
+  expect(screen.getByRole('tab', { name: 'Family' })).toHaveAttribute('aria-selected', 'true')
   await waitFor(() => expect(streams).toHaveLength(1))
   const reads = () => s.calls.filter(c => c.path.startsWith('/api/view/sessions/parent/family')).length
   const before = reads()
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index a9aec4e1..b4dad98b 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -49,7 +49,7 @@ import { ANSWER_LABEL, answerAsMessage } from '../components/composerWords'
 import SessionFooter from '../components/SessionFooter'
 import SessionHeader, { type HeaderInfo } from '../components/SessionHeader'
 import FamilyPanel from '../components/FamilyPanel'
-import SessionDetails from '../components/SessionDetails'
+import SessionDetails, { type SessionDetailsTab } from '../components/SessionDetails'
 import { useSessionScope } from '../components/SessionScope'
 import { useRegisterAction, useRegisterContext } from '../app-actions'
 import { saveTheme, useAccentStyle } from '../lib/theme'
@@ -243,8 +243,10 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
   const client = useClient()
   const scope = useSessionScope()
   const [detailsOpen, setDetailsOpen] = useState(false)
+  const [detailsTab, setDetailsTab] = useState<SessionDetailsTab>('Family')
   const detailsTrigger = useRef<HTMLButtonElement>(null)
   const toggleDetails = useCallback(() => setDetailsOpen(open => !open), [])
+  const openFamily = useCallback(() => { setDetailsTab('Family'); setDetailsOpen(true) }, [])
   const closeDetails = useCallback(() => { setDetailsOpen(false); detailsTrigger.current?.focus() }, [])
   const [familyRefresh, setFamilyRefresh] = useState(0)
   const [taking, setTaking] = useState(false)
@@ -278,6 +280,14 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
   }, [id, targetQuestion, s.items, s.pinned])
   const win = useTailWindow(s.items, s.loads, tail, targetQuestion)
   const narrow = useMediaQuery('(max-width: 767px)')
+  useLayoutEffect(() => {
+    if (!selectedQuestion) return
+    // A resync or removal may unmount the selected card without its live →
+    // stale effect. Reconcile against both rendered transcript regions, using
+    // the card's canonical actionable state (including local answer outcomes).
+    const cards = questionRegion.current?.querySelectorAll<HTMLElement>('.ask:not(.stale)') ?? []
+    if (![...cards].some(card => card.dataset.pendingId === selectedQuestion)) setSelectedQuestion(null)
+  }, [selectedQuestion, win.visible, s.pinned, s.loading])
   useLayoutEffect(() => {
     if (!narrow || !selectedQuestion) return
     // Run after the transcript's tail pin and browser focus scrolling settle.
@@ -328,11 +338,14 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
     finally { setTaking(false) }
   }
   const onSendAgain = useCallback((item: Extract<Item, { kind: 'marker' }>) => {
-    if (item.about_turn) void composer.current?.refill(item.about_turn)
-  }, [])
+    if (item.about_turn) {
+      focusComposer()
+      void composer.current?.refill(item.about_turn)
+    }
+  }, [focusComposer])
   const onAnswerAsMessage = useCallback(
-    (question: string) => composer.current?.prefill(answerAsMessage(question), ANSWER_LABEL),
-    [],
+    (question: string) => { focusComposer(); composer.current?.prefill(answerAsMessage(question), ANSWER_LABEL) },
+    [focusComposer],
   )
   const composerEmpty = useCallback(() => composer.current?.isEmpty() ?? true, [])
   // The view's one resume: the footer's Resume and the composer's "Resume
@@ -433,6 +446,7 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
         delivery={mcp.detail?.mcp_delivery}
         detailsOpen={detailsOpen}
         toggleDetails={toggleDetails}
+        openFamily={openFamily}
         detailsTrigger={detailsTrigger}
         menu={
           <SessionMenu
@@ -440,6 +454,8 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
             lifecycle={info?.lifecycle}
             family={info?.family}
             canPark={capabilities?.includes('park') ?? false}
+            supportsIdleHold={capabilities?.includes('idle_hold')}
+            hostConnected={connectedOf(hostItems, info?.host_id)}
             onDeleted={onDeleted}
             focusAfterDelete={() => back.current}
           />
@@ -502,7 +518,7 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
         />
       )}
       </div>
-      <SessionDetails open={detailsOpen} onClose={closeDetails} trigger={detailsTrigger} info={info} hostName={info ? hosts.get(info.host_id) : undefined} hatName={actualHat?.name} plan={plan} delivery={mcp.detail?.mcp_delivery}>
+      <SessionDetails open={detailsOpen} tab={detailsTab} onTab={setDetailsTab} onClose={closeDetails} trigger={detailsTrigger} info={info} hostName={info ? hosts.get(info.host_id) : undefined} hatName={actualHat?.name} plan={plan} delivery={mcp.detail?.mcp_delivery}>
         <FamilyPanel key={id} id={id} summary={summary} hosts={hosts} resync={Math.max(0, s.loads - 1) + familyRefresh} onPage={onFamilyPage} />
       </SessionDetails>
       </div>
diff --git a/web/src/screens/Session.parking.test.tsx b/web/src/screens/Session.parking.test.tsx
new file mode 100644
index 00000000..57b2c64e
--- /dev/null
+++ b/web/src/screens/Session.parking.test.tsx
@@ -0,0 +1,27 @@
+import { fireEvent, render, screen } from '@testing-library/react'
+import { expect, it } from 'vitest'
+import { json, liveStream, routed } from '../test-stream'
+import { parent } from '../test-family'
+import SessionView from './Session'
+
+it.each([
+  [[], true, 'automatic parking holds require an updated host.'],
+  [['idle_hold'], false, 'Parking preferences apply after the host reconnects.'],
+  [['idle_hold'], true, 'Parking hold requested from the host.'],
+] as const)('uses the session host metadata for parking support=%s connected=%s', async (capabilities, connected, explanation) => {
+  const server = routed(call => {
+    const path = new URL(call.path, 'http://h').pathname
+    if (path === '/api/hosts') return json([{ host_id: parent.host_id, name: 'Test workstation', capabilities, connected }])
+    if (path === '/api/sessions/parent/idle-hold') return json({ pinned: true, family_active: false, notices_pending: false, held: true })
+    if (path === '/api/sessions/parent') return json({ ...parent, pending: [] })
+    if (path === '/api/view/sessions/parent') return json({ items: [], older: false, epoch: 'e1', revision: 1 })
+    if (path === '/api/sessions/parent/catalog') return json({ session_id: 'parent', config_options: [], commands: [] })
+    if (path === '/api/stream/view/sessions/parent') return liveStream().response
+    return json({ code: 'not_found', message: 'no' }, 404)
+  })
+  render(<SessionView id="parent" />, { wrapper: server.wrapper })
+  await screen.findByText(connected ? 'Online' : 'Offline', { exact: true })
+  fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+  await screen.findByRole('switch', { name: 'Do not park', checked: true })
+  expect(document.querySelector('.idle-hold-note')).toHaveTextContent(explanation)
+})
diff --git a/web/src/screens/Session.presentation.test.tsx b/web/src/screens/Session.presentation.test.tsx
new file mode 100644
index 00000000..36cbf54c
--- /dev/null
+++ b/web/src/screens/Session.presentation.test.tsx
@@ -0,0 +1,88 @@
+import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
+import { afterEach, expect, it, vi } from 'vitest'
+import type { Item } from '../generated/view'
+import { json } from '../test-stream'
+import SessionView from './Session'
+import { FAST, message, sessionServer } from './test-session'
+
+const liveQuestion: Extract<Item, { kind: 'question' }> = {
+  id: 'question:live', kind: 'question', version: 1, ts: '2026-10-20T10:00:00Z',
+  pending_id: 'live', question_kind: 'permission',
+  request: { type: 'permission', title: 'Run checks?', options: [{ option_id: 'once', name: 'Allow once', option_kind: 'allow_once' }] },
+  state: 'open', answered: false, answerable: true,
+}
+afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })
+function phone() {
+  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({ matches: q === '(max-width: 767px)', addEventListener() {}, removeEventListener() {} })))
+}
+
+it('keeps a selected earlier pinned question through updates, then reveals the composer when it is removed', async () => {
+  phone()
+  const server = sessionServer({ page: () => json({ items: [{ ...message('new', 'new-turn'), ts: '2026-10-20T11:00:00Z' }], older: true, epoch: 'e1', revision: 1 }) })
+  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
+  await waitFor(() => expect(server.streams).toHaveLength(1))
+  act(() => server.streams[0].event('item', { ...liveQuestion, turn_id: 'old-turn' }))
+  const card = await screen.findByRole('region', { name: 'Question from Claude' })
+  expect(card.closest('.pinned-questions')).not.toBeNull()
+  act(() => card.focus())
+  act(() => server.streams[0].event('item', message('newer', 'new-turn')))
+  await screen.findByText('newer', { exact: true })
+  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
+  act(() => server.streams[0].event('item_removed', { id: liveQuestion.id }))
+  await waitFor(() => expect(screen.queryByRole('region', { name: 'Question from Claude' })).not.toBeInTheDocument())
+  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
+})
+
+it.each(['resync', 'removal'])('returns to the composer when a selected question leaves through %s without losing drafts or moving focus', async mode => {
+  phone()
+  let rows: Item[] = [liveQuestion]
+  const server = sessionServer({ items: () => rows })
+  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
+  const card = await screen.findByRole('region', { name: 'Question from Claude' })
+  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'Keep my draft' } })
+  act(() => card.focus())
+  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
+  await waitFor(() => expect(server.streams).toHaveLength(1))
+  rows = [message('new', 'new-turn', 'New tail after reconnect')]
+  const details = screen.getByRole('button', { name: 'Session details' })
+  act(() => details.focus())
+  act(() => server.streams[0].event(mode === 'resync' ? 'resync_required' : 'item_removed', mode === 'resync' ? {} : { id: liveQuestion.id }))
+  if (mode === 'resync') await screen.findByText('New tail after reconnect', { exact: true })
+  await waitFor(() => expect(screen.queryByRole('region', { name: 'Question from Claude' })).not.toBeInTheDocument())
+  expect(document.querySelector('.question-actions-selected')).toBeNull()
+  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
+  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Keep my draft')
+  expect(details).toHaveFocus()
+})
+
+it('reveals the composer when answering an older cancelled question as a message', async () => {
+  phone()
+  const old: Item = { ...liveQuestion, id: 'question:old', pending_id: 'old', state: 'cancelled', reason: 'agent_withdrew', answerable: false }
+  const server = sessionServer({ items: () => [old, liveQuestion] })
+  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
+  const cards = await screen.findAllByRole('region', { name: 'Question from Claude' })
+  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'Existing draft' } })
+  act(() => cards[1].focus())
+  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
+  fireEvent.click(within(cards[0]).getByRole('button', { name: 'Answer as a new message' }))
+  const prompt = screen.getByRole('textbox', { name: 'Prompt' })
+  await waitFor(() => expect((prompt as HTMLTextAreaElement).value).toContain('Run checks?'))
+  expect(server.changes()).toHaveLength(0)
+  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
+  expect((prompt as HTMLTextAreaElement).value).toContain('Existing draft')
+  await waitFor(() => expect(prompt).toHaveFocus())
+})
+
+it('reveals the composer when restoring an undelivered turn beside a selected question', async () => {
+  phone()
+  const marker: Item = { id: 'marker', kind: 'marker', version: 1, ts: '2026-10-20T09:00:00Z', marker: 'turn_not_delivered', about_turn: 'old-turn' }
+  const server = sessionServer({ items: () => [marker, liveQuestion], turn: () => json({ turn_id: 'old-turn', content: [{ type: 'text', text: 'Restore this prompt' }] }) })
+  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
+  const card = await screen.findByRole('region', { name: 'Question from Claude' })
+  act(() => card.focus())
+  fireEvent.click(screen.getByRole('button', { name: 'Send again' }))
+  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Restore this prompt'))
+  expect(server.posted('/prompt')).toHaveLength(0)
+  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
+  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus())
+})
```

Generated with Claude AI — please review before distribution.
