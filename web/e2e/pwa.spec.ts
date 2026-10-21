import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { startCollector, type Collector } from './collector'
import { browserWindows, mockPush, workerHarness } from './push-fixture'
import type { HostItem, SessionDetail, StartSessionResponse } from '../src/generated/protocol'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deployProxy } from './pwa-proxy'
import { producerNotice } from './producer'
import { fakeAgent, testHost, type TestHost } from './host'
import { RELOAD_GRACE_MS } from '../src/pwa/update-client'

const PASSWORD = 'correct horse battery staple'
let collector: Collector
let host: TestHost
test.beforeAll(async ({ browser }) => {
  collector = await startCollector()
  const context = await browser.newContext()
  const token = new URL(collector.setupLink).hash.slice(1)
  const response = await context.request.post(`${collector.origin}/api/setup`, { headers: { Origin: collector.origin }, data: { token, password: PASSWORD, public_url: collector.origin, default_hat_name: 'Personal' } })
  expect(response.ok()).toBe(true)
  host = testHost(fakeAgent('claude', { asks: ['permission'], chunks: ['PWA acceptance agent'], chunk_delay_ms: 0 }))
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

test('immediate replacement reloads new and legacy windows once, preserves drafts and excludes proxy documents', async ({ browser }) => {
  const a = await startCollector(resolve('../target/hennery-pwa-base'))
  const b = await startCollector(resolve('../target/hennery-pwa-update'))
  const proxy = await deployProxy(a, b)
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  const updateHost = testHost(fakeAgent('claude', { chunks: ['PWA update draft'], chunk_delay_ms: 0 }))
  try {
    await context.addInitScript(() => sessionStorage.setItem('update-loads', String(Number(sessionStorage.getItem('update-loads') ?? '0') + 1)))
    const headers = { Origin: proxy.origin }
    expect((await context.request.post(proxy.origin + '/api/setup', { headers, data: { token: new URL(a.setupLink).hash.slice(1), password: PASSWORD, public_url: proxy.origin, default_hat_name: 'Personal' } })).ok()).toBe(true)
    const pairing = await context.request.post(proxy.origin + '/api/hosts/pairing-codes', { headers })
    expect(await updateHost.join(`hennery host join ${a.origin} ${(await pairing.json()).code}`, ['--name', 'pwa update host', '--no-runtime'])).toBe(0)
    updateHost.run()
    const hosts = async () => (await (await context.request.get(proxy.origin + '/api/hosts')).json()) as HostItem[]
    await expect.poll(async () => (await hosts()).some(h => h.connected)).toBe(true)
    const started = await context.request.post(proxy.origin + '/api/sessions', { headers, data: { host_id: (await hosts()).find(h => h.connected)!.host_id, agent: 'claude', cwd: updateHost.dir } })
    expect(started.ok()).toBe(true)
    const { session_id: id } = await started.json() as StartSessionResponse
    const page = await context.newPage()
    await page.goto(proxy.origin + '/sessions/' + id)
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    // Claim on the first install must leave this original document in place.
    await page.waitForTimeout(RELOAD_GRACE_MS + 500)
    expect(await page.evaluate(() => sessionStorage.getItem('update-loads'))).toBe('1')
    const draft = page.getByLabel('Prompt', { exact: true })
    await draft.fill('Keep this composer draft')
    const other = await context.newPage(); await other.goto(proxy.origin + '/settings')
    await expect(other.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await other.getByLabel('Push contact', { exact: true }).fill('unsaved@example.invalid')
    // A v0.2.1-like document: its old bundle never installed either recovery
    // listener. Only the replacement worker can bootstrap this window.
    const legacy = await context.newPage()
    await legacy.addInitScript(() => {
      if (sessionStorage.getItem('legacy-bootstrapped')) return
      sessionStorage.setItem('legacy-bootstrapped', '1')
      const blocked = () => sessionStorage.setItem('legacy-blocked-listeners', String(Number(sessionStorage.getItem('legacy-blocked-listeners') ?? '0') + 1))
      const serviceAdd = navigator.serviceWorker.addEventListener.bind(navigator.serviceWorker)
      navigator.serviceWorker.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        if (type === 'controllerchange') { blocked(); return }
        serviceAdd(type, listener, options)
      }) as typeof navigator.serviceWorker.addEventListener
      const windowAdd = window.addEventListener.bind(window)
      window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        if (type === 'vite:preloadError') { blocked(); return }
        windowAdd(type, listener, options)
      }) as typeof window.addEventListener
    })
    await legacy.goto(proxy.origin + '/settings/')
    await expect(legacy.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    expect(await legacy.evaluate(() => sessionStorage.getItem('legacy-blocked-listeners'))).toBe('2')
    const excluded = []
    for (const path of ['/api/attachments/missing', '/mcp/mount/missing']) {
      const document = await context.newPage(); await document.goto(proxy.origin + path)
      await document.evaluate(() => { (window as unknown as { sentinel: string }).sentinel = 'same-document' })
      excluded.push({ document, url: document.url(), loads: await document.evaluate(() => sessionStorage.getItem('update-loads')) })
    }
    const windows = [page, other, legacy]
    const oldBuild = await page.locator('meta[name="hennery-build"]').getAttribute('content')
    const counts = await Promise.all(windows.map(p => p.evaluate(() => Number(sessionStorage.getItem('update-loads')))))
    proxy.use('b')
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration('/'))!.update() })
    for (const [index, p] of windows.entries()) {
      await expect(p.locator('meta[name="hennery-build"]')).not.toHaveAttribute('content', oldBuild!)
      expect(await p.evaluate(() => Number(sessionStorage.getItem('update-loads')))).toBe(counts[index] + 1)
      expect(await p.evaluate(async () => (await (await fetch('/index.html')).text()).includes('pwa test build B'))).toBe(true)
      expect(await p.getByRole('button', { name: 'Reload to update', exact: true }).count()).toBe(0)
    }
    await expect(draft).toHaveValue('Keep this composer draft')
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(name => name.startsWith('hennery-shell-')).length)).toBe(1)
    // Observe beyond the fallback deadline: worker navigation and the page's
    // controllerchange must still yield only one new document per window.
    await page.waitForTimeout(RELOAD_GRACE_MS + 500)
    for (const { document, url, loads } of excluded) {
      expect(document.url()).toBe(url)
      expect(await document.evaluate(() => sessionStorage.getItem('update-loads'))).toBe(loads)
      expect(await document.evaluate(() => (window as unknown as { sentinel: string }).sentinel)).toBe('same-document')
    }
    // Repeated update checks and replayed signals must not cause another load.
    await Promise.all(windows.map(p => p.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration('/'))!.update()
      navigator.serviceWorker.dispatchEvent(new Event('controllerchange'))
    })))
    for (const [index, p] of windows.entries()) expect(await p.evaluate(() => Number(sessionStorage.getItem('update-loads')))).toBe(counts[index] + 1)
  } finally { await context.close(); await updateHost.stop(); await proxy.stop(); await a.stop(); await b.stop() }
})

