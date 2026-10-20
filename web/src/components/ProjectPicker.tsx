// The New Session project field (frontend spec §7): type to search the
// host's recent projects and repositories, type a path (`/…` or `~…`) to
// use it as it is, or browse the host's directories.
//
// One host per mount: the screen remounts it (`key={hostId}`) when the host
// changes, which resets the query, the list and the browser at once.
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { DirectoryListing } from '../generated/protocol'
import { childPath, filterProjects, isLiteralPath, type ProjectEntry } from '../lib/projects'
import { basename, relTime } from '../lib/time'
import { Icon } from '../lib/ui'
import { Icon as Glyph } from './ui'

interface Props {
  inline?: boolean
  hostId: string
  /** Recents then repositories, already merged and labelled. */
  entries: ProjectEntry[]
  /** Where browsing starts: the host user's home, else a workspace root. */
  browseRoot?: string
  /** The text the field opens with (a prefilled path). */
  initialText?: string
  /** The chosen directory, or `''` while the text is only a search. */
  onChange: (path: string) => void
  /** The field's accessible name comes from this element. */
  labelledBy: string
}

type Browse =
  | { state: 'closed' }
  | { state: 'loading'; path: string }
  | { state: 'shown'; listing: DirectoryListing }
  | { state: 'failed'; path: string; error: string }

export const COMPLETION_DELAY_MS = 250
function completionPath(query: string, home?: string): { parent: string; prefix: string; expanded: string } | null {
  if (!isLiteralPath(query) || (query.startsWith('~') && query !== '~' && !query.startsWith('~/'))) return null
  if (query.startsWith('~') && !home) return null
  const expanded = query.startsWith('~') ? home! + query.slice(1) : query
  if (query === '~') return { parent: home!, prefix: '', expanded: home! + '/' }
  const slash = expanded.lastIndexOf('/')
  return { parent: expanded.slice(0, slash) || '/', prefix: expanded.slice(slash + 1), expanded }
}

