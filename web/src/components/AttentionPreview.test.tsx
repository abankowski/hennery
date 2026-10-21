import { act, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import type { SessionSummary, Item } from '../generated/view'
import { routed, json } from '../test-stream'
import AttentionPreview, { AttentionPreviews, PreviewReader } from './AttentionPreview'
import { clearDismissedAttention } from '../lib/dismissedAttention'
const session = (id: string): SessionSummary => ({ session_id: id, host_id: 'h', hat_id: 'hat', agent: 'claude', cwd: '/project', lifecycle: 'active', activity: 'blocked', presumed_parked: false, question_waits: true, operator_attention: 1, parent_handled_questions: 0, created_at: '2026-10-20T10:00:00Z', last_event_at: '2026-10-20T10:00:00Z' })
const question = (pending: string): Item => ({ id: 'question:' + pending, version: 2, ts: '', kind: 'question', pending_id: pending, question_kind: 'permission', request: { type: 'permission', title: 'Typed read-only request', options: [{ option_id: 'allow', name: 'Allow', option_kind: 'allow_once' }] }, answerable: true, answered: false, state: 'open' })
it('cannot restore local dismiss records after sign-out unmounts a pending acknowledgement', async () => {
  let finish!: (response: Response) => void
  const ack = new Promise<Response>(resolve => { finish = resolve })
  const t = routed(call => call.method === 'POST' ? ack : call.path.startsWith('/api/delegation/attention') ? json([{ id: 'report', child_id: 's', hat_id: 'hat', pending_id: null, reason: 'child_failed' }]) : json({ pending: [] }))
  const view = render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
  await screen.findByText('Child session failed', { exact: true })
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  view.unmount(); clearDismissedAttention()
  await act(async () => { finish(new Response(null, { status: 204 })); await ack })
  expect(localStorage.getItem('hennery.dismissedAttention')).toBeNull()
})
it('limits every preview request to two, caches a snapshot and invalidates a same-time attention upsert', async () => {
  let active = 0, maximum = 0
  const releases: (() => void)[] = []
  const t = routed(call => {
    active++; maximum = Math.max(active, maximum)
    return new Promise<Response>(resolve => { releases.push(() => { active--; resolve(call.path.includes('/questions/') ? json(question(call.path.split('/').at(-1)!)) : json({ pending: [{ pending_id: 'pending-' + call.path.split('/').at(-1), state: 'open', answered: false, payload: { title: 'Never render payload' } }] })) }) })
  })
  const reader = new PreviewReader(t.client), a = session('a'), b = session('b'), c = session('c')
  const reads = [reader.read(a), reader.read(b), reader.read(c)]
  expect(reader.read(a)).toBe(reads[0])
  expect(t.calls).toHaveLength(2)
  for (let i = 0; i < 6; i++) { await waitFor(() => expect(releases.length).toBeGreaterThan(i)); releases[i]() }
  const values = await Promise.all(reads)
  expect(maximum).toBe(2)
  expect(values[0].question).toEqual(question('pending-a'))
  const changed = reader.read({ ...a })
  await waitFor(() => expect(releases).toHaveLength(7)); releases[6]()
  await waitFor(() => expect(releases).toHaveLength(8)); releases[7]()
  await changed
  expect(t.calls.filter(call => call.path === '/api/sessions/a')).toHaveLength(2)
  reader.stop()
})
it('uses the bounded typed question route, answers with the real option id, and refetches on focus', async () => {
  const t = routed(call => call.method === 'POST' ? json({}, 202) : call.path.includes('/questions/') ? json(question('pending/a')) : json({ pending: [{ pending_id: 'pending/a', state: 'open', answered: false, payload: { title: 'Never render payload' } }] }))
  render(<AttentionPreviews><AttentionPreview session={session('s/a')} /></AttentionPreviews>, { wrapper: t.wrapper })
  const link = await screen.findByRole('link', { name: 'Open s/a' })
  await screen.findByText('Typed read-only request', { exact: true })
  expect(link).toHaveAttribute('href', '/sessions/s%2Fa?pending=pending%2Fa')
  expect(screen.queryByText('Never render payload', { exact: true })).toBeNull()
  expect(t.calls.every(call => call.method === 'GET' && !call.path.includes('/stream/'))).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Allow' }))
  expect(t.calls.find(call => call.method === 'POST')).toMatchObject({ path: '/api/sessions/s%2Fa/pending/pending%2Fa/answer' })
  expect(JSON.parse(String(t.fetch.mock.calls.find(([, options]) => options?.method === 'POST')?.[1]?.body))).toEqual({ option_id: 'allow' })
  await screen.findByText('Sent', { exact: true })
  const count = t.calls.length
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(t.calls.length).toBe(count + 2))
})
it('opens a question without any inline choices, Other field or decline control', async () => {
  const elicitation: Item = { id: 'question:q', kind: 'question', version: 1, ts: '', pending_id: 'q', question_kind: 'elicitation', request: { type: 'elicitation', message: 'Which parser should handle this input?', form_supported: true, fields: [{ key: 'parser', label: 'Parser', field_kind: 'single', options: [{ value: 'strict', label: 'Strict' }] }] }, state: 'open', answered: false, answerable: true }
  const t = routed(call => call.path.includes('/questions/') ? json(elicitation) : json({ pending: [{ pending_id: 'q', state: 'open', answered: false }] }))
  render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
  expect((await screen.findByText('Which parser should handle this input?')).closest('p')).toHaveClass('preview-elicitation')
  expect(screen.queryByRole('radio')).toBeNull()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Open s' })).toHaveAttribute('href', '/sessions/s?pending=q')
  expect(t.calls.every(call => call.method === 'GET')).toBe(true)
})
it('keeps the canonical session link when previews fail and aborts reads on unmount', async () => {
  let signal: AbortSignal | null | undefined
  const t = routed(() => json({ code: 'unavailable', message: 'Preview failed' }, 503))
  t.fetch.mockImplementationOnce(async (_input, options) => { signal = options?.signal; return json({ code: 'unavailable', message: 'Preview failed' }, 503) })
  const { unmount } = render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
  await screen.findByText(/Preview unavailable:/, { exact: true })
  expect(screen.getByRole('link', { name: 'Open s' })).toHaveAttribute('href', '/sessions/s')
  unmount(); expect(signal?.aborted).toBe(true)
})
it('does not replace a cached typed question with an older item version', async () => {
  let version = 7
  const t = routed(call => call.path.includes('/questions/') ? json({ ...question('p'), version }) : json({ pending: [{ pending_id: 'p', state: 'open', answered: false }] }))
  const reader = new PreviewReader(t.client)
  expect((await reader.read(session('s'))).question?.version).toBe(7)
  version = 3
  expect((await reader.read(session('s'))).question?.version).toBe(7)
  reader.stop()
})

