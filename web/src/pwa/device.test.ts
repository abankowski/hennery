import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserPush, classifyPush } from './device'
import { Journal, type PushRecord, type PushStore } from './journal'
import { Client } from '../api/client'
import type { PushSubscriptionItem } from '../generated/protocol'
import { deferred, testLocks } from '../test-locks'

beforeEach(() => Object.defineProperty(navigator, 'locks', { configurable: true, value: testLocks() }))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

const key = btoa(String.fromCharCode(4, ...Array(64).fill(1)))
const item: PushSubscriptionItem = { id: 'id', endpoint_host: 'push.example', device_label: 'Phone', created_at: '2026-10-14', this_device: true, signed_out: false }
function setup() {
  let record: PushRecord = { generation: 0, enabled: false }
  const store: PushStore = { async transact(fn) { return fn(record) } }
  const journal = new Journal(store)
  let subscription: PushSubscription | null = null
  const unsubscribe = vi.fn(async () => { subscription = null; return true })
  const make = (endpoint = 'https://push.example/a') => ({ endpoint, expirationTime: null,
    options: { applicationServerKey: Uint8Array.from([4, ...Array(64).fill(1)]).buffer }, unsubscribe,
    toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' }, expirationTime: null }) }) as unknown as PushSubscription
  const subscribe = vi.fn(async () => { subscription = make(); return subscription })
  const close = vi.fn()
  const reg = { pushManager: { getSubscription: vi.fn(async () => subscription), subscribe }, getNotifications: vi.fn(async () => [{ close }]) } as unknown as ServiceWorkerRegistration
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(item), { headers: { 'Content-Type': 'application/json' } }))
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: fetcher, here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp })
  const device = new BrowserPush(client, reg, journal, key)
  return { journal, device, subscribe, unsubscribe, fetcher, close, make, reg, stepUp, client,
    setSubscription: (next: PushSubscription | null) => { subscription = next },
    setRecord: (next: PushRecord) => { record = next } }
}
describe('explicit browser push intent', () => {
  it('an enable queued before disable cannot start when that disable lease expires', async () => {
    const { device, journal, subscribe, fetcher } = setup()
    vi.useFakeTimers()
    const occupied = deferred(), release = deferred()
    const occupying = navigator.locks.request('hennery-push-effects', async () => { occupied.resolve(); await release.promise })
    await occupied.promise
    const enabling = device.enable().catch((err: unknown) => err)
    await vi.advanceTimersByTimeAsync(0)
    const disabling = device.disable(true)
    await vi.advanceTimersByTimeAsync(13000)
    release.resolve(); await occupying
    expect(await enabling).toBeInstanceOf(Error)
    expect((await disabling).browser).toBe(true)
    expect(subscribe).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled()
    expect((await journal.read()).enabled).toBe(false)
  })
  it('missing origin locks refuse enable before touching the browser or journal', async () => {
    const { device, journal, subscribe, fetcher } = setup()
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    await expect(device.enable()).rejects.toThrow('coordination')
    expect(subscribe).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled()
    expect(await journal.read()).toEqual({ generation: 0, enabled: false })
  })
  it('disable during browser inspection prevents removal of a mismatched subscription', async () => {
    const { device, journal, reg, make, unsubscribe, subscribe } = setup()
    const inspecting = deferred(), result = deferred<PushSubscription | null>()
    const old = make(); Object.defineProperty(old.options, 'applicationServerKey', { value: new Uint8Array(65).buffer })
    vi.spyOn(reg.pushManager, 'getSubscription').mockImplementationOnce(() => { inspecting.resolve(); return result.promise })
    const enabling = device.enable().catch((err: unknown) => err)
    await inspecting.promise
    await journal.disable()
    result.resolve(old)
    expect(await enabling).toBeInstanceOf(Error)
    expect(unsubscribe).not.toHaveBeenCalled(); expect(subscribe).not.toHaveBeenCalled()
  })
  it('disable between a key-change unsubscribe and subscribe prevents new browser work', async () => {
    const { device, journal, make, setSubscription, unsubscribe, subscribe } = setup()
    const old = make(); Object.defineProperty(old.options, 'applicationServerKey', { value: new Uint8Array(65).buffer }); setSubscription(old)
    const removing = deferred(), removed = deferred<boolean>()
    unsubscribe.mockImplementationOnce(() => { removing.resolve(); return removed.promise })
    const enabling = device.enable().catch((err: unknown) => err)
    await removing.promise
    await journal.disable(); removed.resolve(true)
    expect(await enabling).toBeInstanceOf(Error)
    expect(subscribe).not.toHaveBeenCalled()
  })
  it('disable between a renewal unsubscribe and subscribe prevents new browser work', async () => {
    const { device, journal, unsubscribe, subscribe } = setup()
    await device.enable(); subscribe.mockClear()
    const removing = deferred(), removed = deferred<boolean>()
    unsubscribe.mockImplementationOnce(() => { removing.resolve(); return removed.promise })
    const renewal = device.renew([item]).catch((err: unknown) => err)
    await removing.promise
    await journal.disable(); removed.resolve(true)
    expect(await renewal).toBeInstanceOf(Error)
    expect(subscribe).not.toHaveBeenCalled()
  })
  it('superseded disable checks ownership after DELETE before browser cleanup', async () => {
    const { device, journal, fetcher, unsubscribe, close } = setup()
    await device.enable()
    const deleting = deferred(), deleted = deferred<Response>()
    fetcher.mockImplementationOnce(() => { deleting.resolve(); return deleted.promise })
    const disabling = device.disable()
    await deleting.promise
    await journal.finishDisable(true, true, (await journal.read()).generation)
    const owner = await journal.beginEnable()
    await journal.finishEnable(owner, item.id, 'https://push.example/a', key)
    deleted.resolve(new Response(null, { status: 204 }))
    await disabling
    expect(unsubscribe).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled()
    expect((await journal.read()).enabled).toBe(true)
  })
  it('superseded disable checks ownership after notification inspection before closing', async () => {
    const { device, journal, reg, close } = setup()
    await device.enable()
    const inspecting = deferred(), inspected = deferred<Notification[]>()
    vi.spyOn(reg, 'getNotifications').mockImplementationOnce(() => { inspecting.resolve(); return inspected.promise })
    const disabling = device.disable(true)
    await inspecting.promise
    await journal.finishDisable(true, true, (await journal.read()).generation)
    const owner = await journal.beginEnable()
    await journal.finishEnable(owner, item.id, 'https://push.example/a', key)
    inspected.resolve([{ close } as unknown as Notification])
    await disabling
    expect(close).not.toHaveBeenCalled()
    expect((await journal.read()).enabled).toBe(true)
  })
  it('the retried HTTP attempt still aborts after its own ten seconds', async () => {
    const { device, fetcher, stepUp, journal } = setup()
    vi.useFakeTimers()
    const confirming = deferred(), confirmation = deferred(), retrying = deferred()
    stepUp.mockImplementationOnce(() => { confirming.resolve(); return confirmation.promise })
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'step_up_required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
    fetcher.mockImplementationOnce((_url, init) => new Promise<Response>((_resolve, reject) => {
      retrying.resolve(); init!.signal!.addEventListener('abort', () => reject(new Error('Network deadline')))
    }))
    let done = false
    const enabling = device.enable().catch((err: unknown) => err).then((result) => { done = true; return result })
    await confirming.promise; await vi.advanceTimersByTimeAsync(15000)
    confirmation.resolve(); await retrying.promise
    await vi.advanceTimersByTimeAsync(9999); expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(2)
    expect(done).toBe(true)
    expect(await enabling).toMatchObject({ message: 'Network deadline' })
    expect((await journal.read()).enabled).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('keeps a second window enable behind a DELETE that outlives the journal lease', async () => {
    const { device, journal, fetcher, reg } = setup()
    await device.enable()
    vi.useFakeTimers()
    const deleting = deferred(), releaseDelete = deferred()
    let serverExists = true
    fetcher.mockImplementation(async (_url, init) => {
      if (init?.method === 'DELETE') {
        deleting.resolve(); await releaseDelete.promise; serverExists = false
        return new Response(null, { status: 204 })
      }
      serverExists = true
      return new Response(JSON.stringify(item), { headers: { 'Content-Type': 'application/json' } })
    })
    const disabling = device.disable()
    await deleting.promise
    await vi.advanceTimersByTimeAsync(13000)
    let enabled = false
    const enabling = device.enable().then(() => { enabled = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(enabled).toBe(false)
    releaseDelete.resolve()
    await disabling; await enabling
    expect(serverExists).toBe(true)
    expect(await reg.pushManager.getSubscription()).not.toBeNull()
    expect((await journal.read()).enabled).toBe(true)
  })
  it('a superseded disable checks its owner after inspection before any destructive effect', async () => {
    const { device, journal, reg, fetcher, unsubscribe, close, make, setSubscription } = setup()
    await device.enable()
    const inspecting = deferred(), inspected = deferred<PushSubscription | null>()
    vi.spyOn(reg.pushManager, 'getSubscription').mockImplementationOnce(() => { inspecting.resolve(); return inspected.promise })
    const disabling = device.disable()
    await inspecting.promise
    // Controlled takeover models a surviving generation after the old owner
    // expires; production effects must be fenced even under the origin lock.
    await journal.finishDisable(true, true, (await journal.read()).generation)
    const owned = await journal.beginEnable()
    const next = make('https://push.example/new')
    setSubscription(next)
    await journal.finishEnable(owned, item.id, next.endpoint, key)
    fetcher.mockClear()
    inspected.resolve(next)
    await disabling
    expect(fetcher).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
    expect((await journal.read()).enabled).toBe(true)
  })
  it('a second window reconciliation cannot cancel the unsubscribe/subscribe renewal gap', async () => {
    const { device, journal, subscribe, make, setSubscription, fetcher } = setup()
    await device.enable()
    vi.useFakeTimers(); vi.stubGlobal('fetch', fetcher)
    const subscribing = deferred(), replacement = deferred<PushSubscription>()
    subscribe.mockImplementationOnce(async () => { subscribing.resolve(); const next = await replacement.promise; setSubscription(next); return next })
    const renewal = device.renew([item]).catch((err: unknown) => err)
    await subscribing.promise
    const reconciling = device.reconcile([item], fetcher)
    await vi.advanceTimersByTimeAsync(13000)
    expect((await journal.read()).enabled).toBe(true)
    expect((await journal.read()).lease).toBeDefined()
    replacement.resolve(make('https://push.example/b'))
    expect(await renewal).toBeUndefined()
    await reconciling
    expect(await journal.read()).toMatchObject({ enabled: true, endpoint: 'https://push.example/b' })
  })
  it('expired preparation gets a fresh network deadline after a slow human confirmation', async () => {
    const { device, journal, fetcher, stepUp } = setup()
    vi.useFakeTimers()
    const confirming = deferred(), confirmation = deferred()
    stepUp.mockImplementationOnce(() => { confirming.resolve(); return confirmation.promise })
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'step_up_required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
    fetcher.mockImplementationOnce(async (_url, init) => {
      if (init?.signal?.aborted) throw new Error('Already aborted retry')
      return new Response(JSON.stringify(item), { headers: { 'Content-Type': 'application/json' } })
    })
    const enabling = device.enable().catch((err: unknown) => err)
    await confirming.promise
    await vi.advanceTimersByTimeAsync(15000)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(false)
    confirmation.resolve()
    expect(await enabling).toBeUndefined()
    expect(fetcher.mock.calls[1][1]?.signal?.aborted).toBe(false)
    expect((await journal.read()).enabled).toBe(true)
  })
  it('a disable during human confirmation prevents the retried POST', async () => {
    const { device, journal, fetcher, stepUp } = setup()
    const confirming = deferred(), confirmation = deferred()
    stepUp.mockImplementationOnce(() => { confirming.resolve(); return confirmation.promise })
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'step_up_required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
    const enabling = device.enable().catch((err: unknown) => err)
    await confirming.promise
    const previous = await journal.disable()
    await journal.finishDisable(true, true, previous.generation + 1)
    confirmation.resolve()
    expect(await enabling).toBeInstanceOf(Error)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect((await journal.read()).enabled).toBe(false)
  })
  it.each([false, true])('a late browser subscribe cleans an abandoned generation while preserving a newer enable: %s', async (reenabled) => {
    const { device, subscribe, journal, make, unsubscribe, fetcher, client, setSubscription } = setup()
    let resolve!: (s: PushSubscription) => void
    subscribe.mockImplementationOnce(() => new Promise<PushSubscription>((r) => { resolve = r }))
    const first = device.enable().catch((err: unknown) => err)
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    const previous = await journal.disable()
    await journal.finishDisable(true, true, previous.generation + 1)
    if (reenabled) {
      // Restore a newer confirmed generation directly. Live page operations
      // now serialize behind the old call; this exercises its stale fence.
      const owned = await journal.beginEnable()
      const next = make(); setSubscription(next)
      await client.request('POST', '/api/push/subscriptions', next.toJSON())
      await journal.finishEnable(owned, item.id, next.endpoint, key)
    }
    resolve(make())
    expect(await first).toBeInstanceOf(Error)
    expect(unsubscribe).toHaveBeenCalledTimes(reenabled ? 0 : 1)
    expect(fetcher).toHaveBeenCalledTimes(reenabled ? 1 : 0)
    expect((await journal.read()).enabled).toBe(reenabled)
  })
  it('a server row-list begun before an explicit enable cannot disable its newer generation', async () => {
    const { device, journal } = setup()
    const before = await journal.read()
    await device.enable()
    const result = await device.reconcile([], fetch, before.generation)
    expect(result.stale).toBe(true)
    expect((await journal.read()).enabled).toBe(true)
  })
  it('a late enable response cannot remove a newer enabled registration with the same collector id', async () => {
    const { device, fetcher, journal } = setup()
    let resolve!: (r: Response) => void
    fetcher.mockImplementationOnce(() => new Promise<Response>((r) => { resolve = r }))
    const first = device.enable().catch((err: unknown) => err)
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    const previous = await journal.disable()
    await journal.finishDisable(true, true, previous.generation + 1)
    const next = await journal.beginEnable()
    await journal.finishEnable(next, item.id, 'https://push.example/a', key)
    resolve(new Response(JSON.stringify(item), { headers: { 'Content-Type': 'application/json' } }))
    expect(await first).toBeInstanceOf(Error)
    expect((await journal.read()).enabled).toBe(true)
    expect(fetcher.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
  })
  it('subscribes once, posts generated DTO shape, remembers only confirmed identity', async () => {
    const { device, subscribe, fetcher, journal } = setup()
    await device.enable('Phone')
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }))
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ endpoint: 'https://push.example/a', expirationTime: null, keys: { p256dh: 'p', auth: 'a' }, device_label: 'Phone' })
    expect(await journal.read()).toMatchObject({ enabled: true, id: 'id', endpoint: 'https://push.example/a', key })
  })
  it('reuses the same subscription after a lost POST response, never reports browser permission as success', async () => {
    const { device, subscribe, fetcher, journal } = setup()
    fetcher.mockRejectedValueOnce(new TypeError('lost response'))
    await expect(device.enable()).rejects.toThrow('lost response')
    expect((await journal.read()).enabled).toBe(false)
    await device.enable()
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect((await journal.read()).id).toBe('id')
  })
  it('replaces a mismatched VAPID key only on explicit enable', async () => {
    const { device, make, setSubscription, unsubscribe, subscribe } = setup()
    const old = make()
    Object.defineProperty(old.options, 'applicationServerKey', { value: new Uint8Array(65).buffer })
    setSubscription(old)
    await device.enable()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(subscribe).toHaveBeenCalledTimes(1)
  })
  it('launch inspects only, does not restore a remotely removed row or select another this_device row', async () => {
    const { device, journal, fetcher } = setup()
    await device.enable()
    fetcher.mockClear()
    await device.reconcile([{ ...item, id: 'other' }])
    expect(fetcher).not.toHaveBeenCalled()
    expect((await journal.read()).enabled).toBe(false)
  })
  it('rotates an observed changed endpoint from the confirmed anchor, preserving signed-out binding', async () => {
    const { device, make, setSubscription, fetcher, journal } = setup()
    await device.enable()
    setSubscription(make('https://push.example/b'))
    fetcher.mockClear()
    await device.reconcile([{ ...item, signed_out: true }], fetcher)
    expect(fetcher.mock.calls[0][0]).toBe('/api/push/subscriptions/rotate')
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).old_endpoint).toBe('https://push.example/a')
    expect((await journal.read()).endpoint).toBe('https://push.example/b')
  })
  it.each(['server', 'browser', 'both', 'none'])('disable reports separate cleanup outcomes: %s', async (fault) => {
    const { device, fetcher, unsubscribe, journal, close } = setup()
    await device.enable()
    fetcher.mockImplementationOnce(async () => {
      expect((await journal.read()).enabled).toBe(false)
      if (fault === 'server' || fault === 'both') throw new TypeError('offline')
      return new Response(null, { status: 204 })
    })
    if (fault === 'browser' || fault === 'both') unsubscribe.mockResolvedValueOnce(false)
    const result = await device.disable()
    expect(result.server).toBe(fault !== 'server' && fault !== 'both')
    expect(result.browser).toBe(fault !== 'browser' && fault !== 'both')
    expect(unsubscribe).toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
    expect((await journal.read()).enabled).toBe(false)
    expect((await journal.read()).id).toBe(result.server ? undefined : 'id')
  })
  it.each(['server', 'browser', 'both', 'none'])('coalesced disables report the same completed cleanup outcomes: %s', async (fault) => {
    const { device, reg, fetcher, unsubscribe } = setup()
    await device.enable()
    vi.useFakeTimers()
    const inspecting = deferred(), inspected = deferred<PushSubscription | null>()
    const old = await reg.pushManager.getSubscription()
    vi.spyOn(reg.pushManager, 'getSubscription').mockImplementationOnce(() => { inspecting.resolve(); return inspected.promise })
    if (fault === 'server' || fault === 'both') fetcher.mockRejectedValueOnce(new Error('offline'))
    else fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }))
    if (fault === 'browser' || fault === 'both') unsubscribe.mockResolvedValueOnce(false)
    const a = device.disable()
    await inspecting.promise
    const b = device.disable()
    await vi.advanceTimersByTimeAsync(0)
    inspected.resolve(old)
    const first = await a
    expect(await b).toEqual(first)
    expect(first).toEqual({ server: fault !== 'server' && fault !== 'both', browser: fault !== 'browser' && fault !== 'both' })
  })
  it('404 removal is success and missing local id removes by known endpoint', async () => {
    const { device, make, setSubscription, fetcher } = setup()
    setSubscription(make())
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }))
    expect(await device.disable()).toEqual({ server: true, browser: true })
    expect(fetcher.mock.calls[0][0]).toBe('/api/push/subscriptions')
    expect(fetcher.mock.calls[0][1]!.method).toBe('DELETE')
  })
  it('renewal replaces the browser subscription and rotates without POST subscribe or step-up', async () => {
    const { device, make, setSubscription, subscribe, unsubscribe, fetcher, journal } = setup()
    await device.enable()
    subscribe.mockImplementationOnce(async () => { const next = make('https://push.example/b'); setSubscription(next); return next })
    fetcher.mockClear(); vi.stubGlobal('fetch', fetcher)
    try {
      await device.renew([item])
      expect(unsubscribe).toHaveBeenCalledTimes(1)
      expect(fetcher.mock.calls[0][0]).toBe('/api/push/subscriptions/rotate')
      expect((await journal.read()).endpoint).toBe('https://push.example/b')
    } finally { vi.unstubAllGlobals() }
  })
  it('fails closed when browser inspection or durable disable fails, while still trying cleanup', async () => {
    const { device, reg, journal, unsubscribe, close } = setup()
    await device.enable()
    vi.spyOn(journal, 'disable').mockRejectedValueOnce(new Error('storage'))
    expect((await device.disable(true)).browser).toBe(false)
    expect(unsubscribe).toHaveBeenCalled(); expect(close).toHaveBeenCalled()
    vi.spyOn(reg.pushManager, 'getSubscription').mockRejectedValueOnce(new Error('browser'))
    expect((await device.disable(true)).browser).toBe(false)
  })
})
describe('registration classifier', () => {
  const record: PushRecord = { generation: 1, enabled: true, id: 'id', endpoint: 'endpoint', key }
  const base = { supported: true, secure: true, permission: 'granted' as NotificationPermission, subscribed: true, matches: true, record, row: item }
  it.each([
    [{ ...base, supported: false }, 'unsupported'], [{ ...base, secure: false }, 'insecure'],
    [{ ...base, permission: 'denied' }, 'blocked'], [{ ...base, permission: 'default' }, 'off'],
    [{ ...base, subscribed: false }, 'off'], [{ ...base, record: { generation: 0, enabled: false } }, 'unconfirmed'],
    [{ ...base, row: undefined }, 'reenable'], [{ ...base, matches: false }, 'reenable'],
    [{ ...base, record: { ...record, rotation: { oldEndpoint: 'endpoint', subscription: { endpoint: 'replacement', keys: { p256dh: 'p', auth: 'a' } }, sequence: 1, attempts: 1, nextAt: 1000 } } }, 'unconfirmed'],
    [{ ...base, row: { ...item, signed_out: true } }, 'signed_out'], [base, 'enabled'],
  ] as const)('reports %s as %s', (input, verdict) => expect(classifyPush(input)).toBe(verdict))
})
