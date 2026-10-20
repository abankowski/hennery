import { hats as listHats } from '../api/manage'
import { useClient } from '../app-client'
import AccountSettings from '../components/AccountSettings'
import CollectorSettings from '../components/CollectorSettings'
import NotificationSettings from '../components/NotificationSettings'
import DelegationSettings from '../components/DelegationSettings'
import { DefaultsSettings } from '../components/HatDefaultsSummary'
import { AppearanceOptions } from '../components/ui'
import { useResource } from '../hooks/useResource'
import '../manage.css'

export default function Settings({ push, sessions }: { push: boolean; sessions: boolean }) {
  const client = useClient()
  const hats = useResource(() => sessions ? listHats(client) : Promise.resolve([]), [client, sessions])
  return <div className="manage device-settings">
    <header className="manage-head"><h1>Settings</h1></header>
    <p className="manage-subtitle">Your account, browser and collector preferences.</p>
    <section className="card"><h2>Appearance</h2><p className="hint">System follows this device. The selected hat supplies the accent.</p><AppearanceOptions /></section>
    <AccountSettings />
    {push && <NotificationSettings push={push} sessions={sessions} />}
    {hats.error && <p role="alert">Unable to load hats. <button className="btn btn-ghost" onClick={hats.reload}>Retry hats</button></p>}
    {sessions && <DelegationSettings hats={hats.data} />}
    {sessions && <DefaultsSettings hats={hats.data} />}
    <CollectorSettings push={push} sessions={sessions} hats={hats.data} />
  </div>
}
