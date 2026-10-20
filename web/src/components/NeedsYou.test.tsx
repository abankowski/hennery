import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { navigate } from '../router'
import { hat, host } from '../test-fixtures'
import { json, liveStream, routed, type LiveStream } from '../test-stream'
import type { SessionSummary } from '../generated/view'
const ts = '2026-10-20T10:00:00Z'
const row = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, host_id: 'host-1', hat_id: 'hat-b', agent: 'claude', cwd: '/project', title: id, lifecycle: 'active', activity: 'blocked', presumed_parked: false, question_waits: false, operator_attention: 1, parent_handled_questions: 0, created_at: ts, last_event_at: ts, ...patch })
const page = (sessions: SessionSummary[], next?: string) => json({ sessions, next_cursor: next, waiting: 2, epoch: 'list', revision: 1 })
afterEach(() => { history.replaceState(null, '', '/'); localStorage.clear() })
it('isolates hat-only/all-lifecycle queue pages and restores restrictive overview filters without another live SSE', async () => {
  localStorage.setItem('hennery.hat', 'hat-b')
  history.replaceState(null, '', '/sessions')
  const streams: LiveStream[] = []
  const server = routed(({ path }) => {
    const url = new URL(path, 'http://fixture')
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats') return json([hat()])
    if (path === '/api/hosts') return json([host(), host({ host_id: 'excluded', name: 'Excluded host' })])
    if (url.pathname === '/api/view/sessions') {
      if (url.searchParams.has('q') || url.searchParams.has('lifecycle')) return page([row('overview', { operator_attention: 0, lifecycle: 'parked' })])
      if (!url.searchParams.has('cursor')) return page([row('parent-handled', { operator_attention: 0, parent_handled_questions: 1 }), row('queued-answer', { operator_attention: 0, question_waits: true })], 'next')
      return page([row('active-request'), row('closed-status', { lifecycle: 'closed' })])
    }
    if (url.pathname === '/api/stream/sessions') { const stream = liveStream(); streams.push(stream); return stream.response }
    if (url.pathname.startsWith('/api/sessions/')) return json({ pending: [], ...row(url.pathname.split('/').at(-1)!) })
    if (url.pathname === '/api/delegation/attention') return json([{ id: 'attention', child_id: 'closed-status', hat_id: 'hat-b', pending_id: null, reason: 'child_failed' }])
    return json({ code: 'not_found', message: 'missing fixture' }, 404)
  })
  render(<App fetchImpl={server.fetch as typeof fetch} />)
  const overview = await screen.findByRole('region', { name: 'Session list' })
  await userEvent.selectOptions(within(overview).getByRole('combobox', { name: 'Lifecycle' }), 'parked')
  await userEvent.selectOptions(within(overview).getByRole('combobox', { name: 'Host' }), 'excluded')
  await userEvent.click(within(overview).getByRole('button', { name: /^Failed/ }))
  await userEvent.type(within(overview).getByRole('searchbox', { name: 'Search sessions' }), 'unrelated')
  await waitFor(() => expect(server.calls.some(c => c.path.includes('q=unrelated'))).toBe(true))
  act(() => navigate('/needs-you'))
  const queue = await screen.findByRole('region', { name: 'Attention queue' })
  await within(queue).findByRole('link', { name: 'Open closed-status' })
  expect(within(queue).getByRole('link', { name: 'Open active-request' })).toBeInTheDocument()
  expect(within(queue).queryByText('parent-handled', { exact: true })).toBeNull()
  expect(within(queue).queryByText('queued-answer', { exact: true })).toBeNull()
  expect(within(queue).getByText('Child session failed', { exact: true })).toBeInTheDocument()
  const reads = server.calls.filter(c => c.path.startsWith('/api/view/sessions?')).slice(-2).map(c => new URL(c.path, 'http://fixture').searchParams)
  expect(reads.map(params => [...params.keys()])).toEqual([['hat'], ['cursor', 'hat']])
  expect(reads.every(params => params.get('hat') === 'hat-b')).toBe(true)
  expect(streams.filter(s => !s.cancelled)).toHaveLength(1)
  const before = server.calls.filter(c => c.path.startsWith('/api/view/sessions')).length
  act(() => streams.at(-1)!.event('session_upsert', row('active-request', { operator_attention: 0 })))
  await waitFor(() => expect(within(queue).queryByRole('link', { name: 'Open active-request' })).toBeNull())
  expect(server.calls.filter(c => c.path.startsWith('/api/view/sessions'))).toHaveLength(before)
  act(() => navigate('/more')); act(() => navigate('/sessions'))
  const restored = await screen.findByRole('region', { name: 'Session list' })
  expect(within(restored).getByRole('searchbox')).toHaveValue('unrelated')
  expect(within(restored).getByRole('combobox', { name: 'Lifecycle' })).toHaveValue('parked')
  expect(within(restored).getByRole('combobox', { name: 'Host' })).toHaveValue('excluded')
  expect(within(restored).getByRole('button', { name: /^Failed/ })).toHaveAttribute('aria-pressed', 'true')
  expect(within(restored).getByRole('button', { name: 'Hide closed' })).toHaveAttribute('aria-pressed', 'true')
  await waitFor(() => expect(streams.filter(s => !s.cancelled)).toHaveLength(1))
  expect(server.calls.filter(c => c.path.startsWith('/api/stream/view/'))).toHaveLength(0)
})
it('scans at most three pages per deliberate visit/load more and never claims an incomplete queue is empty', async () => {
  history.replaceState(null, '', '/needs-you')
  let pages = 0
  const server = routed(({ path }) => {
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats') return json([hat()])
    if (path === '/api/hosts') return json([])
    if (path.startsWith('/api/view/sessions')) { pages++; return page([], pages < 5 ? String(pages) : undefined) }
    if (path.startsWith('/api/stream/sessions')) return liveStream().response
    return json({}, 404)
  })
  render(<App fetchImpl={server.fetch as typeof fetch} />)
  await waitFor(() => expect(pages).toBe(3))
  expect(screen.getByText('0 of 2 sessions needing you shown', { exact: true })).toBeInTheDocument()
  expect(screen.queryByText('Nothing needs you', { exact: true })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
  await waitFor(() => expect(pages).toBe(5))
  expect(screen.getByText('2 sessions need you', { exact: true })).toBeInTheDocument()
  expect(screen.queryByText('Nothing needs you', { exact: true })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
})
it('retries a failed queue page deliberately and resumes its bounded batch', async () => {
  history.replaceState(null, '', '/needs-you')
  let pages = 0
  const server = routed(({ path }) => {
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats' || path === '/api/hosts') return json([])
    if (path.startsWith('/api/view/sessions')) {
      pages++
      if (pages === 2) return json({ code: 'unavailable', message: 'Page unavailable' }, 503)
      return page([], pages < 5 ? String(pages) : undefined)
    }
    if (path.startsWith('/api/stream/sessions')) return liveStream().response
    return json({}, 404)
  })
  render(<App fetchImpl={server.fetch as typeof fetch} />)
  await screen.findByRole('alert')
  expect(pages).toBe(2)
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
  await waitFor(() => expect(pages).toBe(5))
  expect(screen.queryByRole('alert')).toBeNull()
})
it('opens a fresh attention baseline when the overview already requests every lifecycle', async () => {
  localStorage.setItem('hennery.hideClosed', 'false')
  history.replaceState(null, '', '/sessions')
  const reads: URL[] = []
  const server = routed(({ path }) => {
    const url = new URL(path, 'http://fixture')
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats' || path === '/api/hosts') return json([])
    if (url.pathname === '/api/view/sessions') {
      reads.push(url)
      return reads.length === 1 ? page([], 'overview-cursor') : page([row('closed', { lifecycle: 'closed' })])
    }
    if (path.startsWith('/api/stream/sessions')) return liveStream().response
    if (path.startsWith('/api/sessions/')) return json({ pending: [] })
    if (path.startsWith('/api/delegation/attention')) return json([])
    return json({}, 404)
  })
  render(<App fetchImpl={server.fetch as typeof fetch} />)
  await screen.findByRole('button', { name: 'Load more' })
  act(() => navigate('/needs-you'))
  await screen.findByRole('link', { name: 'Open closed' })
  expect(reads).toHaveLength(2)
  expect(reads.every(read => read.search === '')).toBe(true)
})

it.each([0, 1])('uses complete session counts and shows card keys only for a nonempty queue: %s', async count => {
  history.replaceState(null, '', '/needs-you')
  const server = routed(({ path }) => {
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats' || path === '/api/hosts') return json([])
    if (path.startsWith('/api/view/sessions')) return json({ sessions: count ? [row('request')] : [], waiting: count, epoch: 'e', revision: 1 })
    if (path.startsWith('/api/stream/sessions')) return liveStream().response
    if (path.startsWith('/api/sessions/')) return json({ pending: [] })
    if (path.startsWith('/api/delegation/attention')) return json([])
    return json({}, 404)
  })
  render(<App fetchImpl={server.fetch} />)
  const queue = await screen.findByRole('region', { name: 'Attention queue' })
  await within(queue).findByText(count ? '1 session needs you' : '0 sessions need you', { exact: true })
  expect(within(queue).queryAllByText('J / K moves between focused cards. Enter opens the current request.', { exact: true })).toHaveLength(count)
  const rail = await screen.findByRole('complementary', { name: 'Views' })
  expect(within(rail).getByRole('link', { name: 'All hats' })).toHaveAttribute('title', `All hats · ${count} ${count === 1 ? 'session' : 'sessions'} · ${count} need you`)
  expect(queue).not.toHaveTextContent(/\bloaded\b/)
})
