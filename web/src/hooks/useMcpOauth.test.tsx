import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import { useMcpOauth } from './useMcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
const response = { consent_url: 'https://vendor.example/consent', expires_at: new Date(Date.now() + 900000).toISOString() }
let receive: ((e: MessageEvent) => void) | null
const closeChannel = vi.fn()
beforeEach(() => {
  receive = null
  vi.stubGlobal('BroadcastChannel', class { onmessage: ((e: MessageEvent) => void) | null = null; constructor() { queueMicrotask(() => { receive = e => this.onmessage?.(e) }) } close = closeChannel })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
function setup(answer: Response = json(200, response), popup: object | null = { opener: 'old', closed: false, location: '', close: vi.fn() }) {
  const opened = vi.spyOn(window, 'open').mockReturnValue(popup as Window | null)
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { resolve = done }))
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  const refresh = vi.fn(async () => [item])
  const waiting = vi.fn()
  const hook = renderHook(() => useMcpOauth(item, refresh, waiting), { wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  const start = () => act(() => hook.result.current.connect())
  const finish = () => act(async () => resolve(answer))
  return { ...hook, opened, fetch, stepUp, refresh, waiting, popup, start, finish }
}
it('opens blank on the click, nulls opener before awaiting, navigates only after authorize and guards duplicate clicks', async () => {
  const s = setup(); s.start()
  expect(s.opened).toHaveBeenCalledWith('', '_blank'); expect(s.popup).toMatchObject({ opener: null, location: '' })
  s.start(); expect(s.fetch).toHaveBeenCalledTimes(1)
  await s.finish(); expect(s.popup).toMatchObject({ location: response.consent_url }); expect(s.result.current.state.phase).toBe('waiting')
  s.unmount(); expect(closeChannel).toHaveBeenCalled()
})
it('closes an unverifiable opener and offers the isolated fallback', async () => {
  const close = vi.fn(); const popup = { get opener() { return 'bad' }, set opener(_v: unknown) {}, close, location: '' }
  const s = setup(json(200, response), popup); s.start(); expect(close).toHaveBeenCalled(); await s.finish()
  expect(popup.location).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('offers fallback for a blocked popup', async () => { const s = setup(json(200, response), null); s.start(); await s.finish(); expect(s.result.current.state.link).toBe(response.consent_url) })
it('closes before main-window confirmation and requires a new click, without authorize retry', async () => {
  const s = setup(json(403, { code: 'step_up_required' })); s.start(); await s.finish()
  expect(s.popup).toMatchObject({ close: expect.any(Function) }); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
  expect(s.stepUp).toHaveBeenCalledTimes(1); expect(s.fetch).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('confirm')
})
it('refuses unsafe consent URL and closes blank', async () => {
  const s = setup(json(200, { ...response, consent_url: 'javascript:alert(1)' })); s.start(); await s.finish()
  expect(s.result.current.state.phase).toBe('failed'); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
})
it('wrong-origin and wrong-connection hints do nothing; valid hints refetch but cannot fabricate success', async () => {
  const s = setup(); s.start(); await s.finish()
  const hint = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  await act(async () => receive?.(new MessageEvent('message', { origin: 'https://vendor.example', data: hint })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: { ...hint, connection_id: 'other' } })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: hint })))
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('unconfirmed')
})
it('observes server completion from focus and uses closed only once as a hint (COOP)', async () => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish()
  ;(s.popup as { closed: boolean }).closed = true
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('waiting')
  s.refresh.mockResolvedValue([{ ...item, status_at: '2026-10-03T10:00:01Z' }])
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(s.result.current.state.phase).toBe('connected')
})
it('expires unconfirmed and ignores a late authorize answer after cancellation', async () => {
  const s = setup(); s.start(); s.result.current.cancel(); await s.finish()
  expect(s.result.current.state.phase).toBe('idle'); expect(s.popup).toMatchObject({ location: '' })
  s.unmount()
  vi.useFakeTimers(); const expired = setup(json(200, { ...response, expires_at: new Date(Date.now() + 1000).toISOString() }))
  expired.start(); await expired.finish(); await act(async () => { await vi.advanceTimersByTimeAsync(1001) })
  expect(expired.result.current.state.phase).toBe('unconfirmed'); expect(expired.result.current.state.link).toBeUndefined()
})
it('records refusal, closes blank, refetches resource mismatch and sends exact acceptance on the next click', async () => {
  const s = setup(json(409, { code: 'resource_mismatch', message: 'compare' })); s.start(); await s.finish()
  await waitFor(() => expect(s.refresh).toHaveBeenCalled())
  expect(s.result.current.state.code).toBe('resource_mismatch')
  act(() => s.result.current.connect('https://vendor.example/other'))
  expect(JSON.parse((s.fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ accept_resource: 'https://vendor.example/other' })
})
