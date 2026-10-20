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
  expect(screen.getByRole('group', { name: 'Recent sessions' })).toBeInTheDocument()
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
it('traps tab, preserves the query on composition, closes with Escape and returns focus', async () => {
  const { user } = setup()
  const trigger = screen.getByRole('button', { name: 'Jump to' }); await user.click(trigger)
  const input = screen.getByRole('combobox'); await user.type(input, 'review')
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(input).toHaveValue('review'); expect(screen.getByRole('dialog')).toBeInTheDocument()
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
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
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
