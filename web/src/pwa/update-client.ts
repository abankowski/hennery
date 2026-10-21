import { useSyncExternalStore } from 'react'
import { hasHeldImages } from '../lib/attachments'
import { hasUnstoredDrafts } from '../lib/drafts'
import { hasSends } from '../lib/sending'
import { navigationGate, type NavigationGate } from './navigation'
import { updateRoute } from '../routes'
import { UPDATE_BOUND, UPDATE_BUSY, UPDATE_SILENT, type UpdateReason } from './update'
import { editRevision, finishUpdateSubmit, hasUpdateEdits, observeUpdateFocus, observeUpdateInput, observeUpdateSubmit } from './update-edits'

export const UPDATE_NOT_STARTED = 'Update did not start — retry'
export const UPDATE_STALE = 'This window is on an older version — reload'
export const COMMIT_DEADLINE = 5000
let notice = { message: '', stale: false }
const subscribers = new Set<() => void>()
const publish = (message: string, stale = false) => { notice = { message, stale: notice.stale || stale }; subscribers.forEach(fn => fn()) }
export const useUpdateNotice = () => useSyncExternalStore(fn => { subscribers.add(fn); return () => { subscribers.delete(fn) } }, () => notice)

export class UpdateReadiness {
  private edited = false
  private edits = 0
  get revision() { return this.edits + editRevision() }
  constructor(private gate: NavigationGate, private volatile: () => boolean, private sending: () => boolean) {}
  edit() { this.edited = true; this.edits++ }
  losses() { return this.edited || this.volatile() }
  sendingNow() { return this.sending() || this.gate.hasMutations() }
  reserve(id: string, until: number, initiator: boolean) {
    if (this.sendingNow() || (!initiator && this.losses())) return false
    return this.gate.reserveUpdate(id, until)
  }
}
export const updateReadiness = new UpdateReadiness(navigationGate, () => hasHeldImages() || hasUnstoredDrafts() || hasUpdateEdits(), hasSends)

/** Both controlled and first-install documents can consent. Activation is
 * observed on the worker itself because uncontrolled pages get no claim. */
