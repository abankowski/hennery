import { useState } from 'react'
import { passkeys, registerPasskey, removePasskey } from '../api/auth'
import { authDevices, revokeDevice } from '../api/device'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import { useResource } from '../hooks/useResource'
import { Text } from '../lib/text'
import { completeLogout } from '../pwa/logout'
import ConfirmDialog from './ConfirmDialog'
import SignOut from './SignOut'
import When from './When'
import type { PasskeyItem } from '../generated/protocol'

export default function AccountSettings() {
  const client = useClient()
  const keys = useResource(() => passkeys(client), [client])
  const logins = useResource(() => authDevices(client), [client])
  const [label, setLabel] = useState(''), [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null), [remove, setRemove] = useState<PasskeyItem | null>(null)
  const supported = typeof PublicKeyCredential !== 'undefined' && !!navigator.credentials?.create
  const add = async () => {
    setBusy(true); setError(null)
    try { const key = await registerPasskey(client, label.trim()); keys.set(rows => [...(rows ?? []), key]); setLabel('') }
    catch (err) { setError(messageOf(err)) } finally { setBusy(false) }
  }
  return <>
    <section className="card" aria-labelledby="sign-in-heading">
      <h2 id="sign-in-heading" tabIndex={-1}>Sign-in and passkeys</h2>
      <p>Sensitive changes ask you to confirm with your password or a passkey.</p>
      <p className="hint">To reset a password, use <code>hennery admin reset-password</code> on the collector. This removes passkeys and ends every login. Changing the public host name also invalidates passkeys.</p>
      {keys.error && <p role="alert">Unable to load passkeys. <Text>{keys.error}</Text> <button className="btn btn-ghost" onClick={keys.reload}>Retry passkeys</button></p>}
      {!keys.data && !keys.error && <p role="status">Loading passkeys…</p>}
      {keys.data?.length === 0 && <p>No passkeys registered.</p>}
      <ul className="cards" aria-label="Passkeys">{keys.data?.map(key => <li className="card" key={key.id}>
        <h3><Text>{key.label}</Text></h3>
        <dl className="facts"><dt>Created</dt><dd><When at={key.created_at} /></dd><dt>Last used</dt><dd>{key.last_used_at ? <When at={key.last_used_at} /> : 'Not used yet'}</dd></dl>
        <button className="btn btn-danger" onClick={() => setRemove(key)}>Remove <Text>{key.label}</Text></button>
      </li>)}</ul>
      <label className="field">Passkey label<input className="input" maxLength={64} value={label} onChange={e => setLabel(e.target.value)} disabled={busy} /></label>
      <button className="btn btn-ghost" disabled={busy || !supported || !keys.data} onClick={() => void add()}>Add passkey</button>
      {!supported && <p className="hint">Passkeys are unavailable in this browser. Use your password to sign in.</p>}
      {error && <p role="alert"><Text>{error}</Text></p>}
    </section>
    <section className="card" aria-labelledby="logins-heading"><h2 id="logins-heading">Signed-in devices</h2><p className="hint">Each row is a login. Revoke also removes its push registrations.</p>
      {logins.error && <p role="alert">Unable to load signed-in devices. <Text>{logins.error}</Text> <button className="btn btn-ghost" onClick={logins.reload}>Retry devices</button></p>}
      {!logins.data && !logins.error && <p role="status">Loading signed-in devices…</p>}
      <ul className="cards">{logins.data?.map(row => <li key={row.id} className="card"><p><Text>{row.user_agent}</Text>{row.current && ' (current login)'}</p>
        <dl className="facts"><dt>Created</dt><dd><When at={row.created_at} /></dd><dt>Last seen</dt><dd><When at={row.last_seen_at} /></dd><dt>Expires</dt><dd><When at={row.expires_at} /></dd></dl>
        <button className="btn btn-ghost" disabled={busy} onClick={() => { setBusy(true); setError(null); void revokeDevice(client, row.id).then(async () => { if (row.current) await completeLogout(client); else logins.reload() }).catch(err => setError(messageOf(err))).finally(() => setBusy(false)) }}>Revoke {row.current ? 'current login' : 'login'}</button>
      </li>)}</ul>
    </section>
    <section className="card"><h2>This login</h2><SignOut className="btn btn-ghost" /></section>
    {remove && <ConfirmDialog title="Remove this passkey?" confirm="Remove passkey" danger returnFocus={() => document.getElementById('sign-in-heading')} onClose={() => setRemove(null)} action={async () => { await removePasskey(client, remove.id); keys.set(rows => (rows ?? []).filter(key => key.id !== remove.id)) }}>
      <p>Remove <Text>{remove.label}</Text>? You can still sign in with your password or another passkey.</p>
    </ConfirmDialog>}
  </>
}
