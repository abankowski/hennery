import { useEffect, useState } from 'react'
import { useClient } from '../app-client'
import type { EventDto } from '../generated/protocol'
import type { Item } from '../generated/view'

/** Successful turn ends are silent in the item projection. Read their real
 * event timestamps for the visible turns, without adding transcript items. */
export function useTurnEnds(id: string, items: readonly Item[], activity: string | undefined, loads: number) {
  const client = useClient()
  const [ends, setEnds] = useState<ReadonlyMap<string, string>>(new Map())
  const turns = [...new Set(items.flatMap(item => item.turn_id ? [item.turn_id] : []))].join('\n')
  useEffect(() => {
    if (!turns) return
    const abort = new AbortController()
    const latest = new Map<string, number>()
    for (const item of items) if (item.turn_id) latest.set(item.turn_id, Math.max(latest.get(item.turn_id) ?? 0, item.version))
    const read = async () => {
      let after = Math.max(0, Math.min(...latest.values()) - 1)
      const found = new Map<string, string>()
      while (!abort.signal.aborted) {
        const events = await client.request<EventDto[]>('GET', `/api/sessions/${encodeURIComponent(id)}/events?after=${after}&limit=500`, undefined, { signal: abort.signal })
        for (const event of events) {
          if (event.kind !== 'turn_ended' || !event.body || typeof event.body !== 'object') continue
          const body = event.body as Record<string, unknown>
          if (body.outcome === 'completed' && typeof body.turn_id === 'string' && latest.has(body.turn_id)) found.set(body.turn_id, event.ts)
        }
        const next = events.at(-1)?.event_id
        if (events.length < 500 || !Number.isSafeInteger(next) || next! <= after) break
        after = next!
      }
      if (!abort.signal.aborted) setEnds(before => new Map([...before, ...found]))
    }
    void read().catch(() => { /* Missing completion evidence never invents a divider. */ })
    return () => abort.abort()
    // Item text/version changes are token updates. Read on a turn/window or
    // activity boundary, rather than once per streaming chunk.
  }, [client, id, turns, activity, loads])
  return ends
}
