import { cycleAppearance, setAppearance, useAppearance } from '../../lib/theme'
import { Icon } from './Icon'
import { Button } from './Button'
import { RadioGroup } from './RadioGroup'
export function AppearanceOptions() {
  const { preference } = useAppearance()
  return <div className="ui-appearance"><RadioGroup label="Appearance" value={preference} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={setAppearance} /><span className="ui-theme-announcement" role="status">Appearance: {preference}</span></div>
}
/** R2 rail / R5 Settings / R6 shortcuts all use the same preference cycle. */
export function AppearanceButton() {
  const { preference, resolved } = useAppearance()
  return <><Button variant="ghost" onClick={cycleAppearance} aria-label={`Appearance: ${preference}. Change appearance`}><Icon name={resolved === 'dark' ? 'moon' : 'sun'} />{preference}</Button><span className="ui-theme-announcement" role="status">Appearance: {preference}</span></>
}
