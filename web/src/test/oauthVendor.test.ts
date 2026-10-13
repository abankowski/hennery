// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { startVendor } from '../../e2e/oauth-vendor'
import { createHash } from 'node:crypto'
import { Server } from 'node:http'
import { createConnection } from 'node:net'
it('serves loopback OAuth metadata and a stateful MCP discovery challenge', async () => {
  const vendor = await startVendor()
  try {
    const metadata = await fetch(`${vendor.origin}/.well-known/oauth-authorization-server`)
    expect(metadata.status).toBe(200)
    expect(await metadata.json()).toMatchObject({ issuer: vendor.origin, code_challenge_methods_supported: ['S256'] })
    const challenge = await fetch(vendor.mcpUrl, { method: 'POST', body: '{}' })
    expect(challenge.status).toBe(401); expect(challenge.headers.get('www-authenticate')).toContain('resource_metadata=')
  } finally { await vendor.stop() }
})
it('requires exact PKCE/client/redirect, consumes codes, rotates refresh and maintains MCP sessions', async () => {
  const vendor = await startVendor()
  try {
    const verifier = 'test-verifier', redirect = 'http://127.0.0.1:12345/callback'
    const client = await (await fetch(vendor.origin + '/register', { method: 'POST', body: JSON.stringify({ token_endpoint_auth_method: 'none' }) })).json() as { client_id: string }
    expect(vendor.counts.registrations).toBe(1)
    const code = async () => {
      const query = new URLSearchParams({ redirect_uri: redirect, state: 'state', client_id: client.client_id, code_challenge: createHash('sha256').update(verifier).digest('base64url'), choice: 'allow' })
      const answer = await fetch(vendor.origin + '/decision?' + query, { redirect: 'manual' })
      const back = new URL(answer.headers.get('location')!)
      expect(back.searchParams.get('state')).toBe('state'); expect(back.searchParams.get('iss')).toBe(vendor.origin)
      return back.searchParams.get('code')!
    }
    const exchange = (held: string, change: Record<string, string> = {}) => fetch(vendor.origin + '/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client.client_id, code: held, code_verifier: verifier, redirect_uri: redirect, ...change }) })
    const bad = await code(); expect((await exchange(bad, { code_verifier: 'wrong' })).status).toBe(400); expect((await exchange(bad)).status).toBe(400)
    expect((await exchange(await code(), { redirect_uri: 'http://127.0.0.1:12345/other' })).status).toBe(400)
    expect((await exchange(await code(), { client_id: 'public' })).status).toBe(400)
    const held = await code(), answer = await exchange(held); expect(answer.status).toBe(200)
    const grant = await answer.json() as { access_token: string; refresh_token: string }
    expect((await exchange(held)).status).toBe(400)
    const headers: Record<string, string> = { Authorization: 'Bearer ' + grant.access_token }
    const rpc = (body: unknown) => fetch(vendor.mcpUrl, { method: 'POST', headers, body: JSON.stringify(body) })
    const initialize = await rpc({ id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })
    expect(initialize.status).toBe(200); expect(vendor.counts.handshakes).toBe(1)
    headers['Mcp-Session-Id'] = initialize.headers.get('mcp-session-id')!
    expect((await rpc({ method: 'notifications/initialized' })).status).toBe(202)
    expect((await rpc({ id: 2, method: 'tools/list' })).status).toBe(200)
    vendor.config.mcpStatus = 503; expect((await rpc({ id: 2, method: 'tools/list' })).status).toBe(503); vendor.config.mcpStatus = null
    expect((await fetch(vendor.mcpUrl, { method: 'DELETE', headers })).status).toBe(204)
    expect((await rpc({ id: 3, method: 'tools/list' })).status).toBe(400)
    vendor.expire(); expect((await rpc({ id: 4, method: 'tools/list' })).status).toBe(401)
    const renew = () => fetch(vendor.origin + '/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: client.client_id, refresh_token: grant.refresh_token }) })
    expect((await renew()).status).toBe(200); expect((await renew()).status).toBe(400); expect(vendor.counts.refreshes).toBe(2)
    const latest = await (await exchange(await code())).json() as { refresh_token: string }
    vendor.revoke()
    expect((await fetch(vendor.origin + '/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: client.client_id, refresh_token: latest.refresh_token }) })).status).toBe(400)
    expect(vendor.counts.exchanges).toBe(7)
  } finally { await vendor.stop() }
})
it('binds to the fixture loopback address and closes held sockets on stop', async () => {
  const listen = vi.spyOn(Server.prototype, 'listen')
  const vendor = await startVendor()
  const socket = createConnection({ host: '127.0.0.1', port: Number(new URL(vendor.origin).port) })
  let stopped: Promise<void> | undefined
  try {
    expect(listen).toHaveBeenCalledWith(0, '127.0.0.1', expect.any(Function))
    await new Promise<void>((ok, no) => { socket.once('connect', ok); socket.once('error', no) })
    const server = listen.mock.contexts[0] as Server
    const started = new Promise<void>(ok => server.once('request', () => ok()))
    socket.write('POST /register HTTP/1.1\r\nHost: loopback\r\nContent-Length: 100\r\n\r\nx')
    await started
    let closed = false; socket.on('close', () => { closed = true })
    stopped = vendor.stop()
    await vi.waitFor(() => expect(closed).toBe(true), { timeout: 1500 })
    await stopped
  } finally { socket.destroy(); await (stopped ?? vendor.stop()); listen.mockRestore() }
})
it('supports denial and metadata/COOP switches, refuses foreign returns and wrong client secrets', async () => {
  const vendor = await startVendor()
  try {
    vendor.config.coop = true; vendor.config.registration = false; vendor.config.s256 = false
    const consent = await fetch(vendor.origin + '/authorize?state=s', { headers: { Referer: 'http://localhost:1234/mcp' } })
    expect(consent.headers.get('cross-origin-opener-policy')).toBe('same-origin'); expect(vendor.counts.pathReferrers).toBe(1)
    const metadata = await (await fetch(vendor.origin + '/.well-known/oauth-authorization-server')).json() as { registration_endpoint?: string; code_challenge_methods_supported: string[] }
    expect(metadata.registration_endpoint).toBeUndefined(); expect(metadata.code_challenge_methods_supported).toEqual([])
    expect((await fetch(vendor.origin + '/register', { method: 'POST', body: '{}' })).status).toBe(404)
    expect((await fetch(vendor.origin + '/decision?redirect_uri=https%3A%2F%2Fforeign.example%2Fcallback', { redirect: 'manual' })).status).toBe(400)
    vendor.config.deny = true
    const denied = await fetch(vendor.origin + '/decision?redirect_uri=http%3A%2F%2Flocalhost%3A1234%2Fcallback&choice=allow', { redirect: 'manual' })
    expect(new URL(denied.headers.get('location')!).searchParams.get('error')).toBe('access_denied')
    const refusedClient = await fetch(vendor.origin + '/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from('confidential:wrong').toString('base64') }, body: 'grant_type=authorization_code' })
    expect(refusedClient.status).toBe(400); expect(await refusedClient.json()).toEqual({ error: 'invalid_client' })
    expect((await fetch(vendor.origin + '/missing')).status).toBe(404)
    expect((await fetch(vendor.origin + '/register', { method: 'POST', body: 'x'.repeat(65537) })).status).toBe(413)
  } finally { await vendor.stop() }
})
