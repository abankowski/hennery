import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClientContext } from '../app-client'
import { Client } from '../api/client'
import type { QueuedPrompt } from '../generated/protocol'
import PromptQueue from './PromptQueue'

const item: QueuedPrompt = { id: 'q/1', state: 'queued', reason: null, content: [{ type: 'text', text: 'Read the notes' }, { type: 'image', mimeType: 'image/png', sha256: 'a'.repeat(64), size: 12 }] }
function mount(items: QueuedPrompt[], status = 200) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(status === 200 ? [] : { code: 'queue_item_unavailable', message: 'Already delivering' }), { status, headers: { 'Content-Type': 'application/json' } }))
  const changed = vi.fn(async () => {})
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), here: () => ({ pathname: '/sessions/s1', search: '' }), stepUp: async () => {} })
  render(<ClientContext.Provider value={client}><PromptQueue sessionId="s/1" items={items} changed={changed} /></ClientContext.Provider>)
  return { fetch, changed }
}
describe('durable prompt queue', () => {
  it('edits text without replacing image references or the ordinary composer draft', async () => {
    const m = mount([item])
    expect(screen.getByText('1 image', { exact: true })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit queued message 1' }), { target: { value: 'Read the updated notes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
    expect(m.fetch.mock.calls[0]).toEqual(['/api/sessions/s%2F1/queue/q%2F1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ text: 'Read the updated notes' }) })])
  })
  it('removes a queued item and refreshes after the server commits', async () => {
    const m = mount([item])
    fireEvent.click(screen.getByRole('button', { name: 'Remove queued message 1' }))
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
    expect(m.fetch.mock.calls[0]).toEqual(['/api/sessions/s%2F1/queue/q%2F1', expect.objectContaining({ method: 'DELETE' })])
  })
  it('does not edit or remove a delivering item', () => {
    mount([{ ...item, state: 'delivering' }])
    expect(screen.getByText('Delivering…', { exact: true })).toBeVisible()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('retains failed text with a reason and offers copy and dismissal', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const m = mount([{ ...item, state: 'failed', reason: 'The session was closed.' }])
    expect(screen.getByText('Read the notes', { exact: true })).toBeVisible()
    expect(screen.getByText('The session was closed.', { exact: true })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await screen.findByRole('button', { name: 'Copied' })
    expect(writeText).toHaveBeenCalledWith('Read the notes')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss queued message 1' }))
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
  })
  it('refreshes after another window or the worker wins an edit', async () => {
    const m = mount([item], 409)
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
    expect(screen.getByRole('alert')).toHaveTextContent('Already delivering')
  })
})
