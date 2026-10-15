import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { startCollector, type Collector } from './collector'
import { mockPush, workerHarness } from './push-fixture'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deployProxy } from './pwa-proxy'
import { fakeAgent, testHost, type TestHost } from './host'

const PASSWORD = 'correct horse battery staple'
let collector: Collector
let host: TestHost
test.beforeAll(async ({ browser }) => {
  collector = await startCollector()
  const context = await browser.newContext()
  const token = new URL(collector.setupLink).hash.slice(1)
  const response = await context.request.post(`${collector.origin}/api/setup`, { headers: { Origin: collector.origin }, data: { token, password: PASSWORD, public_url: collector.origin, default_hat_name: 'Personal' } })
  expect(response.ok()).toBe(true)
  host = testHost(fakeAgent('claude', { asks: [], chunks: ['PWA acceptance agent'], chunk_delay_ms: 0 }))
  const pairing = await context.request.post(`${collector.origin}/api/hosts/pairing-codes`, { headers: { Origin: collector.origin } })
  expect(pairing.ok()).toBe(true)
  expect(await host.join(`hennery host join ${collector.origin} ${(await pairing.json()).code}`, ['--name', 'pwa fake host', '--no-runtime'])).toBe(0)
  host.run()
  await context.close()
})
test.afterAll(async () => { try { await host?.stop() } finally { await collector?.stop() } })
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
      if (path === '/sw.js') expect(response.headers()['content-security-policy']).toBe("default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'")
    }
    const manifest = await (await context.request.get(`${collector.origin}/manifest.webmanifest`)).json()
    expect(manifest).toMatchObject({ id: '/', scope: '/', start_url: '/sessions', display: 'standalone' })
    expect(manifest.icons).toHaveLength(3)
    for (const path of ['/icon-192.png', '/icon-512.png', '/icon-maskable.png', '/icon-180.png']) expect((await context.request.get(collector.origin + path)).headers()['content-type']).toBe('image/png')
    const permissionCalls = () => page.evaluate(() => Number(localStorage.getItem('mock-permission-calls') ?? '0'))
    expect(await permissionCalls()).toBe(0)
    await page.getByLabel('Device label (optional)', { exact: true }).fill(`Phone ${width}`)
    await page.getByRole('button', { name: 'Prepare notifications', exact: true }).click()
    await page.getByLabel('Your password', { exact: true }).fill(PASSWORD)
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
  expect(harness.handles(new Request('https://app.example/index.html', { method: 'POST' }))).toBe(false)
  expect(harness.handles(new Request('https://elsewhere.example/index.html'))).toBe(false)
  expect(harness.handles(new Request('https://app.example/index.html?secret=1'))).toBe(false)
  for (const [path, method] of [['/api/sessions', 'GET'], ['/api/auth/login', 'POST'], ['/mcp/mount', 'GET'], ['/login', 'GET'], ['/setup', 'GET'], ['/api/attachments/a', 'GET'], ['/api/hats/h/logo', 'GET']]) {
    expect(harness.handles(new Request(`https://app.example${path}`, { method }))).toBe(false)
  }
  const replacement = { endpoint: 'https://push.example.com/b', toJSON: () => ({ endpoint: 'https://push.example.com/b', keys: { p256dh: 'key', auth: 'auth' } }) } as unknown as PushSubscription
  await harness.change(null, replacement)
  expect(harness.fetches).toEqual([])
  const persisted = { row: { generation: 1, enabled: true, id: 'id', endpoint: 'https://push.example.com/a', key: 'key' } }
  const restarted = workerHarness(readFileSync(resolve('dist/sw.js'), 'utf8'), persisted)
  await restarted.change(null, replacement)
  expect(restarted.fetches).toEqual(['/api/push/subscriptions/rotate'])
  expect(JSON.parse(restarted.attempts[0].body as string)).toEqual({ old_endpoint: 'https://push.example.com/a', subscription: { endpoint: 'https://push.example.com/b', keys: { p256dh: 'key', auth: 'auth' } } })
  expect(persisted.row.endpoint).toBe('https://push.example.com/b')
  persisted.row.enabled = false
  await workerHarness(readFileSync(resolve('dist/sw.js'), 'utf8'), persisted).change(null, replacement)
  expect(persisted.row.enabled).toBe(false)
})

