import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer, type Answer } from '../test-server'
import ProjectPicker, { COMPLETION_DELAY_MS } from './ProjectPicker'

afterEach(() => vi.useRealTimers())
function setup(routes: Record<string, Answer> = {}) {
  const server = stubServer({
    'GET /api/hosts/h/browse?path=%2Fsrv': json(200, { path: '/srv', entries: [{ name: 'project-new' }, { name: 'project-recent' }], truncated: false }),
    ...routes,
  })
  const change = vi.fn()
  const client = new Client({ fetch: server.fetch, stepUp: async () => {}, here: () => ({ pathname: '/new', search: '' }), navigate: vi.fn() })
  render(<ClientContext.Provider value={client}><span id="project-label">Project path</span><ProjectPicker hostId="h" browseRoot="/srv" labelledBy="project-label" entries={[{ name: 'project-recent', path: '/srv/project-recent', lastUsed: '2026-10-20T10:00:00Z' }, { name: 'project', path: '/srv/project' }]} onChange={change} /></ClientContext.Provider>)
  return { server, change, field: screen.getByRole('combobox', { name: 'Project path' }) }
}
it('debounces directory completion, merges recents first, deduplicates and accepts a keyboard choice', async () => {
  vi.useFakeTimers()
  const { server, change, field } = setup()
  fireEvent.change(field, { target: { value: '/srv/proj' } })
  await act(() => vi.advanceTimersByTimeAsync(COMPLETION_DELAY_MS - 1))
  expect(server.sent).toHaveLength(0)
  await act(() => vi.advanceTimersByTimeAsync(1))
  const options = within(screen.getByRole('listbox')).getAllByRole('option')
  expect(options).toHaveLength(3)
  expect(options[0]).toHaveTextContent('project-recent')
  expect(options[2]).toHaveTextContent('project-new')
  fireEvent.keyDown(field, { key: 'ArrowDown' }); fireEvent.keyDown(field, { key: 'ArrowDown' }); fireEvent.keyDown(field, { key: 'ArrowDown' })
  expect(field).toHaveAttribute('aria-activedescendant', options[2].id)
  fireEvent.keyDown(field, { key: 'Enter' })
  expect(field).toHaveValue('/srv/project-new')
  expect(change).toHaveBeenLastCalledWith('/srv/project-new')
  expect(screen.queryByRole('listbox')).toBeNull()
})
it('ignores an old directory response after a different path is typed', async () => {
  let finish!: (response: Response) => void
  const { server, field } = setup({
    'GET /api/hosts/h/browse?path=%2Fold': () => new Promise<Response>(resolve => { finish = resolve }),
    'GET /api/hosts/h/browse?path=%2Fnew': json(200, { path: '/new', entries: [{ name: 'current' }], truncated: false }),
  })
  fireEvent.change(field, { target: { value: '/old/o' } })
  await waitFor(() => expect(server.sent).toHaveLength(1))
  fireEvent.change(field, { target: { value: '/new/c' } })
  expect(await screen.findByRole('option', { name: 'current' })).toBeVisible()
  await act(async () => { finish(json(200, { path: '/old', entries: [{ name: 'old' }], truncated: false })) })
  expect(screen.queryByRole('option', { name: 'old' })).toBeNull()
})
it('expands home paths and keeps a literal path usable when suggestions fail', async () => {
  const { server, change, field } = setup({ 'GET /api/hosts/h/browse?path=%2Fsrv': json(503, { message: 'Temporarily unavailable' }) })
  fireEvent.change(field, { target: { value: '~/missing' } })
  expect(change).toHaveBeenLastCalledWith('~/missing')
  expect(await screen.findByText('Directory suggestions unavailable. You can still enter a path.', { exact: true })).toBeVisible()
  expect(server.sent[0].path).toBe('/api/hosts/h/browse?path=%2Fsrv')
  fireEvent.keyDown(field, { key: 'Escape' })
  expect(field).toHaveValue('~/missing')
})
it('keeps recent projects ahead of exact repository-name matches', () => {
  const { field } = setup()
  fireEvent.change(field, { target: { value: 'project' } })
  expect(screen.getAllByRole('option')[0]).toHaveTextContent('project-recent')
})
