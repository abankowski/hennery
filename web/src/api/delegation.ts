// Shared facade owned by R2; R4/R5 consume it without duplicating wire types.
import type { HatSessionTools, HostCatalog, SetSessionTools } from '../generated/protocol'
import type { Client, RequestOptions } from './client'
const hatPath = (hat: string) => `/api/hats/${encodeURIComponent(hat)}`
export function sessionTools(client: Client, hat: string): Promise<HatSessionTools> {
  return client.request('GET', `${hatPath(hat)}/session-tools`)
}
export function setSessionTools(client: Client, hat: string, value: SetSessionTools, options?: RequestOptions): Promise<HatSessionTools> {
  return client.request('PATCH', `${hatPath(hat)}/session-tools`, value, options)
}
export function runtimeCatalog(client: Client, host: string, agent: string, cwd: string, signal?: AbortSignal): Promise<HostCatalog> {
  const query = new URLSearchParams({ agent, cwd })
  return client.request('GET', `/api/hosts/${encodeURIComponent(host)}/runtime-catalog?${query}`, undefined, { signal })
}
