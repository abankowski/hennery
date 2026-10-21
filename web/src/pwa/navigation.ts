import { notificationTarget } from './notification'
import { appRoute } from './shell'

const LEASE_MS = 2000
type Lease = { id: string; target: string; until: number; navigating?: boolean }
/** Conservative: an edited document stays dirty until it closes. This also
 * protects drafts whose controls were unmounted, and images held in memory. */
export class NavigationGate {
  private dirty = false
  private mutations = 0
  private lease: Lease | null = null
  private frozen(now: number) { return this.lease !== null && (this.lease.navigating === true || this.lease.until > now) }
  edit(now = Date.now()): boolean {
    if (this.frozen(now)) return false
    this.dirty = true
    return true
  }
  mutation(now = Date.now()): () => void {
    if (this.frozen(now)) throw new Error('Opening a notification. Try again in a moment.')
    this.mutations++
    let finished = false
    return () => { if (!finished) { finished = true; this.mutations-- } }
  }
  reserve(id: string, target: string, until: number, now = Date.now()): boolean {
    if (this.dirty || this.mutations > 0 || this.frozen(now) || until <= now || until > now + LEASE_MS) return false
    this.lease = { id, target, until }
    return true
  }
  // Reload readiness checks draft durability separately from notification
  // navigation's sticky dirty bit. Both operations share the mutation fence.
  reserveUpdate(id: string, until: number, now = Date.now()): boolean {
    if (this.mutations > 0 || this.frozen(now) || until <= now || until > now + LEASE_MS) return false
    this.lease = { id, target: '', until }
    return true
  }
  release(id: string) { if (this.lease?.id === id) this.lease = null }
  begin(id: string, now = Date.now()): boolean {
    if (!this.lease || this.lease.id !== id || this.lease.until <= now) return false
    this.lease.navigating = true
    return true
  }
  expire(id: string): boolean {
    // Once navigate() may have an effect, only its settlement can release
    // ownership. A deadline cannot cancel a browser navigation.
    if (this.lease?.id === id && this.lease.navigating) return false
    this.release(id)
    return true
  }
  blocked(now = Date.now()) { return this.frozen(now) }
}
export const navigationGate = new NavigationGate()

export interface AppWindow {
  id: string; url: string; visibilityState?: string; focused?: boolean
  focus(): Promise<unknown>; navigate(url: string): Promise<AppWindow | null>
  postMessage(message: unknown, transfer?: Transferable[]): void
}
export interface Windows {
  matchAll(options: { type: 'window'; includeUncontrolled: boolean }): Promise<readonly AppWindow[]>
  openWindow(url: string): Promise<unknown>
}
function appTarget(url: string, origin: string): string | null {
  try {
    const u = new URL(url)
    if (u.origin !== origin || u.hash) return null
    const path = u.pathname + u.search
    return notificationTarget(path) === path || (appRoute(u.pathname) && !u.search) ? path : null
  } catch { return null }
}
type Reply = { version: 1; kind: 'navigation_ready'; id: string; target: string; until: number; ready: boolean; separate: boolean }
async function ready(client: AppWindow, target: string): Promise<{ reply: Reply; begin(): Promise<boolean>; release(): void } | null> {
  const id = crypto.randomUUID(), until = Date.now() + LEASE_MS
  const channel = new MessageChannel()
  const release = () => { channel.port1.postMessage({ version: 1, kind: 'navigation_release', id }); channel.port1.close() }
  return new Promise(resolve => {
    const timer = setTimeout(() => { release(); resolve(null) }, 500)
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const r = event.data as Partial<Reply> | null
      if (!r || r.version !== 1 || r.kind !== 'navigation_ready' || r.id !== id || r.target !== target || r.until !== until || typeof r.ready !== 'boolean' || typeof r.separate !== 'boolean') return
      clearTimeout(timer)
      if (Date.now() >= until) { release(); resolve(null) }
      else resolve({ reply: r as Reply, release, begin: () => new Promise<boolean>(started => {
        const deadline = setTimeout(() => started(false), Math.max(0, until - Date.now()))
        channel.port1.onmessage = event => {
          const m = event.data
          if (!m || m.version !== 1 || m.kind !== 'navigation_started' || m.id !== id || m.target !== target || m.until !== until || typeof m.started !== 'boolean') return
          clearTimeout(deadline)
          started(m.started && Date.now() < until)
        }
        channel.port1.postMessage({ version: 1, kind: 'navigation_start', id, target, until })
      }) })
    }
    try { client.postMessage({ version: 1, kind: 'navigation_prepare', id, target, until }, [channel.port2]) }
    catch { clearTimeout(timer); release(); resolve(null) }
  })
}

/** An OS may reuse a standalone context for openWindow. If an app window
 * cannot consent, deliver a link hint instead of risking its unsent input. */
