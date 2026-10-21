import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
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

async function openBrowse() {
  fireEvent.click(screen.getByRole('button', { name: 'Browse' }))
  const browse = screen.getByRole('group', { name: 'Browse directories' })
  await within(browse).findByRole('button', { name: 'Use this directory' })
  return browse
}

function pointer(target: HTMLElement, pointerType = 'mouse', button = 0, offsetX = 1, offsetY = 1) {
  Object.defineProperties(target, { clientWidth: { configurable: true, value: 100 }, clientHeight: { configurable: true, value: 100 } })
  const event = new Event('pointerdown', { bubbles: true })
  Object.assign(event, { pointerType, button, offsetX, offsetY })
  fireEvent(target, event)
}

it('Enter in the input chooses the shown directory, ignoring an active suggestion', async () => {
  const { change, field } = setup()
  fireEvent.focus(field)
  fireEvent.keyDown(field, { key: 'ArrowDown' })
  await openBrowse()
  fireEvent.focus(field)
  change.mockClear()
  fireEvent.keyDown(field, { key: 'Enter' })
  expect(change).toHaveBeenCalledExactlyOnceWith('/srv')
  expect(field).toHaveValue('/srv')
  expect(screen.queryByRole('group', { name: 'Browse directories' })).toBeNull()
})

