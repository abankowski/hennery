import { expect, it } from 'vitest'
import { recentStatus } from './recentStatus'
import type { StatusInput } from './status'

it.each([
  [{ operator_attention: 1, question_waits: true }, 'chat-bubble-left-ellipsis', 'wait'],
  [{ operator_attention: 1, activity: 'blocked' }, 'hand-raised', 'wait'],
  [{ operator_attention: 1 }, 'chat-bubble-left-right', 'wait'],
  [{ activity: 'running' }, 'play-circle', 'run'],
  [{}, 'check-circle', 'idle'],
  [{ lifecycle: 'parked' }, 'pause-circle', 'park'],
  [{ lifecycle: 'parked', presumed_parked: true }, 'signal-slash', 'park'],
  [{ lifecycle: 'closed' }, 'stop-circle', 'idle'],
  [{ lifecycle: 'failed' }, 'x-circle', 'fail'],
  [{ lifecycle: 'starting' }, 'arrow-path', 'start'],
  [{ parent_handled_questions: 1 }, 'shield-check', 'start'],
  [{ question_waits: true }, 'chat-bubble-left-ellipsis', 'start'],
  [{ family: { child_counts: { active: 1 } } }, 'rectangle-stack', 'wait'],
])('gives Recent state %j its own prototype marker', (patch, icon, colour) => {
  const row: StatusInput = { lifecycle: 'active', activity: 'idle', question_waits: false, operator_attention: 0, presumed_parked: false, ...patch }
  expect(recentStatus(row)).toMatchObject({ icon, colour })
})
