import { useCallback, useEffect, useMemo, useState } from 'react'
import { authDevices, policies as listPolicies, pushDevices, removePush, revokeDevice, saveContact, savePolicy, vapid } from '../api/device'
import { hats as listHats, settings } from '../api/manage'
import { ApiFailure, messageOf } from '../api/errors'
import { useClient } from '../app-client'
import SignOut from '../components/SignOut'
import type { AuthSessionItem, HatItem, PushPolicyItem, PushSubscriptionItem } from '../generated/protocol'
import { Text } from '../lib/text'
import { BrowserPush, classifyPush, type PushState } from '../pwa/device'
import { pushJournal, type PushRecord } from '../pwa/journal'
import { registerWorker, usePwa } from '../pwa/lifecycle'
import { completeLogout } from '../pwa/logout'
import { vapidBytes } from '../pwa/subscription'
import '../manage.css'

const COPY: Record<PushState, string> = {
  unsupported: 'This browser does not support notifications. Install the app where supported.',
  insecure: 'Notifications require a secure HTTPS connection.',
  blocked: 'Notifications are blocked by browser or OS settings. Change those settings to enable them.',
  off: 'Notifications are off on this browser.',
  unconfirmed: 'Browser registration is unconfirmed. Enable to register or repair it.',
  reenable: 'Enable again: the device was removed, its subscription changed, or collector keys changed.',
  signed_out: 'This push registration belongs to an expired login. Explicitly enable to bind it to this login.',
  enabled: 'Notifications are enabled on this browser.',
}
const supported = () => 'serviceWorker' in navigator && !!navigator.locks && typeof PushManager !== 'undefined' && typeof Notification !== 'undefined'
const hintDismissed = () => { try { return !!sessionStorage.getItem('hennery.install-hint-dismissed') } catch { return false } }

