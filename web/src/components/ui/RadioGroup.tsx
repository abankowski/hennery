import { useId, type ReactNode } from 'react'
export function RadioGroup<T extends string>({ label, value, options, onChange, disabled = false }: {
  label: string; value: T; options: readonly { value: T; label: ReactNode }[]; onChange: (value: T) => void; disabled?: boolean
}) {
  const name = useId()
  return <fieldset className="ui-radio-group" disabled={disabled}><legend>{label}</legend>{options.map((option) => <label className="ui-radio" key={option.value}><input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />{option.label}</label>)}</fieldset>
}
