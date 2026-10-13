import type { McpConnectionItem } from '../generated/protocol'
import { useRef, useState } from 'react'
import { useClient } from '../app-client'
import { probe } from '../api/mcp'
import { ApiFailure, messageOf } from '../api/errors'
import { capped } from '../lib/mcp'
import { oauthGuidance } from '../lib/mcpOauth'
import { Text } from '../lib/text'

export default function McpStatus({ connection: c, onChanged }: { connection: McpConnectionItem; onChanged: (c: McpConnectionItem) => void }) {
  const client = useClient()
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const send = async () => {
    if (running.current) return
    running.current = true; setBusy(true); setError(null); setMessage(null)
    try { onChanged(await probe(client, c.id)); setMessage('Probe answered. The card shows the gateway’s report.') }
    catch (err) { setError(err instanceof ApiFailure ? oauthGuidance(err.code) || messageOf(err) : messageOf(err)) }
    finally { running.current = false; setBusy(false) }
  }
  return <section className="mcp-report" aria-label="Gateway report">
    <p className="hint">The gateway’s last report; this is not a live health check.</p>
    {c.status === 'needs_auth' && (c.cred_kind === 'oauth_dcr' || c.cred_kind === 'oauth_client') && <p>Sign-in may be needed. An authorization-server outage can also cause this state; read the gateway note.</p>}
    <dl className="facts"><dt>Status recorded</dt><dd><Text>{c.status_at}</Text></dd><dt>Last checked</dt><dd><Text>{c.checked_at ?? 'Never checked'}</Text></dd></dl>
    {c.oauth_error && <div><p>Latest Connect did not complete:</p><p><Text>{capped(c.oauth_error.message)}</Text></p><p><Text>{c.oauth_error.at}</Text></p></div>}
    {c.oauth?.accepted_resource && <p>Accepted resource: <Text className="mono">{c.oauth.accepted_resource}</Text>. This records your acceptance, not the parameter sent.</p>}
    <button type="button" className="btn btn-ghost btn-sm" aria-disabled={busy} onClick={() => void send()}>Probe now</button>
    {busy && <p role="status">Probing…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="form-error"><Text>{error}</Text></p>}
  </section>
}
