import type { PushRotateRequest, PushSubscribeRequest } from '../generated/protocol'

interface Rotation {
  oldEndpoint: string; subscription: PushSubscribeRequest; sequence: number
  attempts: number; nextAt: number
}
export interface Lease { token: string; generation: number; until: number; purpose?: 'disable' }
export interface PushRecord {
  generation: number; enabled: boolean; id?: string; endpoint?: string; key?: string
  rotation?: Rotation; lease?: Lease; repair?: string
}
// Callback MUST be synchronous. The production adapter commits it atomically.
export interface PushStore { transact<T>(fn: (row: PushRecord) => T): Promise<T> }
export type RotationResult = 'idle' | 'success' | 'retry' | 'sign_in' | 'reenable' | 'stale'
const lease = (generation: number, now: number): Lease => ({ generation, token: crypto.randomUUID(), until: now + 12000 })
const same = (a: Lease | undefined, b: Lease) => a?.token === b.token

export class Journal {
  constructor(private readonly store: PushStore) {}
  read(): Promise<PushRecord> { return this.store.transact((r) => structuredClone(r)) }

  beginEnable(now = Date.now()): Promise<Lease> {
    return this.store.transact((r) => {
      if (r.lease && r.lease.until > now) throw new Error('Notification operation busy; retry shortly.')
      const next = lease(r.generation + 1, now)
      Object.keys(r).forEach((k) => delete r[k as keyof PushRecord])
      Object.assign(r, { generation: next.generation, enabled: false, lease: next })
      return next
    })
  }
  finishEnable(attempt: Lease, id: string, endpoint: string, key: string): Promise<boolean> {
    return this.store.transact((r) => {
      if (r.generation !== attempt.generation || !same(r.lease, attempt)) {
        // Disable won. Preserve a scrubbed id so server cleanup can be retried.
        if (!r.enabled && !r.id) r.id = id
        return false
      }
      Object.assign(r, { enabled: true, id, endpoint, key })
      delete r.lease; delete r.repair
      return true
    })
  }
  abortEnable(attempt: Lease): Promise<void> {
    return this.store.transact((r) => {
      if (!same(r.lease, attempt)) return
      delete r.lease
      if (r.generation === attempt.generation) r.repair = 'reenable'
    })
  }
  disable(now = Date.now()): Promise<PushRecord & { cleanup: Lease }> {
    return this.store.transact((r) => {
      // Repeated logout broadcasts share the same pending disabled intent.
      if (!r.enabled && r.lease?.purpose === 'disable') return { generation: r.generation - 1, enabled: false, id: r.id, cleanup: structuredClone(r.lease) }
      const previous = structuredClone(r)
      const cleanup: Lease = { ...lease(previous.generation + 1, now), purpose: 'disable' }
      Object.keys(r).forEach((k) => delete r[k as keyof PushRecord])
      Object.assign(r, { generation: previous.generation + 1, enabled: false, lease: cleanup, ...(previous.id ? { id: previous.id } : {}) })
      return { ...previous, cleanup }
    })
  }
  finishDisable(server: boolean, browser: boolean, generation: number, owner?: Lease): Promise<void> {
    return this.store.transact((r) => {
      if (r.enabled || r.generation !== generation || (owner && !same(r.lease, owner))) return
      delete r.lease
      if (server) delete r.id
      if (server && browser) delete r.repair
      else r.repair = server ? 'remove_browser' : browser ? 'remove_server' : 'remove_server_and_browser'
    })
  }
  beginRenew(now = Date.now()): Promise<Lease> {
    return this.store.transact((r) => {
      if (!r.enabled || !r.id || !r.endpoint) throw new Error('Enable again to renew this registration.')
      if (r.lease && r.lease.until > now) throw new Error('Notification operation busy; retry shortly.')
      const owned = lease(r.generation, now)
      r.lease = owned
      return owned
    })
  }
  release(attempt: Lease): Promise<void> {
    return this.store.transact((r) => { if (same(r.lease, attempt)) delete r.lease })
  }
  current(attempt: Lease): Promise<boolean> {
    return this.store.transact((r) => r.generation === attempt.generation && same(r.lease, attempt))
  }
  needsRepair(generation: number): Promise<void> {
    return this.store.transact((r) => {
      if (r.generation !== generation) return
      r.enabled = false; r.repair = 'reenable'; delete r.rotation; delete r.key; delete r.lease
    })
  }
  queueRotation(subscription: PushSubscribeRequest, now = Date.now(), generation?: number): Promise<boolean> {
    return this.store.transact((r) => {
      if (!r.enabled || !r.id || !r.endpoint || (generation !== undefined && r.generation !== generation)) return false
      const previous = r.rotation
      r.rotation = { oldEndpoint: previous?.oldEndpoint ?? r.endpoint, subscription,
        sequence: (previous?.sequence ?? 0) + 1, attempts: previous?.attempts ?? 0, nextAt: previous?.nextAt ?? now }
      return true
    })
  }