test('mixed digest install fails, preserving the old offline shell; a complete new build waits with two dirty windows', async ({ browser }) => {
  const a = await startCollector(resolve('../target/hennery-pwa-base'))
  const b = await startCollector(resolve('../target/hennery-pwa-update'))
  const proxy = await deployProxy(a, b)
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  try {
    expect((await context.request.post(`${proxy.origin}/api/setup`, { headers: { Origin: proxy.origin }, data: { token: new URL(a.setupLink).hash.slice(1), password: PASSWORD, public_url: proxy.origin, default_hat_name: 'Personal' } })).ok()).toBe(true)
    const page = await context.newPage()
    await page.goto(`${proxy.origin}/settings`)
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.reload()
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    const oldCaches = await page.evaluate(() => caches.keys())
    expect(oldCaches).toHaveLength(1)
    const other = await context.newPage(); await other.goto(`${proxy.origin}/settings`)
    expect(await other.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    await page.getByLabel('Push contact', { exact: true }).fill('mailto:unsent@example.invalid')
    await other.getByLabel('Push contact', { exact: true }).fill('mailto:other-unsent@example.invalid')
    proxy.use('mixed')
    // Actual expected-MIME 200s from A under B's expected digests.
    const failed = await page.evaluate(async () => {
      const registration = (await navigator.serviceWorker.getRegistration('/'))!
      return new Promise<string>((resolve) => {
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing!
          installing.addEventListener('statechange', () => { if (installing.state === 'redundant') resolve('rejected') })
        }, { once: true })
        void registration.update()
      })
    })
    expect(failed).toBe('rejected')
    expect(proxy.reads.some((r) => r.path === '/sw.js' && r.build === 'b')).toBe(true)
    expect(proxy.reads.some((r) => r.path === '/index.html' && r.build === 'a')).toBe(true)
    expect(await page.evaluate(() => caches.keys())).toEqual(oldCaches)
    await context.setOffline(true); await page.reload()
    await expect(page.getByText('Offline — reconnect to load sessions and answer', { exact: true })).toBeVisible()
    await context.setOffline(false)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByLabel('Push contact', { exact: true }).fill('mailto:unsent@example.invalid')
    proxy.use('b')
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    expect(await other.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration('/'))!.update() })
    await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/'))?.waiting)).toBe(true)
    await expect(page.getByText('Update available. Close all hennery windows and reopen to update.', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Push contact', { exact: true })).toHaveValue('mailto:unsent@example.invalid')
    await expect(other.getByLabel('Push contact', { exact: true })).toHaveValue('mailto:other-unsent@example.invalid')
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))!.active!.state)).toBe('activated')
    expect(await page.evaluate(() => caches.keys())).toHaveLength(2)
    await page.close(); await other.close()
    const next = await context.newPage(); await next.goto(`${proxy.origin}/settings`)
    await expect.poll(() => next.evaluate(async () => (await caches.keys()).length)).toBe(1)
    expect(await next.evaluate(async () => (await fetch('/index.html')).text())).toContain('pwa test build B')
  } finally { await context.close(); await proxy.stop(); await a.stop(); await b.stop() }
})

test('permission denial stays off without another permission loop', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  try {
    await login(context); await mockPush(context)
    const page = await context.newPage(); await controlled(page)
    await page.evaluate(() => localStorage.setItem('mock-denied', '1'))
    await page.getByRole('button', { name: 'Prepare notifications', exact: true }).click()
    await page.getByLabel('Your password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).click()
    await expect(page.getByText('Notifications are blocked by browser or OS settings. Change those settings to enable them.', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('mock-permission-calls'))).toBe('1')
    expect(await page.getByRole('button', { name: 'Prepare notifications', exact: true }).count()).toBe(0)
  } finally { await context.close() }
})
