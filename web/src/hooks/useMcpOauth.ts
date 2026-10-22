import type { McpConnectionItem } from '../generated/protocol'
import { useEffect, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { authorize } from '../api/mcp'
import { ApiFailure, messageOf } from '../api/errors'
import { completion, consentTimeout, consentUrl, oauthHint } from '../lib/mcpOauth'
export interface OauthState { phase: 'idle' | 'authorizing' | 'waiting' | 'confirm' | 'working' | 'failed' | 'unconfirmed'; link?: string; error?: string; code?: string; retry?: 'accept' }
interface Attempt { abort: AbortController; popup: Window | null; dispose: () => void; before: McpConnectionItem; closedSeen: boolean; ready: boolean }
export function useMcpOauth(item: McpConnectionItem, refresh: () => Promise<McpConnectionItem[]>, waiting?: (id: string, active: boolean) => void) {
  const client = useClient()
  const [state, setState] = useState<OauthState>({ phase: 'idle' })
  const current = useRef<Attempt | null>(null)
  const version = useRef(0)
  const read = useRef(refresh); read.current = refresh
  const report = useRef(waiting); report.current = waiting
  const stop = (close = false) => {
    const a = current.current
    if (!a) return
    current.current = null; version.current++; a.abort.abort(); a.dispose(); report.current?.(a.before.id, false)
    if (close) { try { a.popup?.close() } catch { /* A severed handle is only a hint. */ } }
  }
  const cancel = () => { stop(true); setState({ phase: 'idle' }) }
  useEffect(() => {
    setState({ phase: 'idle' })
    return () => { version.current++; stop(true) }
  }, [item.id, item.url, item.cred_kind, item.oauth?.pending_client?.client_id])
  const connect = (resource?: string, localRedirectUri?: string) => {
    if (current.current) return
    let popup: Window | null = null
    try {
      popup = window.open('', '_blank')
      if (popup) {
        popup.opener = null
        if (popup.opener !== null) { popup.close(); popup = null }
      }
    } catch { try { popup?.close() } catch { /* Use the isolated link. */ } popup = null }
    version.current++
    const a: Attempt = { abort: new AbortController(), popup, before: item, closedSeen: false, ready: false, dispose: () => {} }
    current.current = a; report.current?.(item.id, true); setState({ phase: 'authorizing' })
    let channel: BroadcastChannel | null = null
    let poll: ReturnType<typeof setInterval> | undefined
    let expiry: ReturnType<typeof setTimeout> | undefined
    let checking: Promise<McpConnectionItem[]> | null = null
    const settle = (phase: OauthState['phase'], error?: string, code?: string) => {
      if (current.current !== a) return
      stop(); setState({ phase, error, code })
    }
    const observe = async (trigger: 'hint' | 'focus' | 'closed' | 'expiry') => {
      if (current.current !== a || !a.ready) return
      try {
        checking ??= read.current().finally(() => { checking = null })
        const rows = await checking
        if (current.current !== a) return
        const after = rows.find(c => c.id === item.id)
        const result = completion(a.before, after)
        if (result === 'working') settle('working')
        else if (result === 'failed') settle('failed', after?.oauth_error?.message, after?.oauth_error?.code)
        else if (result === 'removed') settle('unconfirmed', 'The connection was removed.')
        else if (trigger === 'hint' || trigger === 'expiry') settle('unconfirmed')
      } catch (err) {
        if (current.current !== a) return
        if (trigger === 'hint' || trigger === 'expiry') settle('unconfirmed', messageOf(err))
        else setState(prev => ({ ...prev, error: messageOf(err) }))
      }
    }
    const focus = () => { void observe('focus') }
    const visible = () => { if (document.visibilityState === 'visible') focus() }
    a.dispose = () => {
      channel?.close(); clearInterval(poll); clearTimeout(expiry)
      window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visible)
    }
    try {
      channel = new BroadcastChannel('hennery-mcp-oauth')
      channel.onmessage = event => { if (oauthHint(event, location.origin, item.id)) void observe('hint') }
    } catch { /* Focus and the retained handle remain available. */ }
    // Listeners exist before navigation, but cannot complete a pending authorize.
    void (async () => {
      try {
        const response = await authorize(client, item.id, {
          ...(resource === undefined ? {} : { accept_resource: resource }),
          ...(localRedirectUri === undefined ? {} : { local_redirect_uri: localRedirectUri }),
        }, a.abort.signal)
        if (current.current !== a) return
        const url = consentUrl(response.consent_url)
        const until = consentTimeout(response.expires_at, response.serverTime)
        if (!url) throw new Error('The sign-in address is unsafe. Start Connect again.')
        a.ready = true
        setState({ phase: 'waiting', link: popup ? undefined : url })
        window.addEventListener('focus', focus); document.addEventListener('visibilitychange', visible)
        poll = setInterval(() => {
          if (a.closedSeen || !a.popup) return
          try { if (!a.popup.closed) return } catch { /* COOP can sever access. */ }
          a.closedSeen = true; void observe('closed')
        }, 500)
        expiry = setTimeout(() => { void observe('expiry') }, until)
        if (popup) {
          try {
            if (popup.closed) { a.popup = null; setState({ phase: 'waiting', link: url }) }
            else popup.location.href = url
          }
          catch { try { popup.close() } catch { /* Use the link. */ } a.popup = null; setState({ phase: 'waiting', link: url }) }
        }
      } catch (err) {
        if (current.current !== a) return
        try { popup?.close() } catch { /* Already severed. */ }
        if (err instanceof ApiFailure && err.code === 'step_up_required') {
          // End the consent pause before the main-window dialog. No resend.
          stop()
          const confirmedVersion = version.current
          try { await client.confirm(); if (version.current === confirmedVersion) setState({ phase: 'confirm', retry: resource === undefined ? undefined : 'accept' }) }
          catch (failure) { if (version.current === confirmedVersion) setState({ phase: 'failed', error: messageOf(failure) }) }
        } else {
          settle('failed', messageOf(err), err instanceof ApiFailure ? err.code : undefined)
          void read.current().catch(() => {})
        }
      }
    })()
  }
  return { state, connect, cancel }
}
