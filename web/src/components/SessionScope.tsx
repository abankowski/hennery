// The session list's state for the whole signed-in app (frontend spec §5;
// plan 4c decisions 8–11): one list store and one list stream, the filters,
// the hats and the host names. The rail, the mobile list screen and the
// session view's header all read it through `useSessionScope()`.
//
// It also owns what the list decides on its own:
// - the tab title `(N) hennery`, N = the hat's sessions waiting on you;
// - selection (F-11): the route's id is the selection, honoured even
//   outside the hat; a hat switch clears it; on a desktop, `/sessions` with no id opens the newest VISIBLE row.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useClient } from '../app-client'
import type { HatItem, HostItem } from '../generated/protocol'
import { usePersistentToggle } from '../hooks/usePersistentToggle'
import { readHat, themeOf, writeHat } from '../lib/hats'
import { saveTheme } from '../lib/theme'
import { navigate, useLocation, type Route } from '../router'
import { useSessionList, type SessionList } from '../store/useSessionList'
import type { StatusFilter } from '../lib/status'
import { useRegisterAction, useRegisterContext, type SessionJumpActionId } from '../app-actions'
import { useSessionHistory } from '../hooks/useSessionHistory'
import { recentSessionTargets, useWindowSessionIds } from '../lib/sessionHistory'
import type { ProjectGrouping, SessionGrouping, SessionSort } from '../lib/sessionGroups'
import { useDismissedAttention } from '../lib/dismissedAttention'
import { useAttentionSessions } from '../hooks/useAttentionSessions'
import type { SessionSummary } from '../generated/view'

export const HIDE_CLOSED_KEY = 'hennery.hideClosed'
/** How long typing rests before a search goes to the server. */
export const SEARCH_DEBOUNCE_MS = 250
/** The longest search the server takes (it refuses a longer one with 400).
 *  An input's `maxLength` counts UTF-16 units, never fewer than the
 *  server's characters, and the query is trimmed: a capped search is never
 *  too long. */
export const SEARCH_MAX_CHARS = 200

export interface SessionScopeValue {
  /** Recently visited, authorized sessions in the selected hat. */
  recentSessions: SessionSummary[]
  attentionRows: SessionSummary[]
  isAttentionDismissed: (id: string) => boolean
  reportAttentionKey: (id: string, key: string) => void
  list: SessionList
  /** The hats, or `null` until (or unless) they load. */
  hats: HatItem[] | null
  /** The selected hat's id, `''` for every hat. */
  hat: string
  chooseHat: (hat: string) => void
  /** Host names by host id, for the rows' second line. */
  hostNames: ReadonlyMap<string, string>
  hosts: HostItem[] | null
  host: string
  setHost: (host: string) => void
  status: StatusFilter
  setStatus: (status: StatusFilter) => void
  group: SessionGrouping
  setGroup: (group: SessionGrouping) => void
  subgroup: ProjectGrouping
  setSubgroup: (group: ProjectGrouping) => void
  sort: SessionSort
  setSort: (sort: SessionSort) => void
  hideClosed: boolean
  setHideClosed: (on: boolean) => void
  /** One lifecycle, or `''` for any. */
  lifecycle: string
  setLifecycle: (lifecycle: string) => void
  /** The search box as typed (the server gets it after a pause). */
  query: string
  setQuery: (q: string) => void
  /** The route's session id: the selection. */
  selectedId: string | null
}

const ScopeContext = createContext<SessionScopeValue | null>(null)

/** The session list's state, or `null` outside a deployment with sessions. */
export function useSessionScope(): SessionScopeValue | null {
  return useContext(ScopeContext)
}

function useDebounced(value: string, ms: number): string {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}

export function titleOf(waiting: number): string {
  return waiting > 0 ? `(${waiting}) hennery` : 'hennery'
}

