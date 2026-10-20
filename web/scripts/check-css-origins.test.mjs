import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkCSSOrigins, externalReferences } from './check-css-origins.mjs'
test('rejects absolute and network-path URLs in emitted font and imported CSS, including escapes', () => {
  for (const css of ['@import "https://example.invalid/style.css";', '@import url(//example.invalid/style.css);', '@font-face {src: url("https://example.invalid/font.woff2")}', 'a { background:URL(//example.invalid/a) }', '@import "HTTP://example.invalid/x";', 'a{background:u\\72l(\\68 ttps://example.invalid/a)}', '@import \'//example.invalid/a\'']) assert.equal(externalReferences(css).length, 1, css)
})
test('accepts same-origin URLs, comments, embedded data and local CSS imports', () => {
  assert.deepEqual(externalReferences('@import "./local.css"; @font-face{src:url(/fonts/Inter.woff2)} a{background:url(data:image/svg+xml;base64,AAAA)} /* url(https://example.invalid/comment) */'), [])
})
test('visits every CSS asset recursively and refuses an empty output', () => {
  const root=mkdtempSync(join(tmpdir(),'hennery-css-origins-'))
  assert.throws(() => checkCSSOrigins(root), /No emitted CSS/)
  mkdirSync(join(root,'lazy'))
  writeFileSync(join(root,'main.css'), '@import "./lazy/chunk.css";')
  writeFileSync(join(root,'lazy/chunk.css'), '@font-face{src:url(//example.invalid/font.woff2)}')
  assert.throws(() => checkCSSOrigins(root), /lazy\/chunk.css/)
  writeFileSync(join(root,'lazy/chunk.css'), '@font-face{src:url(/fonts/Roboto.woff2)}')
  assert.equal(checkCSSOrigins(root),2)
})
