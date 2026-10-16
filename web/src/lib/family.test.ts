import { describe, expect, it } from 'vitest'
import { statusOf } from './status'
import { waitingIds, EMPTY_LIST } from '../store/sessionList'
import { parent } from '../test-family'

describe('family attention', () => {
  it('uses operator attention rather than the factual pending count in fallback badges', () => {
    const child = { ...parent, session_id: 'child', activity: 'blocked', question_waits: true, operator_attention: 0, parent_handled_questions: 1 }
    expect(statusOf(child).label).toBe('Parent is handling')
    expect(waitingIds({ ...EMPTY_LIST, all: new Map([['child', child]]) }, null).size).toBe(0)
    const fallback = { ...child, operator_attention: 1 }
    expect(statusOf(fallback).tone).toBe('attn')
    expect(waitingIds({ ...EMPTY_LIST, all: new Map([['child', fallback]]) }, null).size).toBe(1)
  })
  it('gives a parent question precedence over waiting on children, and never hides running activity', () => {
    expect(statusOf(parent).label).toBe('Waiting on children')
    expect(statusOf({ ...parent, operator_attention: 1, question_waits: true }).tone).toBe('attn')
    expect(statusOf({ ...parent, activity: 'running' }).label).toBe('Running')
  })
})

it('keeps an accepted answer visibly pending without counting it as operator work', () => {
  const queued = { ...parent, activity: 'blocked', question_waits: true, operator_attention: 0, parent_handled_questions: 0 }
  expect(statusOf(queued).label).toBe('Answer pending delivery')
  expect(statusOf(queued).tone).toBe('wait')
  expect(waitingIds({ ...EMPTY_LIST, all: new Map([['parent', queued]]) }, null).size).toBe(0)
})
