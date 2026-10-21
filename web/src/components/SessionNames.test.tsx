import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import SessionName from './SessionNames'

const session = { session_id: 's/1', cwd: '/srv/project' }
it('uses the server title and source without reading private transcript events', () => {
  const fetch = vi.fn(), client = new Client({ fetch, navigate: vi.fn(), stepUp: async () => {}, here: () => ({ pathname: '/sessions', search: '' }) })
  render(<ClientContext.Provider value={client}><SessionName session={{ ...session, title: '<b>Check parser</b>', title_source: 'prompt' }} /><SessionName session={{ ...session, title: 'My chosen title', title_source: 'operator' }} /></ClientContext.Provider>)
  const provisional = screen.getByText('<b>Check parser</b>', { exact: true })
  expect(provisional).toHaveClass('session-name-provisional')
  expect(provisional.querySelector('b')).toBeNull()
  expect(screen.getByText('My chosen title', { exact: true })).not.toHaveClass('session-name-provisional')
  expect(fetch).not.toHaveBeenCalled()
})
it('updates provisional styling when a server agent or operator title arrives', () => {
  const view = render(<SessionName session={{ ...session, title: 'First prompt', title_source: 'prompt' }} />)
  expect(screen.getByText('First prompt', { exact: true })).toHaveClass('session-name-provisional')
  view.rerender(<SessionName session={{ ...session, title: 'Agent title', title_source: 'agent' }} />)
  expect(screen.getByText('Agent title', { exact: true })).not.toHaveClass('session-name-provisional')
  view.rerender(<SessionName session={{ ...session, title: 'Operator title', title_source: 'operator' }} />)
  expect(screen.getByText('Operator title', { exact: true })).not.toHaveClass('session-name-provisional')
  view.rerender(<SessionName session={{ ...session, title: 'Operator title', title_source: 'prompt' }} />)
  expect(screen.getByText('Operator title', { exact: true })).toHaveClass('session-name-provisional')
  expect(screen.getByText('Operator title', { exact: true })).toHaveAttribute('title', 'Provisional name from the first prompt')
})
it('keeps project/id metadata when the server has no title yet', () => {
  const view = render(<SessionName session={session} />)
  expect(screen.getByText('project', { exact: true })).toHaveClass('session-name-provisional')
  view.rerender(<SessionName session={{ session_id: 'pending-session' }} />)
  expect(screen.getByText('pending-session', { exact: true })).toHaveClass('session-name-provisional')
})
it('supports older server titles without a source as named sessions', () => {
  render(<SessionName session={{ ...session, title: 'Existing title' }} />)
  expect(screen.getByText('Existing title', { exact: true })).not.toHaveClass('session-name-provisional')
})
