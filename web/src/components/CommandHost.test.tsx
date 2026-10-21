import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AppActionsProvider, useAppActions, useRegisterAction, type AppActions } from '../app-actions'
import { ClientContext, browserClient } from '../app-client'
import { navigate } from '../router'
import CommandHost from './CommandHost'
import { json } from '../test-server'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); history.replaceState(null, '', '/') })
it('consumes live registry providers, keeps an open query on Mod+K and suppresses global keys under overlays', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux')
  let actions!: AppActions
  const details = vi.fn(), composer = vi.fn(), launch = vi.fn()
  function Providers() {
    actions = useAppActions()!
    useRegisterAction('open-sessions', { label: 'Sessions', enabled: true, run() {} })
    useRegisterAction('new-session', { label: 'New session in this project', enabled: true, run: launch })
    useRegisterAction('toggle-details', { label: 'Details', enabled: true, run: details })
    useRegisterAction('focus-composer', { label: 'Composer', enabled: true, run: composer })
    return <button onClick={() => actions.dispatch('open-commands')}>Jump to</button>
  }
  navigate('/sessions/one')
  render(<ClientContext.Provider value={browserClient(async () => {}, async () => json(200, { sessions: [], waiting: 0, epoch: 'e', revision: 1 }))}><AppActionsProvider><Providers /><CommandHost /></AppActionsProvider></ClientContext.Provider>)
  fireEvent.keyDown(window, { key: ']' }); expect(details).toHaveBeenCalledOnce()
  fireEvent.keyDown(window, { key: 'r' }); expect(composer).toHaveBeenCalledOnce()
  fireEvent.keyDown(window, { key: 'n' }); expect(launch).toHaveBeenCalledOnce()
  const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Jump to' }))
  const input = screen.getByRole('combobox'); await user.type(input, 'project')
  fireEvent.keyDown(input, { key: 'k', ctrlKey: true }); expect(input).toHaveValue('project')
  fireEvent.keyDown(window, { key: ']' }); fireEvent.keyDown(window, { key: 'r' }); fireEvent.keyDown(window, { key: 'n' })
  expect(details).toHaveBeenCalledOnce(); expect(composer).toHaveBeenCalledOnce(); expect(launch).toHaveBeenCalledOnce()
  await user.keyboard('{Escape}')
  act(() => { actions.register('focus-composer', { label: 'Unavailable', enabled: false, run: composer }) })
  fireEvent.keyDown(window, { key: 'r' }); expect(composer).toHaveBeenCalledOnce()
  fireEvent.keyDown(window, { key: '?' }); expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  expect(screen.queryByText('Focus composer', { exact: true })).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

// Keep auth regressions at the real App boundary: App.test mocks this lazy host.
it.each(['cross-tab logout', 'search 401'] as const)('drops cached palette metadata on %s and does not revive it after sign-in', async reason => {
  const { default: App } = await import('../App')
  const { stubServer } = await import('../test-server')
  const channels: { name: string; onmessage: ((event: MessageEvent) => void) | null }[] = []
  vi.stubGlobal('BroadcastChannel', class {
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor(readonly name: string) { channels.push(this) }
    postMessage() {}
    close() {}
  })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  localStorage.clear(); sessionStorage.clear()
  const hit = { session_id: 'private', title: 'Private project', host_id: 'host', hat_id: 'hat', agent: 'claude', cwd: '/srv/private', lifecycle: 'parked', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0 }
  const response = (sessions: unknown[]) => json(200, { sessions, epoch: 'e', revision: 1, waiting: 0 })
  const server = stubServer({
    'GET /api/capabilities': json(200, { mode: 'full', features: [] }),
    'GET /api/view/sessions': response([]),
    'GET /api/view/sessions?limit=30&q=Private': response([hit]),
    'GET /api/view/sessions?limit=30&q=expired': json(401, { code: 'unauthenticated', message: 'Sign in.' }),
  })
  const signals: AbortSignal[] = []
  const fetchImpl: typeof fetch = (url, init) => { if (String(url).includes('limit=30') && init?.signal) signals.push(init.signal); return server.fetch(url, init) }
  act(() => navigate('/sessions'))
  render(<App fetchImpl={fetchImpl} />)
  const user = userEvent.setup()
  const open = async () => {
    const trigger = await screen.findByRole('button', { name: 'Jump to' })
    await waitFor(() => expect(trigger).toBeEnabled())
    await waitFor(() => expect(document.querySelector('.command-announcement')).not.toBeNull())
    await user.click(trigger)
    return screen.findByRole('combobox', { name: 'Jump to a session or command' })
  }
  const input = await open(); await user.type(input, 'Private')
  await screen.findByRole('option', { name: 'Private project /srv/private' })
  if (reason === 'cross-tab logout') {
    await act(async () => { channels.find(channel => channel.name === 'hennery-auth')!.onmessage!(new MessageEvent('message', { data: { version: 1, kind: 'logout' } })) })
  } else { await user.clear(input); await user.type(input, 'expired') }
  await waitFor(() => expect(location.pathname).toBe('/login'))
  expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument()
  expect(screen.queryByText('Private project', { exact: true })).not.toBeInTheDocument()
  expect(document.querySelector('.page')).not.toHaveAttribute('inert')
  expect(signals.every(signal => signal.aborted)).toBe(true)
  act(() => navigate('/sessions')) // Simulate successful sign-in returning to the app.
  await screen.findByRole('heading', { name: 'Sessions' })
  expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument()
  const fresh = await open(); expect(fresh).toHaveValue('')
  expect(screen.queryByText('Private project', { exact: true })).not.toBeInTheDocument()
})

function retainedProviderHost() {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  let actions!: AppActions
  function Provider() {
    actions = useAppActions()!
    useRegisterAction('open-sessions', { label: 'Sessions', enabled: true, run() {} })
    return <button onClick={() => actions.dispatch('open-commands')}>Jump to</button>
  }
  act(() => navigate('/sessions'))
  render(<ClientContext.Provider value={browserClient(async () => {}, async () => json(200, { sessions: [], epoch: 'e', revision: 1, waiting: 0 }))}><AppActionsProvider><Provider /><CommandHost /></AppActionsProvider></ClientContext.Provider>)
  return { actions, user: userEvent.setup() }
}
it.each(['/login', '/setup'])('clears overlay state on %s even before session providers disappear', async route => {
  const { actions, user } = retainedProviderHost()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'private')
  act(() => navigate(route))
  expect(actions.get('open-sessions')?.enabled).toBe(true) // Intentionally stale provider.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  act(() => navigate('/sessions'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  expect(screen.getByRole('combobox')).toHaveValue('')
})
it('unmounts cached controls when session capability disappears, without reviving them on return', async () => {
  const { actions, user } = retainedProviderHost()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  await user.type(screen.getByRole('combobox'), 'private')
  let remove!: () => void
  act(() => { remove = actions.register('open-sessions', { label: 'Unavailable', enabled: false, run() {} }) })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  act(() => remove())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Jump to' }))
  expect(screen.getByRole('combobox')).toHaveValue('')
})
