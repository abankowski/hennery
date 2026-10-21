import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { StepUpCancelled } from '../api/errors'
import { json, stubServer, type Answer } from '../test-server'
import type { HatItem, HostCatalog } from '../generated/protocol'
import { host } from '../test-fixtures'
import DelegationSettings from './DelegationSettings'

const HAT: HatItem = { id: 'hat', name: 'Personal', colour: '#64748b', default_for_new_hosts: true, created_at: '2026-10-20T09:00:00Z', purging: false }
const catalog: HostCatalog = { agent: 'claude', adapter_revision: 'pin1', freshness: 'fresh', security: { known: true, axes: { mode: ['default', 'plan'], audit: [false] } }, defaults: { mode: 'default' }, config_options: [
  { id: 'permission', category: 'mode', name: 'Permissions', type: 'select', currentValue: 'default', options: [{ value: 'default', name: 'Default' }, { value: 'plan', name: 'Plan' }, { value: 'bypass', name: 'Bypass permissions' }] },
  { id: 'effort', name: 'Effort', type: 'select', currentValue: 'low', options: [{ value: 'low', name: 'Low' }] },
] }
const allowed = { claude: { mode: ['default', 'plan', 'bypass'], audit: [false] } }
function open(routes: Record<string, Answer | Answer[]> = {}, stepUp = vi.fn(async () => {}), hat = HAT) {
  const server = stubServer({
    'GET /api/hats/hat/session-tools': json(200, { delegation_enabled: false, revision: 1 }),
    'GET /api/hats/hat/delegation-policy': json(200, { revision: 1, allowed: {} }),
    'GET /api/hosts': json(200, [host({ host_id: 'host', connected: true, mcp_delivery: { claude: 'isolated' } })]),
    'GET /api/hosts/host/projects': json(200, { home: '/project', recents: [], items: [], partial: false }),
    'GET /api/hosts/host/runtime-catalog?agent=claude&cwd=%2Fproject': json(200, catalog),
    'PATCH /api/hats/hat/session-tools': json(200, { delegation_enabled: true, revision: 2 }),
    'PATCH /api/hats/hat/delegation-policy': json(200, { revision: 2, allowed }),
    ...routes,
  })
  const client = new Client({ fetch: server.fetch, here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp })
  render(<ClientContext.Provider value={client}><DelegationSettings hats={[hat]} /></ClientContext.Provider>)
  return { server, stepUp }
}
const writes = (server: ReturnType<typeof stubServer>) => server.sent.filter(r => r.method === 'PATCH').map(r => [r.path, r.body])
const toggle = () => screen.findByRole('switch', { name: 'Delegation' })
describe('the plain per-hat Delegation switch', () => {
  it('uses one prompt for the catalog-wide grant and tools, with no grant editor', async () => {
    const { server, stepUp } = open()
    await userEvent.click(await toggle())
    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked())
    expect(stepUp).toHaveBeenCalledTimes(1)
    expect(writes(server)).toEqual([
      ['/api/hats/hat/delegation-policy', { allowed }],
      ['/api/hats/hat/session-tools', { delegation_enabled: true }],
    ])
    expect(screen.getByText('Sessions in this hat can start child sessions with any model and mode. Children cannot start their own children. Permission requests always come to you.', { exact: true })).toBeVisible()
    expect(screen.getByText('Takes effect at the next start or resume.', { exact: true })).toBeVisible()
    expect(screen.queryByText('Execution grants', { exact: true })).toBeNull()
    expect(screen.queryByLabelText('Grant agent', { exact: true })).toBeNull()
  })
  it('disables tools before clearing the complete grant, without requiring a host', async () => {
    const { server, stepUp } = open({
      'GET /api/hats/hat/session-tools': json(200, { delegation_enabled: true, revision: 1 }),
      'GET /api/hats/hat/delegation-policy': json(200, { revision: 1, allowed }),
      'PATCH /api/hats/hat/session-tools': json(200, { delegation_enabled: false, revision: 2 }),
      'PATCH /api/hats/hat/delegation-policy': json(200, { revision: 2, allowed: {} }),
    })
    await userEvent.click(await toggle())
    await waitFor(() => expect(screen.getByRole('switch')).not.toBeChecked())
    expect(stepUp).toHaveBeenCalledTimes(1)
    expect(writes(server)).toEqual([['/api/hats/hat/session-tools', { delegation_enabled: false }], ['/api/hats/hat/delegation-policy', { allowed: {} }]])
    expect(server.sent.some(r => r.path === '/api/hosts')).toBe(false)
  })
  it('unions choices from every reported runtime and connected host', async () => {
    const { server } = open({
      'GET /api/hosts': json(200, [host({ host_id: 'host', connected: true, mcp_delivery: { claude: 'isolated', custom: 'default_hat_only' } }), host({ host_id: 'second', connected: true, mcp_delivery: { claude: 'isolated' } })]),
      'GET /api/hosts/host/runtime-catalog?agent=custom&cwd=%2Fproject': json(200, { ...catalog, agent: 'custom', security: { known: false, axes: {} } }),
      'GET /api/hosts/second/projects': json(200, { home: '/other' }),
      'GET /api/hosts/second/runtime-catalog?agent=claude&cwd=%2Fother': json(200, { ...catalog, security: { known: true, axes: { mode: ['other-mode'] } }, config_options: [] }),
    })
    await userEvent.click(await toggle())
    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked())
    expect(writes(server)[0]).toEqual(['/api/hats/hat/delegation-policy', { allowed: { claude: { mode: ['default', 'plan', 'bypass', 'other-mode'], audit: [false] }, custom: { effort: ['low'], mode: ['default', 'plan', 'bypass'] } } }])
  })
  it('cancelling confirmation sends neither write', async () => {
    const { server, stepUp } = open({}, vi.fn(async () => { throw new StepUpCancelled() }))
    await userEvent.click(await toggle())
    expect(await screen.findByRole('alert')).toHaveTextContent('Change cancelled')
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(stepUp).toHaveBeenCalledTimes(1)
    expect(writes(server)).toEqual([])
  })
  it('locks the switch and hat selector until both writes answer, and trusts readback', async () => {
    let finish!: (response: Response) => void
    open({ 'PATCH /api/hats/hat/session-tools': () => new Promise<Response>(resolve => { finish = resolve }) })
    const control = await toggle(); await userEvent.click(control)
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(control).toBeDisabled(); expect(control).not.toBeChecked()
    expect(screen.getByLabelText('Delegation hat', { exact: true })).toBeDisabled()
    await act(async () => finish(json(200, { delegation_enabled: false, revision: 7 })))
    await waitFor(() => expect(control).toBeEnabled())
    expect(control).not.toBeChecked()
    expect(screen.getByRole('alert')).toHaveTextContent('could not be fully saved')
  })
  it.each(['stale', 'unavailable'])('does not write or prompt with a %s catalog', async freshness => {
    const { server, stepUp } = open({ 'GET /api/hosts/host/runtime-catalog?agent=claude&cwd=%2Fproject': freshness === 'stale' ? json(200, { ...catalog, freshness }) : json(503, { message: 'Catalog unavailable' }) })
    await userEvent.click(await toggle())
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(stepUp).not.toHaveBeenCalled(); expect(writes(server)).toEqual([])
  })
  it('refuses a second step-up instead of opening a second prompt or enabling tools', async () => {
    const { server, stepUp } = open({ 'PATCH /api/hats/hat/delegation-policy': json(403, { code: 'step_up_required' }) })
    await userEvent.click(await toggle())
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be fully saved')
    expect(stepUp).toHaveBeenCalledTimes(1)
    expect(writes(server)).toHaveLength(1)
    expect(screen.getByRole('switch')).not.toBeChecked()
  })
  it('does not label a read failure as OFF and offers retry', async () => {
    open({ 'GET /api/hats/hat/session-tools': json(500, { message: 'Temporarily unavailable' }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load session tools')
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry session tools' })).toBeVisible()
  })
  it('keeps a purging hat read-only', async () => {
    const { server } = open({}, undefined, { ...HAT, purging: true })
    expect(await toggle()).toBeDisabled()
    expect(writes(server)).toEqual([])
  })
})