test('a real failed lazy import recovers once and cannot loop onto the same build', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  try {
    await login(context)
    await context.addInitScript(() => sessionStorage.setItem('chunk-loads', String(Number(sessionStorage.getItem('chunk-loads') ?? '0') + 1)))
    let failures = 0
    await context.route('**/assets/Settings-*.js', route => { failures++; return route.abort('failed') })
    const page = await context.newPage()
    await page.goto(collector.origin + '/sessions')
    await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible()
    // Direct navigation to the lazy Settings screen fails, then retries the
    // same route after a real document reload. Both requests are refused.
    await page.goto(collector.origin + '/settings')
    // Retrying the assertion also retries an evaluation interrupted by the
    // very navigation this test requires.
    await expect(async () => {
      expect(await page.evaluate(() => Number(sessionStorage.getItem('chunk-loads')))).toBe(3)
    }).toPass({ timeout: 10_000 })
    await expect.poll(() => failures).toBeGreaterThanOrEqual(2)
    expect(await page.evaluate(() => sessionStorage.getItem('hennery.update-reload'))).toBe(await page.locator('meta[name="hennery-build"]').getAttribute('content'))
    await page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true })))
    expect(await page.evaluate(() => Number(sessionStorage.getItem('chunk-loads')))).toBe(3)
  } finally { await context.close() }
})

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

test('mixed digest install fails, preserving the old offline shell; a complete new build replaces dirty windows', async ({ browser }) => {
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
    await expect(page.getByLabel('Push contact', { exact: true })).toHaveValue('')
    await expect(other.getByLabel('Push contact', { exact: true })).toHaveValue('')
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBe(1)
    expect(await page.evaluate(async () => (await fetch('/index.html')).text())).toContain('pwa test build B')
  } finally { await context.close(); await proxy.stop(); await a.stop(); await b.stop() }
})

