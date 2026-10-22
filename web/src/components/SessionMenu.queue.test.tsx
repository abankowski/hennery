import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import SessionMenu from './SessionMenu'

describe('deleting queued prompts', () => {
  it.each([1, 2])('explains that %s unsent messages and their images are deleted', async queuedCount => {
    const server = routed(() => json({ pinned: false, held: false }))
    const view = (count: number) => <SessionMenu id="session" lifecycle="active" canPark queuedCount={count} onDeleted={() => {}} />
    const { rerender } = render(view(queuedCount), { wrapper: server.wrapper })
    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this session?' })
    expect(dialog).toHaveTextContent(queuedCount === 1
      ? '1 unsent queued message and its images will also be deleted.'
      : '2 unsent queued messages and their images will also be deleted.')
    rerender(view(0))
    expect(dialog).not.toHaveTextContent('unsent queued')
  })
})
