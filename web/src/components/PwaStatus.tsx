import { useEffect, useState } from 'react'
import { reloadToUpdate, usePwa } from '../pwa/lifecycle'
export default function PwaStatus() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const { waiting, cleanupWarning, updating, updateMessage } = usePwa()
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return <>{offline && <p className="pwa-banner" role="status">Offline — reconnect to load sessions and answer</p>}
    {waiting && <div className="pwa-banner" role="status">Update available. <button className="btn btn-secondary btn-sm" type="button" disabled={updating} onClick={() => { void reloadToUpdate() }}>{updating ? 'Checking windows…' : 'Reload to update'}</button>{updateMessage && <p>{updateMessage}</p>}</div>}
    {cleanupWarning && <p className="pwa-banner" role="alert">{cleanupWarning}</p>}</>
}
