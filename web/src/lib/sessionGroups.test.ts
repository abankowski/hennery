import { expect, it } from 'vitest'
import type { SessionSummary } from '../generated/view'
import { sessionGroups } from './sessionGroups'
const row = (id: string, hat: string, host: string, ts: string) => ({ session_id: id, hat_id: hat, host_id: host, last_event_at: ts }) as SessionSummary
it('groups stable newest-first rows by actual hat/host, preserving deterministic id ties', () => {
  const rows = [row('a', 'h1', 'x', '1'), row('b', 'h2', 'x', '2'), row('c', 'h1', 'y', '1')]
  expect(sessionGroups(rows, 'hat').map(([key, group]) => [key, group.map(s => s.session_id)])).toEqual([['h2', ['b']], ['h1', ['c', 'a']]])
  expect(sessionGroups(rows, 'host').map(([key, group]) => [key, group.map(s => s.session_id)])).toEqual([['x', ['b', 'a']], ['y', ['c']]])
})
