// D3b's existing operator-only wire contract. A question can only be
// resolved through its canonical card; null means a status-only record.
import type { Client } from './client'

export interface OperatorAttention {
  id: string
  child_id: string
  hat_id: string
  reason: string
  pending_id: string | null
}

export async function attentionPage(client: Client, hat: string, after?: string): Promise<OperatorAttention[]> {
  const query = new URLSearchParams({ hat_id: hat })
  if (after !== undefined) query.set('after', after)
  const value = await client.request<unknown>('GET', `/api/delegation/attention?${query}`)
  if (!Array.isArray(value) || value.length > 100 || !value.every(isAttention)) throw new Error('Invalid delegation attention response.')
  return value
}

function isAttention(value: unknown): value is OperatorAttention {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && row.id.length > 0 &&
    typeof row.child_id === 'string' && row.child_id.length > 0 &&
    typeof row.hat_id === 'string' && row.hat_id.length > 0 &&
    typeof row.reason === 'string' && (row.pending_id === null || typeof row.pending_id === 'string')
}

export function acknowledgeAttention(client: Client, id: string): Promise<void> {
  return client.request<void>('POST', `/api/delegation/attention/${encodeURIComponent(id)}/acknowledge`, {})
}
