import type { SessionSummary } from '../generated/view'
import { compareSummaries } from '../store/sessionList'
export function sessionGroups(rows: readonly SessionSummary[], by: 'hat' | 'host') {
  const groups = new Map<string, SessionSummary[]>()
  for (const row of [...rows].sort(compareSummaries)) {
    const key = by === 'hat' ? row.hat_id : row.host_id
    const group = groups.get(key) ?? []; group.push(row); groups.set(key, group)
  }
  return [...groups]
}
