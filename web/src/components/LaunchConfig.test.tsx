import { expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import LaunchConfig, { catalogAge, requestFor } from './LaunchConfig'
import type { LaunchContext } from './CatalogContext'
import { catalog } from '../test-launch-catalog'

it.each(['loading', 'ready', 'unavailable'] as const)('uses agent defaults immediately without a %s preview', state => {
  const context: LaunchContext = { key: 'context', state, catalog: null, defaults: null }
  expect(requestFor(context, {})).toEqual({})
})

it('uses saved catalogs for operator choices without changing their freshness', () => {
  const saved = { ...catalog, freshness: 'cached' as const, saved_at: 1 }
  expect(requestFor({ key: 'context', state: 'ready', catalog: saved, defaults: null }, { model: 'sonnet' })?.model).toBe('sonnet')
  expect(saved.freshness).toBe('cached')
})

it.each(['loading', 'ready', 'unavailable'] as const)('always sends hat overrides without a %s catalog', state => {
  const context: LaunchContext = { key: 'context', state, catalog: null, defaults: { hat_id: 'hat', agent: 'claude', revision: 1, config: { mode: 'default' } } }
  expect(requestFor(context, {})).toEqual({ mode: 'default' })
})

it('shows the saved catalog age and clamps future observations', () => {
  vi.spyOn(Date, 'now').mockReturnValue(7200_000)
  try {
    expect(catalogAge(undefined)).toBe('')
    expect(catalogAge(8000)).toBe('saved just now')
    expect(catalogAge(7100)).toBe('saved 1 min ago')
    expect(catalogAge(0)).toBe('saved 2 h ago')
  } finally { vi.restoreAllMocks() }
})

it('keeps an unsupported saved permission requirement in the request', () => {
  const context: LaunchContext = { key: 'context', state: 'ready', catalog, defaults: { hat_id: 'hat', agent: 'claude', revision: 1, config: { mode: 'retired-safe-mode' } } }
  expect(requestFor(context, {})?.mode).toBe('retired-safe-mode')
})

it('preserves explicit false for opaque axis names without a catalog', () => {
  const context: LaunchContext = { key: 'context', state: 'loading', catalog: null, defaults: null }
  expect(requestFor(context, JSON.parse('{"__proto__":false}'))?.axes).toEqual(JSON.parse('{"__proto__":false}'))
})

it('updates saved age over time and cleans up its timer', () => {
  vi.useFakeTimers()
  vi.setSystemTime(7200_000)
  try {
    const context: LaunchContext = { key: 'context', state: 'ready', catalog: { ...catalog, saved_at: 7190 }, defaults: null }
    const view = render(<LaunchConfig context={context} picks={{}} onPicks={vi.fn()} expanded={false} onExpanded={vi.fn()} />)
    expect(screen.getByText('saved just now', { exact: true })).toBeVisible()
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(screen.getByText('saved 1 min ago', { exact: true })).toBeVisible()
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  } finally { vi.useRealTimers() }
})
