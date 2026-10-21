import { describe, expect, it } from 'vitest'
import type { HostCatalog } from '../generated/protocol'
import { allCatalogGrants, policyChoices, policyFields, replaceGrant } from './delegationPolicy'
const base: HostCatalog = { agent: 'custom', adapter_revision: '1', freshness: 'fresh', defaults: {}, security: { known: true, axes: { mode: ['safe'], sandbox: [false] } }, config_options: [
  { id: 'permission', category: 'mode', name: 'Permissions', type: 'select', currentValue: 'safe', options: [{ value: 'safe', name: 'Ask first' }] },
  { id: 'sandbox', type: 'boolean', currentValue: false },
  { id: 'effort', type: 'boolean', currentValue: false },
  { id: 'model', category: 'model', type: 'select', currentValue: 'one', options: [{ value: 'one', name: 'One' }] },
] }
describe('execution policy catalog mapping', () => {
  it('grants classified baseline values plus every boolean/select choice, preserving opaque ids', () => {
    const grants = allCatalogGrants([{ ...base, agent: '__proto__', security: { known: true, axes: { mode: ['retired'], sandbox: [false], unmapped: ['baseline'] } } }, base])
    expect(Object.keys(grants)).toEqual(['__proto__', 'custom'])
    expect(grants.__proto__).toEqual({ mode: ['retired', 'safe'], sandbox: [false, true], unmapped: ['baseline'] })
    expect(grants.custom).toEqual({ mode: ['safe'], sandbox: [false, true] })
    expect(Object.getPrototypeOf(grants)).toBe(Object.prototype)
  })
  it('uses trusted classification and maps mode category to wire identity, never a display label', () => {
    expect(policyFields(base).map(f => f.key)).toEqual(['mode', 'sandbox'])
    expect(policyChoices(policyFields(base)[0])).toEqual([{ value: 'safe', label: 'Ask first' }])
    expect(policyChoices(policyFields(base)[1])).toEqual([{ value: false, label: 'Off' }, { value: true, label: 'On' }])
  })
  it('unknown profiles offer explicit policy identification with empty baseline and no model grant', () => {
    expect(policyFields({ ...base, security: { known: false, axes: {} } }).map(f => [f.key, f.baseline])).toEqual([['mode', []], ['effort', []], ['sandbox', []]])
  })
  it('never infers baseline values for an unknown profile even when axes are reported', () => {
    expect(policyFields({ ...base, security: { known: false, axes: base.security.axes } }).every(field => field.baseline.length === 0)).toBe(true)
  })
  it('preserves unrelated grants, explicit false and empty denial; removal restores inheritance', () => {
    const allowed = { other: { sandbox: [false], mode: ['safe'] } }
    const updated = replaceGrant(allowed, 'agent', 'mode', [])
    expect(updated).toEqual({ ...allowed, agent: { mode: [] } })
    expect(replaceGrant(updated, 'agent', 'mode', null)).toEqual(allowed)
    expect(allowed).toEqual({ other: { sandbox: [false], mode: ['safe'] } })
    expect(replaceGrant(allowed, 'other', 'mode', null)).toEqual({ other: { sandbox: [false] } })
  })
  it('treats opaque object-property ids as data without prototype mutation', () => {
    const updated = replaceGrant({}, '__proto__', 'constructor', [false])
    expect(Object.keys(updated)).toEqual(['__proto__'])
    expect(Object.hasOwn(updated.__proto__, 'constructor')).toBe(true)
    expect(Object.getPrototypeOf(updated)).toBe(Object.prototype)
    expect(replaceGrant(updated, '__proto__', 'constructor', null)).toEqual({})
  })
})
