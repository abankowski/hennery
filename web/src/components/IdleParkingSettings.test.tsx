import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer, type Answer } from '../test-server'
import IdleParkingSettings from './IdleParkingSettings'

function open(saved: number | null = null, response?: Answer) {
  const server = stubServer({
    'GET /api/settings/idle-parking': json(200, { idle_timeout_secs: saved }),
    'PUT /api/settings/idle-parking': response ?? json(200, { idle_timeout_secs: saved }),
  })
  const client = new Client({ fetch: server.fetch, here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><IdleParkingSettings /></ClientContext.Provider>)
  return server
}
const mode = () => screen.findByRole('combobox', { name: 'Automatic parking' })
const save = () => screen.getByRole('button', { name: 'Save parking settings' })

it.each([[null, 'host'], [0, 'off'], [120, 'after']] as const)('loads saved parking setting %s', async (saved, selected) => {
  open(saved)
  expect(await mode()).toHaveValue(selected)
  if (saved) expect(screen.getByRole('spinbutton', { name: 'Idle timeout (seconds)' })).toHaveValue(saved)
})

it.each([['off', 0], ['host', null]] as const)('saves %s globally', async (selected, seconds) => {
  const server = open(120, json(200, { idle_timeout_secs: seconds }))
  await userEvent.selectOptions(await mode(), selected)
  await userEvent.click(save())
  expect(await screen.findByRole('status')).toHaveTextContent('Parking settings saved.')
  expect(server.sent.filter(r => r.method === 'PUT').map(r => r.body)).toEqual([{ idle_timeout_secs: seconds }])
  expect(await mode()).toHaveValue(selected)
})

it('saves a custom timeout and reads back the server value', async () => {
  const server = open(null, json(200, { idle_timeout_secs: 90 }))
  await userEvent.selectOptions(await mode(), 'after')
  const input = screen.getByRole('spinbutton', { name: 'Idle timeout (seconds)' })
  await userEvent.clear(input); await userEvent.type(input, '90'); await userEvent.click(save())
  expect(await screen.findByRole('status')).toHaveTextContent('Parking settings saved.')
  expect(server.sent.filter(r => r.method === 'PUT').map(r => r.body)).toEqual([{ idle_timeout_secs: 90 }])
  expect(input).toHaveValue(90)
})

it.each(['', '0', '-1', '1.5', '4294967296'])('rejects invalid timeout %s', async value => {
  const server = open(120)
  await mode()
  const input = screen.getByRole('spinbutton', { name: 'Idle timeout (seconds)' })
  await userEvent.clear(input)
  if (value) await userEvent.type(input, value)
  expect(save()).toBeDisabled()
  expect(server.sent.filter(r => r.method === 'PUT')).toEqual([])
})

it('retains edits after a failed save and allows retry', async () => {
  open(null, json(500, { message: 'Unavailable' }))
  await userEvent.selectOptions(await mode(), 'off'); await userEvent.click(save())
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved')
  expect(await mode()).toHaveValue('off'); expect(save()).toBeEnabled()
  expect(screen.queryByRole('status')).toBeNull()
})
