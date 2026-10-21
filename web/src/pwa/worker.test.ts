import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { build } from 'vite'
import { workerHarness } from '../../e2e/push-fixture'
import { deferred, testLocks } from '../test-locks'
import { Journal, type PushRecord, type PushStore } from './journal'
import { BrowserPush } from './device'
import { Client } from '../api/client'

const dist = mkdtempSync(join(tmpdir(), 'hennery-worker-test-'))
beforeAll(async () => { await build({ build: { outDir: dist } }) })
afterAll(() => rmSync(dist, { recursive: true, force: true }))
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it('the emitted click handler closes the notice and focuses an exact target without reloading', async () => {
  const client = { id: 'app', url: 'https://app.example/sessions/s?pending=p', focus: vi.fn(async () => {}), navigate: vi.fn(), postMessage: vi.fn() }
  const close = vi.fn()
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), undefined, { clients: { matchAll: async () => [client], openWindow: vi.fn() } })
  await harness.click('/sessions/s?pending=p', close)
  expect(close).toHaveBeenCalledOnce()
  expect(client.focus).toHaveBeenCalledOnce()
  expect(client.navigate).not.toHaveBeenCalled()
})

it('gateway display relays only a validated target, and never copies a status claim', async () => {
  const app = { id: 'app', url: 'https://app.example/mcp', focus: vi.fn(), navigate: vi.fn(), postMessage: vi.fn() }
  const foreign = { ...app, id: 'foreign', url: 'https://foreign.example/mcp', postMessage: vi.fn() }
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), undefined, { clients: { matchAll: async () => [app, foreign], openWindow: vi.fn() } })
  await harness.push(JSON.stringify({ title: 'Recovery', body: 'not a health certificate', url: '/mcp', tag: 'anything' }))
  expect(app.postMessage).toHaveBeenCalledExactlyOnceWith({ version: 1, kind: 'mcp_invalidated' })
  expect(foreign.postMessage).not.toHaveBeenCalled()
  app.postMessage.mockClear()
  await harness.push(JSON.stringify({ title: 'MCP', body: 'recovered', url: '/sessions/s', tag: 'mcp-123' }))
  expect(app.postMessage).not.toHaveBeenCalled()
  expect(harness.notifications).toHaveLength(2)
})

function renewalSetup() {
  const persistence = { row: { generation: 1, enabled: true, id: 'id', endpoint: 'https://push.example/a', key: 'key' } as PushRecord }
  const store: PushStore = { async transact(fn) { return fn(persistence.row) } }
  const journal = new Journal(store), locks = testLocks()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: locks })
  let current: PushSubscription | null = null
  const key = btoa(String.fromCharCode(4, ...Array(64).fill(0)))
  const make = (endpoint: string) => ({ endpoint, options: { applicationServerKey: Uint8Array.from([4, ...Array(64).fill(0)]).buffer },
    toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: vi.fn(async () => { if (current?.endpoint === endpoint) current = null; return true }),
  }) as unknown as PushSubscription
  current = make(persistence.row.endpoint!)
  const old = current
  const pushManager = { getSubscription: vi.fn(async () => current), permissionState: vi.fn(async () => 'granted' as PermissionState),
    subscribe: vi.fn(async () => { current = make('https://push.example/b'); return current }),
  } as unknown as PushManager
  const client = new Client({ fetch: vi.fn(async () => new Response(JSON.stringify({ id: 'new-id' }), { headers: { 'Content-Type': 'application/json' } })), here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp: vi.fn() })
  const device = new BrowserPush(client, { pushManager, getNotifications: async () => [] } as unknown as ServiceWorkerRegistration, journal, key)
  return { persistence, journal, old, make, pushManager, device, locks, setSubscription: (next: PushSubscription) => { current = next } }
}

it.each(['disabled', 'unknown', 'stale-endpoint'])('worker does not inspect permission for an unowned event: %s', async (state) => {
  const { persistence, pushManager, old, locks } = renewalSetup()
  if (state === 'disabled') persistence.row.enabled = false
  if (state === 'unknown') delete persistence.row.id
  if (state === 'stale-endpoint') persistence.row.endpoint = 'https://push.example/newer'
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  await harness.change(old, null)
  expect(pushManager.permissionState).not.toHaveBeenCalled()
  expect(pushManager.subscribe).not.toHaveBeenCalled()
  expect(harness.fetches).toEqual([])
})

