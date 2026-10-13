import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import OauthClientForm from './OauthClientForm'
import { useState } from 'react'

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
  expect(screen.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.')).toBeVisible()
  expect(screen.getByText(item.oauth!.redirect_uri)).toBeVisible()
  expect(document.body.textContent).toContain('The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect.')
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
  expect(field).toHaveAttribute('type', 'password'); expect(field).toHaveAttribute('autocomplete', 'new-password')
  expect(field).toHaveAttribute('spellcheck', 'false'); expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off'); expect(field).toHaveAttribute('data-1p-ignore', '')
  expect(field).toHaveAttribute('data-lpignore', 'true'); expect(field).toHaveAttribute('data-bwignore', '')
  expect(field).toHaveAttribute('data-form-type', 'other'); expect(field).toHaveAttribute('name', 'vendor-client-secret')
  expect(field.closest('form')).toHaveAttribute('method', 'post'); expect(field.closest('form')).toHaveAttribute('autocomplete', 'off')
  fireEvent.change(field, { target: { value: 'secret-canary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(field).toHaveValue(''); expect(document.body.textContent).not.toContain('secret-canary')
  expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ client_id: 'pending', client_secret: 'secret-canary' })
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => finish(json(400, { code: 'invalid', message: 'refused' })))
  expect(await screen.findByRole('alert')).toHaveTextContent('refused'); expect(field).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'false')
  fireEvent.change(field, { target: { value: 'replacement' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(fetch).toHaveBeenCalledTimes(2); expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => finish(json(200, item))); expect(screen.getByRole('status')).toHaveTextContent('Client saved.')
  fireEvent.change(field, { target: { value: 'next' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(screen.queryByRole('status')).toBeNull(); await act(async () => finish(json(200, item)))
})
it('clears saved feedback when the destination changes', async () => {
  const server = stubServer({ ['PUT /api/mcp/connections/' + item.id + '/oauth-client']: json(200, item) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item)); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await screen.findByRole('status'); s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(screen.queryByRole('status')).toBeNull()
})
it('clears a retained field and resets draft intent on URL, kind or stored-client change', () => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item))
  fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'draft' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret'); fireEvent.change(field, { target: { value: 'discarded' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } }); expect(field).toHaveValue('')
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const retained = screen.getByLabelText('Client secret'); fireEvent.change(retained, { target: { value: 'discarded-again' } })
  s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(retained).toHaveValue(''); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByLabelText('Client secret action')).toHaveValue('keep')
  s.rerender(view({ ...item, oauth: { ...item.oauth!, pending_client: { client_id: 'new', has_client_secret: false } } }))
  expect(screen.getByLabelText('Client ID')).toHaveValue('new')
})
it('keeps successful feedback when the server supplies the newly saved client id', async () => {
  const fresh = { ...item, oauth: { redirect_uri: item.oauth!.redirect_uri, has_client_secret: false } }
  const saved = { ...fresh, oauth: { ...fresh.oauth, client_id: 'new', has_client_secret: true } }
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, saved) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  function Editor() { const [c, change] = useState<typeof item>(fresh); return <OauthClientForm connection={c} onChanged={change} /> }
  render(<ClientContext.Provider value={client}><Editor /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  fireEvent.change(screen.getByLabelText('Client secret'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(screen.getByText('new')).toBeVisible())
  expect(screen.getByRole('status')).toHaveTextContent('Client saved. Connect to authorize it.')
})
it('shares a pending public-client write even though its request needs no entered secret', async () => {
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(ok => { resolve = ok }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  const save = screen.getByRole('button', { name: 'Save client' })
  fireEvent.click(save); fireEvent.click(save); expect(fetch).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => resolve(json(200, item))); expect(save).toHaveAttribute('aria-disabled', 'false')
})
