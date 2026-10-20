import { useCallback, useState } from 'react'
import { useActionSnapshot, useLoadedSessions, useRegisterAction } from '../app-actions'
import { match, useLocation } from '../router'
import { useShortcuts } from '../hooks/useShortcuts'
import CommandPalette from './CommandPalette'
import ShortcutHelp from './ShortcutHelp'
import '../styles/commands.css'

export default function CommandHost() {
  const actions = useActionSnapshot(), loaded = useLoadedSessions()
  const { pathname } = useLocation()
  const [overlay, setOverlay] = useState<'palette' | 'help' | null>(null)
  const [announcement, announce] = useState('')
  const open = useCallback(() => setOverlay('palette'), [])
  const help = useCallback(() => setOverlay('help'), [])
  const close = useCallback(() => setOverlay(null), [])
  // The session-search entry is absent in gateway deployments, as in R2.
  const enabled = !!actions?.get('open-sessions')?.enabled
  useRegisterAction('open-commands', { label: 'Jump to', enabled, run: open })
  useShortcuts(actions, match(pathname).name, help, announce)
  return <><span className="sr-only" role="status">{announcement}</span>
    {overlay === 'palette' && actions && <CommandPalette actions={actions} loaded={loaded} close={close} />}
    {overlay === 'help' && <ShortcutHelp actions={actions} route={match(pathname).name} close={close} />}
  </>
}
