// A full set belongs to one (host, hat). Values stay in uncontrolled fields
// until confirmed, are cleared before I/O, and are never read back.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { stdioServers, replaceStdioServers } from '../api/mcp'
import { useClient } from '../app-client'
import type { HatItem, HostItem, McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import { stdioRefusal, stdioRequest, type StdioDraft } from '../lib/stdio'
import { Text, visible } from '../lib/text'
import ConfirmDialog from './ConfirmDialog'
import StdioServerForm from './StdioServerForm'

interface Props { enabled: boolean; hosts: HostItem[] | null; hats: HatItem[] | null }
export default function StdioServers({ enabled, hosts, hats }: Props) {
  if (!enabled) return null
  if (!hosts || !hats) return <section aria-label="Local MCP servers"><p>Loading local server places…</p></section>
  return <Places hosts={hosts} hats={hats.filter(h => !h.purging)} />
}

function Places({ hosts, hats }: { hosts: HostItem[]; hats: HatItem[] }) {
  const [hostId, setHost] = useState((hosts.find(h => !h.revoked_at) ?? hosts[0])?.host_id ?? '')
  const chosen = hosts.find(h => h.host_id === hostId)
  const [hatId, setHat] = useState((hats.find(h => h.id === chosen?.default_hat_id) ?? hats[0])?.id ?? '')
  const host = hosts.find(h => h.host_id === hostId)
  const hat = hats.find(h => h.id === hatId)
  const blocked = useRef(false)
  const [busy, setBusy] = useState(false)
  const lock = (value: boolean) => { blocked.current = value; setBusy(value) }
  return <section aria-label="Local MCP servers" className="stdio-servers">
    <h2>Local MCP servers</h2>
    <p>The agent runs these commands on this host for this hat. Saving replaces the whole set, including removals, at the next start or resume. Offline hosts can be configured too.</p>
    <p>Changing the host or hat discards unsaved edits and newly entered values.</p>
    <label>Host<select value={hostId} aria-disabled={busy} onChange={event => {
      if (blocked.current) return
      const next = hosts.find(h => h.host_id === event.target.value)
      setHost(event.target.value)
      setHat((hats.find(h => h.id === next?.default_hat_id) ?? hats[0])?.id ?? '')
    }}><option value="">Choose a host</option>{hosts.map(h => <option key={h.host_id} value={h.host_id}>{visible(h.name)}</option>)}</select></label>
    <label>Hat<select value={hatId} aria-disabled={busy} onChange={event => { if (!blocked.current) setHat(event.target.value) }}><option value="">Choose a hat</option>{hats.map(h => <option key={h.id} value={h.id}>{visible(h.name)}</option>)}</select></label>
    {host && hat ? <SetEditor key={JSON.stringify([hostId, hatId])} host={host} hat={hat} lock={lock} /> : <p>Choose a host and hat.</p>}
  </section>
}

function SetEditor({ host, hat, lock }: { host: HostItem; hat: HatItem; lock: (busy: boolean) => void }) {
  const client = useClient()
  const [drafts, setDrafts] = useState<StdioDraft[] | null>(null)
  const originals = useRef(new Map<number, McpStdioServerItem>())
  const fields = useRef(new Map<string, HTMLTextAreaElement>())
  const counter = useRef(0)
  const allocate = () => ++counter.current
  const live = useRef(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const pending = useRef(false)
  const operation = useRef<Promise<void> | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const placeLock = useRef(lock); placeLock.current = lock
  const clear = () => { for (const field of fields.current.values()) field.value = '' }
  const discardValues = () => {
    clear()
    setDrafts(before => before?.map(d => ({ ...d, env: d.env.map(e => ({ ...e, entered: false, empty: false })) })) ?? null)
  }
  const apply = (answer: McpStdioServerSet) => {
    originals.current.clear()
    setDrafts(answer.servers.map(server => {
      const id = allocate()
      originals.current.set(id, server)
      return { id, name: server.name, command: server.command, args: server.args, env: server.env.map(e => ({ id: allocate(), name: e.name, keep: e.has_value })) }
    }))
  }
  useEffect(() => {
    live.current = true
    let reading = true
    void stdioServers(client, host.host_id, hat.id).then(answer => { if (reading) apply(answer) }, err => { if (reading) setError(stdioRefusal(err)) })
    return () => { reading = false; live.current = false; clear(); placeLock.current(false) }
    // The keyed editor fixes the namespace for its entire lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, host.host_id, hat.id])

  const review = (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || host.revoked_at || !drafts) return
    if (drafts.some(d => d.env.some(e => !e.keep && !e.entered))) { setError('Enter a value or explicitly choose empty for every environment variable.'); return }
    pending.current = true
    placeLock.current(true)
    setError(null)
    setConfirming(true)
  }
  const save = (): Promise<void> => {
    if (operation.current) return operation.current
    const body = stdioRequest(drafts ?? [], (server, env) => fields.current.get(`${server}:${env}`)?.value ?? '')
    discardValues()
    const work = replaceStdioServers(client, host.host_id, hat.id, body).then(answer => { if (live.current) apply(answer) }, err => { if (live.current) setError(stdioRefusal(err)) }).finally(() => { operation.current = null })
    operation.current = work
    return work
  }
  const close = () => {
    if (operation.current) return
    discardValues()
    pending.current = false
    placeLock.current(false)
    setConfirming(false)
  }
  return <>
    {host.revoked_at && <p>This host is revoked: its local MCP servers can be read, not changed.</p>}
    {error && <p role="alert" className="form-error"><Text>{error}</Text></p>}
    {drafts === null ? !error && <p>Reading local servers…</p> : <form aria-label="Local server set" method="post" onSubmit={review}>
      {drafts.map(d => <StdioServerForm key={d.id} draft={d} original={originals.current.get(d.id)} locked={confirming || !!host.revoked_at} allocate={allocate}
        change={next => setDrafts(before => before?.map(entry => entry.id === d.id ? next : entry) ?? null)}
        remove={() => setDrafts(before => before?.filter(entry => entry.id !== d.id) ?? null)}
        input={(env, node) => { const key = `${d.id}:${env}`; if (node) fields.current.set(key, node); else fields.current.delete(key) }}
        clear={env => { for (const [key, node] of fields.current) if (env === undefined ? key.startsWith(`${d.id}:`) : key === `${d.id}:${env}`) node.value = '' }} />)}
      {!host.revoked_at && <div className="stdio-actions">
        <button type="button" className="btn btn-ghost" aria-disabled={confirming} onClick={() => { if (!pending.current) setDrafts(before => [...(before ?? []), { id: allocate(), name: '', command: '', args: [], env: [] }]) }}>Add local server</button>
        <button ref={opener} type="submit" className="btn btn-primary" aria-disabled={confirming}>Review local servers</button>
      </div>}
    </form>}
    {confirming && <ConfirmDialog title="Save these local MCP servers?" confirm="Save local servers" action={save} onClose={close} returnFocus={() => opener.current}>
      <p>Replace every local server for <Text>{host.name}</Text> and <Text>{hat.name}</Text>, including removals. Newly entered environment values will be sent once confirmed, and then cleared from the form. Cancelling also clears them.</p>
      <p>This applies at the next start or resume.</p>
    </ConfirmDialog>}
  </>
}
