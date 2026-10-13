import { expect, it, vi } from 'vitest'
import { Client } from './client'
import * as mcp from './mcp'
import { json, stubServer } from '../test-server'
import { connection } from '../test-fixtures'

it('OAuth wrappers and explicit confirmation are available', () => {
  for (const name of ['oauthRedirect', 'setOauthClient', 'authorize', 'probe']) expect((mcp as unknown as Record<string, unknown>)[name]).toBeTypeOf('function')
})
it('carries the collector Date header as separate authorize metadata', async () => {
  const server = stubServer({ 'POST /api/mcp/connections/id/authorize': json(200, { consent_url: 'https://vendor.example/authorize', expires_at: '2026-10-13T10:15:00Z' }, { Date: 'Tue, 13 Oct 2026 10:00:00 GMT' }) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  await expect(mcp.authorize(client, 'id')).resolves.toMatchObject({ serverTime: Date.parse('2026-10-13T10:00:00Z') })
})
it('confirms without sending a request and coalesces with normal step-up', async () => {
  let release!: () => void
  const stepUp = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
  const server = stubServer({ 'POST /x': [json(403, { code: 'step_up_required' }), json(200, {})] })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const normal = client.request('POST', '/x', {})
  await vi.waitFor(() => expect(stepUp).toHaveBeenCalledTimes(1))
  const first = client.confirm()
  const second = client.confirm()
  release(); await Promise.all([first, second, normal])
  expect(stepUp).toHaveBeenCalledTimes(1)
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
  await expect(api.oauthRedirect(client)).resolves.toEqual({ redirect_uri: 'https://hennery.example/api/mcp/oauth/callback' })
  await expect(api.setOauthClient(client, 'a/b', { client_id: 'id', client_secret: null })).resolves.toEqual(connection())
  await expect(api.authorize(client, 'a/b')).rejects.toMatchObject({ code: 'step_up_required' })
  await expect(api.probe(client, 'a/b')).resolves.toEqual(connection())
  expect(stepUp).not.toHaveBeenCalled()
  expect(server.sent.map(s => s.body)).toEqual([undefined, { client_id: 'id', client_secret: null }, {}, {}])
})

it.each([undefined, 'bad'])('ignores unusable server Date %s and forwards the attempt signal', async date => {
  const fetch = vi.fn(async () => json(200, { consent_url: 'https://vendor.example/authorize', expires_at: 'bad' }, date ? { Date: date } : {}))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const signal = new AbortController().signal
  expect((await mcp.authorize(client, 'id', {}, signal)).serverTime).toBeUndefined()
  expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBe(signal)
})
it('metadata observes only the final response after normal step-up', async () => {
  const server = stubServer({ 'POST /x': [json(403, { code: 'step_up_required' }), json(200, { answer: true })] })
  const metadata = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  await client.request('POST', '/x', {}, { onResponse: metadata })
  expect(metadata).toHaveBeenCalledTimes(1); expect(metadata.mock.calls[0][0].status).toBe(200)
})
it('a rejected confirmation can be requested again without sending anything', async () => {
  const fetch = vi.fn(); const stepUp = vi.fn().mockRejectedValueOnce(new Error('cancelled')).mockResolvedValueOnce(undefined)
  const client = new Client({ fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  await expect(client.confirm()).rejects.toThrow('cancelled'); await client.confirm()
  expect(stepUp).toHaveBeenCalledTimes(2); expect(fetch).not.toHaveBeenCalled()
})
