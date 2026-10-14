// Two explicit test boundaries: the page's PushManager service, and an OS
// event harness evaluating the *emitted* production worker. No production
// message endpoint or external vendor transport is involved.
import type { BrowserContext } from '@playwright/test'
import { runInNewContext } from 'node:vm'
import { webcrypto } from 'node:crypto'
import type { PushRecord } from '../src/pwa/journal'
import { testLocks } from '../src/test-locks'

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

export function workerHarness(code: string, persistence = { row: { generation: 0, enabled: false } as PushRecord }, dependencies: { pushManager?: PushManager; locks?: ReturnType<typeof testLocks>; fetch?: typeof fetch; onWrite?: (row: PushRecord) => void } = {}) {
  type Event = { data?: { text(): string }; oldSubscription?: PushSubscription | null; newSubscription?: PushSubscription | null; request?: Request; respondWith?(promise: Promise<Response>): void; waitUntil(promise: Promise<unknown>): void }
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
  runInNewContext(code, { self: { addEventListener: (name: string, handler: typeof handlers extends Map<string, infer V> ? V : never) => handlers.set(name, handler),
    registration: { pushManager: dependencies.pushManager, showNotification: async (title: string, options: unknown) => { notifications.push({ title, options }) } } },
    navigator: { locks: dependencies.locks ?? testLocks() },
    location: { origin: 'https://app.example' }, URL, Response, Request, crypto: webcrypto, AbortController, setTimeout, clearTimeout, indexedDB, structuredClone, caches: { keys: async () => [] },
    fetch: async (url: string, init: RequestInit) => { fetches.push(url); attempts.push(init); return dependencies.fetch ? dependencies.fetch(url, init) : new Response(JSON.stringify({ id: persistence.row.id })) },
  })
  const dispatch = async (name: string, event: Omit<Event, 'waitUntil'>) => {
    let work: Promise<unknown> | undefined
    handlers.get(name)!({ ...event, waitUntil: (promise) => { work = promise } })
    if (!work) throw new Error(`${name} handler failed to extend event lifetime`)
    await work
  }
  return { notifications, fetches, attempts,
    push: (text: string | null) => dispatch('push', text === null ? {} : { data: { text: () => text } }),
    change: (oldSubscription: PushSubscription | null, newSubscription: PushSubscription | null) => dispatch('pushsubscriptionchange', { oldSubscription, newSubscription }),
    handles(request: Request) {
      let handled = false
      handlers.get('fetch')!({ request, waitUntil() {}, respondWith: (promise) => { handled = true; void promise.catch(() => {}) } })
      return handled
    },
  }
}
