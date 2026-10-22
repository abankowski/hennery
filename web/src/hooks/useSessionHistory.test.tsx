import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ClientContext, browserClient } from '../app-client'
import type { SessionSummary } from '../generated/view'
import { json } from '../test-server'
import { clearSessionHistory, SESSION_HISTORY_KEY, visitSession } from '../lib/sessionHistory'
import { useSessionHistory } from './useSessionHistory'

const row = (session_id: string, hat_id = '019a0180-1234-7000-8000-000000000001'): SessionSummary => ({ session_id, hat_id, host_id: 'h', title: session_id, cwd: '/srv/demo', agent: 'claude', lifecycle: 'active', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0 })
const page = (sessions: SessionSummary[], next_cursor?: string) => json(200, { sessions, next_cursor, epoch: 'e', revision: 1, waiting: 0 })
afterEach(() => { cleanup(); clearSessionHistory(); vi.restoreAllMocks(); vi.useRealTimers() })
function setup(fetchImpl: typeof fetch, loaded = new Map<string, SessionSummary>(), selectedId: string | null = null) {
  const client = browserClient(async () => {}, fetchImpl)
  const initialProps: { loaded: ReadonlyMap<string, SessionSummary>; selectedId: string | null; hat: string; refreshKey?: string; baselineKey?: string } = { loaded, selectedId, hat: '' }
  return renderHook(({ loaded, selectedId, hat, refreshKey, baselineKey }) => useSessionHistory(loaded, selectedId, hat, true, refreshKey, baselineKey), { initialProps, wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
}
it('revalidates only missing cached entries newly included by the scope after a missed outside-hat deletion', async () => {
  const id = '019a0180-1234-7000-8000-000000000004', home = row(id, 'home')
  const work = row('019a0180-1234-7000-8000-000000000001', 'work')
  visitSession(id); visitSession(work.session_id)
  const fetchImpl = vi.fn(async () => page([])), view = setup(fetchImpl, new Map([[id, home], [work.session_id, work]]))
  await waitFor(() => expect(view.result.current).toHaveLength(2))
  view.rerender({ loaded: new Map([[work.session_id, work]]), selectedId: null, hat: 'work', baselineKey: 'work' })
  expect(view.result.current).toEqual([work])
  expect(fetchImpl).not.toHaveBeenCalled()
  view.rerender({ loaded: new Map(), selectedId: null, hat: '', baselineKey: 'all' })
  await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(view.result.current).toEqual([work]))
  expect(JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual([work.session_id])
})
it.each([503, 429, 'network'] as const)('retries a transient %s lookup once after backoff, without marking it checked', async failure => {
  vi.useFakeTimers()
  const id = '019a0180-1234-7000-8000-000000000004'
  visitSession(id)
  let calls = 0
  const fetchImpl = vi.fn(async () => {
    if (++calls > 1) return page([row(id)])
    if (failure === 'network') throw new TypeError('Offline')
    return json(failure, { code: 'transient', message: 'Try later' })
  })
  const view = setup(fetchImpl)
  await act(async () => {})
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(499) })
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(fetchImpl).toHaveBeenCalledTimes(2)
  expect(view.result.current.map(row => row.session_id)).toEqual([id])
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  expect(fetchImpl).toHaveBeenCalledTimes(2)
})
it('does not reset an exhausted transient retry budget when another visit adds a candidate', async () => {
  vi.useFakeTimers()
  const id = '019a0180-1234-7000-8000-000000000004', next = '019a0180-1234-7000-8000-000000000005'
  visitSession(id)
  const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => json(503, { code: 'offline', message: 'Retry later' }))
  setup(fetchImpl)
  await act(async () => {})
  await act(async () => { await vi.advanceTimersByTimeAsync(500) })
  const count = () => fetchImpl.mock.calls.filter(([url]) => new URL(String(url), 'http://fixture').searchParams.get('q') === id).length
  expect(count()).toBe(2)
  act(() => visitSession(next))
  await act(async () => { await vi.advanceTimersByTimeAsync(500) })
  expect(count()).toBe(2)
  expect(fetchImpl).toHaveBeenCalledTimes(4)
})
it('retries the failed page without resetting the three-page lookup limit', async () => {
  vi.useFakeTimers()
  const id = '019a0180-1234-7000-8000-000000000004'
  visitSession(id)
  let failed = false
  const cursors: (string | null)[] = []
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const cursor = new URL(String(input), 'http://fixture').searchParams.get('cursor')
    cursors.push(cursor)
    if (cursor === 'page-2' && !failed) { failed = true; return json(503, {}) }
    return page([], cursor === null ? 'page-2' : cursor === 'page-2' ? 'page-3' : 'page-4')
  })
  setup(fetchImpl)
  await act(async () => {})
  await act(async () => { await vi.advanceTimersByTimeAsync(500) })
  expect(cursors).toEqual([null, 'page-2', 'page-2', 'page-3'])
  expect(JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual([id])
})
it('restores visits outside list pages/filters, matches exact ids across pages and prunes missing/inaccessible sessions', async () => {
  for (const id of ['019a0180-1234-7000-8000-000000000007', '019a0180-1234-7000-8000-000000000008', '019a0180-1234-7000-8000-000000000004', '019a0180-1234-7000-8000-000000000006']) visitSession(id)
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://fixture'), id = url.searchParams.get('q')
    if (id === '019a0180-1234-7000-8000-000000000008') return json(403, { code: '019a0180-1234-7000-8000-000000000008', message: 'No access' })
    if (id === '019a0180-1234-7000-8000-000000000006') return json(503, { code: '019a0180-1234-7000-8000-000000000006', message: 'Retry later' })
    if (id === '019a0180-1234-7000-8000-000000000004') return url.searchParams.has('cursor') ? page([row('019a0180-1234-7000-8000-000000000004')]) : page([row('fuzzy-match')], 'next')
    return page([])
  })
  const { result } = setup(fetchImpl)
  await waitFor(() => expect(result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000004']))
  await waitFor(() => expect(JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(['019a0180-1234-7000-8000-000000000006', '019a0180-1234-7000-8000-000000000004']))
  expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('cursor=next'))).toBe(true)
  expect(fetchImpl.mock.calls.every(([url]) => !String(url).includes('hat='))).toBe(true)
})
it('records route visits once and ignores summary/activity updates and hat changes as visits', async () => {
  const a = row('019a0180-1234-7000-8000-000000000001'), b = row('019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000002'), loaded = new Map([['019a0180-1234-7000-8000-000000000001', a], ['019a0180-1234-7000-8000-000000000002', b]])
  const fetchImpl = vi.fn(async () => page([])), view = setup(fetchImpl, loaded, '019a0180-1234-7000-8000-000000000001')
  await waitFor(() => expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000001']))
  view.rerender({ loaded, selectedId: '019a0180-1234-7000-8000-000000000002', hat: '' })
  await waitFor(() => expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000001']))
  view.rerender({ loaded: new Map([['019a0180-1234-7000-8000-000000000001', { ...a, last_event_at: '2099-01-01' }], ['019a0180-1234-7000-8000-000000000002', b]]), selectedId: '019a0180-1234-7000-8000-000000000002', hat: '019a0180-1234-7000-8000-000000000001' })
  expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000001'])
  view.rerender({ loaded, selectedId: null, hat: '' })
  expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000001'])
  view.rerender({ loaded, selectedId: '019a0180-1234-7000-8000-000000000001', hat: '' })
  await waitFor(() => expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000001']))
  expect(fetchImpl).not.toHaveBeenCalled()
})
it('records direct links only after an authorized exact-id read; cancels stale reads on unmount', async () => {
  let finish!: (response: Response) => void
  let signal: AbortSignal | null | undefined
  const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => { signal = init?.signal; return new Promise<Response>(resolve => { finish = resolve }) })
  const view = setup(fetchImpl, new Map(), '019a0180-1234-7000-8000-000000000005')
  expect(localStorage.getItem(SESSION_HISTORY_KEY)).toBeNull()
  await act(async () => finish(page([row('019a0180-1234-7000-8000-000000000005')])))
  await waitFor(() => expect(view.result.current.map(s => s.session_id)).toEqual(['019a0180-1234-7000-8000-000000000005']))
  view.unmount(); expect(signal?.aborted).toBe(true)
})
it('does not restore deleted history when a read ignores abort', async () => {
  visitSession('019a0180-1234-7000-8000-000000000004')
  let finish!: (response: Response) => void
  const view = setup(vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
  act(() => clearSessionHistory())
  await act(async () => finish(page([row('019a0180-1234-7000-8000-000000000004')])))
  expect(view.result.current).toEqual([])
  expect(localStorage.getItem(SESSION_HISTORY_KEY)).toBeNull()
})
it('retains a streamed hat reassignment across a filtered baseline and does not resurrect a removed cached visit', async () => {
  visitSession('019a0180-1234-7000-8000-000000000004')
  const old = row('019a0180-1234-7000-8000-000000000004'), view = setup(vi.fn(async () => page([])), new Map([['019a0180-1234-7000-8000-000000000004', old]]))
  await waitFor(() => expect(view.result.current).toHaveLength(1))
  const moved = { ...old, hat_id: '019a0180-1234-7000-8000-000000000002', last_event_at: '2026-10-21' }
  view.rerender({ loaded: new Map([['019a0180-1234-7000-8000-000000000004', moved]]), selectedId: null, hat: '019a0180-1234-7000-8000-000000000001' })
  expect(view.result.current).toEqual([])
  view.rerender({ loaded: new Map(), selectedId: null, hat: '019a0180-1234-7000-8000-000000000001' })
  expect(view.result.current).toEqual([])
  view.rerender({ loaded: new Map(), selectedId: null, hat: '' })
  expect(view.result.current[0].hat_id).toBe('019a0180-1234-7000-8000-000000000002')
  act(() => clearSessionHistory())
  view.rerender({ loaded: new Map(), selectedId: '019a0180-1234-7000-8000-000000000004', hat: '' })
  await waitFor(() => expect(view.result.current).toEqual([]))
  expect(localStorage.getItem(SESSION_HISTORY_KEY)).toBeNull()
})
it('a delayed hydration page cannot roll a streamed hat reassignment back after the next baseline', async () => {
  visitSession('019a0180-1234-7000-8000-000000000004')
  let finish!: (response: Response) => void
  const view = setup(vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
  const moved = { ...row('019a0180-1234-7000-8000-000000000004', '019a0180-1234-7000-8000-000000000002'), last_event_at: '2026-10-21' }
  view.rerender({ loaded: new Map([['019a0180-1234-7000-8000-000000000004', moved]]), selectedId: null, hat: '019a0180-1234-7000-8000-000000000001' })
  await act(async () => finish(page([row('019a0180-1234-7000-8000-000000000004', '019a0180-1234-7000-8000-000000000001')])))
  view.rerender({ loaded: new Map(), selectedId: null, hat: '019a0180-1234-7000-8000-000000000001' })
  expect(view.result.current).toEqual([])
  view.rerender({ loaded: new Map(), selectedId: null, hat: '' })
  expect(view.result.current[0]).toEqual(moved)
})
it('revalidates cached visits after list resync and prunes deletion missed while disconnected', async () => {
  visitSession('019a0180-1234-7000-8000-000000000004')
  let removed = false
  const fetchImpl = vi.fn(async () => page(removed ? [] : [row('019a0180-1234-7000-8000-000000000004')]))
  const view = setup(fetchImpl)
  await waitFor(() => expect(view.result.current.map(row => row.session_id)).toEqual(['019a0180-1234-7000-8000-000000000004']))
  removed = true
  view.rerender({ loaded: new Map(), selectedId: null, hat: '', refreshKey: 'resynced' })
  await waitFor(() => expect(view.result.current).toEqual([]))
  expect(localStorage.getItem(SESSION_HISTORY_KEY)).toBe('[]')
})
it('bounds transient retries across query and hat changes and permits a new retry after reconnect', async () => {
  vi.useFakeTimers()
  const id = '019a0180-1234-7000-8000-000000000006'
  visitSession(id)
  const fetchImpl = vi.fn(async () => json(503, { code: 'offline', message: 'Retry later' }))
  const view = setup(fetchImpl)
  await act(async () => {})
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  view.rerender({ loaded: new Map(), selectedId: null, hat: 'work' })
  view.rerender({ loaded: new Map(), selectedId: null, hat: 'home' })
  await act(async () => { await vi.advanceTimersByTimeAsync(499) })
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(fetchImpl).toHaveBeenCalledTimes(2)
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  expect(fetchImpl).toHaveBeenCalledTimes(2)
  expect(JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual([id])
  view.rerender({ loaded: new Map(), selectedId: null, hat: '', refreshKey: 'reconnected' })
  await act(async () => {})
  expect(fetchImpl).toHaveBeenCalledTimes(3)
  await act(async () => { await vi.advanceTimersByTimeAsync(500) })
  expect(fetchImpl).toHaveBeenCalledTimes(4)
})
it('limits history hydration to four simultaneous reads', async () => {
  for (let n = 0; n < 10; n++) visitSession(`019a0180-1234-7000-9000-${String(n).padStart(12, '0')}`)
  const finish: ((response: Response) => void)[] = []
  const fetchImpl = vi.fn(() => new Promise<Response>(resolve => finish.push(resolve)))
  const view = setup(fetchImpl)
  expect(fetchImpl).toHaveBeenCalledTimes(4)
  view.unmount()
  await act(async () => { for (const resolve of finish) resolve(page([])) })
})
it('caps lookup pagination at three pages without pruning an unproven miss', async () => {
  visitSession('019a0180-1234-7000-8000-000000000004')
  const fetchImpl = vi.fn(async (): Promise<Response> => fetchImpl.mock.calls.length > 3 ? json(503, {}) : page([], `next-${fetchImpl.mock.calls.length}`))
  setup(fetchImpl)
  await waitFor(() => expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(3))
  await act(async () => {})
  expect(fetchImpl).toHaveBeenCalledTimes(3)
  expect(JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(['019a0180-1234-7000-8000-000000000004'])
})
it('does not recheck a cached session outside the selected hat after reconnect', async () => {
  visitSession('019a0180-1234-7000-8000-000000000004')
  const fetchImpl = vi.fn(async () => page([row('019a0180-1234-7000-8000-000000000004', '019a0180-1234-7000-8000-000000000002')]))
  const view = setup(fetchImpl)
  await waitFor(() => expect(view.result.current).toHaveLength(1))
  view.rerender({ loaded: new Map(), selectedId: null, hat: '019a0180-1234-7000-8000-000000000001', refreshKey: 'reconnected' })
  await act(async () => {})
  expect(fetchImpl).toHaveBeenCalledTimes(1)
})
it('keeps an in-flight lookup alive across a hat switch', async () => {
  const id = '019a0180-1234-7000-8000-000000000004'
  visitSession(id)
  let finish!: (response: Response) => void
  let signal: AbortSignal | null | undefined
  const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => { signal = init?.signal; return new Promise<Response>(resolve => { finish = resolve }) })
  const view = setup(fetchImpl)
  view.rerender({ loaded: new Map(), selectedId: null, hat: 'work' })
  expect(signal?.aborted).toBe(false)
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  await act(async () => finish(page([row(id, 'work')])))
  await waitFor(() => expect(view.result.current).toHaveLength(1))
})
it('does not restart pending reads when another window changes shared history order', async () => {
  const a = '019a0180-1234-7000-8000-000000000001', b = '019a0180-1234-7000-8000-000000000002'
  visitSession(a); visitSession(b)
  const finish: ((response: Response) => void)[] = []
  const signals: (AbortSignal | null | undefined)[] = []
  const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => { signals.push(init?.signal); return new Promise<Response>(resolve => finish.push(resolve)) })
  const view = setup(fetchImpl)
  act(() => {
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify([a, b]))
    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_HISTORY_KEY }))
  })
  expect(fetchImpl).toHaveBeenCalledTimes(2)
  expect(signals.every(signal => !signal?.aborted)).toBe(true)
  await act(async () => { for (const resolve of finish) resolve(page([row(a), row(b)])) })
  await waitFor(() => expect(view.result.current.map(row => row.session_id)).toEqual([a, b]))
})

it('preserves visible slots after hat filtering, and promotes visits outside the six visible rows', async () => {
  const work = Array.from({ length: 7 }, (_, n) => row(`019a0180-1234-7000-8000-${String(n).padStart(12, '0')}`, 'work'))
  const home = Array.from({ length: 7 }, (_, n) => row(`019a0180-1234-7000-9000-${String(n).padStart(12, '0')}`, 'home'))
  const all = [...home, ...work], loaded = new Map(all.map(row => [row.session_id, row]))
  localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(all.map(row => row.session_id)))
  const fetchImpl = vi.fn(async () => page([])), view = setup(fetchImpl, loaded)
  view.rerender({ loaded, selectedId: work[4].session_id, hat: 'work' })
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem('hennery.windowSessions')!)[0]).toBe(work[4].session_id))
  expect(view.result.current).toEqual(work)
  expect(JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(all.map(row => row.session_id))
  view.rerender({ loaded, selectedId: work[6].session_id, hat: 'work' })
  await waitFor(() => expect(view.result.current).toEqual([work[6], ...work.slice(0, 6)]))
  expect(fetchImpl).not.toHaveBeenCalled()
})
