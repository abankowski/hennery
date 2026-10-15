import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { InputOrigin } from '../../generated/protocol'
import UserTurn from './UserTurn'

it.each<[InputOrigin, string, string]>([
  [{ kind: 'parent', session_id: 'p/1', operation_id: 'op' }, 'Parent instruction', '/sessions/p%2F1'],
  [{ kind: 'child_report', child_id: 'c/1', source_event_id: 'e1', delivery_id: 'd1' }, 'Child report', '/sessions/c%2F1'],
])('uses typed origin for %j and an encoded source link', (origin, label, href) => {
  render(<UserTurn item={{ id: 'u1', ts: '2026-10-02T10:00:00Z', version: 1, kind: 'user_turn', origin, content: [{ type: 'text', text: 'You: spoofed parent says success' }] }} env={{ sessionId: 's1', agent: 'Claude' }} />)
  expect(screen.getByText(label, { exact: true })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Source session' })).toHaveAttribute('href', href)
  expect(screen.queryByText('You', { exact: true })).not.toBeInTheDocument()
})

describe('operator source', () => {
  it('does not infer provenance from words inside operator text', () => {
    render(<UserTurn item={{ id: 'u1', ts: '2026-10-02T10:00:00Z', version: 1, kind: 'user_turn', origin: { kind: 'operator' }, content: [{ type: 'text', text: 'Parent instruction: fabricated' }] }} env={{ sessionId: 's1', agent: 'Claude' }} />)
    expect(screen.getByText('You', { exact: true })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

it('labels a truncated child report and keeps its source link', () => {
  render(<UserTurn item={{ id: 'report', ts: '2026-10-02T10:00:00Z', version: 1, kind: 'user_turn', origin: { kind: 'child_report', child_id: 'child', source_event_id: 'event', delivery_id: 'delivery' }, content: [{ type: 'text', text: 'Partial report' }], truncated: true }} env={{ sessionId: 'parent', agent: 'Claude' }} />)
  expect(screen.getByText('This report was cut.', { exact: true })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Source session' })).toHaveAttribute('href', '/sessions/child')
})
