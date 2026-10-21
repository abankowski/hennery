// A small router for real links (frontend spec §2): a push or a reload opens
// the view its URL names (F-19). History API only; no dependency.
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type Ref } from 'react'
import { safeNext } from './api/next'

export type RouteName =
  | 'setup'
  | 'login'
  | 'sessions'
  | 'needs-you'
  | 'more'
  | 'defaults'
  | 'session'
  | 'new'
  | 'hosts'
  | 'mcp'
  | 'hats'
  | 'settings'
  | 'not_found'

export interface Route {
  name: RouteName
  /** `/sessions/:id`'s id, decoded. */
  id?: string
}

const STATIC: Record<string, RouteName> = {
  '/setup': 'setup',
  '/login': 'login',
  '/sessions': 'sessions',
  '/needs-you': 'needs-you',
  '/more': 'more',
  '/defaults': 'defaults',
  '/new': 'new',
  '/hosts': 'hosts',
  '/mcp': 'mcp',
  '/hats': 'hats',
  '/settings': 'settings',
}

/** The route `pathname` names. A trailing slash is the same route. */
export function match(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (path === '/') return { name: 'sessions' }
  const name = STATIC[path]
  if (name) return { name }
  const session = /^\/sessions\/([^/]+)$/.exec(path)
  if (session) {
    try {
      return { name: 'session', id: decodeURIComponent(session[1]) }
    } catch {
      return { name: 'not_found' }
    }
  }
  return { name: 'not_found' }
}

const CHANGE = 'hennery:navigate'

/** Go to `to`, a path of this app: a new history entry, or this one
 *  replaced. */
export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const before = location.pathname + location.search
  const source = match(location.pathname).name
  const state = to.split('?')[0] === '/new' && !['setup', 'login', 'new', 'not_found'].includes(source) ? { launcherFrom: before } : null
  if (options.replace) history.replaceState(state, '', to)
  else history.pushState(state, '', to)
  window.dispatchEvent(new Event(CHANGE))
}

/** R4's route frame consumes this safe return seam; never Back into a foreign site. */
export function launcherReturn(): string {
  const raw: unknown = history.state?.launcherFrom
  const path = safeNext(typeof raw === 'string' ? raw : null, location.origin)
  const name = match(path.split('?')[0]).name
  return ['setup', 'login', 'new', 'not_found'].includes(name) ? '/sessions' : path
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(CHANGE, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(CHANGE, onChange)
  }
}

const snapshot = () => location.pathname + location.search

/** The current path and query; re-renders on every navigation. */
export function useLocation(): { pathname: string; search: string } {
  const href = useSyncExternalStore(subscribe, snapshot)
  const at = href.indexOf('?')
  return at < 0 ? { pathname: href, search: '' } : { pathname: href.slice(0, at), search: href.slice(at) }
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; ref?: Ref<HTMLAnchorElement> }

/** An `<a>` that navigates inside the app, leaving modified clicks (new
 *  tab, new window) to the browser. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={go} {...rest} />
}
