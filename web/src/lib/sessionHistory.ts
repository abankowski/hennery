import { useMemo, useSyncExternalStore } from 'react'
import type { SessionSummary } from '../generated/view'

export const SESSION_HISTORY_KEY = 'hennery.visitedSessions'
export const WINDOW_SESSION_KEY = 'hennery.windowSessions'
export const SESSION_HISTORY_LIMIT = 50
export const RECENT_SESSION_LIMIT = 6
const listeners = new Set<() => void>()
let volatile: string | undefined
let windowVolatile: string | undefined
const windowSnapshot = () => { if (windowVolatile !== undefined) return windowVolatile; try { return sessionStorage.getItem(WINDOW_SESSION_KEY) ?? '[]' } catch { return '[]' } }
const snapshot = () => { if (volatile !== undefined) return volatile; try { return localStorage.getItem(SESSION_HISTORY_KEY) ?? '[]' } catch { return '[]' } }
const notify = () => listeners.forEach(listener => listener())
export function parseSessionHistory(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    // The server creates session ids with Uuid::now_v7() (sessions/api.rs).
    // Validate their UUID shape here; persisted ids must never become arbitrary
    // LIKE searches. Keep other UUID versions readable for older/imported ids.
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))].slice(0, SESSION_HISTORY_LIMIT) : []
  } catch { return [] }
}
function write(ids: readonly string[]) {
  const text = JSON.stringify(ids)
  if (text === snapshot()) return
  try { localStorage.setItem(SESSION_HISTORY_KEY, text); volatile = undefined } catch { volatile = text }
  notify()
}
export function visitSession(id: string) {
  const held = parseSessionHistory(windowSnapshot())
  if (held[0] !== id) {
    const text = JSON.stringify(parseSessionHistory(JSON.stringify([id, ...held.filter(other => other !== id)])).slice(0, 2))
    try { sessionStorage.setItem(WINDOW_SESSION_KEY, text); windowVolatile = undefined } catch { windowVolatile = text }
    notify()
  }
  write(parseSessionHistory(JSON.stringify([id, ...parseSessionHistory(snapshot()).filter(held => held !== id)])))
}
export function forgetVisitedSession(id: string) { write(parseSessionHistory(snapshot()).filter(held => held !== id)) }
export function clearSessionHistory() {
  windowVolatile = undefined
  try { sessionStorage.removeItem(WINDOW_SESSION_KEY) } catch { windowVolatile = '[]' }
  volatile = undefined
  try { localStorage.removeItem(SESSION_HISTORY_KEY) } catch { volatile = '[]' }
  notify()
}
export function useWindowSessionIds() {
  const value = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, windowSnapshot)
  return useMemo(() => parseSessionHistory(value), [value])
}
export function useVisitedSessionIds() {
  const value = useSyncExternalStore(listener => {
    listeners.add(listener)
    window.addEventListener('storage', listener)
    return () => { listeners.delete(listener); window.removeEventListener('storage', listener) }
  }, snapshot)
  return useMemo(() => parseSessionHistory(value), [value])
}
/** Unknown ids are hidden, not removed: a filtered/paginated list is not an
 * authorization verdict. Only an authoritative read/removal prunes history. */
export function visitedSessions(ids: readonly string[], rows: ReadonlyMap<string, SessionSummary>, hat = '') {
  return ids.flatMap(id => {
    const row = rows.get(id)
    return row && (!hat || row.hat_id === hat) ? [row] : []
  })
}
export function recentSessionTargets(rows: readonly SessionSummary[], selectedId: string | null) {
  return rows.filter(row => row.session_id !== selectedId).slice(0, 5)
}
/** Each window keeps its current session first even when another window
 * changes the browser's shared visit order. */
export function sidebarSessions(rows: readonly SessionSummary[], selectedId: string | null) {
  const current = rows.find(row => row.session_id === selectedId)
  return current ? [current, ...recentSessionTargets(rows, selectedId)] : rows.slice(0, RECENT_SESSION_LIMIT)
}