it('worker rotation holds external-effect ownership across an HTTP attempt longer than its lease', async () => {
  const { persistence, pushManager, device, locks, make, setSubscription, journal } = renewalSetup()
  vi.useFakeTimers()
  const posting = deferred(), posted = deferred<Response>()
  const next = make('https://push.example/b'); setSubscription(next)
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks,
    fetch: vi.fn(() => { posting.resolve(); return posted.promise }),
  })
  const change = harness.change(null, next)
  await posting.promise
  await vi.advanceTimersByTimeAsync(13000)
  let enabled = false
  const enabling = device.enable().then(() => { enabled = true })
  await vi.advanceTimersByTimeAsync(0)
  expect(enabled).toBe(false)
  posted.resolve(new Response(JSON.stringify({ id: 'id' })))
  await change; await enabling
  expect(await journal.read()).toMatchObject({ enabled: true, id: 'new-id', endpoint: next.endpoint })
})

it('worker renewal releases its operation lease even if replacement serialization throws', async () => {
  const { persistence, pushManager, locks, journal } = renewalSetup()
  const invalid = { endpoint: 'https://push.example/b', toJSON: () => ({ endpoint: 'https://push.example/b' }) } as unknown as PushSubscription
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  await expect(harness.change(null, invalid)).rejects.toThrow('encryption keys')
  expect((await journal.read()).lease).toBeUndefined()
})

it('worker renewal never subscribes after denied permission and records repair', async () => {
  const { persistence, pushManager, old, locks, journal } = renewalSetup()
  vi.mocked(pushManager.permissionState).mockResolvedValueOnce('denied')
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  await harness.change(old, null)
  expect(pushManager.subscribe).not.toHaveBeenCalled()
  expect(await journal.read()).toMatchObject({ enabled: false, repair: 'reenable' })
})

it('a worker browser failure records repair and releases ownership', async () => {
  const { persistence, pushManager, old, locks, journal } = renewalSetup()
  vi.mocked(pushManager.subscribe).mockRejectedValueOnce(new Error('Browser failure'))
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  await harness.change(old, null)
  expect(await journal.read()).toMatchObject({ enabled: false, repair: 'reenable' })
  expect((await journal.read()).lease).toBeUndefined()
})

it('a late worker browser failure cannot clear a newer operation token in the same generation', async () => {
  const { persistence, pushManager, old, locks, journal } = renewalSetup()
  vi.useFakeTimers()
  const subscribing = deferred(), rejected = deferred()
  vi.mocked(pushManager.subscribe).mockImplementationOnce(async () => { subscribing.resolve(); await rejected.promise; throw new Error('Browser failure') })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  const change = harness.change(old, null)
  await subscribing.promise; await vi.advanceTimersByTimeAsync(13000)
  const newer = await journal.beginRenew()
  rejected.resolve(); await change
  expect((await journal.read()).enabled).toBe(true)
  expect((await journal.read()).lease).toEqual(newer)
})

it('worker renewal rechecks the old endpoint after waiting on permission', async () => {
  const { persistence, pushManager, old, locks, journal } = renewalSetup()
  const checking = deferred(), permission = deferred<PermissionState>()
  vi.mocked(pushManager.permissionState).mockImplementationOnce(() => { checking.resolve(); return permission.promise })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  const change = harness.change(old, null)
  await checking.promise
  await journal.queueRotation({ endpoint: 'https://push.example/newer', keys: { p256dh: 'p', auth: 'a' } })
  await journal.attempt(async () => new Response(JSON.stringify({ id: 'id' })))
  permission.resolve('granted'); await change
  expect(pushManager.subscribe).not.toHaveBeenCalled()
  expect(harness.fetches).toEqual([])
  expect((await journal.read()).endpoint).toBe('https://push.example/newer')
})

it('a worker paused on permission cannot subscribe after completed disable', async () => {
  const { persistence, pushManager, old, device, locks } = renewalSetup()
  const checking = deferred(), permission = deferred<PermissionState>()
  vi.mocked(pushManager.permissionState).mockImplementationOnce(() => { checking.resolve(); return permission.promise })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  const change = harness.change(old, null)
  await checking.promise
  expect((await device.disable(true)).browser).toBe(true)
  permission.resolve('granted')
  await change
  expect(pushManager.subscribe).not.toHaveBeenCalled()
  expect(harness.fetches).toEqual([])
  expect(await pushManager.getSubscription()).toBeNull()
})

