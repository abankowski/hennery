import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  expect(screen.getByRole('status')).toHaveTextContent('Probe answered. The card shows the gateway’s report.')
  expect(server.sent[0].body).toEqual({})
  expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull()
})
it('shares a pending probe, clears previous feedback and unlocks both failed and successful retries', async () => {
  let release!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { release = done }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const changed = vi.fn(), c = connection({ cred_kind: 'oauth_dcr', status: 'needs_auth' })
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={changed} /></ClientContext.Provider>)
  const button = screen.getByRole('button', { name: 'Probe now' })
  fireEvent.click(button); fireEvent.click(button); expect(fetch).toHaveBeenCalledTimes(1)
  expect(button).toHaveAttribute('aria-disabled', 'true'); expect(screen.getByRole('status')).toHaveTextContent('Probing…')
  await act(async () => release(json(400, { code: 'no_credential', message: 'vendor guess' })))
  expect(screen.getByRole('alert')).toHaveTextContent('Save a token or connect before probing this connection.')
  expect(button).toHaveAttribute('aria-disabled', 'false'); expect(changed).not.toHaveBeenCalled()
  fireEvent.click(button); expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => release(json(200, c))); expect(changed).toHaveBeenCalledWith(c)
  fireEvent.click(button); expect(screen.getByRole('status')).toHaveTextContent('Probing…')
  await act(async () => release(json(500, { code: 'unknown', message: 'unavailable' })))
  expect(screen.getByRole('alert')).toHaveTextContent('unavailable')
  expect(screen.queryByRole('status')).toBeNull()
})
it('renders an accepted resource and unverified timestamps without claiming a sent parameter', () => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const c = connection({ cred_kind: 'oauth_client', status: 'needs_auth', oauth: { redirect_uri: '', has_client_secret: false, accepted_resource: 'https://vendor.example/resource' } })
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={vi.fn()} /></ClientContext.Provider>)
  expect(screen.getByText(c.status_at, { exact: true })).toBeVisible(); expect(screen.getByText('Never checked', { exact: true })).toBeVisible()
  expect(screen.getByText('Sign-in may be needed. An authorization-server outage can also cause this state; read the gateway note.', { exact: true })).toBeVisible()
  expect(screen.getByText('https://vendor.example/resource', { exact: true }).parentElement).toHaveTextContent('This records your acceptance, not the parameter sent.')
})
