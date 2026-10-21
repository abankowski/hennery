export const NAVIGATION_EVENT = 'hennery:navigate'

/** Observe both in-app routing and browser history navigation. */
export function subscribeNavigation(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATION_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATION_EVENT, onChange)
  }
}
