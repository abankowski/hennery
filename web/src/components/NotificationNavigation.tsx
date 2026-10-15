import { useEffect, useState } from 'react'
import { listenForNavigation } from '../pwa/navigation'

export default function NotificationNavigation() {
  const [target, setTarget] = useState<string | null>(null)
  useEffect(() => listenForNavigation(setTarget), [])
  return target ? <aside className="notification-link pwa-banner" role="status">Notification received. Your current input is preserved. <a className="btn btn-ghost" href={target} target="_blank" rel="noopener noreferrer">Open notification</a></aside> : null
}
