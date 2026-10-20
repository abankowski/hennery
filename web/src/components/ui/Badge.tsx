import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { useAccentStyle } from '../../lib/theme'
export type Status = 'wait' | 'run' | 'start' | 'idle' | 'park' | 'fail' | 'warn'
const glyphs: Record<Status, IconName> = { wait: 'hand-raised', run: 'play-circle', start: 'arrow-path', idle: 'check-circle', park: 'pause', fail: 'exclamation-circle', warn: 'shield-exclamation' }
export function StatusBadge({ status, children }: { status: Status; children: ReactNode }) {
  return <span className={`ui-status ui-status-${status}`}><Icon name={glyphs[status]} variant="16/solid" size={14} />{children}</span>
}
export function Keycap({ children }: { children: ReactNode }) { return <kbd className="ui-keycap">{children}</kbd> }
export function CountPill({ count, label }: { count: number; label: string }) { return <span className="ui-count" aria-label={`${count} ${label}`}>{count}</span> }
export function ConfigChip({ inherited, children }: { inherited: boolean; children: ReactNode }) { return <span className={`ui-chip ui-chip-${inherited ? 'inherits' : 'override'}`}>{children}</span> }
export function HatChip({ colour, children }: { colour?: string; children: ReactNode }) {
  const style = useAccentStyle(colour)
  return <span className="ui-hat hn-accent-scope" style={style}><span className="ui-hat-swatch" aria-hidden="true" />{children}</span>
}
