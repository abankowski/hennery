import { useEffect, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { summaries } from '../api/view'
import { needsOperator } from '../lib/status'
import type { SessionSummary } from '../generated/view'
import type { SessionList } from '../store/useSessionList'

/** Overview lifecycle/search filters must not hide closed operator work.
 * Fill missing attention from unfiltered pages, sharing the existing stream. */
export function useAttentionSessions(list: SessionList, hat: string) {
  const client = useClient()
  const [extra, setExtra] = useState<{ hat: string; rows: SessionSummary[] }>({ hat, rows: [] })
  const held = useRef<{ hat: string; rows: Map<string, SessionSummary> }>({ hat, rows: new Map() })
  if (held.current.hat !== hat) held.current = { hat, rows: new Map() }
  const all = new Map(held.current.rows)
  if (extra.hat === hat) for (const row of extra.rows) if (!all.has(row.session_id)) all.set(row.session_id, row)
  for (const [id, row] of list.all) all.set(id, row)
  if (!list.loading && list.counts.waiting === 0) all.clear()
  held.current.rows = all
  const rows = [...all.values()].filter(row => (!hat || row.hat_id === hat) && needsOperator(row)).sort((a, b) => b.last_event_at.localeCompare(a.last_event_at) || b.session_id.localeCompare(a.session_id))
  // The dedicated attention baseline already pages through the queue's
  // bounded scan. Only restrictive overview queries need this fill read.
  const restrictive = list.queryKey.includes('"lifecycle"') || list.queryKey.includes('"q"')
  const missing = !list.loading && rows.length < list.counts.waiting && restrictive && !list.queryKey.includes('"scope":"attention"')
  useEffect(() => {
    if (!missing) return
    const abort = new AbortController()
    const read = async () => {
      let cursor: string | undefined
      const found = new Map<string, SessionSummary>()
      const visited = new Set<string>()
      let pages = 0
      do {
        pages++
        const page = await summaries(client, { hat: hat || undefined, cursor, limit: 100 }, abort.signal)
        for (const row of page.sessions) if (needsOperator(row)) found.set(row.session_id, row)
        cursor = page.next_cursor
        if (!abort.signal.aborted) setExtra({ hat, rows: [...found.values()] })
        if (found.size >= list.counts.waiting || !cursor || visited.has(cursor) || pages === 3) break
        visited.add(cursor)
      } while (!abort.signal.aborted)
    }
    void read().catch(() => { /* Count only cards actually available to show. */ })
    return () => abort.abort()
  }, [client, hat, list.queryKey, list.counts.waiting, list.loading])
  return rows
}
