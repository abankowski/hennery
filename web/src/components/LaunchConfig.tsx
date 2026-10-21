import { useId, useRef } from 'react'
import type { ConfigValue, SessionConfig } from '../generated/protocol'
import type { ConfigOption } from '../lib/catalog'
import { fieldsOf, flatConfig, resolveDefaults, type Picks, valueLabel } from '../lib/defaults'
import type { LaunchContext } from './CatalogContext'
import ComposerSettings, { SettingsSummary } from './ComposerSettings'
import { modelLabel } from '../lib/agent'

export function ConfigControl({ option, value, inherited, disabled, onChange }: { option: ConfigOption; value: ConfigValue | undefined; inherited: boolean; disabled?: boolean; onChange: (value: ConfigValue) => void }) {
  const id = useId()
  if (option.kind === 'boolean') return <label className="config-boolean" htmlFor={id}><input id={id} type="checkbox" checked={value === true} disabled={disabled} onChange={e => onChange(e.target.checked)} />{option.name}{inherited ? ' · inherited' : ''}</label>
  const known = typeof value === 'string' && option.choices.some(c => c.value === value)
  return <div className="config-select"><label htmlFor={id}>{option.name}</label><select id={id} disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
    {!known && <option value={typeof value === 'string' ? value : ''}>{value === undefined ? 'Agent default' : `${String(value)} · unavailable`}</option>}
    {option.choices.map(choice => <option key={choice.value} value={choice.value}>{choice.name}</option>)}
  </select></div>
}
export default function LaunchConfig({ context, picks, onPicks, optOut, onOptOut, retry, expanded, onExpanded }: {
  context: LaunchContext; picks: Picks; onPicks: (picks: Picks) => void; optOut: boolean; onOptOut: (value: boolean) => void; retry: () => void; expanded: boolean; onExpanded: (value: boolean) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const result = context.catalog ? resolveDefaults(context.catalog, context.defaults?.config ?? {}, picks) : null
  const effective = flatConfig(result?.config ?? {})
  const requested = Object.keys(picks).filter(key => picks[key] !== null)
  const summaryFields = fieldsOf(context.catalog).filter(({ key, option }) => Object.hasOwn(effective, key) && (['model', 'mode', 'effort', 'reasoning_effort'].includes(key) || ['model', 'mode', 'thought_level'].includes(option.category ?? '')))
  const summary = summaryFields.map(({ key }) => modelLabel(valueLabel(context.catalog, key, effective[key]))).join(' · ')
  const warning = context.state === 'unavailable' || !!result?.blocked || !!result?.notices.length || !!result?.warnings.length
  const mode = summaryFields.find(({ key, option }) => key === 'mode' || option.category === 'mode')
  return <section className="launch-config" aria-label="Session settings"><SettingsSummary trigger={trigger} summary={context.state === 'loading' ? 'Loading…' : summary || 'Agent defaults'} expanded={expanded} open={() => onExpanded(true)} warning={warning} launch />
    {expanded && <ComposerSettings trigger={trigger} close={() => onExpanded(false)}>
    {context.state === 'loading' ? <p role="status">Loading session settings…</p> : context.state !== 'ready' ? <><p role="alert">Settings are unavailable. {context.error}</p><button type="button" className="btn btn-secondary" onClick={retry}>Retry settings</button><label className="opt-out"><input type="checkbox" checked={optOut} onChange={e => onOptOut(e.target.checked)} />Use agent defaults for this start</label><p className="hint">No saved or chosen settings will be sent. The agent’s configuration will not be verified.</p></> : <>
      <p className="config-readback">Requested for this start: <bdi>{summary || 'Agent defaults'}</bdi></p>
      {fieldsOf(context.catalog).length < (context.catalog?.config_options.length ?? 0) && <p className="hint">Some reported settings cannot be represented here. Review them in the agent.</p>}
      {expanded && <div className="config-fields">{fieldsOf(context.catalog).map(({ key, option }) => <div className="config-field" key={key}><ConfigControl option={option} value={effective[key]} inherited={!requested.includes(key)} onChange={value => onPicks({ ...picks, [key]: value })} /><span className="config-source">{result?.sources[key] ?? 'Agent default'}</span>{(requested.includes(key) || result?.sources[key] === 'Hat override') && <button type="button" className="btn btn-ghost" onClick={() => onPicks({ ...picks, [key]: null })}>Use agent default for {option.name}</button>}</div>)}</div>}
      {result?.notices.map(notice => <p role={result.blocked ? 'alert' : 'status'} key={notice}><bdi>{notice}</bdi></p>)}
      {!!result?.warnings.length && <p className="config-warning"><span aria-hidden="true">⚠ </span>{mode ? `${valueLabel(context.catalog, mode.key, effective[mode.key])}: the agent won't ask before acting.` : 'These settings give the agent more permission to act.'}</p>}
    </>}
    </ComposerSettings>}
  </section>
}
export function requestFor(context: LaunchContext, picks: Picks, optOut: boolean): SessionConfig | null {
  if (context.state !== 'ready' || !context.catalog) return optOut && context.state === 'unavailable' ? {} : null
  const result = resolveDefaults(context.catalog, context.defaults?.config ?? {}, picks)
  return result.blocked ? null : result.config
}
