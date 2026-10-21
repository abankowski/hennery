import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Item } from '../generated/view'
import { json, routed } from '../test-stream'
import { useTurnEnds } from './useTurnEnds'

it('uses real completed-turn events and does not refetch for token versions', async () => {
  const server = routed(() => json([{ event_id: 15, session_id: 's', kind: 'turn_ended', ts: '2026-10-21T10:00:00Z', body: { turn_id: 'turn', outcome: 'completed' } }, { event_id: 16, session_id: 's', kind: 'turn_ended', ts: '', body: { turn_id: 'failed', outcome: 'failed' } }]))
  const message: Item = { id: 'message', version: 12, kind: 'message', turn_id: 'turn', ts: '', text: 'Hello' }
  const { result, rerender } = renderHook(({ items, activity }) => useTurnEnds('s', items, activity, 1), { wrapper: server.wrapper, initialProps: { items: [message], activity: 'running' } })
  await waitFor(() => expect(result.current.get('turn')).toBe('2026-10-21T10:00:00Z'))
  expect(result.current.has('failed')).toBe(false)
  expect(server.calls[0].path).toBe('/api/sessions/s/events?after=11&limit=500')
  rerender({ items: [{ ...message, version: 13, text: 'Hello world' }], activity: 'running' })
  await act(async () => {})
  expect(server.calls).toHaveLength(1)
  rerender({ items: [message], activity: 'idle' })
  await waitFor(() => expect(server.calls).toHaveLength(2))
})
