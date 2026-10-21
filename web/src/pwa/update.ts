import type { AppWindow, Windows } from './navigation'
import { appRoute } from './shell'

export const UPDATE_BUSY = 'Another hennery window is busy — finish or close it, then retry.'
export const UPDATE_SILENT = 'Another hennery window did not respond (it may be in the background — open or close it)'
export const UPDATE_BOUND = 1500
export type UpdateReason = 'busy' | 'silent' | 'self-sending' | 'self-changed'
type Reply = { ready: boolean; reason?: UpdateReason }
type Participant = { client: AppWindow; port: MessagePort; ask(kind: string): Promise<Reply | null>; release(): void }
function participant(client: AppWindow, id: string, until: number, initiator: boolean): Participant {
  const { port1: port, port2 } = new MessageChannel()
  const ask = (kind: string) => new Promise<Reply | null>(resolve => {
    const timer = setTimeout(() => resolve(null), Math.max(0, Math.min(500, until - Date.now())))
    port.onmessage = event => {
      const m = event.data
      if (m?.version !== 1 || m.id !== id || m.kind !== `${kind}_reply` || typeof m.ready !== 'boolean') return
      clearTimeout(timer); resolve(Date.now() < until ? { ready: m.ready, reason: m.reason } : null)
    }
    try {
      if (kind === 'update_prepare') client.postMessage({ version: 1, kind, id, until, initiator }, [port2])
      else port.postMessage({ version: 1, kind, id })
    } catch { clearTimeout(timer); resolve(null) }
  })
  return { client, port, ask, release() { port.postMessage({ version: 1, kind: 'update_release', id }); port.close() } }
}

/** Includes uncontrolled app documents, but no attachment/auth/proxy pages. */
export async function coordinateUpdate(clients: Windows, origin: string, sourceId: string, activate: () => Promise<void>, report: (reason: UpdateReason) => void = () => {}): Promise<boolean> {
  const windows = async () => (await clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(c => { const u = new URL(c.url); return u.origin === origin && appRoute(u.pathname) })
  const initial = await windows()
  if (!initial.some(c => c.id === sourceId)) return false
  const id = crypto.randomUUID(), until = Date.now() + UPDATE_BOUND
  const peers = initial.map(c => participant(c, id, until, c.id === sourceId))
  let activated = false
  const unchanged = async () => {
    const current = await windows()
    return current.length === initial.length && current.every(c => initial.some(old => old.id === c.id && old.url === c.url))
  }
  const phase = async (kind: string) => {
    const replies = await Promise.all(peers.map(p => p.ask(kind)))
    const index = replies.findIndex(reply => !reply?.ready)
    if (index < 0) return true
    const reply = replies[index]
    report(!reply ? 'silent' : peers[index].client.id === sourceId ? reply.reason === 'self-sending' ? 'self-sending' : 'self-changed' : 'busy')
    return false
  }
  try {
    if (!await phase('update_prepare')) return false
    if (!await unchanged()) return false
    if (!await phase('update_commit')) return false
    if (!await unchanged() || Date.now() >= until) return false
    await activate()
    activated = true
    return true
  } finally {
    for (const peer of peers) {
      if (!activated) peer.release()
      else peer.port.close()
    }
  }
}
