import { useEffect, useState } from 'react'
import { reloadToUpdate, usePwa } from '../pwa/lifecycle'
import { reloadOlderWindow, UPDATE_STALE, useUpdateNotice } from '../pwa/update-client'
import { useLocation } from '../router'
import { updateRoute } from '../routes'
export default function PwaStatus() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const { waiting, cleanupWarning, updating, updateMessage } = usePwa()
  const notice = useUpdateNotice()
  const { pathname } = useLocation()
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return <>{offline && <p className="pwa-banner" role="status">Offline — reconnect to load sessions and answer</p>}
    {waiting && <div className="pwa-banner" role="status">Update available. {updateRoute(pathname) && <><button className="btn btn-secondary btn-sm" type="button" disabled={updating} onClick={() => { void reloadToUpdate() }}>{updating ? 'Checking windows…' : 'Reload to update'}</button>{updateMessage && <p>{updateMessage}</p>}</>}</div>}
    {(notice.stale || notice.message) && <div className="pwa-banner" role="alert">{notice.stale ? UPDATE_STALE : notice.message} <button className="btn btn-secondary btn-sm" type="button" onClick={notice.stale || !waiting ? reloadOlderWindow : () => { void reloadToUpdate() }}>{notice.stale || !waiting ? 'Reload' : 'Retry'}</button></div>}
    {cleanupWarning && <p className="pwa-banner" role="alert">{cleanupWarning}</p>}</>
}
