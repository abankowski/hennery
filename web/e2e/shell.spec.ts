// The web shell in a real browser, against the real binary (plan 4b): the
// setup link, a passkey registered at setup and used to sign in, the
// password, a step-up, the layout at 1280 px and 390 px by computed style,
// links into the app, and not one Content-Security-Policy violation.
import { expect, test, type CDPSession, type Page } from '@playwright/test'
import { startCollector, type Collector } from './collector'

const PASSWORD = 'correct horse battery staple'

test.describe.configure({ mode: 'serial' })

let collector: Collector
let page: Page
let cdp: CDPSession
const violations: string[] = []

test.beforeAll(async ({ browser }) => {
  collector = await startCollector()
  const context = await browser.newContext({ baseURL: collector.origin })
  page = await context.newPage()
  // Every CSP violation the page sees, whatever its source.
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const seen = ((window as unknown as { __csp?: string[] }).__csp ??= [])
      seen.push(`${e.violatedDirective} ${e.blockedURI}`)
    })
  })
  page.on('console', (m) => {
    if (m.text().includes('Content Security Policy')) violations.push(m.text())
  })
  // A platform authenticator that verifies its user (Chromium's own).
  cdp = await context.newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  })
})

test.afterAll(async () => {
  try {
    await page?.context().close()
  } finally {
    await collector?.stop()
  }
})

async function cspViolations(): Promise<string[]> {
  const seen = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])
  return [...violations, ...seen]
}

