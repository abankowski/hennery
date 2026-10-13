import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import McpScope, { McpBadge } from './McpScope'

afterEach(() => vi.useRealTimers())
it('counts only the last fetched needs_auth and error reports', async () => {
  const fetch = vi.fn(async () => json(200, [connection({ status: 'needs_auth' }), connection({ id: 'other', status: 'error' }), connection({ id: 'working', status: 'ok' })]))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><McpBadge /></McpScope></ClientContext.Provider>)
  expect(await screen.findByText('2 need attention')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
})
