import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import Defaults from './Defaults'
import { catalog } from '../test-launch-catalog'

it('disables Refresh while pending and keeps the action outside its status announcement', async () => {
  history.replaceState(null, '', '/defaults?host=h1&cwd=/project&agent=claude')
  let finish!: (response: Response) => void
  const pending = new Promise<Response>(resolve => { finish = resolve })
  const hat = { id: 'hat-a', name: 'Personal', colour: '#64748b', created_at: '', default_for_new_hosts: false, purging: false }
  const server = stubServer({
    'GET /api/hosts': json(200, [{ host_id: 'h1', name: 'Synthetic host', mcp_delivery: { claude: 'isolated' }, connected: true }]),
    'GET /api/hats': json(200, [hat]),
    'POST /api/hats/resolve': json(200, { canonical: '/project', hat_id: 'hat-a', exists: true, is_dir: true }),
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: hat.id, agent: 'claude', revision: 0, config: {} }),
    'GET /api/hosts/h1/runtime-catalog?agent=claude&cwd=%2Fproject': json(200, catalog),
    'POST /api/hosts/h1/runtime-catalog?agent=claude&cwd=%2Fproject': () => pending,
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: location.pathname, search: location.search }), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><Defaults /></ClientContext.Provider>)
  const refresh = await screen.findByRole('button', { name: 'Refresh' })
  expect(refresh.closest('[role="status"]')).toBeNull()
  fireEvent.click(refresh)
  expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled()
  finish(json(200, catalog))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled())
})

it('retains Other agent typing and loads and resets unavailable saved defaults without a catalog', async () => {
  history.replaceState(null, '', '/defaults?host=h1')
  const hat = { id: 'hat-a', name: 'Personal', colour: '#64748b', created_at: '', default_for_new_hosts: false, purging: false }
  const server = stubServer({
    'GET /api/hosts': json(200, [{ host_id: 'h1', name: 'Synthetic host', mcp_delivery: { claude: 'isolated' }, connected: true }]),
    'GET /api/hats': json(200, [hat]),
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: hat.id, agent: 'claude', revision: 0, config: {} }),
    'GET /api/hats/hat-a/session-defaults?agent=custom-agent': json(200, { hat_id: hat.id, agent: 'custom-agent', revision: 7, config: { axes: { retired: false } } }),
    'PUT /api/hats/hat-a/session-defaults?agent=custom-agent': json(200, { hat_id: hat.id, agent: 'custom-agent', revision: 8, config: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: location.pathname, search: location.search }), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><Defaults /></ClientContext.Provider>)
  await screen.findByRole('tab', { name: 'Claude' })
  fireEvent.click(screen.getByText('Other agent', { exact: true }))
  const field = screen.getByRole('textbox', { name: 'Configured agent name' })
  fireEvent.change(field, { target: { value: 'custom-agent' } })
  await waitFor(() => expect(field).toHaveValue('custom-agent'))
  await screen.findByRole('button', { name: 'Reset retired to inherited' })
  fireEvent.click(screen.getByRole('button', { name: 'Reset all to inherited' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save defaults' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }))
  await waitFor(() => expect(server.sent.find(sent => sent.method === 'PUT')?.body).toEqual({ revision: 7, config: {} }))
  fireEvent.change(field, { target: { value: '' } })
  expect(field).toHaveValue('')
})
