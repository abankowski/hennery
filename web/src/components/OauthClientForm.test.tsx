import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import OauthClientForm from './OauthClientForm'

const item = connection({ cred_kind: 'oauth_client', oauth: { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback', client_id: 'active', has_client_secret: true, pending_client: { client_id: 'pending', has_client_secret: true } } })
function setup() {
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, item) })
  const onChanged = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={onChanged} /></ClientContext.Provider>)
  return { ...server, onChanged }
}
it('starts from pending settings and explains the grant stays until consent', () => {
  setup(); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile.')).toBeVisible()
  expect(screen.getByText(item.oauth!.redirect_uri)).toBeVisible()
})
it('keeps the secret of the selected slot, never the active id', async () => {
  const s = setup(); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending' })
})
it('does not let a changed id inherit a secret', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a new secret or a public client for a new client ID.')
  expect(s.sent).toHaveLength(0)
})
it('explicit public client sends null', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending', client_secret: null })
})
it('clears secret before I/O, opts out of managers and correction, and ignores a duplicate send', async () => {
  let finish!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret')
  expect(field).toHaveAttribute('type', 'password'); expect(field).toHaveAttribute('autocomplete', 'off')
  expect(field).toHaveAttribute('spellcheck', 'false'); expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off'); expect(field).toHaveAttribute('data-1p-ignore', '')
  fireEvent.change(field, { target: { value: 'secret-canary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(field).toHaveValue(''); expect(document.body.textContent).not.toContain('secret-canary')
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => finish(json(400, { code: 'invalid', message: 'refused' })))
  expect(await screen.findByRole('alert')).toHaveTextContent('refused'); expect(field).toHaveValue('')
})
