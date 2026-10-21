import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import HatDefaultsSummary from './HatDefaultsSummary'

describe('read-only hat defaults', () => {
  it('reads the selected configured agent, preserves false and unknown axes, and links to the scoped editor', async () => {
    const server = stubServer({ 'GET /api/hats/hat%2Fone/session-defaults?agent=custom%2Fagent': json(200, { hat_id: 'hat/one', agent: 'custom/agent', revision: 2, config: { model: 'stored-model', mode: 'stored-mode', axes: { fast: false, future: 'stored-value' } } }) })
    const client = new Client({ fetch: server.fetch, stepUp: vi.fn(), navigate: vi.fn(), here: () => ({ pathname: "/hats", search: "" }) })
    render(<ClientContext.Provider value={client}><HatDefaultsSummary hatId="hat/one" agents={['custom/agent']} /></ClientContext.Provider>)
    expect(await screen.findByText('stored-model', { exact: true })).toBeVisible()
    expect(screen.getByText('Off', { exact: true })).toBeVisible()
    expect(screen.getByText('stored-value', { exact: true })).toBeVisible()
    expect(screen.getByText('stored-mode', { exact: true })).toBeVisible()
    expect(screen.getByText(/Saved overrides only/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Session defaults' })).toHaveAttribute('href', '/defaults?hat=hat%2Fone&agent=custom%2Fagent')
    expect(server.sent.map(row => row.method)).toEqual(['GET'])
  })
  it('clears prior values during a context change and ignores a late previous response', async () => {
    let finish!: (response: Response) => void
    const server = stubServer({
      'GET /api/hats/one/session-defaults?agent=claude': () => new Promise(resolve => { finish = resolve }),
      'GET /api/hats/two/session-defaults?agent=claude': json(200, { hat_id: 'two', agent: 'claude', revision: 0, config: {} }),
    })
    const client = new Client({ fetch: server.fetch, stepUp: vi.fn(), navigate: vi.fn(), here: () => ({ pathname: "/hats", search: "" }) })
    const page = (hatId: string) => <ClientContext.Provider value={client}><HatDefaultsSummary hatId={hatId} agents={['claude']} /></ClientContext.Provider>
    const view = render(page('one'))
    await waitFor(() => expect(server.sent).toHaveLength(1))
    view.rerender(page('two'))
    expect(await screen.findByText('No saved overrides for this agent.', { exact: true })).toBeVisible()
    await act(async () => finish(json(200, { hat_id: 'one', agent: 'claude', revision: 1, config: { model: 'OLD' } })))
    expect(screen.queryByText('OLD', { exact: true })).toBeNull()
    expect(screen.getByText('No saved overrides for this agent.', { exact: true })).toBeVisible()
  })
  it('reports failure as unavailable, retries, and never presents it as empty defaults', async () => {
    const server = stubServer({ 'GET /api/hats/hat/session-defaults?agent=claude': [json(500, { message: 'Service unavailable' }), json(200, { hat_id: 'hat', agent: 'claude', revision: 1, config: { axes: { fast: false } } })] })
    const client = new Client({ fetch: server.fetch, stepUp: vi.fn(), navigate: vi.fn(), here: () => ({ pathname: "/hats", search: "" }) })
    render(<ClientContext.Provider value={client}><HatDefaultsSummary hatId="hat" agents={['claude']} /></ClientContext.Provider>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load saved defaults')
    expect(screen.queryByText('No saved overrides for this agent.', { exact: true })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Retry saved defaults' }))
    expect(await screen.findByText('Off', { exact: true })).toBeVisible()
  })
})
