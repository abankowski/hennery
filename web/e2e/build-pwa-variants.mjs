import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pwaBuild } from '../pwa-build.ts'

const root = resolve('web'), out = mkdtempSync(resolve('target/pwa-variant-'))
cpSync(resolve(root, 'dist'), out, { recursive: true })
// A real second embedded shell: every JS chunk and both fixed-name files
// change with status 200 and the expected MIME. Digest rejection, not 404,
// must reject a mid-install mixture.
for (const file of ['index.html', 'theme.js', ...readdirSync(resolve(out, 'assets')).filter((f) => f.endsWith('.js')).map((f) => `assets/${f}`)]) {
  writeFileSync(resolve(out, file), readFileSync(resolve(out, file), 'utf8') + (file.endsWith('.html') ? '\n<!-- pwa test build B -->\n' : '\n/* pwa test build B */\n'))
}
const plugin = pwaBuild()
plugin.configResolved({ root, build: { outDir: out } })
await plugin.closeBundle()
writeFileSync(resolve('target/pwa-variant.json'), JSON.stringify({ dist: out }))
