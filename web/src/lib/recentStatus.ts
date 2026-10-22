import type { IconName } from '../components/ui/Icon'
import { statusOf, type StatusInput } from './status'

/** Preserve the shared attention precedence, with the prototype's distinct
 * glyphs and foreground colours for compact navigation. */
export function recentStatus(row: StatusInput): { icon: IconName; colour: string; label: string } {
  const status = statusOf(row)
  let icon: IconName = 'question-mark-circle', colour = 'idle'
  if (status.tone === 'attn') {
    icon = row.question_waits ? 'chat-bubble-left-ellipsis' : row.activity === 'blocked' ? 'hand-raised' : 'chat-bubble-left-right'
    colour = 'wait'
  } else switch (status.label) {
    case 'Parent is handling': icon = 'shield-check'; colour = 'start'; break
    case 'Answer pending delivery': icon = 'chat-bubble-left-ellipsis'; colour = 'start'; break
    case 'Waiting on children': icon = 'rectangle-stack'; colour = 'wait'; break
    case 'Starting': icon = 'arrow-path'; colour = 'start'; break
    case 'Running': icon = 'play-circle'; colour = 'run'; break
    case 'Idle': icon = 'check-circle'; break
    case 'Parked': icon = 'pause-circle'; colour = 'park'; break
    case 'Host offline': icon = 'signal-slash'; colour = 'park'; break
    case 'Closed': icon = 'stop-circle'; break
    case 'Failed': icon = 'x-circle'; colour = 'fail'; break
  }
  return { icon, colour, label: status.label }
}
