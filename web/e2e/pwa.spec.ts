import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { startCollector, type Collector } from './collector'
import { mockPush, workerHarness } from './push-fixture'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PASSWORD = 'correct horse battery staple'
let collector: Collector
test.beforeAll(async ({ browser }) => {
  collector = await startCollector()
  const context = await browser.newContext()
  const token = new URL(collector.setupLink).hash.slice(1)
  const response = await context.request.post(`${collector.origin}/api/setup`, { headers: { Origin: collector.origin }, data: { token, password: PASSWORD, public_url: collector.origin, default_hat_name: 'Personal' } })
  expect(response.ok()).toBe(true)
  await context.close()
})
test.afterAll(async () => { await collector?.stop() })
async function login(context: BrowserContext) {
  expect((await context.request.post(`${collector.origin}/api/auth/login`, { headers: { Origin: collector.origin }, data: { password: PASSWORD } })).status()).toBe(204)
}
async function controlled(page: Page) {
  await page.goto(`${collector.origin}/settings`)
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
}

for (const width of [1280, 390]) test(`embedded PWA and gesture-safe device lifecycle at ${width}px`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'allow' })
  try {
    await login(context); await mockPush(context)
    const page = await context.newPage()
    await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (event) => { ((window as unknown as { csp?: string[] }).csp ??= []).push(event.violatedDirective) }) })
    await controlled(page)
    for (const [path, mime] of [['/sw.js', 'text/javascript'], ['/manifest.webmanifest', 'application/manifest+json']]) {
      const response = await context.request.get(collector.origin + path)
      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toContain(mime)
      expect(response.headers()['cache-control']).toBe('no-cache')
      expect(response.headers().etag).toBeTruthy()
      if (path === '/sw.js') expect(response.headers()['content-security-policy']).toBe("default-src 'none'; script-src 'self'; connect-src 'self'")
    }
    const manifest = await (await context.request.get(`${collector.origin}/manifest.webmanifest`)).json()
    expect(manifest).toMatchObject({ id: '/', scope: '/', start_url: '/sessions', display: 'standalone' })
    expect(manifest.icons).toHaveLength(3)
    for (const path of ['/icon-192.png', '/icon-512.png', '/icon-maskable.png', '/icon-180.png']) expect((await context.request.get(collector.origin + path)).headers()['content-type']).toBe('image/png')
    const permissionCalls = () => page.evaluate(() => Number(localStorage.getItem('mock-permission-calls') ?? '0'))
    expect(await permissionCalls()).toBe(0)
    await page.getByLabel('Device label (optional)', { exact: true }).fill(`Phone ${width}`)
    await page.getByRole('button', { name: 'Prepare notifications', exact: true }).click()
    await page.getByRole('button', { name: 'Use password instead', exact: true }).click()
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    expect(await permissionCalls()).toBe(0)
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).click()
    await expect(page.getByText('Notifications are enabled on this browser.', { exact: true })).toBeVisible()
    expect(await permissionCalls()).toBe(1)
    expect(await page.getByRole('button', { name: 'Disable notifications', exact: true }).evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
    const keys = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname)))).flat().sort())
    expect(keys).toContain('/index.html'); expect(keys).toContain('/theme.js'); expect(keys).toContain('/manifest.webmanifest')
    expect(keys.some((k) => k.includes('Settings-') && k.endsWith('.js'))).toBe(true)
    expect(keys.some((k) => k.startsWith('/api/') || k.startsWith('/mcp/') || k.includes('attachment') || k.includes('logo'))).toBe(false)
    await page.getByRole('button', { name: 'Disable notifications', exact: true }).click()
    await expect(page.getByText('Notifications disabled.', { exact: true })).toBeVisible()
    expect((await context.request.get(`${collector.origin}/api/push/subscriptions`)).ok()).toBe(true)
    await context.setOffline(true); await page.reload()
    await expect(page.getByText('Offline — reconnect to load sessions and answer', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => caches.keys())).toHaveLength(1)
    await context.setOffline(false)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL(`${collector.origin}/login`)
    expect(await page.evaluate(() => (window as unknown as { csp?: string[] }).csp ?? [])).toEqual([])
  } finally { await context.close() }
})

test('actual emitted worker handlers show a bounded notification offline, and rotate only an enabled generation', async () => {
  const harness = workerHarness(readFileSync(resolve('dist/sw.js'), 'utf8'))
  await harness.push(JSON.stringify({ title: 'Needs your answer', body: 'Example question', tag: 's-1', url: '/sessions/s-1' }))
  expect(harness.notifications).toEqual([{ title: 'Needs your answer', options: { body: 'Example question', tag: 's-1', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/sessions/s-1', tag: 's-1' } } }])
  await harness.push('{broken')
  expect(harness.notifications[1].title).toBe('hennery needs your attention')
  expect(harness.fetches).toEqual([])
})