it('a worker permission result cannot replace a newer explicit enable on the same endpoint', async () => {
  const { persistence, pushManager, old, device, locks, make, setSubscription } = renewalSetup()
  const checking = deferred(), permission = deferred<PermissionState>()
  vi.mocked(pushManager.permissionState).mockImplementationOnce(() => { checking.resolve(); return permission.promise })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  const change = harness.change(old, null)
  await checking.promise; await device.disable(true)
  vi.mocked(pushManager.subscribe).mockImplementationOnce(async () => { const next = make(old.endpoint); setSubscription(next); return next })
  await device.enable()
  permission.resolve('granted'); await change
  expect(pushManager.subscribe).toHaveBeenCalledTimes(1)
  expect(harness.fetches).toEqual([])
  expect(persistence.row).toMatchObject({ enabled: true, id: 'new-id', endpoint: old.endpoint })
})

it('disable between worker lease reservation and subscribe prevents creation', async () => {
  const { persistence, pushManager, old, locks, journal } = renewalSetup()
  let disabled: ReturnType<Journal['disable']> | undefined
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks, onWrite: (row) => {
    if (!disabled && row.lease && row.generation === 1) disabled = journal.disable()
  } })
  await harness.change(old, null); await disabled
  expect(pushManager.subscribe).not.toHaveBeenCalled()
  expect(harness.fetches).toEqual([])
})

it('a stale worker browser result preserves a newer confirmed registration on the same endpoint', async () => {
  const { persistence, pushManager, old, locks, journal, make, setSubscription } = renewalSetup()
  const subscribing = deferred(), replacement = deferred<PushSubscription>()
  vi.mocked(pushManager.subscribe).mockImplementationOnce(async () => { subscribing.resolve(); const next = await replacement.promise; setSubscription(next); return next })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  const change = harness.change(old, null)
  await subscribing.promise
  const previous = await journal.disable()
  await journal.finishDisable(true, true, previous.generation + 1)
  const owner = await journal.beginEnable()
  const next = make('https://push.example/b')
  await journal.finishEnable(owner, 'new-id', next.endpoint, 'new-key')
  replacement.resolve(next); await change
  expect(next.unsubscribe).not.toHaveBeenCalled()
  expect(harness.fetches).toEqual([])
  expect(persistence.row).toMatchObject({ enabled: true, id: 'new-id', endpoint: next.endpoint })
})

it('worker stale-result cleanup is independent of a completed logout cleanup', async () => {
  const { persistence, pushManager, old, locks, journal, make, setSubscription } = renewalSetup()
  const subscribing = deferred(), replacement = deferred<PushSubscription>()
  vi.mocked(pushManager.subscribe).mockImplementationOnce(async () => { subscribing.resolve(); const next = await replacement.promise; setSubscription(next); return next })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  const change = harness.change(old, null)
  await subscribing.promise
  const disabled = await journal.disable()
  await journal.finishDisable(true, true, disabled.generation + 1, disabled.cleanup)
  const next = make('https://push.example/b')
  replacement.resolve(next); await change
  expect(next.unsubscribe).toHaveBeenCalledTimes(1)
  expect(await pushManager.getSubscription()).toBeNull()
  expect(harness.fetches).toEqual([])
  expect((await journal.read()).enabled).toBe(false)
})

it('a worker unsubscribes its in-flight replacement when disable invalidates its ownership', async () => {
  const { persistence, pushManager, old, device, locks, make, setSubscription, journal } = renewalSetup()
  vi.useFakeTimers()
  const subscribing = deferred(), replacement = deferred<PushSubscription>()
  vi.mocked(pushManager.subscribe).mockImplementationOnce(async () => { subscribing.resolve(); const next = await replacement.promise; setSubscription(next); return next })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), persistence, { pushManager, locks })
  const change = harness.change(old, null)
  await subscribing.promise
  const disabling = device.disable(true)
  await vi.advanceTimersByTimeAsync(0)
  expect((await journal.read()).enabled).toBe(false)
  const next = make('https://push.example/b')
  replacement.resolve(next)
  await change
  await vi.advanceTimersByTimeAsync(12001)
  expect((await disabling).browser).toBe(true)
  expect(next.unsubscribe).toHaveBeenCalledTimes(1)
  expect(harness.fetches).toEqual([])
  expect(await pushManager.getSubscription()).toBeNull()
})

