import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
/** Decode CSS escapes before looking for URL/import syntax, so escaped
 * identifiers and protocols receive the same verdict as their plain forms. */
export function externalReferences(css) {
  const decoded = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n\f])/gi, (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex, 16) || 0xfffd) : char)
  const references = []
  for (const match of decoded.matchAll(/\burl\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)|@import\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const url = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5]).trim()
    // Relative, root-relative, fragments and embedded data have no external origin.
    if (/^[\u0000-\u0020]*[\/\\]{2}/.test(url) || (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^data:/i.test(url))) references.push(url)
  }
  return references
}
export function checkCSSOrigins(directory) {
  const css = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && entry.name.endsWith('.css')) css.push(path)
    }
  }
  walk(directory)
  if (!css.length) throw new Error('No emitted CSS assets were checked.')
  for (const path of css) {
    const external = externalReferences(readFileSync(path, 'utf8'))
    if (external.length) throw new Error(`External CSS origin in ${relative(directory, path)}: ${external.join(', ')}`)
  }
  return css.length
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Checked ${checkCSSOrigins(resolve(process.argv[2] ?? 'dist'))} emitted CSS assets: same-origin only.`)
}
