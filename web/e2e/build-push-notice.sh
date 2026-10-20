#!/bin/sh
# Run inside the dev shell. Reuse Cargo's exact current dependency artifacts.
set -eu
cd "$(dirname "$0")/../.."
mkdir -p target
cargo build -p hennery-sessions --lib --locked --message-format=json > target/ui-r2-push-artifacts.json
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs'
const rows = readFileSync('target/ui-r2-push-artifacts.json', 'utf8').trim().split('\n').map(line => JSON.parse(line))
const args = ['--edition=2024', 'web/e2e/push-notice.rs', '-L', 'dependency=target/debug/deps', '-o', 'target/hennery-push-notice']
for (const name of ['hennery_sessions', 'hennery_kernel']) {
  const paths = [...new Set(rows.filter(row => row.reason === 'compiler-artifact' && row.target.name === name).flatMap(row => row.filenames.filter(path => path.endsWith('.rlib'))))]
  if (paths.length !== 1) throw Error(`Expected one current artifact for ${name}; got ${paths.length}`)
  args.push('--extern', `${name}=${paths[0]}`)
}
// rustc response files take exactly one argument per line, without shell parsing.
writeFileSync('target/ui-r2-push-rustc.args', args.join('\n'))
JS
rustc @target/ui-r2-push-rustc.args
