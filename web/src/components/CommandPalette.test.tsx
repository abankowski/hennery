import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AppActions } from '../app-actions'
import { ClientContext, browserClient } from '../app-client'
import type { SessionSummary } from '../generated/view'
import { json } from '../test-server'
import CommandPalette from './CommandPalette'
import ShortcutHelp from './ShortcutHelp'

const summary = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, title: id, host_id: 'h', hat_id: 'hat', agent: 'claude', cwd: '/srv/demo', lifecycle: 'active', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0, ...patch })
const page = (sessions: SessionSummary[], next_cursor?: string) => json(200, { sessions, next_cursor, epoch: 'e', revision: 1, waiting: 0 })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); history.replaceState(null, '', '/') })
it('preselects this window’s previous visit while retaining shared Recent order', () => {
  const actions = new AppActions()
  actions.registerContext({ previousSessionId: 'local', recentSessions: [summary('shared'), summary('local')] })
  render(<ClientContext.Provider value={browserClient(async () => {}, async () => page([]))}><CommandPalette actions={actions} loaded={new Map()} close={() => {}} /></ClientContext.Provider>)
  expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['shared/srv/demo', 'local/srv/demo↵'])
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('local')
})
it.each([false, true])('shows history shortcuts only for enabled actions, touch=%s', touch => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('pointer') ? touch : true, addEventListener() {}, removeEventListener() {} }))
  const actions = new AppActions()
  actions.register('open-commands', { label: 'Commands', enabled: true, run() {} })
  const view = render(<ShortcutHelp actions={actions} route="session" close={() => {}} />)
  expect(screen.queryByText('Open numbered Recent session', { exact: true })).not.toBeInTheDocument()
  expect(screen.queryByText(/backtick: US layouts/)).not.toBeInTheDocument()
  actions.register('previous-session', { label: 'Previous', enabled: true, run() {} })
  actions.register('recent-session-2', { label: 'Recent', enabled: true, run() {} })
  view.rerender(<ShortcutHelp actions={actions} route="session" close={() => {}} />)
  expect(screen.getByText(/backtick: US layouts/)).toBeInTheDocument()
  expect(!!screen.queryByText('Open numbered Recent session', { exact: true })).toBe(!touch)
})
function setup(fetchImpl: typeof fetch = vi.fn(async () => page([])), loaded = new Map<string, SessionSummary>()) {
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { fn(0); return 0 })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const actions = new AppActions(), run = vi.fn()
  actions.register('new-session', { label: 'New session in this project', enabled: true, run })
  actions.register('open-settings', { label: 'Settings', enabled: false, run })
  actions.registerContext({ hatId: 'hat' })
  function Fixture() {
    const [open, setOpen] = useState(false)
    return <ClientContext.Provider value={browserClient(async () => {}, fetchImpl)}><button onClick={() => setOpen(true)}>Jump to</button>{open && <CommandPalette actions={actions} loaded={loaded} close={() => setOpen(false)} />}</ClientContext.Provider>
  }
  render(<Fixture />)
  return { actions, run, user: userEvent.setup() }
}
it('has grouped semantic options, omits disabled providers, selects locally without executing on focus', async () => {
  const loaded = new Map([['wait', summary('wait', { title: '<b>Review access</b>', operator_attention: 1 })], ['recent', summary('recent')], ['foreign', summary('foreign', { hat_id: 'other' })]])
  const { run, user } = setup(undefined, loaded)
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  const input = screen.getByRole('combobox'); expect(input).toHaveFocus()
  expect(screen.getByRole('group', { name: 'Needs you' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Sessions' })).toBeInTheDocument()
  expect(screen.getAllByRole('option')).toHaveLength(3)
  expect(screen.queryByText('Settings', { exact: true })).not.toBeInTheDocument()
  expect(screen.queryByText('foreign', { exact: true })).not.toBeInTheDocument()
  expect(screen.getByText('<b>Review access</b>', { exact: true }).querySelector('b')).toBeNull()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('New session in this project')
  expect(run).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'End' }); expect(screen.getByRole('option', { selected: true })).toHaveTextContent('recent')
  fireEvent.keyDown(input, { key: 'Home' }); expect(screen.getByRole('option', { selected: true })).toHaveTextContent('<b>Review access</b>')
  fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' })
  expect(run).toHaveBeenCalledOnce(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('finds Edit defaults by its visible action label and dispatches the real provider', async () => {
  const { actions, user } = setup(), edit = vi.fn()
  actions.register('open-defaults', { label: 'Defaults', enabled: true, run: edit })
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'edit')
  await user.click(screen.getByRole('option', { name: 'Edit defaults' }))
  expect(edit).toHaveBeenCalledOnce()
})
it('traps tab, preserves the query on composition, closes with Escape and returns focus', async () => {
  const { user } = setup()
  const trigger = screen.getByRole('button', { name: 'Jump to' }); await user.click(trigger)
  const input = screen.getByRole('combobox'); await user.type(input, 'project')
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(input).toHaveValue('project'); expect(screen.getByRole('dialog')).toBeInTheDocument()
  const close = screen.getByRole('button', { name: 'Close command palette' })
  close.focus(); fireEvent.keyDown(close, { key: 'Tab' }); expect(input).toHaveFocus()
  fireEvent.keyDown(input, { key: 'Tab', shiftKey: true }); expect(close).toHaveFocus()
  fireEvent.keyDown(close, { key: 'Escape' }); expect(trigger).toHaveFocus()
})
it('uses encoded session URLs and never dispatches a mutation for a session selection', async () => {
  const { user, run } = setup(undefined, new Map([['s/one', summary('s/one')]]))
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.click(screen.getByRole('option', { name: 's/one /srv/demo' }))
  expect(location.pathname).toBe('/sessions/s%2Fone'); expect(run).not.toHaveBeenCalled()
})
it('debounces server search, follows explicit pages, scopes the query and never subscribes to a stream', async () => {
  const calls: string[] = []
  const fetchImpl = vi.fn(async (url: RequestInfo | URL) => { calls.push(String(url)); return String(url).includes('cursor=') ? page([summary('second', { title: 'Parser second' })]) : page([summary('first', { title: 'Parser first' })], 'next /') })
  const { user } = setup(fetchImpl)
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  expect(calls).toEqual([])
  await user.type(screen.getByRole('combobox'), 'Parser')
  await screen.findByRole('option', { name: 'Parser first /srv/demo' })
  expect(calls).toEqual(['/api/view/sessions?limit=30&q=Parser&hat=hat'])
  await user.click(screen.getByRole('button', { name: 'Load more matches' }))
  await screen.findByRole('option', { name: 'Parser second /srv/demo' })
  expect(calls[1]).toBe('/api/view/sessions?cursor=next+%2F&limit=30&q=Parser&hat=hat')
  expect(screen.getByText('Session search complete.', { exact: true })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Load more matches' })).not.toBeInTheDocument()
})
it('fences ignored-abort responses after a changed query and aborts when closed', async () => {
  let resolveOld!: (response: Response) => void
  const signals: (AbortSignal | null | undefined)[] = []
  const fetchImpl = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    signals.push(init?.signal)
    if (String(url).includes('q=old')) return new Promise<Response>(resolve => { resolveOld = resolve })
    return Promise.resolve(page([summary('new', { title: 'new answer' })]))
  })
  const { user } = setup(fetchImpl)
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  const input = screen.getByRole('combobox'); await user.type(input, 'old')
  await waitFor(() => expect(fetchImpl).toHaveBeenCalledOnce())
  await user.clear(input); await user.type(input, 'new')
  await screen.findByRole('option', { name: 'new answer /srv/demo' })
  expect(signals[0]?.aborted).toBe(true)
  await act(async () => { resolveOld(page([summary('old', { title: 'new stale' })])) })
  expect(screen.queryByRole('option', { name: 'new stale /srv/demo' })).not.toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'new answer /srv/demo' })).toBeInTheDocument()
  await user.keyboard('{Escape}'); expect(signals.at(-1)?.aborted).toBe(true)
})
it('keeps loaded matches on search error and offers a deliberate retry', async () => {
  let failed = true
  const fetchImpl = vi.fn(async () => failed ? json(503, { code: 'unavailable', message: 'Try again later.' }) : page([summary('fixed', { title: 'Parser remote' })]))
  const { user } = setup(fetchImpl, new Map([['local', summary('local', { title: 'Parser local' })]]))
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'Parser')
  await screen.findByRole('alert'); expect(screen.getByRole('option', { name: 'Parser local /srv/demo' })).toBeInTheDocument()
  failed = false; await user.click(screen.getByRole('button', { name: 'Retry search' }))
  await screen.findByRole('option', { name: 'Parser remote /srv/demo' })
})
it('does not execute a provider that became unavailable after rendering', async () => {
  const { actions, user, run } = setup()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  actions.register('new-session', { label: 'No longer available', enabled: false, run })
  await user.keyboard('{Enter}'); expect(run).not.toHaveBeenCalled()
})
it('help shows route/provider-appropriate keys and restores the trigger', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const actions = new AppActions()
  actions.register('focus-composer', { label: 'Focus composer', enabled: true, run() {} })
  function Fixture() { const [open, show] = useState(false); return <><button onClick={() => show(true)}>Help</button>{open && <ShortcutHelp actions={actions} route="session" close={() => show(false)} />}</> }
  render(<Fixture />); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Help' }))
  const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' })
  expect(within(dialog).getByText('Focus composer', { exact: true })).toBeInTheDocument()
  expect(within(dialog).queryByText('Focus session search', { exact: true })).not.toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Close shortcuts' })).toHaveFocus()
  await user.keyboard('{Escape}'); expect(screen.getByRole('button', { name: 'Help' })).toHaveFocus()
})

