import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { delegationLimits, setDelegationLimits } from '../api/delegation'
import { messageOf, StepUpCancelled } from '../api/errors'
import { useClient } from '../app-client'
import type { OperatorDelegationLimits } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import { Text } from '../lib/text'

const fields = [
  { key: 'children', label: 'Live children per parent', help: 'How many child sessions each parent can have open at once.', fallback: 8 },
  { key: 'starts_per_operator_epoch', label: 'Child starts per operator message', help: 'Child starts per message you send to a parent session. Closing a child does not reset the count.', fallback: 32 },
  { key: 'automatic_wakes_per_operator_epoch', label: 'Automatic parent wake-ups', help: 'How many times children can wake their parent between messages you send to the parent. When used up, updates wait for you.', fallback: 20 },
] as const
type Values = Record<keyof OperatorDelegationLimits, string>
const strings = (value: OperatorDelegationLimits): Values => ({ children: String(value.children), starts_per_operator_epoch: String(value.starts_per_operator_epoch), automatic_wakes_per_operator_epoch: String(value.automatic_wakes_per_operator_epoch) })

export default function DelegationLimitsSettings() {
  const client = useClient(), heading = useId()
  const limits = useResource(() => delegationLimits(client), [client])
  return <section className="card delegation-limits" aria-labelledby={heading}>
    <h2 id={heading}>Delegation limits</h2>
    <p>Applies to every hat. Changes take effect on the next child start or parent wake-up. Existing sessions and counts are kept.</p>
    {limits.error && <p role="alert">Unable to load delegation limits. <Text>{limits.error}</Text> <button className="btn btn-ghost" onClick={limits.reload}>Retry delegation limits</button></p>}
    {!limits.data && !limits.error && <p role="status">Loading delegation limits…</p>}
    {limits.data && <LimitsForm saved={limits.data} />}
  </section>
}

function LimitsForm({ saved }: { saved: OperatorDelegationLimits }) {
  const client = useClient(), id = useId()
  const [values, setValues] = useState(() => strings(saved))
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null)
  const running = useRef(false), live = useRef(true)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const valid = fields.every(({ key }) => /^\d+$/.test(values[key]) && Number(values[key]) >= 1 && Number(values[key]) <= 64)
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (running.current || !valid) return
    running.current = true; setBusy(true); setError(null); setNotice(null)
    try {
      await client.confirm()
      if (!live.current) return
      const result = await setDelegationLimits(client, { children: Number(values.children), starts_per_operator_epoch: Number(values.starts_per_operator_epoch), automatic_wakes_per_operator_epoch: Number(values.automatic_wakes_per_operator_epoch) }, { stepUp: false })
      if (live.current) { setValues(strings(result)); setNotice('Delegation limits saved.') }
    } catch (err) {
      if (live.current) setError(err instanceof StepUpCancelled ? 'Save cancelled. Your changes have not been saved.' : `Delegation limits could not be saved. ${messageOf(err)}`)
    } finally { running.current = false; if (live.current) setBusy(false) }
  }
  return <form onSubmit={event => void save(event)}>
    {fields.map(({ key, label, help, fallback }) => <div className="delegation-limit-field" key={key}>
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input id={`${id}-${key}`} type="number" inputMode="numeric" min={1} max={64} step={1} required value={values[key]} disabled={busy} aria-describedby={`${id}-${key}-help`} onChange={event => { setValues(old => ({ ...old, [key]: event.target.value })); setNotice(null) }} />
      <p className="hint" id={`${id}-${key}-help`}>{help} Default: {fallback}. Choose 1–64.</p>
    </div>)}
    <p aria-live="polite">{valid ? '' : 'Each limit must be a whole number from 1 to 64.'}</p>
    {error && <p role="alert"><Text>{error}</Text></p>}
    {notice && <p role="status">{notice}</p>}
    <button className="btn btn-primary" type="submit" disabled={busy || !valid}>{busy ? 'Saving limits…' : 'Save delegation limits'}</button>
  </form>
}
