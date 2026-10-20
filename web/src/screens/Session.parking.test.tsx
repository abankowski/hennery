import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { json, liveStream, routed } from '../test-stream'
import { parent } from '../test-family'
import SessionView from './Session'

it.each([
  [[], true, 'automatic parking holds require an updated host.'],
  [['idle_hold'], false, 'Parking preferences apply after the host reconnects.'],
  [['idle_hold'], true, 'Parking hold requested from the host.'],
] as const)('uses the session host metadata for parking support=%s connected=%s', async (capabilities, connected, explanation) => {
  const server = routed(call => {
    const path = new URL(call.path, 'http://h').pathname
    if (path === '/api/hosts') return json([{ host_id: parent.host_id, name: 'Test workstation', capabilities, connected }])
    if (path === '/api/sessions/parent/idle-hold') return json({ pinned: true, family_active: false, notices_pending: false, held: true })
    if (path === '/api/sessions/parent') return json({ ...parent, pending: [] })
    if (path === '/api/view/sessions/parent') return json({ items: [], older: false, epoch: 'e1', revision: 1 })
    if (path === '/api/sessions/parent/catalog') return json({ session_id: 'parent', config_options: [], commands: [] })
    if (path === '/api/stream/view/sessions/parent') return liveStream().response
    return json({ code: 'not_found', message: 'no' }, 404)
  })
  render(<SessionView id="parent" />, { wrapper: server.wrapper })
  await screen.findByText(connected ? 'Online' : 'Offline', { exact: true })
  fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
  await screen.findByRole('switch', { name: 'Do not park', checked: true })
  expect(document.querySelector('.idle-hold-note')).toHaveTextContent(explanation)
})
