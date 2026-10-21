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

/** App documents that take part in coordinated updates. Auth pages have no app state. */
export function updateRoute(pathname: string): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/mcp/')) return false
  return !['setup', 'login', 'not_found'].includes(match(pathname).name)
}
