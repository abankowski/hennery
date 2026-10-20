import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNow } from '../hooks/useNow'
import type { SessionSummary } from '../generated/view'
import { BUCKET_LABEL, BUCKET_ORDER, basename, bucketOf, type Bucket } from '../lib/time'
import { sessionGroups } from '../lib/sessionGroups'
import { matchesStatus, needsOperator } from '../lib/status'
import { Link, useLocation } from '../router'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useModalLayer } from './ui'
import { useRegisterAction } from '../app-actions'
import SessionRow from './SessionRow'
import HatSwitch from './HatSwitch'
import SessionFilters from './SessionFilters'
import { useSessionScope } from './SessionScope'
import NeedsYouQueue from './NeedsYouQueue'
export const PAGE_ROWS = 50
export const CLOCK_MS = 60_000
const EXPANDED_KEY = 'hennery.expandedFamilies'
function rememberedFamilies(): Set<string> {
  try { const value: unknown = JSON.parse(sessionStorage.getItem(EXPANDED_KEY) ?? '[]'); return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []) } catch { return new Set() }
}
function childPriority(s: SessionSummary) { return needsOperator(s) ? 0 : s.activity === 'running' ? 1 : 2 }
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
  const links = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-session-link]')].filter(link => !link.closest('[hidden]'))
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
export default function SessionList({ screen = false, attentionOnly = false }: { screen?: boolean; attentionOnly?: boolean }) {
  const scope = useSessionScope(), now = useNow(CLOCK_MS)
  const desktop = useMediaQuery('(min-width: 768px)')
  const { pathname, search } = useLocation()
  const [shownRows, setShownRows] = useState({ query: '', n: PAGE_ROWS })
  const [filters, setFilters] = useState(false)
  const [expanded, setExpanded] = useState(rememberedFamilies)
  const toggleFamily = useCallback((id: string) => setExpanded(before => {
    const next = new Set(before)
    if (next.has(id)) next.delete(id); else next.add(id)
    try { sessionStorage.setItem(EXPANDED_KEY, JSON.stringify([...next])) } catch { /* In-memory expansion still works. */ }
    return next
  }), [])
  useEffect(() => { if (new URLSearchParams(search).has('search')) setFilters(true) }, [search])
  useRegisterAction('search-sessions', { label: 'Search sessions', enabled: pathname === '/sessions', run: () => {
    setFilters(true)
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search sessions"]')?.focus())
  } })
  if (!scope) return null
  const { list, hats, hat, chooseHat, hostNames, host, status, group, selectedId } = scope
  const limit = shownRows.query === list.queryKey ? shownRows.n : PAGE_ROWS
  const filtered = attentionOnly || (!list.searching && status === 'attention') ? scope.attentionRows.filter(s => !scope.isAttentionDismissed(s.session_id) && (!host || s.host_id === host)) : list.shown.filter(s => list.searching || ((!host || s.host_id === host) && matchesStatus(s, status)))
  let remaining = limit
  const groups = sessionGroups(filtered, group, now).map(([id, sessions]) => {
    const ids = new Set(sessions.map(s => s.session_id))
    const visible = sessions.filter(s => !s.family?.parent || !ids.has(s.family.parent.session_id)).slice(0, remaining)
    remaining -= visible.length
    return [id, visible] as const
  }).filter(([, sessions]) => sessions.length)
  const childRows = new Map<string, SessionSummary[]>()
  for (const s of filtered) if (s.family?.parent) {
    const siblings = childRows.get(s.family.parent.session_id) ?? []; siblings.push(s); childRows.set(s.family.parent.session_id, siblings)
  }
  const rootCount = sessionGroups(filtered, group, now).reduce((n, [, sessions]) => {
    const ids = new Set(sessions.map(s => s.session_id))
    return n + sessions.filter(s => !s.family?.parent || !ids.has(s.family.parent.session_id)).length
  }, 0)
  const more = rootCount > limit || list.hasMore
  return <section className={'slist overview' + (screen ? ' slist-screen' : '')} aria-label="Session list" onKeyDown={moveListFocus}>
    <header className="overview-head"><h1 aria-label={attentionOnly ? 'Needs you' : 'Sessions'}>{attentionOnly ? 'Needs you' : desktop ? 'All sessions' : 'Sessions'}</h1><span>{filtered.length}{list.hasMore ? ' shown' : ' sessions'} · {scope.hosts?.filter(h => h.revoked_at == null).length ?? 0} hosts</span>{attentionOnly && <button type="button" className="btn btn-ghost" onClick={() => document.querySelector<HTMLInputElement>('[aria-label="Search sessions"]')?.focus()}>Search</button>}<button type="button" className="btn btn-ghost filter-trigger" onClick={() => setFilters(!filters)} aria-expanded={filters}>Filters</button><Link to="/new" className="btn btn-primary">New session</Link></header>
    <HatSwitch hats={hats} hat={hat} onHat={chooseHat} />
    {!desktop && filters ? <FilterDialog close={() => setFilters(false)}><SessionFilters /></FilterDialog> : <div className="filters-default"><SessionFilters /></div>}
    {desktop && !list.searching && <NeedsYouQueue embedded />}
    {list.error && <p role="alert" className="form-error list-note"><bdi>{list.error}</bdi></p>}
    {!list.loading && (list.stream === 'reconnecting' || list.resynced) && <p className="list-note" role="status">{list.stream === 'reconnecting' ? 'Reconnecting…' : 'Resynced'}</p>}
    {!attentionOnly && (list.loading ? <p className="list-note" role="status">Loading…</p> : !groups.length ? <p className="list-note">{list.searching ? 'No matches' : 'No sessions'}</p> : groups.map(([id, sessions]) => <div className={'grp' + (group === 'time' ? ' grp-time' : '')} key={id}>
      <h2 className="grp-head"><span className="grp-title"><bdi>{group === 'hat' ? hats?.find(h => h.id === id)?.name ?? 'Unknown hat' : group === 'host' ? hostNames.get(id) ?? 'Unknown host' : group === 'project' ? basename(sessions[0].cwd) || 'Unknown project' : BUCKET_LABEL[BUCKET_ORDER.find(key => key === id) ?? 'earlier']}</bdi></span>{group === 'project' && <><span className="grp-path" title={sessions[0].cwd}><bdi>{sessions[0].cwd}</bdi></span><span className="grp-host"><bdi>{hostNames.get(sessions[0].host_id) ?? 'Unknown host'}</bdi></span></>}<span className="grp-count">{sessions.length}{list.hasMore ? ' shown' : ''}</span></h2>
      <table className="session-table"><thead><tr><th>Session</th><th>Doing</th><th>Host</th><th>Agent / model</th><th>Last</th></tr></thead><tbody>{sessions.map(s => {
        const children = childRows.get(s.session_id) ?? []
        const knownClosed = [...list.all.values()].filter(child => child.family?.parent?.session_id === s.session_id && child.lifecycle === 'closed').length
        const hideClosed = scope.hideClosed && !list.searching && !scope.lifecycle
        const total = hideClosed && !list.hasMore ? children.length : Math.max(children.length, (s.family?.child_counts.total ?? 0) - (hideClosed ? knownClosed : 0))
        const running = children.filter(c => c.activity === 'running').length, attention = children.filter(needsOperator).length, done = children.filter(c => c.lifecycle === 'closed').length
        const idle = children.filter(c => c.lifecycle === 'active' && c.activity === 'idle' && !needsOperator(c)).length
        const states = [[attention, 'need you'], [running, 'running'], [done, 'done'], [idle, 'idle'], [children.filter(c => c.lifecycle === 'failed').length, 'failed']] as const
        const summary = states.filter(([count]) => count).slice(0, 3).map(([count, label]) => `${count} ${label}`).join(' · ') + (children.length < total && states.some(([count]) => count) ? ' shown' : '')
        const preview = [...children].sort((a, b) => childPriority(a) - childPriority(b) || b.created_at.localeCompare(a.created_at) || b.session_id.localeCompare(a.session_id)).slice(0, 5)
        return <Fragment key={s.session_id}>
          <SessionRow session={s} selected={s.session_id === selectedId} hostName={hostNames.get(s.host_id)} now={now} table childrenCount={total} childrenStatus={summary} expanded={expanded.has(s.session_id)} onToggleChildren={toggleFamily} />
          {expanded.has(s.session_id) && <>{preview.map(child => <SessionRow key={child.session_id} session={child} selected={child.session_id === selectedId} hostName={hostNames.get(child.host_id)} now={now} table indent />)}
            <tr className="family-show-all"><td colSpan={5}><Link to={`/sessions/${encodeURIComponent(s.session_id)}?family=1`}>Show all {total} {total === 1 ? 'child' : 'children'}</Link></td></tr></>}
        </Fragment>
      })}</tbody></table>
    </div>))}
    {!list.loading && more && <button type="button" className="btn btn-ghost list-more" disabled={list.loadingMore} onClick={() => { setShownRows({ query: list.queryKey, n: limit + PAGE_ROWS }); if (rootCount <= limit) void list.loadMore() }}>{list.loadingMore ? 'Loading…' : 'Load more'}</button>}
  </section>
}
