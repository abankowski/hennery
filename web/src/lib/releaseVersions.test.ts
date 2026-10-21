// @vitest-environment node
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { expect, it } from 'vitest'
import webPackage from '../../package.json'

it('keeps the loaded page release aligned with the workspace release', () => {
  const manifest = readFileSync(new URL('../../../Cargo.toml', import.meta.url), 'utf8')
  const workspace = /^\[workspace\.package\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m.exec(manifest)?.[1]
  const version = /^version\s*=\s*"([^"]+)"\s*$/m.exec(workspace ?? '')?.[1]
  expect(version).toBeDefined()
  expect(webPackage.version).toBe(version)
})
