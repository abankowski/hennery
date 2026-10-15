import { expect, it } from 'vitest'
import { routed, json } from '../test-stream'
import { attentionPage, acknowledgeAttention } from './attention'

const row = { id: 'a1', child_id: 'child', hat_id: 'hat', reason: 'child_failed', pending_id: null }
it('encodes the attention hat, opaque cursor and acknowledgement id, preserving explicit question nullability', async () => {
  const rows = [row, { ...row, id: 'q1', pending_id: 'question' }]
  const s = routed(c => c.method === 'POST' ? new Response(null, { status: 204 }) : json(rows))
  expect(await attentionPage(s.client, 'hat/?&', 'opaque/a&b')).toEqual(rows)
  await acknowledgeAttention(s.client, 'attention/a?b')
  expect(s.calls.map(c => [c.method, c.path])).toEqual([
    ['GET', '/api/delegation/attention?hat_id=hat%2F%3F%26&after=opaque%2Fa%26b'],
    ['POST', '/api/delegation/attention/attention%2Fa%3Fb/acknowledge'],
  ])
  expect(s.fetch.mock.calls[1][1]?.body).toBe('{}')
})

it.each([{}, [null], [{ ...row, pending_id: undefined }], [{ ...row, hat_id: 4 }], Array(101).fill(row)])('refuses malformed or unbounded attention response %j', async body => {
  const s = routed(() => json(body))
  await expect(attentionPage(s.client, 'hat')).rejects.toThrow('Invalid delegation attention response.')
})
