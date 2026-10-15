import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('final CLI metadata disables every native strategy and pins external dual verification',()=>{
 const cli=JSON.parse(execFileSync('cargo',['metadata','--locked','--no-deps','--format-version=1'],{encoding:'utf8'})).packages.find(p=>p.name==='hennery');
 assert.deepEqual(cli.metadata.binstall['disabled-strategies'].toSorted(),['compile','crate-meta-data','quick-install']);
 assert.deepEqual(cli.metadata['hennery-release'],{
  verification:'external-openpgp-sigstore',
  'maintainer-fingerprint':'F26C7F594DFE84D131703AFC23E5A318AE8D2861',
  'signer-identity':`https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/v${cli.version}`
 });
});
