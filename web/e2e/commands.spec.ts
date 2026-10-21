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
    await expect(input).toHaveCSS('font-family', /Inter/)
    await expect(page.locator('body')).toHaveCSS('font-family', /Roboto/)
    await expect(palette.getByRole('group', { name: 'Actions', exact: true })).toHaveCSS('font-family', /Roboto/)
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
    await expect(launcher.getByRole('combobox', { name: 'Project', exact: true })).toHaveCSS('font-family', /Inter/)
    await expect(launcher.getByRole('textbox', { name: 'Agent name', exact: true })).toHaveCSS('font-family', /Inter/)
    const prompt = launcher.getByRole('textbox', { name: /^First prompt/ }); await prompt.fill('n?[]/rk19')
    await expect(prompt).toHaveCSS('font-family', /Inter/)
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
