import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Item } from '../generated/view'
import SessionView from './Session'
import { FAST, sessionServer } from './test-session'

const question = (pending: string): Item => ({ id: `question:${pending}`, kind: 'question', version: 1, ts: '2026-10-20T10:00:00Z', pending_id: pending, question_kind: 'elicitation', request: { type: 'elicitation', message: `Question ${pending}`, fields: [{ key: 'reply', label: `Reply ${pending}`, field_kind: 'text' }], form_supported: true }, state: 'open', answered: false, answerable: true })
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })
it('keeps one phone action set per card, preserves each draft, switches only on explicit focus and acknowledges queued answers honestly', async () => {
  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({ matches: q === '(max-width: 767px)', addEventListener() {}, removeEventListener() {} })))
  const server = sessionServer({ items: () => [question('one'), question('two')] })
  render(<SessionView id="s1" timing={FAST} />, { wrapper: server.wrapper })
  const cards = await screen.findAllByRole('region', { name: 'Question from Claude' })
  act(() => cards[0].focus())
  expect(document.querySelector('.session')).toHaveClass('has-question-actions')
  fireEvent.change(within(cards[0]).getByRole('textbox', { name: 'Reply one' }), { target: { value: 'first draft' } })
  expect(within(cards[0]).getAllByRole('button', { name: 'Send' })).toHaveLength(1)
  fireEvent.click(within(cards[0]).getByRole('button', { name: 'Next question' }))
  expect(cards[1]).toHaveFocus()
  expect(server.changes()).toHaveLength(0)
  fireEvent.change(within(cards[1]).getByRole('textbox', { name: 'Reply two' }), { target: { value: 'second draft' } })
  fireEvent.click(within(cards[1]).getByRole('button', { name: 'Write a prompt' }))
  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus())
  fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), { target: { value: 'operator draft' } })
  act(() => within(cards[0]).getByRole('button', { name: 'Send' }).focus())
  expect(document.querySelector('.session')).not.toHaveClass('has-question-actions')
  act(() => cards[0].focus())
  expect(within(cards[0]).getByRole('textbox', { name: 'Reply one' })).toHaveValue('first draft')
  expect(within(cards[1]).getByRole('textbox', { name: 'Reply two' })).toHaveValue('second draft')
  fireEvent.click(within(cards[0]).getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(document.querySelector('.answer-acknowledgement')).toHaveTextContent('Sent'))
  expect(document.querySelector('.answer-acknowledgement')).not.toHaveTextContent('Allowed')
  expect(server.posted('/answer')).toEqual([{ path: '/api/sessions/s1/pending/one/answer', body: { action: 'accept', content: { reply: 'first draft' } } }])
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('operator draft')
})
