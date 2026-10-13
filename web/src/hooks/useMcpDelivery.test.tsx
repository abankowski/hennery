import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMcpDelivery } from './useMcpDelivery'
import { json, routed } from '../test-stream'
import { sessionDetail } from '../api/view'

const report = (count = 1) => json({ session_id: 's1', agent: 'codex',
  mcp_delivery: { mode: 'unisolated', servers: count, at: '2026-10-13T00:00:00Z' } })

describe('bounded session delivery reads', () => {
  it('reads on open, never on focus or same-lifecycle renders, and refreshes the specified transitions', async () => {
    const t = routed(() => report())
    const { result, rerender } = renderHook(({ lifecycle, resync }) => useMcpDelivery('s1', lifecycle, resync),
      { wrapper: t.wrapper, initialProps: { lifecycle: 'parked', resync: 0 } })
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(1))
    expect(t.calls).toHaveLength(1)
    act(() => window.dispatchEvent(new Event('focus')))
    rerender({ lifecycle: 'parked', resync: 0 })
    expect(t.calls).toHaveLength(1)
    rerender({ lifecycle: 'starting', resync: 0 })
    await waitFor(() => expect(t.calls).toHaveLength(2))
    rerender({ lifecycle: 'active', resync: 0 })
    expect(t.calls).toHaveLength(2)
    rerender({ lifecycle: 'active', resync: 1 })
    await waitFor(() => expect(t.calls).toHaveLength(3))
    act(() => result.current.refresh())
    await waitFor(() => expect(t.calls).toHaveLength(4))
  })

  it('coalesces overlapping invalidations and discards the older answer', async () => {
    const releases: Array<(response: Response) => void> = []
    const t = routed(() => new Promise<Response>((done) => releases.push(done)))
    const { result } = renderHook(() => useMcpDelivery('s1', 'active', 0), { wrapper: t.wrapper })
    expect(t.calls).toHaveLength(1)
    act(() => { result.current.refresh(); result.current.refresh(); result.current.refresh() })
    expect(t.calls).toHaveLength(1)
    await act(async () => releases[0](report(1)))
    await waitFor(() => expect(t.calls).toHaveLength(2))
    expect(result.current.detail).toBeNull()
    await act(async () => releases[1](report(3)))
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(3))
    expect(t.calls).toHaveLength(2)
  })

  it('never shows the previous session and does not continue an unmounted queue', async () => {
    const releases: Array<(response: Response) => void> = []
    const t = routed(() => new Promise<Response>((done) => releases.push(done)))
    const { result, rerender, unmount } = renderHook(({ id }) => useMcpDelivery(id, 'active', 0),
      { wrapper: t.wrapper, initialProps: { id: 's1' } })
    rerender({ id: 's2' })
    expect(result.current.detail).toBeNull()
    await act(async () => releases[1](report(20)))
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(20))
    await act(async () => releases[0](report(10)))
    expect(result.current.detail?.mcp_delivery?.servers).toBe(20)
    act(() => result.current.refresh())
    act(() => result.current.refresh())
    unmount()
    await act(async () => releases[2](report(30)))
    expect(t.calls).toHaveLength(3)
  })

  it('shows a read refusal and discards a stale refusal after a refresh', async () => {
    const t = routed(() => json({ code: 'gone', message: 'Not available' }, 500))
    const { result } = renderHook(() => useMcpDelivery('s1', 'active', 0), { wrapper: t.wrapper })
    await waitFor(() => expect(result.current.error).toBe('Not available'))
    expect(result.current.detail).toBeNull()
  })

  it('does not publish a superseded error', async () => {
    const releases: Array<(response: Response) => void> = []
    const t = routed(() => new Promise<Response>((done) => releases.push(done)))
    const { result } = renderHook(() => useMcpDelivery('s1', 'active', 0), { wrapper: t.wrapper })
    act(() => result.current.refresh())
    await act(async () => releases[0](json({ code: 'failed', message: 'old error' }, 500)))
    expect(result.current.error).toBeNull()
    await act(async () => releases[1](report(4)))
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(4))
  })

  it('shares an in-flight detail read with the existing header and across a remount', async () => {
    let release: (r: Response) => void = () => {}
    const t = routed(() => new Promise<Response>((done) => { release = done }))
    const first = sessionDetail(t.client, 's1')
    const { result } = renderHook(() => useMcpDelivery('s1', undefined, 0), { wrapper: t.wrapper })
    expect(t.calls).toHaveLength(1)
    await act(async () => release(report(2)))
    await first
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(2))
    const next = sessionDetail(t.client, 's1')
    expect(t.calls).toHaveLength(2)
    await act(async () => release(report(3)))
    await next
  })
})
