import type { McpConnectionItem, McpOauthClientRequest } from '../generated/protocol'

export function consentUrl(_input: string): string | null { return null }
export function oauthHint(_event: MessageEvent, _origin: string, _id: string): boolean { return false }
export function completion(_before: McpConnectionItem, _after: McpConnectionItem | undefined): 'connected' | 'failed' | 'pending' | 'removed' { return 'pending' }
export function clientRequest(_stored: string | undefined, _id: string, _mode: 'keep' | 'public' | 'replace', _secret: string): McpOauthClientRequest | null { return null }
export function oauthAction(_item: McpConnectionItem): 'connect' | 'reconnect' | 'client' | 'probe' | 'none' { return 'none' }
export function oauthGuidance(_code: string): string { return '' }
