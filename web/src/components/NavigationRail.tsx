import { useSessionScope, WaitingBadge } from './SessionScope'
import { Link } from '../router'
import { LABEL, PATH, type View } from '../lib/views'
import { AppearanceButton, HatChip, Icon, type IconName } from './ui'
import CommandEntry from './CommandEntry'
import { McpBadge } from './McpScope'
import SignOut from './SignOut'
import VersionInfo from './VersionInfo'
export const NAV_ICON: Record<View, IconName> = { 'needs-you': 'hand-raised', sessions: 'rectangle-stack', new: 'plus', defaults: 'adjustments-horizontal', hosts: 'server-stack', mcp: 'puzzle-piece', hats: 'rectangle-stack', settings: 'adjustments-horizontal', more: 'ellipsis-horizontal' }
export default function NavigationRail({ views, current, collapsed, toggle }: { views: readonly View[]; current: View | null; collapsed: boolean; toggle: () => void }) {
  const scope = useSessionScope()
  const hosts = scope?.hosts?.filter(h => h.revoked_at == null)
  const navigation = (view: View) => <Link key={view} to={PATH[view]} aria-label={LABEL[view]} title={LABEL[view]} className={'nav-item' + (current === view ? ' on' : '')} aria-current={current === view ? 'page' : undefined}><Icon name={NAV_ICON[view]} size={18} /><span className="nav-label">{view === 'sessions' ? 'All sessions' : LABEL[view]}</span>{view === 'needs-you' && <WaitingBadge />}{view === 'mcp' && <McpBadge />}</Link>
  const hatLinks = scope ? [{ id: '', name: 'All hats', colour: undefined }, ...(scope.hats ?? [])] : []
  return <aside className={'rail' + (collapsed ? ' rail-collapsed' : '')} aria-label="Views">
    <div className="rail-head"><span className="brand-name" title="hennery">hennery</span><button type="button" className="rail-collapse" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={toggle}><Icon name={collapsed ? 'chevron-double-right' : 'chevron-double-left'} size={18} /></button></div>
    <CommandEntry compact={collapsed} />
    <nav className="rail-nav" aria-label="Main navigation">
      <div>{views.filter(view => ['needs-you', 'sessions', 'new'].includes(view)).map(navigation)}</div>
      {scope && <div className="rail-hats"><div className="nav-label nav-section-label">Hats</div>{hatLinks.map(hat => {
        const loaded = scope.list.shown.filter(s => !hat.id || s.hat_id === hat.id)
        const waiting = scope.attentionRows.filter(s => (!hat.id || s.hat_id === hat.id) && !scope.isAttentionDismissed(s.session_id)).length
        const count = `${loaded.length} ${loaded.length === 1 ? 'session' : 'sessions'}${scope.list.hasMore || scope.list.loading ? ' shown' : ''}`
        return <Link key={hat.id} to={`/sessions?hat=${encodeURIComponent(hat.id)}`} className={'rail-hat' + (scope.hat === hat.id ? ' on' : '')} aria-label={hat.name} title={`${hat.name} · ${count} · ${waiting} need you`}><HatChip colour={hat.colour}><span className="nav-label"><bdi>{hat.name}</bdi></span></HatChip><span className="nav-label hat-loaded">{count}</span>{waiting > 0 && <span className="hat-attention" aria-label={`${waiting} shown sessions need you`}>●</span>}</Link>
      })}</div>}
      <div><div className="nav-label nav-section-label">Configure</div>{views.filter(view => !['more', 'needs-you', 'sessions', 'new'].includes(view)).map(navigation)}</div>
    </nav>
    <div className="rail-foot"><VersionInfo /><span className="owner-mark">O<span className="nav-label">Owner</span></span>{scope && <span className="host-fraction" title="Online / owned non-revoked hosts">{hosts ? `${hosts.filter(h => h.connected).length}/${hosts.length} hosts online` : 'Hosts unknown'}</span>}<AppearanceButton />{current !== 'settings' && current !== 'more' && <SignOut />}</div>
  </aside>
}
