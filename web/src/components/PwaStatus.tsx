import { useEffect, useState } from 'react'
import { usePwa } from '../pwa/lifecycle'
export default function PwaStatus() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const { waiting, cleanupWarning } = usePwa()
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return <>{offline && <p className="pwa-banner" role="status">Offline — reconnect to load sessions and answer</p>}
    {waiting && <p className="pwa-banner" role="status">Update available. Close all hennery windows and reopen to update.</p>}
    {cleanupWarning && <p className="pwa-banner" role="alert">{cleanupWarning}</p>}</>
}
