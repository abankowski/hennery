import { useEffect, useMemo, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { summaries } from '../api/view'
import { ApiFailure } from '../api/errors'
import type { SessionSummary } from '../generated/view'
import { forgetVisitedSession, useVisitedSessionIds, visitSession, visitedSessions } from '../lib/sessionHistory'

function retryDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const finish = () => { signal.removeEventListener('abort', cancel); resolve() }
    const timer = setTimeout(finish, ms)
    const cancel = () => { clearTimeout(timer); finish() }
    signal.addEventListener('abort', cancel, { once: true })
    if (signal.aborted) cancel()
  })
}

/** Keep ids only on disk. Rehydrate authorized summaries beyond the current
 * list's filters/pages without adding a second list stream. */
export function useSessionHistory(loaded: ReadonlyMap<string, SessionSummary>, selectedId: string | null, hat: string, ready = true, refreshKey = '', baselineKey = '') {
  const client = useClient(), ids = useVisitedSessionIds()
  const [resolved, setResolved] = useState<ReadonlyMap<string, SessionSummary>>(new Map())
  const latestLoaded = useRef(loaded)
  latestLoaded.current = loaded
  const latestHat = useRef(hat)
  latestHat.current = hat
  const verified = useRef(new Map<string, string>())
  const failures = useRef(new Map<string, { key: string; count: number; retryAt: number }>())
  const previousBaseline = useRef({ key: baselineKey, hat })
  const [scopeVersion, invalidateScope] = useState(0)
  const previousIds = useRef(ids)
  // A new filtered baseline may briefly become loading again. It must not
  // cancel hydration or turn a search into a history refresh.
  const [hydrationReady, setHydrationReady] = useState(ready)
  useEffect(() => { if (ready) setHydrationReady(true) }, [ready])
  const cached = useRef(resolved)
  cached.current = resolved
  const wanted = [...new Set([...ids, ...(selectedId ? [selectedId] : [])])].sort()
  const heldCandidates = useRef(wanted)
  // Only membership changes restart reads. MRU reordering from another
  // window, or leaving an already visited session, keeps pending reads alive.
  if (wanted.length !== heldCandidates.current.length || wanted.some((id, index) => id !== heldCandidates.current[index])) heldCandidates.current = wanted
  const candidates = heldCandidates.current
  useEffect(() => {
    const removed = previousIds.current.filter(id => !ids.includes(id))
    previousIds.current = ids
    for (const id of removed) { verified.current.delete(id); failures.current.delete(id) }
    setResolved(before => {
      const next = new Map(before)
      for (const id of removed) next.delete(id)
      // Carry stream updates across later filtered baselines as well. A hat
      // reassignment must never fall back to an older hydrated summary.
      for (const id of ids) {
        const row = loaded.get(id), held = next.get(id)
        if (row && (!held || row.last_event_at >= held.last_event_at)) next.set(id, row)
      }
      return next.size === before.size && [...next].every(([id, row]) => before.get(id) === row) ? before : next
    })
  }, [ids, loaded])
  useEffect(() => {
    if (!ready) return
    const before = previousBaseline.current
    previousBaseline.current = { key: baselineKey, hat }
    if (before.key === baselineKey || !before.hat) return
    // The scoped stream broadcasts other-hat removals while connected, but a
    // new query anchor can skip a deletion outside the previous baseline.
    // Recheck only newly included cached rows absent from the accepted page.
    const expired = [...cached.current].filter(([id, row]) => row.hat_id !== before.hat && (!hat || row.hat_id === hat) && !loaded.has(id)).map(([id]) => id)
    if (!expired.length) return
    for (const id of expired) { verified.current.delete(id); failures.current.delete(id) }
    setResolved(rows => { const next = new Map(rows); for (const id of expired) next.delete(id); return next })
    invalidateScope(version => version + 1)
  }, [ready, baselineKey, hat, loaded])
  useEffect(() => {
    if (!hydrationReady) return
    const abort = new AbortController()
    // The id search returns the same summary contract as the stream. Exact
    // id comparison prevents fuzzy title/path matches from restoring a visit.
    const resolve = async (id: string, lookup: { cursor?: string; cursors: Set<string>; pages: number } = { cursors: new Set(), pages: 0 }): Promise<void> => {
      if (abort.signal.aborted) return
      const known = latestLoaded.current.get(id) ?? cached.current.get(id)
      if (latestHat.current && known && known.hat_id !== latestHat.current) return
      if (latestLoaded.current.has(id)) { verified.current.set(id, refreshKey); return }
      if (verified.current.get(id) === refreshKey) return
      const failed = failures.current.get(id)
      if (failed?.key === refreshKey) {
        if (failed.count >= 2) return
        await retryDelay(Math.max(0, failed.retryAt - Date.now()), abort.signal)
        if (abort.signal.aborted) return
      }
      try {
        do {
          const page = await summaries(client, { q: id, limit: 100, cursor: lookup.cursor }, abort.signal)
          if (abort.signal.aborted) return
          lookup.pages++
          const row = page.sessions.find(row => row.session_id === id)
          if (row) {
            verified.current.set(id, refreshKey)
            setResolved(before => {
              const held = before.get(id), live = latestLoaded.current.get(id)
              let newest = held && held.last_event_at >= row.last_event_at ? held : row
              if (live && live.last_event_at >= newest.last_event_at) newest = live
              return new Map(before).set(id, newest)
            })
            return
          }
          lookup.cursor = page.next_cursor
          if (lookup.cursor && (lookup.cursors.has(lookup.cursor) || lookup.pages >= 3)) { verified.current.set(id, refreshKey); return }
          if (lookup.cursor) lookup.cursors.add(lookup.cursor)
        } while (lookup.cursor)
        verified.current.set(id, refreshKey)
        forgetVisitedSession(id)
      } catch (error) {
        if (abort.signal.aborted) return
        if (error instanceof ApiFailure && [403, 404].includes(error.status)) {
          verified.current.set(id, refreshKey)
          forgetVisitedSession(id)
          return
        }
        // Transient errors are not authorization verdicts. One bounded retry
        // retains the four-worker limit and is cancelled with this reader.
        const before = failures.current.get(id)
        const count = before?.key === refreshKey ? before.count + 1 : 1
        failures.current.set(id, { key: refreshKey, count, retryAt: Date.now() + 500 })
        if (count < 2) await resolve(id, lookup)
      }
    }
    const queue = candidates.values()
    const worker = async () => { for (const id of queue) { if (abort.signal.aborted) return; await resolve(id) } }
    void Promise.all(Array.from({ length: Math.min(4, candidates.length) }, worker))
    return () => abort.abort()
  }, [client, candidates, hydrationReady, refreshKey, scopeVersion])
  const rows = useMemo(() => {
    const merged = new Map(resolved)
    for (const [id, row] of loaded) {
      const held = merged.get(id)
      if (!held || row.last_event_at >= held.last_event_at) merged.set(id, row)
    }
    return merged
  }, [loaded, resolved])
  const visitedRoute = useRef<string | null>(null)
  const selected = selectedId ? rows.get(selectedId) : undefined
  useEffect(() => {
    if (!selectedId) { visitedRoute.current = null; return }
    if (selected && visitedRoute.current !== selectedId) {
      visitedRoute.current = selectedId
      visitSession(selectedId)
    }
  }, [selectedId, selected])
  return useMemo(() => visitedSessions(ids, rows, hat), [ids, rows, hat])
}
