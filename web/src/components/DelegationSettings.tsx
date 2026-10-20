import { useEffect, useId, useRef, useState } from 'react'
import { executionPolicy, runtimeCatalog, sessionTools, setExecutionPolicy, setSessionTools } from '../api/delegation'
import { hosts as listHosts } from '../api/manage'
import { messageOf, StepUpCancelled } from '../api/errors'
import { useClient } from '../app-client'
import type { ExecutionPolicy, HatItem, HostCatalog } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import { policyChoices, policyFields, replaceGrant } from '../lib/delegationPolicy'
import { agentLabel } from '../lib/agent'
import { Text, visible } from '../lib/text'
import ConfirmDialog from './ConfirmDialog'

export default function DelegationSettings({ hats }: { hats: HatItem[] | null }) {
  const id = useId()
  const [selected, setSelected] = useState('')
  const hat = hats?.find(h => h.id === selected) ?? hats?.find(h => !h.purging)
  return <section className="card" aria-labelledby="delegation-heading">
    <h2 id="delegation-heading" tabIndex={-1}>Delegation by hat</h2>
    <p>Let an agent start and coordinate child sessions. Session tools and execution grants are separate choices.</p>
    {!hats && <p role="status">Loading hats…</p>}
    {hats?.length === 0 && <p>No hats available.</p>}
    {hat && <><div className="field"><label htmlFor={id}>Delegation hat</label><select id={id} value={hat.id} onChange={e => setSelected(e.target.value)}>{hats?.map(h => <option key={h.id} value={h.id}>{visible(h.name)}</option>)}</select></div>
      <HatDelegation key={hat.id} hat={hat} /></>}
  </section>
}

function HatDelegation({ hat }: { hat: HatItem }) {
  const client = useClient()
  const tools = useResource(() => sessionTools(client, hat.id), [client, hat.id])
  const policy = useResource(() => executionPolicy(client, hat.id), [client, hat.id])
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  return <div>
    <h3><Text>{hat.name}</Text></h3>
    {hat.purging && <p role="alert">This hat is being purged. Delegation settings are read-only.</p>}
    {tools.error && <p role="alert">Unable to load session tools. <Text>{tools.error}</Text> <button className="btn btn-ghost" onClick={tools.reload}>Retry session tools</button></p>}
    {!tools.data && !tools.error && <p role="status">Loading session tools…</p>}
    {tools.data && <><label className="policy-control"><input type="checkbox" checked={tools.data.delegation_enabled} disabled={busy || hat.purging} onChange={e => {
      const enabled = e.target.checked
      setBusy(true); setError(null); setNotice(null)
      void setSessionTools(client, hat.id, { delegation_enabled: enabled }).then(saved => {
        tools.set(saved); setNotice(saved.delegation_enabled ? 'Delegation enabled. Start or resume a session to receive the tools.' : 'Delegation disabled. Already delivered work continues as ordinary sessions.')
      }).catch(err => setError(err instanceof StepUpCancelled ? 'Change cancelled. The saved setting is unchanged.' : messageOf(err))).finally(() => setBusy(false))
    }} />Enable delegation session tools</label><p className="hint">Saved version {tools.data.revision}. Enabling takes effect at the next start or resume. It does not expand execution grants.</p></>}
    <p className="hint">Disabling immediately denies built-in calls, cancels work not yet dispatched and routes outstanding attention to you. Already delivered work keeps running. Re-enabling does not replay cancelled work.</p>
    {error && <p role="alert"><Text>{error}</Text></p>}{notice && <p role="status">{notice}</p>}
    <h3>Execution grants</h3>
    <p>Known profiles allow their baseline settings without an override: Claude Default or Plan, Codex Read only. More permissive settings need an explicit grant. Other profiles need explicit policy settings. Availability of the tools also depends on the host and agent.</p>
    {policy.error && <p role="alert">Unable to load execution grants. <Text>{policy.error}</Text> <button className="btn btn-ghost" onClick={policy.reload}>Retry grants</button></p>}
    {!policy.data && !policy.error && <p role="status">Loading execution grants…</p>}
    {policy.data && <GrantEditor key={`${hat.id}:${policy.data.revision}`} hat={hat} saved={policy.data} onSaved={policy.set} />}
  </div>
}

