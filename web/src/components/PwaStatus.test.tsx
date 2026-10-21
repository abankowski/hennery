import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import PwaStatus from './PwaStatus'
import { listenForUpdates, UPDATE_STALE } from '../pwa/update-client'
import { forgetAllAttachments, hold } from '../lib/attachments'
import * as lifecycle from '../pwa/lifecycle'
import * as updateClient from '../pwa/update-client'
import { navigate } from '../router'
afterEach(() => vi.restoreAllMocks())
it('an unarmed older window keeps a visible reload action and confirms volatile input', async () => {
  const service = Object.assign(new EventTarget(), { controller: {}, getRegistration: async () => undefined })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: service })
  const reload = vi.fn(), stop = listenForUpdates(reload)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const view = render(<PwaStatus />)
  try {
    act(() => { service.controller = {}; service.dispatchEvent(new Event('controllerchange')) })
    expect(screen.getByRole('alert')).toHaveTextContent(UPDATE_STALE)
    expect(reload).not.toHaveBeenCalled()
    hold('stale-window', { attachments: [{ n: 1, file: new File(['bytes'], 'unsent.png') }], nextN: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert')).toHaveTextContent(UPDATE_STALE)
  } finally { stop(); view.unmount(); confirm.mockRestore(); forgetAllAttachments() }
})
it.each(['/login', '/setup/'])('waiting update keeps its text but no action on %s', path => {
  history.replaceState(null, '', path)
  vi.spyOn(lifecycle, 'usePwa').mockReturnValue({ registration: null, error: null, waiting: true, cleanupWarning: null, updating: false, updateMessage: null })
  vi.spyOn(updateClient, 'useUpdateNotice').mockReturnValue({ message: '', stale: false })
  const view = render(<PwaStatus />)
  try {
    expect(screen.getByRole('status')).toHaveTextContent('Update available.')
    expect(screen.queryByRole('button', { name: 'Reload to update' })).toBeNull()
    act(() => navigate('/settings/'))
    expect(screen.getByRole('button', { name: 'Reload to update' })).toBeVisible()
  } finally { view.unmount() }
})
it('an older-version notice suppresses the activation retry message', () => {
  vi.spyOn(updateClient, 'useUpdateNotice').mockReturnValue({ stale: true, message: updateClient.UPDATE_NOT_STARTED })
  const view = render(<PwaStatus />)
  try {
    expect(screen.getByRole('alert')).toHaveTextContent(UPDATE_STALE)
    expect(screen.queryByText(updateClient.UPDATE_NOT_STARTED, { exact: true })).toBeNull()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible()
  } finally { view.unmount() }
})