it('the shipped handler displays every push, extends its lifetime and bypasses non-static requests', async () => {
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'))
  await harness.push(JSON.stringify({ title: 'Needs your answer', body: 'Example question', tag: 's-1', url: '/sessions/s-1' }))
  expect(harness.notifications[0]).toEqual({ title: 'Needs your answer', options: { body: 'Example question', tag: 's-1', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/sessions/s-1', tag: 's-1' } } })
  await harness.push('{broken'); expect(harness.notifications[1].title).toBe('hennery needs your attention')
  for (const [url, method] of [['https://app.example/api/sessions', 'GET'], ['https://app.example/index.html', 'POST'], ['https://elsewhere.example/index.html', 'GET']]) expect(harness.handles(new Request(url, { method }))).toBe(false)
})
it('the shipped handler fences identity/generation, persists a supplied replacement and stops without old options', async () => {
  const code = readFileSync(join(dist, 'sw.js'), 'utf8')
  const replacement = { endpoint: 'https://push.example.com/b', toJSON: () => ({ endpoint: 'https://push.example.com/b', keys: { p256dh: 'key', auth: 'auth' } }) } as unknown as PushSubscription
  const persisted = { row: { generation: 1, enabled: true, id: 'id', endpoint: 'https://push.example.com/a', key: 'key' } }
  const first = workerHarness(code, persisted)
  await first.change(null, replacement)
  expect(first.fetches).toEqual(['/api/push/subscriptions/rotate'])
  expect(persisted.row.endpoint).toBe(replacement.endpoint)
  persisted.row.enabled = false
  const second = workerHarness(code, persisted)
  await second.change(null, replacement)
  expect(second.fetches).toEqual([])
  const missing = workerHarness(code)
  await missing.change(null, replacement); expect(missing.fetches).toEqual([])
  persisted.row.enabled = true
  await workerHarness(code, persisted).change(null, null)
  expect(persisted.row.enabled).toBe(false)
  expect(persisted.row).toHaveProperty('repair', 'reenable')
})

it.each([false, true])('activation cleans older caches and preserves first-install behavior across worker restart, replacing=%s', async replacing => {
  const remove = vi.fn(async () => true)
  const data = new Map<string, Map<string, Response>>([
    ['hennery-shell-old-attempt', new Map([['/__hennery_shell_complete__', new Response('old')]])],
    ['hennery-shell-older-partial', new Map()], ['unrelated-cache', new Map()],
  ])
  const caches = {
    keys: async () => [...data.keys()], delete: remove,
    open: async (name: string) => {
      if (!data.has(name)) data.set(name, new Map())
      return { put: async (key: string, response: Response) => { data.get(name)!.set(key, response) }, match: async (key: string) => data.get(name)!.get(key)?.clone() } as Cache
    },
  }
  const app = replacementWindow('/settings')
  const clients = { matchAll: async () => [app], openWindow: vi.fn() }
  const skipWaiting = vi.fn(async () => {}), claim = vi.fn(async () => {})
  const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), undefined, {
    caches, skipWaiting, claim, active: replacing, clients,
    fetch: async request => { const path = new URL(String(request)).pathname; return new Response(new Uint8Array(readFileSync(join(dist, path))), { headers: { 'Content-Type': mime[extname(path)] } }) },
  })
  expect(skipWaiting).not.toHaveBeenCalled()
  await harness.install()
  expect(skipWaiting).toHaveBeenCalledOnce()
  const build = readFileSync(join(dist, 'index.html'), 'utf8').match(/<meta name="hennery-build" content="([a-f0-9]+)">/)![1]
  const own = data.get([...data.keys()].find(name => name.startsWith(`hennery-shell-${build}-`))!)!
  expect(await own.get('/__hennery_shell_complete__')!.clone().text()).toBe(build)
  expect(await own.get('/__hennery_shell_replacement__')!.clone().text()).toBe(replacing ? '1' : '0')
  expect(claim).not.toHaveBeenCalled()
  data.set('hennery-shell-newer-install', new Map())
  data.set('hennery-shell-newer-waiting', new Map([['/__hennery_shell_complete__', new Response('newer')]]))
  const restarted = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), undefined, { caches, claim, clients })
  await restarted.activate()
  expect(app.navigate).toHaveBeenCalledTimes(replacing ? 1 : 0)
  expect(claim).toHaveBeenCalledOnce()
  expect(remove).toHaveBeenCalledTimes(2)
  expect(remove).toHaveBeenNthCalledWith(1, 'hennery-shell-old-attempt')
  expect(remove).toHaveBeenNthCalledWith(2, 'hennery-shell-older-partial')
})

