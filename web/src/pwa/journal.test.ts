import { describe, expect, it, vi } from 'vitest'
import { Journal, type PushRecord, type PushStore } from './journal'
import type { PushSubscribeRequest } from '../generated/protocol'

// Persistent transactional fake: a new Journal has no JS globals to recover.
function store(): PushStore {
  let row: PushRecord = { generation: 0, enabled: false }
  let queue = Promise.resolve()
  return { transact<T>(fn: (value: PushRecord) => T): Promise<T> {
    const result = queue.then(() => { const copy = structuredClone(row); const value = fn(copy); row = copy; return value })
    queue = result.then(() => {}, () => {})
    return result
  } }
}
const subscription = (endpoint: string): PushSubscribeRequest => ({ endpoint, keys: { p256dh: 'key', auth: 'auth' } })
async function enabled(s = store()) {
  const journal = new Journal(s)
  const lease = await journal.beginEnable(0)
  expect(await journal.finishEnable(lease, 'row1', 'https://push.example/a', 'vapid')).toBe(true)
  return { journal, s }
}
const ok = () => new Response(JSON.stringify({ id: 'row1' }), { headers: { 'Content-Type': 'application/json' } })

describe('origin-local registration journal', () => {
  it('requires an explicit enable, and fences simultaneous enables and stale completions', async () => {
    const s = store(), a = new Journal(s), b = new Journal(s)
    expect(await a.queueRotation(subscription('https://push.example/b'))).toBe(false)
    const lease = await a.beginEnable(0)
    await expect(b.beginEnable(1)).rejects.toThrow('busy')
    await b.disable()
    expect(await a.finishEnable(lease, 'late-id', 'endpoint', 'key')).toBe(false)
    expect(await a.read()).toMatchObject({ enabled: false, id: 'late-id' })
    expect((await a.read()).endpoint).toBeUndefined()
  })
  it('keeps the first server anchor and only the newest replacement across restarts', async () => {
    const { journal, s } = await enabled()
    await journal.queueRotation(subscription('https://push.example/b'), 10)
    await new Journal(s).queueRotation(subscription('https://push.example/c'), 11)
    const calls: string[] = []
    expect(await new Journal(s).attempt(async (_url, init) => { calls.push(String(init?.body)); return ok() }, 12)).toBe('success')
    expect(JSON.parse(calls[0])).toEqual({ old_endpoint: 'https://push.example/a', subscription: subscription('https://push.example/c') })
    expect(await journal.read()).toMatchObject({ endpoint: 'https://push.example/c', enabled: true })
    expect((await journal.read()).rotation).toBeUndefined()
  })
  it('allows one HTTP attempt, advances its anchor while keeping a replacement received in flight', async () => {
    const { journal, s } = await enabled()
    await journal.queueRotation(subscription('https://push.example/b'), 1)
    let resolve!: (r: Response) => void
    const pending = journal.attempt(() => new Promise<Response>((r) => { resolve = r }), 2)
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    const other = new Journal(s)
    expect(await other.attempt(async () => ok(), 3)).toBe('idle')
    await other.queueRotation(subscription('https://push.example/c'), 4)
    resolve(ok())
    expect(await pending).toBe('success')
    expect(await other.read()).toMatchObject({ endpoint: 'https://push.example/b', rotation: { oldEndpoint: 'https://push.example/b', subscription: subscription('https://push.example/c') } })
    expect(await other.attempt(async (_url, init) => { expect(JSON.parse(String(init?.body)).old_endpoint).toBe('https://push.example/b'); return ok() }, 5)).toBe('success')
  })
  it('disable cancels deferred work and cannot be undone by an HTTP success', async () => {
    const { journal } = await enabled()
    await journal.queueRotation(subscription('https://push.example/b'), 1)
    let resolve!: (r: Response) => void
    const pending = journal.attempt(() => new Promise<Response>((r) => { resolve = r }), 2)
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    await journal.disable()
    resolve(ok())
    expect(await pending).toBe('stale')
    expect(await journal.read()).toMatchObject({ enabled: false, generation: 2 })
    expect((await journal.read()).rotation).toBeUndefined()
    expect((await journal.read()).key).toBeUndefined()
    expect(await journal.queueRotation(subscription('https://push.example/c'))).toBe(false)
    expect(await journal.attempt(async () => ok(), 20000)).toBe('idle')
  })
  it.each([401, 404, 400, 403, 409])('keeps 401 recoverable, stops automatic repair on %s otherwise', async (status) => {
    const { journal, s } = await enabled()
    await journal.queueRotation(subscription('https://push.example/b'), 1)
    expect(await journal.attempt(async () => new Response(null, { status }), 2)).toBe(status === 401 ? 'sign_in' : 'reenable')
    const row = await new Journal(s).read()
    expect(row.repair).toBe(status === 401 ? 'sign_in' : 'reenable')
    expect(row.enabled).toBe(status === 401)
    expect(!!row.rotation).toBe(status === 401)
  })
  it.each([429, 500, 'network', 'bad-response'])('retains bounded retry work on %s, honoring Retry-After', async (status) => {
    const { journal, s } = await enabled()
    await journal.queueRotation(subscription('https://push.example/b'), 1)
    const fetcher = async () => {
      if (status === 'network') throw new TypeError('offline')
      if (status === 'bad-response') return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      return new Response(null, { status: Number(status), headers: { 'Retry-After': '20' } })
    }
    expect(await journal.attempt(fetcher, 2)).toBe('retry')
    const row = await new Journal(s).read()
    expect(row.rotation?.attempts).toBe(1)
    expect(row.rotation?.nextAt).toBeGreaterThanOrEqual(1002)
    if (status === 429 || status === 500) expect(row.rotation?.nextAt).toBe(20002)
    expect(await new Journal(s).attempt(async () => ok(), 3)).toBe('idle')
    expect(await new Journal(s).attempt(async () => ok(), 70000)).toBe('success')
  })
  it('requires repair on ambiguous lost success/404 rather than recreating a row', async () => {
    const { journal } = await enabled()
    await journal.queueRotation(subscription('https://push.example/b'), 1)
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('lost response')).mockResolvedValueOnce(new Response(null, { status: 404 }))
    expect(await journal.attempt(fetcher, 2)).toBe('retry')
    expect(await journal.attempt(fetcher, 2000)).toBe('reenable')
    expect(fetcher.mock.calls.every(([url]) => url === '/api/push/subscriptions/rotate')).toBe(true)
  })
  it('a dead attempt lease expires, and its stale result cannot overwrite a newer success', async () => {
    const { journal, s } = await enabled()
    await journal.queueRotation(subscription('https://push.example/b'), 1)
    let resolve!: (r: Response) => void
    const first = journal.attempt(() => new Promise<Response>((r) => { resolve = r }), 2)
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    expect(await new Journal(s).attempt(async () => ok(), 13000)).toBe('success')
    resolve(ok())
    expect(await first).toBe('stale')
    expect((await journal.read()).endpoint).toBe('https://push.example/b')
  })
  it('scrubs capability material after disable, preserving only the removal id on partial failure', async () => {
    const { journal } = await enabled()
    expect(await journal.disable()).toMatchObject({ id: 'row1', endpoint: 'https://push.example/a' })
    await journal.finishDisable(false, false)
    expect(await journal.read()).toEqual({ generation: 2, enabled: false, id: 'row1', repair: 'remove_server_and_browser' })
    await journal.finishDisable(true, false)
    expect((await journal.read()).repair).toBe('remove_browser')
    await journal.finishDisable(true, true)
    expect(await journal.read()).toEqual({ generation: 2, enabled: false })
  })
})
