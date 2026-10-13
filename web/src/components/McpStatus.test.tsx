import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import McpStatus from './McpStatus'
it('renders independent authorization failure as text and folds the probe item, never a health guess', async () => {
  const c = connection({ cred_kind: 'oauth_dcr', status: 'error', checked_at: '2026-10-13T10:00:00Z', oauth_error: { code: 'consent_denied', message: '<script>denied</script>', at: '2026-10-13T09:00:00Z' } })
  const server = stubServer({ [`POST /api/mcp/connections/${c.id}/probe`]: json(200, c) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const changed = vi.fn()
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={changed} /></ClientContext.Provider>)
  expect(screen.getByText('<script>denied</script>')).toBeVisible(); expect(document.querySelector('script')).toBeNull()
  expect(screen.getByText('2026-10-13T10:00:00Z')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Probe now' })); await waitFor(() => expect(changed).toHaveBeenCalledWith(c))
  expect(screen.getByRole('status')).toHaveTextContent('Gateway report updated. A probe does not promise continuing health.')
  expect(server.sent[0].body).toEqual({})
  expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull()
})