export function listenForUpdates(reload = () => location.reload(), report = publish): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  let live = true, reloaded = false, previous = navigator.serviceWorker.controller
  let armed: { id: string; worker: ServiceWorker; cleanup(): void } | null = null
  const performReload = () => {
    if (reloaded) return
    reloaded = true; armed?.cleanup(); reload()
  }
  const changed = () => {
    const current = navigator.serviceWorker.controller
    if (armed && current === armed.worker) performReload()
    else if (previous && current !== previous && !reloaded) report(UPDATE_STALE, true)
    previous = current
  }
  const releases = new Set<() => void>()
  const message = async (event: MessageEvent) => {
    const m = event.data
    if (m?.version !== 1 || m.kind !== 'update_prepare' || typeof m.id !== 'string' || m.id.length > 128 || typeof m.until !== 'number' || !Number.isFinite(m.until) || typeof m.initiator !== 'boolean' || !event.ports[0]) return
    const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
    if (!live || !registration?.waiting || event.source !== registration.waiting) return
    const worker = registration.waiting, port = event.ports[0], id = m.id
    const initiator = m.initiator && requestedWorker === worker && requestedRevision === updateReadiness.revision && requestedLosses === updateReadiness.losses()
    const ready = updateRoute(location.pathname) && updateReadiness.reserve(id, m.until, initiator)
    let timer: ReturnType<typeof setTimeout> | undefined
    let released = false
    const cleanup = () => { clearTimeout(timer); worker.removeEventListener('statechange', state) }
    const release = () => {
      if (released) return
      released = true; clearTimeout(prepareTimer)
      cleanup(); if (armed?.id === id) armed = null
      navigationGate.release(id); port.close(); releases.delete(release)
    }
    const failed = () => { release(); report(UPDATE_NOT_STARTED, false) }
    const state = () => {
      if (armed?.id !== id) return
      if (worker.state === 'activated') performReload()
      else if (worker.state === 'redundant') failed()
    }
    releases.add(release)
    port.onmessage = e => {
      if (e.data?.version !== 1 || e.data.id !== id) return
      if (e.data.kind === 'update_release') release()
      if (e.data.kind === 'update_commit') {
        const committed = ready && worker.state !== 'redundant' && navigationGate.begin(id)
        if (committed) {
          armed = { id, worker, cleanup }
          worker.addEventListener('statechange', state)
          timer = setTimeout(failed, COMMIT_DEADLINE)
          state()
        }
        port.postMessage({ version: 1, kind: 'update_commit_reply', id, ready: committed })
      }
    }
    const reason = updateReadiness.sendingNow() ? 'self-sending' : m.initiator ? 'self-changed' : 'busy'
    port.postMessage({ version: 1, kind: 'update_prepare_reply', id, ready, ...(!ready ? { reason } : {}) })
    const prepareTimer = setTimeout(() => { if (armed?.id !== id) release() }, Math.max(0, m.until - Date.now()))
  }
  for (const name of ['input', 'change', 'drop', 'paste']) document.addEventListener(name, observeUpdateInput, true)
  document.addEventListener('submit', observeUpdateSubmit, true)
  document.addEventListener('submit', finishUpdateSubmit)
  document.addEventListener('focusin', observeUpdateFocus, true)
  navigator.serviceWorker.addEventListener('message', message)
  navigator.serviceWorker.addEventListener('controllerchange', changed)
  return () => {
    live = false; for (const release of [...releases]) release()
    for (const name of ['input', 'change', 'drop', 'paste']) document.removeEventListener(name, observeUpdateInput, true)
    document.removeEventListener('submit', observeUpdateSubmit, true)
    document.removeEventListener('submit', finishUpdateSubmit)
    document.removeEventListener('focusin', observeUpdateFocus, true)
    navigator.serviceWorker.removeEventListener('message', message)
    navigator.serviceWorker.removeEventListener('controllerchange', changed)
  }
}

let requestedWorker: ServiceWorker | null = null
let requestedRevision = 0, requestedLosses = false
const warning = 'Reload to update? Unsent images, question input, text that could not be saved and other unsaved form edits in this window will be lost. Saved text drafts will be preserved.'
const explanation = (reason?: UpdateReason) => reason === 'replaced' ? 'A newer update arrived — try again' : reason === 'silent' ? UPDATE_SILENT : reason === 'self-sending' ? 'This window has a send in progress — try again' : reason === 'self-changed' ? "This window's unsaved input changed — try again" : UPDATE_BUSY
export function reloadOlderWindow() {
  if (updateReadiness.sendingNow()) { publish(explanation('self-sending')); return }
  if (!updateReadiness.losses() || window.confirm(warning)) location.reload()
}
export async function requestUpdate(registration: ServiceWorkerRegistration | null, confirm = (text: string) => window.confirm(text)): Promise<string | null> {
  const worker = registration?.waiting
  if (!worker) return null
  if (updateReadiness.sendingNow()) return explanation('self-sending')
  if (requestedWorker) return 'Checking other hennery windows…'
  if (updateReadiness.losses() && !confirm(warning)) return 'Update postponed. Your unsent input is still here.'
  publish('')
  requestedWorker = worker; requestedRevision = updateReadiness.revision; requestedLosses = updateReadiness.losses()
  const channel = new MessageChannel()
  try {
    return await new Promise<string | null>(resolve => {
      const timer = setTimeout(() => resolve(UPDATE_SILENT), UPDATE_BOUND + 1000)
      channel.port1.onmessage = event => {
        if (event.data?.version !== 1 || event.data.kind !== 'update_result' || typeof event.data.ready !== 'boolean') return
        clearTimeout(timer); resolve(event.data.ready ? null : explanation(event.data.reason))
      }
      try { worker.postMessage({ version: 1, kind: 'update_request' }, [channel.port2]) }
      catch { clearTimeout(timer); resolve('Update could not start. Retry worker setup.') }
    })
  } finally { channel.port1.close(); requestedWorker = null }
}
