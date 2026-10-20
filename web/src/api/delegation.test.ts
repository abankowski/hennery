import { expect, it } from 'vitest'
import { routed, json } from '../test-stream'
import { executionPolicy, runtimeCatalog, sessionTools, setExecutionPolicy, setSessionTools } from './delegation'
it('encodes ids and catalog context and preserves generated policy/flag requests', async () => {
  const server = routed(() => json({ revision: 3, allowed: {}, delegation_enabled: false }))
  await sessionTools(server.client, 'hat/a?b')
  await setSessionTools(server.client, 'hat/a?b', { delegation_enabled: false })
  await executionPolicy(server.client, 'hat/a?b')
  const grant = { allowed: { custom: { sandbox: [false, 'value'] } } }
  await setExecutionPolicy(server.client, 'hat/a?b', grant)
  await runtimeCatalog(server.client, 'host/a', 'custom & agent', '/project/?')
  expect(server.calls.map(c => [c.method, c.path])).toEqual([
    ['GET', '/api/hats/hat%2Fa%3Fb/session-tools'], ['PATCH', '/api/hats/hat%2Fa%3Fb/session-tools'],
    ['GET', '/api/hats/hat%2Fa%3Fb/delegation-policy'], ['PATCH', '/api/hats/hat%2Fa%3Fb/delegation-policy'],
    ['GET', '/api/hosts/host%2Fa/runtime-catalog?agent=custom+%26+agent&cwd=%2Fproject%2F%3F'],
  ])
  expect(JSON.parse(String(server.fetch.mock.calls[1][1]?.body))).toEqual({ delegation_enabled: false })
  expect(JSON.parse(String(server.fetch.mock.calls[3][1]?.body))).toEqual(grant)
})
