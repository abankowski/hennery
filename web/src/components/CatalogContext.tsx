import { useEffect, useMemo, useState } from 'react'
import { useClient } from '../app-client'
import { runtimeCatalog } from '../api/delegation'
import { sessionDefaults } from '../api/defaults'
import { catalogError } from '../api/errors'
import type { HatSessionDefaults, HostCatalog, HostItem } from '../generated/protocol'
import { usableCatalog } from '../lib/defaults'

export interface LaunchContext {
  key: string
  state: 'loading' | 'ready' | 'unavailable'
  catalog: HostCatalog | null
  defaults: HatSessionDefaults | null
  error?: string
  refresh?: () => void
  refreshing?: boolean
}
/** Each response belongs to the whole canonical context, never the last probe. */
export function useLaunchContext(host: string, agent: string, cwd: string, hat: string, generation = 0, hostName = host): LaunchContext {
  const client = useClient(), key = JSON.stringify([host, agent, cwd, hat, generation, hostName])
  // A → B → A is a new read, even when B never finished loading.
  const request = useMemo(() => ({}), [key])
  const [result, setResult] = useState<(Omit<LaunchContext, 'defaults'> & { request: object; serial: number }) | null>(null)
  const [saved, setSaved] = useState<{ request: object; defaults: HatSessionDefaults } | null>(null)
  const [refreshRequest, setRefreshRequest] = useState<{ request: object; serial: number } | null>(null)
  const serial = refreshRequest?.request === request ? refreshRequest.serial : 0
  const refresh = () => setRefreshRequest(previous => ({ request, serial: previous?.request === request ? previous.serial + 1 : 1 }))
  const complete = !!host && !!agent && !!cwd && !!hat
  useEffect(() => {
    if (!complete) return
    const abort = new AbortController()
    let live = true
    sessionDefaults(client, hat, agent, abort.signal).then(defaults => { if (live) setSaved({ request, defaults }) }, () => { /* Start retries this required read and reports any failure. */ })
    return () => { live = false; abort.abort() }
  }, [client, hat, agent, request, complete])
  useEffect(() => {
    if (!host || !agent || !cwd || !hat) return
    const abort = new AbortController()
    let live = true
    runtimeCatalog(client, host, agent, cwd, abort.signal, serial > 0).then(
      catalog => { if (live) setResult({ key, request, serial, state: catalog.freshness === 'unknown' || usableCatalog(catalog) ? 'ready' : 'unavailable', catalog: usableCatalog(catalog) ? catalog : null }) },
      err => { if (live) setResult(previous => ({ key, request, serial, state: previous?.request === request && previous.catalog ? 'ready' : 'unavailable', catalog: previous?.request === request ? previous.catalog : null, error: catalogError(err, hostName, agent) })) },
    )
    return () => { live = false; abort.abort() }
  }, [client, host, hostName, agent, cwd, hat, key, request, serial])
  return { ...(result?.request === request ? result : { key, state: 'loading' as const, catalog: null }), defaults: saved?.request === request ? saved.defaults : null, refresh: complete ? refresh : undefined, refreshing: complete && serial > 0 && (result?.request !== request || result.serial !== serial) }
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