it('an incomplete install never skips waiting or claims pages', async () => {
  const skipWaiting = vi.fn(async () => {}), claim = vi.fn(async () => {})
  const remove = vi.fn(async () => true)
  const cache = { put: vi.fn() } as unknown as Cache
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), undefined, {
    skipWaiting, claim, caches: { keys: async () => [], open: async () => cache, delete: remove },
    fetch: async () => new Response('missing', { status: 404 }),
  })
  await expect(harness.install()).rejects.toThrow('shell verification failed')
  expect(remove).toHaveBeenCalledOnce()
  expect(skipWaiting).not.toHaveBeenCalled()
  expect(claim).not.toHaveBeenCalled()
})

function activatedShell(replacing: boolean) {
  const build = readFileSync(join(dist, 'index.html'), 'utf8').match(/<meta name="hennery-build" content="([a-f0-9]+)">/)![1]
  const cache = { match: async (key: string) => key === '/__hennery_shell_complete__' ? new Response(build)
    : key === '/__hennery_shell_replacement__' ? new Response(replacing ? '1' : '0') : undefined } as Cache
  return { keys: async () => [`hennery-shell-${build}-installed`], open: async () => cache, delete: vi.fn(async () => true) }
}
function replacementWindow(path: string) {
  return { id: path, url: path.startsWith('https:') ? path : 'https://app.example' + path, focus: vi.fn(), postMessage: vi.fn(), navigate: vi.fn(async () => null) }
}
it('activation navigates legacy app windows after claiming, never waits for their new documents, and excludes non-app windows', async () => {
  const paths = ['/', '/sessions', '/sessions/s?pending=p', '/settings/', '/needs-you', '/more', '/defaults', '/mcp']
  const apps = paths.map(replacementWindow)
  const excluded = ['/api', '/api/sessions', '/api/attachments/a', '/mcp/', '/mcp/mount', '/login', '/setup/', '/unknown', 'https://foreign.example/settings'].map(replacementWindow)
  const claim = vi.fn(async () => {})
  const pending = deferred<null>()
  apps[0].navigate.mockImplementation(() => pending.promise)
  apps[1].navigate.mockRejectedValue(new Error('window closed'))
  const matchAll = vi.fn(async () => [...apps, ...excluded])
  const observedClaims: number[] = []
  for (const client of apps.slice(3)) client.navigate.mockImplementation(async () => { observedClaims.push(claim.mock.calls.length); return null })
  apps[2].navigate.mockImplementation(() => { throw new TypeError('unsupported navigation') })
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), undefined, {
    caches: activatedShell(true), claim, clients: { matchAll, openWindow: vi.fn() },
  })
  // Awaiting navigate() here would deadlock against activation's fetch queue.
  await harness.activate()
  expect(matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true })
  expect(observedClaims).toEqual(Array(apps.length - 3).fill(1))
  for (const client of apps) expect(client.navigate).toHaveBeenCalledExactlyOnceWith(client.url)
  for (const client of excluded) expect(client.navigate).not.toHaveBeenCalled()
  pending.resolve(null)
})
it('first installation claims existing app windows without navigating them', async () => {
  const app = replacementWindow('/settings')
  const claim = vi.fn(async () => {})
  const harness = workerHarness(readFileSync(join(dist, 'sw.js'), 'utf8'), undefined, {
    caches: activatedShell(false), claim, clients: { matchAll: async () => [app], openWindow: vi.fn() },
  })
  await harness.activate()
  expect(claim).toHaveBeenCalledOnce()
  expect(app.navigate).not.toHaveBeenCalled()
})
