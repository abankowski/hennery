import { afterEach, expect, it, vi } from 'vitest'
import { AppActions } from '../app-actions'
import { isEditing, recentSessions, registeredCommands, shortcutAction } from './commands'
import type { SessionSummary } from '../generated/view'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })
const event = (key: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key, cancelable: true, ...init })
function platform(mac = false) { vi.spyOn(navigator, 'platform', 'get').mockReturnValue(mac ? 'MacIntel' : 'Linux') }
it('lists only enabled registered commands and keeps the contextual provider label', () => {
  const actions = new AppActions()
  actions.register('new-session', { label: 'New session', enabled: true, run() {} }, -1)
  actions.register('new-session', { label: 'New session in this project', enabled: true, run() {} })
  actions.register('open-defaults', { label: 'Defaults', enabled: false, run() {} })
  expect(registeredCommands(actions)).toEqual([{ id: 'new-session', label: 'New session in this project' }])
})
it.each([false, true])('uses only the platform modifier (mac=%s)', mac => {
  platform(mac)
  expect(shortcutAction(event('k', { metaKey: mac, ctrlKey: !mac }), 'sessions', true)).toBe('open-commands')
  expect(shortcutAction(event('L', { metaKey: mac, ctrlKey: !mac, shiftKey: true }), 'sessions', true)).toBe('theme')
  expect(shortcutAction(event('k', { metaKey: !mac, ctrlKey: mac }), 'sessions', true)).toBeNull()
  expect(shortcutAction(event('k', { ctrlKey: true, metaKey: true }), 'sessions', true)).toBeNull()
})
it.each([
  ['n', 'hosts', false, 'new-session'], ['[', 'sessions', true, 'toggle-rail'], ['[', 'sessions', false, null],
  [']', 'session', false, 'toggle-details'], [']', 'sessions', true, null], ['r', 'session', true, 'focus-composer'],
  ['r', 'needs-you', true, null], ['/', 'sessions', true, 'search-sessions'], ['/', 'needs-you', false, 'search-sessions'],
  ['/', 'session', true, null], ['?', 'settings', false, 'help'], ['1', 'session', true, null], ['9', 'needs-you', true, null],
  ['j', 'sessions', true, null], ['k', 'needs-you', true, null], ['Enter', 'new', true, null], ['Escape', 'session', true, null],
  ['e', 'session', true, null],
] as const)('key %s on %s desktop=%s returns %s', (key, route, desktop, expected) => {
  platform(); expect(shortcutAction(event(key), route, desktop)).toBe(expected)
})
it.each([{ repeat: true }, { isComposing: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }])('ignores modified/repeated/composing N: %j', init => {
  platform(); expect(shortcutAction(event('n', init), 'sessions', true)).toBeNull()
})
it('ignores already handled events and reserved quick-launch/send bindings', () => {
  platform(); const prevented = event('n'); prevented.preventDefault()
  expect(shortcutAction(prevented, 'sessions', true)).toBeNull()
  expect(shortcutAction(event('Enter', { ctrlKey: true }), 'session', true)).toBeNull()
  expect(shortcutAction(event('N', { ctrlKey: true, shiftKey: true }), 'session', true)).toBeNull()
})
it.each(['input', 'textarea', 'select', '[contenteditable]', '[role="textbox"]', '[role="combobox"]', '[role="searchbox"]'])('blocks every shortcut inside %s, including descendant/composed paths', selector => {
  platform()
  const node = document.createElement(selector.startsWith('[') ? 'div' : selector)
  if (selector === '[contenteditable]') node.setAttribute('contenteditable', 'true')
  if (selector.startsWith('[role=')) node.setAttribute('role', selector.slice(7, -2))
  const span = document.createElement('span'); node.append(span); document.body.append(node)
  for (const key of ['n', '[', ']', '/', 'r', '?', '1', '9', 'k', 'L']) {
    const e = event(key, { ctrlKey: ['k', 'L'].includes(key), shiftKey: key === 'L' })
    vi.spyOn(e, 'composedPath').mockReturnValue([span, node, document.body, window])
    expect(isEditing(e)).toBe(true)
    expect(shortcutAction(e, 'session', true)).toBeNull()
  }
})
it('uses the shadow composed path even when the target is retargeted to the host', () => {
  const host = document.createElement('div'), input = document.createElement('input')
  host.attachShadow({ mode: 'open' }).append(input); document.body.append(host)
  host.addEventListener('keydown', e => { expect(e.target).toBe(host); expect(isEditing(e)).toBe(true) })
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', composed: true, bubbles: true }))
})
it('filters authorized summaries by scope and title/path/branch/id, with stable recent ordering', () => {
  const row = (id: string, patch: Partial<SessionSummary> = {}): SessionSummary => ({ session_id: id, host_id: 'h', hat_id: 'hat', agent: 'claude', cwd: '/srv/demo', lifecycle: 'active', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0, ...patch })
  const rows = [row('b', { title: 'Parser' }), row('a', { git_branch: 'feature' }), row('c', { hat_id: 'other' }), row('d', { last_event_at: '2026-10-21' })]
  expect(recentSessions(rows, '', 'hat').map(r => r.session_id)).toEqual(['d', 'a', 'b'])
  for (const q of ['parser', 'DEMO', 'feature', 'b']) expect(recentSessions(rows, q, 'hat').length).toBeGreaterThan(0)
})
it('omits the desktop rail command from a mobile palette', () => {
  const actions = new AppActions()
  actions.register('toggle-rail', { label: 'Toggle navigation', enabled: true, run() {} })
  expect(registeredCommands(actions, false)).toEqual([])
  expect(registeredCommands(actions, true).map(action => action.id)).toEqual(['toggle-rail'])
})
it('shows key hints only on the routes and viewports that bind them', async () => {
  const { commandHint } = await import('./commands')
  expect(commandHint('new-session', 'hosts', false)).toBe('N')
  expect(commandHint('search-sessions', 'sessions', true)).toBe('/')
  expect(commandHint('search-sessions', 'session', true)).toBe('')
  expect(commandHint('toggle-rail', 'session', false)).toBe('')
  expect(commandHint('toggle-rail', 'session', true)).toBe('[')
  expect(commandHint('toggle-details', 'session', false)).toBe(']')
  expect(commandHint('toggle-details', 'sessions', true)).toBe('')
  expect(commandHint('focus-composer', 'session', true)).toBe('R')
  expect(commandHint('focus-composer', 'sessions', true)).toBe('')
  expect(commandHint('open-settings', 'sessions', true)).toBe('')
})

