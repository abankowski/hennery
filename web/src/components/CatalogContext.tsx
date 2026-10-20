import { useEffect, useMemo, useState } from 'react'
import { useClient } from '../app-client'
import { executionPolicy, runtimeCatalog } from '../api/delegation'
import { sessionDefaults } from '../api/defaults'
import { messageOf } from '../api/errors'
import type { ExecutionPolicy, HatSessionDefaults, HostCatalog, HostItem } from '../generated/protocol'
import { usableCatalog } from '../lib/defaults'

export interface LaunchContext {
  key: string
  state: 'loading' | 'ready' | 'unavailable'
  catalog: HostCatalog | null
  defaults: HatSessionDefaults | null
  policy?: ExecutionPolicy
  error?: string
}
/** Each response belongs to the whole canonical context, never the last probe. */
export function useLaunchContext(host: string, agent: string, cwd: string, hat: string, generation = 0): LaunchContext {
  const client = useClient(), key = JSON.stringify([host, agent, cwd, hat, generation])
  // A → B → A is a new read, even when B never finished loading.
  const request = useMemo(() => ({}), [key])
  const [result, setResult] = useState<(LaunchContext & { request: object }) | null>(null)
  useEffect(() => {
    if (!host || !agent || !cwd || !hat) return
    const abort = new AbortController()
    let live = true
    Promise.all([runtimeCatalog(client, host, agent, cwd, abort.signal), sessionDefaults(client, hat, agent, abort.signal), executionPolicy(client, hat)]).then(
      ([catalog, defaults, policy]) => { if (live) setResult({ key, request, state: usableCatalog(catalog) ? 'ready' : 'unavailable', catalog, defaults, policy, ...(!usableCatalog(catalog) ? { error: 'This host did not provide a fresh, complete settings preview. Retry or deliberately use agent defaults for this start.' } : {}) }) },
      err => { if (live) setResult({ key, request, state: 'unavailable', catalog: null, defaults: null, error: messageOf(err) }) },
    )
    return () => { live = false; abort.abort() }
  }, [client, host, agent, cwd, hat, key, request])
  return result?.request === request ? result : { key, state: 'loading', catalog: null, defaults: null }
}
export default function CatalogContext({ hosts, host, cwd, onHost, onCwd, onPreview, busy }: {
  hosts: HostItem[]; host: string; cwd: string; onHost: (value: string) => void; onCwd: (value: string) => void; onPreview: () => void; busy: boolean
}) {
  return <section className="catalog-context" aria-label="Settings preview context"><div><h2>Preview on a host</h2><p className="hint">Agent defaults are read-only. A hat’s saved choices can differ on another host.</p></div>
    <label>Host<select value={host} onChange={e => onHost(e.target.value)}><option value="">Choose a host</option>{hosts.map(h => <option key={h.host_id} value={h.host_id} disabled={!h.connected}>{h.name}{!h.connected ? ' · offline' : ''}</option>)}</select></label>
    <label>Project path<input value={cwd} onChange={e => onCwd(e.target.value)} placeholder="Absolute project path" /></label>
    <button className="btn btn-secondary" type="button" disabled={busy || !host || !cwd.trim()} onClick={onPreview}>{busy ? 'Loading preview…' : 'Preview settings'}</button>
  </section>
}
