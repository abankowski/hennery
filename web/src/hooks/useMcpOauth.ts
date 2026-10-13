import type { McpConnectionItem } from '../generated/protocol'
export interface OauthState { phase: 'idle' | 'authorizing' | 'waiting' | 'confirm' | 'connected' | 'failed' | 'unconfirmed'; link?: string; error?: string; code?: string }
export function useMcpOauth(_item: McpConnectionItem, _refresh: () => Promise<McpConnectionItem[]>, _waiting?: (id: string, active: boolean) => void) {
  return { state: { phase: 'idle' } as OauthState, connect: (_resource?: string) => {}, cancel: () => {} }
}
