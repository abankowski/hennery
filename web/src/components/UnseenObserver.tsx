import { useEffect, useRef } from 'react'
import { useClient } from '../app-client'
import { markSessionSeen } from '../api/view'

/** A rendered, visible tail in a focused tab acknowledges only the activity
 * already received by the transcript. List/preview reads never acknowledge. */
export default function UnseenObserver({ id, eventId, revision }: { id: string; eventId: number; revision: number }) {
  const client = useClient(), ref = useRef<HTMLDivElement>(null)
  const acknowledged = useRef(0)
  useEffect(() => {
    if (revision < eventId || acknowledged.current >= eventId) return
    const el = ref.current, root = el?.closest<HTMLElement>('.transcript')
    if (!el || !root) return
    let alive = true, sending = false
    const check = () => {
      if (!alive || sending || acknowledged.current >= eventId || document.visibilityState !== 'visible' || !document.hasFocus()) return
      const box = el.getBoundingClientRect(), viewport = root.getBoundingClientRect()
      if (box.width <= 0 || box.height <= 0 || viewport.height <= 0
        || box.top < Math.max(0, viewport.top) || box.bottom > Math.min(window.innerHeight, viewport.bottom)
        || box.left >= Math.min(window.innerWidth, viewport.right) || box.right <= Math.max(0, viewport.left)) return
      sending = true
      void markSessionSeen(client, id, eventId).then(() => { acknowledged.current = Math.max(acknowledged.current, eventId) })
        .catch(() => { /* Retry on the next focus, scroll or visibility change. */ })
        .finally(() => { sending = false })
    }
    // Coalesce streamed chunks, and allow layout/scroll anchoring to settle.
    let timer: number
    const schedule = () => { clearTimeout(timer); timer = window.setTimeout(check, 250) }
    schedule()
    root.addEventListener('scroll', schedule)
    window.addEventListener('focus', schedule)
    window.addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', schedule)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(schedule, { root })
    observer?.observe(el)
    return () => {
      alive = false; clearTimeout(timer); observer?.disconnect()
      root.removeEventListener('scroll', schedule); window.removeEventListener('focus', schedule)
      window.removeEventListener('resize', schedule); document.removeEventListener('visibilitychange', schedule)
    }
  }, [client, id, eventId, revision])
  return <div ref={ref} className="unseen-sentinel" aria-hidden="true" style={{ height: 1 }} />
}
