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
    expect(region).toHaveTextContent(CODEX_MCP_NOTE)
  })
  it('keeps missing delivery unknown, without inventing a count', () => {
    render(<McpDelivery agent="codex" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.queryByText('0 MCP servers.')).toBeNull()
  })
  it('does not apply the Codex-specific note to another agent', () => {
    render(<McpDelivery agent="claude" />)
    expect(screen.queryByText(CODEX_MCP_NOTE)).toBeNull()
  })
})
