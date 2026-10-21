// UI R1: real embedded assets/CSP with deterministic API data for visual QA.
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { startCollector, type Collector } from './collector'
import { deriveAccent, contrast } from '../src/lib/accent'
import type { SessionSummary, Item } from '../src/generated/view'

let collector: Collector
const captures = process.env.HENNERY_UI_CAPTURES ? resolve(process.env.HENNERY_UI_CAPTURES) : undefined
const ts = '2026-10-20T10:00:00Z'
const summary: SessionSummary = { session_id: 'visual-session', title: 'Review the parser', host_id: 'visual-host', agent: 'claude', cwd: '/srv/project', hat_id: 'visual-hat', lifecycle: 'active', activity: 'blocked', presumed_parked: false, created_at: ts, last_event_at: ts, question_waits: true, operator_attention: 1, parent_handled_questions: 0 }
const question: Item = { id: 'question:visual-permission', version: 1, ts, kind: 'question', pending_id: 'visual-permission', question_kind: 'permission', request: { type: 'permission', title: 'Read project files', tool_call_id: 'tool1', options: [{ option_id: 'allow', name: 'Allow once', option_kind: 'allow_once' }, { option_id: 'reject', name: 'Reject', option_kind: 'reject_once' }] }, answerable: true, state: 'open', answered: false }

