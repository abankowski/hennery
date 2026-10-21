import { updateRoute } from '../routes'
import { subscribeNavigation } from '../router-events'

const RELOAD_MARKER = 'hennery.update-reload'
export const RELOAD_GRACE_MS = 1500

/** Share one attempt across controller changes and failed lazy imports. The
 * marker survives navigation: an offline/stale reload onto this same build
 * cannot start a loop. A different build gets its own attempt. */
export function reloadOnce(build: string, reload = () => location.reload(), storage?: Pick<Storage, 'getItem' | 'setItem'>): () => boolean {
  return () => {
    try {
      const marker = storage ?? sessionStorage
      if (marker.getItem(RELOAD_MARKER) === build) return false
      marker.setItem(RELOAD_MARKER, build)
    } catch {
      // Without a durable marker we cannot safely retry across navigation.
      return false
    }
    reload()
    return true
  }
}

export function listenForUpdates(reload = () => location.reload()): () => void {
  const build = document.querySelector<HTMLMetaElement>('meta[name="hennery-build"]')?.content
  if (!build) return () => {}
  const attempt = reloadOnce(build, reload)
  const service = 'serviceWorker' in navigator ? navigator.serviceWorker : null
  let previous = service?.controller
  let leaving = false
  let replacement = false
  let routeSkipped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const hide = () => { leaving = true; clearTimeout(timer) }
  const changed = () => {
    const current = service?.controller
    replacement ||= !!previous && !!current && current !== previous
    previous = current
    if (replacement && !leaving) {
      clearTimeout(timer)
      routeSkipped = false
      timer = setTimeout(() => {
        if (leaving) return
        routeSkipped = !updateRoute(location.pathname)
        if (!routeSkipped) attempt()
      }, RELOAD_GRACE_MS)
    }
  }
  const stopNavigation = subscribeNavigation(() => {
    if (routeSkipped && !leaving && updateRoute(location.pathname)) {
      routeSkipped = false
      attempt()
    }
  })
  const show = () => { leaving = false; changed() }
  const failed = (event: Event) => { if (!leaving && attempt()) { clearTimeout(timer); event.preventDefault() } }
  service?.addEventListener('controllerchange', changed)
  window.addEventListener('pagehide', hide)
  window.addEventListener('pageshow', show)
  window.addEventListener('vite:preloadError', failed)
  return () => {
    stopNavigation()
    clearTimeout(timer)
    service?.removeEventListener('controllerchange', changed)
    window.removeEventListener('pagehide', hide)
    window.removeEventListener('pageshow', show)
    window.removeEventListener('vite:preloadError', failed)
  }
}
