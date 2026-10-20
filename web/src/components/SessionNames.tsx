import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { useClient } from '../app-client'
import type { Client } from '../api/client'
import type { EventDto } from '../generated/protocol'
import { basename } from '../lib/time'
import { visible } from '../lib/text'

export interface NamedSession { session_id: string; title?: string | null; cwd?: string; last_event_at?: string; activity?: string | null; lifecycle?: string }
interface Name { text: string; provisional: boolean; source: 'agent' | 'prompt' | 'project' }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export function firstPromptName(body: unknown): string | null {
  if (!record(body) || !Array.isArray(body.content)) return null
  const text = body.content.filter(record).filter(block => block.type === 'text' && typeof block.text === 'string').map(block => block.text).join('')
  const line = visible(text.trim().split(/\r?\n/, 1)[0])
  const chars = [...line]
  return line ? chars.length > 80 ? chars.slice(0, 79).join('') + '…' : line : null
}
async function readFirstPrompt(client: Client, id: string, signal: AbortSignal): Promise<string | null> {
  let after = 0
  while (!signal.aborted) {
    const events = await client.request<EventDto[]>('GET', `/api/sessions/${encodeURIComponent(id)}/events?after=${after}&limit=100`, undefined, { signal })
    for (const event of events) if (event.kind === 'user_turn') return firstPromptName(event.body)
    if (events.length < 100) return null
    const next = events.at(-1)!.event_id
    if (!Number.isSafeInteger(next) || next <= after) return null
    after = next
  }
  return null
}
class Names {
  private cache = new Map<string, { text: string | null; checked: Set<string> }>()
  private pending = new Set<string>()
  private controllers = new Set<AbortController>()
  private listeners = new Set<() => void>()
  private jobs: (() => Promise<void>)[] = []
  private working = 0
  private revision = 0
  private alive = true
  constructor(private client: Client, private active: boolean) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  snapshot = () => this.revision
  prompt = (id: string) => this.cache.get(id)?.text ?? null
  name(session: NamedSession, fallback?: string): Name {
    if (session.title?.trim()) return { text: visible(session.title), provisional: false, source: 'agent' }
    const prompt = this.cache.get(session.session_id)?.text
    return { text: prompt || fallback || basename(session.cwd ?? '') || session.session_id, provisional: true, source: prompt ? 'prompt' : 'project' }
  }
  ensure(session: NamedSession) {
    if (!this.alive || !this.active || session.title?.trim() || this.pending.has(session.session_id)) return
    const id = session.session_id, at = JSON.stringify([session.last_event_at, session.activity, session.lifecycle]), held = this.cache.get(id)
    if (held?.text || (held && (held.checked.has(at) || (!session.last_event_at && !session.activity && !session.lifecycle)))) return
    this.pending.add(id)
    this.jobs.push(async () => {
      const abort = new AbortController(); this.controllers.add(abort)
      try {
        const text = await readFirstPrompt(this.client, id, abort.signal)
        if (this.alive && !abort.signal.aborted) {
          const checked = new Set(this.cache.get(id)?.checked)
          checked.add(at)
          if (checked.size > 8) checked.delete(checked.values().next().value!)
          this.cache.set(id, { text, checked }); this.revision++; this.listeners.forEach(listener => listener())
        }
      } catch { /* A name lookup never hides the session or its real metadata. */ }
      finally { this.pending.delete(id); this.controllers.delete(abort) }
    })
    this.pump()
  }
  private pump() {
    while (this.alive && this.working < 3 && this.jobs.length) {
      const job = this.jobs.shift()!; this.working++
      void job().finally(() => { this.working--; this.pump() })
    }
  }
  start() { this.alive = true }
  dispose() { this.alive = false; this.jobs = []; this.pending.clear(); for (const controller of this.controllers) controller.abort(); this.cache.clear(); this.listeners.clear() }
}
const Context = createContext<Names | null>(null)
const noSubscribe = () => () => {}
const zero = () => 0
export function SessionNamesProvider({ active, children }: { active: boolean; children: ReactNode }) {
  const client = useClient()
  const names = useMemo(() => new Names(client, active), [client, active])
  useLayoutEffect(() => { names.start(); return () => names.dispose() }, [names])
  return <Context.Provider value={names}>{children}</Context.Provider>
}
export function useSessionNames(sessions: readonly NamedSession[]) {
  const names = useContext(Context)
  useSyncExternalStore(names?.subscribe ?? noSubscribe, names?.snapshot ?? zero)
  useEffect(() => { for (const session of sessions) names?.ensure(session) }, [names, sessions])
  return (session: NamedSession, fallback?: string): Name => names?.name(session, fallback) ?? { text: session.title || fallback || basename(session.cwd ?? '') || session.session_id, provisional: !session.title, source: session.title ? 'agent' : 'project' }
}
export function useSessionName(session: NamedSession, fallback?: string, ready = true) {
  const names = useContext(Context)
  // A name arriving for another session must not render every memoized row.
  useSyncExternalStore(names?.subscribe ?? noSubscribe, () => names?.prompt(session.session_id) ?? null)
  useEffect(() => { if (ready) names?.ensure(session) }, [names, session, ready])
  return names?.name(session, fallback) ?? { text: session.title || fallback || basename(session.cwd ?? '') || session.session_id, provisional: !session.title, source: session.title ? 'agent' : 'project' }
}
export default function SessionName({ session, fallback, ready = true }: { session: NamedSession; fallback?: string; ready?: boolean }) {
  const name = useSessionName(session, fallback, ready)
  return <bdi className={name.provisional ? 'session-name-provisional' : undefined} title={name.source === 'prompt' ? 'Provisional name from the first prompt' : name.provisional ? 'No agent title or first prompt is available yet' : undefined}>{name.text}</bdi>
}
