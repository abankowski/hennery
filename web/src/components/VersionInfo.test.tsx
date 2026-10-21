import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import VersionInfo, { CollectorVersionContext } from './VersionInfo'

it('renders a muted mismatch hint and keeps both identities after a collector refresh', () => {
  const view = render(<CollectorVersionContext.Provider value={{ collector_version: '9.0.0', source_commit: 'abcdef1234567890abcdef1234567890abcdef12' }}><VersionInfo /></CollectorVersionContext.Provider>)
  expect(screen.getByText('hennery 9.0.0 · abcdef12', { exact: true })).toBeVisible()
  expect(screen.getByText(`page ${__PAGE_VERSION__} · server 9.0.0`, { exact: true })).toBeVisible()
  view.rerender(<CollectorVersionContext.Provider value={{ collector_version: __PAGE_VERSION__ }}><VersionInfo /></CollectorVersionContext.Provider>)
  expect(screen.getByText(`hennery ${__PAGE_VERSION__}`, { exact: true })).toBeVisible()
  expect(screen.queryByText(`page ${__PAGE_VERSION__} · server 9.0.0`, { exact: true })).toBeNull()
})
