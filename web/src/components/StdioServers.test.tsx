import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { StepUpCancelled } from '../api/errors'
import { ClientContext } from '../app-client'
import { hat, host } from '../test-fixtures'
import { json, stubServer, type Answer } from '../test-server'
import type { McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import StdioServers from './StdioServers'

const PATH = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
const stored: McpStdioServerItem = { name: 'local', command: 'tool', args: [' spaced ', '', 'line\ntwo'], env: [{ name: 'TOKEN', has_value: true }], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' }
const set = (servers = [stored]): McpStdioServerSet => ({ host_id: 'host-1', hat_id: 'hat-a', servers })
function open(routes: Record<string, Answer | Answer[]> = {}, options: { offline?: boolean; revoked?: boolean; enabled?: boolean; stepUp?: () => Promise<void> } = {}) {
  const server = stubServer({ [`GET ${PATH}`]: json(200, set()), [`PUT ${PATH}`]: json(200, set()), ...routes })
  const stepUp = vi.fn(options.stepUp ?? (async () => {}))
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const ui = render(<ClientContext.Provider value={client}><StdioServers enabled={options.enabled ?? true} hosts={[host({ connected: !options.offline, revoked_at: options.revoked ? '2026-10-02T00:00:00Z' : undefined }), host({ host_id: 'host-2', name: 'second' })]} hats={[hat({ id: 'hat-a', name: 'Personal' }), hat(), hat({ id: 'gone', name: 'Purged', purging: true })]} /></ClientContext.Provider>)
  return { ...server, ...ui, stepUp }
}
const saves = (s: ReturnType<typeof open>) => s.sent.filter(x => x.method === 'PUT')
const field = (name: string) => screen.getByRole('textbox', { name })
async function ready() { return screen.findByRole('textbox', { name: 'Server name' }) }
async function confirm() {
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  const dialog = await screen.findByRole('dialog', { name: 'Save these local MCP servers?' })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save local servers' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}
async function replaceValue(value: string) {
  await userEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
  if (value === '') await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
  else fireEvent.change(field('Value for TOKEN'), { target: { value } })
}

describe('local MCP full-set editor', () => {
  it('reads names and has_value only; keeps values and every argument byte when unchanged', async () => {
    const s = open(); await ready()
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Purged' })).toBeNull()
    await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(saves(s)[0].path).toBe(PATH)
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN' }] }] })
  })
  it('keeps a stored value across an args-only change', async () => {
    const s = open(); await ready()
    fireEvent.change(field('Argument 1'), { target: { value: ' changed ' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ args: [' changed ', '', 'line\ntwo'], env: [{ name: 'TOKEN' }] }] })
  })
  it.each(['Server name', 'Command'])('requires re-entry after changing %s', async name => {
    const s = open(); await ready()
    fireEvent.change(field(name), { target: { value: name === 'Command' ? 'other' : 'renamed' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(screen.queryByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a value or explicitly choose empty')
    expect(saves(s)).toHaveLength(0)
    fireEvent.change(field('Value for TOKEN'), { target: { value: 'replacement\nvalue' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'replacement\nvalue' }] }] })
  })
  it('sends an explicitly empty value as a string, never as keep', async () => {
    const s = open(); await ready(); await replaceValue(''); await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
  })
  it('changing one environment row does not clear another supplied value', async () => {
    const s = open(); await ready(); await replaceValue('first')
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    const names = screen.getAllByRole('textbox', { name: 'Environment name' })
    fireEvent.change(names[1], { target: { value: 'OTHER' } })
    fireEvent.change(field('Value for OTHER'), { target: { value: 'second' } })
    expect(field('Value for TOKEN')).toHaveValue('first')
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'first' }, { name: 'OTHER', value: 'second' }] }] })
  })
  it('clears values on cancellation, and requires re-entry before another confirmation', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(saves(s)).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('clears DOM values before I/O; retries exactly the same body once after step-up', async () => {
    let cleared = false
    const s = open({ [`PUT ${PATH}`]: [() => { cleared = (field('Value for TOKEN') as HTMLTextAreaElement).value === ''; return json(403, { code: 'step_up_required' }) }, json(200, set())] })
    await ready(); await replaceValue('do-not-echo'); await confirm()
    expect(cleared).toBe(true)
    expect(s.stepUp).toHaveBeenCalledTimes(1)
    expect(saves(s)).toHaveLength(2)
    expect(saves(s)[0].body).toEqual(saves(s)[1].body)
    expect(JSON.stringify(saves(s)[0].body)).toContain('do-not-echo')
    expect(document.body.innerHTML).not.toContain('do-not-echo')
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
  })
  it('clears values when step-up is cancelled, without retrying or implicitly setting empty', async () => {
    const s = open({ [`PUT ${PATH}`]: json(403, { code: 'step_up_required' }) }, { stepUp: async () => { throw new StepUpCancelled() } })
    await ready(); await replaceValue('secret'); await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(saves(s)).toHaveLength(1)
  })
  it('shows refusal in words, clears supplied values and keeps the unsaved draft', async () => {
    const s = open({ [`PUT ${PATH}`]: json(409, { code: 'slug_taken' }) })
    await ready(); await replaceValue('secret'); await confirm()
    expect(screen.getByRole('alert')).toHaveTextContent('This slug is taken')
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(field('Server name')).toHaveValue('local')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull(); expect(saves(s)).toHaveLength(1)
  })
  it('locks the place through confirmation and a slow save; two same-frame presses send once', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    const selector = screen.getByRole('combobox', { name: 'Host' })
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    fireEvent.change(selector, { target: { value: 'host-2' } })
    expect(selector).toHaveValue('host-1')
    const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' })
    act(() => { button.click(); button.click(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) })
    await waitFor(() => expect(saves(s)).toHaveLength(1))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => finish(json(200, set())))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(selector).toHaveAttribute('aria-disabled', 'false')
  })
  it('ignores an old-place read, and discards values when selecting a new hat', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    const s = open({ [`GET ${PATH}`]: [() => new Promise(resolve => { finish = resolve }), json(200, set())], [`GET ${other}`]: json(200, { ...set([]), hat_id: 'hat-b' }) })
    await waitFor(() => expect(s.sent).toHaveLength(1))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    await screen.findByRole('button', { name: 'Add local server' })
    await act(async () => finish(json(200, set())))
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.change(field('Environment name'), { target: { value: 'NEW' } })
    fireEvent.change(field('Value for NEW'), { target: { value: 'temporary' } })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-a')
    await ready()
    expect(document.body.innerHTML).not.toContain('temporary')
  })
  it('permits offline saves but revoked hosts are read-only; missing places have one ambiguous message', async () => {
    const s = open({}, { offline: true }); await ready(); await confirm(); expect(saves(s)).toHaveLength(1); s.unmount()
    const r = open({}, { revoked: true }); await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Host' }), 'host-1'); await ready()
    expect(field('Command')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Review local servers' })).toBeNull(); r.unmount()
    open({ [`GET ${PATH}`]: json(404, { code: 'not_found' }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('This host or hat no longer exists.')
  })
  it('does not read local servers when their feature is absent', () => {
    const s = open({}, { enabled: false }); expect(s.sent).toHaveLength(0); expect(screen.queryByRole('region')).toBeNull()
  })
  it('submits locally rather than navigating with a browser form', async () => {
    open(); await ready()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    act(() => screen.getByRole('form', { name: 'Local server set' }).dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('adds and removes servers, arguments and environment rows in the full set', async () => {
    const s = open(); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.change(field('Argument 3'), { target: { value: 'last' } })
    await userEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    const names = screen.getAllByRole('textbox', { name: 'Server name' })
    const commands = screen.getAllByRole('textbox', { name: 'Command' })
    fireEvent.change(names[1], { target: { value: 'second' } }); fireEvent.change(commands[1], { target: { value: 'runner' } })
    await confirm()
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: ['', 'line\ntwo', 'last'], env: [] }, { name: 'second', command: 'runner', args: [], env: [] }] })
    await userEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await confirm(); expect(saves(s)[1].body).toEqual({ servers: [] })
  })
  it('does not retain another original server’s values after renaming', async () => {
    open({ [`GET ${PATH}`]: json(200, set([stored, { ...stored, name: 'other' }])) })
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Server name' })).toHaveLength(2))
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Server name' })[0], { target: { value: 'other' } })
    expect(screen.getAllByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
  })
  it('freezes draft controls while confirmation is open, including keep and empty toggles', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    fireEvent.change(field('Server name'), { target: { value: 'changed' } })
    fireEvent.change(field('Command'), { target: { value: 'changed' } })
    fireEvent.change(field('Argument 1'), { target: { value: 'changed' } })
    fireEvent.change(field('Environment name'), { target: { value: 'changed' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN', value: 'secret' }] }] })
  })
  it('clears a supplied value when empty is selected, and resets all supplied values on identity change', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    await confirm(); expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
    await replaceValue('another')
    fireEvent.change(field('Command'), { target: { value: 'other' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
  })
  it('does not copy records into a disposed editor after a slow write or read', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) }); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    s.unmount()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-write' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-write')).toBe(false)
      const read = open({ [`GET ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
      await waitFor(() => expect(read.sent).toHaveLength(1)); read.unmount()
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-read' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-read')).toBe(false)
    } finally { spy.mockRestore() }
  })
  it('drops the old form immediately while another place’s read is pending', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    open({ [`GET ${other}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await replaceValue('only-this-place')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    await act(async () => finish(json(200, { ...set([]), hat_id: 'hat-b' })))
    expect(await screen.findByRole('button', { name: 'Add local server' })).toBeInTheDocument()
  })
  it('releases old server records and detached value fields across repeated full-set saves', async () => {
    open(); await ready()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      for (let i = 0; i < 3; i++) { await replaceValue(`value-${i}`); await confirm() }
      for (let i = 0; i < spy.mock.calls.length; i++) {
        const [key, value] = spy.mock.calls[i]
        if ((typeof key === 'string' && value instanceof HTMLTextAreaElement) || (typeof key === 'number' && value?.command === 'tool' && value?.name === 'local')) {
          expect((spy.mock.contexts[i] as Map<unknown, unknown>).size).toBeLessThanOrEqual(1)
        }
      }
    } finally { spy.mockRestore() }
  })
})
