import { describe, expect, it } from 'vitest'
import { resolveDefaults, securityWarnings } from './defaults'

import { catalog, select } from '../test-launch-catalog'
describe('catalog-aware defaults', () => {
  it('prunes only inherited nonsecurity axes for Opus to Sonnet, preserving policy identities and deliberate effort', () => {
    const result = resolveDefaults(catalog, { model: 'sonnet', axes: { effort: 'high' } }, {}, { revision: 1, allowed: { claude: { sandbox: [true] } } })
    expect(result.config).toEqual({ model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } })
    expect(result.sources.model).toBe('Hat override')
    expect(result.sources.effort).toBe('Hat override')
    expect(result.sources.sandbox).toBe('Agent default')
  })
  it.each(['stored', 'explicit'])('preserves deliberate false as %s even on a different model', source => {
    const result = resolveDefaults(catalog, source === 'stored' ? { model: 'sonnet', axes: { fast: false } } : { model: 'sonnet' }, source === 'explicit' ? { fast: false } : {})
    expect(result.config.axes?.fast).toBe(false)
    expect(result.sources.fast).toBe(source === 'stored' ? 'Hat override' : 'Your choice')
  })
  it('omits unavailable stored values visibly without changing the stored record', () => {
    const saved = { model: 'removed', axes: { effort: 'medium' } }
    const result = resolveDefaults(catalog, saved)
    expect(result.config.model).toBe('opus')
    expect(result.config.axes?.effort).toBe('low')
    expect(result.notices).toHaveLength(2)
    expect(result.blocked).toBe(false)
    expect(saved.model).toBe('removed')
  })
  it('blocks invalid explicit choices instead of silently converting them to inheritance', () => {
    const result = resolveDefaults(catalog, {}, { model: 'removed', effort: 'medium' })
    expect(result.blocked).toBe(true)
    expect(result.notices).toHaveLength(2)
  })
  it('resets an individual choice to agent inheritance without reintroducing the hat override', () => {
    const result = resolveDefaults(catalog, { model: 'sonnet', mode: 'bypass' }, { model: null, mode: null })
    expect(result.config.model).toBe('opus')
    expect(result.config.mode).toBe('default')
    expect(result.sources.model).toBe('Agent default')
  })
  it('uses category identity, never friendly labels, for model/mode and profile security warnings', () => {
    const other = { ...catalog, config_options: [select('custom-model', ['opus', 'sonnet'], 'model'), select('permission', ['default', 'bypass'], 'mode')] }
    const result = resolveDefaults(other, { model: 'sonnet', mode: 'bypass' })
    expect(result.config).toEqual({ model: 'sonnet', mode: 'bypass' })
    expect(result.warnings).toHaveLength(1)
    expect(securityWarnings({ ...catalog, security: { known: false, axes: {} } }, {})).toHaveLength(1)
    expect(securityWarnings(catalog, { mode: 'default' })).toEqual([])
  })
  it('preserves baseline security axes even without an execution-policy grant', () => {
    const result = resolveDefaults({ ...catalog, security: { known: true, axes: { mode: ['default'], sandbox: [true] } } }, {}, { model: 'sonnet' })
    expect(result.config.axes).toEqual({ sandbox: true })
    expect(result.sources.model).toBe('Your choice')
  })
})
it('does not send unsupported baseline shapes and blocks unrepresentable security requirements', () => {
  const result = resolveDefaults({ ...catalog, config_options: [], security: { known: true, axes: { mode: ['default'] } } }, {})
  expect(result.config).toEqual({})
  expect(result.blocked).toBe(true)
  expect(result.notices.length).toBeGreaterThan(0)
})
it('preserves boolean false for opaque axis ids, including JavaScript object names', () => {
  const special = { ...catalog, config_options: [...catalog.config_options, { id: '__proto__', name: 'Custom', type: 'boolean', currentValue: true }] }
  const result = resolveDefaults(special, { axes: JSON.parse('{"__proto__":false}') })
  expect(Object.hasOwn(result.config.axes!, '__proto__')).toBe(true)
  expect(result.config.axes!['__proto__']).toBe(false)
})
it('requires read-back of profile security defaults even when the catalog has other usable settings', async () => {
  const { usableCatalog } = await import('./defaults')
  expect(usableCatalog(catalog)).toBe(true)
  expect(usableCatalog({ ...catalog, defaults: { model: 'opus' } })).toBe(false)
  expect(usableCatalog({ ...catalog, defaults: { ...catalog.defaults, axes: { sandbox: false } }, security: { known: true, axes: { sandbox: [false] } } })).toBe(false)
  const off = { ...catalog, config_options: [{ id: 'sandbox', name: 'Sandbox', type: 'boolean', currentValue: false }], defaults: { axes: { sandbox: false } }, security: { known: true, axes: { sandbox: [false] } } }
  expect(usableCatalog(off)).toBe(true)
})
it.each(['stale', 'unknown'] as const)('refuses a %s pre-start catalog instead of promising its choices', async freshness => {
  const { usableCatalog } = await import('./defaults')
  expect(usableCatalog({ ...catalog, freshness })).toBe(false)
})
it('requires an adapter revision and a nonempty supported settings list', async () => {
  const { usableCatalog } = await import('./defaults')
  expect(usableCatalog({ ...catalog, adapter_revision: '' })).toBe(false)
  expect(usableCatalog({ ...catalog, config_options: [], defaults: {}, security: { known: false, axes: {} } })).toBe(false)
})
it('excludes incompatible model shapes and axis ids that collide with a wire role', async () => {
  const { fieldsOf, usableCatalog } = await import('./defaults')
  const malformed = { ...catalog, config_options: [
    { id: 'model', name: 'Model', category: 'model', type: 'boolean', currentValue: false },
    select('permission', ['default', 'bypass'], 'mode'),
    select('mode', ['low', 'high'], 'thought_level'),
  ] }
  expect(fieldsOf(malformed).map(field => [field.key, field.option.id])).toEqual([['mode', 'permission']])
  expect(usableCatalog(malformed)).toBe(false)
  expect(resolveDefaults(malformed, {}, { mode: 'bypass' }).config).toEqual({ mode: 'bypass' })
})
