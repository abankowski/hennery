import { LABEL, PATH, type View } from '../lib/views'
import { Link } from '../router'
import SignOut from '../components/SignOut'
export default function More({ views }: { views: readonly View[] }) {
  return <section className="overview"><header className="overview-head"><h1>More</h1></header><nav className="more-nav" aria-label="More navigation">{(['mcp', 'hats', 'defaults', 'settings'] as const).filter(v => views.includes(v)).map(v => <Link key={v} to={PATH[v]}>{LABEL[v]}</Link>)}</nav><SignOut /></section>
}
