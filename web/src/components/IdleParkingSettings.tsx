import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { IdleParkingSettings as ParkingSettings } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import { Text } from '../lib/text'

const path = '/api/settings/idle-parking'
type Mode = 'host' | 'after' | 'off'
const modeOf = (value: ParkingSettings): Mode => value.idle_timeout_secs === null ? 'host' : value.idle_timeout_secs === 0 ? 'off' : 'after'

export default function IdleParkingSettings() {
  const client = useClient(), heading = useId()
  const settings = useResource(() => client.request<ParkingSettings>('GET', path), [client])
  return <section className="card" aria-labelledby={heading}>
    <h2 id={heading}>Automatic session parking</h2>
    <p>Applies to existing and new sessions on every host. Changing the timeout starts a fresh idle window. Park and Close remain available.</p>
    <p className="hint">Hosts need a version that supports this setting. Offline hosts apply changes when they reconnect.</p>
    {settings.error && <p role="alert">Unable to load parking settings. <Text>{settings.error}</Text> <button className="btn btn-ghost" onClick={settings.reload}>Retry parking settings</button></p>}
    {!settings.data && !settings.error && <p role="status">Loading parking settings…</p>}
    {settings.data && <ParkingForm saved={settings.data} />}
  </section>
}

function ParkingForm({ saved }: { saved: ParkingSettings }) {
  const client = useClient(), id = useId()
  const [mode, setMode] = useState<Mode>(() => modeOf(saved))
  const [seconds, setSeconds] = useState(String(saved.idle_timeout_secs || 1800))
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null)
  const running = useRef(false), live = useRef(true)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const valid = mode !== 'after' || (/^\d+$/.test(seconds) && Number(seconds) >= 1 && Number(seconds) <= 4294967295)
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (running.current || !valid) return
    running.current = true; setBusy(true); setError(null); setNotice(null)
    try {
      const result = await client.request<ParkingSettings>('PUT', path, { idle_timeout_secs: mode === 'host' ? null : mode === 'off' ? 0 : Number(seconds) })
      if (live.current) {
        setMode(modeOf(result)); setSeconds(String(result.idle_timeout_secs || 1800)); setNotice('Parking settings saved.')
      }
    } catch (err) {
      if (live.current) setError(`Parking settings could not be saved. ${messageOf(err)}`)
    } finally { running.current = false; if (live.current) setBusy(false) }
  }
  return <form onSubmit={event => void save(event)}>
    <div className="field">
      <label htmlFor={`${id}-mode`}>Automatic parking</label>
      <select id={`${id}-mode`} value={mode} disabled={busy} onChange={event => { setMode(event.target.value as Mode); setNotice(null) }}>
        <option value="host">Use host setting (30 minutes by default)</option>
        <option value="after">Park after idle timeout</option>
        <option value="off">Disabled for all sessions</option>
      </select>
    </div>
    {mode === 'after' && <div className="delegation-limit-field">
      <label htmlFor={`${id}-seconds`}>Idle timeout (seconds)</label>
      <input id={`${id}-seconds`} type="number" inputMode="numeric" min={1} max={4294967295} step={1} required value={seconds} disabled={busy} aria-describedby={`${id}-help`} onChange={event => { setSeconds(event.target.value); setNotice(null) }} />
      <p className="hint" id={`${id}-help`}>1800 seconds = 30 minutes. Sessions stay attached while working, waiting for an answer or pinned.</p>
    </div>}
    <p aria-live="polite">{valid ? '' : 'Enter a whole number of seconds from 1 to 4294967295.'}</p>
    {error && <p role="alert"><Text>{error}</Text></p>}
    {notice && <p role="status">{notice}</p>}
    <button className="btn btn-primary" type="submit" disabled={busy || !valid}>{busy ? 'Saving parking settings…' : 'Save parking settings'}</button>
  </form>
}
