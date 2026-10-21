import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Item } from '../generated/view'
import { json } from '../test-stream'
import SessionView from './Session'
import { FAST, message, sessionServer } from './test-session'

const liveQuestion: Extract<Item, { kind: 'question' }> = {
  id: 'question:live', kind: 'question', version: 1, ts: '2026-10-20T10:00:00Z',
  pending_id: 'live', question_kind: 'permission',
  request: { type: 'permission', title: 'Run checks?', options: [{ option_id: 'once', name: 'Allow once', option_kind: 'allow_once' }] },
  state: 'open', answered: false, answerable: true,
}
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })
function phone() {
  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({ matches: q === '(max-width: 767px)', addEventListener() {}, removeEventListener() {} })))
}

it('keeps a selected earlier pinned question through updates, then reveals the composer when it is removed', async () => {
  phone()
  const server = sessionServer({ page: () => json({ items: [{ ...message('new', 'new-turn'), ts: '2026-10-20T11:00:00Z' }], older: true, epoch: 'e1', revision: 1 }) })
  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
  await waitFor(() => expect(server.streams).toHaveLength(1))
  act(() => server.streams[0].event('item', { ...liveQuestion, turn_id: 'old-turn' }))
  const card = await screen.findByRole('region', { name: 'Question from Claude' })
  expect(card.closest('.pinned-questions')).not.toBeNull()
  act(() => card.focus())
  act(() => server.streams[0].event('item', message('newer', 'new-turn')))
  await screen.findByText('newer', { exact: true })
  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
  act(() => server.streams[0].event('item_removed', { id: liveQuestion.id }))
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Question from Claude' })).not.toBeInTheDocument())
  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
})

it.each(['resync', 'removal'])('returns to the composer when a selected question leaves through %s without losing drafts or moving focus', async mode => {
  phone()
  let rows: Item[] = [liveQuestion]
  const server = sessionServer({ items: () => rows })
  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
  const card = await screen.findByRole('region', { name: 'Question from Claude' })
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'Keep my draft' } })
  act(() => card.focus())
  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
  await waitFor(() => expect(server.streams).toHaveLength(1))
  rows = [message('new', 'new-turn', 'New tail after reconnect')]
  const details = screen.getByRole('button', { name: 'Session details' })
  act(() => details.focus())
  act(() => server.streams[0].event(mode === 'resync' ? 'resync_required' : 'item_removed', mode === 'resync' ? {} : { id: liveQuestion.id }))
  if (mode === 'resync') await screen.findByText('New tail after reconnect', { exact: true })
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Question from Claude' })).not.toBeInTheDocument())
  expect(document.querySelector('.question-actions-selected')).toBeNull()
  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Keep my draft')
  expect(details).toHaveFocus()
})

it('reveals the composer when answering an older cancelled question as a message', async () => {
  phone()
  const old: Item = { ...liveQuestion, id: 'question:old', pending_id: 'old', state: 'cancelled', reason: 'agent_withdrew', answerable: false }
  const server = sessionServer({ items: () => [old, liveQuestion] })
  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
  const cards = await screen.findAllByRole('region', { name: 'Question from Claude' })
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'Existing draft' } })
  act(() => cards[1].focus())
  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
  fireEvent.click(within(cards[0]).getByRole('button', { name: 'Answer as a new message' }))
  const prompt = screen.getByRole('textbox', { name: 'Prompt' })
  await waitFor(() => expect((prompt as HTMLTextAreaElement).value).toContain('Run checks?'))
  expect(server.changes()).toHaveLength(0)
  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
  expect((prompt as HTMLTextAreaElement).value).toContain('Existing draft')
  await waitFor(() => expect(prompt).toHaveFocus())
})

it('reveals the composer when restoring an undelivered turn beside a selected question', async () => {
  phone()
  const marker: Item = { id: 'marker', kind: 'marker', version: 1, ts: '2026-10-20T09:00:00Z', marker: 'turn_not_delivered', about_turn: 'old-turn' }
  const server = sessionServer({ items: () => [marker, liveQuestion], turn: () => json({ turn_id: 'old-turn', content: [{ type: 'text', text: 'Restore this prompt' }] }) })
  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
  const card = await screen.findByRole('region', { name: 'Question from Claude' })
  act(() => card.focus())
  fireEvent.click(screen.getByRole('button', { name: 'Send again' }))
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Restore this prompt'))
  expect(server.posted('/prompt')).toHaveLength(0)
  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus())
})
