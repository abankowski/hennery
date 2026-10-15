import { afterEach, expect, it, vi } from 'vitest'
import { NavigationGate, clickNotification, listenForNavigation, navigationGate, type AppWindow } from './navigation'
import { Client } from '../api/client'
import { deferred } from '../test-locks'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
it('reserves a clean page before acknowledging; edits and mutations cannot race readiness', () => {
  const gate = new NavigationGate()
  expect(gate.reserve('a', '/sessions/s', 1000, 0)).toBe(true)
  expect(gate.edit(10)).toBe(false)
  expect(() => gate.mutation(10)).toThrow()
  gate.release('other')
  expect(gate.edit(20)).toBe(false)
  gate.release('a')
  expect(gate.edit(30)).toBe(true)
  expect(gate.reserve('b', '/mcp', 1000, 40)).toBe(false)
})
it('leases expire and mutations keep a page busy', () => {
  const gate = new NavigationGate()
  const finish = gate.mutation(0)
  expect(gate.reserve('a', '/mcp', 1000, 1)).toBe(false)
  finish()
  expect(gate.reserve('a', '/mcp', 1000, 2)).toBe(true)
  expect(gate.edit(1001)).toBe(true)
})
const windowClient = (url: string) => ({ id: url, url: `https://app.example${url}`, type: 'window', visibilityState: 'visible', focus: vi.fn(async () => {}), navigate: vi.fn(async (_url: string): Promise<AppWindow | null> => null), postMessage: vi.fn((_message: unknown, _transfer?: Transferable[]) => {}) })
it('exact targets focus even while dirty, without navigation or a readiness request', async () => {
  const exact = windowClient('/sessions/s?pending=p')
  const clients = { matchAll: async () => [exact], openWindow: vi.fn() }
  await clickNotification('/sessions/s?pending=p', clients, 'https://app.example')
  expect(exact.focus).toHaveBeenCalledOnce()
  expect(exact.navigate).not.toHaveBeenCalled()
  expect(exact.postMessage).not.toHaveBeenCalled()
  expect(clients.openWindow).not.toHaveBeenCalled()
})

