import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { json, routed } from '../test-stream'
import ResultReview from './ResultReview'
import ResultReadObserver from './ResultReadObserver'
import type { Item, ReviewResult } from '../generated/view'
import { needsOperator, statusOf } from '../lib/status'

const review: ReviewResult = { event_id: 10, turn_id: 'turn', outcome: 'completed' }
const message: Item = { id: 'result', version: 9, ts: '', turn_id: 'turn', kind: 'message', text: 'Continue?' }
const rect = (top: number, bottom: number) => ({ x: 0, y: top, top, bottom, left: 0, right: 300, width: 300, height: bottom - top, toJSON: () => ({}) })

it('marks a captured result read without sending a message and re-arms for a newer result', async () => {
  const server = routed(() => new Response(null, { status: 204 }))
  const view = render(<ResultReview id="s/1" review={review} />, { wrapper: server.wrapper })
  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
  await screen.findByRole('button', { name: 'Read' })
  expect(server.calls.map(call => [call.method, call.path])).toEqual([['POST', '/api/view/sessions/s%2F1/read']])
  expect(JSON.parse(server.fetch.mock.calls[0][1]!.body as string)).toEqual({ event_id: 10 })
  view.rerender(<ResultReview id="s/1" review={{ ...review, event_id: 20 }} />)
  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
  expect(JSON.parse(server.fetch.mock.calls[1][1]!.body as string)).toEqual({ event_id: 20 })
})

it('a delayed acknowledgement never marks the newly displayed result read', async () => {
  let release!: (response: Response) => void
  const server = routed(() => new Promise<Response>(resolve => { release = resolve }))
  const view = render(<ResultReview id="s" review={review} />, { wrapper: server.wrapper })
  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
  view.rerender(<ResultReview id="s" review={{ ...review, event_id: 20 }} />)
  await act(async () => { release(new Response(null, { status: 204 })) })
  expect(screen.getByRole('button', { name: 'Mark as read' })).toBeEnabled()
  expect(server.calls).toHaveLength(1)
})

it('keeps an unsuccessful acknowledgement available to retry', async () => {
  const server = routed(() => json({ error: { code: 'internal', message: 'Could not save read state' } }, 500))
  render(<ResultReview id="s" review={review} />, { wrapper: server.wrapper })
  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('button', { name: 'Mark as read' })).toBeEnabled()
})

it('waits for the final content, visible result end and focused tab before automatic reading', async () => {
  let focused = false, visible = 'hidden', bottom = 400
  let finishSnapshot!: (response: Response) => void
  const snapshot = new Promise<Response>(resolve => { finishSnapshot = resolve })
  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible as DocumentVisibilityState)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('transcript') ? rect(0, 300) : rect(bottom - 1, bottom)
  })
  const server = routed(call => call.method === 'POST' ? new Response(null, { status: 204 }) : snapshot)
  const view = render(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={{ ...message, version: 8 }} /></div>, { wrapper: server.wrapper })
  await waitFor(() => expect(server.calls).toHaveLength(1))
  focused = true; visible = 'visible'; bottom = 200
  fireEvent.focus(window)
  await act(async () => { finishSnapshot(json({ items: [message], revision: 10, epoch: 'e', older: false })) })
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)) })
  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
  view.rerender(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={message} /></div>)
  await waitFor(() => expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1))
  fireEvent.focus(window)
  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1)
})

it('a hidden or scrolled-away result stays unread even after its content loads', async () => {
  let focused = false, bottom = 400
  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('transcript') ? rect(0, 300) : rect(bottom - 1, bottom)
  })
  const server = routed(call => call.method === 'POST' ? new Response(null, { status: 204 }) : json({ items: [message], revision: 10, epoch: 'e', older: false }))
  const view = render(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={message} /></div>, { wrapper: server.wrapper })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)) })
  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
  focused = true; fireEvent.focus(window)
  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
  bottom = 200; fireEvent.scroll(view.container.querySelector('.transcript')!)
  await waitFor(() => expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1))
})

it('review membership and labels preserve formal question precedence', () => {
  const row = { lifecycle: 'closed', presumed_parked: false, question_waits: false, operator_attention: 0, review }
  expect(needsOperator(row)).toBe(true)
  expect(statusOf(row).label).toBe('To review')
  expect(statusOf({ ...row, operator_attention: 1 }).label).toBe('Waiting on you')
  expect(needsOperator({ ...row, review: undefined })).toBe(false)
})

it.each(['focus', 'visibility', 'viewport'])('automatic reading requires %s independently', async gate => {
  let ready = false
  vi.spyOn(document, 'hasFocus').mockImplementation(() => ready || gate !== 'focus')
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => ready || gate !== 'visibility' ? 'visible' : 'hidden')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('transcript') ? rect(0, 300) : !ready && gate === 'viewport' ? rect(399, 400) : rect(199, 200)
  })
  const server = routed(call => call.method === 'POST' ? new Response(null, { status: 204 }) : json({ items: [message], revision: 10, epoch: 'e', older: false }))
  const view = render(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={message} /></div>, { wrapper: server.wrapper })
  await waitFor(() => expect(view.container.querySelector('[data-review-ready="true"]')).not.toBeNull())
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)) })
  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
  ready = true; fireEvent.focus(window)
  await waitFor(() => expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1))
})
