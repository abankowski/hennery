import { useEffect } from 'react'
import { pushDevices, vapid } from '../api/device'
import { useClient } from '../app-client'
import { BrowserPush } from '../pwa/device'
import { pushJournal } from '../pwa/journal'
import { usePwa } from '../pwa/lifecycle'

// Best-effort foreground renewal. Every attempt first reads the server row;
// no missing row can be recreated. One timer only while this page is visible.
export default function PushForeground() {
  const client = useClient(), { registration } = usePwa()
  useEffect(() => {
    if (!registration || typeof Notification === 'undefined') return
    let live = true, running = false, timer: ReturnType<typeof setTimeout> | undefined
    const reconcile = async () => {
      if (!live || running || document.visibilityState === 'hidden') return
      running = true; clearTimeout(timer)
      try {
        const observed = await pushJournal().read()
        const [rows, key] = await Promise.all([pushDevices(client), vapid(client)])
        if (!live) return
        const device = new BrowserPush(client, registration, pushJournal(), key.public_key)
        const inspected = await device.reconcile(rows, fetch, observed.generation)
        if (live && inspected.record.rotation && inspected.record.repair !== 'sign_in') {
          timer = setTimeout(() => void reconcile(), Math.max(1000, inspected.record.rotation.nextAt - Date.now()))
        }
      } catch { /* Settings shows repair/connection errors. Focus retries. */ }
      finally { running = false }
    }
    const wake = () => void reconcile()
    window.addEventListener('focus', wake); window.addEventListener('online', wake); document.addEventListener('visibilitychange', wake)
    wake()
    return () => { live = false; clearTimeout(timer); window.removeEventListener('focus', wake); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake) }
  }, [client, registration])
  return null
}
