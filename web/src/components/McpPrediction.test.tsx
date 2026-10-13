import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import McpPrediction from './McpPrediction'
import { predictionHat } from '../lib/mcpDelivery'

describe('delivery prediction', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { codex: 'default_hat_only', claude: 'isolated' } })
  it('shows default-hat Codex as not isolated, including its own configuration', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-a" />)
    const note = screen.getByRole('region', { name: 'MCP prediction' })
    expect(note).toHaveTextContent('Prediction from the host’s last report: The MCP servers are not isolated per hat')
    expect(note).toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('shows fallback in another hat', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-b" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('this hat is not the host’s default')
  })
  it('keeps a missing report unknown', () => {
    render(<McpPrediction host={{ ...h, mcp_delivery: undefined }} agent="codex" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('MCP delivery is unknown.')
  })
  it('does not show a Codex note for Claude', () => {
    render(<McpPrediction host={h} agent="claude" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Hennery keeps this agent')
    expect(screen.queryByText('Codex also loads your own ~/.codex MCP servers.')).toBeNull()
  })
  it('uses only a resolution for the current host and path', () => {
    const resolved = { hostId: 'h1', path: '/project', hat: 'hat-a' }
    expect(predictionHat(resolved, 'h1', '/project')).toBe('hat-a')
    expect(predictionHat(resolved, 'h2', '/project')).toBeUndefined()
    expect(predictionHat(resolved, 'h1', '/different')).toBeUndefined()
    expect(predictionHat(undefined, 'h1', '/project')).toBeUndefined()
  })
})
