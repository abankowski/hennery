// Who speaks in a transcript (F-14): the session's agent, never a name
// assumed for every session. The user is "You".

const KNOWN: Record<string, string> = { claude: 'Claude', codex: 'Codex' }

/** The agent's name as a transcript shows it: a known agent by its proper
 *  name, anything else as given, and "Agent" while the session is unknown. */
export function agentLabel(agent: string | undefined): string {
  if (!agent) return 'Agent'
  return Object.hasOwn(KNOWN, agent) ? KNOWN[agent] : agent
}

export const USER_LABEL = 'You'

/** Keep opaque ids in tooltips; shorten familiar dated Claude ids in rows. */
export function modelLabel(model: string): string {
  const short = model.replace(/-\d{8}$/, '')
  const claude = /^claude-(haiku|sonnet|opus)-(\d+)(?:-(\d+))?$/.exec(short)
  return claude ? `${claude[1][0].toUpperCase()}${claude[1].slice(1)} ${claude[2]}${claude[3] ? `.${claude[3]}` : ''}` : short
}

/** An avatar's one letter: the label's first character, never anyone's
 *  initials. */
export function avatarLetter(label: string): string {
  return Array.from(label.trim())[0]?.toUpperCase() ?? '?'
}
