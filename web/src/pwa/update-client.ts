import { hasHeldImages } from '../lib/attachments'
import { hasUnstoredDrafts } from '../lib/drafts'
import { hasSends } from '../lib/sending'
import { navigationGate, type NavigationGate } from './navigation'
import { appRoute } from './shell'
import { UPDATE_BOUND, UPDATE_BUSY } from './update'

/** Generic form edits stay conservative even after the control unmounts.
 * Persisted composer text is checked at its storage boundary instead. */
export class UpdateReadiness {
  private edited = false
  revision = 0
  constructor(private gate: NavigationGate, private volatile: () => boolean, private sending: () => boolean) {}
  edit() { this.edited = true; this.revision++ }
  losses() { return this.edited || this.volatile() }
  reserve(id: string, until: number, initiator: boolean) {
    const editing = typeof document !== 'undefined' && document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')
    if (this.sending() || (!initiator && (this.losses() || editing))) return false
    return this.gate.reserveUpdate(id, until)
  }
}
export const updateReadiness = new UpdateReadiness(navigationGate, () => hasHeldImages() || hasUnstoredDrafts(), hasSends)

/** Installed once at startup, including routes outside the React shell. */
export function listenForUpdates(reload = () => location.reload()): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  let live = true, reloaded = false
  let armed: { id: string; worker: ServiceWorker } | null = null
  const changed = () => {
    if (!armed || reloaded || navigator.serviceWorker.controller !== armed.worker) return
    reloaded = true
    reload()
  }
  const message = async (event: MessageEvent) => {
    const m = event.data
    if (m?.version !== 1 || m.kind !== 'update_prepare' || typeof m.id !== 'string' || m.id.length > 128 || typeof m.until !== 'number' || !Number.isFinite(m.until) || typeof m.initiator !== 'boolean' || !event.ports[0]) return
    const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
    if (!live || !registration?.waiting || event.source !== registration.waiting) return
    const worker = registration.waiting, port = event.ports[0], id = m.id
    // A request flag alone is not consent: only this page's own button can
    // authorize discarding its volatile state for the current waiting worker.
    const initiator = m.initiator && requestedWorker === worker && requestedRevision === updateReadiness.revision && requestedLosses === updateReadiness.losses()
    const ready = appRoute(location.pathname) && updateReadiness.reserve(id, m.until, initiator)
    port.onmessage = e => {
      if (e.data?.version !== 1 || e.data.id !== id) return
      if (e.data.kind === 'update_release') {
        if (armed?.id === id) armed = null
        navigationGate.release(id); port.close()
      }
      if (e.data.kind === 'update_commit') {
        const committed = ready && navigationGate.begin(id)
        if (committed) armed = { id, worker }
        port.postMessage({ version: 1, kind: 'update_commit_reply', id, ready: committed })
      }
    }
    port.postMessage({ version: 1, kind: 'update_prepare_reply', id, ready })
    setTimeout(() => { if (navigationGate.expire(id)) port.close() }, Math.max(0, m.until - Date.now()))
  }
  const edit = (event: Event) => {
    if (!(event.target instanceof Element) || event.target.closest('[data-persisted-draft]')) return
    updateReadiness.edit()
  }
  for (const name of ['input', 'change', 'drop', 'paste']) document.addEventListener(name, edit, true)
  navigator.serviceWorker.addEventListener('message', message)
  navigator.serviceWorker.addEventListener('controllerchange', changed)
  return () => {
    live = false
    for (const name of ['input', 'change', 'drop', 'paste']) document.removeEventListener(name, edit, true)
    navigator.serviceWorker.removeEventListener('message', message)
    navigator.serviceWorker.removeEventListener('controllerchange', changed)
  }
}

let requestedWorker: ServiceWorker | null = null
let requestedRevision = 0, requestedLosses = false
export async function requestUpdate(registration: ServiceWorkerRegistration | null, confirm = (text: string) => window.confirm(text)): Promise<string | null> {
  const worker = registration?.waiting
  if (!worker) return null
  if (requestedWorker) return 'Checking other hennery windows…'
  if (updateReadiness.losses() && !confirm('Reload to update? Unsent images, question input, text that could not be saved and other unsaved form edits in this window will be lost. Saved text drafts will be preserved.')) return 'Update postponed. Your unsent input is still here.'
  requestedWorker = worker
  requestedRevision = updateReadiness.revision
  requestedLosses = updateReadiness.losses()
  const channel = new MessageChannel()
  try {
    return await new Promise<string | null>(resolve => {
      const timer = setTimeout(() => resolve(UPDATE_BUSY), UPDATE_BOUND + 1000)
      channel.port1.onmessage = event => {
        if (event.data?.version !== 1 || event.data.kind !== 'update_result' || typeof event.data.ready !== 'boolean') return
        clearTimeout(timer); resolve(event.data.ready ? null : UPDATE_BUSY)
      }
      try { worker.postMessage({ version: 1, kind: 'update_request' }, [channel.port2]) }
      catch { clearTimeout(timer); resolve('Update could not start. Retry worker setup.') }
    })
  } finally { channel.port1.close(); requestedWorker = null }
}
