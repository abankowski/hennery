#!/bin/sh
# Match Cargo's exact host/Tokio artifacts; unrelated feature builds may
# leave newer, incompatible rlibs in the same private target directory.
set -eu
cd "$(dirname "$0")/../.."
mkdir -p target
cargo build -p hennery-host --lib --locked --offline --message-format=json > target/ui-r5-host-artifacts.json
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs'
const rows = readFileSync('target/ui-r5-host-artifacts.json', 'utf8').trim().split('\n').map(line => JSON.parse(line))
const args = ['--edition=2024', 'web/e2e/fixtures/delegation-host.rs', '-L', 'dependency=target/debug/deps', '-o', 'target/hennery-delegation-host']
for (const name of ['hennery_host', 'tokio']) {
  const paths = [...new Set(rows.filter(row => row.reason === 'compiler-artifact' && row.target.name === name).flatMap(row => row.filenames.filter(path => path.endsWith('.rlib'))))]
  if (paths.length !== 1) throw Error(`Expected one current artifact for ${name}; got ${paths.length}`)
  args.push('--extern', `${name}=${paths[0]}`)
}
writeFileSync('target/ui-r5-host-rustc.args', args.join('\n'))
JS
rustc @target/ui-r5-host-rustc.args
