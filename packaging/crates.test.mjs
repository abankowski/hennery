import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const names = ['proto', 'kernel', 'view', 'host', 'gateway', 'sessions', ''];
test('only the seven production crates opt into publication, with package metadata', () => {
  for (const suffix of names) {
    const name = `hennery${suffix ? `-${suffix}` : ''}`;
    const manifest = read(`crates/${name}/Cargo.toml`);
    assert.match(manifest, /publish = \["crates-io"\]/);
    for (const key of ['description', 'readme', 'repository', 'homepage']) assert.match(manifest, new RegExp(`^${key} ?[.=]`, 'm'));
    assert.match(read(`crates/${name}/README.md`), /pre-1.0|C compiler/);
  }
  for (const name of ['pins', 'testkit']) assert.match(read(`crates/hennery-${name}/Cargo.toml`), /publish = false/);
  const root = read('Cargo.toml');
  assert.match(root, /publish = false/);
  for (const name of names.filter(Boolean)) assert.match(root, new RegExp(`hennery-${name} = \\{ path = "crates/hennery-${name}", version = "=0.1.0-alpha.1" \\}`));
});
test('host includes its canonical package-local manifest and generator writes it', () => {
  assert.match(read('crates/hennery-host/src/runtime/manifest.rs'), /include_str!\("\.\.\/\.\.\/manifest.json"\)/);
  assert.match(read('crates/hennery-pins/src/main.rs'), /crates\/hennery-host\/manifest.json/);
  assert.doesNotThrow(() => JSON.parse(read('crates/hennery-host/manifest.json')));
});
test('source builders opt out of default vendored OpenSSL', () => {
  assert.match(read('crates/hennery/Cargo.toml'), /default = \["vendored-openssl"\]/);
  assert.match(read('nix/package.nix'), /cargoExtraArgs = "--locked -p hennery --no-default-features"/);
});
