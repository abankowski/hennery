import type { TitleSource } from '../generated/protocol'
import { basename } from '../lib/time'
import { visible } from '../lib/text'

export interface NamedSession { session_id: string; title?: string | null; title_source?: TitleSource; cwd?: string; unseen?: { event_id: number } }
interface Name { text: string; provisional: boolean; source: TitleSource | 'project' }
/** Naming is server-owned; never fetch or derive a title from transcript text. */
export function sessionName(session: NamedSession, fallback?: string): Name {
  const title = session.title?.trim()
  return title
    ? { text: visible(title), provisional: session.title_source === 'prompt', source: session.title_source ?? 'agent' }
    : { text: fallback || basename(session.cwd ?? '') || session.session_id, provisional: true, source: 'project' }
}
export function useSessionNames(_sessions: readonly NamedSession[]) { return sessionName }
export function useSessionName(session: NamedSession, fallback?: string) { return sessionName(session, fallback) }
export default function SessionName({ session, fallback }: { session: NamedSession; fallback?: string }) {
  const name = sessionName(session, fallback)
  return <>{session.unseen && <span className="unseen-dot" role="img" aria-label="Unseen" />}<bdi className={[name.provisional ? 'session-name-provisional' : '', session.unseen ? 'unseen-name' : ''].filter(Boolean).join(' ') || undefined} title={name.source === 'prompt' ? 'Provisional name from the first prompt' : name.provisional ? 'No session name is available yet' : undefined}>{name.text}</bdi></>
}
