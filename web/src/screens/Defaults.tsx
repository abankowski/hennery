import '../styles/launch.css'
import { useEffect, useId, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { sessionDefaults } from '../api/defaults'
import { messageOf } from '../api/errors'
import CatalogContext, { useLaunchContext } from '../components/CatalogContext'
import DefaultsEditor from '../components/DefaultsEditor'
import DefaultsMatrix from '../components/DefaultsMatrix'
import { catalogAge } from '../components/LaunchConfig'
import type { HatItem, HatResolution, HatSessionDefaults, HostItem, HostProjects } from '../generated/protocol'
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
  const context = useLaunchContext(preview?.host ?? '', agent, preview?.cwd ?? '', preview?.hat ?? '', 0, hosts.find(h => h.host_id === preview?.host)?.name ?? preview?.host)
  const catalog = context.state === 'ready' ? context.catalog : null
  useRegisterContext({ hostId: host, cwd: preview?.cwd, hatId: selectedHat })
  useEffect(() => {
    let live = true
    Promise.all([client.request<HostItem[]>('GET', '/api/hosts'), client.request<HatItem[]>('GET', '/api/hats')]).then(([allHosts, allHats]) => {
      if (!live) return
      setHosts(allHosts.filter(h => h.revoked_at == null)); setHats(allHats)
      setHost(current => current || allHosts.find(h => h.revoked_at == null && h.connected)?.host_id || '')
      setSelectedHat(current => current || allHats[0]?.id || '')
    }, err => live && setError(messageOf(err)))
    return () => { live = false }
  }, [client])
  const ids = [...new Set([...Object.keys(hosts.find(h => h.host_id === host)?.mcp_delivery ?? {}), ...(query.get('agent') ? [query.get('agent')!] : [])])]
  const agents = ids.length ? [...new Set([...ids, ...(manualAgent && agent ? [agent] : [])])] : ['claude', 'codex', ...(manualAgent && agent ? [agent] : [])]
  useEffect(() => { if (!manualAgent && !agent && agents.length) setAgent(current => current || agents[0]) }, [agents.join('\0'), agent, manualAgent])
  useEffect(() => {
    if (!host || cwd) return
    let live = true
    const fallback = hosts.find(h => h.host_id === host)?.workspace_roots?.[0] || '/'
    client.request<HostProjects>('GET', `/api/hosts/${encodeURIComponent(host)}/projects`).then(projects => { if (live) setCwd(current => current || projects.home || fallback) }, () => { if (live) setCwd(current => current || fallback) })
    return () => { live = false }
  }, [client, host, cwd, hosts])
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
  useEffect(() => {
    if (!host || !cwd.trim()) return
    const timer = window.setTimeout(() => void loadPreview(), 300)
    return () => window.clearTimeout(timer)
  }, [host, cwd])
  const currentRecords = loadedKey === recordsKey ? records : {}
  const hat = hats.find(h => h.id === selectedHat), record = currentRecords[selectedHat]
  const saved = (updated: HatSessionDefaults) => setRecords(old => ({ ...old, [updated.hat_id]: updated }))
  return <div className="defaults-screen"><header><div><h1>Defaults</h1><p>What a new session starts with</p></div>{query.get('return') === 'new' && <Link to="/new?restore=1">Back to new session</Link>}</header>
    <div className="agent-tabs" role="tablist" aria-label="Agent defaults">{agents.map((id, index) => <button role="tab" type="button" key={id} id={`${tabBase}-${index}`} aria-selected={agent === id} aria-controls={`${tabBase}-panel`} tabIndex={agent === id ? 0 : -1} onClick={() => setAgent(id)} onKeyDown={event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? agents.length - 1 : event.key === 'ArrowRight' ? (index + 1) % agents.length : event.key === 'ArrowLeft' ? (index + agents.length - 1) % agents.length : -1
      if (next >= 0) { event.preventDefault(); setAgent(agents[next]); document.getElementById(`${tabBase}-${next}`)?.focus() }
    }}>{agentLabel(id)}</button>)}</div>
    <div className="defaults-order"><span>1 · Agent default</span><span>2 · Hat override</span><span>3 · Your pick in New session</span><p>Later wins. A hat cell left on inherits follows the agent default when it changes.</p></div>
    <details className="catalog-options" open={!host}><summary>Preview host and project</summary><CatalogContext hosts={hosts} host={host} cwd={cwd} onHost={value => { generation.current++; setHost(value); setManualAgent(false); setAgent(''); setPreview(null); setCwd(''); setProbing(false) }} onCwd={value => { generation.current++; setCwd(value); setPreview(null); setProbing(false) }} onPreview={() => void loadPreview()} busy={probing} /></details>
    <details className="runtime-id"><summary>Other agent</summary><label>Configured agent name<input value={agent} onChange={event => { setManualAgent(true); setAgent(event.target.value) }} placeholder="Agent name on the host" /></label></details>
    {preview && <p className="defaults-context-note" role="status">Preview: <bdi>{hosts.find(h => h.host_id === preview.host)?.name}</bdi> · <bdi>{preview.cwd}</bdi> · Resolves to <bdi>{hats.find(h => h.id === preview.hat)?.name}</bdi> · {catalogAge(context.catalog?.saved_at) || (catalog ? 'Up to date' : 'Agent defaults')} <button className="btn btn-secondary" type="button" onClick={context.refresh}>Refresh</button></p>}
    {preview && context.state === 'unavailable' && <p role="alert">The settings preview is unavailable. <bdi>{context.error}</bdi> Existing overrides can still be inspected and reset. <button className="btn btn-secondary" type="button" onClick={() => void loadPreview()}>Retry preview</button></p>}
    {error && <p role="alert"><bdi>{error}</bdi><button className="btn btn-secondary" type="button" onClick={() => setRefresh(value => value + 1)}>Retry defaults</button></p>}
    <section id={`${tabBase}-panel`} role="tabpanel" aria-labelledby={agents.includes(agent) ? `${tabBase}-${agents.indexOf(agent)}` : undefined}>
      {loading && <p role="status">Loading saved defaults…</p>}
      <DefaultsMatrix key={agent} hats={hats} records={currentRecords} catalog={catalog} onSaved={saved} />
      <details className="defaults-advanced" open={!catalog}><summary>Advanced editor</summary><label className="hat-editor-picker">Hat<select value={selectedHat} onChange={event => setSelectedHat(event.target.value)}>{hats.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      {hat && record && <DefaultsEditor key={`${hat.id}:${agent}:${refresh}`} hat={hat} record={record} catalog={catalog} onSaved={saved} onReload={() => setRefresh(value => value + 1)} />}</details>
    </section>
  </div>
}
