import type { ConfigValue } from '../generated/protocol'
import type { Choice, ConfigOption } from '../lib/catalog'

/** One config option: a select of its values, or an on/off box. */
export default function SessionConfig({
  option,
  value,
  busy,
  onPick,
}: {
  option: ConfigOption
  value: ConfigValue
  busy: boolean
  onPick: (value: ConfigValue) => void
}) {
  if (option.kind === 'boolean') {
    return (
      <label className="switcher">
        <input type="checkbox" checked={value === true} disabled={busy} onChange={(e) => onPick(e.target.checked)} />
        <bdi>{option.name}</bdi>
      </label>
    )
  }
  if ((option.category === 'thought_level' || option.id === 'reasoning_effort' || option.id === 'effort') && option.choices.length > 0 && option.choices.length <= 5 && option.choices.every(c => !c.group) && option.choices.some(c => c.value === value)) {
    return <fieldset className="session-effort"><legend>{option.name}</legend>{option.choices.map(choice => <label key={choice.value}><input type="radio" name={option.id} value={choice.value} checked={value === choice.value} disabled={busy} onChange={() => onPick(choice.value)} /><span>{choice.name}</span></label>)}</fieldset>
  }
  const current = String(value)
  // A value the adapter reports but does not list is still shown as held.
  const listed: Choice[] = option.choices.some((c) => c.value === current)
    ? option.choices
    : [{ value: current, name: current }, ...option.choices]
  const groups: { name?: string; choices: Choice[] }[] = []
  for (const c of listed) {
    const last = groups[groups.length - 1]
    if (last && last.name === c.group) last.choices.push(c)
    else groups.push({ name: c.group, choices: [c] })
  }
  const render = (c: Choice) => (
    <option key={c.value} value={c.value} title={c.description}>
      {c.name}
    </option>
  )
  return (
    <label className="switcher">
      <bdi>{option.name}</bdi>
      <select aria-label={option.name} value={current} disabled={busy} onChange={(e) => onPick(e.target.value)}>
        {groups.map((g, i) =>
          g.name === undefined ? (
            g.choices.map(render)
          ) : (
            <optgroup key={`${i}-${g.name}`} label={g.name}>
              {g.choices.map(render)}
            </optgroup>
          ),
        )}
      </select>
    </label>
  )
}
