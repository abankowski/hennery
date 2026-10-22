// Shared facade owned by R2; R4/R5 consume it without duplicating wire types.
import type { HatSessionTools, HostCatalog, SetSessionTools, OperatorDelegationLimits, PatchDelegationLimits } from '../generated/protocol'
import type { Client, RequestOptions } from './client'
const hatPath = (hat: string) => `/api/hats/${encodeURIComponent(hat)}`
export function delegationLimits(client: Client): Promise<OperatorDelegationLimits> {
  return client.request('GET', '/api/settings/delegation-limits')
}
export function setDelegationLimits(client: Client, value: PatchDelegationLimits, options?: RequestOptions): Promise<OperatorDelegationLimits> {
  return client.request('PATCH', '/api/settings/delegation-limits', value, options)
}
export function sessionTools(client: Client, hat: string): Promise<HatSessionTools> {
  return client.request('GET', `${hatPath(hat)}/session-tools`)
}
export function setSessionTools(client: Client, hat: string, value: SetSessionTools, options?: RequestOptions): Promise<HatSessionTools> {
  return client.request('PATCH', `${hatPath(hat)}/session-tools`, value, options)
}
export function runtimeCatalog(client: Client, host: string, agent: string, cwd: string, signal?: AbortSignal, refresh = false): Promise<HostCatalog> {
  const query = new URLSearchParams({ agent, cwd })
  return client.request(refresh ? 'POST' : 'GET', `/api/hosts/${encodeURIComponent(host)}/runtime-catalog?${query}`, undefined, { signal })
}
