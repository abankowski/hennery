import type { Client } from './client'
import type { HatSessionDefaults, PutHatSessionDefaults } from '../generated/protocol'
const path = (hat: string, agent: string) => `/api/hats/${encodeURIComponent(hat)}/session-defaults?${new URLSearchParams({ agent })}`
export function sessionDefaults(client: Client, hat: string, agent: string, signal?: AbortSignal): Promise<HatSessionDefaults> {
  return client.request('GET', path(hat, agent), undefined, { signal })
}
export function putSessionDefaults(client: Client, hat: string, agent: string, value: PutHatSessionDefaults): Promise<HatSessionDefaults> {
  return client.request('PUT', path(hat, agent), value)
}
