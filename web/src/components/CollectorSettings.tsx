import { useState } from 'react'
import { saveContact } from '../api/device'
import { settings } from '../api/manage'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { AttachmentUsage, HatItem, HostRemovalItem, RemovalState } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import { Text } from '../lib/text'
import { Link } from '../router'
import { AppearanceOptions } from './ui'
import { prepareInputSave } from '../pwa/update-edits'

const REMOVAL: Record<RemovalState, string> = {
  removed: 'Transcript removed',
  partial: 'Transcript removed in part',
  none: 'No agent transcript record',
  pending: 'Transcript removal unconfirmed',
}

export default function CollectorSettings({ push, sessions, hats }: { push: boolean; sessions: boolean; hats: HatItem[] | null }) {
  const client = useClient()
  const config = useResource(() => settings(client), [client])
  const usage = useResource(() => sessions ? client.request<AttachmentUsage>('GET', '/api/settings/attachments') : Promise.resolve(null), [client, sessions])
  const removals = useResource(() => sessions ? client.request<HostRemovalItem[]>('GET', '/api/settings/host-removals') : Promise.resolve(null), [client, sessions])
  const [contact, setContact] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null)
  return <section className="card" aria-labelledby="collector-heading"><h2 id="collector-heading">Collector</h2>
    {config.error && <p role="alert">Unable to load collector information. <Text>{config.error}</Text> <button className="btn btn-ghost" onClick={config.reload}>Retry collector</button></p>}
    {!config.data && !config.error && <p role="status">Loading collector information…</p>}
    <dl className="facts"><dt>Public URL</dt><dd>{config.data ? <Text>{config.data.public_url}</Text> : 'Not loaded'}</dd>
      {sessions && <><dt>Default for new hosts</dt><dd>{hats ? <Text>{hats.find(hat => hat.default_for_new_hosts)?.name ?? 'None reported'}</Text> : 'Not loaded'}</dd></>}
      <dt>Theme</dt><dd><AppearanceOptions /><p className="hint">System follows this device. The selected hat supplies the accent.</p></dd>
      {usage.data && <><dt>Attachments</dt><dd>{usage.data.count} images · {usage.data.bytes.toLocaleString()} bytes</dd></>}
    </dl>
    <p className="hint">The public URL is managed on the collector. <code>hennery admin reset-public-url</code> ends logins and push registrations; a changed host name removes passkeys.</p>
    {sessions && <p><Link to="/hats">Manage hats</Link> · <Link to="/hosts">Per-host defaults</Link></p>}
    {push && config.data && <div className="collector-contact"><p className="hint">The push contact lets a notification service contact the collector operator.</p>
      <label className="field">Push contact<input className="input" disabled={busy} value={contact ?? config.data.contact ?? ''} onChange={e => setContact(e.target.value)} /></label>
      <button className="btn btn-ghost" disabled={busy} onClick={event => { const saved = prepareInputSave(event.currentTarget.parentElement!); setBusy(true); setError(null); setNotice(null); void saveContact(client, contact ?? config.data!.contact ?? '').then(value => { saved(); setContact(value.contact ?? ''); setNotice('Contact saved.') }).catch(err => setError(messageOf(err))).finally(() => setBusy(false)) }}>Save contact</button>
      {error && <p role="alert"><Text>{error}</Text></p>}{notice && <p role="status">{notice}</p>}
    </div>}
    {sessions && <><h3>Host transcript cleanup</h3>
      {usage.error && <p role="alert">Attachment usage could not be loaded. <button className="btn btn-ghost" onClick={usage.reload}>Retry usage</button></p>}
      {removals.error && <p role="alert">Cleanup status could not be loaded. <button className="btn btn-ghost" onClick={removals.reload}>Retry cleanup</button></p>}
      {removals.data?.length === 0 && <p>No host cleanup records reported.</p>}
      {!removals.data && !removals.error && <p role="status">Loading cleanup status…</p>}
      <ul className="cards">{removals.data?.map(row => <li className="card" key={row.id}><p><Text>{row.agent}</Text>: {row.state === 'pending' ? 'Waiting for the host to retry' : row.last_result ? REMOVAL[row.last_result.state] : 'No cleanup result reported'}</p>
        <p>{row.attempts} attempts · {row.last_result ? `${row.last_result.remaining.reduce((sum, item) => sum + item.count, 0)} entries reported remaining` : 'No cleanup result reported yet'}</p>
      </li>)}</ul>
      <p className="hint">Agents run as the host’s OS user. Use a separate OS user for stronger isolation. Cleanup is best effort; copies outside the reported transcript may remain.</p>
    </>}
  </section>
}
