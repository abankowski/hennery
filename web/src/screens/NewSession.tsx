import '../styles/launch.css'
import LaunchConfig, { requestFor } from '../components/LaunchConfig'
import { useLaunchContext } from '../components/CatalogContext'
import { useAccentStyle } from '../lib/theme'
import { useRegisterContext } from '../app-actions'
import { confirmStart, rememberConfigurationReview } from '../lib/start'
import type { Picks } from '../lib/defaults'
// New session (frontend spec §7): a host, an agent, a project, the hat the
// project resolves to, an optional first prompt, then Start.
//
// - Hosts: connected ones first; offline ones listed but disabled; revoked
//   ones never offered.
// - Changing the host resets the agent, the path and the browser (in the
//   click handler, never in an effect, so a prefilled path survives the
//   prefilled host being chosen on load).
// - `/new?host=<id>&cwd=<path>` prefills both ("Start a new session in this
//   project"). A prefilled host that cannot be used is not replaced by
//   another in silence: a notice says why.
// - Start: `POST /api/sessions`, then the first prompt as its own
//   `POST …/prompt` (the server takes no first prompt with a start yet),
//   then `/sessions/<id>`. A first prompt that does not go through, or a
//   start whose delivery is unknown, still goes to the session, with a
//   notice (lib/start.ts) and the prompt kept as that session's draft.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiFailure, messageOf } from '../api/errors'
import { useClient } from '../app-client'
import ProjectPicker from '../components/ProjectPicker'
import type {
  HatItem,
  HatResolution,
  HostItem,
  HostProjects,
  StartSessionRequest,
  StartSessionResponse,
} from '../generated/protocol'
import { agentLabel } from '../lib/agent'
import { agentOptions, agentsFor, type HostAgentChoices } from '../lib/agents'
import { saveDraft } from '../lib/drafts'
import { isLiteralPath, projectEntries } from '../lib/projects'
import { readNewSessionPrefill, sessionHref, startRefusal } from '../lib/start'
import { Icon } from '../lib/ui'
import { Link, navigate, useLocation } from '../router'

/** How long the path must stay unchanged before its hat is resolved. */
export const RESOLVE_DEBOUNCE_MS = 300

/** The other agent choice: a name typed by hand. */
const OTHER = '\u0000other'

/** Hosts to offer: never a revoked one; connected first, each group in the
 *  server's order. */
export function offeredHosts(hosts: HostItem[]): HostItem[] {
  const live = hosts.filter((h) => h.revoked_at == null)
  return [...live.filter((h) => h.connected), ...live.filter((h) => !h.connected)]
}

type Resolved =
  | { state: 'idle' }
  | { state: 'pending' }
  | { state: 'ok'; resolution: HatResolution; hostId: string; path: string }
  | { state: 'failed'; error: string }

