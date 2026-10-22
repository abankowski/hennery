import type { AppActionId, AppActions } from '../app-actions'
import type { SessionSummary } from '../generated/view'

export const COMMAND_ACTIONS: readonly AppActionId[] = [
  'new-session', 'rename-session', 'add-host', 'search-sessions', 'open-needs-you', 'open-sessions',
  'open-hosts', 'open-mcp', 'open-hats', 'open-defaults', 'open-settings',
  'toggle-rail', 'toggle-details', 'focus-composer',
]
export function registeredCommands(actions: AppActions, desktop = true) {
  return COMMAND_ACTIONS.filter(id => desktop || id !== 'toggle-rail').flatMap(id => {
    const action = actions.get(id)
    return action?.enabled ? [{ id, label: action.label }] : []
  })
}
export function sessionMatches(session: SessionSummary, query: string) {
  const q = query.trim().toLocaleLowerCase()
  return [session.title, session.cwd, session.git_branch, session.session_id].some(value => value?.toLocaleLowerCase().includes(q))
}
export function recentSessions(rows: Iterable<SessionSummary>, query: string, hat?: string, serverMatches?: ReadonlySet<string>) {
  // The server searches full stored fields; bounded display summaries can
  // omit the matching prefix. Only loaded-only rows need local matching.
  return [...rows].filter(row => (!hat || row.hat_id === hat) && (serverMatches?.has(row.session_id) || sessionMatches(row, query)))
    .sort((a, b) => b.last_event_at.localeCompare(a.last_event_at) || a.session_id.localeCompare(b.session_id))
}
export const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="searchbox"]'
export function isEditing(event: KeyboardEvent) {
  return event.composedPath().some(node => node instanceof Element && !!node.closest(EDITABLE))
}
export function isMac() { return /Mac|iPhone|iPad/.test(navigator.platform) }
export const modLabel = () => isMac() ? '⌘' : 'Ctrl'
export function shortcutAction(event: KeyboardEvent, route: string, desktop: boolean): AppActionId | 'theme' | 'help' | null {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || isEditing(event)) return null
  // Physical codes work with Option's alternate characters on macOS.
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && /^Digit[1-5]$/.test(event.code)) return `recent-session-${Number(event.code.slice(-1)) as 1 | 2 | 3 | 4 | 5}`
  if (event.altKey) return null
  const key = event.key.toLowerCase()
  const mod = isMac() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
  if (mod && !event.shiftKey && key === 'k') return 'open-commands'
  if (mod && event.shiftKey && key === 'l') return 'theme'
  if (event.metaKey || event.ctrlKey) return null
  if (event.key === '?') return 'help'
  if (event.shiftKey) return null
  if (key === '`') return 'previous-session'
  if (key === 'n') return 'new-session'
  if (key === '[' && desktop) return 'toggle-rail'
  if (key === ']' && route === 'session') return 'toggle-details'
  if (key === 'r' && route === 'session') return 'focus-composer'
  if (key === '/' && ['sessions', 'needs-you'].includes(route)) return 'search-sessions'
  return null
}
/** Hints describe the global key only where that binding is active. */
export function commandHint(id: AppActionId, route: string, desktop: boolean): string {
  if (id === 'new-session') return 'N'
  if (id === 'search-sessions' && ['sessions', 'needs-you'].includes(route)) return '/'
  if (id === 'toggle-rail' && desktop) return '['
  if (id === 'toggle-details' && route === 'session') return ']'
  if (id === 'focus-composer' && route === 'session') return 'R'
  return ''
}
