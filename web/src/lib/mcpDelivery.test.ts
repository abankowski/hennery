import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import { deliveryWords, predictDelivery, predictionWords, runningLifecycle } from './mcpDelivery'

describe('deliveryWords', () => {
  it.each([
    ['isolated', "This agent was given only this hat's MCP servers."],
    ['unisolated', 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'],
    ['fallback', 'No hennery MCP servers: this hat is not the host’s default for this agent.'],
    ['unsupported', 'No hennery MCP servers: the host does not support their delivery.'],
    [undefined, 'MCP delivery is unknown.'],
    ['future', 'MCP delivery is unknown.'],
    ['constructor', 'MCP delivery is unknown.'],
  ])('words %s', (mode, words) => expect(deliveryWords(mode)).toBe(words))
})

describe('predictDelivery', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' } })
  it('predicts isolated', () => expect(predictDelivery(h, 'claude', 'hat-b')).toBe('isolated'))
  it('predicts unisolated in the default hat', () => expect(predictDelivery(h, 'codex', 'hat-a')).toBe('unisolated'))
  it('predicts fallback in another hat', () => expect(predictDelivery(h, 'codex', 'hat-b')).toBe('fallback'))
  it('predicts unsupported from an accepted capability-negative hello', () =>
    expect(predictDelivery(host(), 'codex', 'hat-a')).toBe('unsupported'))
  it('keeps missing host reports unknown', () => {
    expect(predictDelivery(undefined, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(host({ last_seen_at: undefined }), 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery({ ...h, mcp_delivery: undefined }, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'other', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'constructor', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'codex', undefined)).toBe('unknown')
  })
  it('reads newer values conservatively', () => {
    const newer = { ...h, mcp_delivery: JSON.parse('{"codex":"future"}') }
    expect(predictDelivery(newer, 'codex', 'hat-a')).toBe('unisolated')
    expect(predictDelivery(newer, 'codex', 'hat-b')).toBe('fallback')
  })
})

describe('predictionWords', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported', 'unknown'] as const)('words %s without a live-health promise', (mode) =>
    expect(predictionWords(mode)).toBe('Prediction from the host’s last report: ' + deliveryWords(mode)))
})

describe('runningLifecycle', () => {
  it.each(['starting', 'active'])('recognises %s', (state) => expect(runningLifecycle(state)).toBe(true))
  it.each(['parked', 'failed', 'closed', undefined, 'future'])('does not treat %s as running', (state) =>
    expect(runningLifecycle(state)).toBe(false))
})
