import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { COLLECTOR_REFRESH_MS } from './Shell'
import { json, liveStream, routed, type LiveStream } from '../test-stream'

beforeEach(() => { history.replaceState(null, '', '/sessions'); vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers(); history.replaceState(null, '', '/') })
async function tick(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
async function fixture() {
  let version = __PAGE_VERSION__
  const streams: LiveStream[] = []
  const server = routed(call => {
    const path = new URL(call.path, 'https://app.example').pathname
    if (path === '/api/capabilities') return json({ mode: 'full', features: [], collector_version: version, source_commit: null })
    if (path === '/api/view/sessions') return json({ sessions: [], epoch: 'versions', revision: 1, waiting: 0 })
    if (path === '/api/stream/sessions') { const stream = liveStream(); streams.push(stream); return stream.response }
    if (path === '/api/hats' || path === '/api/hosts') return json([])
    return json({ code: 'not_found', message: 'Not in fixture' }, 404)
  })
  render(<App fetchImpl={server.fetch} />)
  await tick()
  expect(streams).toHaveLength(1)
  const footer = within(screen.getByRole('complementary', { name: 'Views' }))
  expect(footer.getByText(`hennery ${version}`, { exact: true })).toBeVisible()
  return { streams, footer, upgrade: () => { version = '99.0.0' }, reads: () => server.calls.filter(call => call.path === '/api/capabilities').length }
}
it.each(['resync', 'reconnect'])('refreshes collector identity after list %s with no focus event', async recovery => {
  const f = await fixture()
  f.upgrade()
  await act(async () => { if (recovery === 'resync') f.streams[0].event('resync_required', {}); else f.streams[0].end() })
  await tick(1000)
  await tick(250)
  expect(f.streams).toHaveLength(2)
  expect(f.footer.getByText(`page ${__PAGE_VERSION__} · server 99.0.0`, { exact: true })).toBeVisible()
  expect(f.reads()).toBe(2)
})
it('coalesces focus and visibility in separate event turns into one capabilities request', async () => {
  const f = await fixture()
  act(() => window.dispatchEvent(new Event('focus')))
  await tick(COLLECTOR_REFRESH_MS / 3)
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  await tick(COLLECTOR_REFRESH_MS * 2 / 3 + 1)
  expect(f.reads()).toBe(1)
  await tick(COLLECTOR_REFRESH_MS)
  expect(f.reads()).toBe(2)
})
