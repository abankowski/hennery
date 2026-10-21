import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PwaStatus from './PwaStatus'
import * as lifecycle from '../pwa/lifecycle'
afterEach(() => vi.restoreAllMocks())
it('keeps the offline banner and logout cleanup warning', () => {
  vi.spyOn(lifecycle, 'usePwa').mockReturnValue({ registration: null, error: null, cleanupWarning: 'Cleanup failed. Retry sign out.' })
  const view = render(<PwaStatus />)
  try {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(screen.getByRole('status')).toHaveTextContent('Offline — reconnect to load sessions and answer')
    expect(screen.getByRole('alert')).toHaveTextContent('Cleanup failed. Retry sign out.')
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(screen.queryByRole('status')).toBeNull()
  } finally { view.unmount() }
})
