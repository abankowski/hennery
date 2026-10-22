import type { FamilyPage, SessionSummary } from './generated/view'
export const parent: SessionSummary = {
  session_id: 'parent', host_id: 'h1', agent: 'claude', cwd: '/srv/project', hat_id: 'hat1',
  lifecycle: 'active', activity: 'idle', presumed_parked: false,
  created_at: '2026-10-02T09:00:00Z', last_event_at: '2026-10-02T10:00:00Z',
  question_waits: false, operator_attention: 0, parent_handled_questions: 0,
  family: { revision: 1, child_counts: { total: 2, active: 2, waiting: 1 }, children: [], attention: 0 },
}
export function familyPage(id = 'child'): FamilyPage {
  return { summary: parent, questions: [], children: [{
    summary: { ...parent, session_id: id, title: 'Review parser', agent: 'codex', model: 'reasoner', cwd: '/srv/worker',
      activity: 'blocked', question_waits: true, operator_attention: 0, parent_handled_questions: 1,
      family: { revision: 1, parent: { session_id: 'parent', agent: 'claude', title: 'Coordinator' }, child_counts: { total: 0, active: 0, waiting: 0 }, children: [], attention: 0 } },
    routing: 'active', operations: [{ operation_id: 'op1', tool: 'session_spawn', state: 'accepted' }],
    questions: [{ pending_id: 'q/1', kind: 'elicitation', handling: 'parent_queued' }],
  }], next_cursor: id === 'child' ? id : undefined }
}
