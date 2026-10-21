import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { json, routed } from '../test-stream'
import RenameSession from './RenameSession'

it('sends only the operator title to the encoded session and uses server read-back', async () => {
  const server = routed(() => json({ session_id: 's/1', title: 'Server normalized', title_source: 'operator' })), saved = vi.fn()
  render(<RenameSession id="s/1" title="Provisional title" saved={saved} cancel={vi.fn()} />, { wrapper: server.wrapper })
  const input = screen.getByRole('textbox', { name: 'Session name' })
  expect(input).toHaveFocus()
  expect(screen.queryByRole('button', { name: 'Reset to agent title' })).toBeNull()
  await userEvent.clear(input); await userEvent.type(input, '  My session  ')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(saved).toHaveBeenCalledWith({ session_id: 's/1', title: 'Server normalized', title_source: 'operator' }))
  expect(server.calls.map(call => [call.method, call.path])).toEqual([['PATCH', '/api/sessions/s%2F1']])
  expect(JSON.parse(String(server.fetch.mock.calls[0][1]?.body))).toEqual({ title: 'My session' })
})
it.each(['agent', 'prompt'] as const)('resets an operator override using null and displays the server %s title', async source => {
  const result = { session_id: 's', title: 'Restored by server', title_source: source }
  const server = routed(() => json(result)), saved = vi.fn()
  render(<RenameSession id="s" title="Operator title" canReset saved={saved} cancel={vi.fn()} />, { wrapper: server.wrapper })
  await userEvent.clear(screen.getByRole('textbox', { name: 'Session name' }))
  await userEvent.click(screen.getByRole('button', { name: 'Reset to agent title' }))
  await waitFor(() => expect(saved).toHaveBeenCalledWith(result))
  expect(server.calls.map(call => [call.method, call.path])).toEqual([['PATCH', '/api/sessions/s']])
  expect(JSON.parse(String(server.fetch.mock.calls[0][1]?.body))).toEqual({ title: null })
})
it('retains the operator title and reset action when a reset is refused', async () => {
  const server = routed(() => json({ code: 'invalid', message: 'Reset rejected' }, 400)), saved = vi.fn()
  render(<RenameSession id="s" title="Operator title" canReset saved={saved} cancel={vi.fn()} />, { wrapper: server.wrapper })
  await userEvent.click(screen.getByRole('button', { name: 'Reset to agent title' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Reset rejected')
  expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('Operator title')
  expect(screen.getByRole('button', { name: 'Reset to agent title' })).toBeEnabled()
  expect(saved).not.toHaveBeenCalled()
})
it('keeps a refused rename editable and cancels without mutating', async () => {
  const server = routed(() => json({ code: 'invalid', message: 'Name rejected' }, 400)), saved = vi.fn(), cancel = vi.fn()
  render(<RenameSession id="s" title="Existing title" saved={saved} cancel={cancel} />, { wrapper: server.wrapper })
  const input = screen.getByRole('textbox', { name: 'Session name' })
  await userEvent.clear(input)
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  await userEvent.type(input, 'New title'); await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Name rejected')
  expect(input).toHaveValue('New title'); expect(input).toBeEnabled(); expect(saved).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(cancel).toHaveBeenCalledOnce(); expect(server.calls).toHaveLength(1)
})
