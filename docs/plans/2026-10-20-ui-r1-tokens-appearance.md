# UI R1 — tokens, appearance and bundled assets

- **Date:** 2026-10-20
- **Base:** `339498c5`, branch `plan/ui-r1`, integration target `redesign`.
- **Contract:** [UI redesign](../specs/2026-10-20-ui-redesign-design.md) §§3, 5.1, 5.6, 9, 10; O6/O8 and confirmed D2–D12.
- **Method:** implementation built first, exact source patches embedded below, one fresh sequential replay at the end. Code wins over task prose.

## Execution status (2026-10-20)

**Executed** on `plan/ui-r1`, built from `339498c5`. Implementation commits: `36f7c43a` (Task 1), `e5f9f726` (Task 2), `3f86b8a9` (Task 3), each pushed to the named branch. Task 4 records this evidence. All authors in the implementation range use `marcin.wadon@gmail.com`. No files from the local design bundle, no Rust/CSP changes and no lockfile changes. No GitHub action or deployment.

The independent review of `339498c5..c7acf751` returned **APPROVE AFTER AMENDMENTS**, delivered through the parent. Review amendment 1 below addresses its blocking finding; scoped confirmation remains requested through the parent. The parent owns PR #203 into `redesign`, full PR status, integration/index entry and release authorization.

| Final command (under the dev shell unless noted) | Exit | Evidence |
|---|---:|---|
| `pnpm --dir web install --frozen-lockfile` | 0 | 235 packages; lock unchanged |
| `pnpm --dir web typecheck` | 0 | app and Node/e2e TypeScript |
| `pnpm --dir web test` | 0 | **2,092 tests / 113 files**, up from **1,862 / 111** |
| `pnpm --dir web build` | 0 | 3 Node CSS regressions pass; 1 emitted CSS asset checked; JS initial gzip 241.50 kB, CSS 13.85 kB, bootstrap 2.60 kB |
| `cargo build -p hennery -p hennery-testkit --bins --locked` | 0 | real collector and scripted agent, UI embedded |
| `CI=1 pnpm --dir web e2e` | 0 | **103 passed / 11 existing skipped** |
| `pnpm --dir web exec playwright test appearance.spec.ts --project=chromium` | 0 | **5 passed**; both widths/themes, real embedded assets/CSP, variable weights/italic, Polish sample, composited status/button contrast, stacked focus/return and offline font cache |
| `pnpm --dir web exec playwright test pwa.spec.ts --project=pwa -g 'notification click reaches'` | 0 | **2 passed**; unchanged 44px regression assertions |
| `node --test packaging/crate-release.test.mjs` | 0 | **49 passed** |
| `python3 -m unittest discover -s packaging/release -p test_supply.py` (one-off Nix Python shell) | 0 | **11 passed** |
| `python3 web/scripts/check-fonts.py` (one-off FontTools/Brotli shell below) | 0 | **6 WOFF2 faces**: actual cmap Polish coverage, 400–700 variable weights and italic metadata |