export default function NewSession() {
  const client = useClient()
  const { search } = useLocation()
  // Read once: the form owns its fields after that.
  const [draft] = useState(() => { const saved = readLauncherDraft(), requested = readNewSessionPrefill(search); return requested.host && (requested.host !== saved?.host || requested.cwd !== saved?.cwd) ? null : saved })
  const [prefill] = useState(() => { const requested = readNewSessionPrefill(search); return requested.host ? requested : { host: draft?.host, cwd: draft?.cwd } })
  const ids = { host: useId(), agent: useId(), project: useId(), prompt: useId() }

  const [hosts, setHosts] = useState<HostItem[] | null>(null)
  const [hostsError, setHostsError] = useState<string | null>(null)
  const [hostId, setHostId] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const [choices, setChoices] = useState<HostAgentChoices | null>(null)
  const [agent, setAgent] = useState(draft?.agent ?? '')
  const [otherName, setOtherName] = useState(draft?.otherName ?? '')

  const [projects, setProjects] = useState<HostProjects | null>(null)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  /** The canonical path whose hat the recents are asked for, once it
   *  differs from the one they came for. */
  const [recentsFor, setRecentsFor] = useState<string | null>(null)
  const [cwd, setCwd] = useState('')
  const [initialText, setInitialText] = useState('')

  const [hats, setHats] = useState<HatItem[]>([])
  const [resolved, setResolved] = useState<Resolved>({ state: 'idle' })

  const [prompt, setPrompt] = useState(draft?.prompt ?? '')
  const [picks, setPicks] = useState<Picks>(draft?.picks ?? {})
  const [optOut, setOptOut] = useState(false)
  const [generation, setGeneration] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false), liveRef = useRef(true)
  const [draftOwner] = useState(() => crypto.randomUUID())
  const [sameLogin] = useState(() => launcherLogin(() => liveRef.current))
  useEffect(() => { liveRef.current = true; return () => { liveRef.current = false } }, [])
  const [error, setError] = useState<string | null>(null)

  // The hosts, once, and the prefilled (or first connected) host.
  useEffect(() => {
    let live = true
    client.request<HostItem[]>('GET', '/api/hosts').then(
      (all) => {
        if (!live) return
        const offered = offeredHosts(all)
        setHosts(offered)
        if (prefill.host !== undefined) {
          const wanted = offered.find((h) => h.host_id === prefill.host)
          if (wanted?.connected) {
            setHostId(wanted.host_id)
            if (prefill.cwd) {
              // Only a path is taken as one: other text is a search, no
              // path until a project is picked (as typed).
              if (isLiteralPath(prefill.cwd)) setCwd(prefill.cwd)
              setInitialText(prefill.cwd)
            }
            return
          }
          setNotice(
            wanted
              ? `${wanted.name} is offline, so the session cannot start there: pick another host.`
              : 'The host this link names is not paired any more: pick another host.',
          )
          return
        }
        const first = offered.find((h) => h.connected)
        if (first) setHostId(first.host_id)
      },
      (err) => live && setHostsError(messageOf(err)),
    )
    return () => {
      live = false
    }
  }, [client, prefill])

  // The hats, for names.
  useEffect(() => {
    let live = true
    client.request<HatItem[]>('GET', '/api/hats').then(
      (all) => live && setHats(all),
      () => {
        // Without names the preview shows the hat's id.
      },
    )
    return () => {
      live = false
    }
  }, [client])
  const hatName = (id: string) => hats.find((h) => h.id === id)?.name ?? id

  // The host's agents, the first usable one picked. A host change resets
  // the agent first (`chooseHost`), so no pick of another host is kept.
  useEffect(() => {
    if (!hostId) return
    let live = true
    setChoices(null)
    agentsFor(client, hostId).then(
      (got) => {
        if (!live) return
        const ids = Object.keys(hosts?.find(h => h.host_id === hostId)?.mcp_delivery ?? {})
        const actual = { ...got, agents: ids.map(id => got.agents.find(a => a.agent === id) ?? { agent: id, available: true, auth: 'unknown' as const, cli: 'given' as const }) }
        setChoices(actual)
        const usable = agentOptions(actual.agents).filter((o) => o.disabled === undefined)
        setAgent(current => usable.some(o => o.agent === current) || (current === OTHER && got.other) ? current : (usable[0]?.agent ?? (got.other ? OTHER : '')))
      },
      (err) => live && setError(messageOf(err)),
    )
    return () => {
      live = false
    }
  }, [client, hostId, hosts])

  // The host's projects: the recents of the hat the chosen path resolves to
  // (the host's default hat until one is resolved), and its repositories.
  useEffect(() => {
    if (!hostId) return
    let live = true
    setProjectsError(null)
    const path = `/api/hosts/${encodeURIComponent(hostId)}/projects`
    client
      .request<HostProjects>('GET', recentsFor === null ? path : `${path}?path=${encodeURIComponent(recentsFor)}`)
      .then(
        (got) => live && setProjects(got),
        (err) => live && setProjectsError(messageOf(err)),
      )
    return () => {
      live = false
    }
  }, [client, hostId, recentsFor])

  // The hat the path resolves to, once the path has rested a moment. An
  // answer for a path or host no longer chosen is dropped.
  useEffect(() => {
    if (!hostId || cwd.trim() === '') {
      setResolved({ state: 'idle' })
      return
    }
    let live = true
    const abort = new AbortController()
    setResolved({ state: 'pending' })
    const timer = setTimeout(() => {
      client
        .request<HatResolution>('POST', '/api/hats/resolve', { host_id: hostId, path: cwd.trim() }, { signal: abort.signal })
        .then(
          (resolution) => live && setResolved({ state: 'ok', resolution, hostId, path: cwd }),
          (err) => live && setResolved({ state: 'failed', error: startRefusal(err) }),
        )
    }, RESOLVE_DEBOUNCE_MS)
    return () => {
      live = false
      clearTimeout(timer)
      abort.abort()
    }
  }, [client, hostId, cwd])

  // Recents for the resolved hat, when the list holds another hat's.
  useEffect(() => {
    if (resolved.state !== 'ok' || !projects) return
    if (resolved.resolution.hat_id !== projects.recents_hat_id) setRecentsFor(resolved.resolution.canonical)
  }, [resolved, projects])

  const entries = useMemo(() => (projects ? projectEntries(projects) : []), [projects])
  const host = hosts?.find((h) => h.host_id === hostId)
  const browseRoot = projects?.home ?? host?.workspace_roots[0]

  function chooseHost(id: string) {
    if (id === hostId) return
    setHostId(id)
    // A path, an agent and a listing of one host mean nothing on another.
    setAgent('')
    setOtherName('')
    setCwd('')
    setInitialText('')
    setProjects(null)
    setRecentsFor(null)
    setNotice('Host changed. Choose the agent and project again; their previous choices were reset.')
    setPicks({})
    setOptOut(false)
    setError(null)
  }

  const agentName = agent === OTHER ? otherName.trim() : agent
  const current = resolved.state === 'ok' && resolved.hostId === hostId && resolved.path === cwd ? resolved.resolution : null
  const context = useLaunchContext(hostId, agentName, current?.canonical ?? '', current?.hat_id ?? '', generation, host?.name)
  const config = requestFor(context, picks, optOut)
  const accent = useAccentStyle(hats.find(h => h.id === current?.hat_id)?.colour)
  useRegisterContext({ hostId, cwd: current?.canonical, hatId: current?.hat_id })
  useEffect(() => {
    if (!hostId || !sameLogin()) return
    try { sessionStorage.setItem(LAUNCH_DRAFT, JSON.stringify({ owner: draftOwner, host: hostId, cwd, prompt, agent, otherName, picks })) } catch { /* Current form remains usable. */ }
  }, [hostId, cwd, prompt, agent, otherName, picks, draftOwner, sameLogin])
  useEffect(() => { setOptOut(false) }, [context.key])
  function chooseAgent(next: string) { if (next !== agent) { setAgent(next); setPicks({}); setNotice('Agent changed. Session setting choices were reset.') } }
  const canStart = !busy && host?.connected === true && agentName !== '' && current?.exists === true && current.is_dir && config !== null
  function retainClosedStart(sessionId: string) {
    if (!sameLogin()) return
    keepDraft(sessionId, prompt)
    clearLauncherDraft(draftOwner)
  }
  function openSession(href: string) { if (sameLogin() && liveRef.current) navigate(href) }

  async function start(e: FormEvent) {
    e.preventDefault()
    if (!canStart || busyRef.current || !sameLogin()) return
    busyRef.current = true
    setBusy(true)
    setExpanded(false)
    e.currentTarget.closest<HTMLElement>('[role="dialog"]')?.focus()
    setError(null)
    const request: StartSessionRequest = { host_id: hostId, agent: agentName, cwd: current!.canonical, ...config }
    let sessionId: string
    try {
      sessionId = (await client.request<StartSessionResponse>('POST', '/api/sessions', request)).session_id
    } catch (err) {
      if (!sameLogin()) return
      if (err instanceof ApiFailure && err.code === 'delivery_unknown' && err.sessionId) {
        clearLauncherDraft(draftOwner)
        openSession(sessionHref(err.sessionId, { kind: 'start_unknown', kept: keepDraft(err.sessionId, prompt) }))
        return
      }
      if (!liveRef.current) return
      busyRef.current = false
      setBusy(false)
      setError(startRefusal(err))
      return
    }
    if (!sameLogin()) return
    if (!liveRef.current) { retainClosedStart(sessionId); return }
    // A start acknowledgement alone cannot authorize the first prompt.
    {
      // The opt-out skips configuration evidence, never the actual-hat check.
      const confirmation = await confirmStart(client, sessionId, current!.hat_id, config!, 30_000, !optOut)
      if (!sameLogin()) return
      if (!liveRef.current) { retainClosedStart(sessionId); return }
      if (confirmation !== 'confirmed') {
        const code = optOut && confirmation === 'config_unconfirmed' ? 'start_unconfirmed' : confirmation
        keepDraft(sessionId, prompt)
        if (code === 'config_unconfirmed') rememberConfigurationReview(sessionId, context.catalog, config!)
        clearLauncherDraft(draftOwner)
        openSession(sessionHref(sessionId, { kind: 'prompt_failed', code }))
        return
      }
    }
    clearLauncherDraft(draftOwner)
    // Images are not part of the first prompt yet: the composer's image
    // rules (Task 6) take them once it is shared with this form.
    if (prompt.trim() !== '') {
      try {
        await client.request('POST', `/api/sessions/${encodeURIComponent(sessionId)}/prompt`, {
          content: [{ type: 'text', text: prompt }],
        })
      } catch (err) {
        if (!sameLogin()) return
        keepDraft(sessionId, prompt)
        const code = err instanceof ApiFailure ? err.code : 'unknown'
        openSession(sessionHref(sessionId, { kind: 'prompt_failed', code }))
        return
      }
    }
    openSession(sessionHref(sessionId))
  }

  const options = choices ? agentOptions(choices.agents) : []

  return (
    <form className="new-session hn-accent-scope" style={accent} onSubmit={start} aria-busy={busy} aria-labelledby="new-session-title" onKeyDown={e => { if (!e.defaultPrevented && !e.repeat && !e.altKey && !e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); if (canStart) e.currentTarget.requestSubmit() } }}>
      <div className="modal-head">
        <div className="modal-eyebrow">Start a session</div>
        <h1 className="modal-title" id="new-session-title">
          New session
        </h1>
        <span className="launch-subtitle">Prefilled from your defaults</span>
      </div>
      <div className="modal-body"><fieldset className="launch-fields" aria-label="Session details" disabled={busy} inert={busy}>
        {notice !== null && (
          <p className="hint" role="status">
            <bdi>{notice}</bdi>
          </p>
        )}

        {hostId !== '' && (
            <div className="field first-prompt">
              <label className="field-label" htmlFor={ids.prompt}>
                <Icon.Sparkle size={16} /> First prompt <span className="hint">optional</span>
              </label>
              <div className="prompt-box">
                <textarea
                  disabled={busy}
                  id={ids.prompt}
                  aria-label="First prompt optional"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`What should ${agentName && agent !== OTHER ? agentLabel(agentName) : 'the agent'} work on?`}
                />
              </div>
            </div>
        )}
        <div className="field launch-choice" role="group" aria-labelledby={ids.host}>
          <div className="field-label" id={ids.host}>
            <Icon.Terminal size={16} /> Host <span className="hint">where the agent runs</span>
          </div>
          {hostsError !== null ? (
            <p className="form-error" role="alert">
              <bdi>{hostsError}</bdi>
            </p>
          ) : hosts === null ? (
            <p className="hint">Loading…</p>
          ) : hosts.length === 0 ? (
            <p className="hint">
              No host is paired yet. <Link to="/hosts">Pair one</Link>.
            </p>
          ) : (
            <div className="seg">
              {hosts.map((h) => (
                <label
                  key={h.host_id}
                  className={'seg-item' + (hostId === h.host_id ? ' sel' : '')}
                  title={h.connected ? h.name : `${h.name} · Offline`}
                >
                  <input type="radio" name={ids.host} value={h.host_id} checked={hostId === h.host_id} disabled={!h.connected} onChange={() => chooseHost(h.host_id)} />
                  <span className={'seg-led ' + (h.connected ? 'led-run' : 'led-idle')} />
                  <span>
                    <span className="seg-name">
                      <bdi>{h.name}</bdi>
                    </span>
                    {!h.connected && <span className="seg-host"> offline</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {hostId !== '' && (
          <>
            <div className="field launch-choice" role="group" aria-labelledby={ids.agent}>
              <div className="field-label" id={ids.agent}>
                <Icon.Cpu size={16} /> Agent
              </div>
              {choices === null ? (
                <p className="hint">Loading…</p>
              ) : (
                <div className="seg">
                  {options.map((o) => (
                    <label
                      key={o.agent}
                      className={'seg-item' + (agent === o.agent ? ' sel' : '')}
                      title={o.disabled}
                    >
                      <input type="radio" name={ids.agent} value={o.agent} checked={agent === o.agent} disabled={o.disabled !== undefined} onChange={() => chooseAgent(o.agent)} />
                      <span className="seg-name">
                        <bdi>{o.label}</bdi>
                      </span>
                      {o.disabled !== undefined && (
                        <span className="seg-host">
                          <bdi>{o.disabled}</bdi>
                        </span>
                      )}
                    </label>
                  ))}
                  {choices.other && (
                    <label
                      className={'seg-item' + (agent === OTHER ? ' sel' : '')}
                    >
                      <input type="radio" name={ids.agent} value={OTHER} checked={agent === OTHER} onChange={() => chooseAgent(OTHER)} />
                      <span className="seg-name">Other…</span>
                    </label>
                  )}
                </div>
              )}
              {agent === OTHER && (
                <div className="path-input">
                  <input
                    aria-label="Agent name"
                    className="agent-name-input"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    placeholder="The agent's name on the host"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            <div className="field">
              <div className="field-label" id={ids.project}>
                <Icon.Folder size={16} /> Project <span className="hint">type a name, or a path</span>
              </div>
              <ProjectPicker
                inline
                key={hostId}
                hostId={hostId}
                entries={entries}
                browseRoot={browseRoot}
                initialText={initialText}
                onChange={setCwd}
                labelledBy={ids.project}
                recentHat={projects?.recents.length ? hatName(projects.recents_hat_id) : undefined}
              />
              {projects?.partial && <div className="picker-path">The host listed only some of its repositories.</div>}
              {projectsError !== null && (
                <div className="picker-path" role="alert">
                  Projects could not be listed: <bdi>{projectsError}</bdi> You can still type a path.
                </div>
              )}
              <HatPreview resolved={resolved} hatName={hatName} />
            </div>

            {current && <LaunchConfig context={context} picks={picks} onPicks={setPicks} optOut={optOut} onOptOut={setOptOut} retry={() => setGeneration(g => g + 1)} expanded={expanded} onExpanded={setExpanded} />}

          </>
        )}
      </fieldset></div>
      <div className="modal-foot">
        {current && <Link className="btn btn-ghost launch-edit-defaults" inert={busy} aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={event => { if (busy) event.preventDefault() }} to={`/defaults?${new URLSearchParams({ host: hostId, cwd: current.canonical, agent: agentName, hat: current.hat_id, return: 'new' })}`}>Edit defaults</Link>}
        {error !== null && (
          <p className="form-error" role="alert">
            <bdi>{error}</bdi>
          </p>
        )}
        <div className="spacer" />
        <button type="submit" className="btn btn-primary" aria-label={busy ? 'Starting…' : 'Start session'} disabled={!canStart}>
          <Icon.Bolt size={16} /> {busy ? 'Starting…' : 'Start session'}
        </button>
      </div>
    </form>
  )
}

/** Where the session will land: its hat, before it starts. */
function HatPreview({ resolved, hatName }: { resolved: Resolved; hatName: (id: string) => string }) {
  if (resolved.state === 'idle') return null
  if (resolved.state === 'pending') {
    return (
      <p className="picker-path" role="status">
        Finding the hat…
      </p>
    )
  }
  if (resolved.state === 'failed') {
    return (
      <p className="form-error" role="alert">
        <bdi>{resolved.error}</bdi>
      </p>
    )
  }
  const { resolution } = resolved
  return (
    <p className="picker-path" role="status">
      Starts in the hat <b><bdi>{hatName(resolution.hat_id)}</bdi></b> at <span className="launch-path"><bdi>{resolution.canonical}</bdi></span>
      {!resolution.exists ? ': this directory does not exist yet' : !resolution.is_dir ? ': this is not a directory' : ''}
    </p>
  )
}

/** A prompt that was not sent becomes the session's draft: the composer
 *  opens with it (lib/drafts.ts, the composer's own store). Whether there
 *  was one to keep; storage refused, the notice still says it was not sent. */
function keepDraft(sessionId: string, prompt: string): boolean {
  if (prompt.trim() === '') return false
  saveDraft(sessionId, prompt)
  return true
}

const LAUNCH_DRAFT = 'hennery.draft.__launcher__'
const LAUNCH_LOGIN = 'hennery.draft.__launcher_login__'
/** Existing logout cleanup removes this marker along with every draft.
 * Reopening a launcher shares it; signing in again creates a new lifetime.
 * No shared auth/logout helper or other screen needs a new callback. */
function launcherLogin(live: () => boolean): () => boolean {
  try {
    const token = sessionStorage.getItem(LAUNCH_LOGIN) ?? crypto.randomUUID()
    sessionStorage.setItem(LAUNCH_LOGIN, token)
    return () => { try { return sessionStorage.getItem(LAUNCH_LOGIN) === token } catch { return false } }
  } catch {
    // Storage cannot retain text either. Keep the mounted form usable,
    // while a closed launcher or auth-page navigation cannot finish it.
    return () => live() && location.pathname !== '/login' && location.pathname !== '/setup'
  }
}
interface LauncherDraft { host: string; cwd: string; agent: string; otherName: string; prompt: string; picks: Picks }
function readLauncherDraft(): LauncherDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(LAUNCH_DRAFT) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const v = value as Record<string, unknown>
    if (!['host', 'cwd', 'agent', 'otherName', 'prompt'].every(key => typeof v[key] === 'string')) return null
    if (!v.picks || typeof v.picks !== 'object' || Array.isArray(v.picks) || !Object.values(v.picks).every(p => p === null || typeof p === 'boolean' || typeof p === 'string')) return null
    return v as unknown as LauncherDraft
  } catch { return null }
}
function clearLauncherDraft(owner: string) {
  try {
    const current = JSON.parse(sessionStorage.getItem(LAUNCH_DRAFT) ?? 'null') as { owner?: unknown } | null
    if (current?.owner === owner) sessionStorage.removeItem(LAUNCH_DRAFT)
  } catch { /* Current session draft still remains. */ }
}
