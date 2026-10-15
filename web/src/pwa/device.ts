import type { Client } from '../api/client'
import { removePush, subscribeDevice } from '../api/device'
import type { PushSubscriptionItem } from '../generated/protocol'
import type { Journal, Lease, PushRecord } from './journal'
import { matchesKey, subscriptionBody, vapidBytes } from './subscription'
import { withPushOwnership } from './ownership'

interface Inspection { subscription: PushSubscription | null; record: PushRecord; matches: boolean; stale?: boolean }
export type PushState = 'unsupported' | 'insecure' | 'blocked' | 'off' | 'unconfirmed' | 'reenable' | 'signed_out' | 'enabled'
export function classifyPush(input: { supported: boolean; secure: boolean; permission: NotificationPermission; subscribed: boolean; matches: boolean; record: PushRecord; row?: PushSubscriptionItem }): PushState {
  if (!input.secure) return 'insecure'
  if (!input.supported) return 'unsupported'
  if (input.permission === 'denied') return 'blocked'
  if (input.permission !== 'granted' || !input.subscribed) return 'off'
  if (!input.record.id || input.record.rotation) return 'unconfirmed'
  if (!input.record.enabled || !input.row || !input.matches) return 'reenable'
  if (input.row.signed_out) return 'signed_out'
  return 'enabled'
}

export class BrowserPush {
  constructor(private readonly client: Client, private readonly registration: ServiceWorkerRegistration,
    private readonly journal: Journal, private readonly key: string) {}

  async enable(label?: string): Promise<void> {
    const observed = await this.journal.read()
    return withPushOwnership(() => this.enableOwned(label, observed.generation))
  }
  private async enableOwned(label: string | undefined, observedGeneration: number): Promise<void> {
    if ((await this.journal.read()).generation !== observedGeneration) throw new Error('Enable was cancelled by another window.')
    if (label && ([...label].length > 64 || /[\p{C}]/u.test(label))) throw new Error('Use 1–64 printable characters for the device label.')
    const attempt = await this.journal.beginEnable()
    try {
      let subscription = await this.registration.pushManager.getSubscription()
      const check = async () => { if (!await this.journal.current(attempt)) throw new Error('Enable was cancelled by another window.') }
      await check()
      if (subscription && !matchesKey(subscription, this.key)) {
        if (!await subscription.unsubscribe()) throw new Error('The old browser subscription could not be removed.')
        subscription = null
      }
      await check()
      subscription ??= await this.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidBytes(this.key) })
      if (!await this.journal.current(attempt)) {
        await this.cleanupStale(subscription)
        throw new Error('Enable was cancelled by another window.')
      }
      const item = await subscribeDevice(this.client, subscriptionBody(subscription, label), check)
      if (!await this.journal.finishEnable(attempt, item.id, subscription.endpoint, this.key)) {
        const current = await this.journal.read()
        if (!current.enabled || current.id !== item.id) await removePush(this.client, { id: item.id })
        throw new Error('Enable was cancelled by another window. Check the current registration.')
      }
    } catch (err) { await this.journal.abortEnable(attempt); throw err }
  }
  private async cleanupStale(subscription: PushSubscription): Promise<void> {
    const current = await this.journal.read()
    if (!current.enabled || current.endpoint !== subscription.endpoint) await subscription.unsubscribe()
  }

  reconcile(rows: PushSubscriptionItem[], fetcher: typeof fetch = fetch, observedGeneration?: number): Promise<Inspection> {
    return withPushOwnership(() => this.reconcileOwned(rows, fetcher, observedGeneration))
  }
  private async reconcileOwned(rows: PushSubscriptionItem[], fetcher: typeof fetch, observedGeneration?: number): Promise<Inspection> {
    let record = await this.journal.read()
    const subscription = await this.registration.pushManager.getSubscription()
    const matches = !subscription || matchesKey(subscription, this.key)
    if (observedGeneration !== undefined && record.generation !== observedGeneration) return { subscription, record, matches, stale: true }
    if (record.enabled) {
      if (!rows.some((r) => r.id === record.id) || !matches || !subscription) await this.journal.needsRepair(record.generation)
      else {
        if (subscription.endpoint !== record.endpoint) await this.journal.queueRotation(subscriptionBody(subscription), Date.now(), record.generation)
        await this.journal.attempt(fetcher)
      }
      record = await this.journal.read()
    }
    return { subscription, record, matches }
  }

  renew(rows: PushSubscriptionItem[]): Promise<void> { return withPushOwnership(() => this.renewOwned(rows)) }
  private async renewOwned(rows: PushSubscriptionItem[]): Promise<void> {
    const previous = await this.journal.read()
    if (!previous.enabled || !rows.some((r) => r.id === previous.id)) throw new Error('Enable again to renew this removed device.')
    const owned = await this.journal.beginRenew()
    try {
      const old = await this.registration.pushManager.getSubscription()
      if (!old || !matchesKey(old, this.key)) throw new Error('Enable again to repair this subscription.')
      if (!await this.journal.current(owned)) throw new Error('Renewal cancelled by another window.')
      if (!await old.unsubscribe()) throw new Error('Browser renewal could not remove the old subscription.')
      if (!await this.journal.current(owned)) throw new Error('Renewal cancelled by another window.')
      const next = await this.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidBytes(this.key) })
      if (!await this.journal.current(owned)) { await this.cleanupStale(next); throw new Error('Renewal cancelled by another window.') }
      await this.journal.queueRotation(subscriptionBody(next), Date.now(), previous.generation)
      await this.journal.release(owned)
      const result = await this.journal.attempt()
      if (result !== 'success') throw new Error('Renewal is unconfirmed; retry or enable again in Settings.')
    } finally { await this.journal.release(owned) }
  }

  async disable(serverAlreadyRemoved = false): Promise<{ server: boolean; browser: boolean }> {
    let previous: PushRecord = { generation: 0, enabled: false }, owner: Lease | undefined, stored = true
    // Invalidate renewal immediately, even when its browser call holds the
    // origin lock. Cleanup then waits for those external effects to settle.
    try { const disabled = await this.journal.disable(); previous = disabled; owner = disabled.cleanup } catch { stored = false }
    return withPushOwnership(async () => {
      const current = async () => !owner || await this.journal.current(owner)
      if (!await current()) {
        const record = await this.journal.read()
        // A duplicate logout joined cleanup that already finished under this
        // generation. A newer enabled intent never counts as disabled.
        if (owner && record.generation === owner.generation && !record.enabled && !record.lease) return { server: !record.id, browser: !record.repair?.includes('browser') }
        return { server: false, browser: false }
      }
      let subscription: PushSubscription | null = null, server = serverAlreadyRemoved, browser = false, inspected = false
      try { subscription = await this.registration.pushManager.getSubscription(); inspected = true } catch { /* Still remove the remembered row. */ }
      if (!await current()) return { server: false, browser: false }
      if (!server) {
        try { await removePush(this.client, { id: previous.id, endpoint: previous.endpoint ?? subscription?.endpoint }); server = true }
        catch { /* Browser cleanup must still run. */ }
      }
      if (!await current()) return { server, browser: false }
      try { browser = inspected && (!subscription || await subscription.unsubscribe()) } catch { /* Report separately. */ }
      try {
        const notifications = await this.registration.getNotifications()
        if (!await current()) return { server, browser: false }
        for (const notification of notifications) notification.close()
      }
      catch { browser = false }
      if (stored) {
        try { await this.journal.finishDisable(server, browser, previous.generation + 1, owner) } catch { stored = false }
      }
      if (!stored) browser = false
      return { server, browser }
    })
  }
}
