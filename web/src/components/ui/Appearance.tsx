import { cycleAppearance, setAppearance, useAppearance } from '../../lib/theme'
import { Icon } from './Icon'
import { Button, IconButton } from './Button'
import { RadioGroup } from './RadioGroup'
export function AppearanceOptions() {
  const { preference } = useAppearance()
  return <div className="ui-appearance"><RadioGroup label="Appearance" value={preference} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={setAppearance} /><span className="ui-theme-announcement" role="status">Appearance: {preference}</span></div>
}
/** R2 rail / R5 Settings / R6 shortcuts all use the same preference cycle. */
export function AppearanceButton({ compact = false }: { compact?: boolean }) {
  const { preference, resolved } = useAppearance()
  const label = `Appearance: ${preference}. Change appearance`, icon = resolved === 'dark' ? 'moon' : 'sun'
  return <>{compact ? <IconButton variant="ghost" icon={icon} label={label} title={label} onClick={cycleAppearance} /> : <Button variant="ghost" title={label} onClick={cycleAppearance} aria-label={label}><Icon name={icon} />{preference}</Button>}<span className="ui-theme-announcement" role="status">Appearance: {preference}</span></>
}
