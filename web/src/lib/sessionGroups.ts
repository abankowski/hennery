import type { SessionSummary } from '../generated/view'
import { BUCKET_ORDER, bucketOf } from './time'
export type SessionGrouping = 'hat' | 'host' | 'project' | 'time'
/** Creation time never advances while tokens/activity stream in. */
function compareStarted(a: SessionSummary, b: SessionSummary) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1
  return a.session_id < b.session_id ? 1 : a.session_id > b.session_id ? -1 : 0
}
export function sessionGroups(rows: readonly SessionSummary[], by: SessionGrouping, now = Date.now()) {
  const unique = new Map(rows.map(row => [row.session_id, row]))
  const ordered = [...unique.values()].sort(compareStarted)
  const children = new Map<string, SessionSummary[]>()
  for (const row of ordered) {
    const parent = row.family?.parent?.session_id
    if (parent && parent !== row.session_id && unique.has(parent)) {
      const siblings = children.get(parent) ?? []; siblings.push(row); children.set(parent, siblings)
    }
  }
  const groups = new Map<string, SessionSummary[]>()
  const visited = new Set<string>()
  function append(row: SessionSummary, group: SessionSummary[]) {
    if (visited.has(row.session_id)) return
    visited.add(row.session_id); group.push(row)
    for (const child of children.get(row.session_id) ?? []) append(child, group)
  }
  function root(row: SessionSummary) {
    if (visited.has(row.session_id)) return
    const key = by === 'hat' ? row.hat_id : by === 'host' ? row.host_id : by === 'project' ? JSON.stringify([row.host_id, row.cwd]) : bucketOf(row.last_event_at, now)
    const group = groups.get(key) ?? []; append(row, group); groups.set(key, group)
  }
  // A family stays together even when a child's host differs. Orphaned
  // children use their own group; malformed cycles remain finite and visible.
  for (const row of ordered) {
    const parent = row.family?.parent?.session_id
    if (!parent || parent === row.session_id || !unique.has(parent)) root(row)
  }
  for (const row of ordered) root(row)
  return by === 'time' ? BUCKET_ORDER.flatMap(key => groups.has(key) ? [[key, groups.get(key)!] as [string, SessionSummary[]]] : []) : [...groups]
}
