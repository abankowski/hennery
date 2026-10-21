// Runs after Vite has emitted every chunk. The worker isn't part of its own
// precache. No network-generated URL or query parameter enters this list.
import { createHash } from 'node:crypto'
import { cpSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'
import { build, type Plugin } from 'vite'

const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex')
function png(size: number): Buffer {
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff
    for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0) }
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind), data]), length = Buffer.alloc(4), check = Buffer.alloc(4)
    length.writeUInt32BE(data.length); check.writeUInt32BE(crc(body))
    return Buffer.concat([length, body, check])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6
  const pixels = Buffer.alloc((size * 4 + 1) * size)
  // A simple h inside the central 60%, safe within a maskable icon's circle.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size
    const mark = (u > .30 && u < .40 && v > .25 && v < .75)
      || (u > .40 && u < .65 && v > .46 && v < .56)
      || (u > .55 && u < .65 && v > .50 && v < .75)
    const offset = y * (size * 4 + 1) + 1 + x * 4
    pixels.set(mark ? [245, 245, 240, 255] : [30, 39, 35, 255], offset)
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))])
}

export function pwaBuild(): Plugin {
  let root = '', out = ''
  return {
    name: 'hennery-pwa', apply: 'build',
    configResolved(config) { root = config.root; out = resolve(root, config.build.outDir) },
    async closeBundle() {
      cpSync(resolve(root, 'THIRD_PARTY_NOTICES.txt'), resolve(out, 'THIRD_PARTY_NOTICES.txt'))
      cpSync(resolve(root, 'third-party-licenses'), resolve(out, 'third-party-licenses'), { recursive: true })
      for (const size of [180, 192, 512]) writeFileSync(resolve(out, `icon-${size}.png`), png(size))
      writeFileSync(resolve(out, 'icon-maskable.png'), png(512))
      const mime: Record<string, string> = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json', woff2: 'font/woff2' }
      // Exclude our previous marker when rebuilding a copied test variant.
      const indexPath = resolve(out, 'index.html')
      const html = readFileSync(indexPath, 'utf8').replace(/<meta name="hennery-build" content="[a-f0-9]+">\n?/, '')
      writeFileSync(indexPath, html)
      const entries: { url: string; mime: string; digest: string }[] = []
      const visit = (dir: string, prefix: string) => {
        for (const file of readdirSync(dir, { withFileTypes: true })) {
          if (file.isDirectory()) visit(resolve(dir, file.name), `${prefix}${file.name}/`)
          else if (mime[file.name.split('.').at(-1)!] && file.name !== 'sw.js') entries.push({ url: `${prefix}${file.name}`, mime: mime[file.name.split('.').at(-1)!], digest: hash(readFileSync(resolve(dir, file.name))) })
        }
      }
      visit(out, '/')
      entries.sort((a, b) => a.url.localeCompare(b.url))
      const bundleWorker = (buildId: string, precache: typeof entries, write: boolean) => build({ configFile: false, publicDir: false, root,
        define: { __PRECACHE__: JSON.stringify(precache), __BUILD_ID__: JSON.stringify(buildId) },
        build: { outDir: out, emptyOutDir: false, write, target: 'es2022', lib: { entry: resolve(root, 'worker.js'), name: 'henneryWorker', formats: ['iife'], fileName: () => 'sw.js' } } })
      // Bundle with fixed placeholders first: worker-only changes (including
      // imported helpers) affect the ID without a circular HTML/worker hash.
      const bundled = await bundleWorker('', [], false)
      const workerHashes: string[] = []
      for (const output of Array.isArray(bundled) ? bundled : [bundled]) {
        if (!('output' in output)) throw new Error('Expected a completed worker build')
        for (const chunk of output.output) workerHashes.push(hash(chunk.type === 'chunk' ? chunk.code : chunk.source))
      }
      const buildId = hash(JSON.stringify({ entries, workerHashes }))
      writeFileSync(indexPath, html.replace('</head>', `<meta name="hennery-build" content="${buildId}">\n</head>`))
      entries.find(entry => entry.url === '/index.html')!.digest = hash(readFileSync(indexPath))
      await bundleWorker(buildId, entries, true)
    },
  }
}
