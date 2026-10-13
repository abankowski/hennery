import { describe, expect, it } from 'vitest'
import { connection } from '../test-fixtures'
import { clientRequest, completion, consentUrl, oauthAction, oauthGuidance, oauthHint } from './mcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
describe('consent destinations', () => {
  it.each(['https://vendor.example/consent?state=x', 'http://localhost:123/a', 'http://localhost.:123/a', 'http://127.1.2.3:123/a', 'http://[::1]:123/a'])('takes %s', url => expect(consentUrl(url)).toBe(new URL(url).href))
  it.each(['http://vendor.example/a', 'http://localhost.evil/a', 'http://evil.localhost/a', 'http://192.168.1.2/a', 'javascript:alert(1)', '//vendor.example/a', 'bad', 'https://user:secret@vendor.example/a', 'http://[::2]/a'])('refuses %s', url => expect(consentUrl(url)).toBeNull())
})
describe('callback hints', () => {
  const data = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  const event = (over: object = {}, origin = 'https://hennery.example') => new MessageEvent('message', { origin, data: { ...data, ...over } })
  it('takes only the matching return-origin hint', () => expect(oauthHint(event(), 'https://hennery.example', item.id)).toBe(true))
  it.each([{ type: 'other' }, { connection_id: 'other' }, { connection_id: '' }, { outcome: 'other' }, { result: 3 }])('refuses malformed or unrelated %j', over => expect(oauthHint(event(over), 'https://hennery.example', item.id)).toBe(false))
  it('refuses another origin and port', () => expect(oauthHint(event({}, 'https://hennery.example:444'), 'https://hennery.example', item.id)).toBe(false))
  it('refuses non-object data', () => expect(oauthHint(new MessageEvent('message', { origin: 'https://hennery.example', data: null }), 'https://hennery.example', item.id)).toBe(false))
})
describe('server-observed completion', () => {
  it('is connected only on a newer ok stamp', () => expect(completion(item, { ...item, status_at: '2026-10-03T10:00:01Z' })).toBe('connected'))
  it('is failed on a new server error', () => expect(completion(item, { ...item, oauth_error: { code: 'consent_denied', message: 'denied', at: item.status_at } })).toBe('failed'))
  it('is removed when the item went', () => expect(completion(item, undefined)).toBe('removed'))
  it.each([item, { ...item, status: 'error' as const, status_at: '2026-10-03T10:00:01Z' }, { ...item, status_at: 'invalid' }])('leaves identical, failing or unparseable reports pending', after => expect(completion(item, after)).toBe('pending'))
  it('does not mistake an identical old error for a new one', () => { const before = { ...item, oauth_error: { code: 'x', message: 'x', at: item.status_at } }; expect(completion(before, before)).toBe('pending') })
})
describe('client secret intent', () => {
  it('keeps only the same stored id', () => expect(clientRequest('id', 'id', 'keep', '')).toEqual({ client_id: 'id' }))
  it('explicitly selects public', () => expect(clientRequest(undefined, 'id', 'public', '')).toEqual({ client_id: 'id', client_secret: null }))
  it('sets a new secret', () => expect(clientRequest('old', 'new', 'replace', 'secret')).toEqual({ client_id: 'new', client_secret: 'secret' }))
  it.each([['old', 'new', 'keep', ''], [undefined, 'new', 'keep', ''], ['id', '', 'public', ''], ['id', 'id', 'replace', '']] as const)('refuses incomplete intent %j', (stored, id, mode, secret) => expect(clientRequest(stored, id, mode, secret)).toBeNull())
})
describe('OAuth action', () => {
  it.each([
    [connection(), 'none'], [connection({ cred_kind: 'oauth_client' }), 'client'],
    [connection({ cred_kind: 'oauth_dcr' }), 'connect'], [item, 'reconnect'],
    [{ ...item, status: 'needs_auth' }, 'reconnect'], [{ ...item, status: 'error' }, 'probe'],
  ] as const)('uses the reported kind/state', (c, action) => expect(oauthAction(c)).toBe(action))
})
describe('refusal guidance', () => {
  it.each(['issuer_changed', 'resource_mismatch', 'resource_foreign', 'no_oauth_client', 'no_registration_endpoint', 'too_many_flows', 'pkce_unsupported', 'insecure_metadata', 'egress_refused', 'upstream_unreachable', 'wrong_cred_kind', 'no_credential'])('explains %s', code => expect(oauthGuidance(code)).not.toBe(''))
  it('does not classify vendor wording or unknown codes', () => expect(oauthGuidance('vendor says invalid_target')).toBe(''))
})