function GrantEditor({ hat, saved, onSaved }: { hat: HatItem; saved: ExecutionPolicy; onSaved: (value: ExecutionPolicy) => void }) {
  const client = useClient()
  const id = useId()
  const hosts = useResource(() => listHosts(client), [client])
  const [host, setHost] = useState(''), [agent, setAgent] = useState(''), [cwd, setCwd] = useState('')
  const [catalog, setCatalog] = useState<HostCatalog | null>(null), [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null), [review, setReview] = useState(false)
  const [allowed, setAllowed] = useState(saved.allowed)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const resetContext = () => { controller.current?.abort(); setCatalog(null); setLoading(false); setError(null) }
  const online = hosts.data?.some(h => h.host_id === host && h.connected && !h.revoked_at) ?? false
  const load = async () => {
    controller.current?.abort()
    const current = new AbortController(); controller.current = current
    setCatalog(null); setLoading(true); setError(null)
    try {
      const next = await runtimeCatalog(client, host, agent, cwd.trim(), current.signal)
      if (!current.signal.aborted) {
        if (next.agent !== agent) throw new Error('The agent changed. Load its choices again.')
        setCatalog(next)
      }
    } catch (err) { if (!current.signal.aborted) setError(messageOf(err)) }
    finally { if (!current.signal.aborted) setLoading(false) }
  }
  const fields = catalog ? policyFields(catalog) : []
  const usable = catalog?.freshness === 'fresh' && online && !loading && !hat.purging
  const changed = JSON.stringify(allowed) !== JSON.stringify(saved.allowed)
  const runtimeGrants = Object.hasOwn(allowed, agent) ? allowed[agent] : {}
  return <div className="execution-grants">
    <p className="hint">Saved version {saved.revision}. An override replaces all allowed values for that setting. Removing it returns to the profile baseline. Saving never starts or retries a child session.</p>
    <div className="settings-context">
      <div className="field"><label htmlFor={`${id}-host`}>Grant host</label><select id={`${id}-host`} value={host} onChange={e => { resetContext(); setHost(e.target.value); setAgent('') }}><option value="">Choose a host</option>{hosts.data?.filter(h => !h.revoked_at).map(h => <option key={h.host_id} value={h.host_id} disabled={!h.connected}>{visible(h.name)}{!h.connected && ' (offline)'}</option>)}</select></div>
      <div className="field"><label htmlFor={`${id}-agent`}>Grant agent</label><input className="input" id={`${id}-agent`} list={`${id}-agents`} value={agent} maxLength={128} disabled={!host} onChange={e => { resetContext(); setAgent(e.target.value) }} placeholder="Agent id configured on this host" aria-describedby={`${id}-agent-hint`} />
        <datalist id={`${id}-agents`}>{Object.keys(hosts.data?.find(h => h.host_id === host)?.mcp_delivery ?? {}).map(runtime => <option key={runtime} value={runtime}>{visible(agentLabel(runtime))}</option>)}</datalist>
        <span className="hint" id={`${id}-agent-hint`}>Enter a configured agent id. Loading choices checks it on the selected host.</span>
      </div>
      <label className="field context-path">Grant project path<input className="input" value={cwd} onChange={e => { resetContext(); setCwd(e.target.value) }} placeholder="Absolute path on this host" /></label>
    </div>
    <button className="btn btn-ghost" disabled={!online || !agent.trim() || !cwd.trim() || loading || hat.purging} onClick={() => void load()}>{loading ? 'Loading choices…' : 'Load grant choices'}</button>
    {[hosts.error, error].map((message, i) => message && <p role="alert" key={i}><Text>{message}</Text></p>)}
    {hosts.error && <button className="btn btn-ghost" onClick={hosts.reload}>Retry grant hosts</button>}
    {catalog && <>
      {!usable && <p role="alert">These choices are not current. Load grant choices again before adding values. Existing grants can still be removed.</p>}
      {!catalog.security.known && <p className="hint warn">This profile has no known safe baseline. Explicitly identify each policy setting and its allowed values. No safe settings are inferred.</p>}
      {fields.length === 0 && <p>No editable policy settings were reported.</p>}
      {fields.map(field => {
        const explicit = Object.hasOwn(runtimeGrants, field.key)
        const values = explicit ? runtimeGrants[field.key] : field.baseline
        const choices = policyChoices(field)
        return <fieldset className="grant-axis" key={field.key}><legend><Text>{field.option.name}</Text></legend>
          <p>Profile baseline: {field.baseline.length ? field.baseline.map(value => choices.find(c => c.value === value)?.label ?? String(value)).join(', ') : 'No allowed values reported'}</p>
          <label className="policy-control"><input type="checkbox" checked={explicit} disabled={!usable} onChange={e => setAllowed(replaceGrant(allowed, agent, field.key, e.target.checked ? [...field.baseline] : null))} />{catalog.security.known ? 'Override' : 'Use as policy setting'} <Text>{field.option.name}</Text></label>
          <div className="policy-values">{choices.map(choice => <label key={`${typeof choice.value}:${choice.value}`} className="policy-control"><input type="checkbox" checked={values.includes(choice.value)} disabled={!usable || !explicit} onChange={e => setAllowed(replaceGrant(allowed, agent, field.key, e.target.checked ? [...values, choice.value] : values.filter(value => value !== choice.value)))} /><Text>{choice.label}</Text></label>)}</div>
          {explicit && values.some(value => !choices.some(c => c.value === value)) && <p className="hint warn">Some saved values are unavailable in this context. They stay granted until you remove them below.</p>}
        </fieldset>
      })}
    </>}
    <div className="grant-review"><h4>All explicit grants for <Text>{hat.name}</Text></h4><GrantSummary allowed={allowed} catalog={catalog} />
      {Object.entries(allowed).flatMap(([runtime, axes]) => Object.keys(axes).map(axis => <button className="btn btn-ghost" key={`${runtime}:${axis}`} disabled={hat.purging} onClick={() => setAllowed(replaceGrant(allowed, runtime, axis, null))}>Remove override: <Text>{agentLabel(runtime)}</Text> / <Text>{grantField(catalog, runtime, axis)?.option.name ?? (axis === 'mode' ? 'Permissions' : axis)}</Text></button>))}
    </div>
    <p className="hint warn">Grants may let agents work with fewer permission prompts. Review every runtime and setting before saving. Launcher defaults do not grant delegation permissions.</p>
    <div className="card-actions"><button className="btn btn-primary" disabled={!changed || hat.purging} onClick={() => setReview(true)}>Review execution grants</button><button className="btn btn-ghost" disabled={!changed} onClick={() => setAllowed(saved.allowed)}>Discard grant edits</button></div>
    {review && <ConfirmDialog title="Save execution grants?" confirm="Save execution grants" returnFocus={() => document.getElementById('delegation-heading')} onClose={() => setReview(false)} action={async () => onSaved(await setExecutionPolicy(client, hat.id, { allowed }))}>
      <p>Replace the complete execution grants for <Text>{hat.name}</Text>. These settings can reduce permission prompts. Other runtimes and settings are included below.</p>
      <h3>Saved grants</h3><GrantSummary allowed={saved.allowed} catalog={catalog} /><h3>Proposed grants</h3><GrantSummary allowed={allowed} catalog={catalog} />
    </ConfirmDialog>}
  </div>
}
function grantField(catalog: HostCatalog | null, agent: string, axis: string) {
  return catalog?.agent === agent ? policyFields(catalog).find(field => field.key === axis) : undefined
}
function GrantSummary({ allowed, catalog }: { allowed: ExecutionPolicy['allowed']; catalog: HostCatalog | null }) {
  return Object.keys(allowed).length === 0 ? <p>No explicit overrides. Known profiles use their baseline.</p> : <ul className="purge-list">{Object.entries(allowed).flatMap(([agent, axes]) => Object.entries(axes).map(([axis, values]) => {
    const field = grantField(catalog, agent, axis)
    const label = (value: (typeof values)[number]) => field ? policyChoices(field).find(choice => choice.value === value)?.label ?? `${String(value)} (not offered here)` : typeof value === 'boolean' ? value ? 'On' : 'Off' : value
    return <li key={`${agent}:${axis}`}><Text>{agentLabel(agent)}</Text> · <Text>{field?.option.name ?? (axis === 'mode' ? 'Permissions' : axis)}</Text>: <Text>{values.length ? values.map(label).join(', ') : 'No values allowed'}</Text></li>
  }))}</ul>
}
