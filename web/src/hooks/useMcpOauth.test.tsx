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
let channelName: string | undefined
const closeChannel = vi.fn()
beforeEach(() => {
  receive = null
  channelName = undefined
  vi.stubGlobal('BroadcastChannel', class { onmessage: ((e: MessageEvent) => void) | null = null; constructor(name: string) { channelName = name; queueMicrotask(() => { receive = e => this.onmessage?.(e) }) } close = closeChannel })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
function setup(answer: Response = json(200, response), popup: object | null = { opener: 'old', closed: false, location: { href: '' }, close: vi.fn() }) {
  const opened = vi.spyOn(window, 'open').mockReturnValue(popup as Window | null)
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { resolve = done }))
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  const refresh = vi.fn(async () => [item])
  const waiting = vi.fn()
  const hook = renderHook(() => useMcpOauth(item, refresh, waiting), { wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  const start = () => act(() => hook.result.current.connect())
  const finish = () => act(async () => resolve(answer.clone()))
  return { ...hook, opened, fetch, stepUp, refresh, waiting, popup, start, finish }
}
it('sends the exact local redirect with resource acceptance on an explicit Connect', async () => {
  const s = setup()
  const local = 'http://localhost:80/custom/callback'
  act(() => s.result.current.connect('https://resource.example/mcp', local))
  expect(JSON.parse((s.fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ accept_resource: 'https://resource.example/mcp', local_redirect_uri: local })
  await s.finish()
  expect(s.popup).toMatchObject({ location: { href: response.consent_url } })
})
it('opens blank on the click, nulls opener before awaiting, navigates only after authorize and guards duplicate clicks', async () => {
  const s = setup(); s.start()
  expect(channelName).toBe('hennery-mcp-oauth')
  expect(s.opened).toHaveBeenCalledWith('', '_blank'); expect(s.popup).toMatchObject({ opener: null, location: { href: '' } })
  s.start(); expect(s.fetch).toHaveBeenCalledTimes(1)
  await s.finish(); expect(s.popup).toMatchObject({ location: { href: response.consent_url } }); expect(s.result.current.state.phase).toBe('waiting')
  s.unmount(); expect(closeChannel).toHaveBeenCalled()
})
it('closes an unverifiable opener and offers the isolated fallback', async () => {
  const close = vi.fn(); const popup = { get opener() { return 'bad' }, set opener(_v: unknown) {}, close, location: { href: '' } }
  const s = setup(json(200, response), popup); s.start(); expect(close).toHaveBeenCalled(); await s.finish()
  expect(popup.location.href).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
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
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) }); expect(s.refresh).not.toHaveBeenCalled()
  ;(s.popup as { closed: boolean }).closed = true
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('waiting')
  s.refresh.mockResolvedValue([{ ...item, status_at: '2026-10-03T10:00:01Z' }])
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(s.result.current.state.phase).toBe('working')
})
it('ignores a late focus error and a late step-up refusal after cancellation', async () => {
  let reject!: (reason: Error) => void
  const s = setup(); s.start(); await s.finish(); s.refresh.mockImplementation(() => new Promise((_yes, no) => { reject = no }))
  act(() => window.dispatchEvent(new Event('focus'))); act(() => s.result.current.cancel())
  await act(async () => reject(new Error('late read'))); expect(s.result.current.state).toEqual({ phase: 'idle' })
  s.unmount()
  const refused = setup(json(403, { code: 'step_up_required' })); refused.start(); act(() => refused.result.current.cancel()); await refused.finish()
  expect(refused.stepUp).not.toHaveBeenCalled(); expect(refused.result.current.state.phase).toBe('idle')
})
it('expires unconfirmed and ignores a late authorize answer after cancellation', async () => {
  const s = setup(); s.start(); act(() => s.result.current.cancel()); await s.finish()
  expect(s.result.current.state.phase).toBe('idle'); expect(s.popup).toMatchObject({ location: { href: '' } })
  s.unmount()
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-13T10:00:00Z'))
  const expired = setup(json(200, { ...response, expires_at: new Date(Date.now() + 1000).toISOString() }, { Date: new Date().toUTCString() }))
  expired.start(); await expired.finish(); await act(async () => { await vi.advanceTimersByTimeAsync(1001) })
  expect(expired.result.current.state.phase).toBe('unconfirmed'); expect(expired.result.current.state.link).toBeUndefined()
})
it('uses fallback when blank was closed before authorize answered', async () => {
  vi.useFakeTimers()
  const p = { opener: null, closed: false, location: { href: '' }, close: vi.fn() }
  const s = setup(json(200, response), p); s.start(); p.closed = true; await s.finish()
  expect(p.location.href).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) }); expect(s.refresh).not.toHaveBeenCalled()
})
it('retains the acceptance button intent through main-window confirmation', async () => {
  const s = setup(json(403, { code: 'step_up_required' }))
  act(() => s.result.current.connect('https://vendor.example/resource')); await s.finish()
  expect(s.result.current.state).toMatchObject({ phase: 'confirm', retry: 'accept' })
})
it.each(['2000-01-01T00:00:00Z', '2099-01-01T00:00:00Z'])('does not refuse Connect because of client time versus %s', async expires_at => {
  const s = setup(json(200, { ...response, expires_at })); s.start(); await s.finish()
  expect(s.result.current.state.phase).toBe('waiting'); expect(s.popup).toMatchObject({ location: { href: response.consent_url } })
})
it('records refusal, closes blank, refetches resource mismatch and sends exact acceptance on the next click', async () => {
  const s = setup(json(409, { code: 'resource_mismatch', message: 'compare' })); s.start(); await s.finish()
  await waitFor(() => expect(s.refresh).toHaveBeenCalled())
  expect(s.result.current.state.code).toBe('resource_mismatch')
  act(() => s.result.current.connect('https://vendor.example/other'))
  expect(JSON.parse((s.fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ accept_resource: 'https://vendor.example/other' })
})

it('pauses immediately, resumes before confirmation, and aborts/cancels without accepting a late rejection', async () => {
  const s = setup(); s.start()
  expect(s.result.current.state.phase).toBe('authorizing'); expect(s.waiting).toHaveBeenLastCalledWith(item.id, true)
  const signal = (s.fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal!
  act(() => s.result.current.cancel()); expect(signal.aborted).toBe(true)
  expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
  expect(s.waiting).toHaveBeenLastCalledWith(item.id, false)
  await s.finish(); expect(s.result.current.state.phase).toBe('idle')
  s.start(); expect(s.fetch).toHaveBeenCalledTimes(2)
  s.unmount(); expect(signal.aborted).toBe(true)
})
it('disposes the channel, timers and both listeners, allowing another attempt', async () => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish()
  expect(vi.getTimerCount()).toBe(2)
  const removeWindow = vi.spyOn(window, 'removeEventListener'), removeDocument = vi.spyOn(document, 'removeEventListener')
  act(() => s.result.current.cancel())
  expect(vi.getTimerCount()).toBe(0); expect(closeChannel).toHaveBeenCalled()
  expect(removeWindow).toHaveBeenCalledWith('focus', expect.any(Function))
  expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')) })
  expect(s.refresh).not.toHaveBeenCalled()
  s.start(); await s.finish(); expect(s.result.current.state.phase).toBe('waiting')
})
it.each(['failed', 'removed'])('observes the server %s verdict without inventing success', async verdict => {
  const s = setup(); s.start(); await s.finish()
  s.refresh.mockResolvedValue(verdict === 'removed' ? [] : [{ ...item, oauth_error: { code: 'consent_denied', message: 'vendor refused', at: item.status_at } }])
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(s.result.current.state).toMatchObject(verdict === 'removed' ? { phase: 'unconfirmed', error: 'The connection was removed.' } : { phase: 'failed', error: 'vendor refused', code: 'consent_denied' })
})
it('coalesces observation reads, ignores late answers after cancel, then reads again', async () => {
  let release!: (rows: typeof item[]) => void
  const s = setup(); s.start(); await s.finish()
  s.refresh.mockImplementation(() => new Promise(resolve => { release = resolve }))
  act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')) })
  expect(s.refresh).toHaveBeenCalledTimes(1)
  await act(async () => release([item])); expect(s.result.current.state.phase).toBe('waiting')
  act(() => window.dispatchEvent(new Event('focus'))); expect(s.refresh).toHaveBeenCalledTimes(2)
  act(() => s.result.current.cancel()); await act(async () => release([{ ...item, status_at: '2026-10-03T10:00:01Z' }]))
  expect(s.result.current.state.phase).toBe('idle')
})
it.each(['focus', 'hint', 'expiry'])('handles an unreadable report from %s with appropriate uncertainty', async trigger => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish(); s.refresh.mockRejectedValue(new Error('offline'))
  await act(async () => {
    if (trigger === 'focus') window.dispatchEvent(new Event('focus'))
    else if (trigger === 'hint') receive?.(new MessageEvent('message', { origin: location.origin, data: { type: 'done', connection_id: item.id, outcome: 'failed', result: 'denied' } }))
    else await vi.advanceTimersByTimeAsync(900001)
  })
  expect(s.result.current.state).toMatchObject({ phase: trigger === 'focus' ? 'waiting' : 'unconfirmed', error: 'offline' })
})
it('refetches on visible only and works when BroadcastChannel is unavailable', async () => {
  vi.stubGlobal('BroadcastChannel', class { constructor() { throw new Error('disabled') } })
  const s = setup(); s.start(); await s.finish()
  const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(s.refresh).not.toHaveBeenCalled()
  visible.mockReturnValue('visible')
  await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(s.refresh).toHaveBeenCalledTimes(1)
})
it('ignores hints before authorize is ready', async () => {
  const s = setup(); s.start(); await act(async () => {})
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' } })))
  expect(s.refresh).not.toHaveBeenCalled(); expect(s.result.current.state.phase).toBe('authorizing')
  await s.finish()
})
it('uses an isolated link if navigation throws and closes the unsafe handle', async () => {
  const close = vi.fn(); const p = { opener: null, closed: false, location: { set href(_value: string) { throw new Error('severed') } }, close }
  const s = setup(json(200, response), p); s.start(); await s.finish()
  expect(close).toHaveBeenCalled(); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('uses a fallback if opening or nulling the opener throws', async () => {
  const close = vi.fn(); const p = { set opener(_value: unknown) { throw new Error('blocked') }, close, location: { href: '' } }
  const s = setup(json(200, response), p); s.start(); await s.finish()
  expect(close).toHaveBeenCalled(); expect(p.location.href).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('keeps confirmation cancellation as a failure and ends the consent pause first', async () => {
  const s = setup(json(403, { code: 'step_up_required' })); s.stepUp.mockImplementation(async () => {
    expect(s.waiting).toHaveBeenLastCalledWith(item.id, false); throw new Error('cancelled')
  })
  s.start(); await s.finish(); expect(s.result.current.state).toMatchObject({ phase: 'failed', error: 'cancelled' })
})
it('uses the current reader and waiting callback, resets on changed identity and ignores old responses', async () => {
  const fetch = vi.fn(async () => json(200, response))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const popup = { opener: null, closed: false, location: { href: '' }, close: vi.fn() }; vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
  const first = vi.fn(async () => [item]), second = vi.fn(async () => [{ ...item, status_at: '2026-10-03T10:00:01Z' }]), wait1 = vi.fn(), wait2 = vi.fn()
  const s = renderHook(({ c, read, report }) => useMcpOauth(c, read, report), { initialProps: { c: item, read: first, report: wait1 }, wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  await act(async () => s.result.current.connect())
  s.rerender({ c: item, read: second, report: wait2 })
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledTimes(1); expect(wait2).toHaveBeenLastCalledWith(item.id, false)
  expect(s.result.current.state.phase).toBe('working')
  s.rerender({ c: { ...item, url: 'https://other.example/mcp' }, read: second, report: wait2 })
  expect(s.result.current.state.phase).toBe('idle')
})
it.each([false, true])('ignores a late confirmation answer after unmount (rejected=%s)', async rejected => {
  let resolve!: () => void, reject!: (reason: Error) => void
  const s = setup(json(403, { code: 'step_up_required' }))
  s.stepUp.mockImplementation(() => new Promise<void>((ok, no) => { resolve = ok; reject = no }))
  s.start(); await s.finish(); s.unmount()
  await act(async () => { if (rejected) reject(new Error('late')); else resolve() })
  expect(s.result.current.state.phase).toBe('authorizing')
})
it.each([false, true])('a replacement identity ignores an old confirmation answer (rejected=%s)', async rejected => {
  let resolve!: () => void, reject!: (reason: Error) => void
  const stepUp = vi.fn(() => new Promise<void>((ok, no) => { resolve = ok; reject = no }))
  const fetch = vi.fn(async () => json(403, { code: 'step_up_required' }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  vi.spyOn(window, 'open').mockReturnValue(null)
  const s = renderHook(({ c }) => useMcpOauth(c, vi.fn(async () => [c])), { initialProps: { c: item }, wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  await act(async () => s.result.current.connect())
  s.rerender({ c: { ...item, url: 'https://other.example/mcp' } }); expect(s.result.current.state.phase).toBe('idle')
  await act(async () => { if (rejected) reject(new Error('old failure')); else resolve() })
  expect(s.result.current.state.phase).toBe('idle')
})
