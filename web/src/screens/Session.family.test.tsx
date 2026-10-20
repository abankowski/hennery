import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { json, liveStream, routed } from '../test-stream'
import { familyPage } from '../test-family'
import SessionView from './Session'

it('loads family state for a notification deep link with no list summary, and invalidates it on resync', async () => {
  const streams: ReturnType<typeof liveStream>[] = []
  const page = familyPage(); page.questions = []
  const s = routed(call => {
    const path = new URL(call.path, 'http://h').pathname
    if (path === '/api/view/sessions/parent/family') return json(page)
    if (path === '/api/view/sessions/parent') return json({ items: [], older: false, epoch: 'e1', revision: 1 })
    if (path === '/api/sessions/parent') return json({ ...page.summary, pending: [] })
    if (path === '/api/sessions/parent/catalog') return json({ session_id: 'parent', config_options: [], commands: [] })
    if (path === '/api/hosts') return json([])
    if (path === '/api/stream/view/sessions/parent') { const stream = liveStream(); streams.push(stream); return stream.response }
    return json({ code: 'not_found', message: 'no' }, 404)
  })
  render(<SessionView id="parent" timing={{ retryMs: () => 1 }} />, { wrapper: s.wrapper })
  fireEvent.click(screen.getByRole('button', { name: 'Session details' }))
  expect(await screen.findByRole('region', { name: 'Session family' })).toBeInTheDocument()
  expect(document.querySelector('.session-head .badge')).toHaveTextContent('Waiting on children')
  fireEvent.click(screen.getByRole('tab', { name: 'Plan' }))
  fireEvent.click(screen.getByRole('button', { name: 'Family · 2' }))
  expect(screen.getByRole('tab', { name: 'Family' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('region', { name: 'Session family' })).toBeVisible()
  fireEvent.click(screen.getByRole('tab', { name: 'Details' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close session details' }))
  fireEvent.click(screen.getByRole('button', { name: 'Family · 2' }))
  expect(screen.getByRole('tab', { name: 'Family' })).toHaveAttribute('aria-selected', 'true')
  await waitFor(() => expect(streams).toHaveLength(1))
  const reads = () => s.calls.filter(c => c.path.startsWith('/api/view/sessions/parent/family')).length
  const before = reads()
  act(() => { streams[0].event('resync_required', {}) })
  await waitFor(() => expect(reads()).toBeGreaterThan(before))
})
