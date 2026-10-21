// Two explicit test boundaries: the page's PushManager service, and an OS
// event harness evaluating the *emitted* production worker. No production
// message endpoint or external vendor transport is involved.
import type { BrowserContext } from '@playwright/test'
import { runInNewContext } from 'node:vm'
import { webcrypto } from 'node:crypto'
import type { PushRecord } from '../src/pwa/journal'
import { testLocks } from '../src/test-locks'
import type { AppWindow, Windows } from '../src/pwa/navigation'
import { MessageChannel as WorkerMessageChannel } from 'node:worker_threads'

export async function mockPush(context: BrowserContext) {
  await context.addInitScript(() => {
    const from64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)).buffer
    const to64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    let permission: NotificationPermission = localStorage.getItem('mock-permission') as NotificationPermission ?? 'default'
    Object.defineProperty(Notification, 'permission', { get: () => permission })
    Notification.requestPermission = async () => {
      localStorage.setItem('mock-permission-calls', String(Number(localStorage.getItem('mock-permission-calls') ?? '0') + 1))
      permission = localStorage.getItem('mock-denied') ? 'denied' : 'granted'
      localStorage.setItem('mock-permission', permission)
      return permission
    }
    const current = () => {
      const text = localStorage.getItem('mock-subscription')
      if (!text) return null
      const json = JSON.parse(text) as { endpoint: string; key: string; expirationTime: number | null }
      return { endpoint: json.endpoint, expirationTime: json.expirationTime,
        options: { userVisibleOnly: true, applicationServerKey: from64(json.key) },
        toJSON: () => ({ endpoint: json.endpoint, expirationTime: json.expirationTime, keys: { p256dh: json.key, auth: 'AAAAAAAAAAAAAAAAAAAAAA' } }),
        unsubscribe: async () => { localStorage.removeItem('mock-subscription'); return true },
      }
    }
    Object.defineProperty(PushManager.prototype, 'getSubscription', { value: async () => current() })
    Object.defineProperty(PushManager.prototype, 'subscribe', { value: async (options: PushSubscriptionOptionsInit) => {
      localStorage.setItem('mock-subscription', JSON.stringify({ endpoint: `https://push.example.com/${crypto.randomUUID()}`, key: to64(options.applicationServerKey as ArrayBuffer), expirationTime: null }))
      return current()
    } })
  })
}

export function workerHarness(code: string, persistence = { row: { generation: 0, enabled: false } as PushRecord }, dependencies: { origin?: string; clients?: Windows; pushManager?: PushManager; locks?: ReturnType<typeof testLocks>; fetch?: typeof fetch; onWrite?: (row: PushRecord) => void; skipWaiting?: () => Promise<void>; waiting?: boolean; ownWaiting?: boolean; workerIdentity?: boolean; caches?: Pick<CacheStorage, 'keys' | 'delete' | 'open'> } = {}) {
  type Event = { notification?: { data: { url: unknown }; close(): void }; data?: unknown; source?: { id: string }; ports?: MessagePort[]; oldSubscription?: PushSubscription | null; newSubscription?: PushSubscription | null; request?: Request; respondWith?(promise: Promise<Response>): void; waitUntil(promise: Promise<unknown>): void }
  const handlers = new Map<string, (event: Event) => void>()
  const notifications: { title: string; options: unknown }[] = [], fetches: string[] = []
  const attempts: RequestInit[] = []
  // Model persistence beyond worker termination; each transaction reads a
  // copy and commits via put. Production IndexedPushStore is used unchanged.
  const indexedDB = { open: () => {
    const request: { result?: object; onsuccess?: () => void; onupgradeneeded?: () => void } = {}
    request.result = { createObjectStore() {}, close() {}, transaction: () => {
      const tx: { oncomplete?: () => void; onabort?: () => void; objectStore?: () => object; abort?: () => void } = {}
      let aborted = false
      tx.abort = () => { aborted = true; tx.onabort?.() }
      tx.objectStore = () => ({ get: () => {
        const read: { result: PushRecord; onsuccess?: () => void } = { result: structuredClone(persistence.row) }
        queueMicrotask(() => { read.onsuccess?.(); queueMicrotask(() => { if (!aborted) tx.oncomplete?.() }) })
        return read
      }, put: (row: PushRecord) => { persistence.row = structuredClone(row); dependencies.onWrite?.(persistence.row) } })
      return tx
    } }
    queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.() })
    return request
  } }
  const serviceWorker = {}
  runInNewContext(code, { self: { ...(dependencies.workerIdentity === false ? {} : { serviceWorker }), skipWaiting: dependencies.skipWaiting,
    addEventListener: (name: string, handler: typeof handlers extends Map<string, infer V> ? V : never) => handlers.set(name, handler),
    clients: dependencies.clients ?? { matchAll: async () => [], openWindow: async () => null },
    registration: { get waiting() { return dependencies.waiting === false ? null : dependencies.ownWaiting === false ? {} : serviceWorker }, pushManager: dependencies.pushManager, showNotification: async (title: string, options: unknown) => { notifications.push({ title, options }) } } },
    navigator: { locks: dependencies.locks ?? testLocks() },
    location: { origin: dependencies.origin ?? 'https://app.example' }, URL, Response, Request, TextEncoder, MessageChannel: WorkerMessageChannel, crypto: webcrypto, AbortController, setTimeout, clearTimeout, indexedDB, structuredClone, caches: dependencies.caches ?? { keys: async () => [] },
    fetch: async (url: string, init: RequestInit) => { fetches.push(url); attempts.push(init); return dependencies.fetch ? dependencies.fetch(url, init) : new Response(JSON.stringify({ id: persistence.row.id })) },
  })
  const dispatch = async (name: string, event: Omit<Event, 'waitUntil'>) => {
    let work: Promise<unknown> | undefined
    handlers.get(name)!({ ...event, waitUntil: (promise) => { work = promise } })
    if (!work) throw new Error(`${name} handler failed to extend event lifetime`)
    await work
  }
  return { notifications, fetches, attempts,
    install: () => dispatch('install', {}),
    activate: () => dispatch('activate', {}),
    message: (data: unknown, source: { id: string }, port: MessagePort) => dispatch('message', { data, source, ports: [port] }),
    click: (url: unknown, close = () => {}) => dispatch('notificationclick', { notification: { data: { url }, close } }),
    push: (text: string | null) => dispatch('push', text === null ? {} : { data: { text: () => text } }),
    change: (oldSubscription: PushSubscription | null, newSubscription: PushSubscription | null) => dispatch('pushsubscriptionchange', { oldSubscription, newSubscription }),
    handles(request: Request) {
      let handled = false
      handlers.get('fetch')!({ request, waitUntil() {}, respondWith: (promise) => { handled = true; void promise.catch(() => {}) } })
      return handled
    },
  }
}