it.each([1, 2, 3, 4, 5])('uses physical Option/Alt digit %s for Recent on every route', n => {
  for (const mac of [true, false]) {
    platform(mac)
    expect(shortcutAction(event('™', { code: `Digit${n}`, altKey: true }), 'settings', false)).toBe(`recent-session-${n}`)
  }
})
it('backtick returns to the previous session and leaves unrelated modified keys native', () => {
  expect(shortcutAction(event('`'), 'session', true)).toBe('previous-session')
  for (const init of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { keyCode: 229 }, { isComposing: true }, { repeat: true }]) expect(shortcutAction(event('`', init), 'session', true)).toBeNull()
  for (const init of [{ shiftKey: true }, { ctrlKey: true }, { metaKey: true }, { keyCode: 229 }, { isComposing: true }, { repeat: true }]) expect(shortcutAction(event('2', { code: 'Digit2', altKey: true, ...init }), 'sessions', true)).toBeNull()
  for (const code of ['Digit0', 'Digit6', 'Digit9', 'Numpad2']) expect(shortcutAction(event('2', { code, altKey: true }), 'session', true)).toBeNull()
})
it.each(['input', 'textarea', 'select', 'div'])('keeps new session shortcuts native inside %s, including editable descendants', tag => {
  const input = document.createElement(tag)
  if (tag === 'div') input.setAttribute('contenteditable', 'true')
  document.body.append(input)
  for (const e of [event('`'), event('™', { code: 'Digit2', altKey: true })]) {
    vi.spyOn(e, 'composedPath').mockReturnValue([input, document.body, window])
    expect(shortcutAction(e, 'session', true)).toBeNull()
  }
})
