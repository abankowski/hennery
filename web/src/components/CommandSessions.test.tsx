import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { useLoadedSessions } from '../app-actions'
import { json, liveStream, routed, type LiveStream } from '../test-stream'
import type { SessionSummary } from '../generated/view'

vi.mock('./CommandHost', () => ({ default: () => {
  const sessions = useLoadedSessions()
  return <output aria-label="Command host sessions">{[...sessions.values()].map(s => s.title).join(', ') || 'No shared sessions'}</output>
} }))
afterEach(() => { history.replaceState(null, '', '/'); localStorage.clear() })
const summary: SessionSummary = { session_id: 'one', host_id: 'host', hat_id: 'hat', agent: 'claude', cwd: '/project', title: 'Shared session', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: 0, parent_handled_questions: 0, created_at: '', last_event_at: '' }

it('App-mounted command host subscribes to the existing loaded session map and clears on sign out', async () => {
  history.replaceState(null, '', '/sessions')
  const streams: LiveStream[] = []
  const server = routed(({ path }) => {
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats' || path === '/api/hosts') return json([])
    if (path.startsWith('/api/view/sessions')) return json({ sessions: [summary], waiting: 0, epoch: 'e', revision: 1 })
    if (path.startsWith('/api/stream/sessions')) { const stream = liveStream(); streams.push(stream); return stream.response }
    if (path === '/api/auth/logout') return new Response(null, { status: 204 })
    return json({ code: 'not_found', message: 'fixture' }, 404)
  })
  render(<App fetchImpl={server.fetch} />)
  await screen.findByRole('region', { name: 'Session list' })
  const output = await screen.findByRole('status', { name: 'Command host sessions' })
  await waitFor(() => expect(output).toHaveTextContent('Shared session'))
  expect(streams).toHaveLength(1)
  expect(server.calls.filter(c => c.path.startsWith('/api/view/sessions'))).toHaveLength(1)
  act(() => streams[0].event('session_upsert', { ...summary, title: 'Updated shared session' }, 'e:2'))
  await waitFor(() => expect(output).toHaveTextContent('Updated shared session'))
  act(() => streams[0].event('session_removed', { session_id: 'one' }, 'e:3'))
  await waitFor(() => expect(output).toHaveTextContent('No shared sessions'))
  act(() => streams[0].event('session_upsert', summary, 'e:4'))
  await waitFor(() => expect(output).toHaveTextContent('Shared session'))
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => expect(location.pathname).toBe('/login'))
  await waitFor(() => expect(output).toHaveTextContent('No shared sessions'))
  expect(streams[0].cancelled).toBe(true)
})

it('command host has an empty map in gateway mode without session reads', async () => {
  history.replaceState(null, '', '/more')
  const server = routed(({ path }) => path === '/api/capabilities' ? json({ mode: 'gateway', features: [] }) : json({}, 404))
  render(<App fetchImpl={server.fetch} />)
  await screen.findByRole('navigation', { name: 'More navigation' })
  expect(await screen.findByRole('status', { name: 'Command host sessions' })).toHaveTextContent('No shared sessions')
  expect(server.calls.map(c => c.path)).toEqual(['/api/capabilities'])
})

it.each([false, true])('Defaults is advertised in rail and More only with its capability: %s', async enabled => {
  history.replaceState(null, '', '/more')
  const server = routed(({ path }) => {
    if (path === '/api/capabilities') return json({ mode: 'full', features: enabled ? ['session_defaults'] : [] })
    if (path === '/api/hats' || path === '/api/hosts') return json([])
    if (path.startsWith('/api/view/sessions')) return json({ sessions: [], waiting: 0, epoch: 'e', revision: 1 })
    if (path.startsWith('/api/stream/sessions')) return liveStream().response
    return json({}, 404)
  })
  render(<App fetchImpl={server.fetch} />)
  for (const name of ['Main navigation', 'More navigation']) {
    const nav = await screen.findByRole('navigation', { name })
    expect(within(nav).queryAllByRole('link', { name: 'Defaults' })).toHaveLength(enabled ? 1 : 0)
  }
})