/** OS event harness ↔ real documents. The browser gets the production
 * listener and lease, using its real active worker as the trusted source.
 * Only this test bridge synthesizes the event; no injection ships. */
export function browserWindows(context: BrowserContext, origin: string): Windows {
  let sequence = 0
  const ids = new WeakMap<object, string>()
  const make = (page: ReturnType<BrowserContext['pages']>[number]): AppWindow => {
    if (!ids.has(page)) ids.set(page, `window-${++sequence}`)
    return {
      id: ids.get(page)!, url: page.url(), visibilityState: 'visible',
      focus: () => page.bringToFront(),
      navigate: async target => { await page.goto(origin + target); return make(page) },
      postMessage: (message, transfer) => {
        const port = transfer?.[0] as MessagePort | undefined
        if (port) port.onmessage = event => { void page.evaluate(data => {
          const ports = (window as unknown as { __notificationPorts?: Map<string, MessagePort> }).__notificationPorts
          const m = data as { id: string; kind: string }, channel = ports?.get(m.id)
          if (!channel) return null
          if (m.kind === 'navigation_start') return new Promise<unknown>(resolve => {
            channel.onmessage = event => resolve(event.data)
            channel.postMessage(data)
          })
          channel.postMessage(data)
          if (m.kind === 'navigation_release') { ports?.delete(m.id); channel.close() }
          return null
        }, event.data).then(reply => { if (reply) port.postMessage(reply) }).catch(() => {}) }
        void page.evaluate(async ({ message, hasPort }) => {
          const registration = await navigator.serviceWorker.ready
          const m = message as { id: string }
          if (!hasPort) { navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: message, source: registration.active })); return null }
          const channel = new MessageChannel()
          const holder = window as unknown as { __notificationPorts?: Map<string, MessagePort> }
          ;(holder.__notificationPorts ??= new Map()).set(m.id, channel.port1)
          const reply = new Promise<unknown>(resolve => { channel.port1.onmessage = e => resolve(e.data) })
          navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: message, source: registration.active, ports: [channel.port2] }))
          return reply
        }, { message, hasPort: !!port }).then(reply => { if (port) port.postMessage(reply) }).catch(() => {})
      },
    }
  }
  return {
    matchAll: async () => context.pages().filter(page => page.url().startsWith(origin + '/')).map(make),
    openWindow: async target => { const page = await context.newPage(); await page.goto(origin + target); return make(page) },
  }
}
