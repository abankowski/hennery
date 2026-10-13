// @vitest-environment node
import { expect, it } from 'vitest'
import { startVendor } from '../../e2e/oauth-vendor'
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
