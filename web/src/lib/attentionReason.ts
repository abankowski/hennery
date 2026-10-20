// Keep server identifiers out of operator copy, including future reason codes.
const labels = new Map([
  ['child_failed', 'Child session failed'],
  ['operator_takeover', 'You took over this session'],
  ['parent_unavailable', 'Parent session is unavailable'],
  ['parent_deleted', 'Parent session was deleted'],
  ['unsupported_delivery', 'Parent cannot receive this update'],
  ['handling_deadline', 'Parent did not respond in time'],
  ['operator_required', 'Your response is needed'],
  ['queue_full', 'Parent has too many updates waiting'],
  ['wake_budget', 'Parent could not be resumed again'],
  ['not_delivered', 'Update could not reach the parent'],
  ['config_unverified', 'Parent configuration needs review'],
  ['grant_changed', 'Delegation settings changed'],
])
export function attentionReason(reason: string): string {
  return labels.get(reason) ?? 'Session needs your attention'
}
