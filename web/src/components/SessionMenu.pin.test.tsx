import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import SessionMenu from './SessionMenu'

const initial = { pinned: false, family_active: true, notices_pending: true, held: true }
function show(server: ReturnType<typeof routed>, id = 'session/1') {
  return render(<SessionMenu id={id} lifecycle="active" canPark onDeleted={() => {}} />, { wrapper: server.wrapper })
}

describe('operator idle pin', () => {
  it.each([
    [false, true, 'The pin is saved, but automatic parking holds require an updated host.'],
    [true, false, 'Parking preferences apply after the host reconnects.'],
    [undefined, true, 'Host support for automatic parking holds is unknown.'],
    [true, undefined, 'Host connection is unknown; parking enforcement is not confirmed.'],
  ] as const)('explains saved intent when host support=%s and connected=%s', async (supportsIdleHold, hostConnected, explanation) => {
    const server = routed(call => json({ ...initial, pinned: call.method === 'PATCH' }))
    const props = { supportsIdleHold, hostConnected }
    render(<SessionMenu id="s1" lifecycle="active" canPark {...props} onDeleted={() => {}} />, { wrapper: server.wrapper })
    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
    const control = await screen.findByRole('switch', { name: 'Do not park' })
    await waitFor(() => expect(control).toBeEnabled())
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(explanation)
    expect(status).toHaveTextContent('Pinned by you.')
    expect(status).toHaveTextContent('Family work requests a parking hold.')
    expect(status).toHaveTextContent('Pending updates request a parking hold.')
    expect(status).not.toHaveTextContent('Kept awake')
  })

  it('reads on opening and persists the operator choice with the encoded id, while explaining family holds separately', async () => {
    let pinned = false
    const server = routed(call => { if (call.method === 'PATCH') pinned = true; return json({ ...initial, pinned }) })
    show(server)
    expect(server.calls).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
    const control = await screen.findByRole('switch', { name: 'Do not park' })
    await waitFor(() => expect(control).toBeEnabled())
    expect(control).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('Family work requests a parking hold. Pending updates request a parking hold.')
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'))
    expect(server.calls.map(c => [c.method, c.path])).toEqual([['GET', '/api/sessions/session%2F1/idle-hold'], ['PATCH', '/api/sessions/session%2F1/idle-hold']])
    expect(JSON.parse(String(server.fetch.mock.calls[1][1]?.body))).toEqual({ pinned: true })
    expect(screen.getByRole('status')).toHaveTextContent('Pinned by you.')
  })

  it('keeps the saved pin on refusal and never claims that family work ended when the operator unpins', async () => {
    let fail = true
    const server = routed(call => call.method === 'PATCH' && fail ? json({ code: 'offline' }, 503) : json({ ...initial, pinned: call.method !== 'PATCH' }))
    show(server)
    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
    const control = await screen.findByRole('switch', { name: 'Do not park' })
    await waitFor(() => expect(control).toBeEnabled())
    fireEvent.click(control)
    expect(await screen.findByRole('alert')).toHaveTextContent('previous preference is kept')
    expect(control).toHaveAttribute('aria-checked', 'true')
    fail = false; fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'false'))
    expect(screen.getByRole('status')).toHaveTextContent('Family work requests a parking hold.')
    expect(screen.getByRole('status')).not.toHaveTextContent('Automatic idle parking is enabled.')
  })

  it('fences a late read after the menu was closed and reopened', async () => {
    let finish!: (response: Response) => void, reads = 0
    const late = new Promise<Response>(resolve => { finish = resolve })
    const server = routed(() => ++reads === 1 ? late : json({ ...initial, pinned: true }))
    show(server)
    const trigger = screen.getByRole('button', { name: 'Session actions' })
    fireEvent.click(trigger); fireEvent.click(trigger); fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Do not park' })).toHaveAttribute('aria-checked', 'true'))
    await act(async () => { finish(json(initial)); await late })
    expect(screen.getByRole('switch', { name: 'Do not park' })).toHaveAttribute('aria-checked', 'true')
  })
})
