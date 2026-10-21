import { expect, it } from 'vitest'
import type { SessionSummary } from '../generated/view'
import { sessionGroups } from './sessionGroups'
const row = (id: string, hat: string, host: string, ts: string): SessionSummary => ({ session_id: id, hat_id: hat, host_id: host, created_at: ts, last_event_at: ts, agent: 'claude', cwd: '/srv/project', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: 0, parent_handled_questions: 0 })
it('groups stable newest-first rows by actual hat/host, preserving deterministic id ties', () => {
  const rows = [row('a', 'h1', 'x', '1'), row('b', 'h2', 'x', '2'), row('c', 'h1', 'y', '1')]
  expect(sessionGroups(rows, 'hat').map(([key, group]) => [key, group.map(s => s.session_id)])).toEqual([['h2', ['b']], ['h1', ['c', 'a']]])
  expect(sessionGroups(rows, 'host').map(([key, group]) => [key, group.map(s => s.session_id)])).toEqual([['x', ['b', 'a']], ['y', ['c']]])
})
it('keeps deduplicated families together across hosts and activity updates', () => {
  const parent = row('parent', 'hat', 'one', '1')
  const child = { ...row('child', 'hat', 'two', '3'), family: { revision: 1, parent: { session_id: 'parent', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 0 } }
  const other = row('other', 'hat', 'one', '2')
  const ids = (rows: SessionSummary[]) => sessionGroups(rows, 'host').map(([key, group]) => [key, group.map(s => s.session_id)])
  expect(ids([child, parent, child, other])).toEqual([['one', ['other', 'parent', 'child']]])
  expect(ids([child, { ...parent, last_event_at: '9', activity: 'running' }, other])).toEqual(ids([parent, child, other]))
})
it('groups project paths separately by host, with the parent deciding the child project', () => {
  const a = { ...row('a', 'h1', 'one', '2'), cwd: '/srv/app' }
  const b = { ...row('b', 'h2', 'two', '1'), cwd: '/srv/app' }
  const child = { ...row('c', 'h1', 'two', '3'), cwd: '/different', family: { revision: 1, parent: { session_id: 'a', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 0 } }
  expect(sessionGroups([a, b, child], 'project').map(([key, group]) => [JSON.parse(key), group.map(s => s.session_id)])).toEqual([[['one', '/srv/app'], ['a', 'c']], [['two', '/srv/app'], ['b']]])
})
it('uses local day boundaries and fixed time bucket order, keeping a child in its parent bucket', () => {
  const now = new Date(2026, 9, 21, 0, 30).getTime()
  const times = [new Date(2026, 9, 21, 0, 1), new Date(2026, 9, 20, 23, 59), new Date(2026, 9, 15), new Date(2026, 8, 22), new Date(2026, 8, 21)]
  const rows = times.map((at, i) => row(String(i), 'hat', 'host', at.toISOString()))
  const child = { ...row('child', 'hat', 'host', times[0].toISOString()), family: { revision: 1, parent: { session_id: '4', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 0 } }
  expect(sessionGroups([...rows, child], 'time', now).map(([key, group]) => [key, group.map(s => s.session_id)])).toEqual([['today', ['0']], ['yesterday', ['1']], ['week', ['2']], ['month', ['3']], ['earlier', ['4', 'child']]])
})
