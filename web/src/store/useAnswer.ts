// Answering a session's questions (frontend spec §6.3): one book per
// session view, outside React's tree, so what a card did survives the card
// being rendered again or remounted.
//
// - One answer in flight per question: a second one is not sent.
// - Each answer's outcome (202, 409, 404, another refusal) is held with the
//   item's version when it was sent; the card shows it until the item's
//   next upsert (lib/delivery.ts).
// - Whether the host is away (lib/hostAway.ts): the session is presumed
//   parked; else the newest host marker since the first page; else the
//   view's one `GET /api/hosts`, read when it opens. No event fetches.
// - Each form's draft, by question: a card mounted again (the window moved,
//   the transcript was rendered anew) finds what the operator had filled in.
// - Which questions opened at the tail since the first page: the one card
//   that may take the focus (§10), once.
// - What the view's one live region says last: a question that opened
//   without taking the focus.
import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
import { answerQuestion } from '../api/answer'
import { questionCard } from '../api/view'
import { navigationGate } from '../pwa/navigation'
import type { Client } from '../api/client'
import { ApiFailure, messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { AnswerRequest, SessionItem } from '../generated/protocol'
import type { Item } from '../generated/view'
import { freshQuestions, type LocalAnswer } from '../lib/delivery'
import { hostAway, newestTs } from '../lib/hostAway'
import type { Draft } from '../lib/elicitation'

/** No draft: one object, so a card's snapshot stays the same. */
const NO_DRAFT: Draft = Object.freeze({})
const NO_ITEMS: readonly Item[] = []

type Question = Extract<Item, { kind: 'question' }>

export class AnswerBook {
  private readonly local = new Map<string, LocalAnswer>()
  private readonly inFlight = new Set<string>()
  private readonly versions = new Map<string, number>()
  private readonly listeners = new Set<() => void>()
  private away = false
  private known: Set<string> | null = null
  private lastId: string | undefined
  private loads: number | undefined
  private since: number | undefined
  private readonly fresh = new Set<string>()
  private readonly drafts = new Map<string, Draft>()
  private said = ''

  constructor(
    private readonly client: Client,
    readonly sessionId: string,
    private readonly onQuestion?: (item: Item) => void,
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    for (const listener of [...this.listeners]) listener()
  }

  private set(id: string, answer: LocalAnswer) {
    // An admitted stream/page version supersedes a settled HTTP outcome,
    // including a late ambiguous response that would otherwise block retries.
    // An actual POST in flight still keeps the single-answer guard.
    if (answer.phase !== 'sending' && answer.version < (this.versions.get(id) ?? -Infinity)) this.local.delete(id)
    else this.local.set(id, answer)
    this.emit()
  }

  /** What this tab did with the question `id`. */
  localOf(id: string): LocalAnswer | undefined {
    return this.local.get(id)
  }

  /** The form's draft of the question `id`: the same object until it
   *  changes. */
  draftOf(id: string): Draft {
    return this.drafts.get(id) ?? NO_DRAFT
  }

  /** Change the draft of the question `id`, from the one held now. */
  updateDraft(id: string, next: (draft: Draft) => Draft) {
    if (!navigationGate.edit()) return
    const held = this.draftOf(id)
    const draft = next(held)
    if (draft === held) return
    this.drafts.set(id, draft)
    this.emit()
  }

  get hostAway(): boolean {
    return this.away
  }

  /** The newest time the first page held (ms), once it is observed. */
  get baseline(): number | undefined {
    return this.since
  }

  setHostAway(away: boolean) {
    if (away === this.away) return
    this.away = away
    this.emit()
  }

  /** Send `body` as the answer to `item`, unless one is in flight already. */
  async answer(item: Question, body: AnswerRequest): Promise<void> {
    if (this.inFlight.has(item.id) || this.localOf(item.id)?.phase === 'uncertain' || navigationGate.blocked()) return
    const finish = navigationGate.mutation()
    this.inFlight.add(item.id)
    const version = item.version
    this.set(item.id, { phase: 'sending', version })
    try {
      await answerQuestion(this.client, this.sessionId, item.pending_id, body)
      this.set(item.id, { phase: 'sent', version })
    } catch (err) {
      if (!(err instanceof ApiFailure) || err.status >= 500) {
        await this.checkAnswer(item, messageOf(err))
      } else this.set(item.id, outcomeOf(err, version))
    } finally {
      this.inFlight.delete(item.id)
      finish()
    }
  }

  /** Read only: an ambiguous POST never causes an automatic replay. */
  async checkAnswer(item: Question, error = 'Check the current question before retrying.'): Promise<void> {
    this.set(item.id, { phase: 'checking', version: item.version })
    try {
      const current = await questionCard(this.client, this.sessionId, item.pending_id)
      if (current.kind !== 'question' || current.pending_id !== item.pending_id || current.version < item.version) throw new Error('Invalid question response.')
      this.onQuestion?.(current)
      if (current.delivered === true || current.state !== 'open') { this.local.delete(item.id); this.emit() }
      else this.set(item.id, current.answered ? { phase: 'sent', version: current.version } : { phase: 'failed', version: current.version, message: error })
    } catch (err) {
      this.set(item.id, err instanceof ApiFailure && err.status === 404 ? { phase: 'gone', version: item.version } : { phase: 'uncertain', version: item.version })
    }
  }

  /** Take in the session's items once its first page is loaded: the
   *  questions that opened at the tail since the last look are fresh.
   *  `loads` counts the pages that replaced the items (the first, and each
   *  resync's): a new one is a new baseline, so a question that came with a
   *  resync is never fresh, wherever it sits. */
  observe(items: readonly Item[], loads: number, pinned: readonly Item[] = NO_ITEMS) {
    // The first page's newest time, once: host markers after it count.
    if (this.since === undefined) this.since = newestTs(items)
    const known = loads === this.loads ? this.known : null
    this.loads = loads
    for (const id of freshQuestions(items, known, this.lastId)) this.fresh.add(id)
    const held = known ?? new Set<string>()
    let changed = false
    for (const item of [...items, ...pinned]) if (item.kind === 'question') {
      held.add(item.id)
      this.versions.set(item.id, Math.max(item.version, this.versions.get(item.id) ?? -Infinity))
      const local = this.local.get(item.id)
      if (local && local.phase !== 'sending' && local.version < item.version) {
        this.local.delete(item.id)
        changed = true
      }
    }
    this.known = held
    this.lastId = items.length > 0 ? items[items.length - 1].id : undefined
    if (changed) this.emit()
  }

  /** Whether the card of question `id` may take the focus: once, and only
   *  for a question that opened at the tail. */
  claimFocus(id: string): boolean {
    return this.fresh.delete(id)
  }

  /** What the view's live region says: the last question that opened
   *  without taking the focus. */
  get announcement(): string {
    return this.said
  }

  /** Say `text` in the view's live region. The same words twice in a row
   *  differ by a trailing no-break space, so the region's text changes and
   *  a screen reader says them again. */
  announce(text: string) {
    this.said = this.said === text ? text + '\u00a0' : text
    this.emit()
  }
}

function outcomeOf(err: unknown, version: number): LocalAnswer {
  if (err instanceof ApiFailure) {
    if (err.status === 409 && err.code === 'already_answered') return { phase: 'taken', version }
    if (err.status === 409 && err.code === 'not_open') return { phase: 'closed', version }
    if (err.status === 404) return { phase: 'gone', version }
  }
  return { phase: 'failed', version, message: messageOf(err) }
}

/** The card's view of the book: what this tab did, and whether the host is
 *  away. Without a book, nothing. */
export function useAnswerState(book: AnswerBook | undefined, id: string): { local?: LocalAnswer; hostAway: boolean } {
  const subscribe = book ? book.subscribe : noSubscribe
  const local = useSyncExternalStore(subscribe, () => book?.localOf(id))
  const hostAway = useSyncExternalStore(subscribe, () => book?.hostAway ?? false)
  return { local, hostAway }
}

const noSubscribe = () => () => {}

/** Whether the book says the host is away. */
export function useHostAway(book: AnswerBook): boolean {
  return useSyncExternalStore(book.subscribe, () => book.hostAway)
}

/** A form's draft in the book, and how to change it. Without a book, an
 *  empty draft that does not change. */
export function useFormDraft(book: AnswerBook | undefined, id: string): [Draft, (next: (draft: Draft) => Draft) => void] {
  const subscribe = book ? book.subscribe : noSubscribe
  const draft = useSyncExternalStore(subscribe, () => book?.draftOf(id) ?? NO_DRAFT)
  const update = useMemo(() => (next: (draft: Draft) => Draft) => book?.updateDraft(id, next), [book, id])
  return [draft, update]
}

/** The session view's book: one per session, fed its items once the first
 *  page is in, and told whether the host is away. `loads`: the item store's
 *  count of pages that replaced the items (a resync's included).
 *  `connected`: what the view's hosts list said of the session's host when
 *  it opened (undefined: unknown), the seed the host markers since then
 *  overrule. Pinned deep-link questions participate in version admission,
 *  without counting as newly opened tail cards. */
export function useAnswering(
  sessionId: string,
  info: Pick<SessionItem, 'presumed_parked'> | undefined,
  items: readonly Item[],
  loading: boolean,
  loads: number,
  connected: boolean | undefined,
  onQuestion?: (item: Item) => void,
  pinned: readonly Item[] = NO_ITEMS,
): AnswerBook {
  const client = useClient()
  const book = useMemo(() => new AnswerBook(client, sessionId, onQuestion), [client, sessionId, onQuestion])
  // Before the cards' effects (a layout effect runs first): a fresh card
  // finds itself fresh when it mounts.
  useLayoutEffect(() => {
    if (!loading) book.observe(items, loads, pinned)
  }, [book, items, loading, loads, pinned])
  // After `observe`: the first page's time is known before its markers
  // are read (before it, the store holds no items).
  const presumedParked = Boolean(info?.presumed_parked)
  useLayoutEffect(() => {
    book.setHostAway(hostAway({ presumedParked, seed: connected, items, since: book.baseline ?? -Infinity }))
  }, [book, items, loading, presumedParked, connected])
  return book
}
