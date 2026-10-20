import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import FamilyPanel, { operationWords, operationName, routingWords, handlingWords } from './FamilyPanel'

import { parent, familyPage } from '../test-family'

describe('FamilyPanel', () => {
  it('pages real child metadata and pending-card links without claiming accepted work succeeded', async () => {
    const s = routed(c => json(familyPage(c.path.includes('after=child') ? 'child2' : 'child')))
    render(<FamilyPanel id="parent" summary={parent} hosts={new Map([['h1', 'worker host']])} resync={0} />, { wrapper: s.wrapper })
    expect(await screen.findByRole('link', { name: 'Review parser' })).toHaveAttribute('href', '/sessions/child')
    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'Start child: Accepted', 'Parent is handling']) {
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
    expect(await screen.findByText('You took over this session', { exact: true })).toBeInTheDocument()
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
  expect(screen.getByText('Question routing is unavailable', { exact: true })).toBeInTheDocument()
})

it('labels the saturated receipt history as latest 16 and preserves truthful receipt states', async () => {
  const page = familyPage()
  const states = ['accepted', 'waiting_config', 'dispatching', 'delivered', 'done', 'failed', 'cancelled', 'future_state']
  page.children[0].operations = Array.from({ length: 16 }, (_, i) => ({ operation_id: `op${i}`, tool: `tool${i}`, state: states[i % states.length] }))
  const s = routed(() => json(page))
  render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
  expect(await screen.findByText('Latest 16 operations', { exact: true })).toBeInTheDocument()
  const labels = ['Accepted', 'Checking configuration', 'Sending', 'Delivered', 'Done', 'Failed', 'Cancelled', 'Operation status unavailable']
  for (let i = 0; i < labels.length; i++) expect(screen.getAllByText(`Session operation: ${labels[i]}`, { exact: true })).toHaveLength(2)
})

it('loads the parent’s other children only on request, uses the encoded parent id and excludes the current session', async () => {
  const childPage = familyPage()
  childPage.summary = { ...parent, session_id: 'selected', family: { ...parent.family!, parent: { session_id: 'root/1', title: 'Root', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 } } }
  childPage.children = []
  const root = familyPage()
  root.summary = { ...parent, session_id: 'root/1' }
  root.children = [root.children[0], { ...root.children[0], summary: childPage.summary }]
  delete root.next_cursor
  const server = routed(call => json(call.path.includes('root%2F1') ? root : childPage))
  render(<FamilyPanel id="selected" summary={childPage.summary} hosts={new Map()} resync={0} />, { wrapper: server.wrapper })
  await screen.findByText('Current session', { exact: true })
  expect(server.calls).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Load parent’s other children' }))
  expect(await screen.findByRole('article', { name: 'Sibling Review parser' })).toBeInTheDocument()
  expect(screen.queryByRole('article', { name: 'Sibling selected' })).not.toBeInTheDocument()
  expect(server.calls[1].path).toBe('/api/view/sessions/root%2F1/family?limit=20')
})


it('uses readable words for every operation and routing outcome, including unknown future codes', () => {
  for (const [value, label] of [['accepted', 'Accepted'], ['waiting_config', 'Checking configuration'], ['dispatching', 'Sending'], ['delivered', 'Delivered'], ['done', 'Done'], ['failed', 'Failed'], ['cancelled', 'Cancelled'], ['future', 'Operation status unavailable']]) expect(operationWords(value)).toBe(label)
  for (const [value, label] of [['spawn', 'Start child'], ['prompt', 'Prompt'], ['resume', 'Resume'], ['cancel', 'Cancel'], ['close', 'Close'], ['answer', 'Answer'], ['future', 'Session operation']]) expect(operationName(value)).toBe(label)
  for (const [value, label] of [['active', 'Parent-driven'], ['detached', 'Operator-driven'], ['suspended', 'Delegation paused'], ['future', 'Routing unavailable']]) expect(routingWords(value)).toBe(label)
  expect(handlingWords('future')).toBe('Question routing is unavailable')
})

it('rejects a parent page from a different hat and never renders its children', async () => {
  const page = familyPage(); page.summary = { ...parent, family: { ...parent.family!, parent: { session_id: 'root', title: 'Root', agent: 'claude' } } }
  const foreign = familyPage(); foreign.summary = { ...parent, session_id: 'root', hat_id: 'other-hat' }; foreign.children[0].summary.title = 'Private sibling'
  const server = routed(call => json(call.path.includes('/root/') ? foreign : page))
  render(<FamilyPanel id="parent" summary={page.summary} hosts={new Map()} resync={0} />, { wrapper: server.wrapper })
  await userEvent.click(await screen.findByRole('button', { name: 'Load parent’s other children' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('parent family changed')
  expect(screen.queryByRole('link', { name: 'Private sibling' })).not.toBeInTheDocument()
})

it('does not publish an old parent-page error into a new selected session', async () => {
  let finish!: (response: Response) => void
  const late = new Promise<Response>(resolve => { finish = resolve })
  const page = familyPage(); page.summary = { ...parent, family: { ...parent.family!, parent: { session_id: 'root', title: 'Root', agent: 'claude' } } }
  const other = { ...parent, session_id: 'other', family: undefined }
  const server = routed(call => call.path.includes('/root/') ? late : json(call.path.includes('/other/') ? { summary: other, children: [], questions: [] } : page))
  const view = render(<FamilyPanel id="parent" summary={page.summary} hosts={new Map()} resync={0} />, { wrapper: server.wrapper })
  await userEvent.click(await screen.findByRole('button', { name: 'Load parent’s other children' }))
  view.rerender(<FamilyPanel id="other" summary={other} hosts={new Map()} resync={0} />)
  await act(async () => { finish(json({ code: 'unavailable', message: 'Old parent read failed' }, 503)); await late })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Root' })).not.toBeInTheDocument()
})