function channels() {
  class Port {
    onmessage: ((e: { data: unknown }) => void) | null = null
    other!: Port
    postMessage(data: unknown) { queueMicrotask(() => this.other.onmessage?.({ data })) }
    close() {}
  }
  vi.stubGlobal('MessageChannel', class {
    port1 = new Port(); port2 = new Port()
    constructor() { this.port1.other = this.port2; this.port2.other = this.port1 }
  })
}
function responsive(path: string, gate = new NavigationGate()) {
  const client = windowClient(path)
  client.postMessage.mockImplementation((message: unknown, transfer?: Transferable[]) => {
    const m = message as { kind: string; id: string; target: string; until: number }
    if (m.kind !== 'navigation_prepare') return
    const port = transfer![0] as MessagePort
    port.onmessage = e => {
      if (e.data.kind === 'navigation_release') gate.release(e.data.id)
      if (e.data.kind === 'navigation_start') port.postMessage({ ...e.data, kind: 'navigation_started', started: gate.begin(e.data.id) })
    }
    port.postMessage({ ...m, version: 1, kind: 'navigation_ready', ready: gate.reserve(m.id, m.target, m.until), separate: false })
  })
  return { client, gate }
}
it('a clean ready window navigates once, then releases the exact lease', async () => {
  channels()
  const { client, gate } = responsive('/settings')
  const next = windowClient('/sessions/s')
  client.navigate.mockImplementation(async () => { expect(gate.edit()).toBe(false); return next })
  const clients = { matchAll: async () => [client], openWindow: vi.fn() }
  await clickNotification('/sessions/s', clients, 'https://app.example')
  expect(client.navigate).toHaveBeenCalledExactlyOnceWith('/sessions/s')
  expect(next.focus).toHaveBeenCalledOnce()
  expect(gate.edit()).toBe(true)
})
it.each(['dirty', 'missing', 'untrusted'])('preserves an unavailable window and sends a non-destructive hint: %s', async reason => {
  channels(); vi.useFakeTimers()
  const { client, gate } = responsive('/sessions/old')
  if (reason === 'dirty') gate.edit()
  if (reason === 'missing') client.postMessage.mockImplementation(() => {})
  if (reason === 'untrusted') client.postMessage.mockImplementation((m: unknown, transfer?: Transferable[]) => (transfer![0] as MessagePort).postMessage({ ...(m as object), kind: 'navigation_ready', version: 1, id: 'other', ready: true }))
  const clients = { matchAll: async () => [client], openWindow: vi.fn() }
  const clicking = clickNotification('/sessions/new?pending=p', clients, 'https://app.example')
  await vi.advanceTimersByTimeAsync(501); await clicking
  expect(client.navigate).not.toHaveBeenCalled()
  expect(clients.openWindow).not.toHaveBeenCalled()
  expect(client.postMessage).toHaveBeenLastCalledWith({ version: 1, kind: 'notification_target', target: '/sessions/new?pending=p' })
})
it('rechecks the lease after a deferred window enumeration and never navigates an expired consent', async () => {
  channels(); vi.useFakeTimers()
  const { client, gate } = responsive('/sessions/old')
  let release!: (windows: AppWindow[]) => void, reads = 0
  const clients = { matchAll: async () => ++reads === 2 ? new Promise<AppWindow[]>(resolve => { release = resolve }) : [client], openWindow: vi.fn() }
  const clicking = clickNotification('/sessions/new', clients, 'https://app.example')
  await vi.advanceTimersByTimeAsync(1)
  await vi.advanceTimersByTimeAsync(2001)
  release([client]); await clicking
  expect(client.navigate).not.toHaveBeenCalled()
  expect(gate.edit()).toBe(true)
})
it.each(['commits', 'fails', 'rejects'])('keeps the actual document fenced until a delayed navigation %s', async outcome => {
  channels(); vi.useFakeTimers()
  window.history.replaceState(null, '', '/sessions/old')
  const service = new EventTarget(), active = {} as ServiceWorker
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(service, { getRegistration: async () => ({ active }) }) })
  const stop = listenForNavigation(vi.fn()), settled = deferred()
  const client = windowClient('/sessions/old'), next = windowClient('/sessions/new')
  let committed = false, finished = false
  client.postMessage.mockImplementation((data, transfer) => {
    service.dispatchEvent(new MessageEvent('message', { source: active, data, ports: transfer as MessagePort[] }))
  })
  client.navigate.mockImplementation(async () => {
    await settled.promise
    if (outcome === 'rejects') throw new Error('Navigation failed')
    if (outcome === 'fails') return null
    committed = true
    return next
  })
  const clients = { matchAll: async () => [client], openWindow: vi.fn() }
  const clicking = clickNotification('/sessions/new', clients, 'https://app.example').then(() => { finished = true })
  try {
    await vi.advanceTimersByTimeAsync(0)
    expect(client.navigate).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(2500)
    expect(navigationGate.blocked()).toBe(true)
    expect(navigationGate.edit()).toBe(false)
    expect(() => navigationGate.mutation()).toThrow('Opening a notification')
    expect(finished).toBe(false)
    expect(committed).toBe(false)
    settled.resolve(); await clicking
    await vi.advanceTimersByTimeAsync(0)
    expect(navigationGate.blocked()).toBe(false)
    navigationGate.mutation()()
    expect(committed).toBe(outcome === 'commits')
    expect(next.focus).toHaveBeenCalledTimes(outcome === 'commits' ? 1 : 0)
  } finally {
    settled.resolve(); await clicking; await vi.advanceTimersByTimeAsync(0)
    stop()
    // @ts-expect-error restore missing browser API
    delete navigator.serviceWorker
  }
})
it('a cold click opens the validated target and never trusts a forged absolute URL', async () => {
  const clients = { matchAll: async () => [], openWindow: vi.fn(async () => null) }
  await clickNotification('https://foreign.example/mcp', clients, 'https://app.example')
  expect(clients.openWindow).toHaveBeenCalledExactlyOnceWith('/sessions')
})
it('the transport cannot start any mutation after a page has acknowledged readiness', async () => {
  const fetch = vi.fn()
  const client = new Client({ fetch, navigate: vi.fn(), here: () => ({ pathname: '/sessions/s', search: '' }), stepUp: vi.fn() })
  expect(navigationGate.reserve('transport', '/mcp', Date.now() + 1000)).toBe(true)
  try {
    await expect(client.request('POST', '/api/sessions/s/pending/p/answer', { option_id: 'allow' })).rejects.toThrow('Opening a notification')
    expect(fetch).not.toHaveBeenCalled()
  } finally { navigationGate.release('transport') }
})
it('step-up and its deferred retry keep mutation ownership through the retry response', async () => {
  const confirmation = deferred(), retry = deferred<Response>(), retried = deferred()
  let calls = 0
  const client = new Client({ fetch: vi.fn(async () => {
    if (++calls === 1) return new Response(JSON.stringify({ code: 'step_up_required' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    retried.resolve(); return retry.promise
  }), navigate: vi.fn(), here: () => ({ pathname: '/settings', search: '' }), stepUp: () => confirmation.promise })
  const mutation = client.request('POST', '/api/example', {})
  await Promise.resolve(); await Promise.resolve()
  expect(navigationGate.reserve('during-step-up', '/mcp', Date.now() + 1000)).toBe(false)
  confirmation.resolve(); await retried.promise
  await Promise.resolve(); await Promise.resolve()
  expect(navigationGate.reserve('during-retry', '/mcp', Date.now() + 1000)).toBe(false)
  retry.resolve(new Response(null, { status: 204 })); await mutation
  expect(navigationGate.reserve('after-retry', '/mcp', Date.now() + 1000)).toBe(true)
  navigationGate.release('after-retry')
})
it('only the active registration and dedicated bound port can reserve or release a page', async () => {
  channels()
  window.history.replaceState(null, '', '/sessions/old')
  const service = new EventTarget(), active = {} as ServiceWorker
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(service, { getRegistration: async () => ({ active }) }) })
  const hint = vi.fn(), stop = listenForNavigation(hint)
  const channel = new MessageChannel(), replies: unknown[] = []
  channel.port1.onmessage = e => replies.push(e.data)
  const data = { version: 1, kind: 'navigation_prepare', id: 'owned', target: '/mcp', until: Date.now() + 1800 }
  service.dispatchEvent(new MessageEvent('message', { source: {} as ServiceWorker, data, ports: [channel.port2] }))
  await Promise.resolve(); await Promise.resolve()
  expect(replies).toEqual([])
  service.dispatchEvent(new MessageEvent('message', { source: active, data, ports: [channel.port2] }))
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  expect(replies).toEqual([expect.objectContaining({ kind: 'navigation_ready', id: 'owned', target: '/mcp', ready: true })])
  expect(navigationGate.edit()).toBe(false)
  channel.port1.postMessage({ version: 1, kind: 'navigation_release', id: 'wrong' })
  await Promise.resolve()
  expect(navigationGate.edit()).toBe(false)
  channel.port1.postMessage({ version: 1, kind: 'navigation_release', id: 'owned' })
  await Promise.resolve()
  expect(navigationGate.edit()).toBe(true)
  service.dispatchEvent(new MessageEvent('message', { source: {} as ServiceWorker, data: { version: 1, kind: 'notification_target', target: '/mcp' } }))
  await Promise.resolve(); await Promise.resolve()
  expect(hint).not.toHaveBeenCalled()
  stop()
  // @ts-expect-error restore missing browser API
  delete navigator.serviceWorker
})
