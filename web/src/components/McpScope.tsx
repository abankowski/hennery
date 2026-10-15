import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { McpConnectionItem } from '../generated/protocol'
import { useClient } from '../app-client'
import { connections } from '../api/mcp'
import { Unauthenticated, messageOf } from '../api/errors'
import { Link } from '../router'

interface Scope {
  data: McpConnectionItem[] | null; error: string | null; set: Dispatch<SetStateAction<McpConnectionItem[] | null>>
  refresh: () => Promise<McpConnectionItem[]>; waiting: (id: string, active: boolean) => void
}
const Context = createContext<Scope | null>(null)
export const useMcpScope = () => useContext(Context)

/** One reader for the badge and screen. The invalidation seam can later
 *  receive a push relay; no service worker is registered here. */
export default function McpScope({ children, active }: { children: ReactNode; active: boolean }) {
  const client = useClient()
  const [data, setData] = useState<McpConnectionItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const waits = useRef(new Set<string>())
  const epoch = useRef(0)
  const dirty = useRef(false)
  const pushDirty = useRef(false)
  const pending = useRef<Promise<McpConnectionItem[]> | null>(null)
  const controller = useRef(new AbortController())
  const refresh = useCallback((): Promise<McpConnectionItem[]> => {
    if (pending.current) return pending.current
    const signal = controller.current.signal
    const task = (async () => {
      let rows: McpConnectionItem[] = []
      try {
        do {
          dirty.current = false
          const observed = epoch.current
          try {
            rows = await connections(client, signal)
            if (!signal.aborted && observed === epoch.current) { setData(rows); setError(null) }
          } catch (err) {
            if (err instanceof Unauthenticated || !dirty.current || signal.aborted) throw err
          }
        } while (dirty.current && !signal.aborted)
        return rows
      } finally { if (controller.current.signal === signal) pending.current = null }
    })()
    pending.current = task
    void task.catch(err => { if (!signal.aborted && !(err instanceof Unauthenticated)) setError(messageOf(err)) })
    return task
  }, [client])
  const publish: Scope['set'] = useCallback(value => {
    epoch.current++; dirty.current = true; setData(value)
    void refresh().catch(() => {})
  }, [refresh])
  const waiting = useCallback((id: string, yes: boolean) => {
    if (yes) waits.current.add(id); else waits.current.delete(id)
    setPaused(waits.current.size > 0)
  }, [])
  useEffect(() => {
    controller.current = new AbortController(); pending.current = null; epoch.current++; setData(null)
    void refresh().catch(() => {})
    return () => { controller.current.abort(); epoch.current++ }
  }, [refresh])
  useEffect(() => {
    const read = () => {
      // A pending GET may have captured the state before this invalidation.
      // Retain one follow-up and keep that older result from being published.
      epoch.current++; dirty.current = true; pushDirty.current = false
      void refresh().catch(() => {})
    }
    const visible = () => { if (document.visibilityState === 'visible') read() }
    let live = true
    const relay = async (event: MessageEvent<unknown>) => {
      const m = event.data as Record<string, unknown> | null
      if (!m || m.version !== 1 || m.kind !== 'mcp_invalidated' || Object.keys(m).length !== 2) return
      const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
      if (!live || !registration?.active || event.source !== registration.active) return
      if (document.visibilityState === 'hidden') { pushDirty.current = true; return }
      read()
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', relay)
    window.addEventListener('focus', read); document.addEventListener('visibilitychange', visible)
    // Event reads remain enabled during consent; only timer reads pause.
    const timer = setInterval(() => { if (!paused && document.visibilityState === 'visible') read() }, active ? 60000 : 300000)
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', read); document.removeEventListener('visibilitychange', visible); if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', relay) }
  }, [active, paused, refresh])
  useEffect(() => { if (active) void refresh().catch(() => {}) }, [active, refresh])
  return <Context.Provider value={{ data, error, set: publish, refresh, waiting }}>{children}</Context.Provider>
}

export function McpBadge({ link = false }: { link?: boolean } = {}) {
  const scope = useMcpScope()
  const auth = scope?.data?.filter(c => c.status === 'needs_auth').length ?? 0
  const errors = scope?.data?.filter(c => c.status === 'error').length ?? 0
  if (auth + errors === 0) return null
  const badge = <span className="mcp-attention" aria-label={`${auth} may need sign-in, ${errors} are failing, from the last gateway report`}><span className={auth > 0 ? 'mcp-auth-count' : 'mcp-error-count'}>{auth + errors} need attention</span></span>
  return link ? <Link to="/mcp" className="mcp-attention-link">{badge}</Link> : badge
}