export default function Settings({ push, sessions }: { push: boolean; sessions: boolean }) {
  const client = useClient(), pwa = usePwa()
  const [devices, setDevices] = useState<PushSubscriptionItem[]>([])
  const [logins, setLogins] = useState<AuthSessionItem[]>([])
  const [hats, setHats] = useState<HatItem[]>([]), [policies, setPolicies] = useState<PushPolicyItem[]>([])
  const [contact, setContact] = useState<string | null>(null), [key, setKey] = useState('')
  const [inspection, setInspection] = useState<{ subscription: PushSubscription | null; record: PushRecord; matches: boolean } | null>(null)
  const [checked, setChecked] = useState<number | null>(null), [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null), [busy, setBusy] = useState(false), [prepared, setPrepared] = useState(false)
  const [label, setLabel] = useState(''), [hint, setHint] = useState(!hintDismissed())
  const device = useMemo(() => pwa.registration && key ? new BrowserPush(client, pwa.registration, pushJournal(), key) : null, [client, pwa.registration, key])

  const refresh = useCallback(async () => {
    try {
      const loginRows = await authDevices(client)
      setLogins(loginRows)
      if (push) {
        const observed = pwa.registration && supported() ? await pushJournal().read() : null
        const [rows, loadedKey, config] = await Promise.all([pushDevices(client), vapid(client), settings(client)])
        vapidBytes(loadedKey.public_key)
        if (pwa.registration && supported()) {
          const inspected = await new BrowserPush(client, pwa.registration, pushJournal(), loadedKey.public_key).reconcile(rows, fetch, observed?.generation)
          if (inspected.stale) throw new Error('Another window changed notification settings; refresh to check them.')
          setInspection(inspected)
        }
        setDevices(rows); setKey(loadedKey.public_key); setContact((old) => old ?? config.contact ?? '')
        if (sessions) {
          const [hatRows, policyRows] = await Promise.all([listHats(client), listPolicies(client)])
          setHats(hatRows); setPolicies(policyRows)
        }
      }
      setChecked(Date.now()); setError(null)
    } catch (err) { setError('Unable to check device settings: ' + messageOf(err)) }
  }, [client, push, sessions, pwa.registration])
  useEffect(() => { void refresh() }, [refresh])

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null); setNotice(null)
    try { await action() } catch (err) { setError(messageOf(err)) } finally { setBusy(false) }
  }
  const state = classifyPush({ supported: supported(), secure: globalThis.isSecureContext === true,
    permission: typeof Notification === 'undefined' ? 'default' : Notification.permission,
    subscribed: !!inspection?.subscription, matches: inspection?.matches ?? true,
    record: inspection?.record ?? { generation: 0, enabled: false }, row: devices.find((r) => r.id === inspection?.record.id) })
  const canEnable = !['unsupported', 'insecure', 'blocked'].includes(state) && !!device
  const iosTab = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches && !(navigator as Navigator & { standalone?: boolean }).standalone
  const expires = inspection?.subscription?.expirationTime
  const renewable = state === 'enabled' && expires != null && expires <= Date.now() + 86400000

  return <div className="manage device-settings">
    <header className="manage-head"><h1>Settings</h1></header>
    {error && <p role="alert" className="form-error"><Text>{error}</Text>{checked && <> Last checked {new Date(checked).toLocaleString()}.</>}</p>}
    {notice && <p role="status">{notice}</p>}
    <button className="btn btn-ghost" disabled={busy} onClick={() => void run(refresh)}>Refresh settings</button>
    {push && <section className="card" aria-labelledby="browser-push-heading">
      <h2 id="browser-push-heading">Notifications on this browser</h2>
      {hint && <div><p>Install hennery for convenient access. Enable notifications only when you want them.</p>
        <button className="btn btn-ghost" onClick={() => { try { sessionStorage.setItem('hennery.install-hint-dismissed', '1') } catch { /* Nonessential preference. */ } setHint(false) }}>Dismiss install hint</button></div>}
      {iosTab && <p>Use your browser’s Share or menu control, Add to Home Screen, then launch that app and sign in there if needed before enabling notifications.</p>}
      <p role="status">{COPY[state]}</p>
      {!pwa.registration && !pwa.error && supported() && globalThis.isSecureContext === true && <p role="status">Preparing the offline shell…</p>}
      {pwa.error && <p role="alert">{pwa.error} <button className="btn btn-ghost" onClick={() => void registerWorker()}>Retry worker setup</button></p>}
      <label className="field">Device label (optional)<input className="input" value={label} maxLength={64} onChange={(e) => setLabel(e.target.value)} /></label>
      <div className="card-actions">
        {canEnable && (prepared ? <button className="btn btn-primary" disabled={busy} onClick={() => {
          // The permission API is invoked in this tap before ANY await.
          const permission = Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission()
          void run(async () => {
            if (await permission !== 'granted') { setPrepared(false); setNotice('Notifications were not enabled. Check browser or OS settings.'); return }
            await device!.enable(label.trim() || undefined); setPrepared(false); await refresh()
          })
        }}>Enable notifications</button> : <button className="btn btn-primary" disabled={busy} onClick={() => void run(async () => { await client.confirm(); setPrepared(true) })}>Prepare notifications</button>)}
        <button className="btn btn-ghost" disabled={busy || !device} onClick={() => void run(async () => {
          const result = await device!.disable(); setPrepared(false)
          setNotice(result.server && result.browser ? 'Notifications disabled.' : !result.server && !result.browser ? 'Collector removal and browser cleanup are unconfirmed. Retry Disable.' : !result.server ? 'Browser unsubscribed; collector removal is unconfirmed. Retry Disable.' : 'Collector registration removed; browser cleanup is unconfirmed. Retry Disable.')
          await refresh()
        })}>Disable notifications</button>
        {renewable && <button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => { await device!.renew(devices); await refresh() })}>Renew subscription</button>}
      </div>
      <p className="hint">The icon does not guarantee offline storage. An offline first visit needs a successful installation first. Receiving a push does not make the collector reachable.</p>
    </section>}
    {push && <section className="card"><h2>Push devices</h2><p className="hint">These are registrations, not unique physical devices. Removing one stops delivery; it does not sign that browser out.</p>
      <ul className="cards">{devices.map((row) => <li className="card" key={row.id}>
        <h3><Text>{row.device_label}</Text>{row.id === inspection?.record.id && ' (this registration)'}</h3>
        <dl className="facts"><dt>Endpoint host</dt><dd><Text>{row.endpoint_host}</Text></dd><dt>Created</dt><dd>{row.created_at}</dd>
          <dt>Last service acceptance</dt><dd>{row.last_success_at ?? 'None reported'}</dd><dt>Delivery error</dt><dd><Text>{row.last_error ?? 'None reported'}</Text></dd></dl>
        {row.signed_out && <p>Signed out or expired; this registration can still receive push.</p>}
        <p className="hint">Service acceptance does not prove the OS displayed or you read a notification.</p>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => {
          if (row.id === inspection?.record.id && device) {
            const result = await device.disable()
            if (!result.server || !result.browser) setNotice('Removal or browser cleanup is unconfirmed. Retry Disable.')
          } else await removePush(client, { id: row.id })
          await refresh()
        })}>Remove <Text>{row.device_label}</Text></button>
      </li>)}</ul>
    </section>}
    <section className="card"><h2>Signed-in devices</h2><p className="hint">Each row is a login. Revoke also removes its push registrations.</p>
      <ul className="cards">{logins.map((row) => <li key={row.id} className="card"><p><Text>{row.user_agent}</Text>{row.current && ' (current login)'}</p>
        <dl className="facts"><dt>Created</dt><dd>{row.created_at}</dd><dt>Last seen</dt><dd>{row.last_seen_at}</dd><dt>Expires</dt><dd>{row.expires_at}</dd></dl>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => { await revokeDevice(client, row.id); if (row.current) await completeLogout(client); else await refresh() })}>Revoke {row.current ? 'current login' : 'login'}</button>
      </li>)}</ul>
    </section>
    {push && sessions && <section className="card"><h2>Notification privacy by hat</h2><p>These settings apply to every push device for this hat. Question details are agent text and may contain secrets. A generic title with details still reveals that text.</p>
      {policies.map((policy) => <Policy key={policy.hat_id} policy={policy} name={hats.find((h) => h.id === policy.hat_id)?.name ?? policy.hat_id} onRemove={() => setPolicies((rows) => rows.filter((r) => r.hat_id !== policy.hat_id))} />)}
    </section>}
    {push && contact !== null && <section className="card"><h2>Push contact</h2><p className="hint">The VAPID contact lets a push service contact the collector operator. Saving it changes only the contact.</p>
      <label className="field">Push contact<input className="input" value={contact} onChange={(e) => setContact(e.target.value)} /></label>
      <button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => { const stored = await saveContact(client, contact); setContact(stored.contact ?? ''); setNotice('Contact saved.') })}>Save contact</button>
    </section>}
    <section className="card"><h2>This login</h2><SignOut className="btn btn-ghost" /></section>
  </div>
}

