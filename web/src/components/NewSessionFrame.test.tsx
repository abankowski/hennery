import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { FULL, json, stubServer } from '../test-server'
import { hat, host } from '../test-fixtures'
import { json as response, liveStream, routed } from '../test-stream'
const server = () => stubServer({ 'GET /api/capabilities': json(200, FULL), 'GET /api/hosts': json(200, []), 'GET /api/hats': json(200, []), 'GET /api/view/sessions?lifecycle=starting%2Cactive%2Cparked%2Cfailed': json(200, { sessions: [], waiting: 0, epoch: 'e', revision: 1 }) })
afterEach(() => { history.replaceState(null, '', '/'); localStorage.clear() })
it('direct launcher Escape returns to Sessions without Back into unrelated history', async () => {
  history.replaceState(null, '', '/new?host=unknown')
  render(<App fetchImpl={server().fetch} />)
  const dialog = await screen.findByRole('dialog', { name: 'New session' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(document.querySelector<HTMLElement>('.rail')?.inert).toBe(true)
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(location.pathname).toBe('/sessions'))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.querySelector<HTMLElement>('.rail')?.inert).toBe(false)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Sessions' })).toHaveFocus())
})
it('Close returns to the known app opener and restores its trigger focus', async () => {
  history.replaceState(null, '', '/more')
  render(<App fetchImpl={server().fetch} />)
  const rail = await screen.findByRole('complementary', { name: 'Views' })
  await userEvent.click(within(rail).getByRole('link', { name: 'New session' }))
  const dialog = await screen.findByRole('dialog', { name: 'New session' })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Close new session' }))
  await waitFor(() => expect(location.pathname).toBe('/more'))
  await waitFor(() => expect(within(rail).getByRole('link', { name: 'New session' })).toHaveFocus())
})

it('Escape first dismisses project suggestions without losing the unsent launch prompt', async () => {
  history.replaceState(null, '', '/new')
  const fixture = routed(({ path }) => {
    if (path === '/api/capabilities') return response(FULL)
    if (path === '/api/hats') return response([hat({ id: 'hat-a' })])
    if (path === '/api/hosts') return response([host({ capabilities: ['projects', 'resolve_path'] })])
    if (path === '/api/hosts/host-1/projects') return response({ recents_hat_id: 'hat-a', recents: [], items: [{ path: '/srv/project' }], partial: false, home: '/srv' })
    if (path.startsWith('/api/hosts/host-1/agents')) return response([])
    if (path.startsWith('/api/view/sessions')) return response({ sessions: [], waiting: 0, epoch: 'e', revision: 1 })
    if (path.startsWith('/api/stream/sessions')) return liveStream().response
    return response({ code: 'not_found', message: 'fixture' }, 404)
  })
  render(<App fetchImpl={fixture.fetch} />)
  const dialog = await screen.findByRole('dialog', { name: 'New session' })
  const prompt = await within(dialog).findByRole('textbox', { name: /^First prompt/ })
  fireEvent.change(prompt, { target: { value: 'Preserve this unsent launch brief' } })
  const project = await within(dialog).findByRole('combobox', { name: /^Project/ })
  fireEvent.change(project, { target: { value: 'project' } })
  await within(dialog).findByRole('listbox')
  fireEvent.keyDown(project, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
  expect(location.pathname).toBe('/new')
  expect(prompt).toHaveValue('Preserve this unsent launch brief')
  expect(dialog).toBeInTheDocument()
  fireEvent.keyDown(project, { key: 'Escape' })
  await waitFor(() => expect(location.pathname).toBe('/sessions'))
  expect(screen.queryByRole('dialog')).toBeNull()
})
