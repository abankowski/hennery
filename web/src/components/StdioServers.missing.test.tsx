import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { hat, host } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import StdioServers from './StdioServers'
import StdioServerForm from './StdioServerForm'

// A child whose textarea ref is unavailable must never become an empty value.
vi.mock('./StdioServerForm', async importOriginal => {
  const { default: Form } = await importOriginal<typeof import('./StdioServerForm')>()
  return { default: (props: ComponentProps<typeof StdioServerForm>) => <Form {...props} input={(id, node) => { if (props.draft.env.find(e => e.id === id)?.name !== 'TOKEN') props.input(id, node) }} /> }
})
it.each([false, true])('refuses a missing value field, explicit empty=%s', async empty => {
  const path = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
  const answer = { host_id: 'host-1', hat_id: 'hat-a', servers: [] }
  const server = stubServer({ [`GET ${path}`]: json(200, answer), [`PUT ${path}`]: json(200, answer) })
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  render(<ClientContext.Provider value={client}><StdioServers enabled hosts={[host()]} hats={[hat({ id: 'hat-a' })]} /></ClientContext.Provider>)
  await userEvent.click(await screen.findByRole('button', { name: 'Add local server' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Server name' }), { target: { value: 'local' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Command' }), { target: { value: 'tool' } })
  await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Environment name' }), { target: { value: 'TOKEN' } })
  if (empty) await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
  else fireEvent.change(screen.getByRole('textbox', { name: 'Value for TOKEN' }), { target: { value: 'secret' } })
  await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
  fireEvent.change(screen.getAllByRole('textbox', { name: 'Environment name' })[1], { target: { value: 'OTHER' } })
  const other = screen.getByRole('textbox', { name: 'Value for OTHER' })
  fireEvent.change(other, { target: { value: 'another typed secret' } })
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The environment value field is unavailable. Cancel and re-enter the values.'))
  expect(server.sent.filter(s => s.method === 'PUT')).toHaveLength(0)
  expect(stepUp).not.toHaveBeenCalled()
  expect(other).toHaveValue('')
  expect(screen.getByRole('checkbox', { name: 'Use empty value for OTHER' })).not.toBeChecked()
})
