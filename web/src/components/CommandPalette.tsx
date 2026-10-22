import { useSessionNames } from './SessionNames'
import { needsOperator } from '../lib/status'
import { useEffect, useId, useRef, useState } from 'react'
import type { AppActions } from '../app-actions'
import { useClient } from '../app-client'
import { summaries } from '../api/view'
import { messageOf } from '../api/errors'
import type { SessionSummary } from '../generated/view'
import { commandHint, recentSessions, registeredCommands } from '../lib/commands'
import { match, navigate, useLocation } from '../router'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { restoreCommandFocus } from '../hooks/useShortcuts'
import { Icon, Keycap, useModalLayer, type IconName } from './ui'

interface SearchState { key: string; rows: SessionSummary[]; cursor?: string; loading: boolean; error?: string }
export default function CommandPalette({ actions, loaded, close }: {
  actions: AppActions; loaded: ReadonlyMap<string, SessionSummary>; close: () => void
}) {
  const { pathname } = useLocation()
  const desktop = useMediaQuery('(min-width: 768px)')
  const client = useClient(), dialog = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null)
  const { trap, holdFocus } = useModalLayer(dialog)
  const [query, setQuery] = useState(''), [selected, select] = useState<number | null>(null), [attempt, retry] = useState(0)
  const context = actions.context()
  const hat = (context.scopeHatId ?? context.hatId) || undefined, q = query.trim(), key = JSON.stringify([hat, q])
  const generation = useRef(0), controller = useRef<AbortController | null>(null)
  const [search, setSearch] = useState<SearchState>({ key: '', rows: [], loading: false })
  const listId = useId()
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    input.current?.focus()
    return () => restoreCommandFocus(before)
  }, [])
  useEffect(() => {
    const current = ++generation.current
    const abort = new AbortController(); controller.current = abort
    if (!q) return () => abort.abort()
    setSearch({ key, rows: [], loading: true })
    const timer = setTimeout(() => {
      summaries(client, { q, hat, limit: 30 }, abort.signal).then(page => {
        if (!abort.signal.aborted && current === generation.current) setSearch({ key, rows: page.sessions, cursor: page.next_cursor, loading: false })
      }, error => {
        if (!abort.signal.aborted && current === generation.current) setSearch({ key, rows: [], loading: false, error: messageOf(error) })
      })
    }, 250)
    return () => { clearTimeout(timer); abort.abort() }
  }, [client, key, q, hat, attempt])
  const current = search.key === key ? search : undefined
  const more = () => {
    if (!current?.cursor || current.loading) return
    const epoch = generation.current, abort = controller.current!
    setSearch({ ...current, loading: true, error: undefined })
    summaries(client, { q, hat, limit: 30, cursor: current.cursor }, abort.signal).then(page => {
      if (!abort.signal.aborted && epoch === generation.current) setSearch({ key, rows: [...current.rows, ...page.sessions], cursor: page.next_cursor, loading: false })
    }, error => {
      if (!abort.signal.aborted && epoch === generation.current) setSearch({ ...current, loading: false, error: messageOf(error) })
    })
  }
  const merged = new Map(loaded)
  const serverMatches = new Set<string>()
  if (q) for (const row of current?.rows ?? []) {
    serverMatches.add(row.session_id)
    const held = merged.get(row.session_id)
    // Match the list store's page/stream reconciliation: a page must be
    // strictly newer; the shared stream wins ties (including a hat change).
    if (!held || row.last_event_at > held.last_event_at) merged.set(row.session_id, row)
  }
  const visits = (context.recentSessions ?? []).filter(row => !hat || row.hat_id === hat)
  for (const row of visits) {
    const held = merged.get(row.session_id)
    if (!held || row.last_event_at > held.last_event_at) merged.set(row.session_id, row)
  }
  const names = useSessionNames([...merged.values()])
  for (const row of merged.values()) if (!row.title && names(row).text.toLocaleLowerCase().includes(q.toLocaleLowerCase())) serverMatches.add(row.session_id)
  const rows = recentSessions(merged.values(), q, hat, serverMatches)
  const run = (action: () => void) => { close(); requestAnimationFrame(action) }
  const sessionResult = (row: SessionSummary) => ({
    id: `session:${row.session_id}`, label: names(row, row.session_id).text, provisional: names(row).provisional,
    hint: '', detail: [row.cwd, row.git_branch].filter(Boolean).join(' · '),
    meta: [context.hats?.find(hat => hat.id === row.hat_id)?.name, context.hosts?.find(host => host.host_id === row.host_id)?.name].filter(Boolean).join(' · ') || row.cwd,
    icon: (needsOperator(row) ? 'hand-raised' : row.activity === 'running' ? 'play-circle' : 'clock') as IconName,
    run: () => navigate(`/sessions/${encodeURIComponent(row.session_id)}`),
  })
  const primary = new Set(['new-session', 'rename-session', 'add-host', 'open-defaults'])
  const route = match(pathname)
  const previous = visits.filter(row => row.session_id !== (route.name === 'session' ? route.id : null))
    .filter((row, index) => index < 5 || row.session_id === context.previousSessionId)
  const recentIds = new Set(previous.map(row => row.session_id))
  const commands = registeredCommands(actions, desktop).map(action => ({ ...action, label: action.id === 'open-defaults' ? 'Edit defaults' : action.label })).filter(action => q || primary.has(action.id)).filter(action => action.label.toLocaleLowerCase().includes(q.toLocaleLowerCase()))
  const groups = [
    { label: 'Recent', results: q ? [] : previous.map(row => ({ ...sessionResult(row), hint: row.session_id === context.previousSessionId ? '↵' : '' })) },
    { label: 'Needs you', results: rows.filter(row => needsOperator(row) && (q || !recentIds.has(row.session_id))).map(sessionResult) },
    { label: 'Actions', results: commands.map(action => ({ id: `action:${action.id}`, label: action.id === 'open-defaults' ? 'Edit defaults' : action.label, hint: commandHint(action.id, match(pathname).name, desktop), detail: '', meta: '', provisional: false, icon: (action.id === 'add-host' ? 'server-stack' : action.id === 'new-session' ? 'plus-circle' : action.id === 'open-defaults' ? 'adjustments-horizontal' : 'arrow-right') as IconName, run: () => { actions.dispatch(action.id) } })) },
    { label: q ? 'Matching sessions' : 'Sessions', results: rows.filter(row => !needsOperator(row) && (q || !recentIds.has(row.session_id))).map(sessionResult) },
  ]
  const results = groups.flatMap(group => group.results)
  const preferred = results.findIndex(result => result.id === `session:${context.previousSessionId}`)
  const active = Math.min(selected ?? Math.max(0, preferred), results.length - 1)
  const activeId = results[active]?.id
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' }) }, [active, activeId, listId])
  const choose = (index: number) => { if (results[index]) run(results[index].run) }
  let offset = 0
  return <div className="command-overlay" onMouseDown={holdFocus}>
    <div className="command-dialog" ref={dialog} role="dialog" aria-modal="true" aria-label="Command palette" tabIndex={-1} onKeyDown={event => {
      // Let Escape cancel native IME composition without dismissing its draft.
      if (event.nativeEvent.isComposing || event.keyCode === 229) return
      trap(event, close)
    }}>
      <div className="command-search"><Icon name="magnifying-glass" size={20} />
        <input ref={input} role="combobox" aria-label="Jump to a session or command" placeholder="Jump to a session, or type a command…" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} value={query} onChange={event => { setQuery(event.target.value); select(0) }} onKeyDown={event => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key)) {
            event.preventDefault()
            if (event.key === 'Enter') choose(active)
            else if (event.key === 'Home') select(0)
            else if (event.key === 'End') select(Math.max(0, results.length - 1))
            else select(Math.max(0, Math.min(results.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))))
          }
        }} />
        <button type="button" className="command-close" aria-label="Close command palette" onClick={close}><Icon name="x-mark" size={18} /><Keycap>Esc</Keycap></button>
      </div>
      <div className="command-results" id={listId} role="listbox" aria-label="Sessions and actions">
        {groups.map(group => {
          const start = offset; offset += group.results.length
          return group.results.length > 0 && <div role="group" aria-label={group.label} key={group.label}><div className="command-group" aria-hidden="true">{group.label}</div>{group.results.map((result, index) => <div role="option" aria-label={[result.label, result.detail].filter(Boolean).join(" ")} id={`${listId}-${start + index}`} aria-selected={active === start + index} className="command-option" key={result.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(start + index)}>
            <Icon name={result.icon} size={16} />
            <span className={'command-label' + (result.provisional ? ' session-name-provisional' : '')}><bdi>{result.label}</bdi></span>{result.meta && <small className="command-meta"><bdi>{result.meta}</bdi></small>}{result.hint && <Keycap>{result.hint}</Keycap>}
          </div>)}</div>
        })}
      </div>
      {results.length === 0 && <p className="command-note">No matches in the sessions loaded so far.</p>}
      <p className="command-note" role="status">{q ? current?.loading || !current ? 'Searching sessions…' : current.error ? 'Search unavailable. Loaded matches are still shown.' : current.cursor ? 'More matching sessions are available.' : 'Session search complete.' : 'Showing loaded sessions. Type to search all sessions.'}</p>
      {q && current?.error && <p className="command-note" role="alert"><bdi>{current.error}</bdi><button type="button" className="btn btn-ghost" onClick={() => retry(n => n + 1)}>Retry search</button></p>}
      {q && current?.cursor && <button type="button" className="btn btn-ghost command-more" disabled={current.loading} onClick={more}>Load more matches</button>}
      <footer className="command-footer"><span><Keycap>↑</Keycap> <Keycap>↓</Keycap> to move</span><span><Keycap>Enter</Keycap> to open</span><span><Keycap>Esc</Keycap> to close</span></footer>
    </div>
  </div>
}
