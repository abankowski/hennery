import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { StepUpCancelled } from '../api/errors'
import { json, stubServer, type Answer } from '../test-server'
import type { HostCatalog } from '../generated/protocol'
import DelegationSettings from './DelegationSettings'

const HAT = { id: 'hat', name: 'Personal', colour: '#64748b', default_for_new_hosts: true, created_at: '2026-10-20T09:00:00Z', purging: false }
const catalog: HostCatalog = { agent: 'claude', adapter_revision: 'pin1', freshness: 'fresh', security: { known: true, axes: { mode: ['default', 'plan'] } }, defaults: { mode: 'default' }, config_options: [
  { id: 'permission', category: 'mode', name: 'Permissions', type: 'select', currentValue: 'default', options: [{ value: 'default', name: 'Default' }, { value: 'plan', name: 'Plan' }, { value: 'bypass', name: 'Bypass permissions' }] },
  { id: 'effort', name: 'Effort', type: 'select', currentValue: 'low', options: [{ value: 'low', name: 'Low' }] },
] }
const BASE = { revision: 1, allowed: { other: { sandbox: ['strict'], audit: [false] } } }
function open(routes: Record<string, Answer | Answer[]> = {}, stepUp = vi.fn(async () => {})) {
  const server = stubServer({
    'GET /api/hats/hat/session-tools': json(200, { delegation_enabled: false, revision: 1 }),
    'GET /api/hats/hat/delegation-policy': json(200, BASE),
    'GET /api/hosts': json(200, [{ host_id: 'host', name: 'Workstation', connected: true }]),
    'GET /api/hosts/host/runtime-catalog?agent=claude&cwd=%2Fproject': json(200, catalog),
    'PATCH /api/hats/hat/session-tools': json(200, { delegation_enabled: true, revision: 2 }),
    'PATCH /api/hats/hat/delegation-policy': json(200, { revision: 2, allowed: { ...BASE.allowed, claude: { mode: ['default', 'plan', 'bypass'] } } }),
    ...routes,
  })
  const client = new Client({ fetch: server.fetch, here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp })
  render(<ClientContext.Provider value={client}><DelegationSettings hats={[HAT]} /></ClientContext.Provider>)
  return { server, stepUp }
}
async function context() {
  await screen.findByRole('option', { name: 'Workstation' })
  await userEvent.selectOptions(screen.getByLabelText('Grant host', { exact: true }), 'host')
  await waitFor(() => expect(screen.getByLabelText('Grant agent', { exact: true })).toBeEnabled())
  await userEvent.type(screen.getByLabelText('Grant agent', { exact: true }), 'claude')
  await userEvent.type(screen.getByLabelText('Grant project path', { exact: true }), '/project')
  await userEvent.click(screen.getByRole('button', { name: 'Load grant choices' }))
  return screen.findByRole('group', { name: 'Permissions' })
}
async function edit() {
  const group = await context()
  await userEvent.click(within(group).getByLabelText('Override Permissions', { exact: true }))
  await userEvent.click(within(group).getByLabelText('Bypass permissions', { exact: true }))
  return group
}
describe('delegation Settings', () => {
  it('locks a pending toggle and displays the returned flag rather than an optimistic guess', async () => {
    let finish!: (response: Response) => void
    open({ 'PATCH /api/hats/hat/session-tools': () => new Promise<Response>(resolve => { finish = resolve }) })
    const toggle = await screen.findByLabelText('Enable delegation session tools', { exact: true })
    await userEvent.click(toggle)
    expect(toggle).toBeDisabled()
    expect(toggle).not.toBeChecked()
    await act(async () => finish(json(200, { delegation_enabled: false, revision: 7 })))
    expect(toggle).not.toBeChecked()
    expect(toggle).toBeEnabled()
  })
  it('changes only session tools, waits for saved state and explains activation and disable behavior', async () => {
    const { server } = open()
    await userEvent.click(await screen.findByLabelText('Enable delegation session tools', { exact: true }))
    await waitFor(() => expect(screen.getByLabelText('Enable delegation session tools', { exact: true })).toBeChecked())
    expect(server.sent.filter(r => r.method === 'PATCH').map(r => [r.path, r.body])).toEqual([['/api/hats/hat/session-tools', { delegation_enabled: true }]])
    expect(screen.getByText('Disabling immediately denies built-in calls, cancels work not yet dispatched and routes outstanding attention to you. Already delivered work keeps running. Re-enabling does not replay cancelled work.', { exact: true })).toBeVisible()
  })
  it('restores the saved toggle on step-up cancel without a retry', async () => {
    const stepUp = vi.fn(async () => { throw new StepUpCancelled() })
    const { server } = open({ 'PATCH /api/hats/hat/session-tools': json(403, { code: 'step_up_required' }) }, stepUp)
    await userEvent.click(await screen.findByLabelText('Enable delegation session tools', { exact: true }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Change cancelled')
    expect(screen.getByLabelText('Enable delegation session tools', { exact: true })).not.toBeChecked()
    expect(stepUp).toHaveBeenCalledTimes(1)
    expect(server.sent.filter(r => r.method === 'PATCH')).toHaveLength(1)
  })
  it('uses trusted security ids, preserves unrelated grants and saves only after review with step-up', async () => {
    const { server, stepUp } = open({ 'PATCH /api/hats/hat/delegation-policy': [json(403, { code: 'step_up_required' }), json(200, { revision: 9, allowed: { ...BASE.allowed, claude: { mode: ['default', 'plan', 'bypass'] } } })] })
    await edit()
    expect(screen.queryByRole('group', { name: 'Effort' })).toBeNull()
    expect(server.sent.some(r => r.method === 'PATCH')).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Review execution grants' }))
    const review = screen.getByRole('dialog', { name: 'Save execution grants?' })
    expect(review).toHaveTextContent('other · sandbox: strict')
    expect(review).toHaveTextContent('Claude · Permissions: Default, Plan, Bypass permissions')
    await userEvent.click(within(review).getByRole('button', { name: 'Save execution grants' }))
    await waitFor(() => expect(review).not.toBeInTheDocument())
    expect(stepUp).toHaveBeenCalledTimes(1)
    const writes = server.sent.filter(r => r.method === 'PATCH')
    expect(writes.map(r => r.body)).toEqual(Array(2).fill({ allowed: { ...BASE.allowed, claude: { mode: ['default', 'plan', 'bypass'] } } }))
    expect(await screen.findByText(/^Saved version 9\..*$/)).toBeVisible()
  })
  it('keeps policy input on cancellation/refusal and never expands tools or grants automatically', async () => {
    const { server } = open({ 'PATCH /api/hats/hat/delegation-policy': json(403, { code: 'step_up_required' }) }, vi.fn(async () => { throw new StepUpCancelled() }))
    await edit()
    await userEvent.click(screen.getByRole('button', { name: 'Review execution grants' }))
    const review = screen.getByRole('dialog', { name: 'Save execution grants?' })
    await userEvent.click(within(review).getByRole('button', { name: 'Save execution grants' }))
    expect(await within(review).findByRole('alert')).toHaveTextContent('Not confirmed.')
    await userEvent.click(within(review).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Bypass permissions', { exact: true })).toBeChecked()
    expect(server.sent.filter(r => r.method === 'PATCH')).toHaveLength(1)
  })
  it('requires explicit axis selection for unknown profiles', async () => {
    open({ 'GET /api/hosts/host/runtime-catalog?agent=claude&cwd=%2Fproject': json(200, { ...catalog, security: { known: false, axes: {} } }) })
    const group = await context()
    expect(within(group).getByLabelText('Bypass permissions', { exact: true })).toBeDisabled()
    await userEvent.click(within(group).getByLabelText('Use as policy setting Permissions', { exact: true }))
    expect(within(group).getByLabelText('Default', { exact: true })).not.toBeChecked()
    expect(within(group).getByLabelText('Bypass permissions', { exact: true })).toBeEnabled()
    expect(screen.getByRole('group', { name: 'Effort' })).toBeVisible()
  })
  it('stale catalogs cannot add choices but existing unavailable grants can be removed deliberately', async () => {
    open({ 'GET /api/hosts/host/runtime-catalog?agent=claude&cwd=%2Fproject': json(200, { ...catalog, freshness: 'stale' }),
      'GET /api/hats/hat/delegation-policy': json(200, { revision: 1, allowed: { claude: { mode: ['retired'] }, other: BASE.allowed.other } }),
    })
    const group = await context()
    expect(within(group).getByLabelText('Override Permissions', { exact: true })).toBeDisabled()
    expect(within(group).getByLabelText('Bypass permissions', { exact: true })).toBeDisabled()
    expect(screen.getByText('Some saved values are unavailable in this context. They stay granted until you remove them below.', { exact: true })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Remove override: Claude / Permissions' }))
    await userEvent.click(screen.getByRole('button', { name: 'Review execution grants' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('other · sandbox: strict')
  })
  it('fences a catalog that returns after the context changes', async () => {
    let finish!: (r: Response) => void
    open({ 'GET /api/hosts/host/runtime-catalog?agent=claude&cwd=%2Fproject': () => new Promise<Response>(resolve => { finish = resolve }) })
    await screen.findByRole('option', { name: 'Workstation' })
  await userEvent.selectOptions(screen.getByLabelText('Grant host', { exact: true }), 'host')
    await waitFor(() => expect(screen.getByLabelText('Grant agent', { exact: true })).toBeEnabled())
    await userEvent.type(screen.getByLabelText('Grant agent', { exact: true }), 'claude')
    await userEvent.type(screen.getByLabelText('Grant project path', { exact: true }), '/project')
    await userEvent.click(screen.getByRole('button', { name: 'Load grant choices' }))
    await userEvent.type(screen.getByLabelText('Grant project path', { exact: true }), '/changed')
    await act(async () => finish(json(200, catalog)))
    expect(screen.queryByRole('group', { name: 'Permissions' })).toBeNull()
  })
  it('independently displays tools and policy failures with retry, and never labels failure as disabled', async () => {
    open({ 'GET /api/hats/hat/session-tools': json(500, { message: 'Temporarily unavailable' }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load session tools')
    expect(screen.queryByLabelText('Enable delegation session tools', { exact: true })).toBeNull()
    expect(await screen.findByText('strict', { exact: true })).toBeVisible()
  })
})
