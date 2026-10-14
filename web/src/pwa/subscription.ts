import type { PushSubscribeRequest } from '../generated/protocol'

export function subscriptionBody(subscription: PushSubscription, label?: string): PushSubscribeRequest {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Browser subscription has no encryption keys.')
  return { endpoint: json.endpoint, expirationTime: json.expirationTime, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, ...(label ? { device_label: label } : {}) }
}
export function vapidBytes(key: string): Uint8Array<ArrayBuffer> {
  const binary = atob(key.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('Collector VAPID key is invalid.')
  return bytes
}
export function matchesKey(subscription: PushSubscription, key: string): boolean {
  const actual = subscription.options.applicationServerKey
  const expected = vapidBytes(key)
  return !!actual && actual.byteLength === expected.length && new Uint8Array(actual).every((b, i) => b === expected[i])
}
