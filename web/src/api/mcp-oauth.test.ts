import { expect, it, vi } from 'vitest'
import { Client } from './client'
import * as mcp from './mcp'
import { json, stubServer } from '../test-server'
import { connection } from '../test-fixtures'

it('OAuth wrappers and explicit confirmation are available', () => {
  for (const name of ['oauthRedirect', 'setOauthClient', 'authorize', 'probe']) expect((mcp as unknown as Record<string, unknown>)[name]).toBeTypeOf('function')
})
it('confirms without sending a request and coalesces with normal step-up', async () => {
  let release!: () => void
  const stepUp = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
  const server = stubServer({ 'POST /x': [json(403, { code: 'step_up_required' }), json(200, {})] })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const first = client.confirm()
  const second = client.confirm()
  const normal = client.request('POST', '/x', {})
  await vi.waitFor(() => expect(stepUp).toHaveBeenCalledTimes(1))
  release(); await Promise.all([first, second, normal])
  expect(server.sent).toHaveLength(2)
})
it('uses typed paths, bodies, cookie and required empty objects, without auto-retrying authorize', async () => {
  const server = stubServer({
    'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback' }),
    'PUT /api/mcp/connections/a%2Fb/oauth-client': json(200, connection()),
    'POST /api/mcp/connections/a%2Fb/authorize': json(403, { code: 'step_up_required' }),
    'POST /api/mcp/connections/a%2Fb/probe': json(200, connection()),
  })
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const api = mcp as unknown as {
    oauthRedirect: (c: Client) => Promise<unknown>; setOauthClient: (c: Client, id: string, body: object) => Promise<unknown>
    authorize: (c: Client, id: string, body?: object) => Promise<unknown>; probe: (c: Client, id: string) => Promise<unknown>
  }
  await api.oauthRedirect(client); await api.setOauthClient(client, 'a/b', { client_id: 'id', client_secret: null })
  await expect(api.authorize(client, 'a/b')).rejects.toMatchObject({ code: 'step_up_required' })
  await api.probe(client, 'a/b')
  expect(stepUp).not.toHaveBeenCalled()
  expect(server.sent.map(s => s.body)).toEqual([undefined, { client_id: 'id', client_secret: null }, {}, {}])
})
