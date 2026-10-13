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
