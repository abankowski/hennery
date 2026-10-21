import type { Client } from '../api/client'
import { runtimeCatalog } from '../api/delegation'
import { hosts } from '../api/manage'
import type { HostProjects } from '../generated/protocol'
import { allCatalogGrants } from './delegationPolicy'

/** Read each online host's reported runtimes in its home directory. A failed
 *  or stale catalog never becomes a successful, incomplete ON operation. */
export async function currentDelegationGrants(client: Client) {
  const online = (await hosts(client)).filter(host => host.connected && !host.revoked_at)
  const catalogs = await Promise.all(online.map(async host => {
    const runtimes = Object.keys(host.mcp_delivery ?? {})
    if (runtimes.length === 0) throw new Error('A connected host has not reported its runtimes. Reconnect it before enabling Delegation.')
    const projects = await client.request<HostProjects>('GET', `/api/hosts/${encodeURIComponent(host.host_id)}/projects`)
    const cwd = projects.home ?? host.workspace_roots[0]
    if (!cwd) throw new Error('A connected host has not reported a home or workspace directory.')
    return Promise.all(runtimes.map(async agent => {
      const catalog = await runtimeCatalog(client, host.host_id, agent, cwd)
      if (catalog.agent !== agent || catalog.freshness !== 'fresh') throw new Error('Runtime choices are not current. Reconnect the host and try again.')
      return catalog
    }))
  }))
  if (catalogs.flat().length === 0) throw new Error('Connect a host before enabling Delegation.')
  return allCatalogGrants(catalogs.flat())
}
