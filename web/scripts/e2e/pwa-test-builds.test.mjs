import assert from 'node:assert/strict'
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { spawnHennery } from '../../e2e/spawn.ts'

test('PWA test binaries replace the old inode, preserving executable bytes and open readers', async () => {
  const script = readFileSync(new URL('../../../packaging/pwa-test-builds.sh', import.meta.url), 'utf8')
  const operation = script.split('\n').filter(line => /^(?:cp|copy_variant) target\/debug\/hennery target\/hennery-pwa-base$/.test(line))
  assert.equal(operation.length, 1, 'exercise the actual base-binary copy operation')
  const helper = script.match(/copy_variant\(\) \{[\s\S]*?\n\}/)?.[0] ?? ''
  const root = mkdtempSync(join(tmpdir(), 'hennery-pwa-copy-'))
  let old
  try {
    mkdirSync(join(root, 'target/debug'), { recursive: true })
    const destination = join(root, 'target/hennery-pwa-base')
    writeFileSync(join(root, 'target/debug/hennery'), 'new executable', { mode: 0o755 })
    writeFileSync(destination, 'old executable', { mode: 0o755 })
    const inode = statSync(destination, { bigint: true }).ino
    old = openSync(destination, 'r')
    const child = spawnHennery(['-eu', '-c', helper + '\ncd "$1"\n' + operation[0], 'pwa-copy', root], root, {}, 'ignore', 'sh')
    await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('close', code => code === 0 ? resolve() : reject(new Error(`Copy exited ${code}`)))
    })
    assert.notEqual(statSync(destination, { bigint: true }).ino, inode)
    assert.equal(readFileSync(destination, 'utf8'), 'new executable')
    assert.equal(statSync(destination).mode & 0o111, 0o111)
    assert.equal(readFileSync(old, 'utf8'), 'old executable')
  } finally { if (old !== undefined) closeSync(old); rmSync(root, { recursive: true, force: true }) }
})