export async function clickNotification(raw: unknown, clients: Windows, origin: string): Promise<void> {
  const target = notificationTarget(raw)
  const windows = (await clients.matchAll({ type: 'window', includeUncontrolled: false })).filter(c => appTarget(c.url, origin) !== null)
  const exact = windows.find(c => appTarget(c.url, origin) === target)
  if (exact) { await exact.focus().catch(() => {}); return }
  windows.sort((a, b) => Number(!!b.focused) - Number(!!a.focused) || Number(b.visibilityState === 'visible') - Number(a.visibilityState === 'visible'))
  let separate = windows.length > 0
  for (const client of windows) {
    const consent = await ready(client, target)
    if (!consent) { separate = false; continue }
    separate &&= consent.reply.separate
    if (!consent.reply.ready) { consent.release(); continue }
    try {
      // Re-enumerate after the handshake: the client may have navigated or
      // closed meanwhile. Ownership covers this exact client/document URL.
      const current = (await clients.matchAll({ type: 'window', includeUncontrolled: false })).find(c => c.id === client.id && c.url === client.url)
      if (!current || Date.now() >= consent.reply.until) continue
      if (!await consent.begin()) continue
      const owned = (await clients.matchAll({ type: 'window', includeUncontrolled: false })).find(c => c.id === client.id && c.url === client.url)
      if (!owned || Date.now() >= consent.reply.until) continue
      // Do not race this promise against expiry: timing out does not cancel
      // its eventual document replacement. The page holds until settlement.
      const navigated = await owned.navigate(target)
      if (navigated) { await navigated.focus().catch(() => {}); return }
    } catch { /* Release and offer the bounded fallback. */ }
    finally { consent.release() }
  }
  // Include uncontrolled auth/callback documents in the reuse decision,
  // but never ask them to navigate or overwrite them.
  const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  const own = all.filter(c => { try { return new URL(c.url).origin === origin } catch { return false } })
  const unchanged = own.length === windows.length && own.every(c => windows.some(w => w.id === c.id && w.url === c.url))
  if (own.length > 0 && !(separate && unchanged)) {
    for (const client of windows) {
      try { client.postMessage({ version: 1, kind: 'notification_target', target }) } catch { /* Closed. */ }
    }
    return
  }
  try { await clients.openWindow(target) } catch { /* Manual launch remains available. */ }
}

/** Only our active registration may request readiness or supply a hint. */
export function listenForNavigation(onHint: (target: string) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  let live = true
  const message = async (event: MessageEvent<unknown>) => {
    const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
    if (!live || !registration?.active || event.source !== registration.active) return
    const m = event.data as Record<string, unknown> | null
    if (!m || m.version !== 1) return
    if (m.kind === 'notification_target' && typeof m.target === 'string' && notificationTarget(m.target) === m.target) { onHint(m.target); return }
    if (m.kind !== 'navigation_prepare' || typeof m.id !== 'string' || m.id.length > 128 || typeof m.target !== 'string' || notificationTarget(m.target) !== m.target || typeof m.until !== 'number' || !Number.isFinite(m.until) || !event.ports[0]) return
    const port = event.ports[0]
    const allowed = appTarget(location.href, location.origin) !== null
    const ready = allowed && navigationGate.reserve(m.id, m.target, m.until)
    const id = m.id
    port.onmessage = e => {
      const data = e.data
      if (data?.version !== 1 || data?.id !== id) return
      if (data.kind === 'navigation_release') { navigationGate.release(id); port.close() }
      if (data.kind === 'navigation_start' && data.target === m.target && data.until === m.until) {
        port.postMessage({ version: 1, kind: 'navigation_started', id, target: m.target, until: m.until, started: ready && navigationGate.begin(id) })
      }
    }
    // Chromium's ordinary browser windows have separately opening targets,
    // exercised by the browser gate. Standalone and unknown platforms keep
    // the in-app hint: their OS may reuse the installed browsing context.
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    const separate = !standalone && /(?:Chrome|Chromium)\//.test(navigator.userAgent)
    port.postMessage({ version: 1, kind: 'navigation_ready', id, target: m.target, until: m.until, ready, separate })
    setTimeout(() => { if (navigationGate.expire(id)) port.close() }, Math.max(0, m.until - Date.now()))
  }
  navigator.serviceWorker.addEventListener('message', message)
  return () => { live = false; navigator.serviceWorker.removeEventListener('message', message) }
}

export function watchNavigationEdits(): void {
  const prevent = (e: Event) => {
    if (navigationGate.blocked()) { e.preventDefault(); e.stopImmediatePropagation() }
  }
  for (const name of ['pointerdown', 'click', 'keydown', 'submit', 'beforeinput', 'drop', 'paste']) document.addEventListener(name, prevent, true)
  for (const name of ['beforeinput', 'input', 'change', 'drop', 'paste']) document.addEventListener(name, () => { navigationGate.edit() }, true)
  document.addEventListener('click', event => {
    // Browser APIs such as permission prompts can precede their HTTP
    // mutation. Retain conservative ownership as soon as a control acts.
    if (event.target instanceof Element && event.target.closest('button,input,select,textarea')) navigationGate.edit()
  }, true)
  // Persisted composer text can predate this document's event listeners.
  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith('hennery.draft.') && sessionStorage.getItem(key)) navigationGate.edit() } catch { navigationGate.edit() }
}
