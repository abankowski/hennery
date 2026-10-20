import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNow } from '../hooks/useNow'
import type { SessionSummary } from '../generated/view'
import { BUCKET_ORDER, bucketOf, type Bucket } from '../lib/time'
import { sessionGroups } from '../lib/sessionGroups'
import { matchesStatus } from '../lib/status'
import { Link, useLocation } from '../router'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useModalLayer } from './ui'
import { useRegisterAction } from '../app-actions'
import SessionRow from './SessionRow'
import HatSwitch from './HatSwitch'
import SessionFilters from './SessionFilters'
import { useSessionScope } from './SessionScope'
export const PAGE_ROWS = 50
export const CLOCK_MS = 60_000
// Retained for consumers of the old calendar helper; overview uses hats/hosts.
export function byDay(rows: readonly SessionSummary[], now: number): [Bucket, SessionSummary[]][] {
  const days = new Map<Bucket, SessionSummary[]>()
  for (const row of rows) { const key = bucketOf(row.last_event_at, now); const group = days.get(key) ?? []; group.push(row); days.set(key, group) }
  return BUCKET_ORDER.filter(key => days.has(key)).map(key => [key, days.get(key)!])
}
/** Local J/K only: focus moves within visible links, never activates them. */
export function moveListFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.defaultPrevented || event.repeat || event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || !['j', 'k'].includes(event.key)) return
  if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"], [role="searchbox"]')) return
  const links = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-session-link]')]
  const index = links.indexOf(document.activeElement as HTMLElement)
  if (index < 0) return
  const next = links[index + (event.key === 'j' ? 1 : -1)]
  if (next) { event.preventDefault(); next.focus() }
}
function FilterDialog({ children, close }: { children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { trap, holdFocus } = useModalLayer(ref)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
    return () => { if (before?.isConnected) before.focus() }
  }, [])
  return <div className="overlay" onMouseDown={holdFocus}><div ref={ref} className="modal filter-sheet" role="dialog" aria-modal="true" aria-label="Session filters" tabIndex={-1} onKeyDown={event => trap(event, close)}><header className="overview-head"><h2>Session filters</h2><button type="button" className="btn btn-ghost" onClick={close}>Close filters</button></header>{children}</div></div>
}
export default function SessionList({ screen = false }: { screen?: boolean }) {
  const scope = useSessionScope(), now = useNow(CLOCK_MS)
  const desktop = useMediaQuery('(min-width: 768px)')
  const { pathname, search } = useLocation()
  const [shownRows, setShownRows] = useState({ query: '', n: PAGE_ROWS })
  const [filters, setFilters] = useState(false)
  useEffect(() => { if (new URLSearchParams(search).has('search')) setFilters(true) }, [search])
  useRegisterAction('search-sessions', { label: 'Search sessions', enabled: pathname === '/sessions', run: () => {
    setFilters(true)
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search sessions"]')?.focus())
  } })
  if (!scope) return null
  const { list, hats, hat, chooseHat, hostNames, host, status, group, selectedId } = scope
  const limit = shownRows.query === list.queryKey ? shownRows.n : PAGE_ROWS
  const filtered = list.shown.filter(s => list.searching || ((!host || s.host_id === host) && matchesStatus(s, status)))
  const rows = filtered.slice(0, limit)
  const more = filtered.length > limit || list.hasMore
  return <section className={'slist overview' + (screen ? ' slist-screen' : '')} aria-label="Session list" onKeyDown={moveListFocus}>
    <header className="overview-head"><h1>Sessions</h1><span>{filtered.length}{list.hasMore ? ' shown' : ' sessions'}</span><button type="button" className="btn btn-ghost filter-trigger" onClick={() => setFilters(!filters)} aria-expanded={filters}>Filters</button><Link to="/new" className="btn btn-primary">New session</Link></header>
    <HatSwitch hats={hats} hat={hat} onHat={chooseHat} />
    {!desktop && filters ? <FilterDialog close={() => setFilters(false)}><SessionFilters /></FilterDialog> : <div className="filters-default"><SessionFilters /></div>}
    {list.error && <p role="alert" className="form-error list-note"><bdi>{list.error}</bdi></p>}
    {!list.loading && (list.stream === 'reconnecting' || list.resynced) && <p className="list-note" role="status">{list.stream === 'reconnecting' ? 'Reconnecting…' : 'Resynced'}</p>}
    {list.loading ? <p className="list-note" role="status">Loading…</p> : !rows.length ? <p className="list-note">{list.searching ? 'No matches' : 'No sessions'}</p> : sessionGroups(rows, group).map(([id, sessions]) => <div className="grp" key={id}><h2 className="grp-head"><span className="grp-title"><bdi>{group === 'hat' ? hats?.find(h => h.id === id)?.name ?? 'Unknown hat' : hostNames.get(id) ?? 'Unknown host'}</bdi></span><span className="grp-count">{sessions.length}{list.hasMore ? ' shown' : ''}</span></h2><table className="session-table"><thead><tr><th>Session</th><th>Doing</th><th>Host</th><th>Agent / model</th><th>Last</th></tr></thead><tbody>{sessions.map(s => <SessionRow key={s.session_id} session={s} selected={s.session_id === selectedId} hostName={hostNames.get(s.host_id)} now={now} table indent={!!s.family?.parent && sessions.some(p => p.session_id === s.family?.parent?.session_id)} />)}</tbody></table></div>)}
    {!list.loading && more && <button type="button" className="btn btn-ghost list-more" disabled={list.loadingMore} onClick={() => { setShownRows({ query: list.queryKey, n: limit + PAGE_ROWS }); if (filtered.length <= limit) void list.loadMore() }}>{list.loadingMore ? 'Loading…' : 'Load more'}</button>}
  </section>
}
