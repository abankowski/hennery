import { act, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import { catalog } from '../test-launch-catalog'
import { useLaunchContext } from './CatalogContext'
function Harness({ host, generation = 0 }: { host: string; generation?: number }) {
  const context = useLaunchContext(host, 'claude', '/project', 'hat-a', generation)
  return <output>{context.state}:{context.catalog?.adapter_revision}</output>
}
it('fences late catalog responses by whole host context and retry generation', async () => {
  let finish!: (response: Response) => void
  const late = new Promise<Response>(resolve => { finish = resolve })
  const server = stubServer({
    'GET /api/hosts/old/runtime-catalog?agent=claude&cwd=%2Fproject': () => late,
    'GET /api/hosts/new/runtime-catalog?agent=claude&cwd=%2Fproject': [json(200, { ...catalog, adapter_revision: 'pin-new' }), json(200, { ...catalog, adapter_revision: 'pin-newer' })],
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
    'GET /api/hats/hat-a/delegation-policy': json(200, { revision: 0, allowed: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  const view = (host: string, generation = 0) => <ClientContext.Provider value={client}><Harness host={host} generation={generation} /></ClientContext.Provider>
  const { rerender } = render(view('old'))
  await waitFor(() => expect(server.sent).toHaveLength(3))
  rerender(view('new'))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:pin-new'))
  await act(async () => { finish(json(200, { ...catalog, adapter_revision: 'pin-old' })); await late })
  expect(screen.getByRole('status')).toHaveTextContent('ready:pin-new')
  rerender(view('new', 1))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:pin-newer'))
})
it('does not reuse an earlier ready result when a context is left and re-entered', async () => {
  let finishA!: (response: Response) => void, finishB!: (response: Response) => void
  const lateA = new Promise<Response>(resolve => { finishA = resolve }), lateB = new Promise<Response>(resolve => { finishB = resolve })
  const server = stubServer({
    'GET /api/hosts/a/runtime-catalog?agent=claude&cwd=%2Fproject': [json(200, { ...catalog, adapter_revision: 'a-old' }), () => lateA],
    'GET /api/hosts/b/runtime-catalog?agent=claude&cwd=%2Fproject': () => lateB,
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
    'GET /api/hats/hat-a/delegation-policy': json(200, { revision: 0, allowed: {} }),
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
