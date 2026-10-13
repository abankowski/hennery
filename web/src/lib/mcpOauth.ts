import type { McpConnectionItem, McpOauthClientRequest } from '../generated/protocol'
/** A local wait bound, not authorization validity. No client clock enters
 *  the duration; without a collector Date header use its 15-minute TTL.
 *  Even an elapsed/unreadable stamp permits navigation: the server expires flows. */
export function consentTimeout(expiresAt: string, serverTime?: number): number {
  const duration = Date.parse(expiresAt) - (serverTime ?? Number.NaN)
  return Number.isFinite(duration) ? Math.max(1000, Math.min(900000, duration)) : 900000
}

/** Mirrors the kernel's OAuth scheme rule, with no userinfo. URL parses
 *  escaped/numeric hosts before the loopback check; suffixes are not trusted. */
export function consentUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    const loopback = host === 'localhost' || host === '[::1]' || /^127\.\d+\.\d+\.\d+$/.test(host)
    return url.protocol === 'https:' || (url.protocol === 'http:' && loopback) ? url.href : null
  } catch { return null }
}

/** A channel is same-origin, but still check the envelope; its outcome is
 *  never a status update. Nothing is received through window.opener. */
export function oauthHint(event: MessageEvent, origin: string, id: string): boolean {
  if (event.origin !== origin || !event.data || typeof event.data !== 'object') return false
  const d = event.data as Record<string, unknown>
  return d.type === 'done' && d.connection_id === id &&
    (d.outcome === 'connected' || d.outcome === 'failed') && typeof d.result === 'string' && d.result.length <= 128
}

/** An observed report change cannot identify the flow that caused it. */
export function completion(before: McpConnectionItem, after: McpConnectionItem | undefined): 'working' | 'failed' | 'pending' | 'removed' {
  if (!after) return 'removed'
  if (after.oauth_error && JSON.stringify(after.oauth_error) !== JSON.stringify(before.oauth_error)) return 'failed'
  if (after.status === 'ok' && Date.parse(after.status_at) > Date.parse(before.status_at)) return 'working'
  return 'pending'
}

export function clientRequest(stored: string | undefined, id: string, mode: 'keep' | 'public' | 'replace', secret: string): McpOauthClientRequest | null {
  if (!id || (mode === 'keep' && id !== stored) || (mode === 'replace' && !secret)) return null
  return { client_id: id, ...(mode === 'public' ? { client_secret: null } : mode === 'replace' ? { client_secret: secret } : {}) }
}

export function oauthAction(item: McpConnectionItem): 'connect' | 'reconnect' | 'client' | 'probe' | 'none' {
  if (item.cred_kind !== 'oauth_dcr' && item.cred_kind !== 'oauth_client') return 'none'
  if (item.status === 'error') return 'probe'
  if (item.cred_kind === 'oauth_client' && !item.oauth?.client_id) return 'client'
  return item.has_credential ? 'reconnect' : 'connect'
}

/** Code only: vendor text never selects a recovery action. */
export function oauthGuidance(code: string): string {
  const words: Record<string, string> = {
    issuer_changed: 'The authorization server changed. Review and save the vendor client again before connecting.',
    resource_mismatch: 'Compare the server URL with the advertised resource before accepting it.',
    resource_foreign: 'The advertised resource cannot be accepted. Check the server URL.',
    no_oauth_client: 'Save the client registered at the vendor first.',
    no_registration_endpoint: 'This vendor does not offer automatic registration. Edit the connection to use a pre-registered client.',
    too_many_flows: 'Sixteen sign-ins are in progress. Wait for one to finish or expire.',
    pkce_unsupported: 'This vendor does not advertise the required PKCE S256 protection.',
    insecure_metadata: 'OAuth addresses must use https (or http to this machine).',
    egress_refused: 'The address was refused by the gateway network policy. Review the connection and its network setting.',
    upstream_unreachable: 'The authorization server could not be reached. Try again when it is available.',
    wrong_cred_kind: 'This operation does not match the connection’s authentication method.',
    no_credential: 'Save a token or connect before probing this connection.',
  }
  return Object.hasOwn(words, code) ? words[code] : ''
}
