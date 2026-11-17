import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClientContext } from '../app-client'
import { Client } from '../api/client'
import type { QueuedPrompt } from '../generated/protocol'
import PromptQueue from './PromptQueue'

const item: QueuedPrompt = { id: 'q/1', state: 'queued', reason: null, content: [{ type: 'text', text: 'Read the notes' }, { type: 'image', mimeType: 'image/png', sha256: 'a'.repeat(64), size: 12 }] }
function mount(items: QueuedPrompt[], status = 200, canSteer = false) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(status === 200 ? [] : { code: 'queue_item_unavailable', message: 'Already delivering' }), { status, headers: { 'Content-Type': 'application/json' } }))
  const changed = vi.fn(async () => {})
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), here: () => ({ pathname: '/sessions/s1', search: '' }), stepUp: async () => {} })
  const view = (next: QueuedPrompt[]) => <ClientContext.Provider value={client}><PromptQueue sessionId="s/1" items={next} changed={changed} canSteer={canSteer} /></ClientContext.Provider>
  const rendered = render(view(items))
  return { fetch, changed, rerender: (next: QueuedPrompt[]) => rendered.rerender(view(next)) }
}
describe('durable prompt queue', () => {
  it.each(['metaKey', 'ctrlKey'])('saves the edited queue item once with %s+Enter', async modifier => {
    const m = mount([item])
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    const editor = screen.getByRole('textbox', { name: 'Edit queued message 1' })
    fireEvent.change(editor, { target: { value: 'Updated queued text' } })
    fireEvent.keyDown(editor, { key: 'Enter', [modifier]: true })
    fireEvent.keyDown(editor, { key: 'Enter', [modifier]: true, repeat: true })
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
    expect(m.fetch).toHaveBeenCalledExactlyOnceWith('/api/sessions/s%2F1/queue/q%2F1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ text: 'Updated queued text' }) }))
    expect(screen.queryByRole('textbox', { name: 'Edit queued message 1' })).toBeNull()
  })
  it.each([{}, { metaKey: true, isComposing: true }, { ctrlKey: true, keyCode: 229 }, { metaKey: true, repeat: true }, { ctrlKey: true, altKey: true }, { metaKey: true, shiftKey: true }])('ignores Enter without a save shortcut: %j', modifiers => {
    const m = mount([item])
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Edit queued message 1' }), { key: 'Enter', ...modifiers })
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it('does not save an interrupted edit with the shortcut', () => {
    const m = mount([item])
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    m.rerender([{ ...item, state: 'delivering' }])
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Edit queued message 1' }), { key: 'Enter', metaKey: true })
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it('does not submit again while the shortcut save is pending', async () => {
    const m = mount([item])
    let resolve!: (response: Response) => void
    m.fetch.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    const editor = screen.getByRole('textbox', { name: 'Edit queued message 1' })
    fireEvent.keyDown(editor, { key: 'Enter', metaKey: true })
    expect(editor).toBeDisabled()
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(m.fetch).toHaveBeenCalledOnce()
    resolve(new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
  })
  it('preserves a refused shortcut edit', async () => {
    const m = mount([item], 409)
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    const editor = screen.getByRole('textbox', { name: 'Edit queued message 1' })
    fireEvent.change(editor, { target: { value: 'Keep this edit' } })
    fireEvent.keyDown(editor, { key: 'Enter', metaKey: true })
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
    expect(editor).toHaveValue('Keep this edit')
    expect(screen.getByRole('alert')).toHaveTextContent('Already delivering')
  })
  it.each([true, false])('preserves an interrupted edit through delivery and disappearance, clipboard available: %s', async clipboardAvailable => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboardAvailable ? { writeText } : undefined })
    const m = mount([item])
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    const draft = 'My unsaved edit '.repeat(40)
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit queued message 1' }), { target: { value: draft } })
    m.rerender([{ ...item, state: 'delivering' }])
    expect(screen.getByRole('textbox', { name: 'Edit queued message 1' })).toHaveValue(draft)
    expect(screen.getByText('Already sending; your edit wasn’t applied.', { exact: true })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
    m.rerender([])
    expect(screen.getByRole('textbox', { name: 'Edit queued message 1' })).toHaveValue(draft)
    fireEvent.click(screen.getByRole('button', { name: 'Copy edit' }))
    if (clipboardAvailable) {
      await screen.findByRole('button', { name: 'Copied' })
      expect(writeText).toHaveBeenCalledWith(draft)
    } else {
      expect(await screen.findByRole('alert')).toHaveTextContent('Select the full edit text to copy it.')
      const editor = screen.getByRole('textbox', { name: 'Edit queued message 1' }) as HTMLTextAreaElement
      expect(editor).toHaveValue(draft)
      expect(editor).toHaveFocus()
      expect([editor.selectionStart, editor.selectionEnd]).toEqual([0, draft.length])
    }
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss edit' }))
    expect(screen.queryByRole('region', { name: 'Queued messages' })).toBeNull()
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it('offers the complete failed message for manual copy when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined})
    const text='Unsent message '.repeat(40)
    mount([{...item,state:'failed',reason:'Deleted',content:[{type:'text',text}]}])
    fireEvent.click(screen.getByRole('button',{name:'Copy'}))
    expect(await screen.findByRole('textbox',{name:'Full text of queued message 1'})).toHaveValue(text)
  })
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


describe('queued prompt steering', () => {
  it('sends the selected stored message by encoded id and refreshes', async () => {
    const m = mount([item, { ...item, id: 'q/2' }], 200, true)
    fireEvent.click(screen.getByRole('button', { name: 'Send queued message 2 as steering' }))
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
    expect(m.fetch).toHaveBeenCalledExactlyOnceWith('/api/sessions/s%2F1/queue/q%2F2/steer', expect.objectContaining({ method: 'POST' }))
    expect(screen.getAllByText('Read the notes')).toHaveLength(2)
  })
  it('hides steering when the session cannot accept it', () => {
    mount([item])
    expect(screen.queryByRole('button', { name: /as steering/ })).toBeNull()
  })
  it('offers steering only for queued messages', () => {
    mount([{ ...item, state: 'delivering' }, { ...item, id: 'failed', state: 'failed', reason: 'Delivery unknown' }], 200, true)
    expect(screen.queryByRole('button', { name: /as steering/ })).toBeNull()
  })
  it('does not steer a message with an unsaved edit', () => {
    const m = mount([item], 200, true)
    fireEvent.click(screen.getByRole('button', { name: 'Edit queued message 1' }))
    expect(screen.queryByRole('button', { name: /as steering/ })).toBeNull()
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it('prevents repeated steering and other mutations until refresh completes', async () => {
    const m = mount([item], 200, true)
    let resolve!: (response: Response) => void
    m.fetch.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done }))
    const button = screen.getByRole('button', { name: 'Send queued message 1 as steering' })
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove queued message 1' })).toBeDisabled()
    fireEvent.click(button)
    expect(m.fetch).toHaveBeenCalledOnce()
    resolve(new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    await waitFor(() => expect(button).toBeEnabled())
    expect(m.changed).toHaveBeenCalledOnce()
  })
  it('retains the message and refreshes after a refused steer', async () => {
    const m = mount([item], 409, true)
    fireEvent.click(screen.getByRole('button', { name: 'Send queued message 1 as steering' }))
    await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
    expect(screen.getByRole('alert')).toHaveTextContent('Already delivering')
    expect(screen.getByText('Read the notes')).toBeVisible()
  })
})

it('preserves an uncertain delivery for copy and dismissal without resending', async () => {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  const m = mount([{ ...item, state: 'uncertain', reason: 'Check the transcript before sending again.' }], 200, true)
  expect(screen.getByText('Delivery uncertain')).toBeVisible()
  expect(screen.queryByRole('button', { name: /as steering|Edit queued/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
  await screen.findByRole('button', { name: 'Copied' })
  expect(writeText).toHaveBeenCalledWith('Read the notes')
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss queued message 1' }))
  await waitFor(() => expect(m.changed).toHaveBeenCalledOnce())
  expect(m.fetch).toHaveBeenCalledExactlyOnceWith('/api/sessions/s%2F1/queue/q%2F1', expect.objectContaining({ method: 'DELETE' }))
})

it.each([
  ['uncertain', false], ['uncertain', true], ['failed', false], ['failed', true],
] as const)('offers %s image recovery and only copies available text: mixed=%s', (state, mixed) => {
  const reason = state === 'failed' ? 'The adapter rejected this input.' : 'Check the transcript.'
  mount([{ ...item, state, reason, content: mixed ? item.content : item.content.filter(block => block.type === 'image') }], 200, true)
  expect(screen.getByText(reason)).toBeVisible()
  const image = screen.getByRole('link', { name: 'Open image 1 from queued message 1' })
  expect(image).toHaveAttribute('href', `/api/attachments/${'a'.repeat(64)}`)
  expect(screen.queryByRole('button', { name: 'Copy' }) !== null).toBe(mixed)
  expect(screen.queryByRole('button', { name: /as steering/ })).toBeNull()
})