**Replay:** one fresh source replay in `.superpowers/sdd/ui-r1/replay-3`. It extracted and applied three task patches with **12 / 29 / 6 files**, then independently regenerated six WOFF2s from the pinned upstream TTF bytes using the recorded commands. **All 53 implementation files matched byte for byte**, including bootstrap and fonts. Task 1/2 checks ran after their patches. The complete replay ran typecheck, all 2,092 tests, build and embedded-binary build. Its browser run exposed the same inline notification button regression; the final one-line shared-button display fix and fixed-clock capture amendment were reapplied in that copy, all 53 files matched again, and final typecheck/build/embed/**103 browser tests** passed (11 unchanged skips). No second full fresh replay or full Rust test run.

Replay harness preflight mistakes were corrected before the matching tree was accepted: archive stdout buffer size, GNU cp versus macOS `/bin/cp -c -R`, initializing the replay repository before applying patches (to avoid the enclosing git root), and creating the font output directory. The abandoned `replay-1` (empty) and `replay-2` (base only), `replay-3` and `probes-1` remain in the ignored ledger for parent cleanup. Targets were APFS clones, never shared via CARGO_TARGET_DIR.

**Removal probes:** **21 caught**, in the copied tree only: five accent guards (rounded contrast search, label polarity, neutral handling, source validation and gamut reduction); five theme guards (source migration, bootstrap System selection, apply selection, live media and storage); Step-up Tab trap and modal inert; CSS origin detection, recursive traversal and empty-output refusal; Polish glyph removal independently from Inter and Roboto; distribution asset notices; scoped appearance; emitted-bootstrap migration; crate asset notices. A source migration probe initially passed because the VM bootstrap had its own generated copy: its test now checks the parser directly too, and both source and emitted migration probes fail when removed. All copies were restored after each probe; staged bytes contain no mutations.

**Regression fixes during verification:** field helpers associate hints/errors without adding them to the accessible label; modal cleanup preserves App-owned inert state; shared buttons own display/alignment/border and retain existing 44px notification/device controls. The existing OAuth attention assertion now expects the contrast-safe warning foreground, keeping its exact color assertion. Neither its behavioral assertions nor any PWA sizing/delivery assertion was weakened.

**Visual evidence:** 64 Playwright captures, 16 states × 390×844 / 1280×900 × light/dark, under `.superpowers/sdd/ui-r1/screenshots/`; `screenshots.md` maps every filename to its Design System section. Both font families are loaded before capture; synthetic timestamps are fixed at 2026-10-20T12:00:00Z and animation is reduced. Four contact sheets were visually inspected. States: Login (setup-required error), Setup form/missing link, Sessions, permission session, New session, Hosts, Hats, MCP, Settings, Not found, confirmation, stacked Step-up, gateway MCP, existing gateway redirect from Sessions, and Polish typography sample.

Intentional visual differences: hat-derived yellow acceptance accent with measured dark button labels instead of fixed blue; stronger interactive boundaries; opaque contrast-tested focus halos. Existing shell/session/launcher/management geometry stays for R2–R5. Shared helpers are ready for the actual route/server hat scope wiring in those lanes. Gateway currently redirects Sessions to MCP; R2 owns new unavailable pages. Needs you, Defaults, More and palette do not yet exist in R1. No prototype gallery/device framing.

**Assets:** self-hosted Inter **4.1** and official Roboto successor **3.015**; six final WOFF2s total **272,156 bytes**. Source URLs, source/archive SHA256s, each final filename/size/SHA256 and complete OFL/MIT texts are committed in [font/icon notices](../../web/THIRD_PARTY_NOTICES.txt). Normal builds perform no asset network fetch. Both web output and distribution notices retain those texts.

**Skipped intentionally:** Rust tests/clippy/generators (no crates changed, as the brief permits); 4×3 load repetition (no timing/concurrency implementation); Nix dependency hash update (lockfile unchanged); docs index update (parent-owned); installed-iOS/native push acceptance and independent review (parent-owned). The 11 existing browser skips were retained unchanged.

### Review amendment 1

**Finding 1 (P2):** storage events now adopt only the remote appearance preference. The document retains its own in-memory hat palette, initially the persisted startup fallback and subsequently the palette supplied by its local SessionScope. Remote colors never replace that palette; the listener applies without writing to storage. Loading and storage-denial fallbacks remain safe. The two-hat regression checks red local source and every applied CSS role against blue remote records for dark/light/System, selected hat, session/draft storage and absence of response writes. The old storage test's foreign-source expectation is corrected; loading and denied-storage cases are explicit.

**Finding 2 (ownership exceptions):** R1 amended two existing assertions in `web/src/components/SessionList.test.tsx` (R2-owned) to inspect the versioned theme's `source`, including the neutral All source instead of null. It also amended the exact warning foreground assertion in `web/e2e/mcp-oauth.spec.ts` (R5-owned), from `rgb(178, 106, 0)` to the new contrast-safe `rgb(122, 83, 0)`. These are foundation compatibility exceptions; subsequent ownership stays with R2/R5. No behavioral assertion was removed or weakened.

**Finding 3 (nonblocking, default skip):** retain the existing CSP test as reviewed. Its window-local violation list is asserted only in the final document after multiple navigations; this does not establish absence of violations in every earlier document. The review found no actual CSP regression. Collecting violations across navigations remains an optional small test amendment, with no new CI job recommended.

**Amendment verification:** RED in this worktree before the runtime fix: theme suite exit **1**, **4 failed / 5 passed**. After the fix, targeted theme/hats/SessionList exit **0**, **63 passed / 3 files**. Fresh copy `.superpowers/sdd/ui-r1/amendment-1/probes-1` has its own APFS-cloned target: all **9 theme tests passed**; removing the preference-only merge made the two-hat regression fail (**1 failed / 8 skipped**, expected exit **1**). Both copied source/test files were restored and match the worktree byte for byte. Final typecheck/test/build chain exit **0**, **2,095 tests / 113 files**, **3 CSS guard tests**, **1 emitted CSS asset checked**. Embedded collector/testkit build exit **0**. Focused appearance e2e exit **0**, **5 passed** against the rebuilt binary. Logs live in `.superpowers/sdd/ui-r1/amendment-1/`. No full replay, Rust test run or timing load run for this amendment, per the authorized budget. Historical task patches and original replay evidence above remain unchanged; Task 5 adds the exact amendment patch.

### Offline font CI follow-up

PR #203's Ubuntu web job exposed an auth redirect race in the font acceptance test. Its unauthenticated `/sessions` navigation asynchronously replaced the URL with `/login?next=%2Fsessions`, which intentionally bypasses the worker cache. Waiting for Sign in reproduced `net::ERR_INTERNET_DISCONNECTED` locally with an activated controlling worker and no waiting/installing worker. This is a test setup defect; the worker follows phone spec §4.2.

The test now creates a real authenticated session, waits for the Sessions heading and exact app URL, and requires the navigation response to come from the worker. It clears Chromium's HTTP cache before going offline and requires the offline document and all six font responses to be worker-served. Both font families render the Polish sample, all six FontFaces must load, and the existing font checks remain.

Controlled RED: **1 failed**, exit **1**, at offline reload after the sign-in redirect settled. Corrected focused test: **1 passed**, exit **0**. Full appearance spec with `--repeat-each 10`: **50 passed**, exit **0**, including ten offline reloads. Typecheck exit **0**; web unit tests **2,095 passed / 113 files**, exit **0**. In copied source with a cloned real binary, baseline **1 passed**; expiring auth fails the worker-navigation precondition, and deleting cached WOFF2s fails offline font loading (**1 failed**, exit **1**, each expected). The copied test was restored and matches the tested source. Logs and retained probe copy: `.superpowers/sdd/ui-r1/offline-font-fix/`. Full `CI=1 pnpm --dir web e2e` exit **0**: **103 passed / 11 unchanged skips** (3.9m), including the rebuilt embedded collector/testkit, both update-test binaries and three CSS guard tests. No new replay, Rust suite or additional load matrix for this test-only amendment; the requested ten full-spec repetitions cover the corrected browser setup. Parent owns scoped review and the new Ubuntu/macOS CI run.

## Scope

Three implementation tasks: (1) readable hat roles and browser appearance; (2) semantic tokens, fonts, bundled icons, shared native controls and auth/dialog presentation; (3) emitted-CSS and embedded-browser verification. A final documentation task records execution. No route/shell redesign, backend/defaults work, new runtime dependency, CSP relaxation or prototype files. Only token/base cleanup touches `index.css`/`manage.css`. The two existing SessionList storage assertions change only to the versioned record/source contract.

## Decisions

1. Use the CSS Color 4 OKLab matrices with deterministic gamut reduction and a bounded lightness search. Measure rounded sRGB output against all token surfaces and derived washes; choose button-label polarity from measured contrast. Near-neutral inputs remain neutral.
2. Generate blocking `public/theme.js` with Vite from the same derivation/record source as React. No asynchronous import, inline script or remote request. Validate all persisted properties and reject palettes differing from the source-derived result. Legacy records migrate synchronously without touching selected-hat storage.
3. Browser appearance and selected-hat scope stay independent. Save/apply APIs accept the source-derived palette; live System and storage listeners have document lifetime. Expose a scoped palette hook for session/launcher owners.
4. Native buttons/inputs/selects/textarea/fieldset/radios retain keyboard semantics. Modal focus/inert handling works along sibling paths without remounting the originating form, and leaves App-owned inert state to App. Existing ConfirmDialog/StepUpDialog props and accessible control names remain stable.
5. Roboto's old requested repository redirects to `googlefonts/roboto-2`, whose [official README](https://github.com/googlefonts/roboto-2) names `googlefonts/roboto-3-classic` as the ongoing project. Pin its OFL 3.015 official release, rather than the obsolete Apache 2 fonts. Pin Inter 4.1. All six subsets are committed; no font fetch occurs during normal builds.
6. Icons are the used upstream Heroicons 2.2.0 paths, with decorative SVG semantics. Missing small upstream variants use the same named icon's 20-solid or 24-outline variant, retaining its actual viewBox. No innerHTML/custom element or runtime fetch.
7. An emitted-CSS origin check runs after Vite and recursively inspects every CSS asset, including escaped URL/import syntax. A separate FontTools check inspects actual cmap/fvar/OS2 tables. Browser acceptance verifies the real embedded assets, chosen weights/italic, Polish sample, status/button contrast, CSP and offline font cache.
8. Font/icon notices are copied into web output and appended by both existing distribution notice producers. This narrowly required packaging wiring introduces no release-policy change.

## Global Constraints

- Run tools under `nix develop -c`, using scratch HOME/XDG/tool config; Python uses a one-off Nix shell. No global installs. Use plain `nix develop`, never `path:…`.
- No changes under `crates/**`; no Rust tests required by this frontend-only brief. Build the real collector and fake agent for browser checks. Lockfile unchanged, so no Nix web hash update.
- Preserve sanitized Markdown, explicit list markers, media-query visibility, capabilities, authentication, step-up/retry, question delivery and draft behavior.
- No GitHub action or deploy. Commit as the existing gmail identity with signing disabled; push only `plan/ui-r1`. Parent owns independent reviews/PRs/CI/merge. Do not edit `docs/README.md`.
- Probe only a scratch COPY; APFS-clone target into probe/replay copies, never share CARGO_TARGET_DIR. Keep scratch trees for parent cleanup. Load repetition only applies to timing/concurrency work; none is introduced here.
- Before staging/committing, verify diff hygiene and match the tested source bytes. Generated code uses currentColor and never executes design-bundle code.

## Review Focus

Rounded contrast across both themes; stable hue/gamut/neutral handling; persisted shape allowlist and initial paint; live preference/storage behavior; locally scoped session colors without filter mutation; native control semantics and stacked modal focus/inert cleanup; font provenance/OFL/Polish/weight/italic correctness; completeness of emitted-CSS checks and shipped/distribution notices; unchanged CSP/Markdown/media controls and initial gzip budget.

## File structure

| Task | Files |
|---|---|
| 1 | `web/src/lib/accent.test.ts`, `web/src/lib/accent.ts`, `web/src/lib/theme-bootstrap.ts`, `web/src/lib/theme-record.ts`, `web/theme.config.ts`, `web/public/theme.js`, `web/src/components/SessionList.test.tsx`, `web/src/lib/hats.test.ts`, `web/src/lib/hats.ts`, `web/src/lib/theme.test.ts`, `web/src/lib/theme.ts`, `web/tsconfig.node.json` |
| 2 | `web/THIRD_PARTY_NOTICES.txt`, `web/src/components/ui/Appearance.tsx`, `web/src/components/ui/Badge.tsx`, `web/src/components/ui/Button.tsx`, `web/src/components/ui/Field.tsx`, `web/src/components/ui/Icon.tsx`, `web/src/components/ui/RadioGroup.tsx`, `web/src/components/ui/index.ts`, `web/src/components/ui/primitives.test.tsx`, `web/src/components/ui/ui.css`, `web/src/components/ui/useModalLayer.ts`, `web/src/styles/fonts.css`, `web/src/styles/tokens.css`, `web/third-party-licenses/Heroicons-MIT.txt`, `web/third-party-licenses/Inter-OFL.txt`, `web/third-party-licenses/Roboto-OFL.txt`, `packaging/crate-release.test.mjs`, `packaging/prepare-crates.mjs`, `packaging/release/supply.py`, `packaging/release/test_supply.py`, `web/pwa-build.ts`, `web/src/components/ConfirmDialog.test.tsx`, `web/src/components/ConfirmDialog.tsx`, `web/src/components/StepUpDialog.test.tsx`, `web/src/components/StepUpDialog.tsx`, `web/src/index.css`, `web/src/manage.css`, `web/src/screens/Login.tsx`, `web/src/screens/Setup.tsx` |
| 3 | `web/e2e/appearance.spec.ts`, `web/scripts/check-css-origins.mjs`, `web/scripts/check-css-origins.test.mjs`, `web/scripts/check-fonts.py`, `web/e2e/mcp-oauth.spec.ts`, `web/package.json` |
| 2 assets | `web/public/fonts/*.woff2` (six files; acquisition recipe below) |

## Task 1: Hat palettes and appearance

- [x] **Step 1: Apply the exact implementation patch**

Save this block verbatim as `.superpowers/sdd/ui-r1/task-1.patch`, then run `git apply --check` and `git apply` on it from the base/replay tree. New files and replacements are encoded together; the replay must extract a nonzero file count before claiming success.

```diff
diff --git a/web/src/lib/accent.test.ts b/web/src/lib/accent.test.ts
new file mode 100644
index 00000000..e8278e8d
--- /dev/null
+++ b/web/src/lib/accent.test.ts
@@ -0,0 +1,27 @@
+import { describe, expect, it } from 'vitest'
+import { ACCENT_ROLES, HEX, SURFACES, contrast, deriveAccent, toOKLCH } from './accent'
+
+const hostile = ['#ffffff', '#000000', '#fffffe', '#000001', '#ffff00', '#0000ff', '#ff0000', '#00ff00', '#00ffff', '#ff00ff']
+const grid = [0, 51, 102, 153, 204, 255]
+for (const r of grid) for (const g of grid) for (const b of grid) hostile.push('#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''))
+describe('hat palettes', () => {
+  it.each(hostile)('%s meets rounded text, button, boundary and focus contrast in both themes', (source) => {
+    const derived = deriveAccent(source)
+    expect(derived).toEqual(deriveAccent(source))
+    for (const theme of ['light', 'dark'] as const) {
+      const p = derived[theme]
+      for (const key of ACCENT_ROLES) expect(p[key]).toMatch(HEX)
+      for (const bg of [...SURFACES[theme], p['accent-wash'], p['accent-soft'], p.selected]) {
+        for (const fg of [p.accent, p['accent-hover'], p['accent-fg']]) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
+        expect(contrast(p['focus-ring'], bg)).toBeGreaterThanOrEqual(3)
+      }
+      for (const button of [p.accent, p['accent-hover']]) expect(contrast(p['on-accent'], button)).toBeGreaterThanOrEqual(4.5)
+      expect(contrast(p['focus-ring'], p['focus-halo'])).toBeGreaterThanOrEqual(3)
+    }
+  })
+  it('validates source bytes and keeps near-achromatic inputs neutral', () => {
+    for (const bad of [undefined, '', 'red', '#abc', '#12345g', '#1234567', 'url(x)', '#112233;color:red']) expect(deriveAccent(bad)).toEqual(deriveAccent('#64748b'))
+    expect(deriveAccent('#FF00FF')).toEqual(deriveAccent('#ff00ff'))
+    for (const source of ['#ffffff', '#000000', '#808080', '#fefefd']) for (const p of [deriveAccent(source).light, deriveAccent(source).dark]) expect(toOKLCH(p.accent)[1]).toBeLessThan(.02)
+  })
+})
diff --git a/web/src/lib/accent.ts b/web/src/lib/accent.ts
new file mode 100644
index 00000000..dc346980
--- /dev/null
+++ b/web/src/lib/accent.ts
@@ -0,0 +1,78 @@
+/** Opaque, contrast-checked hat roles. OKLab matrices: CSS Color 4 §9. */
+export const DEFAULT_ACCENT = '#64748b'
+export const HEX = /^#[0-9a-f]{6}$/i
+export type Appearance = 'light' | 'dark'
+export const ACCENT_ROLES = ['accent', 'accent-hover', 'accent-fg', 'on-accent', 'accent-wash', 'accent-soft', 'selected', 'focus-ring', 'focus-halo'] as const
+export type AccentRole = typeof ACCENT_ROLES[number]
+export type Palette = Record<AccentRole, string>
+export interface Accent { source: string; light: Palette; dark: Palette }
+export const SURFACES = {
+  light: ['#f8f9fb', '#ffffff', '#f1f2f5', '#f1f3f7'],
+  dark: ['#141517', '#1a1c1e', '#202223', '#17191b', '#26292b'],
+} as const
+
+const linear = (v: number) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
+const gamma = (v: number) => v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055
+const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
+const hex = (values: number[]) => '#' + values.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
+export function contrast(a: string, b: string): number {
+  const lum = (c: string) => rgb(c).map(linear).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0)
+  const x = lum(a), y = lum(b)
+  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
+}
+export function toOKLCH(colour: string): [number, number, number] {
+  const [r, g, b] = rgb(colour).map(linear)
+  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b)
+  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b)
+  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b)
+  const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s
+  const bb = .0259040371 * l + .7827717662 * m - .808675766 * s
+  return [.2104542553 * l + .793617785 * m - .0040720468 * s, Math.hypot(a, bb), Math.atan2(bb, a)]
+}
+/** Reduce chroma until in gamut; never clip RGB channels. */
+function inGamut(L: number, C: number, h: number): string {
+  for (let step = 0; step <= 40; step++) {
+    const c = step === 40 ? 0 : C * (1 - step / 40)
+    const a = c * Math.cos(h), b = c * Math.sin(h)
+    const l = (L + .3963377774 * a + .2158037573 * b) ** 3
+    const m = (L - .1055613458 * a - .0638541728 * b) ** 3
+    const s = (L - .0894841775 * a - 1.291485548 * b) ** 3
+    const channels = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s]
+    if (channels.every((v) => v >= 0 && v <= 1)) return hex(channels.map(gamma))
+  }
+  return L < .5 ? '#000000' : '#ffffff'
+}
+function palette(source: string, theme: Appearance): Palette {
+  const [, chroma, hue] = toOKLCH(source)
+  const dark = theme === 'dark'
+  const C = chroma < .02 ? 0 : Math.max(dark ? .06 : .08, Math.min(chroma, dark ? .16 : .18))
+  const wash = inGamut(dark ? .28 : .96, Math.min(C, dark ? .05 : .03), hue)
+  const soft = inGamut(dark ? .31 : .93, Math.min(C, dark ? .05 : .03), hue)
+  const selected = inGamut(dark ? .30 : .94, Math.min(C, dark ? .05 : .03), hue)
+  const surfaces = [...SURFACES[theme], wash, soft, selected]
+  const search = (start: number, backgrounds: readonly string[], target: number) => {
+    for (let step = 0; step <= 100; step++) {
+      const L = dark ? start + (1 - start) * step / 100 : start * (1 - step / 100)
+      const result = inGamut(L, C, hue)
+      if (backgrounds.every((bg) => contrast(result, bg) >= target)) return result
+    }
+    return dark ? '#ffffff' : '#000000'
+  }
+  const accent = search(dark ? .72 : .52, surfaces, 4.5)
+  const hover = search(dark ? .80 : .46, surfaces, 4.5)
+  const onAccent = ['#ffffff', '#141517'].sort((a, b) => Math.min(contrast(b, accent), contrast(b, hover)) - Math.min(contrast(a, accent), contrast(a, hover)))[0]
+  return {
+    accent, 'accent-hover': hover, 'accent-fg': search(dark ? .76 : .48, surfaces, 4.5),
+    'on-accent': onAccent, 'accent-wash': wash, 'accent-soft': soft, selected,
+    'focus-ring': search(dark ? .76 : .48, surfaces, 3),
+    // Opaque composited halo: avoids context-dependent alpha contrast.
+    'focus-halo': inGamut(dark ? .38 : .87, Math.min(C, .035), hue),
+  }
+}
+export function deriveAccent(input?: string): Accent {
+  const source = input && HEX.test(input) ? input.toLowerCase() : DEFAULT_ACCENT
+  return { source, light: palette(source, 'light'), dark: palette(source, 'dark') }
+}
+export function paletteProperties(palette: Palette): Record<string, string> {
+  return Object.fromEntries(ACCENT_ROLES.map((role) => [`--hn-${role}`, palette[role]]))
+}
diff --git a/web/src/lib/theme-bootstrap.ts b/web/src/lib/theme-bootstrap.ts
new file mode 100644
index 00000000..fd737611
--- /dev/null
+++ b/web/src/lib/theme-bootstrap.ts
@@ -0,0 +1,7 @@
+// Bundled into public/theme.js: blocking, same-origin, no module/network read.
+import { THEME_KEY, applyTheme, readTheme } from './theme-record'
+let raw: string | null = null
+try { raw = localStorage.getItem(THEME_KEY) } catch { /* storage denial */ }
+const record = readTheme(raw)
+applyTheme(record, window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
+try { localStorage.setItem(THEME_KEY, JSON.stringify(record)) } catch { /* current document still themed */ }
diff --git a/web/src/lib/theme-record.ts b/web/src/lib/theme-record.ts
new file mode 100644
index 00000000..9a9ca908
--- /dev/null
+++ b/web/src/lib/theme-record.ts
@@ -0,0 +1,35 @@
+import { ACCENT_ROLES, DEFAULT_ACCENT, HEX, deriveAccent, type Accent, type Appearance, type Palette } from './accent'
+export const THEME_KEY = 'hennery.theme'
+export type Preference = 'system' | Appearance
+export interface ThemeRecord extends Accent { version: 1; preference: Preference }
+export const isPreference = (p: unknown): p is Preference => p === 'system' || p === 'light' || p === 'dark'
+function isPalette(value: unknown): value is Palette {
+  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
+  const p = value as Record<string, unknown>
+  return Object.keys(p).length === ACCENT_ROLES.length && ACCENT_ROLES.every((key) => typeof p[key] === 'string' && HEX.test(p[key]))
+}
+export function makeTheme(preference: Preference = 'system', source = DEFAULT_ACCENT): ThemeRecord {
+  return { version: 1, preference, ...deriveAccent(source) }
+}
+export function readTheme(raw: string | null): ThemeRecord {
+  try {
+    const v: unknown = JSON.parse(raw ?? 'null')
+    if (!v || typeof v !== 'object' || Array.isArray(v)) return makeTheme()
+    const o = v as Record<string, unknown>
+    if (Object.keys(o).length === 2 && typeof o['--accent'] === 'string' && HEX.test(o['--accent']) && typeof o['--accent-2'] === 'string' && HEX.test(o['--accent-2'])) return makeTheme('system', o['--accent'])
+    if (Object.keys(o).length !== 5 || o.version !== 1 || !isPreference(o.preference) || typeof o.source !== 'string' || !HEX.test(o.source) || !isPalette(o.light) || !isPalette(o.dark)) return makeTheme()
+    // Also reject well-shaped but tampered/unreadable palettes.
+    const expected = deriveAccent(o.source)
+    if (!ACCENT_ROLES.every((key) => o.light && o.dark && (o.light as Palette)[key] === expected.light[key] && (o.dark as Palette)[key] === expected.dark[key])) return makeTheme()
+    return { version: 1, preference: o.preference, ...expected }
+  } catch { return makeTheme() }
+}
+export function applyTheme(record: ThemeRecord, systemDark: boolean): Appearance {
+  const theme = record.preference === 'system' ? (systemDark ? 'dark' : 'light') : record.preference
+  const root = document.documentElement
+  root.dataset.theme = theme
+  root.style.colorScheme = theme
+  for (const key of ACCENT_ROLES) root.style.setProperty(`--hn-${key}`, record[theme][key])
+  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141517' : '#f8f9fb')
+  return theme
+}
diff --git a/web/theme.config.ts b/web/theme.config.ts
new file mode 100644
index 00000000..5052bcce
--- /dev/null
+++ b/web/theme.config.ts
@@ -0,0 +1,6 @@
+import { defineConfig } from 'vite'
+export default defineConfig({
+  publicDir: false,
+  build: { outDir: 'public', emptyOutDir: false, target: 'es2022', minify: false,
+    lib: { entry: 'src/lib/theme-bootstrap.ts', name: 'HenneryTheme', formats: ['iife'], fileName: () => 'theme.js' } },
+})
diff --git a/web/public/theme.js b/web/public/theme.js
index bc4070d3..38620964 100644
--- a/web/public/theme.js
+++ b/web/public/theme.js
@@ -1,22 +1,177 @@
-// The selected hat's colours, applied before the first paint (frontend spec
-// §8). A file of its own, run as a blocking script in <head>, so the page
-// has no inline script and the policy stays `script-src 'self'`. It reads
-// what the app saved (`hennery.theme`) and applies only the listed custom
-// properties, only as `#rrggbb`; anything else is ignored.
-(function () {
-  try {
-    var raw = localStorage.getItem('hennery.theme')
-    if (!raw) return
-    var theme = JSON.parse(raw)
-    if (!theme || typeof theme !== 'object') return
-    var names = ['--accent', '--accent-2']
-    for (var i = 0; i < names.length; i++) {
-      var value = theme[names[i]]
-      if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
-        document.documentElement.style.setProperty(names[i], value)
-      }
-    }
-  } catch (e) {
-    // No storage, or a damaged value: the default colours stay.
-  }
-})()
+(function() {
+	//#region src/lib/accent.ts
+	/** Opaque, contrast-checked hat roles. OKLab matrices: CSS Color 4 §9. */
+	var DEFAULT_ACCENT = "#64748b";
+	var HEX = /^#[0-9a-f]{6}$/i;
+	var ACCENT_ROLES = [
+		"accent",
+		"accent-hover",
+		"accent-fg",
+		"on-accent",
+		"accent-wash",
+		"accent-soft",
+		"selected",
+		"focus-ring",
+		"focus-halo"
+	];
+	var SURFACES = {
+		light: [
+			"#f8f9fb",
+			"#ffffff",
+			"#f1f2f5",
+			"#f1f3f7"
+		],
+		dark: [
+			"#141517",
+			"#1a1c1e",
+			"#202223",
+			"#17191b",
+			"#26292b"
+		]
+	};
+	var linear = (v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
+	var gamma = (v) => v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055;
+	var rgb = (hex) => [
+		1,
+		3,
+		5
+	].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
+	var hex = (values) => "#" + values.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
+	function contrast(a, b) {
+		const lum = (c) => rgb(c).map(linear).reduce((n, v, i) => n + v * [
+			.2126,
+			.7152,
+			.0722
+		][i], 0);
+		const x = lum(a), y = lum(b);
+		return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
+	}
+	function toOKLCH(colour) {
+		const [r, g, b] = rgb(colour).map(linear);
+		const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
+		const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
+		const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
+		const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
+		const bb = .0259040371 * l + .7827717662 * m - .808675766 * s;
+		return [
+			.2104542553 * l + .793617785 * m - .0040720468 * s,
+			Math.hypot(a, bb),
+			Math.atan2(bb, a)
+		];
+	}
+	/** Reduce chroma until in gamut; never clip RGB channels. */
+	function inGamut(L, C, h) {
+		for (let step = 0; step <= 40; step++) {
+			const c = step === 40 ? 0 : C * (1 - step / 40);
+			const a = c * Math.cos(h), b = c * Math.sin(h);
+			const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
+			const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
+			const s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
+			const channels = [
+				4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
+				-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
+				-.0041960863 * l - .7034186147 * m + 1.707614701 * s
+			];
+			if (channels.every((v) => v >= 0 && v <= 1)) return hex(channels.map(gamma));
+		}
+		return L < .5 ? "#000000" : "#ffffff";
+	}
+	function palette(source, theme) {
+		const [, chroma, hue] = toOKLCH(source);
+		const dark = theme === "dark";
+		const C = chroma < .02 ? 0 : Math.max(dark ? .06 : .08, Math.min(chroma, dark ? .16 : .18));
+		const wash = inGamut(dark ? .28 : .96, Math.min(C, dark ? .05 : .03), hue);
+		const soft = inGamut(dark ? .31 : .93, Math.min(C, dark ? .05 : .03), hue);
+		const selected = inGamut(dark ? .3 : .94, Math.min(C, dark ? .05 : .03), hue);
+		const surfaces = [
+			...SURFACES[theme],
+			wash,
+			soft,
+			selected
+		];
+		const search = (start, backgrounds, target) => {
+			for (let step = 0; step <= 100; step++) {
+				const result = inGamut(dark ? start + (1 - start) * step / 100 : start * (1 - step / 100), C, hue);
+				if (backgrounds.every((bg) => contrast(result, bg) >= target)) return result;
+			}
+			return dark ? "#ffffff" : "#000000";
+		};
+		const accent = search(dark ? .72 : .52, surfaces, 4.5);
+		const hover = search(dark ? .8 : .46, surfaces, 4.5);
+		const onAccent = ["#ffffff", "#141517"].sort((a, b) => Math.min(contrast(b, accent), contrast(b, hover)) - Math.min(contrast(a, accent), contrast(a, hover)))[0];
+		return {
+			accent,
+			"accent-hover": hover,
+			"accent-fg": search(dark ? .76 : .48, surfaces, 4.5),
+			"on-accent": onAccent,
+			"accent-wash": wash,
+			"accent-soft": soft,
+			selected,
+			"focus-ring": search(dark ? .76 : .48, surfaces, 3),
+			"focus-halo": inGamut(dark ? .38 : .87, Math.min(C, .035), hue)
+		};
+	}
+	function deriveAccent(input) {
+		const source = input && HEX.test(input) ? input.toLowerCase() : DEFAULT_ACCENT;
+		return {
+			source,
+			light: palette(source, "light"),
+			dark: palette(source, "dark")
+		};
+	}
+	//#endregion
+	//#region src/lib/theme-record.ts
+	var THEME_KEY = "hennery.theme";
+	var isPreference = (p) => p === "system" || p === "light" || p === "dark";
+	function isPalette(value) {
+		if (!value || typeof value !== "object" || Array.isArray(value)) return false;
+		const p = value;
+		return Object.keys(p).length === ACCENT_ROLES.length && ACCENT_ROLES.every((key) => typeof p[key] === "string" && HEX.test(p[key]));
+	}
+	function makeTheme(preference = "system", source = DEFAULT_ACCENT) {
+		return {
+			version: 1,
+			preference,
+			...deriveAccent(source)
+		};
+	}
+	function readTheme(raw) {
+		try {
+			const v = JSON.parse(raw ?? "null");
+			if (!v || typeof v !== "object" || Array.isArray(v)) return makeTheme();
+			const o = v;
+			if (Object.keys(o).length === 2 && typeof o["--accent"] === "string" && HEX.test(o["--accent"]) && typeof o["--accent-2"] === "string" && HEX.test(o["--accent-2"])) return makeTheme("system", o["--accent"]);
+			if (Object.keys(o).length !== 5 || o.version !== 1 || !isPreference(o.preference) || typeof o.source !== "string" || !HEX.test(o.source) || !isPalette(o.light) || !isPalette(o.dark)) return makeTheme();
+			const expected = deriveAccent(o.source);
+			if (!ACCENT_ROLES.every((key) => o.light && o.dark && o.light[key] === expected.light[key] && o.dark[key] === expected.dark[key])) return makeTheme();
+			return {
+				version: 1,
+				preference: o.preference,
+				...expected
+			};
+		} catch {
+			return makeTheme();
+		}
+	}
+	function applyTheme(record, systemDark) {
+		const theme = record.preference === "system" ? systemDark ? "dark" : "light" : record.preference;
+		const root = document.documentElement;
+		root.dataset.theme = theme;
+		root.style.colorScheme = theme;
+		for (const key of ACCENT_ROLES) root.style.setProperty(`--hn-${key}`, record[theme][key]);
+		document.querySelector("meta[name=\"theme-color\"]")?.setAttribute("content", theme === "dark" ? "#141517" : "#f8f9fb");
+		return theme;
+	}
+	//#endregion
+	//#region src/lib/theme-bootstrap.ts
+	var raw = null;
+	try {
+		raw = localStorage.getItem(THEME_KEY);
+	} catch {}
+	var record = readTheme(raw);
+	applyTheme(record, window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
+	try {
+		localStorage.setItem(THEME_KEY, JSON.stringify(record));
+	} catch {}
+	//#endregion
+})();
diff --git a/web/src/components/SessionList.test.tsx b/web/src/components/SessionList.test.tsx
index 4577dd0d..bd8bd187 100644
--- a/web/src/components/SessionList.test.tsx
+++ b/web/src/components/SessionList.test.tsx
@@ -659,10 +659,10 @@ describe('hats', () => {
     render(<App fetchImpl={s.fetch} />)
     const region = await list()
     await userEvent.click(await within(region).findByRole('button', { name: 'Work' }))
-    await waitFor(() => expect(JSON.parse(localStorage.getItem(THEME_KEY)!)['--accent']).toBe('#112233'))
+    await waitFor(() => expect(JSON.parse(localStorage.getItem(THEME_KEY)!).source).toBe('#112233'))
     expect(within(region).getByRole('button', { name: 'Work' })).toHaveAttribute('aria-pressed', 'true')
     await userEvent.click(within(region).getByRole('button', { name: 'Home' }))
-    await waitFor(() => expect(localStorage.getItem(THEME_KEY)).toBeNull())
+    await waitFor(() => expect(JSON.parse(localStorage.getItem(THEME_KEY)!).source).toBe('#64748b'))
   })
 
   it('keeps the saved colours when the hats cannot be read', async () => {
diff --git a/web/src/lib/hats.test.ts b/web/src/lib/hats.test.ts
index b77c27b3..4714a3a8 100644
--- a/web/src/lib/hats.test.ts
+++ b/web/src/lib/hats.test.ts
@@ -1,29 +1,15 @@
 import { beforeEach, describe, expect, it } from 'vitest'
+import { deriveAccent } from './accent'
 import { HAT_KEY, readHat, themeOf, writeHat } from './hats'
-
 beforeEach(() => localStorage.clear())
-
 describe('the selected hat', () => {
-  it('is every hat until one is chosen, then remembered', () => {
+  it('is every hat until chosen, independently of appearance', () => {
     expect(readHat()).toBe('')
     writeHat('hat-a')
     expect(localStorage.getItem(HAT_KEY)).toBe('hat-a')
     expect(readHat()).toBe('hat-a')
-  })
-
-  it('keys its storage under hennery.', () => {
-    expect(HAT_KEY).toBe('hennery.hat')
-  })
-})
-
-describe('themeOf', () => {
-  it('takes a #rrggbb colour, with a darker second stop', () => {
-    expect(themeOf('#4C5FD5')).toEqual({ accent: '#4c5fd5', accent2: '#3b49a4' })
-  })
-
-  it('refuses anything else: the default colours', () => {
-    for (const bad of [undefined, '', 'red', '#abc', '#12345g', '#1234567', 'url(x)', '#112233;color:red']) {
-      expect(themeOf(bad)).toBeNull()
-    }
+    expect(themeOf('#4C5FD5')).toEqual(deriveAccent('#4c5fd5'))
+    expect(themeOf(undefined)).toEqual(deriveAccent())
+    expect(readHat()).toBe('hat-a')
   })
 })
diff --git a/web/src/lib/hats.ts b/web/src/lib/hats.ts
index f45f6bb5..6add801d 100644
--- a/web/src/lib/hats.ts
+++ b/web/src/lib/hats.ts
@@ -1,39 +1,10 @@
-// The selected hat (frontend spec §5): server data, picked by the operator,
-// remembered in this browser. `''` means every hat.
-import type { Theme } from './theme'
-
+// The selected hat is independent of appearance and session-local accents.
+import { deriveAccent, type Accent } from './accent'
 export const HAT_KEY = 'hennery.hat'
-
 export function readHat(): string {
-  try {
-    return localStorage.getItem(HAT_KEY) ?? ''
-  } catch {
-    return ''
-  }
+  try { return localStorage.getItem(HAT_KEY) ?? '' } catch { return '' }
 }
-
 export function writeHat(hat: string): void {
-  try {
-    localStorage.setItem(HAT_KEY, hat)
-  } catch {
-    // No storage: the hat holds for this load only.
-  }
-}
-
-const COLOUR = /^#[0-9a-fA-F]{6}$/
-
-/** `colour` darkened, for the gradient's second stop (the default pair is
- *  about this far apart). */
-function shade(colour: string): string {
-  const n = parseInt(colour.slice(1), 16)
-  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * 0.77)
-  return '#' + [16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')
-}
-
-/** The theme a hat's colour gives, or `null` (the default colours) when it
- *  is not `#rrggbb`. */
-export function themeOf(colour: string | undefined): Theme | null {
-  if (colour === undefined || !COLOUR.test(colour)) return null
-  const accent = colour.toLowerCase()
-  return { accent, accent2: shade(accent) }
+  try { localStorage.setItem(HAT_KEY, hat) } catch { /* current document only */ }
 }
+export function themeOf(colour: string | undefined): Accent { return deriveAccent(colour) }
diff --git a/web/src/lib/theme.test.ts b/web/src/lib/theme.test.ts
index a8d4c937..027efcc1 100644
--- a/web/src/lib/theme.test.ts
+++ b/web/src/lib/theme.test.ts
@@ -1,76 +1,88 @@
 import { readFileSync } from 'node:fs'
-import { join } from 'node:path'
-import { afterEach, describe, expect, it } from 'vitest'
-import { THEME_KEY, saveTheme } from './theme'
-
-/** `/theme.js` as the page runs it, before anything else. */
-function runBootstrap() {
-  const source = readFileSync(join(process.cwd(), 'public/theme.js'), 'utf8')
-  new Function(source)()
-}
-
-const root = () => document.documentElement.style
-
-afterEach(() => {
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { deriveAccent } from './accent'
+import { THEME_KEY, makeTheme, readTheme } from './theme-record'
+const runBootstrap = () => new Function(readFileSync('public/theme.js', 'utf8'))()
+let change: (() => void) | undefined
+let dark = false
+beforeEach(() => {
   localStorage.clear()
-  root().removeProperty('--accent')
-  root().removeProperty('--accent-2')
+  vi.resetModules()
+  dark = false
+  vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return dark }, addEventListener: (_: string, f: () => void) => { change = f } })))
+  document.documentElement.removeAttribute('style')
+  document.head.innerHTML = '<meta name="theme-color" content="#ffffff">'
 })
-
-describe('the theme bootstrap', () => {
-  it('applies the saved colours', () => {
-    localStorage.setItem(THEME_KEY, JSON.stringify({ '--accent': '#112233', '--accent-2': '#445566' }))
+afterEach(() => vi.unstubAllGlobals())
+describe('blocking theme bootstrap', () => {
+  it('selects per-theme derived palettes before React, including system dark', () => {
+    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('dark', '#ffff00')))
     runBootstrap()
-    expect(root().getPropertyValue('--accent')).toBe('#112233')
-    expect(root().getPropertyValue('--accent-2')).toBe('#445566')
+    expect(document.documentElement.dataset.theme).toBe('dark')
+    expect(document.documentElement.style.getPropertyValue('--hn-on-accent')).toBe(deriveAccent('#ffff00').dark['on-accent'])
+    expect(document.documentElement.style.colorScheme).toBe('dark')
+    expect(document.querySelector('meta')?.content).toBe('#141517')
+    localStorage.clear(); dark = true; runBootstrap()
+    expect(document.documentElement.dataset.theme).toBe('dark')
   })
-
-  it('applies only the listed properties, only as #rrggbb', () => {
-    localStorage.setItem(
-      THEME_KEY,
-      JSON.stringify({
-        '--accent': 'red; background:url(https://evil.example/x)',
-        '--accent-2': '#12345',
-        '--bg': '#000000',
-        color: '#000000',
-      }),
-    )
+  it('migrates legacy colours once without touching the selected hat', () => {
+    localStorage.setItem('hennery.hat', 'saved')
+    const legacy = JSON.stringify({ '--accent': '#112233', '--accent-2': '#445566' })
+    expect(readTheme(legacy)).toEqual(makeTheme('system', '#112233'))
+    localStorage.setItem(THEME_KEY, legacy)
     runBootstrap()
-    expect(root().getPropertyValue('--accent')).toBe('')
-    expect(root().getPropertyValue('--accent-2')).toBe('')
-    expect(root().getPropertyValue('--bg')).toBe('')
-    expect(root().cssText).toBe('')
-  })
-
-  it('survives nothing saved, or something damaged', () => {
+    expect(JSON.parse(localStorage.getItem(THEME_KEY)!)).toEqual(makeTheme('system', '#112233'))
+    expect(localStorage.getItem('hennery.hat')).toBe('saved')
     runBootstrap()
-    for (const value of ['not json', 'null', '"#112233"', '[]']) {
-      localStorage.setItem(THEME_KEY, value)
-      expect(runBootstrap).not.toThrow()
+    expect(readTheme(localStorage.getItem(THEME_KEY)).source).toBe('#112233')
+  })
+  it('rejects malformed records, arbitrary properties and CSS payloads atomically', () => {
+    const good = makeTheme()
+    for (const raw of ['not json', 'null', '[]', '"#112233"', JSON.stringify({ ...good, background: '#000000' }), JSON.stringify({ ...good, dark: { ...good.dark, accent: 'red; background:url(https://example.invalid)' } }), JSON.stringify({ ...good, light: { ...good.light, 'on-accent': '#777777' } }), JSON.stringify({ ...good, source: '#fff' }), JSON.stringify({ ...good, preference: 'purple' })]) {
+      localStorage.setItem(THEME_KEY, raw)
+      runBootstrap()
+      expect(readTheme(localStorage.getItem(THEME_KEY))).toEqual(good)
+      expect(document.documentElement.style.getPropertyValue('--hn-accent')).toBe(good.light.accent)
+      expect(document.documentElement.style.background).toBe('')
     }
-    expect(root().cssText).toBe('')
   })
-
-  it('reads what the app saves', () => {
-    saveTheme({ accent: '#0a0b0c', accent2: '#0d0e0f' })
-    root().removeProperty('--accent')
-    root().removeProperty('--accent-2')
-    runBootstrap()
-    expect(root().getPropertyValue('--accent')).toBe('#0a0b0c')
-    expect(root().getPropertyValue('--accent-2')).toBe('#0d0e0f')
+  it('works with storage denied', () => {
+    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('denied') })
+    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied') })
+    expect(runBootstrap).not.toThrow()
+    expect(document.documentElement.dataset.theme).toBe('light')
+    vi.restoreAllMocks()
   })
 })
-
-describe('saveTheme', () => {
-  it('refuses a colour that is not #rrggbb', () => {
-    expect(() => saveTheme({ accent: 'red', accent2: '#000000' })).toThrow()
-    expect(localStorage.getItem(THEME_KEY)).toBeNull()
+describe('live appearance', () => {
+  it('cycles preferences, follows System only and preserves the hat source', async () => {
+    const t = await import('./theme')
+    t.saveTheme(deriveAccent('#ff00ff'))
+    dark = true; change?.()
+    expect(document.documentElement.dataset.theme).toBe('dark')
+    t.cycleAppearance()
+    expect(t.getTheme().preference).toBe('light')
+    change?.()
+    expect(document.documentElement.dataset.theme).toBe('light')
+    t.cycleAppearance(); expect(t.getTheme().preference).toBe('dark')
+    t.cycleAppearance(); expect(t.getTheme().preference).toBe('system')
+    expect(t.getTheme().source).toBe('#ff00ff')
+    t.saveTheme(null)
+    expect(t.getTheme().source).toBe('#64748b')
   })
-
-  it('forgets the theme', () => {
-    saveTheme({ accent: '#0a0b0c', accent2: '#0d0e0f' })
-    saveTheme(null)
-    expect(localStorage.getItem(THEME_KEY)).toBeNull()
-    expect(root().getPropertyValue('--accent')).toBe('')
+  it('reconciles storage changes without modifying hat scope or other storage', async () => {
+    const t = await import('./theme')
+    localStorage.setItem('hennery.hat', 'hat-a')
+    localStorage.setItem('draft', 'keep')
+    const notify = vi.fn()
+    const unsubscribe = t.subscribeTheme(notify)
+    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('dark', '#0000ff')))
+    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }))
+    expect(t.getTheme()).toEqual(makeTheme('dark', '#0000ff'))
+    expect(document.documentElement.dataset.theme).toBe('dark')
+    expect(localStorage.getItem('hennery.hat')).toBe('hat-a')
+    expect(localStorage.getItem('draft')).toBe('keep')
+    expect(notify).toHaveBeenCalled()
+    unsubscribe()
   })
 })
diff --git a/web/src/lib/theme.ts b/web/src/lib/theme.ts
index 291d8f4d..16fde96d 100644
--- a/web/src/lib/theme.ts
+++ b/web/src/lib/theme.ts
@@ -1,36 +1,60 @@
-// The colours `/theme.js` applies before the first paint (frontend spec §8).
-// The app saves them when the selected hat changes (4c, 4d), from the hat's
-// colours on the server, and applies them at once.
-
-export const THEME_KEY = 'hennery.theme'
-
-export interface Theme {
-  accent: string
-  accent2: string
+import { useSyncExternalStore } from 'react'
+import { deriveAccent, paletteProperties, type Accent, type Appearance } from './accent'
+import { THEME_KEY, applyTheme, isPreference, makeTheme, readTheme, type Preference, type ThemeRecord } from './theme-record'
+export { THEME_KEY, type Preference }
+export type Theme = Accent
+let current: ThemeRecord | undefined
+let resolved: Appearance = 'light'
+const listeners = new Set<() => void>()
+let watching = false
+function media() { return window.matchMedia?.('(prefers-color-scheme: dark)') }
+function read(): ThemeRecord {
+  try { return readTheme(localStorage.getItem(THEME_KEY)) } catch { return makeTheme() }
 }
-
-const COLOUR = /^#[0-9a-fA-F]{6}$/
-
-/** Save `theme` for the next load and apply it now. A colour that is not
- *  `#rrggbb` is refused, as `/theme.js` would refuse it. */
-export function saveTheme(theme: Theme | null): void {
-  const root = document.documentElement.style
-  if (theme === null) {
-    root.removeProperty('--accent')
-    root.removeProperty('--accent-2')
-    try {
-      localStorage.removeItem(THEME_KEY)
-    } catch {
-      // No storage: the default colours stay anyway.
-    }
-    return
-  }
-  if (!COLOUR.test(theme.accent) || !COLOUR.test(theme.accent2)) throw new Error('A theme colour must be #rrggbb.')
-  root.setProperty('--accent', theme.accent)
-  root.setProperty('--accent-2', theme.accent2)
-  try {
-    localStorage.setItem(THEME_KEY, JSON.stringify({ '--accent': theme.accent, '--accent-2': theme.accent2 }))
-  } catch {
-    // No storage: applied for this load only.
-  }
+function apply() {
+  resolved = applyTheme(current ??= read(), media()?.matches ?? false)
+  for (const notify of listeners) notify()
+}
+function watch() {
+  if (watching) return
+  watching = true
+  media()?.addEventListener('change', () => { if (getTheme().preference === 'system') apply() })
+  window.addEventListener('storage', (e) => {
+    if (e.key === THEME_KEY || e.key === null) { current = read(); apply() }
+  })
+  apply()
+}
+export function getTheme(): ThemeRecord { return current ??= read() }
+function save(record: ThemeRecord) {
+  current = record
+  watch()
+  apply()
+  try { localStorage.setItem(THEME_KEY, JSON.stringify(record)) } catch { /* current document only */ }
 }
+/** Compatibility seam for SessionScope; null means All's neutral accent. */
+export function saveTheme(theme: Theme | null): void { save({ version: 1, preference: getTheme().preference, ...(theme ?? deriveAccent()) }) }
+export function setAppearance(preference: Preference): void {
+  if (!isPreference(preference)) throw new Error('Unknown appearance.')
+  save({ ...getTheme(), preference })
+}
+export function cycleAppearance(): void {
+  const order: Preference[] = ['system', 'light', 'dark']
+  setAppearance(order[(order.indexOf(getTheme().preference) + 1) % order.length])
+}
+export function subscribeTheme(notify: () => void): () => void {
+  watch(); listeners.add(notify)
+  return () => { listeners.delete(notify) }
+}
+export function useAppearance(): { preference: Preference; resolved: Appearance } {
+  const preference = useSyncExternalStore(subscribeTheme, () => getTheme().preference)
+  const theme = useSyncExternalStore(subscribeTheme, () => resolved)
+  return { preference, resolved: theme }
+}
+/** Session/launcher owners scope this style without changing overview hat choice. */
+export function useAccentStyle(source: string | undefined): Record<string, string> {
+  const { resolved: appearance } = useAppearance()
+  return paletteProperties(deriveAccent(source)[appearance])
+}
+
+// Document-lifetime listeners also cover gateway screens and failed hat reads.
+watch()
diff --git a/web/tsconfig.node.json b/web/tsconfig.node.json
index f7f82cc7..c79e59e2 100644
--- a/web/tsconfig.node.json
+++ b/web/tsconfig.node.json
@@ -19,5 +19,5 @@
 
     "types": ["node"]
   },
-  "include": ["vite.config.ts", "playwright.config.ts", "e2e"]
+  "include": ["vite.config.ts", "theme.config.ts", "playwright.config.ts", "e2e"]
 }
```

- [x] **Step 2: Verify**

Run `nix develop -c pnpm --dir web exec vite build --config theme.config.ts`, then `nix develop -c pnpm --dir web test src/lib/accent.test.ts src/lib/theme.test.ts src/lib/hats.test.ts src/components/SessionList.test.tsx`. Regenerate bootstrap and check the committed bytes match. Removal probes independently break contrast search, label polarity, neutral/gamut/input handling, migration, initial System selection, live media and storage reconciliation; tests must fail with each removed guard.

- [x] **Step 3: Commit/push**

Stage only this task and this plan, inspect `git diff --cached --stat` and `git diff --cached`, check author identities, commit `feat(ui): derive readable hat palettes and browser appearance`, push `git push origin plan/ui-r1`. Review request goes through the parent.

## Task 2: Tokens, local assets and shared controls

- [x] **Step 1: Apply the exact implementation patch**

Save this block verbatim as `.superpowers/sdd/ui-r1/task-2.patch`, then run `git apply --check` and `git apply` on it from the base/replay tree. New files and replacements are encoded together; the replay must extract a nonzero file count before claiming success.

```diff
diff --git a/web/THIRD_PARTY_NOTICES.txt b/web/THIRD_PARTY_NOTICES.txt
new file mode 100644
index 00000000..74d0af7c
--- /dev/null
+++ b/web/THIRD_PARTY_NOTICES.txt
@@ -0,0 +1,250 @@
+Locally bundled UI assets (no runtime or build-time font/icon fetching)
+
+Inter 4.1 — OFL-1.1
+Source: https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
+Archive sha256: 9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e
+InterVariable.ttf sha256: 4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf
+InterVariable-Italic.ttf sha256: d6f1f6a172d9e588438db9f986fd5cfad7b30f644374080a8a9d4d91e344586f
+
+Roboto 3.015 — OFL-1.1
+Source: https://github.com/googlefonts/roboto-3-classic/releases/download/v3.015/Roboto_v3.015.zip
+The old googlefonts/roboto repository redirects to roboto-2; its README names
+roboto-3-classic as the continuing official project. This is that OFL release.
+Archive sha256: bee3e9334ea86dd63e184598f31fb16750881c2da1a6f097a66e0f66a95b3d54
+web/split/Roboto[wdth,wght].ttf sha256: d7598e12c5dbef095ff8272cfc55da0250bd07fbdecbac8a530b9b277872a134
+OFL source: https://raw.githubusercontent.com/googlefonts/roboto-3-classic/v3.015/OFL.txt
+
+Derived font files: latin and latin-ext, including Polish, variable weights 400–700.
+Inter optical size pinned at 14; Roboto width pinned at 100. Inter italic included.
+Subsetting preserves the original family names and copyright; neither OFL
+reserves a font name. Exact subsetting commands are in the UI R1 plan.
+
+Inter-italic-latin-ext.woff2: 51744 bytes; sha256 e588010a7c49441d9f37eefb311255ffbe700fc6f753882f36fc6e74c727c42a
+Inter-italic-latin.woff2: 53612 bytes; sha256 936f815ca529d36d6a669971a4f912788860c315a6c24d3701078cc0c28ad96a
+Inter-normal-latin-ext.woff2: 48972 bytes; sha256 3f8140c577138b00ac972a9b45490dd010365b1faeb2f245ba9cd4faea936137
+Inter-normal-latin.woff2: 49456 bytes; sha256 0128ce03860bab4605049a6d38f9bfea2558690fa3e2263c9b9bb14726a7721f
+Roboto-normal-latin-ext.woff2: 28576 bytes; sha256 5217f6097814b1f0abbfde230ddef8d6918359b55d89db89fa6550f7d9328b11
+Roboto-normal-latin.woff2: 39796 bytes; sha256 1295cf18edcdcf0f7f3879f6aacdc5cb7d52316b9de83529c69bb02abe4c3fe8
+
+Heroicons 2.2.0 — MIT
+Source: https://github.com/tailwindlabs/heroicons/releases/tag/v2.2.0
+Archive: https://codeload.github.com/tailwindlabs/heroicons/tar.gz/refs/tags/v2.2.0
+Archive sha256: 42bd31001127631a20270e7bd87ac13647bfcd628dd533e2ff31497068b4f7af
+Used SVG paths in src/components/ui/Icon.tsx, currentColor, no runtime fetch.
+
+Full upstream licence texts follow, also preserved separately in third-party-licenses/.
+
+===== third-party-licenses/Inter-OFL.txt =====
+Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)
+
+This Font Software is licensed under the SIL Open Font License, Version 1.1.
+This license is copied below, and is also available with a FAQ at:
+http://scripts.sil.org/OFL
+
+-----------------------------------------------------------
+SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
+-----------------------------------------------------------
+
+PREAMBLE
+The goals of the Open Font License (OFL) are to stimulate worldwide
+development of collaborative font projects, to support the font creation
+efforts of academic and linguistic communities, and to provide a free and
+open framework in which fonts may be shared and improved in partnership
+with others.
+
+The OFL allows the licensed fonts to be used, studied, modified and
+redistributed freely as long as they are not sold by themselves. The
+fonts, including any derivative works, can be bundled, embedded,
+redistributed and/or sold with any software provided that any reserved
+names are not used by derivative works. The fonts and derivatives,
+however, cannot be released under any other type of license. The
+requirement for fonts to remain under this license does not apply
+to any document created using the fonts or their derivatives.
+
+DEFINITIONS
+"Font Software" refers to the set of files released by the Copyright
+Holder(s) under this license and clearly marked as such. This may
+include source files, build scripts and documentation.
+
+"Reserved Font Name" refers to any names specified as such after the
+copyright statement(s).
+
+"Original Version" refers to the collection of Font Software components as
+distributed by the Copyright Holder(s).
+
+"Modified Version" refers to any derivative made by adding to, deleting,
+or substituting -- in part or in whole -- any of the components of the
+Original Version, by changing formats or by porting the Font Software to a
+new environment.
+
+"Author" refers to any designer, engineer, programmer, technical
+writer or other person who contributed to the Font Software.
+
+PERMISSION AND CONDITIONS
+Permission is hereby granted, free of charge, to any person obtaining
+a copy of the Font Software, to use, study, copy, merge, embed, modify,
+redistribute, and sell modified and unmodified copies of the Font
+Software, subject to the following conditions:
+
+1) Neither the Font Software nor any of its individual components,
+in Original or Modified Versions, may be sold by itself.
+
+2) Original or Modified Versions of the Font Software may be bundled,
+redistributed and/or sold with any software, provided that each copy
+contains the above copyright notice and this license. These can be
+included either as stand-alone text files, human-readable headers or
+in the appropriate machine-readable metadata fields within text or
+binary files as long as those fields can be easily viewed by the user.
+
+3) No Modified Version of the Font Software may use the Reserved Font
+Name(s) unless explicit written permission is granted by the corresponding
+Copyright Holder. This restriction only applies to the primary font name as
+presented to the users.
+
+4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
+Software shall not be used to promote, endorse or advertise any
+Modified Version, except to acknowledge the contribution(s) of the
+Copyright Holder(s) and the Author(s) or with their explicit written
+permission.
+
+5) The Font Software, modified or unmodified, in part or in whole,
+must be distributed entirely under this license, and must not be
+distributed under any other license. The requirement for fonts to
+remain under this license does not apply to any document created
+using the Font Software.
+
+TERMINATION
+This license becomes null and void if any of the above conditions are
+not met.
+
+DISCLAIMER
+THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
+EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
+MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
+OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
+COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
+INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
+DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
+FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
+OTHER DEALINGS IN THE FONT SOFTWARE.
+
+
+===== third-party-licenses/Roboto-OFL.txt =====
+Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)
+
+This Font Software is licensed under the SIL Open Font License, Version 1.1.
+This license is copied below, and is also available with a FAQ at:
+https://openfontlicense.org
+
+
+-----------------------------------------------------------
+SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
+-----------------------------------------------------------
+
+PREAMBLE
+The goals of the Open Font License (OFL) are to stimulate worldwide
+development of collaborative font projects, to support the font creation
+efforts of academic and linguistic communities, and to provide a free and
+open framework in which fonts may be shared and improved in partnership
+with others.
+
+The OFL allows the licensed fonts to be used, studied, modified and
+redistributed freely as long as they are not sold by themselves. The
+fonts, including any derivative works, can be bundled, embedded, 
+redistributed and/or sold with any software provided that any reserved
+names are not used by derivative works. The fonts and derivatives,
+however, cannot be released under any other type of license. The
+requirement for fonts to remain under this license does not apply
+to any document created using the fonts or their derivatives.
+
+DEFINITIONS
+"Font Software" refers to the set of files released by the Copyright
+Holder(s) under this license and clearly marked as such. This may
+include source files, build scripts and documentation.
+
+"Reserved Font Name" refers to any names specified as such after the
+copyright statement(s).
+
+"Original Version" refers to the collection of Font Software components as
+distributed by the Copyright Holder(s).
+
+"Modified Version" refers to any derivative made by adding to, deleting,
+or substituting -- in part or in whole -- any of the components of the
+Original Version, by changing formats or by porting the Font Software to a
+new environment.
+
+"Author" refers to any designer, engineer, programmer, technical
+writer or other person who contributed to the Font Software.
+
+PERMISSION & CONDITIONS
+Permission is hereby granted, free of charge, to any person obtaining
+a copy of the Font Software, to use, study, copy, merge, embed, modify,
+redistribute, and sell modified and unmodified copies of the Font
+Software, subject to the following conditions:
+
+1) Neither the Font Software nor any of its individual components,
+in Original or Modified Versions, may be sold by itself.
+
+2) Original or Modified Versions of the Font Software may be bundled,
+redistributed and/or sold with any software, provided that each copy
+contains the above copyright notice and this license. These can be
+included either as stand-alone text files, human-readable headers or
+in the appropriate machine-readable metadata fields within text or
+binary files as long as those fields can be easily viewed by the user.
+
+3) No Modified Version of the Font Software may use the Reserved Font
+Name(s) unless explicit written permission is granted by the corresponding
+Copyright Holder. This restriction only applies to the primary font name as
+presented to the users.
+
+4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
+Software shall not be used to promote, endorse or advertise any
+Modified Version, except to acknowledge the contribution(s) of the
+Copyright Holder(s) and the Author(s) or with their explicit written
+permission.
+
+5) The Font Software, modified or unmodified, in part or in whole,
+must be distributed entirely under this license, and must not be
+distributed under any other license. The requirement for fonts to
+remain under this license does not apply to any document created
+using the Font Software.
+
+TERMINATION
+This license becomes null and void if any of the above conditions are
+not met.
+
+DISCLAIMER
+THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
+EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
+MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
+OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
+COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
+INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
+DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
+FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
+OTHER DEALINGS IN THE FONT SOFTWARE.
+
+
+===== third-party-licenses/Heroicons-MIT.txt =====
+MIT License
+
+Copyright (c) Tailwind Labs, Inc.
+
+Permission is hereby granted, free of charge, to any person obtaining a copy
+of this software and associated documentation files (the "Software"), to deal
+in the Software without restriction, including without limitation the rights
+to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
+copies of the Software, and to permit persons to whom the Software is
+furnished to do so, subject to the following conditions:
+
+The above copyright notice and this permission notice shall be included in all
+copies or substantial portions of the Software.
+
+THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
+IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
+FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
+AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
+LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
+OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
+SOFTWARE.
+
diff --git a/web/src/components/ui/Appearance.tsx b/web/src/components/ui/Appearance.tsx
new file mode 100644
index 00000000..0f2849e9
--- /dev/null
+++ b/web/src/components/ui/Appearance.tsx
@@ -0,0 +1,13 @@
+import { cycleAppearance, setAppearance, useAppearance } from '../../lib/theme'
+import { Icon } from './Icon'
+import { Button } from './Button'
+import { RadioGroup } from './RadioGroup'
+export function AppearanceOptions() {
+  const { preference } = useAppearance()
+  return <div className="ui-appearance"><RadioGroup label="Appearance" value={preference} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={setAppearance} /><span className="ui-theme-announcement" role="status">Appearance: {preference}</span></div>
+}
+/** R2 rail / R5 Settings / R6 shortcuts all use the same preference cycle. */
+export function AppearanceButton() {
+  const { preference, resolved } = useAppearance()
+  return <><Button variant="ghost" onClick={cycleAppearance} aria-label={`Appearance: ${preference}. Change appearance`}><Icon name={resolved === 'dark' ? 'moon' : 'sun'} />{preference}</Button><span className="ui-theme-announcement" role="status">Appearance: {preference}</span></>
+}
diff --git a/web/src/components/ui/Badge.tsx b/web/src/components/ui/Badge.tsx
new file mode 100644
index 00000000..eeea33d9
--- /dev/null
+++ b/web/src/components/ui/Badge.tsx
@@ -0,0 +1,15 @@
+import type { ReactNode } from 'react'
+import { Icon, type IconName } from './Icon'
+import { useAccentStyle } from '../../lib/theme'
+export type Status = 'wait' | 'run' | 'start' | 'idle' | 'park' | 'fail' | 'warn'
+const glyphs: Record<Status, IconName> = { wait: 'hand-raised', run: 'play-circle', start: 'arrow-path', idle: 'check-circle', park: 'pause', fail: 'exclamation-circle', warn: 'shield-exclamation' }
+export function StatusBadge({ status, children }: { status: Status; children: ReactNode }) {
+  return <span className={`ui-status ui-status-${status}`}><Icon name={glyphs[status]} variant="16/solid" size={14} />{children}</span>
+}
+export function Keycap({ children }: { children: ReactNode }) { return <kbd className="ui-keycap">{children}</kbd> }
+export function CountPill({ count, label }: { count: number; label: string }) { return <span className="ui-count" aria-label={`${count} ${label}`}>{count}</span> }
+export function ConfigChip({ inherited, children }: { inherited: boolean; children: ReactNode }) { return <span className={`ui-chip ui-chip-${inherited ? 'inherits' : 'override'}`}>{children}</span> }
+export function HatChip({ colour, children }: { colour?: string; children: ReactNode }) {
+  const style = useAccentStyle(colour)
+  return <span className="ui-hat hn-accent-scope" style={style}><span className="ui-hat-swatch" aria-hidden="true" />{children}</span>
+}
diff --git a/web/src/components/ui/Button.tsx b/web/src/components/ui/Button.tsx
new file mode 100644
index 00000000..a04644cd
--- /dev/null
+++ b/web/src/components/ui/Button.tsx
@@ -0,0 +1,12 @@
+import type { ButtonHTMLAttributes } from 'react'
+import { Icon, type IconName } from './Icon'
+export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
+  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
+  small?: boolean
+}
+export function Button({ variant = 'secondary', small, className = '', type = 'button', ...props }: ButtonProps) {
+  return <button type={type} className={`btn btn-${variant}${small ? ' btn-sm' : ''} ${className}`} {...props} />
+}
+export function IconButton({ icon, label, ...props }: Omit<ButtonProps, 'children' | 'aria-label'> & { icon: IconName; label: string }) {
+  return <Button {...props} className={`btn-icon ${props.className ?? ''}`} aria-label={label}><Icon name={icon} /></Button>
+}
diff --git a/web/src/components/ui/Field.tsx b/web/src/components/ui/Field.tsx
new file mode 100644
index 00000000..783eb745
--- /dev/null
+++ b/web/src/components/ui/Field.tsx
@@ -0,0 +1,20 @@
+import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
+interface FieldProps { label: string; hint?: ReactNode; error?: ReactNode; id?: string }
+function described(id: string, hint: ReactNode, error: ReactNode, extra?: string) {
+  return [extra, hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
+}
+function Messages({ id, hint, error }: Omit<FieldProps, 'label'> & { id: string }) {
+  return <>{hint && <span className="ui-hint" id={`${id}-hint`}>{hint}</span>}{error && <span className="ui-error" id={`${id}-error`}>{error}</span>}</>
+}
+export function Input({ label, hint, error, id: given, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
+  const generated = useId(), id = given ?? generated
+  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label><input {...props} id={id} className={`text-input ${props.className ?? ''}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={described(id, hint, error, props['aria-describedby'])} /><Messages id={id} hint={hint} error={error} /></div>
+}
+export function Select({ label, hint, error, id: given, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
+  const generated = useId(), id = given ?? generated
+  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label><select {...props} id={id} className={`ui-select ${props.className ?? ''}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={described(id, hint, error, props['aria-describedby'])}>{children}</select><Messages id={id} hint={hint} error={error} /></div>
+}
+export function Textarea({ label, hint, error, id: given, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
+  const generated = useId(), id = given ?? generated
+  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label><textarea {...props} id={id} className={`ui-textarea ${props.className ?? ''}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={described(id, hint, error, props['aria-describedby'])} /><Messages id={id} hint={hint} error={error} /></div>
+}
diff --git a/web/src/components/ui/Icon.tsx b/web/src/components/ui/Icon.tsx
new file mode 100644
index 00000000..576da5d6
--- /dev/null
+++ b/web/src/components/ui/Icon.tsx
@@ -0,0 +1,470 @@
+// Heroicons v2.2.0 (MIT), bundled SVG paths. See THIRD_PARTY_NOTICES.txt.
+import type { ReactNode } from 'react'
+export type IconVariant = '24/outline' | '24/solid' | '20/solid' | '16/solid'
+const paths = {
+  'adjustments-horizontal': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 4.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM5 3.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM4.25 17a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM17.25 17a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM9 10a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1 0-1.5h5.5A.75.75 0 0 1 9 10ZM17.25 10.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM10 16.25a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M6.5 2.25a.75.75 0 0 0-1.5 0v3a.75.75 0 0 0 1.5 0V4.5h6.75a.75.75 0 0 0 0-1.5H6.5v-.75ZM11 6.5a.75.75 0 0 0-1.5 0v3a.75.75 0 0 0 1.5 0v-.75h2.25a.75.75 0 0 0 0-1.5H11V6.5ZM5.75 10a.75.75 0 0 1 .75.75v.75h6.75a.75.75 0 0 1 0 1.5H6.5v.75a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75ZM2.75 7.25H8.5v1.5H2.75a.75.75 0 0 1 0-1.5ZM4 3H2.75a.75.75 0 0 0 0 1.5H4V3ZM2.75 11.5H4V13H2.75a.75.75 0 0 1 0-1.5Z"/></>, box: 16, outline: false },
+  },
+  'arrow-down-left': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 4.5-15 15m0 0h11.25m-11.25 0V8.25"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M20.03 3.97a.75.75 0 0 1 0 1.06L6.31 18.75h9.44a.75.75 0 0 1 0 1.5H4.5a.75.75 0 0 1-.75-.75V8.25a.75.75 0 0 1 1.5 0v9.44L18.97 3.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M14.78 5.22a.75.75 0 0 0-1.06 0L6.5 12.44V6.75a.75.75 0 0 0-1.5 0v7.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 0-1.5H7.56l7.22-7.22a.75.75 0 0 0 0-1.06Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M11.78 4.22a.75.75 0 0 1 0 1.06L6.56 10.5h3.69a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75v-5.5a.75.75 0 0 1 1.5 0v3.69l5.22-5.22a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'arrow-left': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'arrow-path': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'arrow-right': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'arrow-right-end-on-rectangle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V15a.75.75 0 0 0-1.5 0v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3V9A.75.75 0 1 0 9 9V5.25a1.5 1.5 0 0 1 1.5-1.5h6Zm-5.03 4.72a.75.75 0 0 0 0 1.06l1.72 1.72H2.25a.75.75 0 0 0 0 1.5h10.94l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 0 0-1.06 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M17 4.25A2.25 2.25 0 0 0 14.75 2h-5.5A2.25 2.25 0 0 0 7 4.25v2a.75.75 0 0 0 1.5 0v-2a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v11.5a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-2a.75.75 0 0 0-1.5 0v2A2.25 2.25 0 0 0 9.25 18h5.5A2.25 2.25 0 0 0 17 15.75V4.25Z" clipRule="evenodd"/>
+  <path fillRule="evenodd" d="M1 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H1.75A.75.75 0 0 1 1 10Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M11.25 2A2.75 2.75 0 0 1 14 4.75v6.5A2.75 2.75 0 0 1 11.25 14h-3a2.75 2.75 0 0 1-2.75-2.75v-.5a.75.75 0 0 1 1.5 0v.5c0 .69.56 1.25 1.25 1.25h3c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25h-3C7.56 3.5 7 4.06 7 4.75v.5a.75.75 0 0 1-1.5 0v-.5A2.75 2.75 0 0 1 8.25 2h3Z"/>
+  <path d="M7.97 6.28a.75.75 0 0 1 1.06-1.06l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 1 1-1.06-1.06l.97-.97H1.75a.75.75 0 0 1 0-1.5h7.19l-.97-.97Z"/></>, box: 16, outline: false },
+  },
+  'arrow-right-on-rectangle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd"/>
+  <path fillRule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clipRule="evenodd"/></>, box: 20, outline: false },
+  },
+  'arrow-turn-down-right': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M3.74 3.749a.75.75 0 0 1 .75.75V15h13.938l-2.47-2.47a.75.75 0 0 1 1.061-1.06l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 0 1-1.06-1.06l2.47-2.47H3.738a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.751Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M3.75 3a.75.75 0 0 1 .75.75v7.5h10.94l-1.97-1.97a.75.75 0 0 1 1.06-1.06l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06l1.97-1.97H3.75A.75.75 0 0 1 3 12V3.75A.75.75 0 0 1 3.75 3Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M2.75 2a.75.75 0 0 1 .75.75v6.5h7.94l-.97-.97a.75.75 0 0 1 1.06-1.06l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 1 1-1.06-1.06l.97-.97H2.75A.75.75 0 0 1 2 10V2.75A.75.75 0 0 1 2.75 2Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'arrow-up': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06l-6.22-6.22V21a.75.75 0 0 1-1.5 0V4.81l-6.22 6.22a.75.75 0 1 1-1.06-1.06l7.5-7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'bell': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M12 5a4 4 0 0 0-8 0v2.379a1.5 1.5 0 0 1-.44 1.06L2.294 9.707a1 1 0 0 0-.293.707V11a1 1 0 0 0 1 1h2a3 3 0 1 0 6 0h2a1 1 0 0 0 1-1v-.586a1 1 0 0 0-.293-.707L12.44 8.44A1.5 1.5 0 0 1 12 7.38V5Zm-5.5 7a1.5 1.5 0 0 0 3 0h-3Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'bell-alert': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z"/>
+  <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M4.214 3.227a.75.75 0 0 0-1.156-.955 8.97 8.97 0 0 0-1.856 3.825.75.75 0 0 0 1.466.316 7.47 7.47 0 0 1 1.546-3.186ZM16.942 2.272a.75.75 0 0 0-1.157.955 7.47 7.47 0 0 1 1.547 3.186.75.75 0 0 0 1.466-.316 8.971 8.971 0 0 0-1.856-3.825Z"/>
+  <path fillRule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Zm0 14.5a2 2 0 0 1-1.95-1.557 33.54 33.54 0 0 0 3.9 0A2 2 0 0 1 10 16.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M3.6 1.7A.75.75 0 1 0 2.4.799a6.978 6.978 0 0 0-1.123 2.247.75.75 0 1 0 1.44.418c.187-.644.489-1.24.883-1.764ZM13.6.799a.75.75 0 1 0-1.2.9 5.48 5.48 0 0 1 .883 1.765.75.75 0 1 0 1.44-.418A6.978 6.978 0 0 0 13.6.799Z"/>
+  <path fillRule="evenodd" d="M8 1a4 4 0 0 1 4 4v2.379c0 .398.158.779.44 1.06l1.267 1.268a1 1 0 0 1 .293.707V11a1 1 0 0 1-1 1h-2a3 3 0 1 1-6 0H3a1 1 0 0 1-1-1v-.586a1 1 0 0 1 .293-.707L3.56 8.44A1.5 1.5 0 0 0 4 7.38V5a4 4 0 0 1 4-4Zm0 12.5A1.5 1.5 0 0 1 6.5 12h3A1.5 1.5 0 0 1 8 13.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chat-bubble-left': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97-1.94.284-3.916.455-5.922.505a.39.39 0 0 0-.266.112L8.78 21.53A.75.75 0 0 1 7.5 21v-3.955a48.842 48.842 0 0 1-2.652-.316c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M3.43 2.524A41.29 41.29 0 0 1 10 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.202 41.202 0 0 1-5.183.501.78.78 0 0 0-.528.224l-3.579 3.58A.75.75 0 0 1 6 17.25v-3.443a41.033 41.033 0 0 1-2.57-.33C1.993 13.244 1 11.986 1 10.573V5.426c0-1.413.993-2.67 2.43-2.902Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.286.684-.294a44.298 44.298 0 0 0 3.837-.293C14.287 10.565 15 9.723 15 8.74V4.26c0-.983-.713-1.825-1.69-1.943a44.447 44.447 0 0 0-10.62 0C1.712 2.435 1 3.277 1 4.26v4.482Z"/></>, box: 16, outline: false },
+  },
+  'chat-bubble-left-ellipsis': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 2.25c-2.429 0-4.817.178-7.152.521C2.87 3.061 1.5 4.795 1.5 6.741v6.018c0 1.946 1.37 3.68 3.348 3.97.877.129 1.761.234 2.652.316V21a.75.75 0 0 0 1.28.53l4.184-4.183a.39.39 0 0 1 .266-.112c2.006-.05 3.982-.22 5.922-.506 1.978-.29 3.348-2.023 3.348-3.97V6.741c0-1.947-1.37-3.68-3.348-3.97A49.145 49.145 0 0 0 12 2.25ZM8.25 8.625a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Zm2.625 1.125a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.286.684-.294a44.298 44.298 0 0 0 3.837-.293C14.287 10.565 15 9.723 15 8.74V4.26c0-.983-.713-1.825-1.69-1.943a44.447 44.447 0 0 0-10.62 0C1.712 2.435 1 3.277 1 4.26v4.482ZM5.5 6.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3.5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chat-bubble-left-right': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z"/>
+  <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 43.141 43.141 0 0 0-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 0 1 5 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914Z"/>
+  <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935.214.013.428.024.642.034.2.009.385.09.518.224l2.35 2.35a.75.75 0 0 0 1.28-.531v-2.07c1.453-.195 2.5-1.463 2.5-2.915V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0 0 14 6Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M1 8.849c0 1 .738 1.851 1.734 1.947L3 10.82v2.429a.75.75 0 0 0 1.28.53l1.82-1.82A3.484 3.484 0 0 1 5.5 10V9A3.5 3.5 0 0 1 9 5.5h4V4.151c0-1-.739-1.851-1.734-1.947a44.539 44.539 0 0 0-8.532 0C1.738 2.3 1 3.151 1 4.151V8.85Z"/>
+  <path d="M7 9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-.25v1.25a.75.75 0 0 1-1.28.53L9.69 12H9a2 2 0 0 1-2-2V9Z"/></>, box: 16, outline: false },
+  },
+  'check': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'check-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chevron-double-left': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M10.72 11.47a.75.75 0 0 0 0 1.06l7.5 7.5a.75.75 0 1 0 1.06-1.06L12.31 12l6.97-6.97a.75.75 0 0 0-1.06-1.06l-7.5 7.5Z" clipRule="evenodd"/>
+  <path fillRule="evenodd" d="M4.72 11.47a.75.75 0 0 0 0 1.06l7.5 7.5a.75.75 0 1 0 1.06-1.06L6.31 12l6.97-6.97a.75.75 0 0 0-1.06-1.06l-7.5 7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M4.72 9.47a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 1 0 1.06-1.06L6.31 10l3.72-3.72a.75.75 0 1 0-1.06-1.06L4.72 9.47Zm9.25-4.25L9.72 9.47a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 1 0 1.06-1.06L11.31 10l3.72-3.72a.75.75 0 0 0-1.06-1.06Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M3.22 7.595a.75.75 0 0 0 0 1.06l3.25 3.25a.75.75 0 0 0 1.06-1.06l-2.72-2.72 2.72-2.72a.75.75 0 0 0-1.06-1.06l-3.25 3.25Zm8.25-3.25-3.25 3.25a.75.75 0 0 0 0 1.06l3.25 3.25a.75.75 0 1 0 1.06-1.06l-2.72-2.72 2.72-2.72a.75.75 0 0 0-1.06-1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chevron-double-right': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M13.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L11.69 12 4.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z" clipRule="evenodd"/>
+  <path fillRule="evenodd" d="M19.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06L17.69 12l-6.97-6.97a.75.75 0 0 1 1.06-1.06l7.5 7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M15.28 9.47a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L13.69 10 9.97 6.28a.75.75 0 0 1 1.06-1.06l4.25 4.25ZM6.03 5.22l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L8.69 10 4.97 6.28a.75.75 0 0 1 1.06-1.06Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M12.78 7.595a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06l2.72-2.72-2.72-2.72a.75.75 0 0 1 1.06-1.06l3.25 3.25Zm-8.25-3.25 3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06l2.72-2.72-2.72-2.72a.75.75 0 0 1 1.06-1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chevron-down': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chevron-left': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chevron-right': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'chevron-up': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M11.47 7.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 0 1-1.06-1.06l7.5-7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'clipboard-document': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 0 1-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0 1 13.5 1.5H15a3 3 0 0 1 2.663 1.618ZM12 4.5A1.5 1.5 0 0 1 13.5 3H15a1.5 1.5 0 0 1 1.5 1.5H12Z" clipRule="evenodd"/>
+  <path d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 0 1 9 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0 1 16.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625v-12Z"/>
+  <path d="M10.5 10.5a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963 5.23 5.23 0 0 0-3.434-1.279h-1.875a.375.375 0 0 1-.375-.375V10.5Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0 1 18 5.25v6.5A2.25 2.25 0 0 1 15.75 14H13.5v-3.379a3 3 0 0 0-.879-2.121l-3.12-3.121a3 3 0 0 0-1.402-.791 2.252 2.252 0 0 1 1.913-1.576A2.25 2.25 0 0 1 12.25 1h1.5a2.25 2.25 0 0 1 2.238 2.012ZM11.5 3.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v.25h-3v-.25Z" clipRule="evenodd"/>
+  <path d="M3.5 6A1.5 1.5 0 0 0 2 7.5v9A1.5 1.5 0 0 0 3.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L8.44 6.439A1.5 1.5 0 0 0 7.378 6H3.5Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937v-2.523a2.5 2.5 0 0 0-.732-1.768L8.354 5.232A2.5 2.5 0 0 0 6.586 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h1.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4h3Z" clipRule="evenodd"/>
+  <path d="M3 6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-3.586a1 1 0 0 0-.293-.707L7.293 6.293A1 1 0 0 0 6.586 6H3Z"/></>, box: 16, outline: false },
+  },
+  'clock': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'code-bracket': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527ZM16.72 6.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 0 1 0-1.06Zm-9.44 0a.75.75 0 0 1 0 1.06L2.56 12l4.72 4.72a.75.75 0 0 1-1.06 1.06L.97 12.53a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06ZM11.377 2.011a.75.75 0 0 1 .612.867l-2.5 14.5a.75.75 0 0 1-1.478-.255l2.5-14.5a.75.75 0 0 1 .866-.612Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M4.78 4.97a.75.75 0 0 1 0 1.06L2.81 8l1.97 1.97a.75.75 0 1 1-1.06 1.06l-2.5-2.5a.75.75 0 0 1 0-1.06l2.5-2.5a.75.75 0 0 1 1.06 0ZM11.22 4.97a.75.75 0 0 0 0 1.06L13.19 8l-1.97 1.97a.75.75 0 1 0 1.06 1.06l2.5-2.5a.75.75 0 0 0 0-1.06l-2.5-2.5a.75.75 0 0 0-1.06 0ZM8.856 2.008a.75.75 0 0 1 .636.848l-1.5 10.5a.75.75 0 0 1-1.484-.212l1.5-10.5a.75.75 0 0 1 .848-.636Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'command-line': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6Zm3.97.97a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 0 1 0-1.06Zm4.28 4.28a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M3.25 3A2.25 2.25 0 0 0 1 5.25v9.5A2.25 2.25 0 0 0 3.25 17h13.5A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3H3.25Zm.943 8.752a.75.75 0 0 1 .055-1.06L6.128 9l-1.88-1.693a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 0 1-1.06-.055ZM9.75 10.25a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2.22 1.97a.75.75 0 0 0 0 1.06l.97.97-.97.97a.75.75 0 1 0 1.06 1.06l1.5-1.5a.75.75 0 0 0 0-1.06l-1.5-1.5a.75.75 0 0 0-1.06 0ZM8.75 8.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'computer-desktop': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 5.25a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3V15a3 3 0 0 1-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 0 1-.53 1.28h-9a.75.75 0 0 1-.53-1.28l.621-.622a2.25 2.25 0 0 0 .659-1.59V18h-3a3 3 0 0 1-3-3V5.25Zm1.5 0v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 0 1.1 1.677A.75.75 0 0 1 13.26 18H6.74a.75.75 0 0 1-.484-1.323A3.501 3.501 0 0 0 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Zm1.5 0a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75v-7.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h7.5A2.25 2.25 0 0 1 14 4.25v5.5A2.25 2.25 0 0 1 11.75 12h-1.312c.1.128.21.248.328.36a.75.75 0 0 1 .234.545v.345a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-.345a.75.75 0 0 1 .234-.545c.118-.111.228-.232.328-.36H4.25A2.25 2.25 0 0 1 2 9.75v-5.5Zm2.25-.75a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 0-.75-.75h-7.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'cpu-chip': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M16.5 7.5h-9v9h9v-9Z"/>
+  <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M14 6H6v8h8V6Z"/>
+  <path fillRule="evenodd" d="M9.25 3V1.75a.75.75 0 0 1 1.5 0V3h1.5V1.75a.75.75 0 0 1 1.5 0V3h.5A2.75 2.75 0 0 1 17 5.75v.5h1.25a.75.75 0 0 1 0 1.5H17v1.5h1.25a.75.75 0 0 1 0 1.5H17v1.5h1.25a.75.75 0 0 1 0 1.5H17v.5A2.75 2.75 0 0 1 14.25 17h-.5v1.25a.75.75 0 0 1-1.5 0V17h-1.5v1.25a.75.75 0 0 1-1.5 0V17h-1.5v1.25a.75.75 0 0 1-1.5 0V17h-.5A2.75 2.75 0 0 1 3 14.25v-.5H1.75a.75.75 0 0 1 0-1.5H3v-1.5H1.75a.75.75 0 0 1 0-1.5H3v-1.5H1.75a.75.75 0 0 1 0-1.5H3v-.5A2.75 2.75 0 0 1 5.75 3h.5V1.75a.75.75 0 0 1 1.5 0V3h1.5ZM4.5 5.75c0-.69.56-1.25 1.25-1.25h8.5c.69 0 1.25.56 1.25 1.25v8.5c0 .69-.56 1.25-1.25 1.25h-8.5c-.69 0-1.25-.56-1.25-1.25v-8.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M6 6v4h4V6H6Z"/>
+  <path fillRule="evenodd" d="M5.75 1a.75.75 0 0 0-.75.75V3a2 2 0 0 0-2 2H1.75a.75.75 0 0 0 0 1.5H3v.75H1.75a.75.75 0 0 0 0 1.5H3v.75H1.75a.75.75 0 0 0 0 1.5H3a2 2 0 0 0 2 2v1.25a.75.75 0 0 0 1.5 0V13h.75v1.25a.75.75 0 0 0 1.5 0V13h.75v1.25a.75.75 0 0 0 1.5 0V13a2 2 0 0 0 2-2h1.25a.75.75 0 0 0 0-1.5H13v-.75h1.25a.75.75 0 0 0 0-1.5H13V6.5h1.25a.75.75 0 0 0 0-1.5H13a2 2 0 0 0-2-2V1.75a.75.75 0 0 0-1.5 0V3h-.75V1.75a.75.75 0 0 0-1.5 0V3H6.5V1.75A.75.75 0 0 0 5.75 1ZM11 4.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5h6Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'document-magnifying-glass': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M11.625 16.5a1.875 1.875 0 1 0 0-3.75 1.875 1.875 0 0 0 0 3.75Z"/>
+  <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Zm6 16.5c.66 0 1.277-.19 1.797-.518l1.048 1.048a.75.75 0 0 0 1.06-1.06l-1.047-1.048A3.375 3.375 0 1 0 11.625 18Z" clipRule="evenodd"/>
+  <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M8 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"/>
+  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm5 5a3 3 0 1 0 1.524 5.585l1.196 1.195a.75.75 0 1 0 1.06-1.06l-1.195-1.196A3 3 0 0 0 9.5 7Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M6 7.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"/>
+  <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm3.5 2.5a3 3 0 1 0 1.524 5.585l1.196 1.195a.75.75 0 1 0 1.06-1.06l-1.195-1.196A3 3 0 0 0 7.5 4.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'document-text': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd"/>
+  <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm1 5.75A.75.75 0 0 1 5.75 7h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 7.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'ellipsis-horizontal': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></>, box: 16, outline: false },
+  },
+  'ellipsis-horizontal-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.625a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM15.375 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm8 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm7 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5.5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm6 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'exclamation-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'exclamation-triangle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'finger-print': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 3.75a6.715 6.715 0 0 0-3.722 1.118.75.75 0 1 1-.828-1.25 8.25 8.25 0 0 1 12.8 6.883c0 3.014-.574 5.897-1.62 8.543a.75.75 0 0 1-1.395-.551A21.69 21.69 0 0 0 18.75 10.5 6.75 6.75 0 0 0 12 3.75ZM6.157 5.739a.75.75 0 0 1 .21 1.04A6.715 6.715 0 0 0 5.25 10.5c0 1.613-.463 3.12-1.265 4.393a.75.75 0 0 1-1.27-.8A6.715 6.715 0 0 0 3.75 10.5c0-1.68.503-3.246 1.367-4.55a.75.75 0 0 1 1.04-.211ZM12 7.5a3 3 0 0 0-3 3c0 3.1-1.176 5.927-3.105 8.056a.75.75 0 1 1-1.112-1.008A10.459 10.459 0 0 0 7.5 10.5a4.5 4.5 0 1 1 9 0c0 .547-.022 1.09-.067 1.626a.75.75 0 0 1-1.495-.123c.041-.495.062-.996.062-1.503a3 3 0 0 0-3-3Zm0 2.25a.75.75 0 0 1 .75.75c0 3.908-1.424 7.485-3.781 10.238a.75.75 0 0 1-1.14-.975A14.19 14.19 0 0 0 11.25 10.5a.75.75 0 0 1 .75-.75Zm3.239 5.183a.75.75 0 0 1 .515.927 19.417 19.417 0 0 1-2.585 5.544.75.75 0 0 1-1.243-.84 17.915 17.915 0 0 0 2.386-5.116.75.75 0 0 1 .927-.515Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 2.5c-1.31 0-2.526.386-3.546 1.051a.75.75 0 0 1-.82-1.256A8 8 0 0 1 18 9a22.47 22.47 0 0 1-1.228 7.351.75.75 0 1 1-1.417-.49A20.97 20.97 0 0 0 16.5 9 6.5 6.5 0 0 0 10 2.5ZM4.333 4.416a.75.75 0 0 1 .218 1.038A6.466 6.466 0 0 0 3.5 9a7.966 7.966 0 0 1-1.293 4.362.75.75 0 0 1-1.257-.819A6.466 6.466 0 0 0 2 9c0-1.61.476-3.11 1.295-4.365a.75.75 0 0 1 1.038-.219ZM10 6.12a3 3 0 0 0-3.001 3.041 11.455 11.455 0 0 1-2.697 7.24.75.75 0 0 1-1.148-.965A9.957 9.957 0 0 0 5.5 9c0-.028.002-.055.004-.082a4.5 4.5 0 0 1 8.996.084V9.15l-.005.297a.75.75 0 1 1-1.5-.034c.003-.11.004-.219.005-.328a3 3 0 0 0-3-2.965Zm0 2.13a.75.75 0 0 1 .75.75c0 3.51-1.187 6.745-3.181 9.323a.75.75 0 1 1-1.186-.918A13.687 13.687 0 0 0 9.25 9a.75.75 0 0 1 .75-.75Zm3.529 3.698a.75.75 0 0 1 .584.885 18.883 18.883 0 0 1-2.257 5.84.75.75 0 1 1-1.29-.764 17.386 17.386 0 0 0 2.078-5.377.75.75 0 0 1 .885-.584Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 3c-.988 0-1.908.286-2.682.78a.75.75 0 0 1-.806-1.266A6.5 6.5 0 0 1 14.5 8c0 1.665-.333 3.254-.936 4.704a.75.75 0 0 1-1.385-.577C12.708 10.857 13 9.464 13 8a5 5 0 0 0-5-5ZM3.55 4.282a.75.75 0 0 1 .23 1.036A4.973 4.973 0 0 0 3 8a.75.75 0 0 1-1.5 0c0-1.282.372-2.48 1.014-3.488a.75.75 0 0 1 1.036-.23ZM8 5.875A2.125 2.125 0 0 0 5.875 8a3.625 3.625 0 0 1-3.625 3.625H2.213a.75.75 0 1 1 .008-1.5h.03A2.125 2.125 0 0 0 4.376 8a3.625 3.625 0 1 1 7.25 0c0 .078-.001.156-.003.233a.75.75 0 1 1-1.5-.036c.002-.066.003-.131.003-.197A2.125 2.125 0 0 0 8 5.875ZM7.995 7.25a.75.75 0 0 1 .75.75 6.502 6.502 0 0 1-4.343 6.133.75.75 0 1 1-.498-1.415A5.002 5.002 0 0 0 7.245 8a.75.75 0 0 1 .75-.75Zm2.651 2.87a.75.75 0 0 1 .463.955 9.39 9.39 0 0 1-3.008 4.25.75.75 0 0 1-.936-1.171 7.892 7.892 0 0 0 2.527-3.57.75.75 0 0 1 .954-.463Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'folder': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9c-.546 0-1.059.146-1.5.401V3.5ZM2 9.5v3A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 12.5 8h-9A1.5 1.5 0 0 0 2 9.5Z"/></>, box: 16, outline: false },
+  },
+  'hand-raised': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M10.5 1.875a1.125 1.125 0 0 1 2.25 0v8.219c.517.162 1.02.382 1.5.659V3.375a1.125 1.125 0 0 1 2.25 0v10.937a4.505 4.505 0 0 0-3.25 2.373 8.963 8.963 0 0 1 4-.935A.75.75 0 0 0 18 15v-2.266a3.368 3.368 0 0 1 .988-2.37 1.125 1.125 0 0 1 1.591 1.59 1.118 1.118 0 0 0-.329.79v3.006h-.005a6 6 0 0 1-1.752 4.007l-1.736 1.736a6 6 0 0 1-4.242 1.757H10.5a7.5 7.5 0 0 1-7.5-7.5V6.375a1.125 1.125 0 0 1 2.25 0v5.519c.46-.452.965-.832 1.5-1.141V3.375a1.125 1.125 0 0 1 2.25 0v6.526c.495-.1.997-.151 1.5-.151V1.875Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M11 2a1 1 0 1 0-2 0v6.5a.5.5 0 0 1-1 0V3a1 1 0 1 0-2 0v5.5a.5.5 0 0 1-1 0V5a1 1 0 1 0-2 0v7a7 7 0 1 0 14 0V8a1 1 0 1 0-2 0v3.5a.5.5 0 0 1-1 0V3a1 1 0 1 0-2 0v5.5a.5.5 0 0 1-1 0V2Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M8.5 1a.75.75 0 0 0-.75.75V6.5a.5.5 0 0 1-1 0V2.75a.75.75 0 0 0-1.5 0V7.5a.5.5 0 0 1-1 0V4.75a.75.75 0 0 0-1.5 0v4.5a5.75 5.75 0 0 0 11.5 0v-2.5a.75.75 0 0 0-1.5 0V9.5a.5.5 0 0 1-1 0V2.75a.75.75 0 0 0-1.5 0V6.5a.5.5 0 0 1-1 0V1.75A.75.75 0 0 0 8.5 1Z"/></>, box: 16, outline: false },
+  },
+  'information-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'key': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.002 5.002 0 0 1 8 7Zm5-3a.75.75 0 0 0 0 1.5A1.5 1.5 0 0 1 14.5 7 .75.75 0 0 0 16 7a3 3 0 0 0-3-3Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'light-bulb': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M12 .75a8.25 8.25 0 0 0-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 0 0 .577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 0 1-.937-.171.75.75 0 1 1 .374-1.453 5.261 5.261 0 0 0 2.626 0 .75.75 0 1 1 .374 1.452 6.712 6.712 0 0 1-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 0 0 .577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0 0 12 .75Z"/>
+  <path fillRule="evenodd" d="M9.013 19.9a.75.75 0 0 1 .877-.597 11.319 11.319 0 0 0 4.22 0 .75.75 0 1 1 .28 1.473 12.819 12.819 0 0 1-4.78 0 .75.75 0 0 1-.597-.876ZM9.754 22.344a.75.75 0 0 1 .824-.668 13.682 13.682 0 0 0 2.844 0 .75.75 0 1 1 .156 1.492 15.156 15.156 0 0 1-3.156 0 .75.75 0 0 1-.668-.824Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 0 0 .572.729 6.016 6.016 0 0 0 2.856 0A.75.75 0 0 0 12 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0 0 10 1ZM8.863 17.414a.75.75 0 0 0-.226 1.483 9.066 9.066 0 0 0 2.726 0 .75.75 0 0 0-.226-1.483 7.553 7.553 0 0 1-2.274 0Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M10.618 10.26c-.361.223-.618.598-.618 1.022 0 .226-.142.43-.36.49A6.006 6.006 0 0 1 8 12c-.569 0-1.12-.08-1.64-.227a.504.504 0 0 1-.36-.491c0-.424-.257-.799-.618-1.021a5 5 0 1 1 5.235 0ZM6.867 13.415a.75.75 0 1 0-.225 1.483 9.065 9.065 0 0 0 2.716 0 .75.75 0 1 0-.225-1.483 7.563 7.563 0 0 1-2.266 0Z"/></>, box: 16, outline: false },
+  },
+  'list-bullet': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0A.75.75 0 0 1 8.25 6h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75ZM2.625 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 12a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 7.5 12Zm-4.875 5.25a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 15.25a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 10a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1V10Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M3 4.75a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM6.25 3a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7ZM6.25 7.25a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7ZM6.25 11.5a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7ZM4 12.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM3 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></>, box: 16, outline: false },
+  },
+  'lock-closed': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'magnifying-glass': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'minus-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm3 10.5a.75.75 0 0 0 0-1.5H9a.75.75 0 0 0 0 1.5h6Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm4-7a.75.75 0 0 0-.75-.75h-6.5a.75.75 0 0 0 0 1.5h6.5A.75.75 0 0 0 12 8Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'moon': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M14.438 10.148c.19-.425-.321-.787-.748-.601A5.5 5.5 0 0 1 6.453 2.31c.186-.427-.176-.938-.6-.748a6.501 6.501 0 1 0 8.585 8.586Z"/></>, box: 16, outline: false },
+  },
+  'paper-clip': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M11.914 4.086a2 2 0 0 0-2.828 0l-5 5a2 2 0 1 0 2.828 2.828l.556-.555a.75.75 0 0 1 1.06 1.06l-.555.556a3.5 3.5 0 0 1-4.95-4.95l5-5a3.5 3.5 0 0 1 4.95 4.95l-1.972 1.972a2.125 2.125 0 0 1-3.006-3.005L9.97 4.97a.75.75 0 1 1 1.06 1.06L9.058 8.003a.625.625 0 0 0 .884.883l1.972-1.972a2 2 0 0 0 0-2.828Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'pause': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M4.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-1ZM10.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-1Z"/></>, box: 16, outline: false },
+  },
+  'pause-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM9 8.25a.75.75 0 0 0-.75.75v6c0 .414.336.75.75.75h.75a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75H9Zm5.25 0a.75.75 0 0 0-.75.75v6c0 .414.336.75.75.75H15a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75h-.75Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1-.75-.75v-4.5Zm4 0a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1-.75-.75v-4.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM5.5 5.5A.5.5 0 0 1 6 5h.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-5Zm4-.5a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h.5a.5.5 0 0 0 .5-.5v-5A.5.5 0 0 0 10 5h-.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'pencil': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'pencil-square': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"/>
+  <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"/>
+  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z"/>
+  <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z"/></>, box: 16, outline: false },
+  },
+  'play-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
+  <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.113A1.125 1.125 0 0 1 9 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .766.027l3.5 2.25a.75.75 0 0 1 0 1.262l-3.5 2.25A.75.75 0 0 1 8 12.25v-4.5a.75.75 0 0 1 .39-.658Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.847-9.766A.75.75 0 0 0 6 5.866v4.268a.75.75 0 0 0 1.153.633l3.353-2.134a.75.75 0 0 0 0-1.266L7.153 5.234Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'plus': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/></>, box: 16, outline: false },
+  },
+  'plus-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'puzzle-piece': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M11.25 5.337c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.036 1.007-1.875 2.25-1.875S15 2.34 15 3.375c0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959 0 .332.278.598.61.578 1.91-.114 3.79-.342 5.632-.676a.75.75 0 0 1 .878.645 49.17 49.17 0 0 1 .376 5.452.657.657 0 0 1-.66.664c-.354 0-.675-.186-.958-.401a1.647 1.647 0 0 0-1.003-.349c-1.035 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401.31 0 .557.262.534.571a48.774 48.774 0 0 1-.595 4.845.75.75 0 0 1-.61.61c-1.82.317-3.673.533-5.555.642a.58.58 0 0 1-.611-.581c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.035-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959a.641.641 0 0 1-.658.643 49.118 49.118 0 0 1-4.708-.36.75.75 0 0 1-.645-.878c.293-1.614.504-3.257.629-4.924A.53.53 0 0 0 5.337 15c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.036 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.369 0 .713.128 1.003.349.283.215.604.401.959.401a.656.656 0 0 0 .659-.663 47.703 47.703 0 0 0-.31-4.82.75.75 0 0 1 .83-.832c1.343.155 2.703.254 4.077.294a.64.64 0 0 0 .657-.642Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M12 4.467c0-.405.262-.75.559-1.027.276-.257.441-.584.441-.94 0-.828-.895-1.5-2-1.5s-2 .672-2 1.5c0 .362.171.694.456.953.29.265.544.6.544.994a.968.968 0 0 1-1.024.974 39.655 39.655 0 0 1-3.014-.306.75.75 0 0 0-.847.847c.14.993.242 1.999.306 3.014A.968.968 0 0 1 4.447 10c-.393 0-.729-.253-.994-.544C3.194 9.17 2.862 9 2.5 9 1.672 9 1 9.895 1 11s.672 2 1.5 2c.356 0 .683-.165.94-.441.276-.297.622-.559 1.027-.559a.997.997 0 0 1 1.004 1.03 39.747 39.747 0 0 1-.319 3.734.75.75 0 0 0 .64.842c1.05.146 2.111.252 3.184.318A.97.97 0 0 0 10 16.948c0-.394-.254-.73-.545-.995C9.171 15.693 9 15.362 9 15c0-.828.895-1.5 2-1.5s2 .672 2 1.5c0 .356-.165.683-.441.94-.297.276-.559.622-.559 1.027a.998.998 0 0 0 1.03 1.005c1.337-.05 2.659-.162 3.961-.337a.75.75 0 0 0 .644-.644c.175-1.302.288-2.624.337-3.961A.998.998 0 0 0 16.967 12c-.405 0-.75.262-1.027.559-.257.276-.584.441-.94.441-.828 0-1.5-.895-1.5-2s.672-2 1.5-2c.362 0 .694.17.953.455.265.291.601.545.995.545a.97.97 0 0 0 .976-1.024 41.159 41.159 0 0 0-.318-3.184.75.75 0 0 0-.842-.64c-1.228.164-2.473.271-3.734.319A.997.997 0 0 1 12 4.467Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M9 3.889c0-.273.188-.502.417-.65.355-.229.583-.587.583-.989C10 1.56 9.328 1 8.5 1S7 1.56 7 2.25c0 .41.237.774.603 1.002.22.137.397.355.397.613 0 .331-.275.596-.605.579-.744-.04-1.482-.1-2.214-.18a.75.75 0 0 0-.83.81c.067.764.111 1.535.133 2.312A.6.6 0 0 1 3.882 8c-.268 0-.495-.185-.64-.412C3.015 7.231 2.655 7 2.25 7 1.56 7 1 7.672 1 8.5S1.56 10 2.25 10c.404 0 .764-.23.993-.588.144-.227.37-.412.64-.412a.6.6 0 0 1 .601.614 39.338 39.338 0 0 1-.231 3.3.75.75 0 0 0 .661.829c.826.093 1.66.161 2.5.204A.56.56 0 0 0 8 13.386c0-.271-.187-.499-.415-.645C7.23 12.512 7 12.153 7 11.75c0-.69.672-1.25 1.5-1.25s1.5.56 1.5 1.25c0 .403-.23.762-.585.99-.228.147-.415.375-.415.646v.11c0 .278.223.504.5.504 1.196 0 2.381-.052 3.552-.154a.75.75 0 0 0 .68-.661c.135-1.177.22-2.37.253-3.574a.597.597 0 0 0-.6-.611c-.27 0-.498.187-.644.415-.229.356-.588.585-.991.585-.69 0-1.25-.672-1.25-1.5S11.06 7 11.75 7c.403 0 .762.23.99.585.147.228.375.415.646.415a.597.597 0 0 0 .599-.61 40.914 40.914 0 0 0-.132-2.365.75.75 0 0 0-.815-.684A39.51 39.51 0 0 1 9.5 4.5a.501.501 0 0 1-.5-.503v-.108Z"/></>, box: 16, outline: false },
+  },
+  'question-mark-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 0 1-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584ZM12 18a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 1 0 8.94 6.94ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.293 5.293a1 1 0 1 1 .99 1.667c-.459.134-1.033.566-1.033 1.29v.25a.75.75 0 1 0 1.5 0v-.115a2.5 2.5 0 1 0-2.518-4.153.75.75 0 1 0 1.061 1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'rectangle-stack': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M5.566 4.657A4.505 4.505 0 0 1 6.75 4.5h10.5c.41 0 .806.055 1.183.157A3 3 0 0 0 15.75 3h-7.5a3 3 0 0 0-2.684 1.657ZM2.25 12a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3v-6ZM5.25 7.5c-.41 0-.806.055-1.184.157A3 3 0 0 1 6.75 6h10.5a3 3 0 0 1 2.683 1.657A4.505 4.505 0 0 0 18.75 7.5H5.25Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M5.127 3.502 5.25 3.5h9.5c.041 0 .082 0 .123.002A2.251 2.251 0 0 0 12.75 2h-5.5a2.25 2.25 0 0 0-2.123 1.502ZM1 10.25A2.25 2.25 0 0 1 3.25 8h13.5A2.25 2.25 0 0 1 19 10.25v5.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75v-5.5ZM3.25 6.5c-.04 0-.082 0-.123.002A2.25 2.25 0 0 1 5.25 5h9.5c.98 0 1.814.627 2.123 1.502a3.819 3.819 0 0 0-.123-.002H3.25Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M5 3.5A1.5 1.5 0 0 1 6.5 2h3A1.5 1.5 0 0 1 11 3.5H5ZM4.5 5A1.5 1.5 0 0 0 3 6.5v.041a3.02 3.02 0 0 1 .5-.041h9c.17 0 .337.014.5.041V6.5A1.5 1.5 0 0 0 11.5 5h-7ZM12.5 8h-9A1.5 1.5 0 0 0 2 9.5v3A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 12.5 8Z"/></>, box: 16, outline: false },
+  },
+  'server': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M4.08 5.227A3 3 0 0 1 6.979 3H17.02a3 3 0 0 1 2.9 2.227l2.113 7.926A5.228 5.228 0 0 0 18.75 12H5.25a5.228 5.228 0 0 0-3.284 1.153L4.08 5.227Z"/>
+  <path fillRule="evenodd" d="M5.25 13.5a3.75 3.75 0 1 0 0 7.5h13.5a3.75 3.75 0 1 0 0-7.5H5.25Zm10.5 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm3.75-.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M4.632 3.533A2 2 0 0 1 6.577 2h6.846a2 2 0 0 1 1.945 1.533l1.976 8.234A3.489 3.489 0 0 0 16 11.5H4c-.476 0-.93.095-1.344.267l1.976-8.234Z"/>
+  <path fillRule="evenodd" d="M4 13a2 2 0 1 0 0 4h12a2 2 0 1 0 0-4H4Zm11.24 2a.75.75 0 0 1 .75-.75H16a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75h-.01a.75.75 0 0 1-.75-.75V15Zm-2.25-.75a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75H13a.75.75 0 0 0 .75-.75V15a.75.75 0 0 0-.75-.75h-.01Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M3.665 3.588A2 2 0 0 1 5.622 2h4.754a2 2 0 0 1 1.958 1.588l1.098 5.218a3.487 3.487 0 0 0-1.433-.306H4c-.51 0-.995.11-1.433.306l1.099-5.218Z"/>
+  <path fillRule="evenodd" d="M4 10a2 2 0 1 0 0 4h8a2 2 0 1 0 0-4H4Zm8 2.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM9.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'server-stack': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M5.507 4.048A3 3 0 0 1 7.785 3h8.43a3 3 0 0 1 2.278 1.048l1.722 2.008A4.533 4.533 0 0 0 19.5 6h-15c-.243 0-.482.02-.715.056l1.722-2.008Z"/>
+  <path fillRule="evenodd" d="M1.5 10.5a3 3 0 0 1 3-3h15a3 3 0 1 1 0 6h-15a3 3 0 0 1-3-3Zm15 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm2.25.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.5 15a3 3 0 1 0 0 6h15a3 3 0 1 0 0-6h-15Zm11.25 3.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM19.5 18a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M4.464 3.162A2 2 0 0 1 6.28 2h7.44a2 2 0 0 1 1.816 1.162l1.154 2.5c.067.145.115.291.145.438A3.508 3.508 0 0 0 16 6H4c-.288 0-.568.035-.835.1.03-.147.078-.293.145-.438l1.154-2.5Z"/>
+  <path fillRule="evenodd" d="M2 9.5a2 2 0 0 1 2-2h12a2 2 0 1 1 0 4H4a2 2 0 0 1-2-2Zm13.24 0a.75.75 0 0 1 .75-.75H16a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75h-.01a.75.75 0 0 1-.75-.75V9.5Zm-2.25-.75a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75H13a.75.75 0 0 0 .75-.75V9.5a.75.75 0 0 0-.75-.75h-.01ZM2 15a2 2 0 0 1 2-2h12a2 2 0 1 1 0 4H4a2 2 0 0 1-2-2Zm13.24 0a.75.75 0 0 1 .75-.75H16a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75h-.01a.75.75 0 0 1-.75-.75V15Zm-2.25-.75a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75H13a.75.75 0 0 0 .75-.75V15a.75.75 0 0 0-.75-.75h-.01Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M5.354 2a2 2 0 0 0-1.857 1.257l-.338.845C3.43 4.035 3.71 4 4 4h8c.29 0 .571.035.84.102l-.337-.845A2 2 0 0 0 10.646 2H5.354Z"/>
+  <path fillRule="evenodd" d="M2 13a2 2 0 0 1 2-2h8a2 2 0 1 1 0 4H4a2 2 0 0 1-2-2Zm10.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9 13.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4 5.5a2 2 0 1 0 0 4h8a2 2 0 1 0 0-4H4Zm8 2.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM9.75 7.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'share': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M15.75 4.5a3 3 0 1 1 .825 2.066l-8.421 4.679a3.002 3.002 0 0 1 0 1.51l8.421 4.679a3 3 0 1 1-.729 1.31l-8.421-4.678a3 3 0 1 1 0-4.132l8.421-4.679a3 3 0 0 1-.096-.755Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.475l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M12 6a2 2 0 1 0-1.994-1.842L5.323 6.5a2 2 0 1 0 0 3l4.683 2.342a2 2 0 1 0 .67-1.342L5.995 8.158a2.03 2.03 0 0 0 0-.316L10.677 5.5c.353.311.816.5 1.323.5Z"/></>, box: 16, outline: false },
+  },
+  'shield-check': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.75Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8.5 1.709a.75.75 0 0 0-1 0 8.963 8.963 0 0 1-4.84 2.217.75.75 0 0 0-.654.72 10.499 10.499 0 0 0 5.647 9.672.75.75 0 0 0 .694-.001 10.499 10.499 0 0 0 5.647-9.672.75.75 0 0 0-.654-.719A8.963 8.963 0 0 1 8.5 1.71Zm2.34 5.504a.75.75 0 0 0-1.18-.926L7.394 9.17l-1.156-.99a.75.75 0 1 0-.976 1.138l1.75 1.5a.75.75 0 0 0 1.078-.106l2.75-3.5Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'shield-exclamation': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M11.484 2.17a.75.75 0 0 1 1.032 0 11.209 11.209 0 0 0 7.877 3.08.75.75 0 0 1 .722.515 12.74 12.74 0 0 1 .635 3.985c0 5.942-4.064 10.933-9.563 12.348a.749.749 0 0 1-.374 0C6.314 20.683 2.25 15.692 2.25 9.75c0-1.39.223-2.73.635-3.985a.75.75 0 0 1 .722-.516l.143.001c2.996 0 5.718-1.17 7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75ZM12 15a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75H12Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10.339 2.237a.531.531 0 0 0-.678 0 11.947 11.947 0 0 1-7.078 2.75.5.5 0 0 0-.479.425A12.11 12.11 0 0 0 2 7c0 5.163 3.26 9.564 7.834 11.257a.48.48 0 0 0 .332 0C14.74 16.564 18 12.163 18 7c0-.538-.035-1.069-.104-1.589a.5.5 0 0 0-.48-.425 11.947 11.947 0 0 1-7.077-2.75ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M7.5 1.709a.75.75 0 0 1 1 0 8.963 8.963 0 0 0 4.84 2.217.75.75 0 0 1 .654.72 10.499 10.499 0 0 1-5.647 9.672.75.75 0 0 1-.694-.001 10.499 10.499 0 0 1-5.647-9.672.75.75 0 0 1 .654-.719A8.963 8.963 0 0 0 7.5 1.71ZM8 5a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 5Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'signal': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M5.636 4.575a.75.75 0 0 1 0 1.061 9 9 0 0 0 0 12.728.75.75 0 1 1-1.06 1.06c-4.101-4.1-4.101-10.748 0-14.849a.75.75 0 0 1 1.06 0Zm12.728 0a.75.75 0 0 1 1.06 0c4.101 4.1 4.101 10.75 0 14.85a.75.75 0 1 1-1.06-1.061 9 9 0 0 0 0-12.728.75.75 0 0 1 0-1.06ZM7.757 6.697a.75.75 0 0 1 0 1.06 6 6 0 0 0 0 8.486.75.75 0 0 1-1.06 1.06 7.5 7.5 0 0 1 0-10.606.75.75 0 0 1 1.06 0Zm8.486 0a.75.75 0 0 1 1.06 0 7.5 7.5 0 0 1 0 10.606.75.75 0 0 1-1.06-1.06 6 6 0 0 0 0-8.486.75.75 0 0 1 0-1.06ZM9.879 8.818a.75.75 0 0 1 0 1.06 3 3 0 0 0 0 4.243.75.75 0 1 1-1.061 1.061 4.5 4.5 0 0 1 0-6.364.75.75 0 0 1 1.06 0Zm4.242 0a.75.75 0 0 1 1.061 0 4.5 4.5 0 0 1 0 6.364.75.75 0 0 1-1.06-1.06 3 3 0 0 0 0-4.243.75.75 0 0 1 0-1.061ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M16.364 3.636a.75.75 0 0 0-1.06 1.06 7.5 7.5 0 0 1 0 10.607.75.75 0 0 0 1.06 1.061 9 9 0 0 0 0-12.728ZM4.697 4.697a.75.75 0 0 0-1.061-1.061 9 9 0 0 0 0 12.728.75.75 0 1 0 1.06-1.06 7.5 7.5 0 0 1 0-10.607Z"/>
+  <path d="M12.475 6.464a.75.75 0 0 1 1.06 0 5 5 0 0 1 0 7.072.75.75 0 0 1-1.06-1.061 3.5 3.5 0 0 0 0-4.95.75.75 0 0 1 0-1.06ZM7.525 6.464a.75.75 0 0 1 0 1.061 3.5 3.5 0 0 0 0 4.95.75.75 0 0 1-1.06 1.06 5 5 0 0 1 0-7.07.75.75 0 0 1 1.06 0ZM11 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M9 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
+  <path fillRule="evenodd" d="M9.68 5.26a.75.75 0 0 1 1.06 0 3.875 3.875 0 0 1 0 5.48.75.75 0 1 1-1.06-1.06 2.375 2.375 0 0 0 0-3.36.75.75 0 0 1 0-1.06Zm-3.36 0a.75.75 0 0 1 0 1.06 2.375 2.375 0 0 0 0 3.36.75.75 0 1 1-1.06 1.06 3.875 3.875 0 0 1 0-5.48.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/>
+  <path fillRule="evenodd" d="M11.89 3.05a.75.75 0 0 1 1.06 0 7 7 0 0 1 0 9.9.75.75 0 1 1-1.06-1.06 5.5 5.5 0 0 0 0-7.78.75.75 0 0 1 0-1.06Zm-7.78 0a.75.75 0 0 1 0 1.06 5.5 5.5 0 0 0 0 7.78.75.75 0 1 1-1.06 1.06 7 7 0 0 1 0-9.9.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'signal-slash': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m3 3 8.735 8.735m0 0a.374.374 0 1 1 .53.53m-.53-.53.53.53m0 0L21 21M14.652 9.348a3.75 3.75 0 0 1 0 5.304m2.121-7.425a6.75 6.75 0 0 1 0 9.546m2.121-11.667c3.808 3.807 3.808 9.98 0 13.788m-9.546-4.242a3.733 3.733 0 0 1-1.06-2.122m-1.061 4.243a6.75 6.75 0 0 1-1.625-6.929m-.496 9.05c-3.068-3.067-3.664-7.67-1.79-11.334M12 12h.008v.008H12V12Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.47 2.47a.75.75 0 0 1 1.06 0l8.407 8.407a1.125 1.125 0 0 1 1.186 1.186l1.462 1.461a3.001 3.001 0 0 0-.464-3.645.75.75 0 1 1 1.061-1.061 4.501 4.501 0 0 1 .486 5.79l1.072 1.072a6.001 6.001 0 0 0-.497-7.923.75.75 0 0 1 1.06-1.06 7.501 7.501 0 0 1 .505 10.05l1.064 1.065a9 9 0 0 0-.508-12.176.75.75 0 0 1 1.06-1.06c3.923 3.922 4.093 10.175.512 14.3l1.594 1.594a.75.75 0 1 1-1.06 1.06l-2.106-2.105-2.121-2.122h-.001l-4.705-4.706a.747.747 0 0 1-.127-.126L2.47 3.53a.75.75 0 0 1 0-1.061Zm1.189 4.422a.75.75 0 0 1 .326 1.01 9.004 9.004 0 0 0 1.651 10.462.75.75 0 1 1-1.06 1.06C1.27 16.12.63 11.165 2.648 7.219a.75.75 0 0 1 1.01-.326ZM5.84 9.134a.75.75 0 0 1 .472.95 6 6 0 0 0 1.444 6.159.75.75 0 0 1-1.06 1.06A7.5 7.5 0 0 1 4.89 9.606a.75.75 0 0 1 .95-.472Zm2.341 2.653a.75.75 0 0 1 .848.638c.088.62.37 1.218.849 1.696a.75.75 0 0 1-1.061 1.061 4.483 4.483 0 0 1-1.273-2.546.75.75 0 0 1 .637-.848Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M2.22 2.22a.75.75 0 0 1 1.06 0l6.783 6.782a1 1 0 0 1 .935.935l6.782 6.783a.75.75 0 1 1-1.06 1.06l-6.783-6.782a1 1 0 0 1-.935-.935L2.22 3.28a.75.75 0 0 1 0-1.06ZM3.636 16.364a9.004 9.004 0 0 1-1.39-10.936L3.349 6.53a7.503 7.503 0 0 0 1.348 8.773.75.75 0 0 1-1.061 1.061ZM6.464 13.536a5 5 0 0 1-1.213-5.103l1.262 1.262a3.493 3.493 0 0 0 1.012 2.78.75.75 0 0 1-1.06 1.06ZM16.364 3.636a9.004 9.004 0 0 1 1.39 10.937l-1.103-1.104a7.503 7.503 0 0 0-1.348-8.772.75.75 0 1 1 1.061-1.061ZM13.536 6.464a5 5 0 0 1 1.213 5.103l-1.262-1.262a3.493 3.493 0 0 0-1.012-2.78.75.75 0 0 1 1.06-1.06Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l4.782 4.783a1 1 0 0 0 .935.935l4.783 4.782a.75.75 0 1 0 1.06-1.06L8.998 7.937a1 1 0 0 0-.935-.935L3.28 2.22ZM3.05 12.95a7.003 7.003 0 0 1-1.33-8.047L2.86 6.04a5.501 5.501 0 0 0 1.25 5.849.75.75 0 1 1-1.06 1.06ZM5.26 10.74a3.87 3.87 0 0 1-1.082-3.38L5.87 9.052c.112.226.262.439.45.627a.75.75 0 1 1-1.06 1.061ZM12.95 3.05a7.003 7.003 0 0 1 1.33 8.048l-1.14-1.139a5.501 5.501 0 0 0-1.25-5.848.75.75 0 0 1 1.06-1.06ZM10.74 5.26a3.87 3.87 0 0 1 1.082 3.38L10.13 6.948a2.372 2.372 0 0 0-.45-.627.75.75 0 0 1 1.06-1.061Z"/></>, box: 16, outline: false },
+  },
+  'stop-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
+  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 0 1-1.313-1.313V9.564Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM6.5 5.5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-3Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'sun': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M8 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 1ZM10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM12.95 4.11a.75.75 0 1 0-1.06-1.06l-1.062 1.06a.75.75 0 0 0 1.061 1.062l1.06-1.061ZM15 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 15 8ZM11.89 12.95a.75.75 0 0 0 1.06-1.06l-1.06-1.062a.75.75 0 0 0-1.062 1.061l1.061 1.06ZM8 12a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 12ZM5.172 11.89a.75.75 0 0 0-1.061-1.062L3.05 11.89a.75.75 0 1 0 1.06 1.06l1.06-1.06ZM4 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 4 8ZM4.11 5.172A.75.75 0 0 0 5.173 4.11L4.11 3.05a.75.75 0 1 0-1.06 1.06l1.06 1.06Z"/></>, box: 16, outline: false },
+  },
+  'trash': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'view-columns': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path d="M15 3.75H9v16.5h6V3.75ZM16.5 20.25h3.375c1.035 0 1.875-.84 1.875-1.875V5.625c0-1.036-.84-1.875-1.875-1.875H16.5v16.5ZM4.125 3.75H7.5v16.5H4.125a1.875 1.875 0 0 1-1.875-1.875V5.625c0-1.036.84-1.875 1.875-1.875Z"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M14 17h2.75A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3H14v14ZM12.5 3h-5v14h5V3ZM3.25 3H6v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M9.836 3h-3.67v10h3.67V3ZM11.336 13H13.5a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 3h-2.164v10ZM2.5 3h2.166v10H2.5A1.5 1.5 0 0 1 1 11.5v-7A1.5 1.5 0 0 1 2.5 3Z"/></>, box: 16, outline: false },
+  },
+  'wifi': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M1.371 8.143c5.858-5.857 15.356-5.857 21.213 0a.75.75 0 0 1 0 1.061l-.53.53a.75.75 0 0 1-1.06 0c-4.98-4.979-13.053-4.979-18.032 0a.75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06Zm3.182 3.182c4.1-4.1 10.749-4.1 14.85 0a.75.75 0 0 1 0 1.061l-.53.53a.75.75 0 0 1-1.062 0 8.25 8.25 0 0 0-11.667 0 .75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06Zm3.204 3.182a6 6 0 0 1 8.486 0 .75.75 0 0 1 0 1.061l-.53.53a.75.75 0 0 1-1.061 0 3.75 3.75 0 0 0-5.304 0 .75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06Zm3.182 3.182a1.5 1.5 0 0 1 2.122 0 .75.75 0 0 1 0 1.061l-.53.53a.75.75 0 0 1-1.061 0l-.53-.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M.676 6.941A12.964 12.964 0 0 1 10 3c3.657 0 6.963 1.511 9.324 3.941a.75.75 0 0 1-.008 1.053l-.353.354a.75.75 0 0 1-1.069-.008C15.894 6.28 13.097 5 10 5 6.903 5 4.106 6.28 2.106 8.34a.75.75 0 0 1-1.069.008l-.353-.354a.75.75 0 0 1-.008-1.053Zm2.825 2.833A8.976 8.976 0 0 1 10 7a8.976 8.976 0 0 1 6.499 2.774.75.75 0 0 1-.011 1.049l-.354.354a.75.75 0 0 1-1.072-.012A6.978 6.978 0 0 0 10 9c-1.99 0-3.786.83-5.061 2.165a.75.75 0 0 1-1.073.012l-.354-.354a.75.75 0 0 1-.01-1.05Zm2.82 2.84A4.989 4.989 0 0 1 10 11c1.456 0 2.767.623 3.68 1.614a.75.75 0 0 1-.022 1.039l-.354.354a.75.75 0 0 1-1.085-.026A2.99 2.99 0 0 0 10 13c-.88 0-1.67.377-2.22.981a.75.75 0 0 1-1.084.026l-.354-.354a.75.75 0 0 1-.021-1.039Zm2.795 2.752a1.248 1.248 0 0 1 1.768 0 .75.75 0 0 1 0 1.06l-.354.354a.75.75 0 0 1-1.06 0l-.354-.353a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M14.188 7.063a8.75 8.75 0 0 0-12.374 0 .75.75 0 0 1-1.061-1.06c4.003-4.004 10.493-4.004 14.496 0a.75.75 0 1 1-1.061 1.06Zm-2.121 2.121a5.75 5.75 0 0 0-8.132 0 .75.75 0 0 1-1.06-1.06 7.25 7.25 0 0 1 10.252 0 .75.75 0 0 1-1.06 1.06Zm-2.122 2.122a2.75 2.75 0 0 0-3.889 0 .75.75 0 1 1-1.06-1.061 4.25 4.25 0 0 1 6.01 0 .75.75 0 0 1-1.06 1.06Zm-2.828 1.06a1.25 1.25 0 0 1 1.768 0 .75.75 0 0 1 0 1.06l-.355.355a.75.75 0 0 1-1.06 0l-.354-.354a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'x-circle': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd"/></>, box: 16, outline: false },
+  },
+  'x-mark': {
+    '24/outline': { content: <><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></>, box: 24, outline: true },
+    '24/solid': { content: <><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></>, box: 24, outline: false },
+    '20/solid': { content: <><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></>, box: 20, outline: false },
+    '16/solid': { content: <><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/></>, box: 16, outline: false },
+  },
+} satisfies Record<string, Partial<Record<IconVariant, { content: ReactNode; box: number; outline: boolean }>>>
+export type IconName = keyof typeof paths
+const table: Record<IconName, Partial<Record<IconVariant, { content: ReactNode; box: number; outline: boolean }>>> = paths
+/** Icons are decorative; name the enclosing action or provide adjacent text. */
+export function Icon({ name, variant = '20/solid', size = 16 }: { name: IconName; variant?: IconVariant; size?: number }) {
+  const icon = table[name][variant] ?? table[name]['20/solid'] ?? table[name]['24/outline']!
+  const { outline, box } = icon
+  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`0 0 ${box} ${box}`} fill={outline ? 'none' : 'currentColor'} stroke={outline ? 'currentColor' : undefined} strokeWidth={outline ? 1.5 : undefined} aria-hidden="true" focusable="false" style={{ flex: 'none' }}>{icon.content}</svg>
+}
diff --git a/web/src/components/ui/RadioGroup.tsx b/web/src/components/ui/RadioGroup.tsx
new file mode 100644
index 00000000..812bc80e
--- /dev/null
+++ b/web/src/components/ui/RadioGroup.tsx
@@ -0,0 +1,7 @@
+import { useId, type ReactNode } from 'react'
+export function RadioGroup<T extends string>({ label, value, options, onChange, disabled = false }: {
+  label: string; value: T; options: readonly { value: T; label: ReactNode }[]; onChange: (value: T) => void; disabled?: boolean
+}) {
+  const name = useId()
+  return <fieldset className="ui-radio-group" disabled={disabled}><legend>{label}</legend>{options.map((option) => <label className="ui-radio" key={option.value}><input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />{option.label}</label>)}</fieldset>
+}
diff --git a/web/src/components/ui/index.ts b/web/src/components/ui/index.ts
new file mode 100644
index 00000000..2954f90d
--- /dev/null
+++ b/web/src/components/ui/index.ts
@@ -0,0 +1,7 @@
+export { Button, IconButton, type ButtonProps } from './Button'
+export { Input, Select, Textarea } from './Field'
+export { RadioGroup } from './RadioGroup'
+export { StatusBadge, HatChip, CountPill, ConfigChip, Keycap, type Status } from './Badge'
+export { Icon, type IconName, type IconVariant } from './Icon'
+export { AppearanceButton, AppearanceOptions } from './Appearance'
+export { useModalLayer } from './useModalLayer'
diff --git a/web/src/components/ui/primitives.test.tsx b/web/src/components/ui/primitives.test.tsx
new file mode 100644
index 00000000..2439c5b0
--- /dev/null
+++ b/web/src/components/ui/primitives.test.tsx
@@ -0,0 +1,46 @@
+import { act, render, screen } from '@testing-library/react'
+import userEvent from '@testing-library/user-event'
+import { describe, expect, it } from 'vitest'
+import { Button, IconButton } from './Button'
+import { Input, Select, Textarea } from './Field'
+import { RadioGroup } from './RadioGroup'
+import { StatusBadge } from './Badge'
+import { HatChip } from './Badge'
+import { deriveAccent } from '../../lib/accent'
+import { setAppearance } from '../../lib/theme'
+
+describe('shared native controls', () => {
+  it('associates labels, hints and errors with their fields', () => {
+    render(<><Input label="Project" hint="Canonical path" error="Unavailable" /><Select label="Model"><option>Default</option></Select><Textarea label="Prompt" /></>)
+    const project = screen.getByRole('textbox', { name: 'Project' })
+    expect(project).toHaveAttribute('aria-invalid', 'true')
+    expect(project).toHaveAccessibleDescription('Canonical path Unavailable')
+    expect(screen.getByRole('combobox', { name: 'Model' })).toBeInTheDocument()
+    expect(screen.getByRole('textbox', { name: 'Prompt' })).toBeInTheDocument()
+  })
+  it('does not submit implicitly and names icon actions independently of SVG paths', async () => {
+    render(<><Button disabled>Save</Button><IconButton icon="x-mark" label="Close panel" /><StatusBadge status="wait">Needs permission</StatusBadge></>)
+    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
+    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveAttribute('type', 'button')
+    expect(screen.getByRole('button', { name: 'Close panel' }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
+    expect(screen.getByText('Needs permission', { exact: true })).toBeInTheDocument()
+  })
+  it('uses native radio keyboard behavior and catalog-provided values', async () => {
+    const changes: string[] = []
+    render(<RadioGroup label="Effort" value="standard" options={[{ value: 'standard', label: 'Standard' }, { value: 'extended', label: 'Extended' }]} onChange={(v) => changes.push(v)} />)
+    const standard = screen.getByRole('radio', { name: 'Standard' })
+    standard.focus()
+    await userEvent.keyboard('{ArrowRight}')
+    expect(changes).toEqual(['extended'])
+  })
+  it('updates a scoped palette with appearance without changing the overview hat', () => {
+    localStorage.setItem('hennery.hat', 'overview-hat')
+    setAppearance('light')
+    render(<HatChip colour="#ff00ff">Session hat</HatChip>)
+    const chip = screen.getByText('Session hat', { exact: true })
+    expect(chip.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#ff00ff').light.accent)
+    act(() => setAppearance('dark'))
+    expect(chip.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#ff00ff').dark.accent)
+    expect(localStorage.getItem('hennery.hat')).toBe('overview-hat')
+  })
+})
diff --git a/web/src/components/ui/ui.css b/web/src/components/ui/ui.css
new file mode 100644
index 00000000..282b80e2
--- /dev/null
+++ b/web/src/components/ui/ui.css
@@ -0,0 +1,74 @@
+/* Shared native controls: Design System Buttons / Inputs / Config / Keycaps. */
+.btn {
+  display:inline-flex; align-items:center; justify-content:center; border:1px solid transparent; text-decoration:none;
+  min-height:32px; padding:0 12px; gap:6px; border-radius:var(--radius-sm);
+  font:700 13px/1.2 var(--font-display); transition:background var(--duration-fast) var(--ease-standard);
+}
+.btn-primary { background:var(--hn-accent); color:var(--hn-on-accent); box-shadow:none; }
+.btn-primary:hover:not(:disabled) { background:var(--hn-accent-hover); transform:none; box-shadow:none; }
+.btn-secondary { background:var(--hn-surface); color:var(--hn-fg-1); border-color:var(--hn-boundary); }
+.btn-secondary:hover:not(:disabled), .btn-ghost:hover:not(:disabled) { background:var(--hn-hover); color:var(--hn-fg-1); }
+.btn-ghost { background:transparent; border-color:transparent; color:var(--hn-fg-2); }
+.btn-danger { color:var(--st-fail-fg); border-color:var(--st-fail-fg); }
+.btn-danger:hover:not(:disabled) { background:var(--st-fail-bg); color:var(--st-fail-fg); }
+.btn-sm { min-height:28px; padding:0 10px; font-size:12px; }
+.btn-icon { width:32px; padding:0; }
+.btn:disabled { cursor:not-allowed; background:var(--hn-sunken); color:var(--hn-fg-3); border-color:var(--hn-line); opacity:1; filter:none; }
+.device-settings .btn, .pwa-banner .btn { min-height:44px; }
+:where(button, a, input, select, textarea, summary, [tabindex]):focus-visible {
+  outline:2px solid var(--hn-focus-ring); outline-offset:1px; box-shadow:0 0 0 5px var(--hn-focus-halo);
+}
+.text-input.text-input, .ui-select, .ui-textarea {
+  min-height:32px; padding:6px 10px; border:1px solid var(--hn-boundary); border-radius:var(--radius-sm);
+  background:var(--hn-surface); color:var(--hn-fg-1); font:400 13px/1.4 var(--font-body); max-width:100%;
+}
+.text-input.text-input:focus, .ui-select:focus, .ui-textarea:focus {
+  outline:2px solid var(--hn-focus-ring); outline-offset:1px; border-color:var(--hn-focus-ring); box-shadow:0 0 0 5px var(--hn-focus-halo);
+}
+.text-input[aria-invalid="true"], .ui-select[aria-invalid="true"], .ui-textarea[aria-invalid="true"] { border-color:var(--st-fail-fg); }
+.field-label.field-label { font:500 12px/1.4 var(--font-display); gap:6px; margin-bottom:6px; flex-wrap:wrap; }
+.ui-hint, .ui-error { display:block; font:400 12px/1.4 var(--font-body); margin-top:6px; }
+.ui-hint { color:var(--hn-fg-3); } .ui-error { color:var(--st-fail-fg); }
+.ui-status { display:inline-flex; align-items:center; gap:6px; min-height:24px; padding:2px 9px 2px 7px; border-radius:var(--radius-full); font:500 12px/1.3 var(--font-display); white-space:nowrap; }
+.ui-status-wait { color:var(--st-wait-fg); background:var(--st-wait-bg); }
+.ui-status-run { color:var(--st-run-fg); background:var(--st-run-bg); }
+.ui-status-start { color:var(--st-start-fg); background:var(--st-start-bg); }
+.ui-status-idle { color:var(--st-idle-fg); background:var(--st-idle-bg); }
+.ui-status-park { color:var(--st-park-fg); background:var(--st-park-bg); }
+.ui-status-fail { color:var(--st-fail-fg); background:var(--st-fail-bg); }
+.ui-status-warn { color:var(--st-warn-fg); background:var(--st-warn-bg); }
+.ui-keycap { display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 4px; border:1px solid var(--hn-control); border-radius:var(--radius-xs); background:var(--hn-surface); color:var(--hn-fg-2); font:500 11px/1 var(--font-mono); }
+.ui-chip { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--hn-boundary); border-radius:var(--radius-sm); padding:3px 8px; font:500 12px/1.3 var(--font-display); }
+.ui-chip-inherits { border-style:dashed; color:var(--hn-fg-3); }
+.ui-chip-override { color:var(--hn-accent-fg); background:var(--hn-accent-wash); border-color:var(--hn-accent); }
+.ui-count { min-width:20px; display:inline-flex; justify-content:center; padding:2px 6px; border-radius:var(--radius-full); background:var(--hn-sunken); color:var(--hn-fg-2); font:500 11px/1.3 var(--font-display); }
+.ui-hat { display:inline-flex; gap:6px; align-items:center; color:var(--hn-accent-fg); font:500 12px/1.4 var(--font-display); }
+.ui-hat-swatch { width:12px; height:12px; border-radius:3px; background:var(--hn-accent); flex:none; }
+.ui-radio-group { border:0; padding:0; margin:0; min-width:0; }
+.ui-radio-group legend { font:500 12px/1.4 var(--font-display); margin-bottom:6px; }
+.ui-radio { display:inline-flex; gap:6px; align-items:center; min-height:32px; padding:4px 8px; color:var(--hn-fg-2); font:500 13px/1.4 var(--font-display); }
+.ui-radio input { accent-color:var(--hn-accent); }
+.ui-appearance { display:flex; gap:8px; flex-wrap:wrap; margin-top:20px; }
+.ui-appearance legend { color:var(--hn-fg-3); }
+.ui-theme-announcement { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
+.auth .auth-card { padding:24px; border-radius:var(--radius-lg); box-shadow:var(--shadow-xs); }
+.auth-card h1 { font:500 24px/1.2 var(--font-display); }
+.auth-card .brand-name { font-weight:500; }
+.auth .field { margin-bottom:16px; }
+.modal.dialog { max-width:480px; border:1px solid var(--hn-line); border-radius:var(--radius-lg); }
+.dialog .modal-title { font:500 18px/1.2 var(--font-display); }
+.dialog .modal-head { padding:20px 24px 0; }
+.dialog .modal-body { padding:20px 24px; }
+.dialog .modal-foot { padding:16px 24px; }
+.dialog .modal-body form > .modal-foot { padding-inline:0; }
+.hn-accent-scope { --hn-focus:0 0 0 2px var(--hn-focus-ring),0 0 0 5px var(--hn-focus-halo); }
+@media (max-width:767px) {
+  .btn, .btn-sm, .btn-icon, .ui-radio { min-height:44px; }
+  .btn-icon { width:44px; }
+  .text-input.text-input, .ui-select, .ui-textarea { font-size:16px; min-height:44px; }
+  .modal.dialog { border-radius:20px 20px 0 0; padding-bottom:env(safe-area-inset-bottom); max-height:94dvh; }
+  .dialog .modal-title { font-size:20px; }
+}
+@media (prefers-reduced-motion:reduce) {
+  *, *::before, *::after { animation:none !important; transition:none !important; scroll-behavior:auto !important; }
+}
diff --git a/web/src/components/ui/useModalLayer.ts b/web/src/components/ui/useModalLayer.ts
new file mode 100644
index 00000000..a58bf088
--- /dev/null
+++ b/web/src/components/ui/useModalLayer.ts
@@ -0,0 +1,53 @@
+import { useEffect, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
+const stack: HTMLElement[] = []
+const locked = new Map<HTMLElement, { count: number; before: boolean }>()
+/** Inert siblings along the ancestor path; works inside existing screen trees
+ * and with a step-up mounted above a confirmation, without remounting forms. */
+export function useModalLayer(ref: RefObject<HTMLDivElement | null>) {
+  useEffect(() => {
+    const dialog = ref.current
+    if (!dialog) return
+    stack.push(dialog)
+    const siblings: HTMLElement[] = []
+    let child: HTMLElement = dialog
+    while (child.parentElement) {
+      for (const node of child.parentElement.children) {
+        if (!(node instanceof HTMLElement) || node === child || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue
+        // App owns the page's step-up inert state. Do not restore it after
+        // React removes that attribute on close (which would re-inert the page).
+        if (!locked.has(node) && (node.inert || node.hasAttribute('inert'))) continue
+        const state = locked.get(node) ?? { count: 0, before: false }
+        state.count++; locked.set(node, state); node.inert = true; siblings.push(node)
+      }
+      child = child.parentElement
+      if (child === document.body) break
+    }
+    return () => {
+      stack.splice(stack.indexOf(dialog), 1)
+      for (const node of siblings) {
+        const state = locked.get(node)!
+        if (--state.count === 0) { node.inert = state.before; locked.delete(node) }
+      }
+    }
+  }, [ref])
+  const trap = (event: KeyboardEvent<HTMLDivElement>, cancel: () => void, dismissible = true) => {
+    const dialog = ref.current
+    if (!dialog || stack.at(-1) !== dialog) return
+    if (event.key === 'Escape') {
+      event.preventDefault(); event.stopPropagation()
+      if (dismissible) cancel()
+      return
+    }
+    if (event.key !== 'Tab') return
+    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => !el.closest('[hidden], [inert]'))
+    const at = document.activeElement
+    if (!controls.length) { event.preventDefault(); dialog.focus(); return }
+    const first = controls[0], last = controls[controls.length - 1]
+    if (event.shiftKey && (at === first || !controls.includes(at as HTMLElement))) { event.preventDefault(); last.focus() }
+    else if (!event.shiftKey && (at === last || !controls.includes(at as HTMLElement))) { event.preventDefault(); first.focus() }
+  }
+  const holdFocus = (event: MouseEvent<HTMLDivElement>) => {
+    if (event.target === event.currentTarget) { event.preventDefault(); ref.current?.focus() }
+  }
+  return { trap, holdFocus }
+}
diff --git a/web/src/styles/fonts.css b/web/src/styles/fonts.css
new file mode 100644
index 00000000..2b7cab66
--- /dev/null
+++ b/web/src/styles/fonts.css
@@ -0,0 +1,31 @@
+/* OFL-1.1: source versions, hashes and full licences in THIRD_PARTY_NOTICES.txt. */
+@font-face {
+  font-family:'Inter'; font-style:normal; font-weight:400 700; font-display:swap;
+  src:url('/fonts/Inter-normal-latin.woff2') format('woff2');
+  unicode-range:U+0000-00FF,U+2000-206F,U+20A0-20CF,U+2113,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
+}
+@font-face {
+  font-family:'Inter'; font-style:normal; font-weight:400 700; font-display:swap;
+  src:url('/fonts/Inter-normal-latin-ext.woff2') format('woff2');
+  unicode-range:U+0100-024F,U+0300-036F,U+1E00-1EFF,U+2C60-2C7F,U+A720-A7FF;
+}
+@font-face {
+  font-family:'Inter'; font-style:italic; font-weight:400 700; font-display:swap;
+  src:url('/fonts/Inter-italic-latin.woff2') format('woff2');
+  unicode-range:U+0000-00FF,U+2000-206F,U+20A0-20CF,U+2113,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
+}
+@font-face {
+  font-family:'Inter'; font-style:italic; font-weight:400 700; font-display:swap;
+  src:url('/fonts/Inter-italic-latin-ext.woff2') format('woff2');
+  unicode-range:U+0100-024F,U+0300-036F,U+1E00-1EFF,U+2C60-2C7F,U+A720-A7FF;
+}
+@font-face {
+  font-family:'Roboto'; font-style:normal; font-weight:400 700; font-display:swap;
+  src:url('/fonts/Roboto-normal-latin.woff2') format('woff2');
+  unicode-range:U+0000-00FF,U+2000-206F,U+20A0-20CF,U+2113,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
+}
+@font-face {
+  font-family:'Roboto'; font-style:normal; font-weight:400 700; font-display:swap;
+  src:url('/fonts/Roboto-normal-latin-ext.woff2') format('woff2');
+  unicode-range:U+0100-024F,U+0300-036F,U+1E00-1EFF,U+2C60-2C7F,U+A720-A7FF;
+}
diff --git a/web/src/styles/tokens.css b/web/src/styles/tokens.css
new file mode 100644
index 00000000..2ba9339c
--- /dev/null
+++ b/web/src/styles/tokens.css
@@ -0,0 +1,62 @@
+/* UI R1: semantic roles; fixed status hues never inherit the hat accent. */
+:root {
+  --hn-bg:#f8f9fb; --hn-panel:#fff; --hn-surface:#fff; --hn-sunken:#f1f2f5; --hn-hover:#f1f3f7;
+  --hn-line:#e9e9eb; --hn-control:#d8d8da; --hn-control-strong:#c3c3c5; --hn-boundary:#686869;
+  --hn-fg-1:#202020; --hn-fg-2:#49494a; --hn-fg-3:#686869; --hn-icon:#89898a;
+  --hn-accent:#46576d; --hn-accent-hover:#37475c; --hn-accent-fg:#3c4d63; --hn-on-accent:#fff;
+  --hn-accent-wash:#edf2f9; --hn-accent-soft:#e3e8ef; --hn-selected:#e6ecf3;
+  --hn-focus-ring:#3c4d63; --hn-focus-halo:#cfd5dc;
+  --hn-focus:0 0 0 2px var(--hn-focus-ring),0 0 0 5px var(--hn-focus-halo);
+  --hn-code-bg:#f4f5f7; --hn-code-fg:#202020; --hn-term-bg:#16181a; --hn-term-fg:#e6e6e7;
+  --hn-add-bg:#e6f5e9; --hn-add-fg:#0f741f; --hn-del-bg:#fce8e9; --hn-del-fg:#9f2626;
+  --st-wait-fg:#a44d0f; --st-wait-bg:#fde6d7; --st-wait-solid:#ff7918; --st-wait-line:#fdbb8d;
+  --st-run-fg:#0f741f; --st-run-bg:#f1f9f4; --st-run-solid:#17b530;
+  --st-start-fg:#2257be; --st-start-bg:#f5f8ff; --st-start-solid:#2c71f6;
+  --st-idle-fg:#49494a; --st-idle-bg:#f0f1f3; --st-idle-solid:#a8a8aa;
+  --st-park-fg:#686869; --st-park-bg:#f0f1f3; --st-park-solid:#c3c3c5;
+  --st-fail-fg:#bf2e2e; --st-fail-bg:#fcf6f8; --st-fail-solid:#f73b3b;
+  --st-warn-fg:#7a5300; --st-warn-bg:#fff4d6; --st-warn-solid:#ffbe18;
+  --hn-scrim:rgb(32 32 32 / .5);
+  --hn-pop-shadow:0 10px 15px -3px rgb(16 24 40 / .1),0 4px 6px -4px rgb(16 24 40 / .06);
+  --radius-xs:4px; --radius-sm:6px; --radius-md:8px; --radius-lg:12px; --radius-xl:16px; --radius-full:9999px;
+  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px; --space-6:24px;
+  --space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px; --space-20:80px; --space-24:100px;
+  --font-display:'Roboto',system-ui,-apple-system,'Segoe UI',sans-serif;
+  --font-body:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
+  --font-mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
+  --shadow-xs:0 1px 2px rgb(16 24 40 / .05);
+  --duration-fast:120ms; --duration-normal:180ms; --duration-slow:240ms;
+  --ease-standard:cubic-bezier(.4,0,.2,1); --ease-out:cubic-bezier(0,0,.2,1);
+}
+:root[data-theme="dark"] {
+  --hn-bg:#141517; --hn-panel:#1a1c1e; --hn-surface:#202223; --hn-sunken:#17191b; --hn-hover:#26292b;
+  --hn-line:#2a2d2f; --hn-control:#383b3e; --hn-control-strong:#49494a; --hn-boundary:#a8a8aa;
+  --hn-fg-1:#f2f2f3; --hn-fg-2:#c3c3c5; --hn-fg-3:#a8a8aa; --hn-icon:#89898a;
+  --hn-accent:#8dabc8; --hn-accent-hover:#a5c4e2; --hn-accent-fg:#99b7d5; --hn-on-accent:#141517;
+  --hn-accent-wash:#202b3b; --hn-accent-soft:#293444; --hn-selected:#263141;
+  --hn-focus-ring:#99b7d5; --hn-focus-halo:#3b4350;
+  --hn-code-bg:#17191b; --hn-code-fg:#e6e6e7; --hn-term-bg:#0f1012;
+  --hn-add-bg:rgb(23 181 48 / .14); --hn-add-fg:#8bd999; --hn-del-bg:rgb(247 59 59 / .14); --hn-del-fg:#f99c9e;
+  --st-wait-fg:#fdbb8d; --st-wait-bg:rgb(255 121 24 / .15); --st-wait-line:rgb(255 121 24 / .45);
+  --st-run-fg:#8bd999; --st-run-bg:rgb(23 181 48 / .13);
+  --st-start-fg:#95b7fa; --st-start-bg:rgb(44 113 246 / .16);
+  --st-idle-fg:#c3c3c5; --st-idle-bg:#2a2d2f; --st-idle-solid:#89898a;
+  --st-park-fg:#a8a8aa; --st-park-bg:#2a2d2f; --st-park-solid:#686869;
+  --st-fail-fg:#f99c9e; --st-fail-bg:rgb(247 59 59 / .14);
+  --st-warn-fg:#ffd666; --st-warn-bg:rgb(255 190 24 / .13);
+  --hn-scrim:rgb(0 0 0 / .6); --hn-pop-shadow:0 12px 24px -6px rgb(0 0 0 / .5),0 0 0 1px #2a2d2f;
+}
+/* Temporary aliases. Nested session palettes must rebind the aliases locally:
+   custom-property aliases otherwise resolve at the ancestor where defined. */
+:root, .hn-accent-scope {
+  --bg:var(--hn-bg); --rail:var(--hn-panel); --rail-2:var(--hn-hover);
+  --surface:var(--hn-surface); --surface-2:var(--hn-sunken); --surface-3:var(--hn-hover);
+  --border:var(--hn-line); --border-strong:var(--hn-boundary);
+  --fg-1:var(--hn-fg-1); --fg-2:var(--hn-fg-2); --fg-muted:var(--hn-fg-3); --fg-quiet:var(--hn-fg-3);
+  --accent:var(--hn-accent-fg); --accent-2:var(--hn-accent-hover); --accent-grad:var(--hn-accent);
+  --on-accent:var(--hn-on-accent); --accent-wash:var(--hn-accent-wash); --accent-soft:var(--hn-accent-soft);
+  --ink:var(--hn-term-bg); --st-attn:var(--st-fail-fg); --st-wait:var(--st-wait-fg); --st-run:var(--st-run-fg); --st-idle:var(--st-idle-fg);
+  --r-xs:var(--radius-xs); --r-sm:var(--radius-sm); --r-md:var(--radius-md); --r-lg:var(--radius-lg); --r-full:var(--radius-full);
+  --sh-sm:var(--shadow-xs); --sh-md:var(--hn-pop-shadow); --sh-lg:var(--hn-pop-shadow);
+  --sh-accent:none; --sh-accent-hover:none; --ease:var(--ease-out);
+}
diff --git a/web/third-party-licenses/Heroicons-MIT.txt b/web/third-party-licenses/Heroicons-MIT.txt
new file mode 100644
index 00000000..d6a82290
--- /dev/null
+++ b/web/third-party-licenses/Heroicons-MIT.txt
@@ -0,0 +1,21 @@
+MIT License
+
+Copyright (c) Tailwind Labs, Inc.
+
+Permission is hereby granted, free of charge, to any person obtaining a copy
+of this software and associated documentation files (the "Software"), to deal
+in the Software without restriction, including without limitation the rights
+to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
+copies of the Software, and to permit persons to whom the Software is
+furnished to do so, subject to the following conditions:
+
+The above copyright notice and this permission notice shall be included in all
+copies or substantial portions of the Software.
+
+THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
+IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
+FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
+AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
+LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
+OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
+SOFTWARE.
diff --git a/web/third-party-licenses/Inter-OFL.txt b/web/third-party-licenses/Inter-OFL.txt
new file mode 100644
index 00000000..9b2ca37b
--- /dev/null
+++ b/web/third-party-licenses/Inter-OFL.txt
@@ -0,0 +1,92 @@
+Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)
+
+This Font Software is licensed under the SIL Open Font License, Version 1.1.
+This license is copied below, and is also available with a FAQ at:
+http://scripts.sil.org/OFL
+
+-----------------------------------------------------------
+SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
+-----------------------------------------------------------
+
+PREAMBLE
+The goals of the Open Font License (OFL) are to stimulate worldwide
+development of collaborative font projects, to support the font creation
+efforts of academic and linguistic communities, and to provide a free and
+open framework in which fonts may be shared and improved in partnership
+with others.
+
+The OFL allows the licensed fonts to be used, studied, modified and
+redistributed freely as long as they are not sold by themselves. The
+fonts, including any derivative works, can be bundled, embedded,
+redistributed and/or sold with any software provided that any reserved
+names are not used by derivative works. The fonts and derivatives,
+however, cannot be released under any other type of license. The
+requirement for fonts to remain under this license does not apply
+to any document created using the fonts or their derivatives.
+
+DEFINITIONS
+"Font Software" refers to the set of files released by the Copyright
+Holder(s) under this license and clearly marked as such. This may
+include source files, build scripts and documentation.
+
+"Reserved Font Name" refers to any names specified as such after the
+copyright statement(s).
+
+"Original Version" refers to the collection of Font Software components as
+distributed by the Copyright Holder(s).
+
+"Modified Version" refers to any derivative made by adding to, deleting,
+or substituting -- in part or in whole -- any of the components of the
+Original Version, by changing formats or by porting the Font Software to a
+new environment.
+
+"Author" refers to any designer, engineer, programmer, technical
+writer or other person who contributed to the Font Software.
+
+PERMISSION AND CONDITIONS
+Permission is hereby granted, free of charge, to any person obtaining
+a copy of the Font Software, to use, study, copy, merge, embed, modify,
+redistribute, and sell modified and unmodified copies of the Font
+Software, subject to the following conditions:
+
+1) Neither the Font Software nor any of its individual components,
+in Original or Modified Versions, may be sold by itself.
+
+2) Original or Modified Versions of the Font Software may be bundled,
+redistributed and/or sold with any software, provided that each copy
+contains the above copyright notice and this license. These can be
+included either as stand-alone text files, human-readable headers or
+in the appropriate machine-readable metadata fields within text or
+binary files as long as those fields can be easily viewed by the user.
+
+3) No Modified Version of the Font Software may use the Reserved Font
+Name(s) unless explicit written permission is granted by the corresponding
+Copyright Holder. This restriction only applies to the primary font name as
+presented to the users.
+
+4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
+Software shall not be used to promote, endorse or advertise any
+Modified Version, except to acknowledge the contribution(s) of the
+Copyright Holder(s) and the Author(s) or with their explicit written
+permission.
+
+5) The Font Software, modified or unmodified, in part or in whole,
+must be distributed entirely under this license, and must not be
+distributed under any other license. The requirement for fonts to
+remain under this license does not apply to any document created
+using the Font Software.
+
+TERMINATION
+This license becomes null and void if any of the above conditions are
+not met.
+
+DISCLAIMER
+THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
+EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
+MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
+OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
+COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
+INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
+DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
+FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
+OTHER DEALINGS IN THE FONT SOFTWARE.
diff --git a/web/third-party-licenses/Roboto-OFL.txt b/web/third-party-licenses/Roboto-OFL.txt
new file mode 100644
index 00000000..9c48e05a
--- /dev/null
+++ b/web/third-party-licenses/Roboto-OFL.txt
@@ -0,0 +1,93 @@
+Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)
+
+This Font Software is licensed under the SIL Open Font License, Version 1.1.
+This license is copied below, and is also available with a FAQ at:
+https://openfontlicense.org
+
+
+-----------------------------------------------------------
+SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
+-----------------------------------------------------------
+
+PREAMBLE
+The goals of the Open Font License (OFL) are to stimulate worldwide
+development of collaborative font projects, to support the font creation
+efforts of academic and linguistic communities, and to provide a free and
+open framework in which fonts may be shared and improved in partnership
+with others.
+
+The OFL allows the licensed fonts to be used, studied, modified and
+redistributed freely as long as they are not sold by themselves. The
+fonts, including any derivative works, can be bundled, embedded, 
+redistributed and/or sold with any software provided that any reserved
+names are not used by derivative works. The fonts and derivatives,
+however, cannot be released under any other type of license. The
+requirement for fonts to remain under this license does not apply
+to any document created using the fonts or their derivatives.
+
+DEFINITIONS
+"Font Software" refers to the set of files released by the Copyright
+Holder(s) under this license and clearly marked as such. This may
+include source files, build scripts and documentation.
+
+"Reserved Font Name" refers to any names specified as such after the
+copyright statement(s).
+
+"Original Version" refers to the collection of Font Software components as
+distributed by the Copyright Holder(s).
+
+"Modified Version" refers to any derivative made by adding to, deleting,
+or substituting -- in part or in whole -- any of the components of the
+Original Version, by changing formats or by porting the Font Software to a
+new environment.
+
+"Author" refers to any designer, engineer, programmer, technical
+writer or other person who contributed to the Font Software.
+
+PERMISSION & CONDITIONS
+Permission is hereby granted, free of charge, to any person obtaining
+a copy of the Font Software, to use, study, copy, merge, embed, modify,
+redistribute, and sell modified and unmodified copies of the Font
+Software, subject to the following conditions:
+
+1) Neither the Font Software nor any of its individual components,
+in Original or Modified Versions, may be sold by itself.
+
+2) Original or Modified Versions of the Font Software may be bundled,
+redistributed and/or sold with any software, provided that each copy
+contains the above copyright notice and this license. These can be
+included either as stand-alone text files, human-readable headers or
+in the appropriate machine-readable metadata fields within text or
+binary files as long as those fields can be easily viewed by the user.
+
+3) No Modified Version of the Font Software may use the Reserved Font
+Name(s) unless explicit written permission is granted by the corresponding
+Copyright Holder. This restriction only applies to the primary font name as
+presented to the users.
+
+4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
+Software shall not be used to promote, endorse or advertise any
+Modified Version, except to acknowledge the contribution(s) of the
+Copyright Holder(s) and the Author(s) or with their explicit written
+permission.
+
+5) The Font Software, modified or unmodified, in part or in whole,
+must be distributed entirely under this license, and must not be
+distributed under any other license. The requirement for fonts to
+remain under this license does not apply to any document created
+using the Font Software.
+
+TERMINATION
+This license becomes null and void if any of the above conditions are
+not met.
+
+DISCLAIMER
+THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
+EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
+MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
+OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
+COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
+INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
+DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
+FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
+OTHER DEALINGS IN THE FONT SOFTWARE.
diff --git a/packaging/crate-release.test.mjs b/packaging/crate-release.test.mjs
index d9d21dbf..d4846236 100644
--- a/packaging/crate-release.test.mjs
+++ b/packaging/crate-release.test.mjs
@@ -113,7 +113,8 @@ test('frontend notices include build-tool runtime helpers as well as production
  writeFileSync(join(web,'package.json'),JSON.stringify({dependencies:{react:'1.0.0'},devDependencies:{vite:'1.0.0'}}));
  writeFileSync(join(web,'vite.config.ts'),"import { defineConfig } from 'vite'\n");
  for(const name of ['react','vite']){mkdirSync(join(web,'node_modules',name));writeFileSync(join(web,'node_modules',name,'package.json'),JSON.stringify({name,version:'1.0.0',license:'MIT'}));writeFileSync(join(web,'node_modules',name,'LICENSE'),`MIT License\nCopyright ${name}\nPermission is hereby granted to copy this fixture.`);}
- const text=frontendNotices(web);assert.match(text,/react@1\.0\.0/);assert.match(text,/vite@1\.0\.0/);assert.match(text,/Copyright vite/);
+ writeFileSync(join(web,'THIRD_PARTY_NOTICES.txt'),'Bundled Inter OFL fixture; Heroicons MIT fixture.');
+ const text=frontendNotices(web);assert.match(text,/Bundled Inter OFL fixture; Heroicons MIT fixture/);assert.match(text,/react@1\.0\.0/);assert.match(text,/vite@1\.0\.0/);assert.match(text,/Copyright vite/);
 });
 
 import * as release from './crate-release.mjs';
diff --git a/packaging/prepare-crates.mjs b/packaging/prepare-crates.mjs
index 76ac1da6..ae401ed1 100644
--- a/packaging/prepare-crates.mjs
+++ b/packaging/prepare-crates.mjs
@@ -32,7 +32,7 @@ export function frontendNotices(web) {
   const config=fs.readFileSync(join(web,'vite.config.ts'),'utf8');
   const tools=[...config.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(name=>!name.startsWith('.')&&!name.startsWith('node:'));
   for(const name of new Set([...Object.keys(manifest.dependencies||{}),...tools,...(manifest.devDependencies?.typescript?['typescript']:[])])) visit(join(web,'node_modules',name));
-  return 'Frontend third-party licence texts (production and configured build-tool closure).\nBuild-tool notices cover emitted helpers and CSS; their binaries are not redistributed.\nNo external fonts; application icons/assets are covered by LICENSE.\n\n'+[...seen].sort(([a],[b])=>a.localeCompare(b)).map(([,text])=>text).join('\n\n'+'='.repeat(72)+'\n\n')+'\n';
+  return 'Frontend third-party licence texts (production and configured build-tool closure).\nBuild-tool notices cover emitted helpers and CSS; their binaries are not redistributed.\nBundled fonts/icons retain their upstream licences below.\n\n'+fs.readFileSync(join(web,'THIRD_PARTY_NOTICES.txt'),'utf8')+'\n\n'+[...seen].sort(([a],[b])=>a.localeCompare(b)).map(([,text])=>text).join('\n\n'+'='.repeat(72)+'\n\n')+'\n';
 }
 export function stageCrates(prepared,destination) {
   const inventory=readJSON(join(prepared,'crates-inventory.json'));verifyCandidate(prepared,inventory);
diff --git a/packaging/release/supply.py b/packaging/release/supply.py
index 4e0b0b7c..5e66c7dc 100644
--- a/packaging/release/supply.py
+++ b/packaging/release/supply.py
@@ -131,6 +131,11 @@ def components(cargo, frontend):
                 p, _ = component('OpenSSL', '.'.join(fields[k] for k in ('MAJOR', 'MINOR', 'PATCH')), 'Apache-2.0', root / 'openssl', 'generic')
                 p['sourceInfo'] = 'Vendored OpenSSL source available in the exact openssl-src crate on crates.io.'
                 packages.append(p)
+    # Fonts and bundled SVG paths have no npm manifest. Keep their complete
+    # upstream texts in both prepared frontend material and direct notices.
+    assets = Path(__file__).resolve().parents[2] / 'web/THIRD_PARTY_NOTICES.txt'
+    if assets.is_file() and frontend:
+        notices.append('\n===== Bundled frontend assets =====\n' + assets.read_text())
     return packages, ''.join(notices), findings
 
 
diff --git a/packaging/release/test_supply.py b/packaging/release/test_supply.py
index 6703fb98..cb354075 100644
--- a/packaging/release/test_supply.py
+++ b/packaging/release/test_supply.py
@@ -80,6 +80,8 @@ class Supply(unittest.TestCase):
             components, notices, findings = supply.components(cargo, frontend)
             self.assertEqual({c['name'] for c in components}, {'dependency', 'frontend'})
             self.assertIn('Frontend licence', notices)
+            asset_notices = Path(supply.__file__).resolve().parents[2] / 'web/THIRD_PARTY_NOTICES.txt'
+            self.assertIn(asset_notices.read_text(), notices)
             self.assertIn('OpenSSL Apache-2.0', notices)
             self.assertEqual(findings, [])
             sbom = supply.spdx(components, 'a' * 40, 'test-target')
diff --git a/web/pwa-build.ts b/web/pwa-build.ts
index 3b6406b3..a0d34c7b 100644
--- a/web/pwa-build.ts
+++ b/web/pwa-build.ts
@@ -1,7 +1,7 @@
 // Runs after Vite has emitted every chunk. The worker isn't part of its own
 // precache. No network-generated URL or query parameter enters this list.
 import { createHash } from 'node:crypto'
-import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
+import { cpSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
 import { resolve } from 'node:path'
 import { deflateSync } from 'node:zlib'
 import { build, type Plugin } from 'vite'
@@ -39,6 +39,8 @@ export function pwaBuild(): Plugin {
     name: 'hennery-pwa', apply: 'build',
     configResolved(config) { root = config.root; out = resolve(root, config.build.outDir) },
     async closeBundle() {
+      cpSync(resolve(root, 'THIRD_PARTY_NOTICES.txt'), resolve(out, 'THIRD_PARTY_NOTICES.txt'))
+      cpSync(resolve(root, 'third-party-licenses'), resolve(out, 'third-party-licenses'), { recursive: true })
       for (const size of [180, 192, 512]) writeFileSync(resolve(out, `icon-${size}.png`), png(size))
       writeFileSync(resolve(out, 'icon-maskable.png'), png(512))
       const mime: Record<string, string> = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json', woff2: 'font/woff2' }
diff --git a/web/src/components/ConfirmDialog.test.tsx b/web/src/components/ConfirmDialog.test.tsx
index 909db271..ebc7a778 100644
--- a/web/src/components/ConfirmDialog.test.tsx
+++ b/web/src/components/ConfirmDialog.test.tsx
@@ -109,3 +109,11 @@ describe('the confirmation', () => {
     expect(screen.getByRole('heading', { name: 'Fallback' })).toHaveFocus()
   })
 })
+
+it('keeps background controls inert for the confirmation lifetime', async () => {
+  const { unmount } = render(<><button>Background</button><ConfirmDialog title="Confirm action" confirm="Run" action={async () => {}} onClose={() => {}}><p>Review this action.</p></ConfirmDialog></>)
+  const background = screen.getByRole('button', { name: 'Background', hidden: true })
+  expect(background.inert).toBe(true)
+  unmount()
+  expect(background.inert).toBe(false)
+})
diff --git a/web/src/components/ConfirmDialog.tsx b/web/src/components/ConfirmDialog.tsx
index e48a2601..f65ef49e 100644
--- a/web/src/components/ConfirmDialog.tsx
+++ b/web/src/components/ConfirmDialog.tsx
@@ -1,3 +1,4 @@
+import { useModalLayer } from './ui/useModalLayer'
 // A confirmation before an action that cannot be taken back (frontend spec
 // §8: renaming or revoking a host, purging a hat, removing a passkey or a
 // device). The action runs from here: while it runs the dialog stays open,
@@ -5,7 +6,7 @@
 // text. Focus moves in, stays in (Tab cycles within it, and a click on the
 // backdrop keeps it), and goes back where it was when it closes, or to
 // `returnFocus` when that is gone.
-import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
+import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
 import { messageOf } from '../api/errors'
 import { Text } from '../lib/text'
 
@@ -30,6 +31,7 @@ export default function ConfirmDialog({ title, children, confirm, danger, disabl
   const [busy, setBusy] = useState(false)
   const [error, setError] = useState<string | null>(null)
   const dialog = useRef<HTMLDivElement>(null)
+  const { trap, holdFocus } = useModalLayer(dialog)
   const live = useRef(true)
   const titleId = useId()
   const fallback = useRef(returnFocus)
@@ -48,14 +50,6 @@ export default function ConfirmDialog({ title, children, confirm, danger, disabl
     }
   }, [])
 
-  // A click on the backdrop would move focus to the body, out of the trap
-  // and out of reach of Escape: it is kept in the dialog.
-  const holdFocus = (e: MouseEvent<HTMLDivElement>) => {
-    if (e.target !== e.currentTarget) return
-    e.preventDefault()
-    dialog.current?.focus()
-  }
-
   const run = async () => {
     // Its buttons are disabled while the action runs: focus is held by the
     // dialog itself, so a step-up opened over it returns focus here.
@@ -72,37 +66,8 @@ export default function ConfirmDialog({ title, children, confirm, danger, disabl
     }
   }
 
-  // Tab and Shift+Tab cycle through the dialog's own controls: nothing
-  // behind the overlay can be reached while it is open.
-  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
-    if (e.key === 'Escape' && !busy) {
-      onClose()
-      return
-    }
-    if (e.key !== 'Tab') return
-    const controls = [
-      ...(dialog.current?.querySelectorAll<HTMLElement>(
-        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
-      ) ?? []),
-    ]
-    if (controls.length === 0) {
-      e.preventDefault()
-      return
-    }
-    const first = controls[0]
-    const last = controls[controls.length - 1]
-    const at = document.activeElement
-    if (e.shiftKey && (at === first || !controls.includes(at as HTMLElement))) {
-      e.preventDefault()
-      last.focus()
-    } else if (!e.shiftKey && (at === last || !controls.includes(at as HTMLElement))) {
-      e.preventDefault()
-      first.focus()
-    }
-  }
-
   return (
-    <div className="overlay" onKeyDown={trap} onMouseDown={holdFocus}>
+    <div className="overlay" onKeyDown={(e) => trap(e, onClose, !busy)} onMouseDown={holdFocus}>
       <div className="modal dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog} tabIndex={-1}>
         <div className="modal-head">
           <h2 className="modal-title" id={titleId}>
diff --git a/web/src/components/StepUpDialog.test.tsx b/web/src/components/StepUpDialog.test.tsx
index 2cb4f882..61d4332a 100644
--- a/web/src/components/StepUpDialog.test.tsx
+++ b/web/src/components/StepUpDialog.test.tsx
@@ -139,3 +139,25 @@ describe('the step-up dialog', () => {
     Object.defineProperty(navigator, 'credentials', { value: undefined, configurable: true })
   })
 })
+
+describe('step-up focus containment', () => {
+  it('wraps Tab and Shift+Tab and keeps focus on a backdrop click', async () => {
+    const server = stubServer({
+      'GET /api/capabilities': json(200, FULL),
+      'POST /api/hosts/pairing-codes': json(403, STEP_UP),
+    })
+    const dialog = await open(server)
+    const password = screen.getByLabelText('Your password')
+    await userEvent.type(password, 'password')
+    const confirm = screen.getByRole('button', { name: 'Confirm' })
+    confirm.focus()
+    await userEvent.tab()
+    expect(password).toHaveFocus()
+    await userEvent.tab({ shift: true })
+    expect(confirm).toHaveFocus()
+    await userEvent.click(dialog.parentElement!)
+    expect(dialog).toHaveFocus()
+    await userEvent.tab()
+    expect(password).toHaveFocus()
+  })
+})
diff --git a/web/src/components/StepUpDialog.tsx b/web/src/components/StepUpDialog.tsx
index 35377661..762dd2a2 100644
--- a/web/src/components/StepUpDialog.tsx
+++ b/web/src/components/StepUpDialog.tsx
@@ -1,3 +1,4 @@
+import { useModalLayer } from './ui/useModalLayer'
 // The step-up dialog (frontend spec §3, kernel spec §3.4): a refused request
 // waits while the owner confirms with a passkey, or else the password; then
 // the client sends it once more. It sits over the page, so nothing under it
@@ -22,6 +23,7 @@ export default function StepUpDialog({ onDone, onCancel, returnTo }: Props) {
   const [error, setError] = useState<string | null>(null)
   const [busy, setBusy] = useState(false)
   const dialog = useRef<HTMLDivElement>(null)
+  const { trap, holdFocus } = useModalLayer(dialog)
 
   // The passkey's options are fetched first, so the click that follows can
   // open the browser's prompt at once (a prompt needs the click itself).
@@ -88,8 +90,8 @@ export default function StepUpDialog({ onDone, onCancel, returnTo }: Props) {
   }
 
   return (
-    <div className="overlay" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
-      <div className="modal dialog" role="dialog" aria-modal="true" aria-labelledby="step-up-title" ref={dialog}>
+    <div className="overlay" onKeyDown={(e) => trap(e, onCancel, !busy)} onMouseDown={holdFocus}>
+      <div className="modal dialog" role="dialog" aria-modal="true" aria-labelledby="step-up-title" ref={dialog} tabIndex={-1}>
         <div className="modal-head">
           <div className="modal-eyebrow">Confirm it is you</div>
           <h2 className="modal-title" id="step-up-title">
diff --git a/web/src/index.css b/web/src/index.css
index 40a54618..062e57c7 100644
--- a/web/src/index.css
+++ b/web/src/index.css
@@ -1,38 +1,8 @@
 @import "tailwindcss";
 
-/* hennery's look: a light, neutral theme. No webfont: the system stack. The
-   accent comes from the selected hat (/theme.js sets --accent and --accent-2
-   before the first paint); these are the defaults. */
-
-:root {
-  --accent:#4C5FD5; --accent-2:#3A47A8; --ink:#24262B;
-  --accent-grad:linear-gradient(45deg,var(--accent) 0%,var(--accent-2) 100%);
-
-  --bg:#F8F8F9; --rail:#F0F1F3; --rail-2:#E8E9EC;
-  --surface:#FFFFFF; --surface-2:#F5F6F7; --surface-3:#ECEDF0;
-  --border:#E2E3E7; --border-strong:#CFD1D6;
-
-  --fg-1:#24262B; --fg-2:#4E5159; --fg-muted:#80848D; --fg-quiet:#A7AAB1;
-  --on-accent:#FFFFFF;
-
-  --st-attn:#E5484D; --st-wait:#E8910C; --st-run:#2F9E44; --st-idle:#B4B7BD;
-
-  --accent-wash:color-mix(in srgb,var(--accent) 10%,transparent);
-  --accent-soft:color-mix(in srgb,var(--accent) 16%,transparent);
-
-  --font-display:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
-  --font-body:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
-  --font-mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
-
-  --r-xs:6px; --r-sm:9px; --r-md:13px; --r-lg:18px; --r-full:999px;
-  --sh-sm:0 1px 2px rgba(36,38,43,.05),0 1px 1px rgba(36,38,43,.03);
-  --sh-md:0 10px 28px -10px rgba(36,38,43,.16),0 2px 6px rgba(36,38,43,.05);
-  --sh-lg:0 40px 80px -24px rgba(36,38,43,.30),0 12px 24px -8px rgba(36,38,43,.12);
-  --sh-accent:0 12px 30px -12px color-mix(in srgb,var(--accent) 50%,transparent);
-  --sh-accent-hover:0 16px 34px -12px color-mix(in srgb,var(--accent) 55%,transparent);
-  --ease:cubic-bezier(.22,1,.36,1);
-}
-
+@import "./styles/tokens.css";
+@import "./styles/fonts.css";
+@import "./components/ui/ui.css";
 
 * { box-sizing:border-box; }
 html,body { margin:0; height:100%; overflow-x:hidden; }
@@ -70,9 +40,9 @@ input,textarea { font-family:inherit; }
    past the viewport — the cause of horizontal overflow on mobile). */
 .rail { background:var(--rail); border-right:1px solid var(--border); display:flex; flex-direction:column; min-height:0; min-width:0; }
 .rail-head { padding:18px 18px 14px; display:flex; align-items:center; gap:10px; }
-.brand-name { font-family:var(--font-display); font-weight:800; font-size:16px; letter-spacing:-.01em; }
+.brand-name { font-family:var(--font-display); font-weight:500; font-size:16px; letter-spacing:-.01em; }
 .brand-name .dot { color:var(--accent); }
-.new-btn { margin:0 14px 8px; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--accent-grad); color:#fff; border:none; font-weight:700; font-size:14px; padding:11px 14px; border-radius:var(--r-md); box-shadow:var(--sh-accent); transition:transform var(--ease) .15s, box-shadow var(--ease) .15s; font-family:var(--font-display); }
+.new-btn { margin:0 14px 8px; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--accent-grad); color:var(--on-accent); border:none; font-weight:700; font-size:14px; padding:11px 14px; border-radius:var(--r-md); box-shadow:var(--sh-accent); transition:transform var(--ease) .15s, box-shadow var(--ease) .15s; font-family:var(--font-display); }
 .new-btn:hover { transform:translateY(-1px); box-shadow:var(--sh-accent-hover); }
 .new-btn:active { transform:translateY(0); }
 .new-btn-ghost { background:none; color:var(--fg-2); border:1px solid var(--border-strong); box-shadow:none; font-weight:600; }
@@ -137,7 +107,7 @@ input,textarea { font-family:inherit; }
 /* Main canvas */
 .main { flex:1; min-height:0; min-width:0; display:flex; flex-direction:column; }
 .welcome { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px; }
-.welcome h1 { font-family:var(--font-display); font-weight:800; font-size:34px; letter-spacing:-.02em; margin:0 0 10px; }
+.welcome h1 { font-family:var(--font-display); font-weight:500; font-size:34px; letter-spacing:-.02em; margin:0 0 10px; }
 .welcome p { color:var(--fg-2); font-size:16px; max-width:440px; margin:0 0 28px; }
 
 /* Conversation header — kept compact so the chat gets the space */
@@ -145,13 +115,13 @@ input,textarea { font-family:inherit; }
 .conv-title-row { display:flex; align-items:center; gap:10px; }
 .badge { display:inline-flex; align-items:center; gap:6px; font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.08em; text-transform:uppercase; padding:4px 9px; border-radius:var(--r-full); flex:none; white-space:nowrap; }
 .badge .led { width:6px; height:6px; border-radius:50%; flex:none; }
-.badge-attn { background:rgba(229,72,77,.12); color:var(--st-attn); }
-.badge-wait { background:rgba(232,145,12,.14); color:#B26A00; }
-.badge-run  { background:rgba(47,158,68,.13); color:#247A33; }
+.badge-attn { background:var(--st-wait-bg); color:var(--st-wait-fg); }
+.badge-wait { background:var(--st-wait-bg); color:var(--st-wait-fg); }
+.badge-run  { background:var(--st-run-bg); color:var(--st-run-fg); }
 .badge-idle { background:var(--surface-3); color:var(--fg-muted); }
 /* Failed: a hollow red ring, as the list's marker; red fill means a question. */
 .badge-fail { background:transparent; color:var(--st-attn); box-shadow:inset 0 0 0 1px var(--st-attn); }
-.conv-name { font-family:var(--font-display); font-weight:800; font-size:18px; letter-spacing:-.01em; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
+.conv-name { font-family:var(--font-display); font-weight:500; font-size:18px; letter-spacing:-.01em; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
 .icon-btn { flex:none; padding:6px 8px; margin-left:auto; }
 .conv-meta { display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:8px; }
 .meta-item { font-size:12px; color:var(--fg-muted); }
@@ -168,9 +138,9 @@ input,textarea { font-family:inherit; }
 .transcript { flex:1; min-width:0; overflow-y:auto; overflow-x:hidden; padding:24px 28px 8px; }
 .transcript-inner { margin:0 auto; }
 .msg { display:flex; gap:14px; margin-bottom:22px; min-width:0; }
-.avatar { width:30px; height:30px; border-radius:8px; flex:none; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; font-family:var(--font-display); }
-.avatar-ai { background:var(--accent-grad); color:#fff; }
-.avatar-user { background:var(--ink); color:#fff; }
+.avatar { width:30px; height:30px; border-radius:8px; flex:none; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:500; font-family:var(--font-display); }
+.avatar-ai { background:var(--accent-grad); color:var(--on-accent); }
+.avatar-user { background:var(--hn-term-bg); color:var(--hn-term-fg); }
 .avatar-sys { background:var(--surface-3); color:var(--fg-muted); }
 .msg-body { flex:1; min-width:0; }
 .msg-head { display:flex; align-items:baseline; gap:9px; margin-bottom:5px; }
@@ -193,7 +163,7 @@ input,textarea { font-family:inherit; }
 .bubble a { color:var(--accent); text-decoration:none; }
 .bubble a:hover { text-decoration:underline; }
 .bubble code { font-family:var(--font-mono); font-size:.86em; background:var(--surface-3); border:1px solid var(--border); border-radius:5px; padding:1px 6px; color:var(--fg-1); }
-.bubble pre { font-family:var(--font-mono); font-size:13px; background:#2A2826; color:#F2EFEA; border-radius:var(--r-sm); padding:13px 15px; margin:10px 0; overflow-x:auto; }
+.bubble pre { font-family:var(--font-mono); font-size:13px; background:var(--hn-term-bg); color:var(--hn-term-fg); border-radius:var(--r-sm); padding:13px 15px; margin:10px 0; overflow-x:auto; }
 .bubble pre code { background:none; border:none; padding:0; color:inherit; font-size:13px; }
 /* GFM tables: remark-gfm emits real <table>s but they were unstyled. display:block
    + overflow-x:auto lets a wide table scroll inside the bubble instead of blowing
@@ -228,7 +198,7 @@ input,textarea { font-family:inherit; }
 .hljs-strong { font-weight:700; }
 
 .divider { display:flex; align-items:center; gap:14px; margin:8px 0 22px; color:var(--st-wait); font-size:13px; font-weight:600; }
-.divider::before,.divider::after { content:''; height:1px; flex:1; background:linear-gradient(90deg,transparent,rgba(232,145,12,.35),transparent); }
+.divider::before,.divider::after { content:''; height:1px; flex:1; background:var(--st-wait-line); }
 
 /* Tool call (collapsible) */
 .tool-line { display:flex; align-items:center; gap:9px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:11px 14px; font-size:14px; color:var(--fg-2); width:100%; min-width:0; text-align:left; transition:border-color .12s; }
@@ -237,7 +207,7 @@ input,textarea { font-family:inherit; }
 .tool-name { font-weight:700; color:var(--fg-1); flex:none; }
 .tool-summary { font-family:var(--font-mono); font-size:12px; color:var(--fg-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
 .tool-status { margin-left:auto; font-size:11px; font-weight:700; flex:none; }
-.tool-io { font-family:var(--font-mono); font-size:12px; background:#2A2826; color:#F2EFEA; border-radius:var(--r-sm); padding:11px 14px; margin:6px 0 0; overflow-x:auto; white-space:pre-wrap; word-break:break-word; }
+.tool-io { font-family:var(--font-mono); font-size:12px; background:var(--hn-term-bg); color:var(--hn-term-fg); border-radius:var(--r-sm); padding:11px 14px; margin:6px 0 0; overflow-x:auto; white-space:pre-wrap; word-break:break-word; }
 .tool-io .io-label { color:#8A857F; display:block; margin-bottom:4px; }
 /* A tool call's JSON input, one line per element, tokenised into the .tk-* classes below. */
 .tool-io .io-json-ln { display:block; }
@@ -248,8 +218,8 @@ input,textarea { font-family:inherit; }
 .think-body > :first-child { margin-top:0; }
 .think-body > :last-child { margin-bottom:0; }
 /* Fabrication warning — loud, can't-miss banner */
-.fab-warn { display:flex; flex-direction:column; gap:5px; margin:10px 0 18px; padding:12px 15px; font-size:13.5px; line-height:1.5; color:#7A1115; background:#FDECEC; border:1.5px solid var(--st-attn); border-left:4px solid var(--st-attn); border-radius:var(--r-sm); }
-.fab-warn-tag { font-family:var(--font-display); font-weight:800; font-size:12px; letter-spacing:.02em; color:var(--st-attn); }
+.fab-warn { display:flex; flex-direction:column; gap:5px; margin:10px 0 18px; padding:12px 15px; font-size:13.5px; line-height:1.5; color:var(--st-fail-fg); background:var(--st-fail-bg); border:1.5px solid var(--st-attn); border-left:4px solid var(--st-attn); border-radius:var(--r-sm); }
+.fab-warn-tag { font-family:var(--font-display); font-weight:500; font-size:12px; letter-spacing:.02em; color:var(--st-attn); }
 
 /* Composer */
 .composer { flex:none; border-top:1px solid var(--border); background:var(--bg); padding:14px 28px 18px; }
@@ -270,7 +240,7 @@ input,textarea { font-family:inherit; }
 .slash-desc { font-size:12px; color:var(--fg-quiet); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
 .composer-box:focus-within { border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-wash); }
 .composer-box textarea { flex:1; border:none; outline:none; resize:none; background:none; font-size:15px; line-height:1.5; padding:10px 0; max-height:160px; color:var(--fg-1); font-family:var(--font-body); }
-.send-btn { width:40px; height:40px; flex:none; border:none; border-radius:var(--r-sm); background:var(--accent-grad); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-accent); transition:transform .15s var(--ease),opacity .15s; }
+.send-btn { width:40px; height:40px; flex:none; border:none; border-radius:var(--r-sm); background:var(--accent-grad); color:var(--on-accent); display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-accent); transition:transform .15s var(--ease),opacity .15s; }
 .send-btn:hover:not(:disabled) { transform:translateY(-1px); }
 .send-btn:disabled { opacity:.4; box-shadow:none; transform:none; cursor:not-allowed; background:var(--border-strong); }
 .composer-hint { display:flex; align-items:center; gap:14px; margin-top:9px; font-size:12px; color:var(--fg-quiet); }
@@ -286,7 +256,7 @@ input,textarea { font-family:inherit; }
 .att-chip img { width:100%; height:100%; object-fit:cover; display:block; }
 .att-n { position:absolute; left:3px; bottom:2px; font-size:10px; font-weight:700; color:#fff; background:rgba(0,0,0,.55); border-radius:4px; padding:0 4px; }
 .att-x { position:absolute; top:2px; right:2px; width:18px; height:18px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; background:rgba(0,0,0,.6); color:#fff; }
-.att-x:hover { background:var(--st-attn); }
+.att-x:hover { background:var(--st-fail-bg); color:var(--st-fail-fg); }
 
 /* Resume bar */
 .resume-bar { flex:none; border-top:1px solid var(--border); background:var(--bg); padding:16px 28px; display:flex; align-items:center; gap:14px; }
@@ -321,14 +291,14 @@ input,textarea { font-family:inherit; }
 .ask-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
 .ask-eyebrow .e-tag { font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); }
 .ask-q { font-family:var(--font-display); font-weight:700; font-size:17px; margin:0 0 10px; letter-spacing:-.005em; }
-.cmd-card { background:#2A2826; border-radius:var(--r-sm); overflow:hidden; margin:4px 0 0; }
+.cmd-card { background:var(--hn-term-bg); border-radius:var(--r-sm); overflow:hidden; margin:4px 0 0; }
 .cmd-head { display:flex; align-items:center; gap:8px; padding:9px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
 .cmd-head .tag { font-family:var(--font-mono); font-size:11px; color:#C9C4BC; font-weight:500; }
 .cmd-head .danger-tag { margin-left:auto; font-family:var(--font-display); font-weight:700; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#FF8A6B; }
-.cmd-body { font-family:var(--font-mono); font-size:13px; color:#F2EFEA; padding:13px 15px; white-space:pre-wrap; word-break:break-all; }
+.cmd-body { font-family:var(--font-mono); font-size:13px; color:var(--hn-term-fg); padding:13px 15px; white-space:pre-wrap; word-break:break-all; }
 .ask-actions { display:flex; align-items:center; gap:10px; margin-top:16px; flex-wrap:wrap; }
 .answered { display:flex; align-items:center; gap:9px; font-size:13.5px; color:var(--fg-2); padding:6px 0; }
-.answered .check { width:18px; height:18px; border-radius:50%; background:var(--st-run); color:#fff; display:flex; align-items:center; justify-content:center; flex:none; }
+.answered .check { width:18px; height:18px; border-radius:50%; background:var(--st-run); color:var(--on-accent); display:flex; align-items:center; justify-content:center; flex:none; }
 .answered b { color:var(--fg-1); font-weight:700; }
 
 .elic-fields { display:flex; flex-direction:column; gap:14px; margin-top:14px; }
@@ -368,25 +338,13 @@ input,textarea { font-family:inherit; }
 .steps li.on { color:var(--accent); font-weight:700; }
 
 
-/* Buttons */
-.btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; font-family:var(--font-display); font-weight:700; font-size:14px; padding:11px 20px; border-radius:var(--r-full); border:1.5px solid transparent; transition:all .15s var(--ease); }
-.btn:disabled { opacity:.45; box-shadow:none; transform:none; cursor:not-allowed; }
-.btn-primary { background:var(--accent-grad); color:#fff; box-shadow:var(--sh-accent); }
-.btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:var(--sh-accent-hover); }
-.btn-primary:disabled { filter:grayscale(.3); }
-.btn-ghost { background:transparent; color:var(--fg-2); border-color:var(--border-strong); }
-.btn-ghost:hover:not(:disabled) { border-color:var(--ink); color:var(--ink); }
-.btn-danger { background:transparent; color:var(--st-attn); border-color:rgba(229,72,77,.5); }
-.btn-danger:hover:not(:disabled) { background:var(--st-attn); color:#fff; border-color:var(--st-attn); }
-.btn-sm { padding:8px 14px; font-size:13px; }
-
 /* New Session modal */
-.overlay { position:fixed; inset:0; background:rgba(36,38,43,.42); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:32px; z-index:50; }
-.modal { background:var(--surface); border-radius:var(--r-lg); width:100%; max-width:620px; max-height:90vh; display:flex; flex-direction:column; box-shadow:var(--sh-lg); overflow:hidden; position:relative; animation:rise .26s var(--ease); }
+.overlay { position:fixed; inset:0; background:var(--hn-scrim); display:flex; align-items:center; justify-content:center; padding:32px; z-index:50; }
+.modal { background:var(--surface); border-radius:var(--r-lg); width:100%; max-width:620px; max-height:90dvh; display:flex; flex-direction:column; box-shadow:var(--sh-lg); overflow:hidden; position:relative; animation:rise .26s var(--ease); }
 @keyframes rise { from{ transform:translateY(14px) scale(.985);} to{ transform:none;} }
 .modal-head { padding:22px 26px 0; }
 .modal-eyebrow { font-family:var(--font-display); font-weight:700; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); }
-.modal-title { font-family:var(--font-display); font-weight:800; font-size:23px; letter-spacing:-.01em; margin:6px 0 0; }
+.modal-title { font-family:var(--font-display); font-weight:500; font-size:23px; letter-spacing:-.01em; margin:6px 0 0; }
 .modal-x { position:absolute; top:18px; right:18px; width:34px; height:34px; border-radius:8px; border:none; background:var(--surface-2); color:var(--fg-muted); display:flex; align-items:center; justify-content:center; transition:background .12s,color .12s; }
 .modal-x:hover { background:var(--surface-3); color:var(--fg-1); }
 .modal-body { padding:20px 26px; overflow-y:auto; }
@@ -419,7 +377,7 @@ input,textarea { font-family:inherit; }
 .model { display:flex; align-items:center; gap:13px; padding:13px 15px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--surface); text-align:left; width:100%; transition:all .12s; }
 .model:hover { border-color:var(--border-strong); }
 .model.sel { border-color:var(--accent); background:var(--accent-wash); }
-.model-ic { width:34px; height:34px; border-radius:9px; flex:none; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; font-size:13px; color:#fff; }
+.model-ic { width:34px; height:34px; border-radius:9px; flex:none; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:500; font-size:13px; color:var(--on-accent); }
 .model-main { flex:1; min-width:0; }
 .model-name { font-weight:700; font-size:14.5px; }
 .model-name .id { font-family:var(--font-mono); font-weight:500; font-size:11px; color:var(--fg-muted); margin-left:7px; }
@@ -474,8 +432,8 @@ input,textarea { font-family:inherit; }
   .mtb-btn:disabled { opacity:.5; }
   .mtb-mid { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; }
   .mtb-eyebrow { font-family:var(--font-display); font-weight:700; font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); line-height:1.3; }
-  .mtb-title { font-family:var(--font-display); font-weight:800; font-size:16px; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
-  .mtb-new { width:44px; height:44px; flex:none; border-radius:11px; border:none; background:var(--accent-grad); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-accent); }
+  .mtb-title { font-family:var(--font-display); font-weight:500; font-size:16px; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
+  .mtb-new { width:44px; height:44px; flex:none; border-radius:11px; border:none; background:var(--accent-grad); color:var(--on-accent); display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-accent); }
 
   /* hide desktop status strip; surface filters in the drawer instead */
   .topbar { display:none; }
@@ -504,7 +462,7 @@ input,textarea { font-family:inherit; }
   /* New Session → bottom sheet */
   .overlay { align-items:flex-end; justify-content:center; padding:0; }
   .modal {
-    width:100%; max-width:none; height:auto; max-height:94vh;
+    width:100%; max-width:none; height:auto; max-height:94dvh;
     border-radius:var(--r-lg) var(--r-lg) 0 0; animation:sheet .34s var(--ease);
   }
   @keyframes sheet { from { transform:translateY(100%); } to { transform:none; } }
@@ -564,7 +522,7 @@ input,textarea { font-family:inherit; }
 /* ── Sign-in screens: setup and login ── */
 .auth { min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom)); }
 .auth-card { width:100%; max-width:420px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--sh-md); padding:28px; }
-.auth-card h1 { font-family:var(--font-display); font-weight:800; font-size:24px; letter-spacing:-.01em; margin:6px 0 18px; }
+.auth-card h1 { font-family:var(--font-display); font-weight:500; font-size:24px; letter-spacing:-.01em; margin:6px 0 18px; }
 .auth-card .btn { width:100%; }
 .auth-or { text-align:center; color:var(--fg-muted); font-size:13px; margin:14px 0; }
 .field { display:block; }
@@ -576,7 +534,7 @@ input,textarea { font-family:inherit; }
 /* ── The session list (4c): in the rail from 768px, the whole screen under it ── */
 .slist { display:flex; flex-direction:column; min-width:0; }
 .slist-screen { padding:8px 8px 16px; }
-.slist-title { font-family:var(--font-display); font-weight:800; font-size:20px; margin:8px 10px 10px; }
+.slist-title { font-family:var(--font-display); font-weight:500; font-size:20px; margin:8px 10px 10px; }
 .slist .rail-search { margin:6px 6px 10px; }
 .list-hats { flex-wrap:wrap; margin:4px 6px 8px; }
 .list-filters { display:flex; gap:8px; align-items:center; margin:0 6px 8px; }
@@ -589,7 +547,7 @@ h2.grp-head { margin:0; font-size:inherit; font-weight:inherit; }
 .sess { text-decoration:none; color:inherit; }
 .sess-agent { font-size:10.5px; font-weight:600; }
 .sess-flag { font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; flex:none; }
-.sess-flag-attn { color:var(--st-attn); }
+.sess-flag-attn { color:var(--st-wait-fg); }
 .sess-flag-fail { color:var(--st-attn); }
 .sess-flag-idle { color:var(--fg-muted); }
 .sess-why { margin:0 10px 4px; border:none; background:none; padding:2px 0; font-size:11px; font-weight:600; color:var(--st-attn); text-decoration:underline; }
diff --git a/web/src/manage.css b/web/src/manage.css
index 6c27352d..7269abb1 100644
--- a/web/src/manage.css
+++ b/web/src/manage.css
@@ -4,7 +4,7 @@
 
 .manage { width:100%; max-width:860px; margin:0 auto; padding:24px 20px calc(32px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
 .manage-head { display:flex; align-items:center; gap:12px; }
-.manage-head h1 { font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
+.manage-head h1 { font-family:var(--font-display); font-weight:500; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
 .cards { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
 .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--sh-sm); padding:16px 18px; min-width:0; }
 .card-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
@@ -19,12 +19,12 @@
 .facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }
 
 .state, .tag { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-radius:var(--r-full); padding:3px 9px; white-space:nowrap; }
-.state-online { background:rgba(47,158,68,.13); color:#247A33; }
+.state-online { background:var(--st-run-bg); color:var(--st-run-fg); }
 .state-offline { background:var(--surface-3); color:var(--fg-muted); }
-.state-revoked { background:rgba(229,72,77,.12); color:var(--st-attn); }
+.state-revoked { background:var(--st-fail-bg); color:var(--st-attn); }
 .host-revoked .card-title { color:var(--fg-muted); }
 .tag { background:var(--accent-wash); color:var(--accent); }
-.tag-warn { background:rgba(232,145,12,.14); color:#B26A00; }
+.tag-warn { background:var(--st-warn-bg); color:var(--st-warn-fg); }
 
 .swatch { width:18px; height:18px; border-radius:6px; flex:none; background:var(--fg-quiet); border:1px solid var(--border-strong); }
 .colour-input { width:52px; height:40px; padding:2px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); }
@@ -35,7 +35,7 @@
 .select-field .field-label { margin:0; font-size:12px; }
 .select-field select { min-height:36px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); color:var(--fg-1); padding:6px 8px; font:inherit; max-width:100%; }
 
-.command { background:var(--ink); color:#fff; border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
+.command { background:var(--hn-term-bg); color:var(--hn-term-fg); border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
 .pairing-code code { font-family:var(--font-mono); font-weight:700; }
 .hint { color:var(--fg-muted); font-size:13px; }
 .empty { color:var(--fg-muted); }
@@ -69,14 +69,14 @@
 .field-row .field { flex:1; min-width:160px; }
 .check { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
 .check input { width:18px; height:18px; margin:0; flex:none; }
-.hint.warn { color:#B26A00; }
+.hint.warn { color:var(--st-warn-fg); }
 .token-form { border-top:1px solid var(--border); padding-top:12px; margin-top:12px; }
 .mounts { border:0; border-top:1px solid var(--border); margin:12px 0 0; padding:12px 0 0; min-width:0; }
 .mounts legend { font-weight:700; font-size:13px; padding:0; margin-bottom:6px; }
-.mcp-ok { background:rgba(47,158,68,.13); color:#247A33; }
+.mcp-ok { background:var(--st-run-bg); color:var(--st-run-fg); }
 .mcp-not_connected { background:var(--surface-3); color:var(--fg-muted); }
-.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
-.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }
+.mcp-needs_auth { background:var(--st-warn-bg); color:var(--st-warn-fg); }
+.mcp-error { background:var(--st-fail-bg); color:var(--st-attn); }
 
 @media (max-width:767px) {
   .check { min-height:44px; }
@@ -101,7 +101,7 @@
 .oauth-connect .notice { margin-top:12px; }
 .oauth-connect a { display:inline-block; min-height:44px; padding:12px 0; }
 .mcp-attention { display:inline-block; font-size:10px; line-height:1.2; white-space:normal; }
-.mcp-auth-count { color:#B26A00; }
+.mcp-auth-count { color:var(--st-warn-fg); }
 .mcp-error-count { color:var(--fg-2); }
 .oauth-connect .btn, .oauth-client .btn, .mcp-report .btn { min-height:44px; }
 .mcp-attention-link { display:inline-flex; align-items:center; max-width:80px; min-height:44px; }
diff --git a/web/src/screens/Login.tsx b/web/src/screens/Login.tsx
index 398b209f..99da2ae3 100644
--- a/web/src/screens/Login.tsx
+++ b/web/src/screens/Login.tsx
@@ -1,3 +1,4 @@
+import { AppearanceOptions } from '../components/ui/Appearance'
 // Sign in (frontend spec §3, client view spec D6): "Sign in with passkey"
 // first, the password second. The passkey's ceremony is started when the
 // page loads, so the button's click can open the browser's prompt at once;
@@ -134,6 +135,7 @@ export default function Login() {
             Sign in
           </button>
         </form>
+        <AppearanceOptions />
       </div>
     </main>
   )
diff --git a/web/src/screens/Setup.tsx b/web/src/screens/Setup.tsx
index 441d7fea..ea809629 100644
--- a/web/src/screens/Setup.tsx
+++ b/web/src/screens/Setup.tsx
@@ -1,3 +1,4 @@
+import { AppearanceOptions } from '../components/ui/Appearance'
 // The one-time setup (frontend spec §3, kernel spec §3.1): the owner's
 // password, `public_url` (this page's origin unless changed) and the default
 // hat's name, with the token the link carried; then the offer of a passkey,
@@ -146,6 +147,7 @@ export default function Setup() {
             </button>
           </form>
         )}
+        <AppearanceOptions />
       </div>
     </main>
   )
@@ -210,6 +212,7 @@ function PasskeyOffer() {
             {added || !supported ? 'Continue' : 'Skip'}
           </button>
         </p>
+        <AppearanceOptions />
       </div>
     </main>
   )
```

- [x] **Step 2: Acquire/reproduce the six font assets**

Normal builds use committed WOFF2s and never execute these network commands. Run these once to reproduce assets (source SHA256s and final output sizes/hashes in `web/THIRD_PARTY_NOTICES.txt`). Upstream Inter variable normal/italic, Roboto split upright variable; only 400–700 weights are used. FontTools 4.61.1 was used. Nix's standalone FontTools wrapper needs Brotli on PYTHONPATH, so compose those site-package paths explicitly. No global Python installation.

```bash
mkdir -p .superpowers/sdd/ui-r1/upstream/inter .superpowers/sdd/ui-r1/upstream/roboto web/public/fonts
nix develop -c curl -fL https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip -o .superpowers/sdd/ui-r1/upstream/Inter-4.1.zip
nix develop -c curl -fL https://github.com/googlefonts/roboto-3-classic/releases/download/v3.015/Roboto_v3.015.zip -o .superpowers/sdd/ui-r1/upstream/Roboto_v3.015.zip
nix develop -c unzip -q .superpowers/sdd/ui-r1/upstream/Inter-4.1.zip InterVariable.ttf InterVariable-Italic.ttf LICENSE.txt -d .superpowers/sdd/ui-r1/upstream/inter
nix develop -c unzip -q .superpowers/sdd/ui-r1/upstream/Roboto_v3.015.zip -d .superpowers/sdd/ui-r1/upstream/roboto
```

Save the following as `.superpowers/sdd/ui-r1/subset-fonts.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
export SOURCE_DATE_EPOCH=1731628800
root=.superpowers/sdd/ui-r1/upstream
fonttools varLib.instancer "$root/inter/InterVariable.ttf" wght=400:700 opsz=14 --output "$root/Inter-normal.ttf"
fonttools varLib.instancer "$root/inter/InterVariable-Italic.ttf" wght=400:700 opsz=14 --output "$root/Inter-italic.ttf"
fonttools varLib.instancer "$root/roboto/web/split/Roboto[wdth,wght].ttf" wght=400:700 wdth=100 --output "$root/Roboto-normal.ttf"
for face in Inter-normal Inter-italic Roboto-normal; do
  pyftsubset "$root/$face.ttf" --output-file="web/public/fonts/$face-latin.woff2" --flavor=woff2 --layout-features='*' --no-recalc-timestamp --unicodes='U+0000-00FF,U+2000-206F,U+20A0-20CF,U+2113,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
  pyftsubset "$root/$face.ttf" --output-file="web/public/fonts/$face-latin-ext.woff2" --flavor=woff2 --layout-features='*' --no-recalc-timestamp --unicodes='U+0100-024F,U+0300-036F,U+1E00-1EFF,U+2C60-2C7F,U+A720-A7FF'
done
```

Run the exact subset tool command:

```bash
nix shell nixpkgs#python3Packages.fonttools nixpkgs#python3Packages.brotli -c bash -c 'brotli_store=$(nix eval --raw nixpkgs#python3Packages.brotli.outPath); export PYTHONPATH=$(printf "%s\n" "$brotli_store"/lib/python*/site-packages); exec bash .superpowers/sdd/ui-r1/subset-fonts.sh'
```

- [x] **Step 3: Verify**

Run targeted UI/Login/Setup/Confirm/Step-up suites, `nix develop -c pnpm --dir web typecheck`, and `nix develop -c node --test packaging/crate-release.test.mjs`. Run `nix shell nixpkgs#python3 -c python3 -m unittest discover -s packaging/release -p test_supply.py`. The later Task 3 font check must inspect the real six emitted font tables; removal probes strip Polish glyphs independently from both families. Remove each modal trap/inert guard in the probe copy and observe failure.

- [x] **Step 4: Commit/push**

Stage this task and the six WOFF2s; inspect staged bytes and author identities. Commit `feat(ui): adopt design tokens and self-hosted shared controls`; push `git push origin plan/ui-r1`. Parent reviews asset/licence and focus risks.

## Task 3: Build guards and embedded-browser acceptance

- [x] **Step 1: Apply the exact implementation patch**

Save this block verbatim as `.superpowers/sdd/ui-r1/task-3.patch`, then run `git apply --check` and `git apply` on it from the base/replay tree. New files and replacements are encoded together; the replay must extract a nonzero file count before claiming success.

```diff
diff --git a/web/e2e/appearance.spec.ts b/web/e2e/appearance.spec.ts
new file mode 100644
index 00000000..363353a9
--- /dev/null
+++ b/web/e2e/appearance.spec.ts
@@ -0,0 +1,176 @@
+// UI R1: real embedded assets/CSP with deterministic API data for visual QA.
+import { expect, test, type BrowserContext, type Page } from '@playwright/test'
+import { mkdirSync } from 'node:fs'
+import { resolve } from 'node:path'
+import { startCollector, type Collector } from './collector'
+import { deriveAccent, contrast } from '../src/lib/accent'
+import type { SessionSummary, Item } from '../src/generated/view'
+
+let collector: Collector
+const captures = process.env.HENNERY_UI_CAPTURES ? resolve(process.env.HENNERY_UI_CAPTURES) : undefined
+const ts = '2026-10-20T10:00:00Z'
+const summary: SessionSummary = { session_id: 'visual-session', title: 'Review the parser', host_id: 'visual-host', agent: 'claude', cwd: '/srv/project', hat_id: 'visual-hat', lifecycle: 'active', activity: 'blocked', presumed_parked: false, created_at: ts, last_event_at: ts, question_waits: true, operator_attention: 1, parent_handled_questions: 0 }
+const question: Item = { id: 'question:visual-permission', version: 1, ts, kind: 'question', pending_id: 'visual-permission', question_kind: 'permission', request: { type: 'permission', title: 'Read project files', tool_call_id: 'tool1', options: [{ option_id: 'allow', name: 'Allow once', option_kind: 'allow_once' }, { option_id: 'reject', name: 'Reject', option_kind: 'reject_once' }] }, answerable: true, state: 'open', answered: false }
+
+async function fixture(context: BrowserContext) {
+  const held: (() => Promise<void>)[] = []
+  await context.route('**/api/**', async route => {
+    const path = new URL(route.request().url()).pathname
+    const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
+    if (path.startsWith('/api/stream/')) { held.push(() => route.abort().catch(() => {})); return }
+    if (path === '/api/capabilities') return json({ mode: 'full', features: ['sessions', 'hats', 'hosts', 'mcp_connections'] })
+    if (path === '/api/hats') return json([{ id: 'visual-hat', name: 'Personal', colour: '#ffff00', created_at: ts, default_for_new_hosts: true }])
+    if (path === '/api/hosts') return json([{ host_id: 'visual-host', name: 'Development host', platform: 'linux', host_version: '0.1.4', capabilities: [], default_hat_id: 'visual-hat', workspace_roots: ['/srv/project'], connected: false, created_at: ts, last_seen_at: ts }])
+    if (path === '/api/view/sessions') return json({ sessions: [summary], epoch: 'visual-list', revision: 1, waiting: 1 })
+    if (path === '/api/sessions/visual-session') return json({ ...summary, pending: [] })
+    if (path === '/api/view/sessions/visual-session') return json({ items: [question], older: false, epoch: 'visual-items', revision: 1 })
+    if (path === '/api/sessions/visual-session/catalog') return json({ session_id: summary.session_id, config_options: [], commands: [] })
+    if (path === '/api/mcp/connections' || path === '/api/auth/sessions' || path.endsWith('/path-rules')) return json([])
+    if (path === '/api/hosts/visual-host/agents') return json([])
+    if (path === '/api/hosts/visual-host/recent-projects') return json([])
+    if (path === '/api/hosts/visual-host' && route.request().method() === 'DELETE') return json({ code: 'step_up_required', message: 'Confirm it is you' }, 403)
+    if (path === '/api/settings') return json({ public_url: collector.origin })
+    return json({ code: 'not_found', message: 'Unavailable in visual fixture' }, 404)
+  })
+  return async () => { for (const release of held) await release() }
+}
+async function readyFonts(page: Page) {
+  await page.evaluate(async () => {
+    for (const family of ['Inter', 'Roboto']) for (const weight of [400, 500, 600, 700]) await document.fonts.load(`${weight} 16px "${family}"`, 'Zażółć gęślą jaźń')
+    await document.fonts.load('italic 400 16px "Inter"', 'Zażółć gęślą jaźń')
+    await document.fonts.ready
+  })
+}
+async function capture(page: Page, name: string, width: number, theme: string) {
+  await readyFonts(page)
+  if (captures) {
+    mkdirSync(captures, { recursive: true })
+    await page.screenshot({ path: resolve(captures, `${name}-${width}-${theme}.png`), fullPage: true })
+  }
+}
+test.beforeAll(async () => { collector = await startCollector() })
+test.afterAll(async () => { await collector?.stop() })
+for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const) {
+  test(`fonts, tokens, CSP and existing screens at ${width}px ${theme}`, async ({ browser }) => {
+    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme, reducedMotion: 'reduce' })
+    const page = await context.newPage()
+    await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'))
+    const requests: string[] = []
+    page.on('request', request => requests.push(request.url()))
+    await page.addInitScript(({ theme, palette }) => {
+      localStorage.setItem('hennery.theme', JSON.stringify({ version: 1, preference: theme, ...palette }))
+      localStorage.setItem('hennery.hat', 'visual-hat')
+      document.addEventListener('securitypolicyviolation', e => { (window as unknown as { violations: string[] }).violations ??= []; (window as unknown as { violations: string[] }).violations.push(`${e.violatedDirective}: ${e.blockedURI}`) })
+    }, { theme, palette: deriveAccent('#ffff00') })
+    try {
+      await page.goto(collector.origin + '/login')
+      await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
+      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
+      await readyFonts(page)
+      const faces = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => ({ family: f.family, style: f.style, weight: f.weight, display: f.display })))
+      expect(faces.filter(f => f.family === 'Inter')).toHaveLength(4)
+      expect(faces.filter(f => f.family === 'Roboto')).toHaveLength(2)
+      expect(faces.every(f => f.weight === '400 700' && f.display === 'swap')).toBe(true)
+      expect(faces.some(f => f.family === 'Inter' && f.style === 'italic')).toBe(true)
+      const fontRequests = requests.filter(url => url.endsWith('.woff2'))
+      for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) expect(fontRequests).toContain(`${collector.origin}/fonts/${face}-${subset}.woff2`)
+      const statuses = await page.evaluate(() => {
+        const rows: { fg: string; bg: string; surface: string }[] = []
+        for (const role of ['wait', 'run', 'start', 'idle', 'park', 'fail', 'warn']) {
+          const parent = document.createElement('div'); parent.style.background = 'var(--hn-surface)'
+          const badge = document.createElement('span'); badge.className = 'ui-status ui-status-' + role; badge.textContent = role
+          parent.append(badge); document.body.append(parent)
+          rows.push({ fg: getComputedStyle(badge).color, bg: getComputedStyle(badge).backgroundColor, surface: getComputedStyle(parent).backgroundColor })
+          parent.remove()
+        }
+        return rows
+      })
+      const metrics = await page.getByRole('button', { name: 'Sign in', exact: true }).evaluate(el => {
+        const style = getComputedStyle(el), body = getComputedStyle(document.body)
+        return { foreground: style.color, background: style.backgroundColor, displayFont: style.fontFamily, bodyFont: body.fontFamily, height: el.getBoundingClientRect().height }
+      })
+      const asHex = (s: string) => '#' + s.match(/\d+/g)!.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('')
+      for (const status of statuses) {
+        const fg = asHex(status.fg), values = status.bg.match(/[\d.]+/g)!.map(Number), surface = status.surface.match(/\d+/g)!.map(Number)
+        const alpha = values[3] ?? 1
+        const bg = '#' + values.slice(0, 3).map((n, i) => Math.round(n * alpha + surface[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')
+        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
+      }
+      expect(contrast(asHex(metrics.foreground), asHex(metrics.background))).toBeGreaterThanOrEqual(4.5)
+      expect(metrics.displayFont).toContain('Roboto'); expect(metrics.bodyFont).toContain('Inter')
+      expect(metrics.height).toBeGreaterThanOrEqual(width === 390 ? 44 : 32)
+      await page.getByRole('button', { name: 'Sign in', exact: true }).focus()
+      expect(await page.getByRole('button', { name: 'Sign in', exact: true }).evaluate(el => getComputedStyle(el).outlineWidth)).toBe('2px')
+      await capture(page, 'login', width, theme)
+      await page.goto(collector.setupLink)
+      await expect(page.getByRole('button', { name: 'Set up', exact: true })).toBeVisible()
+      await capture(page, 'setup', width, theme)
+      await page.goto(collector.origin + '/setup')
+      await capture(page, 'setup-missing-link', width, theme)
+      const release = await fixture(context)
+      try {
+        for (const [name, route] of [['sessions', '/sessions'], ['session-permission', '/sessions/visual-session'], ['new-session', '/new'], ['hosts', '/hosts'], ['hats', '/hats'], ['mcp', '/mcp'], ['settings', '/settings'], ['not-found', '/missing']] as const) {
+          await page.goto(collector.origin + route)
+          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
+          await expect(page.locator('main')).toBeVisible()
+          if (name === 'session-permission') await expect(page.getByText('Read project files', { exact: true })).toBeVisible()
+          await expect(page.getByText('Could not render this item', { exact: true })).toHaveCount(0)
+          await capture(page, name, width, theme)
+          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
+        }
+        await page.goto(collector.origin + '/hosts')
+        await page.getByRole('button', { name: 'Revoke', exact: true }).click()
+        await expect(page.getByRole('dialog', { name: 'Revoke this host?', exact: true })).toBeVisible()
+        await capture(page, 'confirmation', width, theme)
+        await page.getByRole('dialog').getByRole('button', { name: 'Revoke', exact: true }).click()
+        await expect(page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true })).toBeVisible()
+        await capture(page, 'step-up', width, theme)
+        const password = page.getByLabel('Your password', { exact: true })
+        await expect(password).toBeFocused()
+        await password.press('Shift+Tab')
+        await expect(page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true }).getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
+        await page.keyboard.press('Escape')
+        await expect(page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true })).toHaveCount(0)
+        await expect(page.getByRole('dialog', { name: 'Revoke this host?', exact: true })).toBeVisible()
+        await page.keyboard.press('Escape')
+        await expect(page.getByRole('button', { name: 'Revoke', exact: true })).toBeFocused()
+        await context.route('**/api/capabilities', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ mode: 'gateway', features: ['mcp_connections'] }) }))
+        await page.goto(collector.origin + '/mcp')
+        await capture(page, 'gateway-mcp', width, theme)
+        await page.goto(collector.origin + '/sessions')
+        await capture(page, 'unavailable', width, theme)
+        // Render Polish glyphs from both real faces in the actual page, not a remote font service.
+        await page.evaluate(() => {
+          const panel = document.createElement('section'); panel.setAttribute('aria-label', 'Font sample')
+          for (const family of ['Inter', 'Roboto']) { const p = document.createElement('p'); p.textContent = 'Zażółć gęślą jaźń'; p.style.fontFamily = family; panel.append(p) }
+          document.querySelector('main')!.append(panel)
+        })
+        await capture(page, 'polish-fonts', width, theme)
+      } finally { await release() }
+      expect(requests.every(url => new URL(url).origin === collector.origin)).toBe(true)
+      expect(await page.evaluate(() => (window as unknown as { violations?: string[] }).violations ?? [])).toEqual([])
+      const worker = await (await context.request.get(collector.origin + '/sw.js')).text()
+      for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) expect(worker).toContain(`/fonts/${face}-${subset}.woff2`)
+    } finally { await context.close() }
+  })
+}
+
+// Real cache/embedded-font boundary, also checked offline after installation.
+test('self-hosted font assets survive an offline PWA reload', async ({ browser }) => {
+  const context = await browser.newContext({ serviceWorkers: 'allow' })
+  try {
+    const page = await context.newPage()
+    await page.goto(collector.origin + '/login')
+    await page.evaluate(async () => { await navigator.serviceWorker.ready })
+    await page.reload()
+    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
+    const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat())
+    for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) expect(cached).toContain('/fonts/' + face + '-' + subset + '.woff2')
+    await page.goto(collector.origin + '/sessions')
+    await context.setOffline(true)
+    await page.reload()
+    await readyFonts(page)
+    expect(await page.evaluate(() => document.fonts.check('400 16px Inter', 'Zażółć gęślą jaźń'))).toBe(true)
+    expect(await page.evaluate(() => document.fonts.check('400 16px Roboto', 'Zażółć gęślą jaźń'))).toBe(true)
+  } finally { await context.close() }
+})
diff --git a/web/scripts/check-css-origins.mjs b/web/scripts/check-css-origins.mjs
new file mode 100644
index 00000000..d2c41eca
--- /dev/null
+++ b/web/scripts/check-css-origins.mjs
@@ -0,0 +1,35 @@
+import { readFileSync, readdirSync } from 'node:fs'
+import { resolve, relative } from 'node:path'
+import { fileURLToPath } from 'node:url'
+/** Decode CSS escapes before looking for URL/import syntax, so escaped
+ * identifiers and protocols receive the same verdict as their plain forms. */
+export function externalReferences(css) {
+  const decoded = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n\f])/gi, (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex, 16) || 0xfffd) : char)
+  const references = []
+  for (const match of decoded.matchAll(/\burl\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)|@import\s*(?:"([^"]*)"|'([^']*)')/gi)) {
+    const url = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5]).trim()
+    // Relative, root-relative, fragments and embedded data have no external origin.
+    if (/^[\u0000-\u0020]*[\/\\]{2}/.test(url) || (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^data:/i.test(url))) references.push(url)
+  }
+  return references
+}
+export function checkCSSOrigins(directory) {
+  const css = []
+  const walk = (dir) => {
+    for (const entry of readdirSync(dir, { withFileTypes: true })) {
+      const path = resolve(dir, entry.name)
+      if (entry.isDirectory()) walk(path)
+      else if (entry.isFile() && entry.name.endsWith('.css')) css.push(path)
+    }
+  }
+  walk(directory)
+  if (!css.length) throw new Error('No emitted CSS assets were checked.')
+  for (const path of css) {
+    const external = externalReferences(readFileSync(path, 'utf8'))
+    if (external.length) throw new Error(`External CSS origin in ${relative(directory, path)}: ${external.join(', ')}`)
+  }
+  return css.length
+}
+if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
+  console.log(`Checked ${checkCSSOrigins(resolve(process.argv[2] ?? 'dist'))} emitted CSS assets: same-origin only.`)
+}
diff --git a/web/scripts/check-css-origins.test.mjs b/web/scripts/check-css-origins.test.mjs
new file mode 100644
index 00000000..1bd26e7e
--- /dev/null
+++ b/web/scripts/check-css-origins.test.mjs
@@ -0,0 +1,22 @@
+import { test } from 'node:test'
+import assert from 'node:assert/strict'
+import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { checkCSSOrigins, externalReferences } from './check-css-origins.mjs'
+test('rejects absolute and network-path URLs in emitted font and imported CSS, including escapes', () => {
+  for (const css of ['@import "https://example.invalid/style.css";', '@import url(//example.invalid/style.css);', '@font-face {src: url("https://example.invalid/font.woff2")}', 'a { background:URL(//example.invalid/a) }', '@import "HTTP://example.invalid/x";', 'a{background:u\\72l(\\68 ttps://example.invalid/a)}', '@import \'//example.invalid/a\'']) assert.equal(externalReferences(css).length, 1, css)
+})
+test('accepts same-origin URLs, comments, embedded data and local CSS imports', () => {
+  assert.deepEqual(externalReferences('@import "./local.css"; @font-face{src:url(/fonts/Inter.woff2)} a{background:url(data:image/svg+xml;base64,AAAA)} /* url(https://example.invalid/comment) */'), [])
+})
+test('visits every CSS asset recursively and refuses an empty output', () => {
+  const root=mkdtempSync(join(tmpdir(),'hennery-css-origins-'))
+  assert.throws(() => checkCSSOrigins(root), /No emitted CSS/)
+  mkdirSync(join(root,'lazy'))
+  writeFileSync(join(root,'main.css'), '@import "./lazy/chunk.css";')
+  writeFileSync(join(root,'lazy/chunk.css'), '@font-face{src:url(//example.invalid/font.woff2)}')
+  assert.throws(() => checkCSSOrigins(root), /lazy\/chunk.css/)
+  writeFileSync(join(root,'lazy/chunk.css'), '@font-face{src:url(/fonts/Roboto.woff2)}')
+  assert.equal(checkCSSOrigins(root),2)
+})
diff --git a/web/scripts/check-fonts.py b/web/scripts/check-fonts.py
new file mode 100644
index 00000000..05845ce8
--- /dev/null
+++ b/web/scripts/check-fonts.py
@@ -0,0 +1,19 @@
+"""Inspect committed WOFF2 cmap/fvar/OS2 tables with upstream FontTools."""
+from pathlib import Path
+from fontTools.ttLib import TTFont
+
+ROOT = Path(__file__).resolve().parents[1]
+POLISH = 'Zażółć gęślą jaźń ZAŻÓŁĆ GĘŚLĄ JAŹŃ'
+count = 0
+for face in ('Inter-normal', 'Inter-italic', 'Roboto-normal'):
+    fonts = [TTFont(ROOT / 'public/fonts' / f'{face}-{subset}.woff2') for subset in ('latin', 'latin-ext')]
+    covered = set().union(*(font.getBestCmap() for font in fonts))
+    missing = sorted(set(map(ord, POLISH)) - covered)
+    assert not missing, f'{face}: missing codepoints {missing}'
+    assert all(ord(c) in fonts[1].getBestCmap() for c in 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ' if ord(c) > 255), f'{face}: latin-ext coverage'
+    for font in fonts:
+        axes = {axis.axisTag: axis for axis in font['fvar'].axes}
+        assert axes['wght'].minValue <= 400 and axes['wght'].maxValue >= 700, f'{face}: weight range'
+        assert bool(font['OS/2'].fsSelection & 1) == ('italic' in face), f'{face}: italic metadata'
+        count += 1
+print(f'{count} WOFF2 faces: Polish cmap, 400–700 and italic metadata verified.')
diff --git a/web/e2e/mcp-oauth.spec.ts b/web/e2e/mcp-oauth.spec.ts
index aeb0bbbe..19bcdec1 100644
--- a/web/e2e/mcp-oauth.spec.ts
+++ b/web/e2e/mcp-oauth.spec.ts
@@ -170,7 +170,7 @@ for (const width of [1280, 390]) test.describe(`OAuth at ${width} px`, () => {
     await card().getByRole('button', { name: 'Probe now', exact: true }).click()
     await expect(card().getByText('May need sign-in', { exact: true })).toBeVisible()
     const attention = page.locator(width === 390 ? '.mtopbar' : '.rail-nav').getByText('1 need attention', { exact: true })
-    await expect(attention).toBeVisible(); await expect(attention).toHaveCSS('color', 'rgb(178, 106, 0)')
+    await expect(attention).toBeVisible(); await expect(attention).toHaveCSS('color', 'rgb(122, 83, 0)')
     if (width === 390) expect((await page.locator('.mtopbar .mcp-attention-link').boundingBox())!.height).toBeGreaterThanOrEqual(44)
   })
   test('issuer changes require a deliberate client save and keep the old grant until consent', async () => {
diff --git a/web/package.json b/web/package.json
index d83aeec1..5a69d138 100644
--- a/web/package.json
+++ b/web/package.json
@@ -6,7 +6,7 @@
   "type": "module",
   "scripts": {
     "dev": "vite",
-    "build": "tsc -b && vite build",
+    "build": "vite build --config theme.config.ts && tsc -b && vite build && node --test scripts/*.test.mjs && node scripts/check-css-origins.mjs dist",
     "test": "vitest run",
     "typecheck": "tsc -b --noEmit && tsc -p tsconfig.node.json",
     "e2e": "sh ../packaging/pwa-test-builds.sh && playwright test"
```

- [x] **Step 2: Verify the final build and browser**

Run, in order, from the worktree root (all exit 0 required):

```bash
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web typecheck
nix develop -c pnpm --dir web test
nix develop -c pnpm --dir web build
nix develop -c cargo build -p hennery -p hennery-testkit --bins --locked
CI=1 nix develop -c pnpm --dir web e2e
HENNERY_UI_CAPTURES="$PWD/.superpowers/sdd/ui-r1/screenshots" CI=1 nix develop -c pnpm --dir web exec playwright test appearance.spec.ts --project=chromium
```

For the standalone glyph check, run inside a Nix shell containing Python, FontTools and Brotli, with both standalone packages' site-package directories on PYTHONPATH:

```bash
nix shell nixpkgs#python3 nixpkgs#python3Packages.fonttools nixpkgs#python3Packages.brotli -c bash -c 'brotli_store=$(nix eval --raw nixpkgs#python3Packages.brotli.outPath); fonttools_store=$(nix eval --raw nixpkgs#python3Packages.fonttools.outPath); export PYTHONPATH=$(printf "%s\n" "$brotli_store"/lib/python*/site-packages):$(printf "%s\n" "$fonttools_store"/lib/python*/site-packages); exec python3 web/scripts/check-fonts.py'
```

- [x] **Step 3: Removal probes and one fresh replay**

In a copy with cloned target, remove CSS origin detection, recursion and empty-output refusal independently; the real Node regression suite must fail each time. Strip Polish glyphs from each family's latin-ext asset using pyftsubset; the FontTools check must fail for that family. Probe palette and theme guards listed in Task 1, and modal/notice wiring in Task 2. Restore each copy before the next probe. All source bytes in the real worktree remain intact.

Fresh replay: archive `339498c5` to a new copy, APFS-clone this worktree's target, extract and apply the three diff blocks sequentially, reproduce fonts from the pinned releases, and compare every changed file byte-for-byte, including generated bootstrap and WOFF2s. Require >0 extracted files for every patch and exact trees before running final gates in the replay. One full final replay only; subsequent review amendments use targeted tests and new guard probes.

- [x] **Step 4: Commit/push**

Stage this task, inspect staged bytes, check `git log --format='%ae' 339498c5..HEAD` contains only `marcin.wadon@gmail.com`, commit `test(ui): verify emitted assets and embedded appearance`, push `git push origin plan/ui-r1`.

## Task 4: Record execution

Update only this plan's Execution status with real command exits/counts, copied guard probes, fresh replay file count/tree match and screenshot inventory; do not edit the docs index. Commit `docs(plan): record UI R1 verification and handoff` and push. Independent review requests list all three task ranges and whole-branch risks; no review is claimed completed here.

## Task 5: Review amendment — document-local hat colors

Apply this exact patch after Task 4 (`c7acf751`). The zero-context patch uses `git apply --unidiff-zero --check` then `git apply --unidiff-zero`; the original three task patches and replay remain a historical record.

```diff
diff --git a/web/src/lib/theme.test.ts b/web/src/lib/theme.test.ts
index 027efcc1..6cd672da 100644
--- a/web/src/lib/theme.test.ts
+++ b/web/src/lib/theme.test.ts
@@ -81 +81 @@ describe('live appearance', () => {
-    expect(t.getTheme()).toEqual(makeTheme('dark', '#0000ff'))
+    expect(t.getTheme()).toEqual(makeTheme('dark'))
@@ -87,0 +88,58 @@ describe('live appearance', () => {
+  it('syncs remote preferences while keeping this document’s hat palette, session and draft', async () => {
+    const t = await import('./theme')
+    const local = deriveAccent('#ff0000')
+    localStorage.setItem('hennery.hat', 'hat-a')
+    localStorage.setItem('session', 'session-a')
+    localStorage.setItem('draft', 'keep')
+    t.saveTheme(local)
+    const write = vi.spyOn(Storage.prototype, 'setItem')
+    try {
+      dark = true
+      for (const preference of ['dark', 'light', 'system'] as const) {
+        const remote = JSON.stringify(makeTheme(preference, '#0000ff'))
+        localStorage.setItem(THEME_KEY, remote)
+        write.mockClear()
+        window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }))
+        const appearance = preference === 'light' ? 'light' : 'dark'
+        expect(t.getTheme()).toEqual({ version: 1, preference, ...local })
+        expect(document.documentElement.dataset.theme).toBe(appearance)
+        for (const [role, value] of Object.entries(local[appearance])) {
+          expect(document.documentElement.style.getPropertyValue(`--hn-${role}`)).toBe(value)
+        }
+        expect(localStorage.getItem('hennery.hat')).toBe('hat-a')
+        expect(localStorage.getItem('session')).toBe('session-a')
+        expect(localStorage.getItem('draft')).toBe('keep')
+        expect(localStorage.getItem(THEME_KEY)).toBe(remote)
+        expect(write).not.toHaveBeenCalled()
+      }
+    } finally {
+      write.mockRestore()
+    }
+  })
+  it('keeps the startup palette while hats load, then accepts the local scope', async () => {
+    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('dark', '#112233')))
+    const t = await import('./theme')
+    expect(t.getTheme()).toEqual(makeTheme('dark', '#112233'))
+    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('light', '#0000ff')))
+    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }))
+    expect(t.getTheme()).toEqual(makeTheme('light', '#112233'))
+    t.saveTheme(deriveAccent('#ff0000'))
+    expect(t.getTheme()).toEqual(makeTheme('light', '#ff0000'))
+  })
+  it('keeps the local palette and follows System when storage is denied', async () => {
+    const t = await import('./theme')
+    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('denied') })
+    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied') })
+    try {
+      expect(() => t.saveTheme(deriveAccent('#ff0000'))).not.toThrow()
+      expect(() => t.setAppearance('dark')).not.toThrow()
+      window.dispatchEvent(new StorageEvent('storage', { key: null }))
+      expect(t.getTheme()).toEqual(makeTheme('system', '#ff0000'))
+      dark = true; change?.()
+      expect(document.documentElement.dataset.theme).toBe('dark')
+      expect(document.documentElement.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#ff0000').dark.accent)
+    } finally {
+      read.mockRestore()
+      write.mockRestore()
+    }
+  })
diff --git a/web/src/lib/theme.ts b/web/src/lib/theme.ts
index 16fde96d..65074c94 100644
--- a/web/src/lib/theme.ts
+++ b/web/src/lib/theme.ts
@@ -23 +23,6 @@ function watch() {
-    if (e.key === THEME_KEY || e.key === null) { current = read(); apply() }
+    if (e.key === THEME_KEY || e.key === null) {
+      // Keep this document's startup fallback or locally selected hat palette.
+      // Only appearance is shared across tabs; applying it must not echo a write.
+      current = { ...getTheme(), preference: read().preference }
+      apply()
+    }
```

- [x] Add the regression first and observe RED in the worktree; then apply the runtime change.
- [x] Run targeted theme/hats/SessionList tests, then remove the preference-only guard in a fresh copy with an APFS-cloned target. Require the two-hat regression to fail; restore and compare the copied bytes.
- [x] Run `pnpm --dir web typecheck && pnpm --dir web test && pnpm --dir web build` in the dev shell, rebuild the embedded collector/testkit, and run `CI=1 pnpm --dir web exec playwright test appearance.spec.ts --project=chromium`.
- [x] Verify staged bytes match tested files; record execution findings 1–3, commit a new `fix(ui)` commit without rewriting history, then push `plan/ui-r1`. Request scoped independent confirmation through the parent.

## Task 6: Offline font CI follow-up

Apply after Task 5. This preserves the worker's explicit auth-route bypass and makes the font test establish a signed-in, controlled app route before going offline. Exact tested patch:

```diff
diff --git a/web/e2e/appearance.spec.ts b/web/e2e/appearance.spec.ts
index 363353a9..1a89da41 100644
--- a/web/e2e/appearance.spec.ts
+++ b/web/e2e/appearance.spec.ts
@@ -159,17 +159,50 @@ for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const)
 test('self-hosted font assets survive an offline PWA reload', async ({ browser }) => {
   const context = await browser.newContext({ serviceWorkers: 'allow' })
   try {
+    // Without a session, /sessions redirects to /login?next=... after load.
+    // Login deliberately bypasses the offline shell; wait for the signed-in UI.
+    const setup = await context.request.post(collector.origin + '/api/setup', {
+      headers: { Origin: collector.origin },
+      data: { token: new URL(collector.setupLink).hash.slice(1), password: 'correct horse battery staple', public_url: collector.origin, default_hat_name: 'Personal' },
+    })
+    expect(setup.ok()).toBe(true)
     const page = await context.newPage()
-    await page.goto(collector.origin + '/login')
+    await page.goto(collector.origin + '/sessions')
+    await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
     await page.evaluate(async () => { await navigator.serviceWorker.ready })
-    await page.reload()
+    const controlled = await page.reload()
+    expect(controlled?.fromServiceWorker()).toBe(true)
     await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
     const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat())
     for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) expect(cached).toContain('/fonts/' + face + '-' + subset + '.woff2')
-    await page.goto(collector.origin + '/sessions')
+    await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
+    await expect(page).toHaveURL(collector.origin + '/sessions')
+    // Exclude the HTTP cache as a source of fonts after this document unloads.
+    const cdp = await context.newCDPSession(page)
+    await cdp.send('Network.clearBrowserCache')
+    await cdp.detach()
+    const offlineFonts: { path: string; worker: boolean; status: number }[] = []
+    page.on('response', response => {
+      if (response.url().endsWith('.woff2')) offlineFonts.push({ path: new URL(response.url()).pathname, worker: response.fromServiceWorker(), status: response.status() })
+    })
     await context.setOffline(true)
-    await page.reload()
+    const offline = await page.reload()
+    expect(offline?.fromServiceWorker()).toBe(true)
+    await expect(page).toHaveURL(collector.origin + '/sessions')
+    await expect(page.getByText('Offline — reconnect to load sessions and answer', { exact: true })).toBeVisible()
+    await page.evaluate(() => {
+      for (const family of ['Inter', 'Roboto']) {
+        const sample = document.createElement('p')
+        sample.textContent = 'Zażółć gęślą jaźń'
+        sample.style.fontFamily = family
+        document.body.append(sample)
+      }
+    })
     await readyFonts(page)
+    for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) {
+      expect(offlineFonts).toContainEqual({ path: '/fonts/' + face + '-' + subset + '.woff2', worker: true, status: 200 })
+    }
+    expect(await page.evaluate(() => [...document.fonts].filter(face => face.status === 'loaded' && ['Inter', 'Roboto'].includes(face.family)).length)).toBe(6)
     expect(await page.evaluate(() => document.fonts.check('400 16px Inter', 'Zażółć gęślą jaźń'))).toBe(true)
     expect(await page.evaluate(() => document.fonts.check('400 16px Roboto', 'Zażółć gęślą jaźń'))).toBe(true)
   } finally { await context.close() }
```

Verification (dev shell, worktree root):

```sh
CI=1 pnpm --dir web exec playwright test appearance.spec.ts --project=chromium --repeat-each 10
pnpm --dir web typecheck
pnpm --dir web test
CI=1 pnpm --dir web e2e
```

Commit this amendment as a new `fix(ui)` commit and push `plan/ui-r1`. Parent owns the scoped review and current Linux/macOS CI/full PR status.

## After this plan

R2 consumes the shared exports from `components/ui/index.ts`: Button/IconButton, Input/Select/Textarea (label/hint/error associations), RadioGroup (native keyboard semantics), StatusBadge (words plus glyph), HatChip/CountPill/ConfigChip/Keycap, Icon, AppearanceButton/AppearanceOptions and useModalLayer. ConfirmDialog and StepUpDialog retain their existing props and accessible names.

Theme seams: `lib/theme.ts` exports getTheme, setAppearance, cycleAppearance, subscribeTheme, useAppearance and useAccentStyle. `lib/accent.ts` exports deriveAccent, paletteProperties, contrast, toOKLCH, role types and surface inputs. For a session/launcher surface, use `useAccentStyle(actualServerHatColour)` on a wrapper with `className="hn-accent-scope"`. That class rebinds compatibility aliases locally; changing appearance recomputes local roles without changing the overview's hat filter. R2/R3 wire the actual route/server hat into these scopes; R1 does not edit their owned shell/session files.

R2 mounts AppearanceButton in its rail, R5 uses AppearanceOptions in Settings, and R6 dispatches cycleAppearance through its guarded global shortcut. Login/Setup already expose direct choices. R2 owns subsequent index.css extraction; R5 takes manage.css after R2. Remaining frames/geometry, navigation, session UI, defaults, management layout and palette are intentionally deferred to their lanes. Existing shell/session geometry is retained in R1 screenshots.

No prototype data or HTML is committed; only official font assets and used SVG paths are bundled. No Rust/CSP change. Parent owns independent review, full PR status, integration/index entry and installed-iOS/final release acceptance.

Generated with Claude AI — please review before distribution.
