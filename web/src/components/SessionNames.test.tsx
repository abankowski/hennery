import { act, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import SessionName, { firstPromptName, SessionNamesProvider } from './SessionNames'

const path = '/api/sessions/s%2F1/events?after=0&limit=100'
const event = (text: string) => ({ event_id: 2, kind: 'user_turn', body: { content: [{ type: 'text', text }] } })
const clientFor = (fetch: typeof globalThis.fetch) => new Client({ fetch, navigate: vi.fn(), stepUp: async () => {}, here: () => ({ pathname: '/sessions', search: '' }) })
const session = { session_id: 's/1', cwd: '/srv/project', last_event_at: 'now' }
it.each([true, false])('honors server title provenance with a names provider: %s', async withProvider => {
  const server = stubServer({}), client = clientFor(server.fetch)
  const tree = (source: 'agent' | 'operator' | 'prompt') => {
    const name = <SessionName session={{ ...session, title: 'Server supplied title', title_source: source }} />
    return <ClientContext.Provider value={client}>{withProvider ? <SessionNamesProvider active>{name}</SessionNamesProvider> : name}</ClientContext.Provider>
  }
  const view = render(tree('agent'))
  for (const source of ['agent', 'operator', 'prompt'] as const) {
    view.rerender(tree(source))
    const name = screen.getByText('Server supplied title', { exact: true })
    if (source === 'prompt') {
      expect(name).toHaveClass('session-name-provisional')
      expect(name).toHaveAttribute('title', 'Provisional name from the first prompt')
    } else expect(name).not.toHaveClass('session-name-provisional')
  }
  await act(async () => { await Promise.resolve() })
  expect(server.sent).toHaveLength(0)
})
it('clips the first prompt line by characters without including later lines or splitting emoji', () => {
  expect(firstPromptName({ content: [{ type: 'text', text: 'First line\nSecret second line' }] })).toBe('First line')
  expect([...firstPromptName({ content: [{ type: 'text', text: '🌱'.repeat(100) }] })!]).toHaveLength(80)
  expect(firstPromptName({ content: [{ type: 'image', text: 'Not text content' }] })).toBeNull()
})
it('shares one read across surfaces, escapes prompt text and prefers a later agent title', async () => {
  const server = stubServer({ [`GET ${path}`]: json(200, [event('<b>Check parser</b>\nPrivate follow-up')]) }), client = clientFor(server.fetch)
  const tree = (title?: string) => <ClientContext.Provider value={client}><SessionNamesProvider active><SessionName session={{ ...session, title }} /><SessionName session={{ ...session, title }} /></SessionNamesProvider></ClientContext.Provider>
  const view = render(tree())
  const names = await screen.findAllByText('<b>Check parser</b>', { exact: true })
  expect(names).toHaveLength(2)
  expect(names[0]).toHaveClass('session-name-provisional')
  expect(names[0].querySelector('b')).toBeNull()
  expect(screen.queryByText('Private follow-up')).toBeNull()
  expect(server.sent).toHaveLength(1)
  view.rerender(tree('Agent supplied name'))
  expect(screen.getAllByText('Agent supplied name')[0]).not.toHaveClass('session-name-provisional')
  expect(server.sent).toHaveLength(1)
})
it('reads the earliest prompt across event pages instead of using a later transcript tail', async () => {
  const server = stubServer({
    [`GET ${path}`]: json(200, Array.from({ length: 100 }, (_, i) => ({ event_id: i + 1, kind: 'config_applied', body: {} }))),
    'GET /api/sessions/s%2F1/events?after=100&limit=100': json(200, [event('Original prompt')]),
  })
  render(<ClientContext.Provider value={clientFor(server.fetch)}><SessionNamesProvider active><SessionName session={session} /></SessionNamesProvider></ClientContext.Provider>)
  expect(await screen.findByText('Original prompt')).toHaveClass('session-name-provisional')
  expect(server.sent).toHaveLength(2)
})
it('discards an in-flight private name on logout and reads afresh on the next login', async () => {
  let finish!: (response: Response) => void
  const server = stubServer({ [`GET ${path}`]: [() => new Promise<Response>(resolve => { finish = resolve }), json(200, [event('Fresh session name')])] }), client = clientFor(server.fetch)
  const tree = (active: boolean) => <ClientContext.Provider value={client}><SessionNamesProvider active={active}><SessionName session={session} /></SessionNamesProvider></ClientContext.Provider>
  const view = render(tree(true))
  await waitFor(() => expect(server.sent).toHaveLength(1))
  view.rerender(tree(false))
  await act(async () => { finish(json(200, [event('Old private prompt')])) })
  expect(screen.queryByText('Old private prompt')).toBeNull()
  view.rerender(tree(true))
  expect(await screen.findByText('Fresh session name')).toBeVisible()
  expect(server.sent).toHaveLength(2)
})
it('survives StrictMode effect cleanup and restores its name reader', async () => {
  const server = stubServer({ [`GET ${path}`]: () => json(200, [event('Strict reader')]) })
  render(<StrictMode><ClientContext.Provider value={clientFor(server.fetch)}><SessionNamesProvider active><SessionName session={session} /></SessionNamesProvider></ClientContext.Provider></StrictMode>)
  expect(await screen.findByText('Strict reader')).toBeVisible()
})
it('shares an empty lookup across a full summary and a family reference without refetching in a loop', async () => {
  const server = stubServer({ [`GET ${path}`]: () => json(200, []) })
  render(<ClientContext.Provider value={clientFor(server.fetch)}><SessionNamesProvider active><SessionName session={{ ...session, activity: 'idle' }} /><SessionName session={{ session_id: session.session_id }} /></SessionNamesProvider></ClientContext.Provider>)
  await act(async () => { await Promise.resolve() })
  expect(screen.getByText('project', { exact: true })).toBeVisible()
  expect(server.sent).toHaveLength(1)
})
it('waits for session metadata and never reads prompts for an agent-named session', async () => {
  const server = stubServer({}), client = clientFor(server.fetch)
  const tree = (ready: boolean) => <ClientContext.Provider value={client}><SessionNamesProvider active><SessionName session={{ ...session, title: ready ? 'Named by agent' : undefined }} ready={ready} /></SessionNamesProvider></ClientContext.Provider>
  const view = render(tree(false))
  await act(async () => { await Promise.resolve() })
  expect(server.sent).toHaveLength(0)
  view.rerender(tree(true))
  expect(screen.getByText('Named by agent')).toBeVisible()
  expect(server.sent).toHaveLength(0)
})