  async attempt(fetcher: typeof fetch = fetch, now = Date.now()): Promise<RotationResult> {
    const owned = await this.store.transact((r) => {
      if (!r.enabled || !r.rotation || r.rotation.nextAt > now || (r.lease && r.lease.until > now)) return null
      const attempt = lease(r.generation, now)
      r.lease = attempt
      return { attempt, id: r.id, rotation: structuredClone(r.rotation) }
    })
    if (!owned) return 'idle'
    const { attempt, rotation } = owned
    const body: PushRotateRequest = { old_endpoint: rotation.oldEndpoint, subscription: rotation.subscription }
    let status = 0, retryAfter = 0
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetcher('/api/push/subscriptions/rotate', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body), signal: controller.signal,
      })
      status = response.status
      const header = response.headers.get('Retry-After')
      retryAfter = header && /^\d+$/.test(header) ? Number(header) * 1000 : header ? Math.max(0, Date.parse(header) - now) : 0
      if (response.ok) {
        const item: unknown = await response.json()
        if (!item || typeof item !== 'object' || !('id' in item) || item.id !== owned.id) status = 0
      }
    } catch { status = 0 } finally { clearTimeout(timer) }
    return this.store.transact((r) => {
      if (!r.enabled || r.generation !== attempt.generation || !same(r.lease, attempt) || !r.rotation) return 'stale'
      delete r.lease
      if (status >= 200 && status < 300) {
        r.endpoint = rotation.subscription.endpoint
        if (r.rotation.sequence === rotation.sequence) delete r.rotation
        else { r.rotation.oldEndpoint = r.endpoint; r.rotation.attempts = 0; r.rotation.nextAt = now }
        delete r.repair
        return 'success'
      }
      if (status === 401) { r.repair = 'sign_in'; r.rotation.nextAt = now + 1000; return 'sign_in' }
      if (status && status !== 429 && status < 500) {
        r.enabled = false; r.repair = 'reenable'; delete r.rotation; delete r.key
        return 'reenable'
      }
      r.rotation.attempts = Math.min(16, r.rotation.attempts + 1)
      r.rotation.nextAt = now + Math.max(Math.min(3600000, retryAfter || 0), Math.min(60000, 1000 * 2 ** (r.rotation.attempts - 1)))
      r.repair = 'retry'
      return 'retry'
    })
  }
}

export class IndexedPushStore implements PushStore {
  async transact<T>(fn: (row: PushRecord) => T): Promise<T> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('hennery-push', 1)
      open.onupgradeneeded = () => open.result.createObjectStore('registration')
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(new Error('Notification storage unavailable.'))
      open.onblocked = () => reject(new Error('Notification storage blocked; close other hennery windows.'))
    })
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction('registration', 'readwrite'), store = tx.objectStore('registration')
        let result: T
        const read = store.get('current')
        read.onsuccess = () => {
          try {
            const row: PushRecord = read.result ?? { generation: 0, enabled: false }
            // Unknown schema or corrupt data never authorizes automatic renewal.
            if (!Number.isSafeInteger(row.generation) || typeof row.enabled !== 'boolean') throw new Error('Notification storage needs repair.')
            result = fn(row)
            store.put(row, 'current')
          } catch (err) { tx.abort(); reject(err) }
        }
        tx.oncomplete = () => resolve(result)
        tx.onabort = tx.onerror = () => reject(new Error('Notification storage write failed.'))
      })
    } finally { db.close() }
  }
}

export const pushJournal = () => new Journal(new IndexedPushStore())
