import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AppActionsProvider, useAppActions, type AppActions } from '../app-actions'
import { deriveAccent } from '../lib/accent'
import { setAppearance } from '../lib/theme'
import { json } from '../test-stream'
import SessionView from './Session'
import { FAST, sessionServer } from './test-session'

it('registers actual session context and actions, scopes its server hat, and removes handlers on unmount', async () => {
  const server = sessionServer({ hats: () => json([{ id: 'hat1', name: 'Project hat', colour: '#e51595' }]) })
  let actions!: AppActions
  function Read() { actions = useAppActions()!; return null }
  const view = render(<AppActionsProvider><Read /><SessionView id="s1" timing={FAST} /></AppActionsProvider>, { wrapper: server.wrapper })
  await waitFor(() => expect(actions.context()).toMatchObject({ sessionId: 's1', hostId: 'h1', cwd: '/srv/work/project', hatId: 'hat1' }))
  await waitFor(() => expect(document.querySelector('.session-hat')).toHaveTextContent('Project hat'))
  const session = document.querySelector<HTMLElement>('.session')!
  expect(session.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#e51595').light.accent)
  act(() => setAppearance('dark'))
  expect(session.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#e51595').dark.accent)
  act(() => { actions.dispatch('toggle-details') })
  expect(screen.getByRole('tab', { name: 'Family', exact: true })).toBeVisible()
  act(() => { actions.dispatch('focus-composer') })
  expect(screen.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveFocus()
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt', exact: true }), { target: { value: 'keep draft' } })
  act(() => { actions.dispatch('toggle-details') })
  expect(screen.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue('keep draft')
  expect(server.streams).toHaveLength(1)
  view.unmount()
  expect(actions.dispatch('toggle-details')).toBe(false)
  expect(actions.dispatch('focus-composer')).toBe(false)
  expect(actions.context()).toEqual({})
  act(() => setAppearance('system'))
})
