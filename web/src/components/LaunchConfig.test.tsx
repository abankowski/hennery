import { expect, it, vi } from 'vitest'
import { catalogAge, requestFor } from './LaunchConfig'
import type { LaunchContext } from './CatalogContext'
import { catalog } from '../test-launch-catalog'

it.each(['loading', 'ready', 'unavailable'] as const)('uses agent defaults immediately without a %s preview', state => {
  const context: LaunchContext = { key: 'context', state, catalog: null, defaults: null }
  expect(requestFor(context, { model: 'previous-context' }, false)).toEqual({})
})

it('uses saved catalogs for operator choices without changing their freshness', () => {
  const saved = { ...catalog, freshness: 'cached' as const, saved_at: 1 }
  expect(requestFor({ key: 'context', state: 'ready', catalog: saved, defaults: null }, { model: 'sonnet' }, false)?.model).toBe('sonnet')
  expect(saved.freshness).toBe('cached')
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
