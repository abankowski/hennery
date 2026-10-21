import { expect, it, vi } from 'vitest'
import type { SessionSummary } from '../generated/view'
import { overviewGroups, withFamilyParents } from './sessionGroups'
const row = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, hat_id: 'hat', host_id: 'one', created_at: '2026-10-01T10:00:00Z', last_event_at: '2026-10-01T10:00:00Z', agent: 'claude', cwd: '/srv/project', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: 0, parent_handled_questions: 0, ...patch })
const child = (id: string, parent: string, patch: Partial<SessionSummary> = {}): SessionSummary => row(id, { family: { revision: 1, parent: { session_id: parent, agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 0 }, ...patch })
const ids = (rows: SessionSummary[], sort: 'attention' | 'activity' | 'started' = 'started') => overviewGroups(rows, 'hat', 'none', sort).flatMap(group => group.projects.flatMap(project => project.families.map(family => family.root.session_id)))
it('sorts newest starts first with deterministic id ties, unaffected by input or token order', () => {
  const a = row('a'), b = row('b'), newer = row('new', { created_at: '2026-10-02T00:00:00Z' })
  expect(ids([a, newer, b])).toEqual(['new', 'b', 'a'])
  expect(ids([{ ...a, last_event_at: '2029-01-01T00:00:00Z', activity: 'running', operator_attention: 5 }, b, newer])).toEqual(['new', 'b', 'a'])
})
it('sorts whole families by operator attention then latest activity, and activity independently', () => {
  const parent = row('parent', { created_at: '2026-10-02T10:00:00Z' }), worker = child('worker', 'parent', { operator_attention: 1, last_event_at: '2026-10-03T00:00:00Z' })
  const recent = row('recent', { last_event_at: '2026-10-04T00:00:00Z' }), old = row('old', { last_event_at: 'invalid' })
  expect(ids([recent, old, worker, parent], 'attention')).toEqual(['parent', 'recent', 'old'])
  expect(ids([recent, old, worker, parent], 'activity')).toEqual(['recent', 'parent', 'old'])
  expect(ids([{ ...recent, operator_attention: 0, question_waits: true, parent_handled_questions: 1 }, worker, parent], 'attention')).toEqual(['parent', 'recent'])
  expect(ids([{ ...recent, operator_attention: 1 }, worker, { ...parent, operator_attention: 3 }], 'attention')).toEqual(['recent', 'parent'])
})
it('uses repository roots across subdirectories/worktrees/hosts, and cwd for older summaries', () => {
  const repo = (id: string, cwd: string, host_id = 'one') => Object.assign(row(id, { cwd, host_id }), { project_root: '/srv/repo' })
  const groups = overviewGroups([repo('a', '/srv/repo/src'), repo('b', '/scratch/tree', 'two'), row('legacy')], 'hat', 'project', 'started')
  expect(groups).toHaveLength(1)
  expect(groups[0].projects.map(project => [project.path, project.families.map(family => family.root.session_id), project.hosts])).toEqual([['/srv/project', ['legacy'], ['one']], ['/srv/repo', ['b', 'a'], ['two', 'one']]])
  expect(overviewGroups([repo('a', '/srv/repo/src'), repo('b', '/scratch/tree', 'two')], 'host', 'project', 'started').map(group => group.id)).toEqual(['two', 'one'])
  expect(overviewGroups([row('a', { hat_id: 'hat-a' }), row('b', { hat_id: 'hat-b' })], 'hat', 'project', 'started').map(group => [group.id, group.count])).toEqual([['hat-b', 1], ['hat-a', 1]])
})
it('keeps deduplicated multilevel families inside the root hat/host/project, counts waiting sessions', () => {
  const parent = row('parent'), worker = child('worker', 'parent', { cwd: '/other', host_id: 'two', hat_id: 'other', operator_attention: 4 }), nested = child('nested', 'worker', { cwd: '/third', operator_attention: 1 })
  const groups = overviewGroups([worker, nested, parent, worker], 'host', 'project', 'started')
  expect(groups).toHaveLength(1)
  expect(groups[0].id).toBe('one')
  const project = groups[0].projects[0]
  expect(project.path).toBe('/srv/project')
  expect(project.families[0].members.map(s => s.session_id)).toEqual(['parent', 'worker', 'nested'])
  expect(project.waiting).toBe(2)
  expect(project.hosts).toEqual(['one', 'two'])
})
it('keeps orphan and cyclic families finite, complete and deterministic', () => {
  const rows = [child('a', 'b'), child('b', 'a'), child('orphan', 'missing')]
  const flattened = (input: SessionSummary[]) => overviewGroups(input, 'hat', 'project', 'started').flatMap(g => g.projects.flatMap(p => p.families.flatMap(f => f.members.map(s => s.session_id))))
  expect(flattened(rows)).toEqual(['orphan', 'b', 'a'])
  expect(flattened([...rows].reverse())).toEqual(flattened(rows))
})
it('leaves paths separate and omits project headers for Nothing, without merging same basenames', () => {
  const rows = [row('a', { cwd: '/one/app' }), row('b', { cwd: '/two/app' })]
  expect(overviewGroups(rows, 'hat', 'project', 'started')[0].projects.map(p => p.path)).toEqual(['/two/app', '/one/app'])
  expect(overviewGroups(rows, 'hat', 'none', 'started')[0].projects).toMatchObject([{ path: null, families: [{ root: { session_id: 'b' } }, { root: { session_id: 'a' } }] }])
  const sameId = [row('same', { hat_id: 'one', host_id: 'one' })]
  expect(overviewGroups(sameId, 'hat', 'project', 'started')[0].projects[0].id).not.toBe(overviewGroups(sameId, 'host', 'project', 'started')[0].projects[0].id)
})
it('walks three levels of held ancestors even when only the grandchild matches, without siblings or cycles', () => {
  const parent = row('parent'), worker = child('worker', 'parent'), nested = child('nested', 'worker'), sibling = child('sibling', 'parent')
  expect(withFamilyParents([nested], [parent, worker, nested, sibling]).map(s => s.session_id)).toEqual(['nested', 'worker', 'parent'])
  expect(withFamilyParents([child('a', 'b')], [child('a', 'b'), child('b', 'a')]).map(s => s.session_id)).toEqual(['a', 'b'])
})
it('computes family activity once per member and aggregates waiting and running counts', () => {
  const rows = Array.from({ length: 12 }, (_, n) => row(String(n), { last_event_at: `2026-10-01T10:${String(n).padStart(2, '0')}:00Z`, activity: n < 3 ? 'running' : 'idle', operator_attention: n === 4 ? 1 : 0 }))
  const dates = vi.spyOn(Date, 'parse')
  try {
    const [group] = overviewGroups(rows, 'hat', 'project', 'activity')
    expect(dates).toHaveBeenCalledTimes(rows.length)
    expect(group).toMatchObject({ waiting: 1, running: 3, count: 12 })
    expect(group.projects[0]).toMatchObject({ waiting: 1, running: 3, count: 12 })
  } finally { dates.mockRestore() }
})
