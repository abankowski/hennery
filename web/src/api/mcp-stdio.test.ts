import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import { replaceStdioServers, stdioServers } from './mcp'
import { startRefusal } from '../lib/start'
import { resumeRefusal, failureWords } from '../components/sessionWords'
import { ApiFailure } from './errors'

describe('stdio routes', () => {
  it('encodes both ids and sends the whole set without losing empty values', async () => {
    const t = routed(() => json({ host_id: 'h&x', hat_id: 'a/b', servers: [] }))
    await stdioServers(t.client, 'h&x', 'a/b')
    const servers = [{ name: 'files', command: 'server', args: [''], env: [{ name: 'EMPTY', value: '' }] }]
    await replaceStdioServers(t.client, 'h&x', 'a/b', { servers })
    expect(t.calls.map((call) => call.method + ' ' + call.path)).toEqual([
      'GET /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
      'PUT /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
    ])
    expect(JSON.parse(String(t.fetch.mock.calls[1][1]?.body))).toEqual({ servers })
  })
})

describe('start and resume isolation refusal', () => {
  const code = 'mcp_isolation_unavailable'
  const message = 'The host could not isolate this agent’s MCP servers. Try again.'
  it('explains a refused start', () => expect(startRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains a refused resume', () => expect(resumeRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains the failed session', () => expect(failureWords(code)).toBe('the host could not isolate this agent’s MCP servers'))
})