export default function SessionScope({ route, children, onReconnect }: { route: Route; desktop?: boolean; children: ReactNode; onReconnect?: () => void }) {
  const client = useClient()
  const { search } = useLocation()
  const [hat, setHat] = useState(() => route.name === 'sessions' && new URLSearchParams(search).has('hat') ? new URLSearchParams(search).get('hat')! : readHat())
  const [hats, setHats] = useState<HatItem[] | null>(null)
  const [hostNames, setHostNames] = useState<ReadonlyMap<string, string>>(new Map())
  const [hosts, setHosts] = useState<HostItem[] | null>(null)
  const [host, setHost] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [group, updateGroup] = useState<SessionGrouping>(() => {
    try { return localStorage.getItem('hennery.group') === 'host' ? 'host' : 'hat' } catch { return 'hat' }
  })
  const setGroup = useCallback((next: SessionGrouping) => {
    updateGroup(next)
    try { localStorage.setItem('hennery.group', next) } catch { /* document only */ }
  }, [])
  const [subgroup, updateSubgroup] = useState<ProjectGrouping>(() => {
    try { return localStorage.getItem('hennery.subgroup') === 'none' ? 'none' : 'project' } catch { return 'project' }
  })
  const setSubgroup = useCallback((next: ProjectGrouping) => {
    updateSubgroup(next)
    try { localStorage.setItem('hennery.subgroup', next) } catch { /* In-memory choice still works. */ }
  }, [])
  const [sort, updateSort] = useState<SessionSort>(() => {
    try { const held = localStorage.getItem('hennery.sort'); return held === 'activity' || held === 'started' ? held : 'attention' } catch { return 'attention' }
  })
  const setSort = useCallback((next: SessionSort) => {
    updateSort(next)
    try { localStorage.setItem('hennery.sort', next) } catch { /* In-memory choice still works. */ }
  }, [])
  const [hideClosed, setHideClosed] = usePersistentToggle(HIDE_CLOSED_KEY, true)
  const [lifecycle, setLifecycle] = useState('')
  const [query, setQuery] = useState('')
  const q = useDebounced(query, SEARCH_DEBOUNCE_MS)
  const attention = route.name === 'needs-you'
  const list = useSessionList({ pageScope: attention ? 'attention' : 'overview', hat: hat || null, hideClosed: attention ? false : hideClosed, lifecycle: !attention && lifecycle ? [lifecycle] : undefined, q: attention ? '' : q })
  const recovering = useRef(false)
  const previouslyResynced = useRef(false)
  const [historyEpoch, refreshHistory] = useState(0)
  useEffect(() => {
    if (list.stream === 'reconnecting' || (list.resynced && !previouslyResynced.current)) recovering.current = true
    previouslyResynced.current = list.resynced
    if (list.stream === 'open' && recovering.current) {
      recovering.current = false
      refreshHistory(epoch => epoch + 1)
      onReconnect?.()
    }
  }, [list.stream, list.resynced, onReconnect])
  const attentionRows = useAttentionSessions(list, hat)
  const dismissed = useDismissedAttention()
  const [attentionKeys, setAttentionKeys] = useState<ReadonlyMap<string, string>>(new Map())
  const reportAttentionKey = useCallback((id: string, key: string) => setAttentionKeys(before => before.get(id) === key ? before : new Map(before).set(id, key)), [])
  const isAttentionDismissed = useCallback((id: string) => !list.all.get(id)?.review && !attentionRows.find(row => row.session_id === id)?.review && Object.hasOwn(dismissed, id) && (!attentionKeys.has(id) || dismissed[id] === attentionKeys.get(id)), [dismissed, attentionKeys, list.all, attentionRows])
  const visibleWaiting = attentionRows.filter(row => !isAttentionDismissed(row.session_id)).length
  const selectedId = route.name === 'session' && route.id !== undefined ? route.id : null
  const recentSessions = useSessionHistory(list.all, selectedId, hat, !list.loading && !list.error, String(historyEpoch), list.queryKey)
  const windowIds = useWindowSessionIds()
  const previousSessionId = windowIds.find(id => id !== selectedId && recentSessions.some(row => row.session_id === id))
  useRegisterContext({ loadedSessions: list.all, scopeHatId: hat, recentSessions, previousSessionId, hats: hats ?? undefined, hosts: hosts ?? undefined })
  useEffect(() => {
    if (route.name !== 'sessions') return
    const params = new URLSearchParams(search)
    if (params.has('hat')) { const next = params.get('hat')!; setHat(next); writeHat(next) }
  }, [route.name, search])

  // Hats and hosts: on mount, and again on leaving /hats or /hosts, the
  // screens that change them (a new or recoloured hat, a renamed or revoked
  // host), even for the other one (the rail shows the hats on both). No
  // event refetches them, and nothing here refetches the list (F-4).
  const [reads, setReads] = useState(0)
  const routeBefore = useRef(route.name)
  useEffect(() => {
    const before = routeBefore.current
    routeBefore.current = route.name
    if (before !== route.name && (before === 'hats' || before === 'hosts')) setReads((n) => n + 1)
  }, [route.name])
  useEffect(() => {
    let live = true
    client.request<HatItem[]>('GET', '/api/hats').then(
      (items) => live && Array.isArray(items) && setHats(items),
      () => {
        // Without the hats the switch offers every hat only, and the
        // colours stay as saved.
      },
    )
    client.request<HostItem[]>('GET', '/api/hosts').then(
      (items) => {
        if (!live || !Array.isArray(items)) return
        setHosts(items)
        setHostNames(new Map(items.map((h) => [h.host_id, h.name])))
      },
      () => {
        // The rows show no host name.
      },
    )
    return () => {
      live = false
    }
  }, [client, reads])

  // A remembered hat that no longer exists falls back to every hat.
  useEffect(() => {
    if (hats && hat !== '' && !hats.some((h) => h.id === hat)) {
      setHat('')
      writeHat('')
    }
  }, [hats, hat])

  // The hat's colour, once the hats are known (never before: that would
  // wipe the saved colours on every load).
  useEffect(() => {
    if (!hats) return
    saveTheme(themeOf(hats.find((h) => h.id === hat)?.colour))
  }, [hats, hat])

  // The hat's count, kept through a search or a lifecycle filter: the
  // server's, or the rows' that the list store carries (`waitingCount`).
  const waiting = visibleWaiting
  useEffect(() => {
    document.title = titleOf(waiting)
  }, [waiting])
  useEffect(() => () => void (document.title = 'hennery'), [])

  // A hat switch clears the selection, whatever hat the session is in: back
  // to `/sessions`, where a desktop then opens the new hat's newest row.
  const chooseHat = useCallback(
    (next: string) => {
      if (next === hat) return
      if (selectedId !== null || (route.name === 'sessions' && new URLSearchParams(search).has('hat'))) navigate('/sessions')
      setHat(next)
      writeHat(next)
    },
    [hat, selectedId, route.name, search],
  )

  const value = useMemo<SessionScopeValue>(
    () => ({
      recentSessions,
      list: { ...list, counts: { waiting: visibleWaiting } },
      attentionRows, isAttentionDismissed, reportAttentionKey,
      hats,
      hat,
      chooseHat,
      hostNames,
      hosts, host, setHost, status, setStatus, group, setGroup, subgroup, setSubgroup, sort, setSort,
      hideClosed,
      setHideClosed,
      lifecycle,
      setLifecycle,
      query,
      setQuery,
      selectedId,
    }),
    [list, recentSessions, visibleWaiting, attentionRows, isAttentionDismissed, reportAttentionKey, hats, hat, chooseHat, hostNames, hosts, host, status, group, setGroup, subgroup, setSubgroup, sort, setSort, hideClosed, setHideClosed, lifecycle, query, selectedId],
  )
  const targets = recentSessionTargets(recentSessions)
  return <ScopeContext.Provider value={value}>
    <SessionJumpAction id="previous-session" target={recentSessions.find(row => row.session_id === previousSessionId)} />
    {([1, 2, 3, 4, 5] as const).map((n) => <SessionJumpAction key={n} id={`recent-session-${n}`} target={targets[n - 1]} />)}
    {children}
  </ScopeContext.Provider>
}

function SessionJumpAction({ id, target }: { id: SessionJumpActionId; target?: SessionSummary }) {
  const sessionId = target?.session_id
  const run = useCallback(() => { if (sessionId) navigate(`/sessions/${encodeURIComponent(sessionId)}`) }, [sessionId])
  useRegisterAction(id, { label: id === 'previous-session' ? 'Previous session' : `Recent session ${id.slice(-1)}`, enabled: !!sessionId, run })
  return null
}

/** The rail's and the top bar's count of sessions waiting on you. */
export function WaitingBadge({ className = 'badge badge-attn' }: { className?: string } = {}) {
  const scope = useSessionScope()
  const n = scope?.list.counts.waiting ?? 0
  if (n === 0) return null
  const text = `${n} waiting on you`
  return (
    <span className={className} role="status" aria-label={text} title={text}>
      {n}
    </span>
  )
}
