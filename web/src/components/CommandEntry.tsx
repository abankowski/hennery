import { useAppActions } from '../app-actions'
import { Icon } from './ui'
export default function CommandEntry({ compact = false }: { compact?: boolean }) {
  const actions = useAppActions()
  return <button type="button" className="command-entry" aria-label="Jump to" onClick={() => {
    if (!actions?.dispatch('open-commands')) actions?.dispatch('search-sessions')
  }}><Icon name="magnifying-glass" size={18} />{!compact && <span>Jump to…</span>}</button>
}
