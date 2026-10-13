import type { McpConnectionItem } from '../generated/protocol'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useClient } from '../app-client'
import { setOauthClient } from '../api/mcp'
import { messageOf } from '../api/errors'
import { clientRequest } from '../lib/mcpOauth'
import { Text } from '../lib/text'
import { originOf } from '../lib/mcp'
export interface OauthClientProps { connection: McpConnectionItem; onChanged: (item: McpConnectionItem) => void }
export default function OauthClientForm({ connection: c, onChanged }: OauthClientProps) {
  const client = useClient()
  const slot = c.oauth?.pending_client ?? c.oauth
  const stored = slot?.client_id
  const [id, setId] = useState(stored ?? '')
  const [mode, setMode] = useState<'keep' | 'public' | 'replace'>(stored ? 'keep' : 'public')
  const field = useRef<HTMLInputElement>(null)
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setId(stored ?? ''); setMode(stored ? 'keep' : 'public')
    if (field.current) field.current.value = ''
  }, [stored, c.url, c.cred_kind])
  useEffect(() => { setSaved(false) }, [c.url, c.cred_kind])
  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (running.current) return
    const secret = field.current?.value ?? ''
    if (field.current) field.current.value = ''
    setSaved(false)
    const body = clientRequest(stored, id, mode, secret)
    if (!body) { setError('Choose a new secret or a public client for a new client ID. Enter a client ID and any replacement secret.'); return }
    running.current = true; setBusy(true); setError(null)
    try { onChanged(await setOauthClient(client, c.id, body)); setSaved(true) }
    catch (err) { setError(messageOf(err)) }
    finally { running.current = false; setBusy(false) }
  }
  return <section aria-label="Pre-registered OAuth client" className="oauth-client">
    <p>Register this redirect URI at the vendor: <Text className="mono">{c.oauth?.redirect_uri ?? ''}</Text></p>
    {c.oauth?.client_id && <p>Active client: <Text className="mono">{c.oauth.client_id}</Text>. Active secret: {c.oauth.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Pending client: <Text className="mono">{c.oauth.pending_client.client_id}</Text>. Pending secret: {c.oauth.pending_client.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.</p>}
    <p>Client secret: {slot?.has_client_secret ? 'Stored; never shown again.' : 'None stored.'}</p>
    <form method="post" autoComplete="off" onSubmit={send}>
      <label className="field"><span className="field-label">Client ID</span><input className="text-input mono" value={id} maxLength={512} autoComplete="off" spellCheck={false} onChange={e => setId(e.target.value)} /></label>
      <label className="select-field"><span className="field-label">Client secret action</span><select value={mode} onChange={e => { if (field.current) field.current.value = ''; setMode(e.target.value as typeof mode) }}>
        {stored && <option value="keep">Keep stored settings for this client ID</option>}
        <option value="public">Public client (no secret)</option><option value="replace">Set a new secret</option>
      </select></label>
      {mode === 'replace' && <label className="field"><span className="field-label">Client secret</span><input ref={field} type="password" className="text-input mono" name="vendor-client-secret" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="" data-lpignore="true" data-bwignore="" data-form-type="other" /></label>}
      <p className="hint">Client settings for <Text>{c.label}</Text> at <Text>{originOf(c.url) ?? c.url}</Text>, hat <Text>{c.hat_id}</Text>. The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect. No route shows it again.</p>
      <button type="submit" className="btn btn-primary btn-sm" aria-disabled={busy}>Save client</button>
      {saved && <p role="status">Client saved. Connect to authorize it.</p>}
      {error && <p className="form-error" role="alert"><Text>{error}</Text></p>}
    </form>
  </section>
}
