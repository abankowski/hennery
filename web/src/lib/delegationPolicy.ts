import type { ConfigValue, ExecutionPolicy, HostCatalog } from '../generated/protocol'
import { configOptions, type ConfigOption } from './catalog'

export interface PolicyField { key: string; option: ConfigOption; baseline: ConfigValue[] }
/** Use the same category/legacy-id ordering as the shared catalog parser. */
export function policyFields(catalog: HostCatalog): PolicyField[] {
  const options = configOptions({ session_id: '', config_options: catalog.config_options, commands: [] })
  const mode = options.find(o => o.category === 'mode') ?? options.find(o => o.id === 'mode' && (!o.category || o.category.startsWith('_')))
  const model = options.find(o => o.category === 'model') ?? options.find(o => o.id === 'model' && (!o.category || o.category.startsWith('_')))
  return options.filter(o => o !== model).flatMap(option => {
    const key = option === mode ? 'mode' : option.id
    if (catalog.security.known && !Object.hasOwn(catalog.security.axes, key)) return []
    return [{ key, option, baseline: catalog.security.known ? catalog.security.axes[key] ?? [] : [] }]
  })
}
export const policyChoices = (field: PolicyField): { value: ConfigValue; label: string }[] => field.option.kind === 'boolean'
  ? [{ value: false, label: 'Off' }, { value: true, label: 'On' }]
  : field.option.choices.map(choice => ({ value: choice.value, label: choice.name }))

/** The switch grants the union of current classifications and their choices.
 *  Maps keep opaque runtime/axis ids, including __proto__, as data. */
export function allCatalogGrants(catalogs: HostCatalog[]): ExecutionPolicy['allowed'] {
  const runtimes = new Map<string, Map<string, Set<ConfigValue>>>()
  for (const catalog of catalogs) {
    const axes = runtimes.get(catalog.agent) ?? new Map<string, Set<ConfigValue>>()
    runtimes.set(catalog.agent, axes)
    const add = (key: string, values: ConfigValue[]) => {
      const union = axes.get(key) ?? new Set<ConfigValue>()
      for (const value of values) union.add(value)
      axes.set(key, union)
    }
    for (const [key, values] of Object.entries(catalog.security.axes)) add(key, values)
    for (const field of policyFields(catalog)) add(field.key, policyChoices(field).map(choice => choice.value))
  }
  return Object.fromEntries([...runtimes].map(([runtime, axes]) => [runtime, Object.fromEntries([...axes].map(([key, values]) => [key, [...values]]))]))
}

/** A deliberate per-axis edit preserves every unrelated runtime and setting. */
export function replaceGrant(allowed: ExecutionPolicy['allowed'], agent: string, key: string, values: ConfigValue[] | null): ExecutionPolicy['allowed'] {
  const next = structuredClone(allowed)
  if (values === null) {
    if (Object.hasOwn(next, agent)) {
      delete next[agent][key]
      if (Object.keys(next[agent]).length === 0) delete next[agent]
    }
  } else {
    // Object.fromEntries also handles opaque runtime/axis ids such as __proto__.
    const axes = Object.hasOwn(next, agent) ? next[agent] : {}
    return Object.fromEntries([...Object.entries(next).filter(([id]) => id !== agent), [agent, Object.fromEntries([...Object.entries(axes).filter(([id]) => id !== key), [key, values]])]])
  }
  return next
}