it('Enter on a row descends and Enter on Use this chooses that directory', async () => {
  const user = userEvent.setup()
  const { change, field } = setup({
    'GET /api/hosts/h/browse?path=%2Fsrv%2Fproject-new': json(200, { path: '/srv/project-new', parent: '/srv', entries: [], truncated: false }),
  })
  const browse = await openBrowse()
  within(browse).getByRole('button', { name: 'project-new' }).focus()
  await user.keyboard('{Enter}')
  await within(browse).findByText('/srv/project-new', { exact: true })
  expect(change).not.toHaveBeenCalled()
  expect(within(browse).getByRole('button', { name: 'Use this directory' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(change).toHaveBeenCalledExactlyOnceWith('/srv/project-new')
  expect(field).toHaveValue('/srv/project-new')
  expect(browse).not.toBeInTheDocument()
  expect(field).toHaveFocus()
})

it('Enter on the Browse control chooses the current directory', async () => {
  const user = userEvent.setup()
  const { change } = setup()
  await openBrowse()
  screen.getByRole('button', { name: 'Browse' }).focus()
  await user.keyboard('{Enter}')
  expect(change).toHaveBeenCalledExactlyOnceWith('/srv')
})

it('clicking Use this chooses the directory without an outside-pointer commit', async () => {
  const user = userEvent.setup()
  const { change, field } = setup()
  const browse = await openBrowse()
  await user.click(within(browse).getByRole('button', { name: 'Use this directory' }))
  expect(change).toHaveBeenCalledExactlyOnceWith('/srv')
  expect(field).toHaveValue('/srv')
  expect(browse).not.toBeInTheDocument()
})

it('Enter on the parent row still navigates up', async () => {
  const user = userEvent.setup()
  const { change } = setup({
    'GET /api/hosts/h/browse?path=%2Fsrv': json(200, { path: '/srv', parent: '/', entries: [], truncated: false }),
    'GET /api/hosts/h/browse?path=%2F': json(200, { path: '/', entries: [{ name: 'srv' }], truncated: false }),
  })
  const browse = await openBrowse()
  within(browse).getByRole('button', { name: '.. (up)' }).focus()
  await user.keyboard('{Enter}')
  await within(browse).findByText('/', { exact: true })
  expect(change).not.toHaveBeenCalled()
})

it('an outside pointer chooses the shown directory and closes, while inside pointers do not', async () => {
  const { change, field } = setup()
  const browse = await openBrowse()
  fireEvent.pointerDown(within(browse).getByText('/srv', { exact: true }))
  expect(change).not.toHaveBeenCalled()
  pointer(document.body)
  expect(change).toHaveBeenCalledExactlyOnceWith('/srv')
  expect(field).toHaveValue('/srv')
  expect(browse).not.toBeInTheDocument()
})

it('an outside pointer during loading closes without choosing or reopening on a late response', async () => {
  let finish!: (response: Response) => void
  const { change } = setup({ 'GET /api/hosts/h/browse?path=%2Fsrv': () => new Promise<Response>(resolve => { finish = resolve }) })
  fireEvent.click(screen.getByRole('button', { name: 'Browse' }))
  await waitFor(() => expect(finish).toBeDefined())
  pointer(document.body)
  expect(screen.queryByRole('group', { name: 'Browse directories' })).toBeNull()
  await act(async () => { finish(json(200, { path: '/srv', entries: [], truncated: false })) })
  expect(change).not.toHaveBeenCalled()
  expect(screen.queryByRole('group', { name: 'Browse directories' })).toBeNull()
})

it('an outside pointer after a listing failure closes without choosing', async () => {
  const { change } = setup({ 'GET /api/hosts/h/browse?path=%2Fsrv': json(503, { message: 'Temporarily unavailable' }) })
  fireEvent.click(screen.getByRole('button', { name: 'Browse' }))
  await screen.findByRole('alert')
  pointer(document.body)
  expect(change).not.toHaveBeenCalled()
  expect(screen.queryByRole('group', { name: 'Browse directories' })).toBeNull()
})

it.each(['input', 'row', 'use', 'browse'])('Escape from %s closes browsing without choosing or reaching the dialog', async control => {
  const { change, field } = setup()
  const browse = await openBrowse()
  const target = control === 'input' ? field : control === 'browse' ? screen.getByRole('button', { name: 'Browse' }) : within(browse).getByRole('button', { name: control === 'row' ? 'project-new' : 'Use this directory' })
  const outerKey = vi.fn()
  document.addEventListener('keydown', outerKey)
  try {
    fireEvent.keyDown(target, { key: 'Escape' })
    expect(browse).not.toBeInTheDocument()
    expect(change).not.toHaveBeenCalled()
    expect(outerKey).not.toHaveBeenCalled()
    expect(field).toHaveFocus()
  } finally { document.removeEventListener('keydown', outerKey) }
})

it.each(['touch', 'pen'])('%s outside scroll/cancel does not choose, but an outside tap does', async pointerType => {
  const { change } = setup()
  const browse = await openBrowse()
  pointer(document.body, pointerType)
  expect(change).not.toHaveBeenCalled()
  fireEvent.pointerCancel(document.body)
  expect(browse).toBeInTheDocument()
  pointer(document.body, pointerType)
  fireEvent.click(document.body, { button: 0 })
  expect(change).toHaveBeenCalledExactlyOnceWith('/srv')
  expect(browse).not.toBeInTheDocument()
})

it.each([1, 2])('outside mouse button %i does not choose or close', async button => {
  const { change } = setup()
  const browse = await openBrowse()
  pointer(document.body, 'mouse', button)
  expect(change).not.toHaveBeenCalled()
  expect(browse).toBeInTheDocument()
})

it.each([[100, 1], [1, 100]])('outside scrollbar hit at %i,%i does not choose', async (x, y) => {
  const { change } = setup()
  const browse = await openBrowse()
  pointer(document.body, 'mouse', 0, x, y)
  expect(change).not.toHaveBeenCalled()
  expect(browse).toBeInTheDocument()
})

it.each([{ isComposing: true }, { keyCode: 229 }])('IME Enter does not choose a browse directory: %o', async init => {
  const { change, field } = setup()
  const browse = await openBrowse()
  fireEvent.keyDown(field, { key: 'Enter', ...init })
  expect(change).not.toHaveBeenCalled()
  expect(browse).toBeInTheDocument()
})

it('prevents a held Enter after a browse choice from submitting the enclosing form', async () => {
  const { field } = setup()
  await openBrowse()
  fireEvent.keyDown(field, { key: 'Enter' })
  const repeated = new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true })
  fireEvent(field, repeated)
  expect(repeated.defaultPrevented).toBe(true)
})

it('describes the choice with the full path and announces navigation politely', async () => {
  setup()
  const browse = await openBrowse()
  const use = within(browse).getByRole('button', { name: 'Use this directory' })
  expect(use).toHaveAccessibleDescription('/srv')
  const path = within(browse).getByText('/srv', { exact: true })
  expect(path).toHaveAttribute('title', '/srv')
  expect(screen.getByRole('status')).toHaveTextContent('/srv')
})

it('suggestion mode still requires a choice and outside clicks do not select it', () => {
  const { change, field } = setup()
  fireEvent.focus(field)
  fireEvent.keyDown(field, { key: 'Enter' })
  fireEvent.pointerDown(document.body)
  expect(change).not.toHaveBeenCalled()
  fireEvent.keyDown(field, { key: 'ArrowDown' })
  fireEvent.keyDown(field, { key: 'Enter' })
  expect(change).toHaveBeenCalledExactlyOnceWith('/srv/project-recent')
  expect(field).toHaveValue('project-recent')
})

it('an outside touch choice preserves the focus of the tapped field', async () => {
  const { change } = setup()
  await openBrowse()
  const outside = document.createElement('textarea')
  document.body.append(outside)
  try {
    pointer(outside, 'touch')
    outside.focus()
    fireEvent.click(outside, { button: 0 })
    expect(change).toHaveBeenCalledExactlyOnceWith('/srv')
    expect(outside).toHaveFocus()
  } finally { outside.remove() }
})

it('consumes an inside touch click before a later keyboard click outside', async () => {
  const { change } = setup()
  const browse = await openBrowse()
  const header = within(browse).getByText('/srv', { exact: true })
  pointer(header, 'touch')
  fireEvent.click(header, { button: 0, detail: 1 })
  fireEvent.click(document.body, { button: 0, detail: 0 })
  expect(change).not.toHaveBeenCalled()
  expect(browse).toBeInTheDocument()
})

it.each([{ isComposing: true }, { keyCode: 229 }])('composition Escape stays inside the picker: %o', async init => {
  const { change, field } = setup()
  const browse = await openBrowse(), outerKey = vi.fn()
  document.addEventListener('keydown', outerKey)
  try {
    fireEvent.keyDown(field, { key: 'Escape', ...init })
    expect(browse).toBeInTheDocument()
    expect(change).not.toHaveBeenCalled()
    expect(outerKey).not.toHaveBeenCalled()
  } finally { document.removeEventListener('keydown', outerKey) }
})

it('does not steal input focus when the initial Browse listing arrives', async () => {
  let finish!: (response: Response) => void
  const { field } = setup({ 'GET /api/hosts/h/browse?path=%2Fsrv': () => new Promise<Response>(resolve => { finish = resolve }) })
  fireEvent.click(screen.getByRole('button', { name: 'Browse' }))
  await waitFor(() => expect(finish).toBeDefined())
  act(() => { field.focus() })
  await act(async () => { finish(json(200, { path: '/srv', entries: [], truncated: false })) })
  expect(field).toHaveFocus()
})