it.each([question('wrong-pending'), { id: 'message', version: 1, ts: '', kind: 'message', text: 'Unrelated content' }])('refuses a mismatched typed question while retaining the session link', async item => {
  const t = routed(call => call.path.includes('/questions/') ? json(item) : json({ pending: [{ pending_id: 'expected', state: 'open', answered: false }] }))
  render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
  await screen.findByText('Question preview unavailable.', { exact: true })
  expect(screen.getByRole('link', { name: 'Open s' })).toHaveAttribute('href', '/sessions/s')
  expect(screen.queryByText('Unrelated content', { exact: true })).toBeNull()
})
it('does not read previews before visibility or after a card scrolls out', async () => {
  const callbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = []
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof callbacks[number]) { callbacks.push(callback) }
    observe() {}
    disconnect() {}
  })
  const t = routed(call => call.path.includes('/questions/') ? json(question('p')) : json({ pending: [{ pending_id: 'p', state: 'open', answered: false }] }))
  const view = render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
  try {
    await act(async () => {})
    expect(t.calls).toHaveLength(0)
    act(() => callbacks[0]([{ isIntersecting: true }]))
    await screen.findByText('Typed read-only request', { exact: true })
    expect(t.calls).toHaveLength(2)
    act(() => callbacks[0]([{ isIntersecting: false }]))
    view.rerender(<AttentionPreviews><AttentionPreview session={{ ...session('s'), operator_attention: 2 }} /></AttentionPreviews>)
    await act(async () => {})
    expect(t.calls).toHaveLength(2)
  } finally { view.unmount(); vi.unstubAllGlobals() }
})
it('qualifies an incomplete real attention page without scanning more records', async () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ id: String(i), child_id: 'another', hat_id: 'hat', pending_id: null, reason: 'child_failed' }))
  const t = routed(call => call.path.startsWith('/api/delegation/attention') ? json(rows) : json({ pending: [] }))
  const reader = new PreviewReader(t.client)
  expect(await reader.read(session('s'))).toEqual({ attention: undefined, partial: true })
  expect(t.calls.filter(call => call.path.startsWith('/api/delegation/attention'))).toHaveLength(1)
  reader.stop()
})
it('refreshes a real status-only reason when an immutable attention summary changes', async () => {
  let reason = 'child_failed'
  const t = routed(call => call.path.startsWith('/api/delegation/attention') ? json([{ id: 'a', child_id: 's', hat_id: 'hat', pending_id: null, reason }]) : json({ pending: [] }))
  const reader = new PreviewReader(t.client)
  expect((await reader.read(session('s'))).attention?.reason).toBe('child_failed')
  reason = 'operator_takeover'
  expect((await reader.read({ ...session('s'), operator_attention: 2 })).attention?.reason).toBe('operator_takeover')
  expect(t.calls.filter(call => call.path.startsWith('/api/delegation/attention'))).toHaveLength(2)
  reader.stop()
})

