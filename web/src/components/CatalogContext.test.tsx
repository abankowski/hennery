import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import { catalog } from '../test-launch-catalog'
import { useLaunchContext } from './CatalogContext'
function Harness({ host, generation = 0, hostName, agent = 'claude', hat = 'hat-a' }: { host: string; generation?: number; hostName?: string; agent?: string; hat?: string }) {
  const context = useLaunchContext(host, agent, '/project', hat, generation, hostName)
  return <><output>{context.state}:{context.catalog?.adapter_revision}:{context.defaults?.config.mode}</output>{context.refresh && <button onClick={context.refresh}>Refresh</button>}{context.error && <p role="alert">{context.error}</p>}</>
}

it.each([{ agent: '' }, { hat: '' }])('has no Refresh action for incomplete context %j', props => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><Harness host="workstation" {...props} /></ClientContext.Provider>)
  expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull()
})

it('loads hat overrides while the catalog is still pending', async () => {
  const server = stubServer({
    'GET /api/hosts/workstation/runtime-catalog?agent=claude&cwd=%2Fproject': () => new Promise<Response>(() => {}),
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: { mode: 'default' } }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><Harness host="workstation" /></ClientContext.Provider>)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('loading::default'))
})
it('fences late catalog responses by whole host context and retry generation', async () => {
  let finish!: (response: Response) => void
  const late = new Promise<Response>(resolve => { finish = resolve })
  const server = stubServer({
    'GET /api/hosts/old/runtime-catalog?agent=claude&cwd=%2Fproject': () => late,
    'GET /api/hosts/new/runtime-catalog?agent=claude&cwd=%2Fproject': [json(200, { ...catalog, adapter_revision: 'pin-new' }), json(200, { ...catalog, adapter_revision: 'pin-newer' })],
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  const view = (host: string, generation = 0) => <ClientContext.Provider value={client}><Harness host={host} generation={generation} /></ClientContext.Provider>
  const { rerender } = render(view('old'))
  await waitFor(() => expect(server.sent).toHaveLength(2))
  rerender(view('new'))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:pin-new'))
  await act(async () => { finish(json(200, { ...catalog, adapter_revision: 'pin-old' })); await late })
  expect(screen.getByRole('status')).toHaveTextContent('ready:pin-new')
  rerender(view('new', 1))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:pin-newer'))
})

it('reads a persisted catalog without probing and probes only on explicit Refresh', async () => {
  const path = '/api/hosts/workstation/runtime-catalog?agent=claude&cwd=%2Fproject'
  const server = stubServer({
    [`GET ${path}`]: json(200, { ...catalog, freshness: 'cached', saved_at: 1 }),
    [`POST ${path}`]: json(200, { ...catalog, adapter_revision: 'refreshed' }),
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><Harness host="workstation" /></ClientContext.Provider>)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:pin-1'))
  expect(server.sent.filter(s => s.path === path).map(s => s.method)).toEqual(['GET'])
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:refreshed'))
  expect(server.sent.filter(s => s.path === path).map(s => s.method)).toEqual(['GET', 'POST'])
})
it('does not reuse an earlier ready result when a context is left and re-entered', async () => {
  let finishA!: (response: Response) => void, finishB!: (response: Response) => void
  const lateA = new Promise<Response>(resolve => { finishA = resolve }), lateB = new Promise<Response>(resolve => { finishB = resolve })
  const server = stubServer({
    'GET /api/hosts/a/runtime-catalog?agent=claude&cwd=%2Fproject': [json(200, { ...catalog, adapter_revision: 'a-old' }), () => lateA],
    'GET /api/hosts/b/runtime-catalog?agent=claude&cwd=%2Fproject': () => lateB,
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  const view = (host: string) => <ClientContext.Provider value={client}><Harness host={host} /></ClientContext.Provider>
  const { rerender } = render(view('a'))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:a-old'))
  rerender(view('b'))
  rerender(view('a'))
  expect(screen.getByRole('status')).toHaveTextContent('loading:')
  await act(async () => { finishA(json(200, { ...catalog, adapter_revision: 'a-new' })); await lateA })
  expect(screen.getByRole('status')).toHaveTextContent('ready:a-new')
  await act(async () => { finishB(json(200, { ...catalog, adapter_revision: 'b-late' })); await lateB })
  expect(screen.getByRole('status')).toHaveTextContent('ready:a-new')
})

it.each([
  ['auth_required', 'Authentication required', 'not signed in'],
  ['adapter_failed', 'The adapter exited during startup.', 'The adapter exited during startup.'],
  ['host_offline', 'offline', 'The host is offline.'],
])('names the runtime, host and reason for %s catalog errors', async (code, message, reason) => {
  const server = stubServer({
    'GET /api/hosts/workstation/runtime-catalog?agent=claude&cwd=%2Fproject': json(409, { code, message }),
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><Harness host="workstation" hostName="Test workstation" /></ClientContext.Provider>)
  expect(await screen.findByRole('alert')).toHaveTextContent(`claude on Test workstation: ${reason}`)
  expect(server.sent).toHaveLength(2)
})
