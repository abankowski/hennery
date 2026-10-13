import { describe, expect, it } from 'vitest'
import { ApiFailure } from '../api/errors'
import { canKeepEnv, stdioRefusal, stdioRequest } from './stdio'
import type { McpStdioServerItem } from '../generated/protocol'

const before: McpStdioServerItem = {
  name: 'files', command: 'server', args: [''], env: [{ name: 'TOKEN', has_value: true }],
  created_at: '2026-10-13T00:00:00Z', updated_at: '2026-10-13T00:00:00Z',
}

describe('env retention', () => {
  it('keeps only unchanged name, command and a stored env key', () => {
    expect(canKeepEnv(before, 'files', 'server', 'TOKEN')).toBe(true)
    expect(canKeepEnv(before, 'renamed', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'changed', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'server', 'MISSING')).toBe(false)
    expect(canKeepEnv({ ...before, env: [{ name: 'TOKEN', has_value: false }] }, 'files', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(undefined, 'files', 'server', 'TOKEN')).toBe(false)
  })
})

describe('full-set request', () => {
  it('keeps omissions distinct from empty and multiline values and preserves argv', () => {
    const draft = [{
      id: 1, name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
      env: [{ id: 2, name: 'KEPT', keep: true }, { id: 3, name: 'EMPTY', keep: false }, { id: 4, name: 'LINES', keep: false }],
    }]
    const reads: number[] = []
    expect(stdioRequest(draft, (_server, env) => { reads.push(env); return env === 4 ? 'a\nb' : '' })).toEqual({
      servers: [{ name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
        env: [{ name: 'KEPT' }, { name: 'EMPTY', value: '' }, { name: 'LINES', value: 'a\nb' }] }],
    })
    expect(reads).toEqual([3, 4])
    expect(stdioRequest([], () => 'unused')).toEqual({ servers: [] })
  })
})

describe('stdio refusals', () => {
  it('does not guess which place disappeared', () =>
    expect(stdioRefusal(new ApiFailure(404, { code: 'not_found', message: 'raw' }))).toBe('This host or hat no longer exists.'))
  it('keeps invalid field text', () =>
    expect(stdioRefusal(new ApiFailure(400, { code: 'invalid', message: 'server 1: command is empty' }))).toBe('server 1: command is empty'))
  it.each([
    ['env_value_missing', 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.'],
    ['too_many_stdio_servers', 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.'],
    ['host_revoked', 'This host is revoked: its local MCP servers can be read, not changed.'],
    ['slug_taken', 'A connection already uses this name.'],
    ['mcp_isolation_unavailable', 'The host could not isolate this agent’s MCP servers.'],
  ])('words %s', (code, message) => expect(stdioRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
})