it.each([
  ['child_failed', 'Child session failed'],
  ['operator_takeover', 'You took over this session'],
  ['parent_unavailable', 'Parent session is unavailable'],
  ['parent_deleted', 'Parent session was deleted'],
  ['unsupported_delivery', 'Parent cannot receive this update'],
  ['handling_deadline', 'Parent did not respond in time'],
  ['operator_required', 'Your response is needed'],
  ['queue_full', 'Parent has too many updates waiting'],
  ['wake_budget', 'Parent could not be resumed again'],
  ['not_delivered', 'Update could not reach the parent'],
  ['config_unverified', 'Parent configuration needs review'],
  ['grant_changed', 'Delegation settings changed'],
  ['endpoint_unavailable', "Couldn't deliver this child's report to its parent"],
  ['family_detached', 'This child is no longer driven by its parent'],
  ['reassigned', 'This child moved to another hat'],
  ['answer_cancelled', "The parent's answer could not be delivered"],
  ['incident_resolved', 'The child incident has been resolved'],
  ['session_unavailable', 'The child session is unavailable'],
  ['question_unavailable', 'The child question is unavailable'],
  ['question_resolved', 'The child question has been resolved'],
  ['future_private_reason', 'Session needs your attention'],
])('shows an operator label for attention reason %s', async (reason, label) => {
  const t = routed(call => call.path.startsWith('/api/delegation/attention') ? json([{ id: 'attention', child_id: 's', hat_id: 'hat', pending_id: null, reason }]) : json({ pending: [] }))
  render(<AttentionPreviews><AttentionPreview session={session('s')} /></AttentionPreviews>, { wrapper: t.wrapper })
  await screen.findByText(label, { exact: true })
  expect(screen.queryByText(reason, { exact: true })).toBeNull()
  expect(screen.getByRole('link', { name: 'Open s' })).toHaveAttribute('href', '/sessions/s')
})
