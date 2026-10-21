import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import PwaStatus from './PwaStatus'
import { listenForUpdates, UPDATE_STALE } from '../pwa/update-client'
import { forgetAllAttachments, hold } from '../lib/attachments'
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
