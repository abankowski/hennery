import { useEffect, useId, useRef, useState } from 'react'
import { executionPolicy, sessionTools, setExecutionPolicy, setSessionTools } from '../api/delegation'
import { messageOf, StepUpCancelled } from '../api/errors'
import { useClient } from '../app-client'
import type { HatItem } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import { currentDelegationGrants } from '../lib/delegationSwitch'
import { Text, visible } from '../lib/text'

export default function DelegationSettings({ hats }: { hats: HatItem[] | null }) {
  const id = useId()
  const [selected, setSelected] = useState(''), [busy, setBusy] = useState(false)
  const hat = hats?.find(h => h.id === selected) ?? hats?.find(h => !h.purging) ?? hats?.[0]
  return <section className="card delegation-settings" aria-labelledby="delegation-heading">
    <h2 id="delegation-heading" tabIndex={-1}>Delegation by hat</h2>
    {!hats && <p role="status">Loading hats…</p>}
    {hats?.length === 0 && <p>No hats available.</p>}
    {hat && <><label className="delegation-hat" htmlFor={id}>Delegation hat<select id={id} value={hat.id} disabled={busy} onChange={e => setSelected(e.target.value)}>{hats?.map(h => <option key={h.id} value={h.id}>{visible(h.name)}</option>)}</select></label>
      <HatDelegation key={hat.id} hat={hat} busy={busy} setBusy={setBusy} /></>}
  </section>
}

function HatDelegation({ hat, busy, setBusy }: { hat: HatItem; busy: boolean; setBusy: (value: boolean) => void }) {
  const client = useClient(), help = useId()
  const tools = useResource(() => sessionTools(client, hat.id), [client, hat.id])
  const policy = useResource(() => executionPolicy(client, hat.id), [client, hat.id])
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null)
  const [retry, setRetry] = useState<boolean | null>(null)
  const running = useRef(false), live = useRef(true)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const change = async (enabled: boolean) => {
    if (running.current || hat.purging) return
    running.current = true; setBusy(true); setError(null); setNotice(null); setRetry(null)
    let writing = false
    try {
      const allowed = enabled ? await currentDelegationGrants(client) : {}
      if (!live.current) return
      // Exactly one prompt covers both writes; neither request may prompt again.
      await client.confirm()
      if (!live.current) return
      writing = true
      const options = { stepUp: false }
      // Grant before enabling. Disable tools before clearing the grant.
      const savedTools = enabled ? null : await setSessionTools(client, hat.id, { delegation_enabled: false }, options)
      const savedPolicy = await setExecutionPolicy(client, hat.id, { allowed }, options)
      const saved = savedTools ?? await setSessionTools(client, hat.id, { delegation_enabled: true }, options)
      if (live.current) {
        tools.set(saved); policy.set(savedPolicy)
        if (saved.delegation_enabled !== enabled) throw new Error('The collector did not save the requested Delegation setting.')
        setNotice(enabled ? 'Delegation enabled.' : 'Delegation disabled. Already delivered work continues as ordinary sessions.')
      }
    } catch (err) {
      if (live.current) {
        setError(err instanceof StepUpCancelled ? 'Change cancelled. The saved setting is unchanged.' : `${writing ? 'Delegation could not be fully saved. ' : ''}${messageOf(err)}`)
        if (!(err instanceof StepUpCancelled)) setRetry(enabled)
        if (writing) {
          const readback = await Promise.allSettled([sessionTools(client, hat.id), executionPolicy(client, hat.id)])
          if (live.current) {
            if (readback[0].status === 'fulfilled') tools.set(readback[0].value)
            if (readback[1].status === 'fulfilled') policy.set(readback[1].value)
          }
        }
      }
    } finally { running.current = false; if (live.current) setBusy(false) }
  }
  return <div>
    {hat.purging && <p role="alert">This hat is being purged. Delegation settings are read-only.</p>}
    {tools.error && <p role="alert">Unable to load session tools. <Text>{tools.error}</Text> <button className="btn btn-ghost" onClick={tools.reload}>Retry session tools</button></p>}
    {policy.error && <p role="alert">Unable to load Delegation policy. <Text>{policy.error}</Text> <button className="btn btn-ghost" onClick={policy.reload}>Retry policy</button></p>}
    {(!tools.data || !policy.data) && !tools.error && !policy.error && <p role="status">Loading Delegation…</p>}
    {tools.data && policy.data && <label className="delegation-switch-row"><span>Delegation</span><input className="plain-switch" role="switch" type="checkbox" aria-describedby={help} checked={tools.data.delegation_enabled} disabled={busy || hat.purging} onChange={e => void change(e.target.checked)} /></label>}
    <p id={help}>Sessions in this hat can start child sessions with any model and mode. Children cannot start their own children. Permission requests always come to you.</p>
    <p className="hint">Takes effect at the next start or resume.</p>
    {error && <p role="alert"><Text>{error}</Text></p>}{notice && <p role="status">{notice}</p>}
    {retry !== null && <button className="btn btn-ghost" disabled={busy} onClick={() => void change(retry)}>Retry change</button>}
  </div>
}
