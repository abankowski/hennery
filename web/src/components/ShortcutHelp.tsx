import { useEffect, useRef } from 'react'
import type { AppActionId, AppActions } from '../app-actions'
import { modLabel } from '../lib/commands'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { restoreCommandFocus } from '../hooks/useShortcuts'
import { Keycap, useModalLayer } from './ui'

export default function ShortcutHelp({ actions, route, close }: { actions: AppActions | null; route: string; close: () => void }) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const ref = useRef<HTMLDivElement>(null), { trap, holdFocus } = useModalLayer(ref)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ref.current?.querySelector('button')?.focus()
    return () => restoreCommandFocus(before)
  }, [])
  const enabled = (id: AppActionId) => actions?.get(id)?.enabled
  const bindings = [
    ...(enabled('open-commands') ? [[`${modLabel()}+K`, 'Jump to a session or command']] : []),
    ...(enabled('new-session') ? [['N', actions!.get('new-session')!.label]] : []),
    ...(desktop && enabled('toggle-rail') ? [['[', 'Collapse or expand navigation']] : []),
    ...(route === 'session' && enabled('toggle-details') ? [[']', 'Toggle session details']] : []),
    ...(['sessions', 'needs-you'].includes(route) && enabled('search-sessions') ? [['/', 'Focus session search'], ['J / K', 'Move between focused session links'], ['Enter', 'Open the focused link or button']] : []),
    ...(route === 'session' && enabled('focus-composer') ? [['R', 'Focus composer']] : []),
    [`${modLabel()}+Shift+L`, 'Cycle System, Light and Dark'],
    ['?', 'Show keyboard shortcuts'],
    ['Escape', 'Close the active overlay; keep drafts'],
  ]
  return <div className="command-overlay" onMouseDown={holdFocus}><div className="command-dialog shortcut-dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" ref={ref} tabIndex={-1} onKeyDown={event => trap(event, close)}>
    <header><h2>Keyboard shortcuts</h2><button type="button" className="btn btn-ghost" onClick={close}>Close shortcuts</button></header>
    <p>Global shortcuts pause while you type or use a dialog.</p>
    <dl>{bindings.map(([key, label]) => <div key={key}><dt><Keycap>{key}</Keycap></dt><dd>{label}</dd></div>)}</dl>
    <p>In a composer or New session form, {modLabel()}+Enter sends or starts only when enabled. Permission keys 1–9 belong to the focused card on desktop. They never answer from a session list.</p>
  </div></div>
}
