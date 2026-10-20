import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { routed, json } from '../test-stream'
import { parent } from '../test-family'
import SessionMenu from './SessionMenu'

it('warns about retained family copies before deleting, with authorized encoded related links', async () => {
  const family = { ...parent.family!, children: [{ session_id: 'child/1', title: '<b>Worker</b>', agent: 'codex' }] }
  const s = routed(() => json({}))
  render(<SessionMenu id="parent" family={family} lifecycle="parked" canPark={false} onDeleted={vi.fn()} />, { wrapper: s.wrapper })
  fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete session' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete this session?' })
  expect(within(dialog).getByText('Copies already delivered to related sessions remain in their transcripts. Those sessions are kept.', { exact: true })).toBeInTheDocument()
  expect(within(dialog).getByRole('link', { name: '<b>Worker</b>' })).toHaveAttribute('href', '/sessions/child%2F1')
  expect(dialog.querySelector('b')).toBeNull()
  expect(s.calls).toEqual([expect.objectContaining({ method: 'GET', path: '/api/sessions/parent/idle-hold' })])
})
