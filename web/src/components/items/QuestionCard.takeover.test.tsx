import { useEffect } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Item } from '../../generated/view'
import { useSessionItems } from '../../store/useSessionItems'
import { useAnswering, type AnswerBook } from '../../store/useAnswer'
import { deferred } from '../../test-locks'
import { json, liveStream, routed } from '../../test-stream'
import { ItemView } from '../Transcript'

type Question = Extract<Item, { kind: 'question' }>
const ID = 'child/1'
const PAGE = '/api/view/sessions/child%2F1'
const STREAM = '/api/stream/view/sessions/child%2F1'
const ANSWER = '/api/sessions/child%2F1/pending/p%2F1/answer'
const CARD = '/api/view/sessions/child%2F1/questions/p%2F1'
function question(version: number, answered = false): Question {
  return { id: 'question:p/1', pending_id: 'p/1', kind: 'question', version,
    ts: '2026-10-02T10:00:00Z', turn_id: 't1', question_kind: 'elicitation',
    request: { type: 'elicitation', message: 'Continue?', fields: [], form_supported: true },
    state: 'open', answered, answerable: !answered }
}
function setup(initial = question(1), post: () => Response | Promise<Response> = () => json({ pending_id: 'p/1', request_id: 'r1' }, 202), pinned = false) {
  const streams = [liveStream(), liveStream()]
  let book!: AnswerBook
  let cardReads = 0
  const t = routed(call => {
    if (call.path === PAGE) return json({ items: pinned ? [{ id: 'tail', kind: 'message', version: 1, ts: '2026-10-03T10:00:00Z', turn_id: 't2', text: 'Newer turn' }] : [initial], older: pinned, epoch: 'e1', revision: initial.version })
    if (call.path === STREAM) return streams.shift()!.response
    if (call.path.endsWith('/catalog')) return json({ session_id: ID, config_options: [], commands: [] })
    if (call.path === ANSWER && call.method === 'POST') return post()
    if (call.path === CARD) return pinned && ++cardReads === 1 ? json(initial) : json({ code: 'unavailable', message: 'Offline' }, 503)
    throw new Error(`Unexpected ${call.method} ${call.path}`)
  })
  // Both initial and resumed reads run through the real SSE parser/store.
  const live = streams[0]
  const resumed = streams[1]
  function View() {
    const s = useSessionItems(ID, { retryMs: () => 1 })
    book = useAnswering(ID, undefined, s.items, s.loading, s.loads, true, s.mergeQuestion, s.pinned)
    useEffect(() => { if (pinned && !s.loading) void s.loadQuestion('p/1') }, [s.loading, s.loadQuestion])
    const items = [...s.pinned, ...s.items]
    return <><output aria-label="Question version">{items.find(item => item.kind === 'question')?.version}</output>{items.map(item => <ItemView key={item.id} item={item} env={{ sessionId: ID, agent: 'Codex', answers: book }} />)}</>
  }
  render(<View />, { wrapper: t.wrapper })
  return { ...t, live, resumed, book: () => book, posts: () => t.calls.filter(c => c.method === 'POST') }
}

describe('a question reopened by takeover on the item stream', () => {
  it.each(['live', 'resumed'] as const)('replaces a parent-queued Sent card through the %s stream with enabled answer controls', async mode => {
    const t = setup(question(4, true))
    await screen.findByText('Sent', { exact: true })
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
    await waitFor(() => expect(t.calls.filter(c => c.path === STREAM)).toHaveLength(1))
    if (mode === 'resumed') {
      act(() => t.live.end())
      await waitFor(() => expect(t.calls.filter(c => c.path === STREAM)).toHaveLength(2))
      expect(t.calls.filter(c => c.path === STREAM)[1].headers['Last-Event-ID']).toBe('e1:4')
    }
    act(() => t[mode === 'live' ? 'live' : 'resumed'].event('item', question(5), 'e1:5'))
    expect(await screen.findByRole('button', { name: 'Decline' })).toBeEnabled()
    expect(screen.queryByText('Sent', { exact: true })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    await screen.findByText('Sent', { exact: true })
    expect(t.posts()).toHaveLength(1)
    expect(t.calls.filter(c => c.path === PAGE)).toHaveLength(1)
  })

  it.each([false, true])('retires a local Sent outcome only when the store admits a newer reopened version (pinned=%s)', async pinned => {
    const t = setup(question(1), undefined, pinned)
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    await screen.findByText('Sent', { exact: true })
    act(() => t.live.event('item', question(1), 'e1:2'))
    await act(async () => {})
    expect(t.book().localOf('question:p/1')?.phase).toBe('sent')
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
    act(() => t.live.event('item', question(3), 'e1:3'))
    expect(await screen.findByRole('button', { name: 'Decline' })).toBeEnabled()
    expect(t.book().localOf('question:p/1')).toBeUndefined()
  })

  it('allows an explicit answer after a newer question supersedes an uncertain local outcome', async () => {
    let attempt = 0
    const t = setup(question(1), () => ++attempt === 1 ? json({ code: 'unavailable', message: 'Offline' }, 503) : json({ pending_id: 'p/1', request_id: 'r2' }, 202))
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    await screen.findByText('Answer status unknown. Reconnect and refresh the question before retrying.', { exact: true })
    act(() => t.live.event('item', question(3), 'e1:3'))
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    await screen.findByText('Sent', { exact: true })
    expect(t.posts()).toHaveLength(2)
  })

  it.each([202, 503])('does not retain a late HTTP %s outcome over a newer reopened stream item', async status => {
    const response = deferred<Response>()
    const t = setup(question(1), () => response.promise)
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    act(() => t.live.event('item', question(3), 'e1:3'))
    await waitFor(() => expect(screen.getByLabelText('Question version')).toHaveTextContent('3'))
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled()
    expect(screen.getByText('Sending…', { exact: true })).toBeInTheDocument()
    // A second click cannot send while the original mutation is in flight.
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    expect(t.posts()).toHaveLength(1)
    await act(async () => response.resolve(status === 202 ? json({ pending_id: 'p/1', request_id: 'r1' }, 202) : json({ code: 'unavailable', message: 'Offline' }, 503)))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled())
    expect(t.book().localOf('question:p/1')).toBeUndefined()
    expect(screen.queryByText('Sent', { exact: true })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Refresh question' })).toBeNull()
  })
})
