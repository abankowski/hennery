import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import SessionMenu from './SessionMenu'

const initial = { pinned: false, family_active: true, notices_pending: true, held: true }
function show(server: ReturnType<typeof routed>, id = 'session/1') {
  return render(<SessionMenu id={id} lifecycle="active" canPark supportsIdleHold hostConnected onDeleted={() => {}} />, { wrapper: server.wrapper })
}

describe('operator idle pin', () => {
  it.each([
    [false, true, 'Parking hold saved; update the host to enforce it.'],
    [true, false, 'Parking hold saved; it applies after the host reconnects.'],
    [undefined, true, 'Host enforcement of parking holds is unconfirmed.'],
    [true, undefined, 'Host enforcement of parking holds is unconfirmed.'],
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
    expect(control).toHaveTextContent('✓ On')
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
    expect(screen.getByRole('status')).toHaveTextContent('Family work requests a parking hold.')
    expect(control).toHaveTextContent('Off')
    fireEvent.click(control)
    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'))
    expect(server.calls.map(c => [c.method, c.path])).toEqual([['GET', '/api/sessions/session%2F1/idle-hold'], ['PATCH', '/api/sessions/session%2F1/idle-hold']])
    expect(JSON.parse(String(server.fetch.mock.calls[1][1]?.body))).toEqual({ pinned: true })
    expect(screen.getByRole('status')).toHaveTextContent('You requested a parking hold.')
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
