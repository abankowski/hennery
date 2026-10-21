import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { StepUpCancelled } from '../api/errors'
import { json, stubServer, type Answer } from '../test-server'
import DelegationLimitsSettings from './DelegationLimitsSettings'

const defaults = { children: 8, starts_per_operator_epoch: 32, automatic_wakes_per_operator_epoch: 20 }
function open(routes: Record<string, Answer | Answer[]> = {}, stepUp = vi.fn(async () => {})) {
  const server = stubServer({
    'GET /api/settings/delegation-limits': json(200, defaults),
    'PATCH /api/settings/delegation-limits': json(200, { ...defaults, children: 2 }),
    ...routes,
  })
  const client = new Client({ fetch: server.fetch, here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp })
  render(<ClientContext.Provider value={client}><DelegationLimitsSettings /></ClientContext.Provider>)
  return { server, stepUp }
}
const writes = (server: ReturnType<typeof stubServer>) => server.sent.filter(r => r.method === 'PATCH')
const save = () => screen.getByRole('button', { name: 'Save delegation limits' })
const children = () => screen.findByRole('spinbutton', { name: 'Live children per parent' })
describe('global Delegation limits', () => {
  it('loads saved values and explains defaults, scope and reset', async () => {
    open()
    expect(await children()).toHaveValue(8)
    expect(screen.getByRole('spinbutton', { name: 'Child starts per operator message' })).toHaveValue(32)
    expect(screen.getByRole('spinbutton', { name: 'Automatic parent wake-ups' })).toHaveValue(20)
    expect(screen.getByText('How many child sessions each parent can have open at once. Default: 8. Choose 1–64.', { exact: true })).toBeVisible()
  })
  it('confirms once, saves all three values and displays server readback', async () => {
    const { server, stepUp } = open()
    const input = await children()
    await userEvent.clear(input); await userEvent.type(input, '2'); await userEvent.click(save())
    expect(await screen.findByRole('status')).toHaveTextContent('Delegation limits saved.')
    expect(stepUp).toHaveBeenCalledTimes(1)
    expect(writes(server).map(r => r.body)).toEqual([{ ...defaults, children: 2 }])
    expect(input).toHaveValue(2)
  })
  it('keeps the polite validation region mounted as its text changes', async () => {
    open()
    const input = await children()
    const region = document.querySelector('[aria-live="polite"]')
    expect(region).toBeInTheDocument()
    expect(region).toBeEmptyDOMElement()
    await userEvent.clear(input)
    expect(document.querySelector('[aria-live="polite"]')).toBe(region)
    expect(region).toHaveTextContent('Each limit must be a whole number from 1 to 64.')
    await userEvent.type(input, '2')
    expect(document.querySelector('[aria-live="polite"]')).toBe(region)
    expect(region).toBeEmptyDOMElement()
  })
  it.each(['', '0', '65', '1.5'])('rejects invalid input %s before confirmation or write', async value => {
    const { server, stepUp } = open()
    const input = await children(); await userEvent.clear(input)
    if (value) await userEvent.type(input, value)
    expect(save()).toBeDisabled()
    const validation = screen.getByText('Each limit must be a whole number from 1 to 64.', { exact: true })
    expect(validation).toHaveAttribute('aria-live', 'polite')
    expect(validation).not.toHaveAttribute('role', 'alert')
    expect(stepUp).not.toHaveBeenCalled(); expect(writes(server)).toEqual([])
  })
  it('cancelling confirmation preserves the edit without writing', async () => {
    const { server } = open({}, vi.fn(async () => { throw new StepUpCancelled() }))
    const input = await children(); await userEvent.clear(input); await userEvent.type(input, '2')
    await userEvent.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent('Save cancelled')
    expect(input).toHaveValue(2); expect(writes(server)).toEqual([])
  })
  it('retains edits after a refusal and allows retry without claiming success', async () => {
    const { server, stepUp } = open({ 'PATCH /api/settings/delegation-limits': json(403, { code: 'step_up_required' }) })
    const input = await children(); await userEvent.clear(input); await userEvent.type(input, '2')
    await userEvent.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved')
    expect(input).toHaveValue(2); expect(save()).toBeEnabled()
    expect(stepUp).toHaveBeenCalledTimes(1); expect(writes(server)).toHaveLength(1)
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('locks every input during a pending save and uses returned values', async () => {
    let finish!: (value: Response) => void
    open({ 'PATCH /api/settings/delegation-limits': () => new Promise(resolve => { finish = resolve }) })
    await children(); await userEvent.click(save())
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    for (const input of screen.getAllByRole('spinbutton')) expect(input).toBeDisabled()
    await act(async () => finish(json(200, { children: 4, starts_per_operator_epoch: 5, automatic_wakes_per_operator_epoch: 6 })))
    expect(await children()).toHaveValue(4)
    expect(save()).toBeEnabled()
  })
  it('does not display defaults as saved after a load failure, and retries', async () => {
    open({ 'GET /api/settings/delegation-limits': [json(500, { message: 'Unavailable' }), json(200, defaults)] })
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load delegation limits')
    expect(screen.queryByRole('spinbutton')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Retry delegation limits' }))
    expect(await children()).toHaveValue(8)
  })
})
