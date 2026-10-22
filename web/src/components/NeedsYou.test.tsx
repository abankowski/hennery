import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { navigate } from '../router'
import { hat, host } from '../test-fixtures'
import { json, liveStream, routed, type LiveStream } from '../test-stream'
import type { SessionSummary } from '../generated/view'
import { completeLogout } from '../pwa/logout'
const ts = '2026-10-20T10:00:00Z'
const row = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, host_id: 'host-1', hat_id: 'hat-b', agent: 'claude', cwd: '/project', title: id, lifecycle: 'active', activity: 'blocked', presumed_parked: false, question_waits: false, operator_attention: 1, parent_handled_questions: 0, created_at: ts, last_event_at: ts, ...patch })
const page = (sessions: SessionSummary[], next?: string) => json({ sessions, next_cursor: next, waiting: 2, epoch: 'list', revision: 1 })

it('an unread result bypasses an old local dismiss and reading it keeps formal work in the queue', async () => {
  history.replaceState(null, '', '/needs-you')
  localStorage.setItem('hennery.dismissedAttention', JSON.stringify({ result: `session:${ts}:0` }))
  const streams: LiveStream[] = []
  let current = row('result', { title: 'Review result', activity: 'idle', operator_attention: 0, review: { event_id: 10, turn_id: 't', outcome: 'completed' } })
  const server = routed(({ path, method }) => {
    const url = new URL(path, 'http://h')
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats') return json([hat()])
    if (path === '/api/hosts') return json([host()])
    if (url.pathname === '/api/view/sessions') return json({ sessions: [current], waiting: 1, epoch: 'list', revision: 10 })
    if (url.pathname === '/api/stream/sessions') { const live = liveStream(); streams.push(live); return live.response }
    if (url.pathname === '/api/view/sessions/result/read' && method === 'POST') {
      current = { ...current, review: undefined, operator_attention: 1, question_waits: true }
      streams.at(-1)!.event('session_upsert', current)
      return new Response(null, { status: 204 })
    }
    if (url.pathname === '/api/view/sessions/result') return json({ items: [{ id: 'm', kind: 'message', turn_id: 't', version: 9, ts, text: 'Continue?' }], older: false, epoch: 'items', revision: 10 })
    if (url.pathname === '/api/sessions/result') return json({ ...current, pending: [{ pending_id: 'permission', state: 'open', answered: false }] })
    if (url.pathname.includes('/questions/')) return json({ id: 'question:permission', kind: 'question', version: 11, ts, pending_id: 'permission', question_kind: 'permission', request: { type: 'permission', title: 'Approve deployment', options: [{ option_id: 'allow', name: 'Allow', option_kind: 'allow_once' }] }, state: 'open', answered: false, answerable: true })
    return json({}, 404)
  })
  render(<App fetchImpl={server.fetch} />)
  const queue = await screen.findByRole('region', { name: 'Attention queue' })
  const card = await within(queue).findByRole('article', { name: 'Review result' })
  await within(card).findByText('Continue?', { exact: true })
  await waitFor(() => expect(streams.length).toBeGreaterThan(0))
  await userEvent.click(within(card).getByRole('button', { name: 'Mark as read' }))
  await within(card).findByRole('button', { name: 'Allow' })
  expect(within(queue).getByRole('article', { name: 'Review result' })).toBeVisible()
  expect(server.calls.filter(call => call.method === 'POST').map(call => call.path)).toEqual(['/api/view/sessions/result/read'])
})
it('keeps closed child attention/counts consistent, persists local dismiss and reveals new question attention', async () => {
  history.replaceState(null, '', '/needs-you')
  let pending = 'one', acknowledged = false
  const streams: LiveStream[] = []
  const closed = row('closed-child', { title: 'Closed worker', lifecycle: 'closed', family: { revision: 1, parent: { session_id: 'parent', title: 'Coordinator', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 1 } })
  const question = row('question', { title: 'Choose parser' })
  const server = routed(({ path, method }) => {
    const url = new URL(path, 'http://h')
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats') return json([hat()])
    if (path === '/api/hosts') return json([host()])
    if (url.pathname === '/api/view/sessions') return json({ sessions: [question, ...(acknowledged ? [] : [closed])], waiting: acknowledged ? 1 : 2, epoch: 'list', revision: 1 })
    if (url.pathname === '/api/stream/sessions') { const live = liveStream(); streams.push(live); return live.response }
    if (url.pathname === '/api/sessions/question') return json({ ...question, pending: [{ pending_id: pending, state: 'open', answered: false }] })
    if (url.pathname.includes('/questions/')) return json({ id: `question:${pending}`, kind: 'question', version: 1, ts, pending_id: pending, question_kind: 'elicitation', request: { type: 'elicitation', message: 'Which parser? Full options belong in the session.', form_supported: true, fields: [{ key: 'parser', label: 'Parser', field_kind: 'single', options: [{ value: 'strict', label: 'Strict' }] }] }, state: 'open', answered: false, answerable: true })
    if (url.pathname === '/api/sessions/closed-child') return json({ ...closed, pending: [] })
    if (url.pathname === '/api/delegation/attention') return json(acknowledged ? [] : [{ id: 'report', child_id: 'closed-child', hat_id: 'hat-b', pending_id: null, reason: 'endpoint_unavailable' }])
    if (url.pathname === '/api/delegation/attention/report/acknowledge' && method === 'POST') { acknowledged = true; return new Response(null, { status: 204 }) }
    return json({}, 404)
  })
  render(<App fetchImpl={server.fetch} />)
  const queue = await screen.findByRole('region', { name: 'Attention queue' })
  await within(queue).findByText("Couldn't deliver this child's report to its parent", { exact: true })
  expect(within(queue).getByText('Closed', { exact: true })).toBeInTheDocument()
  expect(within(queue).getByText(/^Child of/)).toHaveTextContent('Child of Coordinator')
  const card = () => within(queue).getByRole('article', { name: 'Choose parser' })
  await userEvent.click(await within(card()).findByRole('button', { name: 'Dismiss' }))
  await within(queue).findByText('1 session needs you', { exact: true })
  expect(within(queue).queryByRole('article', { name: 'Choose parser' })).toBeNull()
  act(() => navigate('/sessions'))
  await screen.findByRole('button', { name: 'Needs you 1' })
  act(() => navigate('/more')); act(() => navigate('/needs-you'))
  const returned = await screen.findByRole('region', { name: 'Attention queue' })
  await within(returned).findByRole('button', { name: 'Show 1 dismissed' })
  expect(within(returned).queryByRole('article', { name: 'Choose parser' })).toBeNull()
  pending = 'two'
  act(() => streams.at(-1)!.event('session_upsert', { ...question, last_event_at: '2026-10-20T11:00:00Z' }))
  await within(returned).findByRole('article', { name: 'Choose parser' })
  await within(returned).findByText('2 sessions need you', { exact: true })
  await userEvent.click(within(returned).getByRole('button', { name: 'Acknowledge' }))
  await within(returned).findByText('1 session needs you', { exact: true })
  await userEvent.click(within(returned).getByRole('button', { name: 'Dismiss' }))
  await within(returned).findByText('0 sessions need you', { exact: true })
  act(() => navigate('/sessions'))
  await within(await screen.findByRole('region', { name: 'Session list' })).findByText('Choose parser', { exact: true })
  expect(screen.getByRole('button', { name: 'Needs you 0' })).toBeInTheDocument()
  expect(server.calls.filter(call => call.method === 'POST').map(call => call.path)).toEqual(['/api/delegation/attention/report/acknowledge'])
  await completeLogout(server.client, false)
  expect(localStorage.getItem('hennery.dismissedAttention')).toBeNull()
})
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
  expect(screen.getByText('0 sessions needing you shown', { exact: true })).toBeInTheDocument()
  expect(screen.queryByText('Nothing needs you', { exact: true })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
  await waitFor(() => expect(pages).toBe(5))
  expect(screen.getByText('0 sessions need you', { exact: true })).toBeInTheDocument()
  expect(screen.getByText('Nothing needs you', { exact: true })).toBeInTheDocument()
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
