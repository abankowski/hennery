// Delivery metadata has no SSE delta. Only explicit lifecycle/resync
// boundaries trigger a read; streamed messages and focus never do.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { sessionDetail } from '../api/view'
import { messageOf } from '../api/errors'
import type { SessionDetail } from '../generated/protocol'
import { runningLifecycle } from '../lib/mcpDelivery'

interface ReadState { id: string; detail: SessionDetail | null; error: string | null }

export function useMcpDelivery(id: string, lifecycle: string | undefined, resync: number) {
  const client = useClient()
  const [state, setState] = useState<ReadState>({ id, detail: null, error: null })
  const request = useRef<(() => void) | null>(null)
  const previous = useRef<{ id: string; lifecycle: string | undefined; resync: number } | null>(null)
  const refresh = useCallback(() => request.current?.(), [])

  useEffect(() => {
    let live = true
    let wanted = 0
    let busy = false
    setState({ id, detail: null, error: null })
    const run = async () => {
      if (busy) return
      busy = true
      while (live) {
        const generation = wanted
        try {
          const detail = await sessionDetail(client, id)
          if (live && generation === wanted) setState({ id, detail, error: null })
        } catch (err) {
          if (live && generation === wanted) setState({ id, detail: null, error: messageOf(err) })
        }
        if (generation === wanted) break
      }
      busy = false
    }
    request.current = () => { wanted++; void run() }
    request.current()
    return () => { live = false; request.current = null }
  }, [client, id])

  useEffect(() => {
    const before = previous.current
    previous.current = { id, lifecycle, resync }
    if (!before || before.id !== id) return
    const resumed = before.lifecycle !== undefined && !runningLifecycle(before.lifecycle) && runningLifecycle(lifecycle)
    if (resync !== before.resync || resumed) refresh()
  }, [id, lifecycle, resync, refresh])

  return {
    detail: state.id === id ? state.detail : null,
    error: state.id === id ? state.error : null,
    refresh,
  }
}
