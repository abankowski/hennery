import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import type { OperatorAttention } from '../api/attention'
import type { FamilyPage } from '../generated/view'
import { familyPage, parent } from '../test-family'
import { json, routed } from '../test-stream'
import FamilyPanel from './FamilyPanel'

const status: OperatorAttention = { id: 'status/1', child_id: 'child', hat_id: 'hat1', reason: 'child_failed', pending_id: null }
const question: OperatorAttention = { ...status, id: 'question1', reason: 'permission_required', pending_id: 'q/1' }
const ownPage = (): FamilyPage => {
  const page = familyPage(); delete page.next_cursor
  page.summary = { ...parent, family: { ...parent.family!, attention: 1 } }
  return page
}
const region = () => screen.getByRole('region', { name: 'Delegation attention' })
const show = (s: ReturnType<typeof routed>, page = ownPage()) => render(<FamilyPanel id={page.summary.session_id} summary={page.summary} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })

it('acknowledges status explicitly, keeps question attention linked to its card, and rereads canonical state after 204', async () => {
  let acknowledged = false, finish!: (response: Response) => void
  const ack = new Promise<Response>(resolve => { finish = resolve })
  const page = ownPage()
  page.children.push({ ...page.children[0], summary: { ...page.children[0].summary, session_id: 'foreign-child', hat_id: 'other-hat', title: 'foreign title' } })
  const s = routed(c => {
    if (c.method === 'POST') return ack.then(response => { acknowledged = true; return response })
    if (c.path.startsWith('/api/delegation/attention')) return json([
      ...(acknowledged ? [] : [status]), question,
      { ...status, id: 'foreign', hat_id: 'foreign', reason: 'foreign_secret' },
      { ...status, id: 'unrelated', child_id: 'unrelated', reason: 'unrelated_secret' },
      { ...status, id: 'foreign-child-row', child_id: 'foreign-child', reason: 'cross_hat_child_secret' },
    ])
    return json(page)
  })
  show(s, page)
  expect(await screen.findByText('Child session failed', { exact: true })).toBeInTheDocument()
  expect(within(region()).getAllByRole('link', { name: 'Review parser' })[0]).toHaveAttribute('href', '/sessions/child')
  expect(within(region()).getByRole('link', { name: 'Open question' })).toHaveAttribute('href', '/sessions/child?pending=q%2F1')
  expect(within(region()).getAllByRole('button', { name: /^Acknowledge / })).toHaveLength(1)
  expect(screen.queryByText('foreign_secret', { exact: true })).not.toBeInTheDocument()
  expect(screen.queryByText('unrelated_secret', { exact: true })).not.toBeInTheDocument()
  expect(within(region()).queryByText('cross_hat_child_secret', { exact: true })).not.toBeInTheDocument()
  expect(within(region()).queryByRole('link', { name: 'foreign title' })).not.toBeInTheDocument()
  const before = s.calls.length
  await userEvent.click(within(region()).getByRole('button', { name: 'Acknowledge Child session failed for Review parser' }))
  expect(screen.getByText('Child session failed', { exact: true })).toBeInTheDocument()
  expect(s.calls).toHaveLength(before + 1)
  expect(s.calls.at(-1)?.path).toBe('/api/delegation/attention/status%2F1/acknowledge')
  await act(async () => { finish(new Response(null, { status: 204 })); await ack })
  await waitFor(() => expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument())
  expect(s.calls.filter(c => c.path.includes('/family'))).toHaveLength(2)
  expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention?'))).toHaveLength(2)
  expect(within(region()).queryByRole('button', { name: /^Acknowledge / })).not.toBeInTheDocument()
  expect(within(region()).getByText('Session needs your attention', { exact: true })).toBeInTheDocument()
})

it('pages at most 100 attention records per click, using the last raw id even when unrelated rows are hidden', async () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ ...status, id: `opaque/${i}`, child_id: 'unrelated' }))
  const s = routed(c => c.path.startsWith('/api/delegation/attention') ? json(c.path.includes('after=') ? [status] : rows) : json(ownPage()))
  show(s)
  const more = await screen.findByRole('button', { name: 'Load more attention' })
  expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention'))).toHaveLength(1)
  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
  await userEvent.click(more)
  expect(await screen.findByText('Child session failed', { exact: true })).toBeInTheDocument()
  expect(s.calls.at(-1)?.path).toBe('/api/delegation/attention?hat_id=hat1&after=opaque%2F99')
  expect(screen.queryByRole('button', { name: 'Load more attention' })).not.toBeInTheDocument()
})