// Review amendment: exercise the same shared reducer that receives stream upserts.
it.each(['completed', 'in-flight'] as const)('fences a %s search hit after the shared stream reassigns its session', async phase => {
  const { EMPTY_LIST, listReducer } = await import('../store/sessionList')
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const old = summary('moved', { title: 'Parser project', last_event_at: '2026-10-20T10:00:00Z' })
  const initial = listReducer(EMPTY_LIST, { type: 'first', search: false, page: { sessions: [old], epoch: 'e', revision: 1, waiting: 0 } })
  let answer!: (response: Response) => void
  const fetchImpl = vi.fn(() => new Promise<Response>(resolve => { answer = resolve }))
  const client = browserClient(async () => {}, fetchImpl), actions = new AppActions()
  actions.registerContext({ hatId: 'hat' })
  const view = (loaded: ReadonlyMap<string, SessionSummary>) => <ClientContext.Provider value={client}><CommandPalette actions={actions} loaded={loaded} close={() => {}} /></ClientContext.Provider>
  const rendered = render(view(initial.all))
  await userEvent.type(screen.getByRole('combobox'), 'Parser')
  await waitFor(() => expect(fetchImpl).toHaveBeenCalledOnce())
  if (phase === 'completed') {
    await act(async () => answer(page([old])))
    expect(screen.getByRole('option', { name: 'Parser project /srv/demo' })).toBeInTheDocument()
  }
  const updated = listReducer(initial, { type: 'upsert', summary: { ...old, hat_id: 'other', last_event_at: '2026-10-20T11:00:00Z' } })
  rendered.rerender(view(updated.all))
  if (phase === 'in-flight') await act(async () => answer(page([old])))
  await screen.findByText('Session search complete.', { exact: true })
  expect(screen.queryByRole('option', { name: 'Parser project /srv/demo' })).not.toBeInTheDocument()
})
it('keeps shared stream state on equal versions and newer HTTP state over older loaded state', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const old = summary('moved', { title: 'Parser project', last_event_at: '2026-10-20T10:00:00Z' })
  const newer = { ...old, hat_id: 'other', last_event_at: '2026-10-20T11:00:00Z' }
  const client = browserClient(async () => {}, async () => page([old, { ...newer, session_id: 'http-newer' }]))
  const actions = new AppActions(); actions.registerContext({ hatId: 'hat' })
  render(<ClientContext.Provider value={client}><CommandPalette actions={actions} loaded={new Map([['moved', { ...old, hat_id: 'other' }], ['http-newer', { ...old, session_id: 'http-newer' }]])} close={() => {}} /></ClientContext.Provider>)
  await userEvent.type(screen.getByRole('combobox'), 'Parser')
  await screen.findByText('Session search complete.', { exact: true })
  expect(screen.queryAllByRole('option')).toHaveLength(0)
})
it('preserves a server match when bounding omitted its matching path prefix', async () => {
  // SessionItem::bounded keeps the tail within CWD_MAX_JSON_BYTES=128.
  // The stored path is /needle/ followed by 140 x characters.
  const boundedCwd = '…' + 'x'.repeat(125)
  const { user } = setup(async () => page([summary('bounded', { title: 'Project', cwd: boundedCwd })]), new Map([['unmatched', summary('unmatched')]]))
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'needle')
  await screen.findByText('Session search complete.', { exact: true })
  expect(screen.getByRole('option', { name: `Project ${boundedCwd}` })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'unmatched /srv/demo' })).not.toBeInTheDocument()
})
it.each([{ isComposing: true }, { keyCode: 229 }])('lets IME Escape cancel composition without dismissing the query: %j', async composition => {
  const { user } = setup()
  const trigger = screen.getByRole('button', { name: 'Jump to' }); await user.click(trigger)
  const input = screen.getByRole('combobox'); await user.type(input, 'project')
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...composition })
  fireEvent(input, event)
  expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  expect(input).toHaveValue('project'); expect(event.defaultPrevented).toBe(false)
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('puts visited sessions first, preselects the previous session and keeps browse hat separate from session context', async () => {
  const a = summary('current'), previous = summary('previous', { last_event_at: '2020-01-01' }), active = summary('agent-active', { last_event_at: '2099-01-01' })
  const foreign = summary('foreign', { hat_id: 'other' })
  const { actions, user } = setup(undefined, new Map([a, previous, active, foreign].map(row => [row.session_id, row])))
  history.replaceState(null, '', '/sessions/current')
  actions.registerContext({ scopeHatId: 'hat', hatId: 'other', recentSessions: [a, previous, foreign], previousSessionId: previous.session_id })
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  const recent = screen.getByRole('group', { name: 'Recent' })
  expect(screen.getAllByRole('group')[0]).toBe(recent)
  expect(within(recent).getAllByRole('option').map(option => option.textContent)).toEqual(['previous/srv/demo↵'])
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('previous')
  expect(screen.queryByRole('option', { name: 'foreign /srv/demo' })).not.toBeInTheDocument()
  await user.keyboard('{Enter}')
  expect(location.pathname).toBe('/sessions/previous')
})
it('All hats includes visits across hats even when session action context has its own hat', async () => {
  const { actions, user } = setup()
  actions.registerContext({ scopeHatId: '', hatId: 'hat', recentSessions: [summary('other-visit', { hat_id: 'other' })] })
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  expect(within(screen.getByRole('group', { name: 'Recent' })).getByRole('option', { name: 'other-visit /srv/demo' })).toHaveAttribute('aria-selected', 'true')
})
