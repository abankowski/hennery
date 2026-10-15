import { expect, it } from 'vitest'
import { routed, json } from '../test-stream'
import { familyPage, takeOver } from './view'

it('encodes family ids and cursors, and posts explicit empty takeover JSON', async () => {
  const s = routed(c => c.method === 'POST' ? new Response(null, { status: 204 }) : json({}))
  await familyPage(s.client, 'a/b?c', 'child/a&b')
  await takeOver(s.client, 'a/b?c')
  expect(s.calls.map(c => [c.method, c.path])).toEqual([
    ['GET', '/api/view/sessions/a%2Fb%3Fc/family?after=child%2Fa%26b&limit=20'],
    ['POST', '/api/view/sessions/a%2Fb%3Fc/takeover'],
  ])
  expect(s.fetch.mock.calls[1][1]?.body).toBe('{}')
})