function Policy({ policy, name, onRemove }: { policy: PushPolicyItem; name: string; onRemove: () => void }) {
  const client = useClient(), [value, setValue] = useState(policy), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  return <fieldset className="card" disabled={busy}><legend><Text>{name}</Text></legend>
    {(['muted', 'generic_title', 'details'] as const).map((key, i) => <label className="policy-control" key={key}>
      <input type="checkbox" checked={value[key]} onChange={(e) => setValue({ ...value, [key]: e.target.checked })} />{['Mute', 'Use a generic title', 'Include question details'][i]}
    </label>)}
    <p>Preview: {value.muted ? 'No notification' : value.generic_title ? 'hennery needs your answer' : 'Example project needs your answer'}{!value.muted && value.details && ' — Example question text (may contain secrets)'}</p>
    {error && <p role="alert"><Text>{error}</Text></p>}
    <button className="btn btn-ghost" onClick={() => {
      setBusy(true); setError(null)
      const { muted, details, generic_title } = value
      void savePolicy(client, policy.hat_id, { muted, details, generic_title }).then(setValue, (err: unknown) => {
        if (err instanceof ApiFailure && err.status === 404) onRemove()
        else setError(messageOf(err))
      }).finally(() => setBusy(false))
    }}>Save policy</button>
  </fieldset>
}
