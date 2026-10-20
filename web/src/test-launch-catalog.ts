import type { HostCatalog } from './generated/protocol'
export const select = (id: string, values: string[], category?: string) => ({ id, name: id, category, type: 'select', currentValue: values[0], options: values.map(value => ({ value, name: value })) })
export const catalog: HostCatalog = {
  agent: 'claude', adapter_revision: 'pin-1', freshness: 'fresh',
  config_options: [select('model', ['opus', 'sonnet']), select('mode', ['default', 'bypass']), select('effort', ['low', 'high']), { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false }, { id: 'sandbox', name: 'Sandbox', type: 'boolean', currentValue: true }],
  defaults: { model: 'opus', mode: 'default', axes: { fast: false, effort: 'low', sandbox: true } },
  security: { known: true, axes: { mode: ['default'] } },
}
