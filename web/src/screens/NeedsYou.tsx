import { useAppActions } from '../app-actions'
import HatSwitch from '../components/HatSwitch'
import NeedsYouQueue from '../components/NeedsYouQueue'
import { useSessionScope } from '../components/SessionScope'
export default function NeedsYou() {
  const scope = useSessionScope(), actions = useAppActions()
  const hosts = scope?.hosts?.filter(h => h.revoked_at == null)
  return <div className="overview"><header className="overview-head"><h1>Needs you</h1><span title="Online / owned non-revoked hosts">{hosts ? `${hosts.filter(h => h.connected).length}/${hosts.length} hosts online` : 'Hosts unknown'}</span><button type="button" className="btn btn-ghost" onClick={() => actions?.dispatch('search-sessions')}>Search</button></header>{scope && <HatSwitch hats={scope.hats} hat={scope.hat} onHat={scope.chooseHat} />}<NeedsYouQueue /></div>
}
