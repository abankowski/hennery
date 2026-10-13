import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import McpDelivery from './McpDelivery'
import type { McpSessionDelivery } from '../generated/protocol'
import { deliveryWords, CODEX_MCP_NOTE } from '../lib/mcpDelivery'

describe('last-start/resume delivery', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported'] as const)('shows %s as a decision, with count', (mode) => {
    const delivery: McpSessionDelivery = { mode, servers: mode === 'isolated' ? 0 : 2, at: '2026-10-13T00:00:00Z' }
    render(<McpDelivery agent="codex" delivery={delivery} />)
    const region = screen.getByRole('region', { name: 'MCP delivery' })
    expect(region).toHaveTextContent('At the last start/resume: ' + deliveryWords(mode))
    expect(region).toHaveTextContent(String(delivery.servers) + ' MCP servers.')
    if (mode === 'unisolated') expect(region).toHaveTextContent(CODEX_MCP_NOTE)
    else expect(region).not.toHaveTextContent('~/.codex')
  })
  it('keeps missing delivery unknown, without inventing a count', () => {
    render(<McpDelivery agent="codex" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.queryByText('0 MCP servers.')).toBeNull()
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('Codex may also load your own ~/.codex MCP servers.')
  })
  it('does not apply the Codex-specific note to another agent', () => {
    render(<McpDelivery agent="claude" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).not.toHaveTextContent('~/.codex')
  })
})

it('warns for an unisolated recorded mode even if the agent name is absent', () => {
  render(<McpDelivery delivery={{ mode: 'unisolated', servers: 1, at: '2026-10-13T00:00:00Z' }} />)
  expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('The agent also loads your own MCP configuration.')
})

it.each(['codex', 'claude'])('treats a future recorded mode as unknown for %s', agent => {
  const delivery: McpSessionDelivery = JSON.parse('{"mode":"future_mode","servers":2,"at":"2026-10-13T00:00:00Z"}')
  render(<McpDelivery agent={agent} delivery={delivery} />)
  const region = screen.getByRole('region', { name: 'MCP delivery' })
  expect(region).toHaveTextContent('MCP delivery is unknown.')
  expect(screen.getByText('2 MCP servers.', { exact: true })).toBeInTheDocument()
  if (agent === 'codex') expect(region).toHaveTextContent('Codex may also load your own ~/.codex MCP servers.')
  else expect(region).not.toHaveTextContent('~/.codex')
})
