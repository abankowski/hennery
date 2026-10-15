import { describe, expect, it } from 'vitest'
import { decodePush, notificationTarget } from './notification'

describe('bounded Rust PushPayload decoder', () => {
  it('accepts existing session and gateway notices, ignores future fields', () => {
    expect(decodePush(JSON.stringify({ title: 'Needs your answer', body: 'Agent text', url: '/sessions/s-1', tag: 's-1', future: true }))).toEqual({ title: 'Needs your answer', body: 'Agent text', url: '/sessions/s-1', tag: 's-1' })
    expect(decodePush(JSON.stringify({ title: 'MCP', body: 'Needs authentication', url: '/mcp', tag: 'mcp-c1' })).url).toBe('/mcp')
  })
  it.each([null, '', '{', '[]', '{}', '{"title":1}', JSON.stringify({ title: 'x'.repeat(257), body: '', url: '/mcp', tag: 'a' }), JSON.stringify({ title: 't', body: 'x'.repeat(2049), url: '/mcp', tag: 'a' }), JSON.stringify({ title: 't', body: '', url: '/mcp', tag: 'x'.repeat(257) }), 'x'.repeat(8193)])('malformed data displays neutral attention without throwing: %s', (text) => {
    expect(decodePush(text)).toEqual({ title: 'hennery needs your attention', body: 'Open hennery to check the current state.', url: '/sessions', tag: 'hennery-attention' })
  })
  it.each(['https://evil.example/sessions/a', '//evil.example/sessions/a', '/sessions/a\\b', '/sessions/%2f', '/sessions/%252f', '/sessions/a#x', '/sessions/a?pending=p&pending=q', '/sessions/a?other=x', '/mcp/mount', '/login', '/sessions/../mcp', '/sessions/a?pending=%2f', '/sessions/a?%70ending=p', '/sessions/a?pending=p&', '/sessions/a?pending=', '/sessions/a?pending=p#f'])('rejects ambiguous target %s', (target) => expect(notificationTarget(target)).toBe('/sessions'))
  it.each(['/sessions/%73', '/sessions/a?pending=%70', '/sessions/a?pending=%2520', '/sessions/a?pending=p%26pending%3Dq', '/sessions/a?pending=p%00', '/sessions/a?pending=%c5%bc'])('rejects alternate decoding %s', target => expect(notificationTarget(target)).toBe('/sessions'))
  it.each(['/sessions', '/sessions/s-1', '/mcp', '/sessions/s-1?pending=p_1'])('accepts rooted target %s', (target) => expect(notificationTarget(target)).toBe(target))
  it.each(['/sessions/s%20one?pending=%C5%BC%20two', '/sessions/s~1?pending=p%27one'])('accepts canonical encoded opaque ids %s', target => expect(notificationTarget(target)).toBe(target))
})
