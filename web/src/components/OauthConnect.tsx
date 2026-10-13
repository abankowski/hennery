import type { McpConnectionItem } from '../generated/protocol'
import { useMcpOauth } from '../hooks/useMcpOauth'
import { oauthAction, oauthGuidance } from '../lib/mcpOauth'
import { capped } from '../lib/mcp'
import { Text } from '../lib/text'

export default function OauthConnect({ connection: c, refresh, waiting }: {
  connection: McpConnectionItem; refresh: () => Promise<McpConnectionItem[]>; waiting?: (id: string, active: boolean) => void
}) {
  const { state, connect, cancel } = useMcpOauth(c, refresh, waiting)
  const action = oauthAction(c)
  const busy = state.phase === 'waiting' || state.phase === 'authorizing'
  const code = state.code ?? c.oauth_error?.code
  const mismatch = code === 'resource_mismatch' ? c.oauth?.resource_mismatch : undefined
  const retryButton = state.retry === 'accept' && mismatch ? 'Accept and connect' : action === 'reconnect' ? 'Reconnect' : action === 'connect' ? 'Connect' : mismatch ? 'Accept and connect' : null
  return <section className="oauth-connect" aria-label="OAuth sign-in">
    {(action === 'connect' || action === 'reconnect') && <button className="btn btn-primary btn-sm" type="button" aria-disabled={busy} onClick={() => connect()}>{action === 'connect' ? 'Connect' : 'Reconnect'}</button>}
    {action === 'client' && <p>Save the vendor client settings before connecting.</p>}
    {mismatch && <div className="notice">
      <p>Server URL: <Text className="mono">{c.url}</Text></p>
      <p>Advertised resource: <Text className="mono">{mismatch}</Text></p>
      <p>Accept only if this resource is the one you intend to authorize. Acceptance does not say which resource parameter was sent.</p>
      <button className="btn btn-primary btn-sm" type="button" aria-disabled={busy} onClick={() => connect(mismatch)}>Accept and connect</button>
    </div>}
    {busy && <p role="status">{state.phase === 'authorizing' ? 'Preparing sign-in…' : 'Waiting for sign-in. Return here after consent.'}</p>}
    {state.link && <p><a href={state.link} target="_blank" rel="noopener noreferrer">Open vendor sign-in</a></p>}
    {busy && <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Stop waiting</button>}
    {state.phase === 'confirm' && <p role="status">Confirmed.{retryButton && <> Click {retryButton} again to open sign-in.</>}</p>}
    {state.phase === 'working' && <p role="status">The gateway now reports this connection as Working.</p>}
    {state.phase === 'unconfirmed' && <p role="status">Sign-in completion could not be confirmed. The card shows the gateway’s last report.</p>}
    {state.error && <p className="form-error" role="alert"><Text>{capped(state.error)}</Text></p>}
    {code && oauthGuidance(code) && <p className="hint"><Text>{oauthGuidance(code)}</Text></p>}
  </section>
}
