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
