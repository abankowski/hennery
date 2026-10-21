import { afterEach, expect, it, vi } from 'vitest'
import { clearSessionHistory, forgetVisitedSession, parseSessionHistory, recentSessionTargets, SESSION_HISTORY_KEY, SESSION_HISTORY_LIMIT, sidebarSessions, visitSession, visitedSessions } from './sessionHistory'
import type { SessionSummary } from '../generated/view'

const row = (session_id: string, hat_id = '019a0180-1234-7000-8000-000000000001'): SessionSummary => ({ session_id, hat_id, title: session_id, host_id: 'h', cwd: '/srv/demo', agent: 'claude', lifecycle: 'active', activity: 'idle', presumed_parked: false, created_at: '2026-10-20', last_event_at: '2026-10-20', question_waits: false, operator_attention: 0, parent_handled_questions: 0 })
afterEach(() => { vi.restoreAllMocks(); clearSessionHistory() })
it('accepts the server UUIDv7 session-id contract, excluding LIKE wildcards and arbitrary search strings', () => {
  const valid = '019a0180-1234-7000-8000-000000000001'
  expect(parseSessionHistory(JSON.stringify([valid, '%', '_', 'a', 'project name', valid + '%', '../session']))).toEqual([valid])
})
it('keeps the previous visit in this window independently of shared browser order', () => {
  visitSession('019a0180-1234-7000-8000-000000000001'); visitSession('019a0180-1234-7000-8000-000000000002')
  const before = sessionStorage.getItem('hennery.windowSessions')
  expect(JSON.parse(before!)).toEqual(['019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000001'])
  localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(['019a0180-1234-7000-8000-000000000009', '019a0180-1234-7000-8000-000000000002', '019a0180-1234-7000-8000-000000000001']))
  window.dispatchEvent(new StorageEvent('storage', { key: SESSION_HISTORY_KEY }))
  expect(sessionStorage.getItem('hennery.windowSessions')).toBe(before)
  visitSession('019a0180-1234-7000-8000-000000000001')
  expect(JSON.parse(sessionStorage.getItem('hennery.windowSessions')!)).toEqual(['019a0180-1234-7000-8000-000000000001', '019a0180-1234-7000-8000-000000000002'])
  clearSessionHistory()
  expect(sessionStorage.getItem('hennery.windowSessions')).toBeNull()
})
it('orders visits, deduplicates and caps stored history at its maximum', () => {
  for (let i = 0; i < SESSION_HISTORY_LIMIT + 4; i++) visitSession(`019a0180-1234-7000-9000-${String(i).padStart(12, '0')}`)
  visitSession('019a0180-1234-7000-9000-000000000010')
  const ids = parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY)!)
  expect(ids).toHaveLength(SESSION_HISTORY_LIMIT)
  expect(ids.slice(0, 3)).toEqual(['019a0180-1234-7000-9000-000000000010', '019a0180-1234-7000-9000-000000000053', '019a0180-1234-7000-9000-000000000052'])
  expect(new Set(ids).size).toBe(SESSION_HISTORY_LIMIT)
  expect(ids).not.toContain('019a0180-1234-7000-9000-000000000000')
})
it('rejects malformed storage and bounds/deduplicates untrusted arrays', () => {
  for (const value of ['no json', '{}', 'null', '42']) expect(parseSessionHistory(value)).toEqual([])
  expect(parseSessionHistory(JSON.stringify(['019a0180-1234-7000-8000-000000000001', '019a0180-1234-7000-8000-000000000001', null, '', 1, 'bad\n', 'x'.repeat(201), '019a0180-1234-7000-8000-000000000002']))).toEqual(['019a0180-1234-7000-8000-000000000001', '019a0180-1234-7000-8000-000000000002'])
  expect(parseSessionHistory(JSON.stringify(Array.from({ length: 100 }, (_, n) => `019a0180-1234-7000-9000-${String(n).padStart(12, '0')}`)))).toHaveLength(SESSION_HISTORY_LIMIT)
})
it('prunes explicit removals without disturbing visit ordering, and clears on logout', () => {
  visitSession('019a0180-1234-7000-8000-000000000001'); visitSession('019a0180-1234-7000-8000-000000000002'); visitSession('019a0180-1234-7000-8000-000000000003')
  forgetVisitedSession('019a0180-1234-7000-8000-000000000002'); forgetVisitedSession('019a0180-1234-7000-8000-000000000012')
  expect(parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(['019a0180-1234-7000-8000-000000000003', '019a0180-1234-7000-8000-000000000001'])
  clearSessionHistory(); expect(localStorage.getItem(SESSION_HISTORY_KEY)).toBeNull()
})
it('filters Recent by the selected hat before bounding shortcut targets, ignoring activity', () => {
  const ids = ['newest-visit', '019a0180-1234-7000-8000-000000000009', 'old-visit', 'unknown', ...Array.from({ length: 7 }, (_, n) => `a${n}`)]
  const rows = new Map(ids.filter(id => id !== 'unknown').map(id => [id, row(id, id === '019a0180-1234-7000-8000-000000000009' ? '019a0180-1234-7000-8000-000000000002' : '019a0180-1234-7000-8000-000000000001')]))
  rows.set('old-visit', { ...row('old-visit'), last_event_at: '2099-01-01' })
  expect(visitedSessions(ids, rows, '019a0180-1234-7000-8000-000000000001').slice(0, 2).map(s => s.session_id)).toEqual(['newest-visit', 'old-visit'])
  expect(visitedSessions(ids, rows).map(s => s.session_id)).toContain('019a0180-1234-7000-8000-000000000009')
  const targets = recentSessionTargets(visitedSessions(ids, rows, '019a0180-1234-7000-8000-000000000001'), 'newest-visit')
  expect(targets.map(s => s.session_id)).toEqual(['old-visit', 'a0', 'a1', 'a2', 'a3'])
  expect(ids).toContain('unknown') // a page/filter miss is never deletion
})
it('keeps in-memory history usable when localStorage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  visitSession('019a0180-1234-7000-8000-000000000006'); visitSession('019a0180-1234-7000-8000-000000000010'); forgetVisitedSession('019a0180-1234-7000-8000-000000000006')
  // Read through the same snapshot used by the hook by revisiting after storage recovers.
  vi.restoreAllMocks(); visitSession('019a0180-1234-7000-8000-000000000011')
  expect(parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY)!)).toEqual(['019a0180-1234-7000-8000-000000000011', '019a0180-1234-7000-8000-000000000010'])
})
it('pins this window’s current session ahead of visits from other windows, with five numbered alternatives', () => {
  const rows = Array.from({ length: 8 }, (_, n) => row(String(n)))
  expect(sidebarSessions(rows, '7').map(row => row.session_id)).toEqual(['7', '0', '1', '2', '3', '4'])
  expect(recentSessionTargets(sidebarSessions(rows, '7'), '7').map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4'])
  expect(sidebarSessions(rows, null).map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4', '5'])
  expect(sidebarSessions(rows, 'outside-hat').map(row => row.session_id)).toEqual(['0', '1', '2', '3', '4', '5'])
})
