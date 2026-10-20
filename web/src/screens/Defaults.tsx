import '../styles/launch.css'
import { useEffect, useId, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { sessionDefaults } from '../api/defaults'
import { messageOf } from '../api/errors'
import CatalogContext, { useLaunchContext } from '../components/CatalogContext'
import DefaultsEditor from '../components/DefaultsEditor'
import type { HatItem, HatResolution, HatSessionDefaults, HostItem } from '../generated/protocol'
import { fieldsOf, flatConfig, resolveDefaults, valueLabel } from '../lib/defaults'
import { agentLabel } from '../lib/agent'
import { Link, useLocation } from '../router'
import { useRegisterContext } from '../app-actions'

export default function Defaults() {
  const client = useClient(), { search } = useLocation(), [query] = useState(() => new URLSearchParams(search))
  const [hosts, setHosts] = useState<HostItem[]>([]), [hats, setHats] = useState<HatItem[]>([])
  const [host, setHost] = useState(query.get('host') ?? ''), [cwd, setCwd] = useState(query.get('cwd') ?? ''), [agent, setAgent] = useState(query.get('agent') ?? '')
  const [manualAgent, setManualAgent] = useState(false)
  const [selectedHat, setSelectedHat] = useState(query.get('hat') ?? ''), [error, setError] = useState('')
  const [preview, setPreview] = useState<{ host: string; cwd: string; hat: string } | null>(null), [probing, setProbing] = useState(false)
  const [records, setRecords] = useState<Record<string, HatSessionDefaults>>({}), [loading, setLoading] = useState(false), [refresh, setRefresh] = useState(0)
  const generation = useRef(0), tabBase = useId(), recordsKey = JSON.stringify([agent, refresh])
  const [loadedKey, setLoadedKey] = useState('')
  const context = useLaunchContext(preview?.host ?? '', agent, preview?.cwd ?? '', preview?.hat ?? '')
  const catalog = context.state === 'ready' ? context.catalog : null
  useRegisterContext({ hostId: host, cwd: preview?.cwd, hatId: selectedHat })
  useEffect(() => {
    let live = true
    Promise.all([client.request<HostItem[]>('GET', '/api/hosts'), client.request<HatItem[]>('GET', '/api/hats')]).then(([allHosts, allHats]) => {
      if (!live) return
      setHosts(allHosts.filter(h => h.revoked_at == null)); setHats(allHats)
      setSelectedHat(current => current || allHats[0]?.id || '')
    }, err => live && setError(messageOf(err)))
    return () => { live = false }
  }, [client])
  const ids = [...new Set([...Object.keys(hosts.find(h => h.host_id === host)?.mcp_delivery ?? {}), ...(query.get('agent') ? [query.get('agent')!] : [])])]
  const agents = ids.length ? ids : agent ? [agent] : []
  useEffect(() => { if (!manualAgent && !agent && agents.length) setAgent(agents[0]) }, [agents.join('\0'), agent, manualAgent])
  useEffect(() => {
    if (!agent || !hats.length) return
    let live = true, index = 0
    const abort = new AbortController(), next: Record<string, HatSessionDefaults> = {}
    setLoading(true)
    const worker = async () => { while (index < hats.length) { const hat = hats[index++]; next[hat.id] = await sessionDefaults(client, hat.id, agent, abort.signal) } }
    Promise.all([worker(), worker()]).then(() => { if (live) { setRecords(next); setLoadedKey(recordsKey); setLoading(false); setError('') } }, err => { if (live) { setLoading(false); setError(messageOf(err)) } })
    return () => { live = false; abort.abort() }
  }, [client, hats, agent, recordsKey])
  async function loadPreview() {
    const current = ++generation.current
    setProbing(true); setError(''); setPreview(null)
    try {
      const resolved = await client.request<HatResolution>('POST', '/api/hats/resolve', { host_id: host, path: cwd.trim() })
      if (current !== generation.current) return
      if (!resolved.exists || !resolved.is_dir) throw new Error('Choose an existing project directory on this host.')
      setPreview({ host, cwd: resolved.canonical, hat: resolved.hat_id })
    } catch (err) { if (current === generation.current) setError(messageOf(err)) }
    finally { if (current === generation.current) setProbing(false) }
  }
  const currentRecords = loadedKey === recordsKey ? records : {}
  const hat = hats.find(h => h.id === selectedHat), record = currentRecords[selectedHat]
  const fields = fieldsOf(catalog)
  return <div className="defaults-screen"><header><div><h1>Defaults</h1><p>Agent default → Hat override → Your choice</p></div>{query.get('return') === 'new' && <Link to="/new?restore=1">Back to new session</Link>}</header>
    {!preview && <CatalogContext hosts={hosts} host={host} cwd={cwd} onHost={value => { generation.current++; setHost(value); setManualAgent(false); setAgent(''); setPreview(null); setCwd(''); setProbing(false) }} onCwd={value => { generation.current++; setCwd(value); setPreview(null); setProbing(false) }} onPreview={() => void loadPreview()} busy={probing} />}
    <div className="agent-tabs" role="tablist" aria-label="Agent defaults">{agents.map((id, index) => <button role="tab" type="button" key={id} id={`${tabBase}-${index}`} aria-selected={agent === id} aria-controls={`${tabBase}-panel`} tabIndex={agent === id ? 0 : -1} onClick={() => setAgent(id)} onKeyDown={event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? agents.length - 1 : event.key === 'ArrowRight' ? (index + 1) % agents.length : event.key === 'ArrowLeft' ? (index + agents.length - 1) % agents.length : -1
      if (next >= 0) { event.preventDefault(); setAgent(agents[next]); document.getElementById(`${tabBase}-${next}`)?.focus() }
    }}>{agentLabel(id)}</button>)}</div>
    <details className="runtime-id"><summary>Other agent</summary><label>Configured agent name<input value={agent} onChange={event => { setManualAgent(true); setAgent(event.target.value) }} placeholder="Agent name on the host" /></label></details>
    {preview && <p role="status">Preview: <bdi>{hosts.find(h => h.host_id === preview.host)?.name}</bdi> · <bdi>{preview.cwd}</bdi> · Resolves to <bdi>{hats.find(h => h.id === preview.hat)?.name}</bdi> · {context.catalog?.freshness === 'fresh' ? 'Up to date' : context.catalog?.freshness === 'stale' ? 'Out of date' : 'Not verified'} <button className="btn btn-ghost" type="button" onClick={() => setPreview(null)}>Change preview</button></p>}
    {preview && context.state === 'unavailable' && <p role="alert">The settings preview is unavailable. <bdi>{context.error}</bdi> Existing overrides can still be inspected and reset. <button className="btn btn-secondary" type="button" onClick={() => void loadPreview()}>Retry preview</button></p>}
    {error && <p role="alert"><bdi>{error}</bdi><button className="btn btn-secondary" type="button" onClick={() => setRefresh(value => value + 1)}>Retry defaults</button></p>}
    <section id={`${tabBase}-panel`} role="tabpanel" aria-labelledby={agents.includes(agent) ? `${tabBase}-${agents.indexOf(agent)}` : undefined}>
      {loading && <p role="status">Loading saved defaults…</p>}
      {catalog && <table className="defaults-matrix"><caption>Saved values on this host. Edits below apply after Save.</caption><thead><tr><th scope="col">Setting</th><th scope="col">Agent default</th>{hats.map(h => <th scope="col" key={h.id}><button className="btn btn-ghost" type="button" onClick={() => setSelectedHat(h.id)}>Edit {h.name}</button></th>)}</tr></thead><tbody>{fields.map(({ key, option }) => <tr key={key}><th scope="row">{option.name}</th><td><bdi>{valueLabel(catalog, key, flatConfig(catalog.defaults)[key])}</bdi></td>{hats.map(h => { const stored = currentRecords[h.id]; const result = stored ? resolveDefaults(catalog, stored.config, {}, context.policy) : null; return <td key={h.id}><bdi>{result ? valueLabel(catalog, key, flatConfig(result.config)[key]) : 'Loading…'}</bdi><span className="config-source">{result?.sources[key] ?? 'Agent default'}</span>{stored && Object.hasOwn(flatConfig(stored.config), key) && result?.sources[key] !== 'Hat override' && <span>Stored override unavailable</span>}</td> })}</tr>)}</tbody></table>}
      <label className="hat-editor-picker">Hat<select value={selectedHat} onChange={event => setSelectedHat(event.target.value)}>{hats.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      {hat && record && <DefaultsEditor key={`${hat.id}:${agent}:${refresh}`} hat={hat} record={record} catalog={catalog} policy={context.policy} onSaved={updated => setRecords(old => ({ ...old, [updated.hat_id]: updated }))} onReload={() => setRefresh(value => value + 1)} />}
    </section>
  </div>
}
