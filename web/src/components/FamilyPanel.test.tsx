import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import FamilyPanel from './FamilyPanel'

import { parent, familyPage } from '../test-family'

describe('FamilyPanel', () => {
  it('pages real child metadata and pending-card links without claiming accepted work succeeded', async () => {
    const s = routed(c => json(familyPage(c.path.includes('after=child') ? 'child2' : 'child')))
    render(<FamilyPanel id="parent" summary={parent} hosts={new Map([['h1', 'worker host']])} resync={0} />, { wrapper: s.wrapper })
    expect(await screen.findByRole('link', { name: 'Review parser' })).toHaveAttribute('href', '/sessions/child')
    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'spawn: accepted', 'Parent is handling']) {
      expect(screen.getByText(text, { exact: true })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Open question' })).toHaveAttribute('href', '/sessions/child?pending=q%2F1')
    await userEvent.click(screen.getByRole('button', { name: 'Load more children' }))
    expect(await screen.findAllByRole('link', { name: 'Review parser' })).toHaveLength(2)
    expect(s.calls[1].path).toBe('/api/view/sessions/parent/family?after=child&limit=20')
    expect(screen.queryByText('Completed successfully', { exact: true })).not.toBeInTheDocument()
  })

  it('takes over explicitly then rereads server state, and shows fallback reason', async () => {
    let detached = false
    const s = routed(c => {
      if (c.method === 'POST') { detached = true; return new Response(null, { status: 204 }) }
      const page = familyPage(); delete page.next_cursor
      if (detached) { page.children[0].routing = 'detached'; page.children[0].reason = 'operator_takeover'; page.children[0].questions[0].handling = 'operator_required' }
      return json(page)
    })
    render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
    await userEvent.click(await screen.findByRole('button', { name: 'Take over Review parser' }))
    expect(await screen.findByText('operator_takeover', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Operator answer required', { exact: true })).toBeInTheDocument()
    expect(s.calls.filter(c => c.method === 'POST')).toEqual([expect.objectContaining({ path: '/api/view/sessions/child/takeover' })])
    expect(screen.queryByRole('button', { name: 'Take over Review parser' })).not.toBeInTheDocument()
  })

  it('refreshes on resync and family changes, keeps a failed takeover honest, and never fetches per token', async () => {
    const s = routed(c => c.method === 'POST' ? json({ code: 'conflict', message: 'Try again' }, 409) : json(familyPage()))
    const { rerender } = render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
    await screen.findByRole('link', { name: 'Review parser' })
    rerender(<FamilyPanel id="parent" summary={{ ...parent, last_event_at: 'later' }} hosts={new Map()} resync={0} />)
    await waitFor(() => expect(s.calls).toHaveLength(1))
    rerender(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={1} />)
    await waitFor(() => expect(s.calls).toHaveLength(2))
    await userEvent.click(screen.getByRole('button', { name: 'Take over Review parser' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again')
    expect(screen.getByText('Parent is handling', { exact: true })).toBeInTheDocument()
  })
})

it('drops cached family links immediately when a scope change removes the family', async () => {
  const s = routed(() => json(familyPage()))
  const { rerender } = render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
  await screen.findByRole('link', { name: 'Review parser' })
  rerender(<FamilyPanel id="parent" summary={{ ...parent, family: undefined, hat_id: 'other-hat' }} hosts={new Map()} resync={0} />)
  expect(screen.queryByRole('region', { name: 'Session family' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Review parser' })).not.toBeInTheDocument()
})

it('ignores a late family read from the previous selected session', async () => {
  let finish!: (response: Response) => void
  const old = new Promise<Response>(resolve => { finish = resolve })
  const received: string[] = []
  const other = { ...parent, session_id: 'other' }
  const s = routed(c => c.path.includes('/parent/') ? old : json({ ...familyPage('other-child'), summary: other }))
  const { rerender } = render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} onPage={page => received.push(page.summary.session_id)} />, { wrapper: s.wrapper })
  rerender(<FamilyPanel id="other" summary={other} hosts={new Map()} resync={0} onPage={page => received.push(page.summary.session_id)} />)
  await waitFor(() => expect(received).toEqual(['other']))
  await act(async () => { finish(json(familyPage())); await old })
  await waitFor(() => expect(screen.getByRole('link', { name: 'Review parser' })).toHaveAttribute('href', '/sessions/other-child'))
  expect(received).toEqual(['other'])
})

it('names queued answers and unknown routing states without claiming delivery', async () => {
  const page = familyPage()
  page.children[0].questions = [
    { pending_id: 'answer', kind: 'elicitation', handling: 'answer_queued' },
    { pending_id: 'new', kind: 'elicitation', handling: 'future_routing_state' },
  ]
  const s = routed(() => json(page))
  render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
  expect(await screen.findByText('Answer queued', { exact: true })).toBeInTheDocument()
  expect(screen.getByText('future_routing_state', { exact: true })).toBeInTheDocument()
})

it('labels the saturated receipt history as latest 16 and preserves truthful receipt states', async () => {
  const page = familyPage()
  const states = ['accepted', 'waiting_config', 'dispatching', 'delivered', 'done', 'failed', 'cancelled', 'future_state']
  page.children[0].operations = Array.from({ length: 16 }, (_, i) => ({ operation_id: `op${i}`, tool: `tool${i}`, state: states[i % states.length] }))
  const s = routed(() => json(page))
  render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
  expect(await screen.findByText('Latest 16 operations', { exact: true })).toBeInTheDocument()
  for (let i = 0; i < states.length; i++) expect(screen.getByText(`tool${i}: ${states[i]}`, { exact: true })).toBeInTheDocument()
})