test('the setup link sets hennery up, its token gone from the address bar', async () => {
  const entries = await page.evaluate(() => history.length)
  await page.goto(collector.setupLink)
  await expect(page).toHaveURL(`${collector.origin}/setup`)
  expect(await page.evaluate(() => location.hash)).toBe('')
  // Replaced, not pushed: the visit adds one history entry, without the token.
  expect(await page.evaluate(() => history.length)).toBe(entries + 1)
  await expect(page.getByLabel(/^Public URL/)).toHaveValue(collector.origin)
  await page.getByLabel(/^Password at least/).fill(PASSWORD)
  await page.getByLabel('Password again', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Set up' }).click()
  await expect(page.getByRole('heading', { name: 'hennery is set up' })).toBeVisible()
})

test('a passkey is registered right after setup, with no second password', async () => {
  await page.getByLabel('Passkey name', { exact: true }).fill('Test authenticator')
  await page.getByRole('button', { name: 'Add a passkey' }).click()
  await expect(page.getByText(/^Your passkey is added/)).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(`${collector.origin}/sessions`)
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible()
})

test('the shell: a rail from 1280 px, a bottom tab bar at 390 px', async () => {
  const display = (selector: string) =>
    page.locator(selector).evaluate((el) => getComputedStyle(el).display)
  await page.setViewportSize({ width: 1280, height: 800 })
  expect(await display('.rail')).toBe('flex')
  expect(await display('.tabbar')).toBe('none')
  await expect(page.locator('.mtopbar')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await display('.rail')).toBe('none')
  expect(await display('.tabbar')).toBe('flex')
  await expect(page.locator('.mtopbar')).toHaveCount(0)
  const tab = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Hosts' })
  await expect(tab).toBeVisible()
  const box = await tab.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await tab.click()
  await expect(page).toHaveURL(`${collector.origin}/hosts`)
  await page.setViewportSize({ width: 1280, height: 800 })
})

test('a link into the app loads it, signed in', async () => {
  await page.goto('/hats')
  await expect(page.getByRole('heading', { name: 'Hats' })).toBeVisible()
})

test('signed out, a link goes to sign-in and back; the passkey signs in', async () => {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(`${collector.origin}/login`)
  await page.goto('/hosts?x=1')
  await expect(page).toHaveURL(`${collector.origin}/login?next=%2Fhosts%3Fx%3D1`)
  await page.getByRole('button', { name: 'Sign in with passkey' }).click()
  await expect(page).toHaveURL(`${collector.origin}/hosts?x=1`)
  await expect(page.getByRole('heading', { name: 'Hosts' })).toBeVisible()
})

test('the password signs in, and a step-up from the page is accepted', async () => {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(`${collector.origin}/login`)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(`${collector.origin}/sessions`)
  // What the step-up dialog sends, from the page: a same-origin POST under
  // `Referrer-Policy: no-referrer` still carries `Origin`.
  const status = await page.evaluate(async (password) => {
    const r = await fetch('/api/auth/step-up/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    return r.status
  }, PASSWORD)
  expect(status).toBe(204)
})

test('the pages broke no Content-Security-Policy rule', async () => {
  expect(await cspViolations()).toEqual([])
})

// Deterministic browser acceptance over the actual embedded app. These API
// fixtures are synthetic; the push flow in pwa.spec.ts uses the real producer.
for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const) test(`R2 overview, attention, routes and focus at ${width}px ${theme}`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme, reducedMotion: 'reduce' })
  const visual = await context.newPage()
  const captures = process.env.HENNERY_UI_R2_CAPTURES
  const { mkdir } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const ts = '2026-10-20T10:00:00Z'
  const base = { host_id: 'fixture-host', hat_id: 'fixture-hat', agent: 'claude', cwd: '/srv/project', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: 0, parent_handled_questions: 0, created_at: ts, last_event_at: ts }
  const rows = [
    { ...base, session_id: 'permission', title: 'Review project access', activity: 'blocked', operator_attention: 1, question_waits: true },
    { ...base, session_id: 'closed-attention', title: 'Review child outcome', lifecycle: 'closed', operator_attention: 1 },
    { ...base, session_id: 'running', title: 'Implement parser', activity: 'running', agent: 'codex', git_branch: 'parser' },
    { ...base, session_id: 'idle', title: 'Plan next steps', hat_id: 'fixture-other' },
  ]
  let empty = false, gateway = false, activeLists = 0, maximumLists = 0
  const held: (() => Promise<void>)[] = []
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/capabilities') return json({ mode: gateway ? 'gateway' : 'full', features: ['mcp_connections'] })
    if (path === '/api/hats') return json([{ id: 'fixture-hat', name: 'Personal', colour: '#8050d0', created_at: ts, default_for_new_hosts: true }, { id: 'fixture-other', name: 'Other', colour: '#087c70', created_at: ts, default_for_new_hosts: false }])
    if (path === '/api/hosts') return json([{ host_id: 'fixture-host', name: 'Development host', platform: 'linux', host_version: '0.1.4', capabilities: [], default_hat_id: 'fixture-hat', workspace_roots: [], connected: true, created_at: ts, last_seen_at: ts }])
    if (path === '/api/view/sessions') return json({ sessions: empty ? [] : rows.filter(row => (!url.searchParams.has('hat') || row.hat_id === url.searchParams.get('hat')) && (!url.searchParams.has('lifecycle') || url.searchParams.get('lifecycle')!.split(',').includes(row.lifecycle))), epoch: 'fixture', revision: 1, waiting: empty ? 0 : 2 })
    if (path.startsWith('/api/stream/')) {
      if (path === '/api/stream/sessions') { activeLists++; maximumLists = Math.max(maximumLists, activeLists) }
      held.push(() => route.abort().catch(() => {})); return
    }
    if (path === '/api/sessions/permission') return json({ ...rows[0], pending: [{ pending_id: 'fixture-pending', kind: 'permission', state: 'open', answered: false, payload: { title: 'Payload is not rendered' } }] })
    if (path === '/api/sessions/closed-attention') return json({ ...rows[1], pending: [] })
    if (path.endsWith('/questions/fixture-pending')) return json({ id: 'question:fixture-pending', version: 2, ts, kind: 'question', pending_id: 'fixture-pending', question_kind: 'permission', request: { type: 'permission', title: 'Read project files', options: [{ option_id: 'allow', name: 'Allow', option_kind: 'allow_once' }] }, answerable: true, answered: false, state: 'open' })
    if (path === '/api/delegation/attention') return json([{ id: 'attention', child_id: 'closed-attention', hat_id: 'fixture-hat', pending_id: null, reason: 'child_failed' }])
    if (path === '/api/mcp/connections') return json([])
    if (path === '/api/hosts/fixture-host/agents' || path.endsWith('/recent-projects')) return json([])
    return json({ code: 'not_found', message: 'Unavailable in synthetic shell fixture' }, 404)
  })
  context.on('requestfailed', request => { if (new URL(request.url()).pathname === '/api/stream/sessions') activeLists = Math.max(0, activeLists - 1) })
  const capture = async (name: string) => {
    await visual.evaluate(async () => {
      for (const family of ['Inter', 'Roboto']) for (const weight of [400, 500, 600, 700]) await document.fonts.load(`${weight} 16px "${family}"`, 'Zażółć gęślą jaźń')
      await document.fonts.ready
    })
    expect(await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (captures) { await mkdir(captures, { recursive: true }); await visual.screenshot({ path: resolve(captures, `${name}-${width}-${theme}.png`), fullPage: true }) }
  }
  try {
    await visual.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'))
    await visual.goto(collector.origin + '/sessions')
    await expect(visual.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
    await expect(visual).toHaveURL(collector.origin + '/sessions')
    await expect(visual.getByRole('link', { name: /Review project access/ })).toBeVisible()
    await capture('overview-hat')
    const links = visual.locator('[data-session-link]')
    await links.nth(0).focus(); await links.nth(0).press('j'); await expect(links.nth(1)).toBeFocused()
    await links.nth(1).press('k'); await expect(links.nth(0)).toBeFocused()
    await visual.getByRole('radio', { name: 'By host', exact: true }).check()
    await capture('overview-host')
    if (width === 1280) {
      const collapse = visual.getByRole('button', { name: 'Collapse navigation', exact: true })
      await collapse.click()
      expect(await visual.locator('.rail').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(56)
      await capture('overview-collapsed')
      await visual.getByRole('button', { name: 'Expand navigation', exact: true }).click()
    } else {
      const nav = visual.getByRole('navigation', { name: 'Primary navigation', exact: true })
      await expect(nav.getByRole('link')).toHaveCount(5)
      for (const link of await nav.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await visual.getByRole('button', { name: 'Filters', exact: true }).click()
      const dialog = visual.getByRole('dialog', { name: 'Session filters', exact: true })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('searchbox')).toBeFocused()
      await capture('overview-filters')
      await visual.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(visual.getByRole('button', { name: 'Filters', exact: true })).toBeFocused()
    }
    await visual.goto(collector.origin + '/needs-you')
    await expect(visual.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible()
    await expect(visual.getByText('Read project files', { exact: true })).toBeVisible()
    await expect(visual.getByText('child_failed', { exact: true })).toBeVisible()
    await expect(visual.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(0)
    await capture('needs-you-populated')
    await visual.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(visual.getByRole('searchbox', { name: 'Search sessions', exact: true })).toBeFocused()
    if (width === 390) await visual.keyboard.press('Escape')
    empty = true
    await visual.goto(collector.origin + '/needs-you')
    await expect(visual.getByText('Nothing needs you', { exact: true })).toBeVisible()
    await capture('needs-you-empty')
    await visual.goto(collector.origin + '/more')
    await expect(visual.locator('.mtopbar')).toHaveCount(0)
    const more = visual.getByRole('navigation', { name: 'More navigation', exact: true })
    await expect(more.getByRole('link')).toHaveCount(4)
    await capture('more')
    await more.getByRole('link', { name: 'Defaults', exact: true }).click()
    await expect(visual.getByRole('heading', { name: 'Defaults', exact: true })).toBeVisible()
    await capture('defaults-placeholder')
    await visual.goto(collector.origin + '/new')
    const launcher = visual.getByRole('dialog', { name: 'New session', exact: true })
    await expect(launcher).toBeVisible()
    await capture('new-session-frame')
    await visual.keyboard.press('Escape')
    await expect(visual).toHaveURL(collector.origin + '/sessions')
    await visual.goto(collector.origin + '/missing')
    await expect(visual.getByRole('heading', { name: 'Not found', exact: true })).toBeVisible()
    await capture('not-found')
    gateway = true
    await visual.goto(collector.origin + '/needs-you')
    await expect(visual.getByText('This view is not part of this deployment.', { exact: true })).toBeVisible()
    await capture('gateway-unavailable')
    await visual.goto(collector.origin + '/more')
    await expect(visual.getByRole('navigation', { name: 'More navigation', exact: true }).getByRole('link')).toHaveCount(2)
    if (width === 1280) await expect(visual.getByRole('button', { name: 'Jump to', exact: true })).toBeDisabled()
    await capture('gateway-more')
  } finally { for (const release of held) await release(); await context.close() }
})
