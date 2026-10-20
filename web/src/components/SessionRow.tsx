// One row of the session list (frontend spec §5; plan 4c decision 7).
//
// Line 1: status marker, agent, title (fallback: the project directory's
// name), relative time. Line 2: the branch (fallback: the directory's name,
// never repeated when it is the title), the host's name, and "Resume" for a
// parked session. The row is a link to the session, so a new tab works.
// A failed session's reason is on the marker's hover, and a tap on "Why"
// beside the link shows it (a button inside the link would open the session).
import { useState } from 'react'
import type { SessionSummary } from '../generated/view'
import { agentLabel } from '../lib/agent'
import { statusOf } from '../lib/status'
import { basename, relTime } from '../lib/time'
import { Link } from '../router'
import { Icon } from './ui'
import SessionName, { useSessionName } from './SessionNames'

export function sessionPath(id: string): string {
  return `/sessions/${encodeURIComponent(id)}`
}

/** The row's title and its second line's place. */
export function rowText(s: SessionSummary): { title: string; where: string } {
  const dir = basename(s.cwd)
  const title = s.title || dir || s.session_id
  const where = s.git_branch || dir
  return { title, where: where === title ? '' : where }
}

interface Props {
  session: SessionSummary
  selected: boolean
  hostName?: string
  /** The list's clock (`useNow`): the relative time moves with it. */
  now: number
  table?: boolean
  indent?: boolean
}

export default function SessionRow({ session, selected, hostName, now, table, indent }: Props) {
  const [why, setWhy] = useState(false)
  const status = statusOf(session)
  const name = useSessionName(session)
  const title = name.text, place = session.git_branch || basename(session.cwd)
  const where = place === title ? '' : place
  const reason = status.tone === 'fail' ? session.failure_reason : undefined
  const markerTitle = reason ? `${status.label}: ${reason}` : status.label
  const content = (
    <div className={'sess-item' + (indent ? ' sess-child' : '')}>
      <Link
        to={sessionPath(session.session_id)}
        data-session-link
        className={'sess' + (selected ? ' active' : '')}
        aria-current={selected ? 'page' : undefined}
      >
        <div className="sess-row1">
          <span className={'sess-led led-' + status.tone} role="img" aria-label={status.label} title={markerTitle}><Icon name={status.tone === 'attn' ? 'hand-raised' : status.tone === 'run' ? 'play-circle' : status.tone === 'fail' ? 'exclamation-circle' : 'clock'} size={14} /></span>
          <span className="sess-kind sess-agent">{agentLabel(session.agent)}</span>
          <span className="sess-name">
            <bdi className={name.provisional ? 'session-name-provisional' : undefined}>{title}</bdi>
          </span>
          <span className="sess-time">{relTime(session.last_event_at, now)}</span>
        </div>
        <div className="sess-row2">
          {where && (
            <span className="sess-where">
              <bdi>{where}</bdi>
            </span>
          )}
          {hostName && (
            <span className="sess-machine">
              <bdi>{hostName}</bdi>
            </span>
          )}
          {(status.tone === 'attn' || status.tone === 'fail' || status.label === 'Host offline' || status.label === 'Waiting on children' || status.label === 'Parent is handling' || status.label === 'Answer pending delivery') && (
            <span className={'sess-flag sess-flag-' + status.tone}>{status.label}</span>
          )}
          {status.resume && <span className="sess-resume">Resume</span>}
        </div>
      </Link>
      {session.family && <div className="sess-family">
        {session.family.parent && <Link to={sessionPath(session.family.parent.session_id)}>Parent: <SessionName session={session.family.parent} fallback={agentLabel(session.family.parent.agent)} /></Link>}
        {session.family.children.map(child => <Link key={child.session_id} to={sessionPath(child.session_id)}>Child: <SessionName session={child} fallback={agentLabel(child.agent)} /></Link>)}
        {session.family.child_counts.total > session.family.children.length && <span>{session.family.child_counts.total} children</span>}
      </div>}
      {reason && (
        <>
          <button type="button" className="sess-why" aria-expanded={why} onClick={() => setWhy((open) => !open)}>
            Why it failed
          </button>
          {why && (
            <p className="sess-reason">
              <bdi>{reason}</bdi>
            </p>
          )}
        </>
      )}
    </div>
  )
  return table ? <tr><td data-label="Session">{content}</td><td data-label="Doing"><span className={'row-status row-status-' + status.tone}>{status.label}</span></td><td data-label="Host"><bdi>{hostName || 'Unknown host'}</bdi></td><td data-label="Agent / model"><bdi>{agentLabel(session.agent)}{session.model ? ` · ${session.model}` : ''}</bdi></td><td data-label="Last">{relTime(session.last_event_at, now)}</td></tr> : content
}