async function fixture(context: BrowserContext) {
  const held: (() => Promise<void>)[] = []
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
    if (path.startsWith('/api/stream/')) { held.push(() => route.abort().catch(() => {})); return }
    if (path === '/api/capabilities') return json({ mode: 'full', features: ['sessions', 'hats', 'hosts', 'mcp_connections'] })
    if (path === '/api/hats') return json([{ id: 'visual-hat', name: 'Personal', colour: '#ffff00', created_at: ts, default_for_new_hosts: true }])
    if (path === '/api/hosts') return json([{ host_id: 'visual-host', name: 'Development host', platform: 'linux', host_version: '0.1.4', capabilities: [], default_hat_id: 'visual-hat', workspace_roots: ['/srv/project'], connected: false, created_at: ts, last_seen_at: ts }])
    if (path === '/api/view/sessions') return json({ sessions: [summary], epoch: 'visual-list', revision: 1, waiting: 1 })
    if (path === '/api/sessions/visual-session') return json({ ...summary, pending: [] })
    if (path === '/api/view/sessions/visual-session') return json({ items: [question], older: false, epoch: 'visual-items', revision: 1 })
    if (path === '/api/sessions/visual-session/catalog') return json({ session_id: summary.session_id, config_options: [], commands: [] })
    if (path === '/api/mcp/connections' || path === '/api/auth/sessions' || path.endsWith('/path-rules')) return json([])
    if (path === '/api/hosts/visual-host/agents') return json([])
    if (path === '/api/hosts/visual-host/recent-projects') return json([])
    if (path === '/api/hosts/visual-host' && route.request().method() === 'DELETE') return json({ code: 'step_up_required', message: 'Confirm it is you' }, 403)
    if (path === '/api/settings') return json({ public_url: collector.origin })
    return json({ code: 'not_found', message: 'Unavailable in visual fixture' }, 404)
  })
  return async () => { for (const release of held) await release() }
}
async function readyFonts(page: Page) {
  await page.evaluate(async () => {
    for (const family of ['Inter', 'Roboto']) for (const weight of [400, 500, 600, 700]) await document.fonts.load(`${weight} 16px "${family}"`, 'Zażółć gęślą jaźń')
    await document.fonts.load('italic 400 16px "Inter"', 'Zażółć gęślą jaźń')
    await document.fonts.ready
  })
}
async function capture(page: Page, name: string, width: number, theme: string) {
  await readyFonts(page)
  if (captures) {
    mkdirSync(captures, { recursive: true })
    await page.screenshot({ path: resolve(captures, `${name}-${width}-${theme}.png`), fullPage: true })
  }
}
test.beforeAll(async () => { collector = await startCollector() })
test.afterAll(async () => { await collector?.stop() })
for (const width of [390, 1280]) for (const theme of ['light', 'dark'] as const) {
  test(`fonts, tokens, CSP and existing screens at ${width}px ${theme}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'))
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.addInitScript(({ theme, palette }) => {
      localStorage.setItem('hennery.theme', JSON.stringify({ version: 1, preference: theme, ...palette }))
      localStorage.setItem('hennery.hat', 'visual-hat')
      document.addEventListener('securitypolicyviolation', e => { (window as unknown as { violations: string[] }).violations ??= []; (window as unknown as { violations: string[] }).violations.push(`${e.violatedDirective}: ${e.blockedURI}`) })
    }, { theme, palette: deriveAccent('#ffff00') })
    try {
      await page.goto(collector.origin + '/login')
      await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await readyFonts(page)
      const faces = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => ({ family: f.family, style: f.style, weight: f.weight, display: f.display })))
      expect(faces.filter(f => f.family === 'Inter')).toHaveLength(4)
      expect(faces.filter(f => f.family === 'Roboto')).toHaveLength(2)
      expect(faces.every(f => f.weight === '400 700' && f.display === 'swap')).toBe(true)
      expect(faces.some(f => f.family === 'Inter' && f.style === 'italic')).toBe(true)
      const fontRequests = requests.filter(url => url.endsWith('.woff2'))
      for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) expect(fontRequests).toContain(`${collector.origin}/fonts/${face}-${subset}.woff2`)
      const statuses = await page.evaluate(() => {
        const rows: { fg: string; bg: string; surface: string }[] = []
        for (const role of ['wait', 'run', 'start', 'idle', 'park', 'fail', 'warn']) {
          const parent = document.createElement('div'); parent.style.background = 'var(--hn-surface)'
          const badge = document.createElement('span'); badge.className = 'ui-status ui-status-' + role; badge.textContent = role
          parent.append(badge); document.body.append(parent)
          rows.push({ fg: getComputedStyle(badge).color, bg: getComputedStyle(badge).backgroundColor, surface: getComputedStyle(parent).backgroundColor })
          parent.remove()
        }
        return rows
      })
      const metrics = await page.getByRole('button', { name: 'Sign in', exact: true }).evaluate(el => {
        const style = getComputedStyle(el), body = getComputedStyle(document.body)
        return { foreground: style.color, background: style.backgroundColor, displayFont: style.fontFamily, bodyFont: body.fontFamily, height: el.getBoundingClientRect().height }
      })
      const asHex = (s: string) => '#' + s.match(/\d+/g)!.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('')
      for (const status of statuses) {
        const fg = asHex(status.fg), values = status.bg.match(/[\d.]+/g)!.map(Number), surface = status.surface.match(/\d+/g)!.map(Number)
        const alpha = values[3] ?? 1
        const bg = '#' + values.slice(0, 3).map((n, i) => Math.round(n * alpha + surface[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
      }
      expect(contrast(asHex(metrics.foreground), asHex(metrics.background))).toBeGreaterThanOrEqual(4.5)
      expect(metrics.displayFont).toContain('Roboto'); expect(metrics.bodyFont).toContain('Inter')
      expect(metrics.height).toBeGreaterThanOrEqual(width === 390 ? 44 : 32)
      await page.getByRole('button', { name: 'Sign in', exact: true }).focus()
      expect(await page.getByRole('button', { name: 'Sign in', exact: true }).evaluate(el => getComputedStyle(el).outlineWidth)).toBe('2px')
      await capture(page, 'login', width, theme)
      await page.goto(collector.setupLink)
      await expect(page.getByRole('button', { name: 'Set up', exact: true })).toBeVisible()
      await capture(page, 'setup', width, theme)
      await page.goto(collector.origin + '/setup')
      await capture(page, 'setup-missing-link', width, theme)
      const release = await fixture(context)
      try {
        for (const [name, route] of [['sessions', '/sessions'], ['session-permission', '/sessions/visual-session'], ['new-session', '/new'], ['hosts', '/hosts'], ['hats', '/hats'], ['mcp', '/mcp'], ['settings', '/settings'], ['not-found', '/missing']] as const) {
          await page.goto(collector.origin + route)
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
          await expect(page.locator('main')).toBeVisible()
          if (name === 'session-permission') await expect(page.getByText('Read project files', { exact: true })).toBeVisible()
          await expect(page.getByText('Could not render this item', { exact: true })).toHaveCount(0)
          await capture(page, name, width, theme)
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        }
        await page.goto(collector.origin + '/hosts')
        await page.getByRole('button', { name: 'Revoke', exact: true }).click()
        await expect(page.getByRole('dialog', { name: 'Revoke this host?', exact: true })).toBeVisible()
        await capture(page, 'confirmation', width, theme)
        await page.getByRole('dialog').getByRole('button', { name: 'Revoke', exact: true }).click()
        await expect(page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true })).toBeVisible()
        await capture(page, 'step-up', width, theme)
        const password = page.getByLabel('Your password', { exact: true })
        await expect(password).toBeFocused()
        await password.press('Shift+Tab')
        await expect(page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true }).getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true })).toHaveCount(0)
        await expect(page.getByRole('dialog', { name: 'Revoke this host?', exact: true })).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('button', { name: 'Revoke', exact: true })).toBeFocused()
        await context.route('**/api/capabilities', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ mode: 'gateway', features: ['mcp_connections'] }) }))
        await page.goto(collector.origin + '/mcp')
        await capture(page, 'gateway-mcp', width, theme)
        await page.goto(collector.origin + '/sessions')
        await capture(page, 'unavailable', width, theme)
        // Render Polish glyphs from both real faces in the actual page, not a remote font service.
        await page.evaluate(() => {
          const panel = document.createElement('section'); panel.setAttribute('aria-label', 'Font sample')
          for (const family of ['Inter', 'Roboto']) { const p = document.createElement('p'); p.textContent = 'Zażółć gęślą jaźń'; p.style.fontFamily = family; panel.append(p) }
          document.querySelector('main')!.append(panel)
        })
        await capture(page, 'polish-fonts', width, theme)
      } finally { await release() }
      expect(requests.every(url => new URL(url).origin === collector.origin)).toBe(true)
      expect(await page.evaluate(() => (window as unknown as { violations?: string[] }).violations ?? [])).toEqual([])
      const worker = await (await context.request.get(collector.origin + '/sw.js')).text()
      for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) expect(worker).toContain(`/fonts/${face}-${subset}.woff2`)
    } finally { await context.close() }
  })
}

// Real cache/embedded-font boundary, also checked offline after installation.
test('self-hosted font assets survive an offline PWA reload', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  try {
    // Without a session, /sessions redirects to /login?next=... after load.
    // Login deliberately bypasses the offline shell; wait for the signed-in UI.
    const setup = await context.request.post(collector.origin + '/api/setup', {
      headers: { Origin: collector.origin },
      data: { token: new URL(collector.setupLink).hash.slice(1), password: 'correct horse battery staple', public_url: collector.origin, default_hat_name: 'Personal' },
    })
    expect(setup.ok()).toBe(true)
    const page = await context.newPage()
    await page.goto(collector.origin + '/sessions')
    await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    const controlled = await page.reload()
    expect(controlled?.fromServiceWorker()).toBe(true)
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat())
    for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) expect(cached).toContain('/fonts/' + face + '-' + subset + '.woff2')
    await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
    await expect(page).toHaveURL(collector.origin + '/sessions')
    // Exclude the HTTP cache as a source of fonts after this document unloads.
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.clearBrowserCache')
    await cdp.detach()
    const offlineFonts: { path: string; worker: boolean; status: number }[] = []
    page.on('response', response => {
      if (response.url().endsWith('.woff2')) offlineFonts.push({ path: new URL(response.url()).pathname, worker: response.fromServiceWorker(), status: response.status() })
    })
    await context.setOffline(true)
    const offline = await page.reload()
    expect(offline?.fromServiceWorker()).toBe(true)
    await expect(page).toHaveURL(collector.origin + '/sessions')
    await expect(page.getByText('Offline — reconnect to load sessions and answer', { exact: true })).toBeVisible()
    await page.evaluate(() => {
      for (const family of ['Inter', 'Roboto']) {
        const sample = document.createElement('p')
        sample.textContent = 'Zażółć gęślą jaźń'
        sample.style.fontFamily = family
        document.body.append(sample)
      }
    })
    await readyFonts(page)
    for (const face of ['Inter-normal', 'Inter-italic', 'Roboto-normal']) for (const subset of ['latin', 'latin-ext']) {
      expect(offlineFonts).toContainEqual({ path: '/fonts/' + face + '-' + subset + '.woff2', worker: true, status: 200 })
    }
    expect(await page.evaluate(() => [...document.fonts].filter(face => face.status === 'loaded' && ['Inter', 'Roboto'].includes(face.family)).length)).toBe(6)
    expect(await page.evaluate(() => document.fonts.check('400 16px Inter', 'Zażółć gęślą jaźń'))).toBe(true)
    expect(await page.evaluate(() => document.fonts.check('400 16px Roboto', 'Zażółć gęślą jaźń'))).toBe(true)
  } finally { await context.close() }
})
