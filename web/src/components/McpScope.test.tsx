import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import McpScope, { McpBadge, useMcpScope } from './McpScope'
import { deferred } from '../test-locks'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
it.each(['succeeds', 'fails'])('retains push invalidation during consent when an older deferred GET %s, with one follow-up', async outcome => {
  vi.useFakeTimers()
  const service = new EventTarget(), active = {} as ServiceWorker
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(service, { getRegistration: async () => ({ active }) }) })
  const old = deferred<Response>(), current = deferred<Response>()
  const fetch = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const client = new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = render(<ClientContext.Provider value={client}><McpScope active><Control /><McpBadge /></McpScope></ClientContext.Provider>)
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => {
      for (let i = 0; i < 3; i++) service.dispatchEvent(new MessageEvent('message', { source: active, data: { version: 1, kind: 'mcp_invalidated' } }))
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => old.resolve(outcome === 'succeeds' ? json(200, [connection({ label: 'Stale ok', status: 'ok' })]) : json(500, { code: 'unavailable', message: 'old read failed' })))
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('No report')
    await act(async () => current.resolve(json(200, [connection({ label: 'Current auth', status: 'needs_auth' })])))
    expect(screen.getByText('Current auth', { exact: true })).toBeVisible()
    expect(screen.getByText('1 need attention', { exact: true })).toBeVisible()
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(fetch).toHaveBeenCalledTimes(2)
  } finally {
    old.resolve(json(200, [])); current.resolve(json(200, [])); view.unmount()
    // @ts-expect-error restore missing browser API
    delete navigator.serviceWorker
  }
})
it('active-worker relay reads through the shared reader during consent, coalesces, and defers while hidden', async () => {
  const service = new EventTarget(), active = {} as ServiceWorker
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(service, { getRegistration: async () => ({ active }) }) })
  const fetch = vi.fn(async () => json(200, [connection({ label: 'Current' })]))
  const client = new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  const hint = (source = active, data: unknown = { version: 1, kind: 'mcp_invalidated' }) => service.dispatchEvent(new MessageEvent('message', { source, data }))
  await act(async () => { hint({} as ServiceWorker); hint(active, { version: 2, kind: 'mcp_invalidated' }); hint(active, { version: 1, kind: 'answer' }) })
  expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => { hint() })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(screen.getByText('Current', { exact: true })).toBeVisible()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => { hint(); hint() })
  expect(fetch).toHaveBeenCalledTimes(2)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(fetch).toHaveBeenCalledTimes(3)
  view.unmount()
  // @ts-expect-error restore missing browser API
  delete navigator.serviceWorker
})
it('counts only the last fetched needs_auth and error reports', async () => {
  const fetch = vi.fn(async () => json(200, [connection({ status: 'needs_auth' }), connection({ id: 'other', status: 'error' }), connection({ id: 'working', status: 'ok' })]))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><McpBadge /></McpScope></ClientContext.Provider>)
  expect(await screen.findByText('2 need attention')).toBeVisible()
  expect(screen.getByText('2 need attention', { exact: true })).toHaveClass('mcp-auth-count')
  expect(screen.getByLabelText('1 may need sign-in, 1 are failing, from the last gateway report')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
})
it('omits a zero attention badge and uses a neutral linked count for errors alone', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(200, [connection()])).mockResolvedValueOnce(json(200, [connection({ status: 'error' })]))
  const client = new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><McpBadge link /></McpScope></ClientContext.Provider>)
  await act(async () => {}); expect(screen.queryByText('0 need attention', { exact: true })).toBeNull(); expect(document.querySelector('.mcp-attention')).toBeNull()
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(screen.getByText('1 need attention', { exact: true })).toHaveClass('mcp-error-count')
  expect(screen.getByRole('link')).toHaveAttribute('href', '/mcp')
})
function Control() {
  const scope = useMcpScope()!
  return <><button onClick={() => scope.waiting('connection', true)}>Pause</button><button onClick={() => scope.waiting('connection', false)}>Resume</button><button onClick={() => scope.waiting('second', true)}>Pause second</button><button onClick={() => scope.waiting('second', false)}>Resume second</button><button onClick={() => scope.set([connection({ label: 'New' })])}>Mutation</button><output>{scope.data?.[0]?.label ?? 'No report'}</output><p role="alert">{scope.error}</p></>
}
it('pauses periodic reads during consent but keeps focus invalidation and resumes the cadence', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn(async () => json(200, []))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  expect(fetch).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(120000) }); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => window.dispatchEvent(new Event('focus'))); expect(fetch).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(3)
})
it('reports read failures, clears them on recovery and sends an abortable request', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(500, { code: 'unavailable', message: 'offline' })).mockResolvedValueOnce(json(200, [connection({ label: 'Recovered' })]))
  const client = new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/hosts', search: '' }) })
  const s = render(<ClientContext.Provider value={client}><McpScope active={false}><Control /></McpScope></ClientContext.Provider>)
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('offline'))
  const signal = fetch.mock.calls[0][1].signal as AbortSignal
  expect(signal).toBeInstanceOf(AbortSignal)
  expect(signal.aborted).toBe(false)
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(screen.getByRole('status')).toHaveTextContent('Recovered'); expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  s.unmount(); expect(signal.aborted).toBe(true)
})
it('keeps multiple consents paused, uses visibility invalidation and disposes its timer and listeners', async () => {
  vi.useFakeTimers(); const fetch = vi.fn(async () => json(200, []))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const s = render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: 'Pause' })); fireEvent.click(screen.getByRole('button', { name: 'Pause second' })); fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(1)
  const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(fetch).toHaveBeenCalledTimes(1)
  visible.mockReturnValue('visible'); await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(fetch).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', { name: 'Resume second' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(3)
  const rw = vi.spyOn(window, 'removeEventListener'), rd = vi.spyOn(document, 'removeEventListener')
  s.unmount(); expect(vi.getTimerCount()).toBe(0)
  expect(rw).toHaveBeenCalledWith('focus', expect.any(Function)); expect(rd).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
})
it('activating MCP refetches immediately and a settled mutation invalidates once', async () => {
  const fetch = vi.fn(async () => json(200, [connection({ label: 'Read' })]))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (active: boolean) => <ClientContext.Provider value={client}><McpScope active={active}><Control /></McpScope></ClientContext.Provider>
  const s = render(view(false)); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); await act(async () => {})
  s.rerender(view(true)); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)); await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: 'Mutation' })); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
  await act(async () => {}); expect(fetch).toHaveBeenCalledTimes(3)
})
it('a new client clears the old report, uses a fresh signal and ignores old answers', async () => {
  let release!: (r: Response) => void
  const firstFetch = vi.fn(async () => json(200, [connection({ label: 'Old' })]))
  const secondFetch = vi.fn(() => new Promise<Response>(ok => { release = ok }))
  const make = (fetch: typeof globalThis.fetch) => new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const first = make(firstFetch as typeof globalThis.fetch), second = make(secondFetch as typeof globalThis.fetch)
  const view = (client: Client) => <ClientContext.Provider value={client}><McpScope active={false}><Control /></McpScope></ClientContext.Provider>
  const s = render(view(first)); await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Old'))
  s.rerender(view(second)); expect(screen.getByRole('status')).toHaveTextContent('No report')
  const signal = (secondFetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal!
  expect(signal).toBeInstanceOf(AbortSignal)
  expect(signal.aborted).toBe(false)
  await act(async () => release(json(200, [connection({ label: 'Fresh' })])))
  expect(screen.getByRole('status')).toHaveTextContent('Fresh')
})
it('reads every five minutes away from MCP and never periodically while hidden', async () => {
  vi.useFakeTimers(); const fetch = vi.fn(async () => json(200, []))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/hosts', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active={false}><McpBadge /></McpScope></ClientContext.Provider>)
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(240000) }); expect(fetch).toHaveBeenCalledTimes(2)
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => { await vi.advanceTimersByTimeAsync(300000) }); expect(fetch).toHaveBeenCalledTimes(2)
  visibility.mockRestore()
})
it('coalesces events and never overwrites a mutation with an older pending read', async () => {
  let release!: (response: Response) => void, latest!: (response: Response) => void
  const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { release = resolve })).mockImplementationOnce(() => new Promise<Response>(resolve => { latest = resolve })).mockImplementation(() => new Promise<Response>(() => {}))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
  act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')) })
  expect(fetch).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Mutation' })); expect(screen.getByRole('status')).toHaveTextContent('New')
  await act(async () => release(json(200, [connection({ label: 'Old' })])))
  expect(fetch).toHaveBeenCalledTimes(2); expect(screen.getByRole('status')).toHaveTextContent('New')
  await act(async () => latest(json(200, [connection({ label: 'New' })])))
  expect(fetch).toHaveBeenCalledTimes(2)
})