export default function ProjectPicker({ hostId, entries, browseRoot, initialText = '', onChange, labelledBy, inline = false }: Props) {
  const client = useClient()
  // From React, never the host's id: an id reference holds no spaces.
  const listId = useId()
  const [query, setQuery] = useState(initialText)
  const [open, setOpen] = useState(inline)
  const [active, setActive] = useState(-1)
  const [browse, setBrowse] = useState<Browse>({ state: 'closed' })
  const [completion, setCompletion] = useState<{ query: string; listing?: DirectoryListing; error?: string } | null>(null)
  const browsing = browse.state !== 'closed'
  useEffect(() => {
    const path = completionPath(query, browseRoot)
    if (!path || !open || browsing) return
    const abort = new AbortController()
    const timer = setTimeout(() => {
      void client.request<DirectoryListing>('GET', `/api/hosts/${encodeURIComponent(hostId)}/browse?path=${encodeURIComponent(path.parent)}`, undefined, { signal: abort.signal }).then(
        listing => { if (!abort.signal.aborted) setCompletion({ query, listing }) },
        err => { if (!abort.signal.aborted) setCompletion({ query, error: messageOf(err) }) },
      )
    }, COMPLETION_DELAY_MS)
    return () => { clearTimeout(timer); abort.abort() }
  }, [client, hostId, query, browseRoot, open, browsing])

  const matches = useMemo<ProjectEntry[]>(() => {
    const path = completionPath(query, browseRoot)
    if (!path) return filterProjects(entries, query).sort((a, b) => Number(!!b.lastUsed) - Number(!!a.lastUsed))
    const known = entries.filter(entry => entry.path.toLocaleLowerCase().startsWith(path.expanded.toLocaleLowerCase()))
    const listing = completion?.query === query ? completion.listing : undefined
    const directories = (listing?.entries ?? []).filter(entry => entry.name.toLocaleLowerCase().startsWith(path.prefix.toLocaleLowerCase())).map(entry => ({ name: entry.name, path: childPath(listing!.path, entry.name) }))
    const seen = new Set(known.map(entry => entry.path))
    return [...known.filter(entry => entry.lastUsed), ...known.filter(entry => !entry.lastUsed), ...directories.filter(entry => !seen.has(entry.path))]
  }, [entries, query, completion, browseRoot])

  // Only a directory being loaded is fetched: a failed one stays failed
  // until another (or the same one, again) is asked for.
  const browsePath = browse.state === 'loading' ? browse.path : null
  useEffect(() => {
    if (browsePath === null) return
    let live = true
    client
      .request<DirectoryListing>(
        'GET',
        `/api/hosts/${encodeURIComponent(hostId)}/browse?path=${encodeURIComponent(browsePath)}`,
      )
      .then(
        (listing) => live && setBrowse({ state: 'shown', listing }),
        (err) => live && setBrowse({ state: 'failed', path: browsePath, error: messageOf(err) }),
      )
    return () => {
      live = false
    }
  }, [client, hostId, browsePath])

  function pick(path: string, label: string) {
    setQuery(label)
    setOpen(false)
    setActive(-1)
    setBrowse({ state: 'closed' })
    onChange(path)
  }

  function onInput(next: string) {
    setQuery(next)
    setActive(-1)
    setOpen(true)
    // A path needs no picking; a search is no choice until one is picked.
    onChange(isLiteralPath(next) ? next : '')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (matches.length === 0) return
      setOpen(true)
      setActive((cur) => {
        const next = cur + (e.key === 'ArrowDown' ? 1 : -1)
        if (next < 0) return matches.length - 1
        if (next >= matches.length) return 0
        return next
      })
      return
    }
    if (e.key === 'Enter' && open && active >= 0 && active < matches.length) {
      e.preventDefault()
      pick(matches[active].path, isLiteralPath(query) ? matches[active].path : matches[active].name)
    }
  }

  const showList = open && !browsing && matches.length > 0
  const optionId = (i: number) => `${listId}-o${i}`
  // The option arrow keys moved to, told to a screen reader while it shows.
  const activeId = showList && active >= 0 && active < matches.length ? optionId(active) : undefined
  useEffect(() => { if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' }) }, [activeId])
  const go = (path: string) => setBrowse({ state: 'loading', path })

  return (
    <div className={'picker' + (inline ? ' picker-inline' : '')}>
      <div className="picker-row">
        <div className="picker-anchor">
          <div className="path-input">
            <span className="ic">
              <Icon.Folder size={15} />
            </span>
            <input
              value={query}
              onChange={(e) => onInput(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              placeholder="A project's name, or a path: /srv/… or ~/…"
              role="combobox"
              aria-labelledby={labelledBy}
              aria-expanded={showList}
              aria-controls={showList ? listId : undefined}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
            />
          </div>
          {showList && (
            <ul className="picker-list" id={listId} role="listbox">
              {matches.map((m, i) => (
                <li
                  key={m.path}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  title={m.path}
                  className={'picker-item' + (i === active ? ' active' : '')}
                  // On mousedown: a click would blur the input, closing the list first.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(m.path, isLiteralPath(query) ? m.path : m.name)
                  }}
                >
                  <bdi>{m.name}</bdi>
                  {m.lastUsed !== undefined && <span className="picker-time hint"><Glyph name="clock" size={14} /><time dateTime={m.lastUsed} title={m.lastUsed}>recent · {relTime(m.lastUsed) || 'time unavailable'}</time></span>}
                </li>
              ))}
            </ul>
          )}
          {open && !browsing && completion?.query === query && completion.error && <p className="hint">Directory suggestions unavailable. You can still enter a path.</p>}
          {browsing && (
            <div className="picker-list" role="group" aria-label="Browse directories">
              {browse.state === 'loading' && (
                <div className="picker-path">
                  <bdi>{browse.path}</bdi> Loading…
                </div>
              )}
              {browse.state === 'failed' && (
                <>
                  <div className="picker-path">
                    <bdi>{browse.path}</bdi>
                  </div>
                  <div className="picker-item form-error" role="alert">
                    <bdi>{browse.error}</bdi>
                  </div>
                </>
              )}
              {browse.state === 'shown' && (
                <>
                  <div className="picker-path">
                    <bdi>{browse.listing.path}</bdi>
                  </div>
                  {browse.listing.parent !== undefined && (
                    <button type="button" className="picker-item" onClick={() => go(browse.listing.parent!)}>
                      .. (up)
                    </button>
                  )}
                  {browse.listing.entries.map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      className={'picker-item' + (d.git ? ' git' : '')}
                      // Every row descends, a repository too: a worktree can
                      // live inside one. Choosing is "Use this directory".
                      onClick={() => go(childPath(browse.listing.path, d.name))}
                    >
                      <bdi>{d.name}</bdi>
                    </button>
                  ))}
                  {browse.listing.truncated && <div className="picker-path">Not every directory is listed.</div>}
                  <button
                    type="button"
                    className="picker-item"
                    onClick={() => pick(browse.listing.path, basename(browse.listing.path))}
                  >
                    Use this directory
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={browseRoot === undefined}
          title={browseRoot === undefined ? 'This host reported no directory to browse from' : undefined}
          aria-pressed={browsing}
          onClick={() => {
            if (browsing) {
              setBrowse({ state: 'closed' })
              return
            }
            setOpen(false)
            if (browseRoot !== undefined) go(isLiteralPath(query) && query.startsWith('/') ? query : browseRoot)
          }}
        >
          Browse
        </button>
      </div>
    </div>
  )
}