for (const width of [1280, 390]) test(`notification click reaches the live card and preserves busy input at ${width}px`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'allow' })
  try {
    await login(context); await mockPush(context)
    const page = await context.newPage(); await controlled(page)
    const headers = { Origin: collector.origin }
    const hosts = async () => (await (await context.request.get(`${collector.origin}/api/hosts`)).json()) as HostItem[]
    await expect.poll(async () => (await hosts()).some(h => h.connected)).toBe(true)
    const hostId = (await hosts()).find(h => h.connected)!.host_id
    const started = await context.request.post(`${collector.origin}/api/sessions`, { headers, data: { host_id: hostId, agent: 'claude', cwd: host.dir } })
    expect(started.ok()).toBe(true)
    const { session_id: id } = await started.json() as StartSessionResponse
    expect((await context.request.post(`${collector.origin}/api/sessions/${id}/prompt`, { headers, data: { content: [{ type: 'text', text: 'Ask before writing.' }] } })).status()).toBe(202)
    const detail = async () => (await (await context.request.get(`${collector.origin}/api/sessions/${id}`)).json()) as SessionDetail
    await expect.poll(async () => (await detail()).pending.length).toBe(1)
    const pending = (await detail()).pending[0].pending_id
    const payload = await producerNotice(id, pending)
    const target = payload.url
    const filteredHat = await context.request.post(collector.origin + '/api/hats', { headers, data: { name: `Notification scope ${width}`, colour: '#336699' } })
    expect(filteredHat.ok()).toBe(true)
    const selectedHat = (await filteredHat.json() as { id: string }).id
    await page.evaluate(hat => localStorage.setItem('hennery.hat', hat), selectedHat)
    await page.goto(collector.origin + '/needs-you')
    await expect(page.getByText('Nothing needs you', { exact: true })).toBeVisible()
    let olderQuestionReads = 0
    await page.route(collector.origin + '/api/view/sessions/' + id, async route => {
      // Exercise a first-page window excluding this live card; its bounded
      // question route and all answers still use the actual collector.
      const response = await route.fetch()
      const body = await response.json() as { items: { kind: string; pending_id?: string }[]; older: boolean }
      body.items = body.items.filter(item => item.pending_id !== pending)
      body.older = true
      await route.fulfill({ response, json: body })
    })
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/questions/' + pending)) olderQuestionReads++ })
    const code = await (await context.request.get(`${collector.origin}/sw.js`)).text()
    const harness = workerHarness(code, undefined, { origin: collector.origin, clients: browserWindows(context, collector.origin) })
    await harness.push(JSON.stringify(payload))
    expect(harness.notifications).toHaveLength(1)
    const options = harness.notifications[0].options as { data: { url: string }; actions?: unknown[] }
    expect(options.data.url).toBe(target)
    expect(options.actions).toBeUndefined()
    await harness.click(options.data.url)
    await expect(page).toHaveURL(collector.origin + target)
    const card = page.getByRole('region', { name: 'Question from Claude', exact: true })
    await expect(card.getByText('Write notes.txt', { exact: true })).toBeVisible()
    await expect(card).toHaveAttribute('data-pending-id', pending)
    await expect(card).toBeFocused()
    expect(olderQuestionReads).toBeGreaterThan(0)
    expect(await page.evaluate(() => localStorage.getItem('hennery.hat'))).toBe(selectedHat)
    // The same worker-emitted destination survives a signed-out return.
    const signedOut = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'allow' })
    try {
      const authHarness = workerHarness(code, undefined, { origin: collector.origin, clients: browserWindows(signedOut, collector.origin) })
      await authHarness.push(JSON.stringify(payload))
      const emitted = authHarness.notifications[0].options as { data: { url: string } }
      await authHarness.click(emitted.data.url)
      const returned = signedOut.pages()[0]
      await expect(returned).toHaveURL(collector.origin + '/login?next=' + encodeURIComponent(target))
      await returned.getByLabel('Password', { exact: true }).fill(PASSWORD)
      await returned.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(returned).toHaveURL(collector.origin + target)
      await expect(returned.getByRole('region', { name: 'Question from Claude', exact: true })).toHaveAttribute('data-pending-id', pending)
    } finally { await signedOut.close() }
    if (width === 390) await card.getByRole('button', { name: 'Write a prompt', exact: true }).click()
    const draft = page.getByLabel('Prompt', { exact: true })
    await draft.fill('Keep this unsent text')
    await page.evaluate(() => { (window as unknown as { __documentSentinel: string }).__documentSentinel = 'same-document' })
    await harness.click(target)
    expect(await page.evaluate(() => (window as unknown as { __documentSentinel: string }).__documentSentinel)).toBe('same-document')
    await expect(draft).toHaveValue('Keep this unsent text')
    await harness.click('/sessions/another?pending=other')
    await expect.poll(() => context.pages().length).toBe(2)
    await expect(page).toHaveURL(collector.origin + target)
    await expect(draft).toHaveValue('Keep this unsent text')
    expect(context.pages()).toHaveLength(2)
    await context.pages().find(other => other !== page)!.close()
    await page.evaluate(() => Object.defineProperty(navigator, 'standalone', { configurable: true, value: true }))
    await harness.click('/sessions/third?pending=next')
    await expect(page.getByRole('link', { name: 'Open notification', exact: true })).toBeVisible()
    expect(await page.getByRole('link', { name: 'Open notification', exact: true }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
    expect(context.pages()).toHaveLength(1)
    await expect(draft).toHaveValue('Keep this unsent text')
    const openedHint = context.waitForEvent('page')
    await page.getByRole('link', { name: 'Open notification', exact: true }).click()
    const hinted = await openedHint
    await expect(hinted).toHaveURL(collector.origin + '/sessions/third?pending=next')
    await expect(page).toHaveURL(collector.origin + target)
    await expect(draft).toHaveValue('Keep this unsent text')
    await hinted.close()
    expect(await card.getByRole('button', { name: 'Allow', exact: true }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(width < 768 ? 44 : 28)
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 844 }, serviceWorkers: 'allow' })
    let releaseHeldPhone = () => {}
    try {
      await login(desktop)
      const desktopPage = await desktop.newPage(); await desktopPage.goto(collector.origin + target)
      const desktopCard = desktopPage.getByRole('region', { name: 'Question from Claude', exact: true })
      await expect(desktopCard.getByRole('button', { name: 'Allow', exact: true })).toBeVisible()
      let intercepted!: () => void, release!: () => void
      const held = new Promise<void>(resolve => { intercepted = resolve })
      const allowed = new Promise<void>(resolve => { release = resolve })
      releaseHeldPhone = release
      let phonePosts = 0
      const answerPath = `/api/sessions/${id}/pending/${encodeURIComponent(pending)}/answer`
      await page.route(`**${answerPath}`, async route => { phonePosts++; intercepted(); await allowed; await route.continue() })
      const lateResponse = page.waitForResponse(response => new URL(response.url()).pathname === answerPath)
      const clicking = card.getByRole('button', { name: 'Allow', exact: true }).click()
      await held
      await desktopCard.getByRole('button', { name: 'Allow', exact: true }).click()
      await expect(desktopCard.getByText('Answered', { exact: true })).toBeVisible()
      release(); await clicking
      expect((await lateResponse).status()).toBe(409)
      expect(phonePosts).toBe(1)
      await page.unroute(`**${answerPath}`)
    } finally { releaseHeldPhone(); await desktop.close() }
    await expect(card.getByText('Answered', { exact: true })).toBeVisible()
    await expect(draft).toHaveValue('Keep this unsent text')
    await page.screenshot({ path: `test-results/phone-p2-${width}.png`, fullPage: true })
  } finally { await context.close() }
})

