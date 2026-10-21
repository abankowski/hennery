import type { AppWindow, Windows } from './navigation'
import { appRoute } from './shell'

export const UPDATE_BUSY = 'Another hennery window is busy — finish or close it, then retry.'
export const UPDATE_BOUND = 1500

type Participant = { client: AppWindow; port: MessagePort; ask(kind: string): Promise<boolean>; release(): void }
function participant(client: AppWindow, id: string, until: number, initiator: boolean): Participant {
  const { port1: port, port2 } = new MessageChannel()
  const ask = (kind: string) => new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), Math.max(0, Math.min(500, until - Date.now())))
    port.onmessage = event => {
      const m = event.data
      if (m?.version !== 1 || m.id !== id || m.kind !== `${kind}_reply` || typeof m.ready !== 'boolean') return
      clearTimeout(timer); resolve(m.ready && Date.now() < until)
    }
    try {
      if (kind === 'update_prepare') client.postMessage({ version: 1, kind, id, until, initiator }, [port2])
      else port.postMessage({ version: 1, kind, id })
    } catch { clearTimeout(timer); resolve(false) }
  })
  return { client, port, ask, release() { port.postMessage({ version: 1, kind: 'update_release', id }); port.close() } }
}

/** Runs in the waiting worker, under event.waitUntil. No page can activate
 * it without every current document completing both readiness phases. */
export async function coordinateUpdate(clients: Windows, origin: string, sourceId: string, activate: () => Promise<void>): Promise<boolean> {
  const windows = async () => (await clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(c => new URL(c.url).origin === origin)
  const initial = await windows()
  if (!initial.some(c => c.id === sourceId && appRoute(new URL(c.url).pathname))) return false
  const id = crypto.randomUUID(), until = Date.now() + UPDATE_BOUND
  const peers = initial.map(c => participant(c, id, until, c.id === sourceId))
  let activated = false
  const unchanged = async () => {
    const current = await windows()
    return current.length === initial.length && current.every(c => initial.some(old => old.id === c.id && old.url === c.url))
  }
  try {
    if (!(await Promise.all(peers.map(p => p.ask('update_prepare')))).every(Boolean)) return false
    if (!await unchanged()) return false
    if (!(await Promise.all(peers.map(p => p.ask('update_commit')))).every(Boolean)) return false
    if (Date.now() >= until || !await unchanged()) return false
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
