import type { McpStdioServerItem } from '../generated/protocol'
import { canKeepEnv, type StdioDraft } from '../lib/stdio'
import { Text } from '../lib/text'

interface Props {
  draft: StdioDraft
  original?: McpStdioServerItem
  locked: boolean
  allocate: () => number
  change: (next: StdioDraft) => void
  remove: () => void
  input: (id: number, node: HTMLTextAreaElement | null) => void
  clear: (env?: number) => void
}

export default function StdioServerForm({ draft: d, original, locked, allocate, change, remove, input, clear }: Props) {
  const identity = (name: string, command: string) => {
    clear()
    change({ ...d, name, command, env: d.env.map(e => ({ ...e, keep: e.keep && canKeepEnv(original, name, command, e.name), entered: false, empty: false })) })
  }
  const envChange = (id: number, patch: Partial<StdioDraft['env'][number]>) => change({ ...d, env: d.env.map(e => e.id === id ? { ...e, ...patch } : e) })
  return <fieldset className="stdio-server">
    <legend><Text>{d.name || 'New local server'}</Text></legend>
    <label>Server name<input value={d.name} readOnly={locked} onChange={e => { if (!locked) identity(e.target.value, d.command) }} /></label>
    <label>Command<input value={d.command} readOnly={locked} onChange={e => { if (!locked) identity(d.name, e.target.value) }} /></label>
    <p>Commands and arguments can be read back. Put secrets in environment values. A rename or command change requires re-entering values.</p>
    {d.args.map((arg, i) => <div className="stdio-row" key={i}>
      <label>Argument {i + 1}<textarea value={arg} readOnly={locked} onChange={e => { if (!locked) change({ ...d, args: d.args.map((a, at) => at === i ? e.target.value : a) }) }} /></label>
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: d.args.filter((_, at) => at !== i) }) }}>Remove argument {i + 1}</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: [...d.args, ''] }) }}>Add argument</button>
    {d.env.map(e => <div className="stdio-env" key={e.id}>
      <label>Environment name<input value={e.name} readOnly={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { name: event.target.value, keep: false, entered: false, empty: false }) } }} /></label>
      {canKeepEnv(original, d.name, d.command, e.name) && <label className="checkbox"><input type="checkbox" checked={e.keep} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { keep: event.target.checked, entered: false, empty: false }) } }} />Keep stored value for <Text>{e.name}</Text></label>}
      {e.keep ? <p>Stored value will be kept.</p> : <>
        <label>Value for <Text>{e.name}</Text><textarea ref={node => input(e.id, node)} readOnly={locked || e.empty} autoComplete="off" data-1p-ignore data-lpignore="true" onChange={event => { if (!locked) envChange(e.id, { entered: true, empty: event.target.value === '' }) }} /></label>
        <label className="checkbox"><input type="checkbox" checked={e.empty ?? false} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { entered: event.target.checked, empty: event.target.checked }) } }} />Use empty value for <Text>{e.name}</Text></label>
      </>}
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: d.env.filter(entry => entry.id !== e.id) }) }}>Remove environment variable</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: [...d.env, { id: allocate(), name: '', keep: false }] }) }}>Add environment variable</button>
    <button type="button" className="btn btn-danger" aria-disabled={locked} onClick={() => { if (!locked) remove() }}>Remove local server</button>
  </fieldset>
}