it('reads no attention for zero counts but supports an orphan deep link with status-only attention', async () => {
  const s = routed(c => c.path.startsWith('/api/delegation/attention') ? json([{ ...status, child_id: 'orphan' }]) : json(familyPage()))
  const view = show(s, familyPage())
  await screen.findByRole('link', { name: 'Review parser' })
  expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention'))).toHaveLength(0)
  view.unmount()
  const page: FamilyPage = { summary: { ...parent, session_id: 'orphan', operator_attention: 1, family: undefined }, children: [], questions: [] }
  const orphan = routed(c => c.path.startsWith('/api/delegation/attention') ? json([{ ...status, child_id: 'orphan' }]) : json(page))
  render(<FamilyPanel id="orphan" hosts={new Map()} resync={0} />, { wrapper: orphan.wrapper })
  expect(await screen.findByRole('button', { name: 'Acknowledge Child session failed for orphan' })).toBeEnabled()
})

it('shows read/ack failures without resolving attention or refreshing the family on a refused ack', async () => {
  let reads = 0
  const s = routed(c => {
    if (c.method === 'POST') return json({ code: 'refused', message: 'Could not acknowledge' }, 409)
    if (c.path.startsWith('/api/delegation/attention')) return ++reads === 1 ? json({ code: 'offline', message: 'Read unavailable' }, 503) : json([status])
    return json(ownPage())
  })
  show(s)
  expect(await screen.findByRole('alert')).toHaveTextContent('Read unavailable')
  await userEvent.click(screen.getByRole('button', { name: 'Retry attention' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge Child session failed for Review parser' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not acknowledge')
  expect(screen.getByText('Child session failed', { exact: true })).toBeInTheDocument()
  expect(s.calls.filter(c => c.path.includes('/family'))).toHaveLength(1)
})

it('hides cached scope data immediately and ignores an old hat response after the new hat loads', async () => {
  let nextHat = false, oldRead!: (response: Response) => void
  const late = new Promise<Response>(resolve => { oldRead = resolve })
  const old = ownPage()
  const next: FamilyPage = { summary: { ...parent, hat_id: 'next-hat', operator_attention: 1, family: undefined }, children: [], questions: [] }
  let oldReads = 0
  const s = routed(c => {
    if (c.path.startsWith('/api/delegation/attention')) {
      if (c.path.includes('hat_id=hat1')) return ++oldReads === 1 ? json([status]) : late
      return json([{ ...status, id: 'new', child_id: 'parent', hat_id: 'next-hat', reason: 'new_hat_attention' }])
    }
    return json(nextHat ? next : old)
  })
  const view = show(s, old)
  await screen.findByText('Child session failed', { exact: true })
  view.rerender(<FamilyPanel id="parent" summary={old.summary} hosts={new Map()} resync={1} />)
  await waitFor(() => expect(oldReads).toBe(2))
  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
  nextHat = true
  view.rerender(<FamilyPanel id="parent" summary={next.summary} hosts={new Map()} resync={1} />)
  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
  expect(await screen.findByText('Session needs your attention', { exact: true })).toBeInTheDocument()
  await act(async () => { oldRead(json([status])); await late })
  expect(screen.queryByText('Child session failed', { exact: true })).not.toBeInTheDocument()
  expect(screen.getByText('Session needs your attention', { exact: true })).toBeInTheDocument()
})

it('does not refresh a new selection when an old status acknowledgement completes late', async () => {
  let finish!: (response: Response) => void
  const late = new Promise<Response>(resolve => { finish = resolve })
  const page = ownPage()
  const other: FamilyPage = { summary: { ...parent, session_id: 'other', operator_attention: 1, family: undefined }, children: [], questions: [] }
  const s = routed(c => {
    if (c.method === 'POST') return late
    if (c.path.startsWith('/api/delegation/attention')) return json([status, { ...status, id: 'other-status', child_id: 'other', reason: 'other_failed' }])
    return json(c.path.includes('/other/') ? other : page)
  })
  const view = show(s, page)
  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge Child session failed for Review parser' }))
  view.rerender(<FamilyPanel id="other" summary={other.summary} hosts={new Map()} resync={0} />)
  await screen.findByText('Session needs your attention', { exact: true })
  const before = s.calls.length
  await act(async () => { finish(new Response(null, { status: 204 })); await late })
  expect(screen.getByText('Session needs your attention', { exact: true })).toBeInTheDocument()
  expect(s.calls).toHaveLength(before)
})
