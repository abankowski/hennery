import { Link } from '../router'
import type { DeploymentMode } from '../generated/protocol'
import { LABEL, PATH, tabsOf, type View } from '../lib/views'
import { Icon } from './ui'
import { NAV_ICON } from './NavigationRail'
import { WaitingBadge } from './SessionScope'
export default function BottomNavigation({ mode, current }: { mode: DeploymentMode; current: View | null }) {
  return <nav className="tabbar" aria-label="Primary navigation">{tabsOf(mode).map(v => <Link key={v} to={PATH[v]} className={'tab' + (v === current ? ' on' : '')} aria-label={v === 'new' ? 'New' : LABEL[v]} aria-current={v === current ? 'page' : undefined}><Icon name={NAV_ICON[v]} size={20} /><span>{v === 'new' ? 'New' : LABEL[v]}</span>{v === 'needs-you' && <WaitingBadge />}</Link>)}</nav>
}
