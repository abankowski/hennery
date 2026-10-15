import type { AuthSessionItem, PushPolicyItem, PushPolicyRequest, PushSubscribeRequest, PushSubscriptionItem, SettingsUpdateResponse, VapidKeyResponse } from '../generated/protocol'
import type { Client } from './client'
import { ApiFailure } from './errors'
export const pushDevices = (c: Client): Promise<PushSubscriptionItem[]> => c.request('GET', '/api/push/subscriptions')
export const vapid = (c: Client): Promise<VapidKeyResponse> => c.request('GET', '/api/push/vapid')
export const policies = (c: Client): Promise<PushPolicyItem[]> => c.request('GET', '/api/push/policies')
export const savePolicy = (c: Client, id: string, body: PushPolicyRequest): Promise<PushPolicyItem> => c.request('PUT', `/api/push/policies/${encodeURIComponent(id)}`, body)
export const saveContact = (c: Client, contact: string): Promise<SettingsUpdateResponse> => c.request('PATCH', '/api/settings', { contact })
export const authDevices = (c: Client): Promise<AuthSessionItem[]> => c.request('GET', '/api/auth/sessions')
export const revokeDevice = (c: Client, id: string): Promise<void> => c.request('DELETE', `/api/auth/sessions/${encodeURIComponent(id)}`)
export const subscribeDevice = (c: Client, body: PushSubscribeRequest, beforeSend: () => Promise<void>): Promise<PushSubscriptionItem> => c.request('POST', '/api/push/subscriptions', body, { timeoutMs: 10000, beforeSend })
export async function removePush(c: Client, identity: { id?: string; endpoint?: string }): Promise<void> {
  if (!identity.id && !identity.endpoint) return
  try {
    await c.request('DELETE', identity.id ? `/api/push/subscriptions/${encodeURIComponent(identity.id)}` : '/api/push/subscriptions', identity.id ? undefined : { endpoint: identity.endpoint })
  } catch (err) { if (!(err instanceof ApiFailure && err.status === 404)) throw err }
}
