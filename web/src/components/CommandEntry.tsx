import { useActionSnapshot } from '../app-actions'
import { Icon } from './ui'
export default function CommandEntry({ compact = false }: { compact?: boolean }) {
  const actions = useActionSnapshot()
  const enabled = actions?.get('open-commands')?.enabled || actions?.get('search-sessions')?.enabled
  return <button type="button" className="command-entry" aria-label="Jump to" disabled={!enabled} onClick={() => {
    if (!actions?.dispatch('open-commands')) actions?.dispatch('search-sessions')
  }}><Icon name="magnifying-glass" size={18} />{!compact && <span>Jump to…</span>}</button>
}
