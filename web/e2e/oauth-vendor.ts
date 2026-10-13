import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'

export interface VendorConfig { coop: boolean; deny: boolean; resourcePath: string; issuerPath: string; registration: boolean; s256: boolean; mcpStatus: number | null }
export interface Vendor {
  origin: string; mcpUrl: string; config: VendorConfig; counts: { registrations: number; exchanges: number; refreshes: number; handshakes: number; pathReferrers: number }
  expire(): void; revoke(): void; stop(): Promise<void>
}
/** Loopback only; no files, processes or logging. */
export async function startVendor(): Promise<Vendor> {
  const config: VendorConfig = { coop: false, deny: false, resourcePath: '/mcp', issuerPath: '', registration: true, s256: true, mcpStatus: null }
  const counts = { registrations: 0, exchanges: 0, refreshes: 0, handshakes: 0, pathReferrers: 0 }
  const clients = new Map<string, string | null>([['public', null], ['confidential', 'e2e-vendor-secret-canary']])
  const codes = new Map<string, { client: string; challenge: string; redirect: string }>()
  const access = new Set<string>(), refresh = new Set<string>(), sessions = new Set<string>()
  const issue = () => {
    const token = randomBytes(24).toString('base64url'), renewal = randomBytes(24).toString('base64url')
    access.add(token); refresh.add(renewal)
    return { access_token: token, refresh_token: renewal, token_type: 'Bearer', expires_in: 3600 }
  }
  let origin = ''
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
  const server = createServer(async (request, response) => {
    // Only bounded requests on a private loopback listener. No diagnostics
    // include bodies, codes, tokens, client secrets or consent URLs.
    const json = (status: number, body: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)) }
    try {
      const url = new URL(request.url ?? '/', origin)
      const chunks: Buffer[] = []; let size = 0
      for await (const chunk of request) { size += chunk.length; if (size > 65536) { json(413, {}); return } chunks.push(chunk) }
      const raw = Buffer.concat(chunks).toString('utf8')
      const resource = config.resourcePath.startsWith('https:') ? config.resourcePath : `${origin}${config.resourcePath}`
      const issuer = `${origin}${config.issuerPath}`
      if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
        json(200, { resource, authorization_servers: [issuer], scopes_supported: ['read'] }); return
      }
      if (url.pathname.includes('/.well-known/oauth-authorization-server') || url.pathname.includes('/.well-known/openid-configuration')) {
        json(200, { issuer, authorization_endpoint: `${origin}/authorize`, token_endpoint: `${origin}/token`, ...(config.registration ? { registration_endpoint: `${origin}/register` } : {}), code_challenge_methods_supported: config.s256 ? ['S256'] : [], token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'], authorization_response_iss_parameter_supported: true }); return
      }
      if (url.pathname === '/register' && request.method === 'POST') {
        if (!config.registration) { json(404, {}); return }
        const input = JSON.parse(raw)
        if (input.token_endpoint_auth_method !== 'none') { json(400, { error: 'invalid_client_metadata' }); return }
        counts.registrations++; const id = `registered-${counts.registrations}`; clients.set(id, null)
        json(201, { client_id: id, token_endpoint_auth_method: 'none' }); return
      }
      if (url.pathname === '/authorize') {
        if (request.headers.referer && new URL(request.headers.referer).pathname !== '/') counts.pathReferrers++
        response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', ...(config.coop ? { 'Cross-Origin-Opener-Policy': 'same-origin' } : {}) })
        const query = url.searchParams.toString()
        response.end(`<!doctype html><html><meta name="viewport" content="width=device-width"><h1>Vendor consent</h1><p>Test account</p><a href="/decision?${escape(query)}&choice=allow">Allow</a> <a href="/decision?${escape(query)}&choice=deny">Deny</a></html>`); return
      }
      if (url.pathname === '/decision') {
        const redirect = url.searchParams.get('redirect_uri') ?? ''
        const back = new URL(redirect)
        if (!['localhost', '127.0.0.1', '[::1]'].includes(back.hostname)) { json(400, {}); return }
        back.searchParams.set('state', url.searchParams.get('state') ?? ''); back.searchParams.set('iss', issuer)
        if (config.deny || url.searchParams.get('choice') === 'deny') {
          back.searchParams.set('error', 'access_denied'); back.searchParams.set('error_description', '<script>denied</script>')
        } else {
          const code = randomBytes(24).toString('base64url')
          codes.set(code, { client: url.searchParams.get('client_id') ?? '', challenge: url.searchParams.get('code_challenge') ?? '', redirect })
          back.searchParams.set('code', code)
        }
        response.writeHead(302, { Location: back.href, 'Cache-Control': 'no-store' }); response.end(); return
      }
      if (url.pathname === '/token' && request.method === 'POST') {
        const form = new URLSearchParams(raw)
        let client = form.get('client_id') ?? '', secret: string | null = null
        if (request.headers.authorization?.startsWith('Basic ')) {
          const pair = Buffer.from(request.headers.authorization.slice(6), 'base64').toString('utf8'); const colon = pair.indexOf(':')
          client = decodeURIComponent(pair.slice(0, colon)); secret = decodeURIComponent(pair.slice(colon + 1))
        }
        if (!clients.has(client) || clients.get(client) !== secret) { json(400, { error: 'invalid_client' }); return }
        if (form.get('grant_type') === 'authorization_code') {
          counts.exchanges++; const code = form.get('code') ?? '', held = codes.get(code); codes.delete(code)
          const challenge = createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url')
          if (!held || held.client !== client || held.challenge !== challenge || held.redirect !== form.get('redirect_uri')) { json(400, { error: 'invalid_grant' }); return }
          json(200, issue()); return
        }
        counts.refreshes++; const renewal = form.get('refresh_token') ?? ''
        if (!refresh.delete(renewal)) { json(400, { error: 'invalid_grant' }); return }
        json(200, issue()); return
      }
      if (url.pathname === '/mcp') {
        const bearer = request.headers.authorization?.replace(/^Bearer /, '') ?? ''
        if (!access.has(bearer)) {
          response.writeHead(401, { 'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`, 'Content-Type': 'application/json' }); response.end('{}'); return
        }
        if (config.mcpStatus) { json(config.mcpStatus, { error: 'outage' }); return }
        if (request.method === 'DELETE') { sessions.delete(String(request.headers['mcp-session-id'])); response.writeHead(204); response.end(); return }
        const body = JSON.parse(raw)
        if (body.method === 'initialize') {
          counts.handshakes++; const session = randomBytes(12).toString('hex'); sessions.add(session)
          response.setHeader('Mcp-Session-Id', session)
          json(200, { jsonrpc: '2.0', id: body.id, result: { protocolVersion: body.params.protocolVersion, capabilities: {}, serverInfo: { name: 'loopback-fixture', version: '1' } } }); return
        }
        if (!sessions.has(String(request.headers['mcp-session-id']))) { json(400, {}); return }
        if (body.method === 'notifications/initialized') { response.writeHead(202); response.end(); return }
        json(200, { jsonrpc: '2.0', id: body.id, result: { tools: [] } }); return
      }
      json(404, {})
    } catch { if (!response.headersSent) response.writeHead(400); response.end() }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('no loopback listener')
  origin = `http://127.0.0.1:${address.port}`
  return { origin, mcpUrl: `${origin}/mcp`, config, counts, expire() { access.clear() }, revoke() { access.clear(); refresh.clear() }, stop: () => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close(err => err ? reject(err) : resolve()) }) }
}
