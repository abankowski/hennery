import { act, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { host } from '../test-fixtures'
import { json, stubServer } from '../test-server'

afterEach(() => history.replaceState(null, '', '/'))
it.each([[], ['mcp_connections'], ['mcp_oauth'], ['mcp_connections', 'mcp_oauth']].map(features => ({ features })))('starts the off-screen MCP reader only with both capabilities: %j', async ({ features }) => {
  history.replaceState(null, '', '/hosts')
  const server = stubServer({ 'GET /api/capabilities': json(200, { mode: 'full', features }), 'GET /api/hosts': json(200, [host()]), 'GET /api/hats': json(200, []), 'GET /api/mcp/connections': json(200, []) })
  render(<App fetchImpl={server.fetch} />)
  await waitFor(() => expect(server.sent.some(s => s.path === '/api/hosts')).toBe(true)); await act(async () => {})
  expect(server.sent.filter(s => s.path === '/api/mcp/connections')).toHaveLength(features.length === 2 ? 1 : 0)
})
