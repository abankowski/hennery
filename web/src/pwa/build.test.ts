// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { build } from 'vite'
import { pwaBuild } from '../../pwa-build'

it('worker-only and imported worker changes replace the build ID; identical builds are stable', async () => {
  const root = mkdtempSync(join(tmpdir(), 'hennery-build-test-'))
  try {
    mkdirSync(join(root, 'third-party-licenses'))
    writeFileSync(join(root, 'THIRD_PARTY_NOTICES.txt'), 'test notices')
    writeFileSync(join(root, 'index.html'), '<html><head></head><body></body></html>')
    const worker = "import { value } from './helper.js'; self.value = [value, __BUILD_ID__, __PRECACHE__]"
    writeFileSync(join(root, 'worker.js'), worker)
    writeFileSync(join(root, 'helper.js'), 'export const value = 1')
    const emitted = async () => {
      await build({ root, configFile: false, publicDir: false, plugins: [pwaBuild()], logLevel: 'silent' })
      const html = readFileSync(join(root, 'dist/index.html'), 'utf8')
      return /name="hennery-build" content="([a-f0-9]+)"/.exec(html)![1]
    }
    const initial = await emitted()
    expect(await emitted()).toBe(initial)
    writeFileSync(join(root, 'worker.js'), worker + '; self.changed = true')
    const changed = await emitted()
    expect(changed).not.toBe(initial)
    writeFileSync(join(root, 'helper.js'), 'export const value = 2')
    const imported = await emitted()
    expect(imported).not.toBe(changed)
    expect(await emitted()).toBe(imported)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
