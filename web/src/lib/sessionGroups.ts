import type { SessionSummary } from '../generated/view'
import { needsOperator } from './status'
import { basename } from './time'
export type SessionGrouping = 'hat' | 'host'
export type ProjectGrouping = 'project' | 'none'
export type SessionSort = 'attention' | 'activity' | 'started'
export interface SessionFamily { root: SessionSummary; members: SessionSummary[]; lastActivity: number; waiting: number; running: number }
export interface ProjectGroup { id: string; path: string | null; families: SessionFamily[]; hosts: string[]; waiting: number; running: number; count: number }
export interface OverviewGroup { id: string; projects: ProjectGroup[]; waiting: number; running: number; count: number }
/** Retain held ancestors as context after local status/host filtering.
 * Candidates are the current hat/lifecycle/search/Hide closed baseline. */
export function withFamilyParents(rows: readonly SessionSummary[], baseline: readonly SessionSummary[]): SessionSummary[] {
  const held = new Map(rows.map(row => [row.session_id, row]))
  const known = new Map(baseline.map(row => [row.session_id, row]))
  // Map iteration visits newly inserted ancestors too: a matching grandchild
  // brings back its parent and root. Unique ids make malformed cycles finite.
  for (const row of held.values()) {
    const id = row.family?.parent?.session_id
    const parent = id && !held.has(id) ? known.get(id) : undefined
    if (parent) held.set(parent.session_id, parent)
  }
  return [...held.values()]
}
/** Creation time and id never advance while tokens/activity stream in. */
export function compareStarted(a: SessionSummary, b: SessionSummary) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1
  return a.session_id < b.session_id ? 1 : a.session_id > b.session_id ? -1 : 0
}
export function projectLabel(path: string) {
  const name = basename(path) || path || 'Unknown project'
  return name.endsWith('.git') ? name.slice(0, -4) || name : name
}
function compareFamilies(sort: SessionSort) {
  return (a: SessionFamily, b: SessionFamily) => (sort === 'attention' ? Number(b.waiting > 0) - Number(a.waiting > 0) : 0) || (sort !== 'started' ? b.lastActivity - a.lastActivity : 0) || compareStarted(a.root, b.root)
}
/** The root decides every grouping boundary, including across hosts and worktrees.
 * Input may be a partially paged list: missing parents become visible roots;
 * malformed cycles are finite and deterministic rather than hiding rows. */
export function overviewGroups(rows: readonly SessionSummary[], by: SessionGrouping, sub: ProjectGrouping, sort: SessionSort): OverviewGroup[] {
  const unique = new Map(rows.map(row => [row.session_id, row]))
  const ordered = [...unique.values()].sort(compareStarted)
  const children = new Map<string, SessionSummary[]>()
  for (const row of ordered) {
    const parent = row.family?.parent?.session_id
    if (parent && parent !== row.session_id && unique.has(parent)) {
      const siblings = children.get(parent) ?? []; siblings.push(row); children.set(parent, siblings)
    }
  }
  const visited = new Set<string>(), families: SessionFamily[] = []
  function append(root: SessionSummary) {
    if (visited.has(root.session_id)) return
    const members: SessionSummary[] = [], pending = [root]
    while (pending.length) {
      const row = pending.pop()!
      if (visited.has(row.session_id)) continue
      visited.add(row.session_id); members.push(row)
      pending.push(...[...(children.get(row.session_id) ?? [])].reverse())
    }
    let lastActivity = 0, waiting = 0, running = 0
    for (const row of members) {
      lastActivity = Math.max(lastActivity, Date.parse(row.last_event_at) || 0)
      if (needsOperator(row)) waiting++
      if (row.lifecycle === 'active' && row.activity === 'running') running++
    }
    families.push({ root, members, lastActivity, waiting, running })
  }
  for (const row of ordered) {
    const parent = row.family?.parent?.session_id
    if (!parent || parent === row.session_id || !unique.has(parent)) append(row)
  }
  for (const row of ordered) append(row)
  families.sort(compareFamilies(sort))
  const groups = new Map<string, OverviewGroup>()
  for (const family of families) {
    const root = family.root, id = by === 'hat' ? root.hat_id : root.host_id
    const group = groups.get(id) ?? { id, projects: [], waiting: 0, running: 0, count: 0 }
    const path = sub === 'project' ? root.project_root || root.cwd : null
    const projectId = JSON.stringify([by, id, path])
    let project = group.projects.find(p => p.id === projectId)
    if (!project) { project = { id: projectId, path, families: [], hosts: [], waiting: 0, running: 0, count: 0 }; group.projects.push(project) }
    project.families.push(family); project.waiting += family.waiting; project.running += family.running; project.count += family.members.length
    group.waiting += family.waiting; group.running += family.running; group.count += family.members.length
    for (const member of family.members) if (!project.hosts.includes(member.host_id)) project.hosts.push(member.host_id)
    groups.set(id, group)
  }
  return [...groups.values()]
}
