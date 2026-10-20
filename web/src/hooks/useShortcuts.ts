import { useEffect } from 'react'
import type { AppActions } from '../app-actions'
import { shortcutAction } from '../lib/commands'
import { cycleAppearance, getTheme } from '../lib/theme'

/** One listener, with screen providers retaining all capability/mutation checks. */
export function useShortcuts(actions: AppActions | null, route: string, help: () => void, announce: (text: string) => void) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]')) return
      const action = shortcutAction(event, route, window.matchMedia?.('(min-width: 768px)').matches ?? false)
      if (!action) return
      if (action === 'help') { event.preventDefault(); help() }
      else if (action === 'theme') { event.preventDefault(); cycleAppearance(); announce('Appearance: ' + getTheme().preference.replace(/^./, letter => letter.toUpperCase())) }
      else if (actions?.dispatch(action)) event.preventDefault()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [actions, route, help, announce])
}

/** The shared modal layer owns containment and inertness; remember the opener. */
export function restoreCommandFocus(before: HTMLElement | null) {
  if (before?.isConnected && before !== document.body) { before.focus(); return }
  const heading = document.querySelector<HTMLElement>('main h1, main h2')
  if (heading) { heading.tabIndex = -1; heading.focus() }
}