test('gateway worker relay alone refreshes the shared reader with focus and timers suppressed', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  try {
    await login(context); await mockPush(context)
    await context.addInitScript(() => {
      const add = window.addEventListener.bind(window)
      window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => { if (type !== 'focus') add(type, listener, options) }) as typeof window.addEventListener
      const docAdd = document.addEventListener.bind(document)
      document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => { if (type !== 'visibilitychange') docAdd(type, listener, options) }) as typeof document.addEventListener
      const observed = { started: 0, settled: 0, succeeded: 0 }
      ;(window as unknown as { __mcpReads: typeof observed }).__mcpReads = observed
      const fetcher = window.fetch.bind(window)
      window.fetch = async (...args) => {
        const url = new URL(String(args[0]), location.href)
        const connectionRead = url.pathname === '/api/mcp/connections' && (args[1]?.method ?? 'GET') === 'GET'
        if (connectionRead) observed.started++
        try { const response = await fetcher(...args); if (connectionRead && response.ok) observed.succeeded++; return response }
        finally { if (connectionRead) observed.settled++ }
      }
    })
    const page = await context.newPage()
    await page.clock.install({ time: new Date('2026-10-15T12:00:00Z') })
    await page.clock.pauseAt(new Date('2026-10-15T12:00:00Z'))
    let reads = 0
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/mcp/connections' && request.method() === 'GET') reads++ })
    await controlled(page)
    await expect.poll(() => reads).toBeGreaterThan(0)
    await expect.poll(() => page.evaluate(() => { const r = (window as unknown as { __mcpReads: { started: number; settled: number; succeeded: number } }).__mcpReads; return r.succeeded > 0 && r.started === r.settled })).toBe(true)
    const baseline = reads
    const harness = workerHarness(await (await context.request.get(`${collector.origin}/sw.js`)).text(), undefined, { origin: collector.origin, clients: browserWindows(context, collector.origin) })
    await harness.push(JSON.stringify({ title: 'A fabricated recovered status', body: 'never trusted', tag: 'arbitrary', url: '/mcp' }))
    await expect.poll(() => reads).toBe(baseline + 1)
    expect(await page.getByText('A fabricated recovered status', { exact: true }).count()).toBe(0)
    expect(harness.notifications).toHaveLength(1)
  } finally { await context.close() }
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
