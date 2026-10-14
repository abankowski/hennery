// Registry install, never --path against the checkout. Prefetch precedes an OS network-denied build.
import fs from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { registry } from './crate-registry.mjs';
import { readJSON, verifyCandidate, inspectPackage, checkSourceTree, extract, requireThat, sha256 } from './crate-release.mjs';
import { run } from './prepare-crates.mjs';
const out=resolve(process.argv[2]), inventory=readJSON(join(out,'crates-inventory.json'));
verifyCandidate(out,inventory);
const session=fs.mkdtempSync(join(out,'acceptance-'));
const buildEnvPath=(process.env.PATH||'').split(':').filter(p=>!fs.existsSync(join(p,'node')) && !fs.existsSync(join(p,'pnpm'))).join(':');
const probe=join(session,'source-acceptance');requireThat(!fs.existsSync(probe),'acceptance directory must be fresh');
extract(join(out,`hennery-source-${inventory.source.sha}.tar.gz`),probe);checkSourceTree(probe,inventory.source_files);
const local=await registry(join(out,'registry-cache'));
const cargoHome=join(session,'cargo-home');fs.mkdirSync(cargoHome);
// A private copy of the download cache; no shared Cargo homes/configuration are changed.
for(const part of ['registry/cache','git']) if(fs.existsSync(join(process.env.CARGO_HOME,part))) fs.cpSync(join(process.env.CARGO_HOME,part),join(cargoHome,part),{recursive:true});
fs.writeFileSync(join(cargoHome,'config.toml'),`[source.crates-io]\nreplace-with="candidate"\n[source.candidate]\nregistry="${local.url}"\n`);
const env={...process.env,CARGO_HOME:cargoHome,HENNERY_WEB_DIST:'',HENNERY_WEB_REQUIRE:'',PATH:buildEnvPath};
const empty=join(session,'empty');fs.mkdirSync(empty);
const offline=resolve('packaging/offline-build.sh');
try {
  for(const c of inventory.crates) local.add(c.index,join(out,c.file));
  for(const c of inventory.crates) {
    const root=join(out,'extracted',c.name,`${c.name}-${inventory.version}`);
    inspectPackage(root,c.name,inventory.source);
    await run('cargo',['fetch','--manifest-path',join(root,'Cargo.toml'),'--locked'],{cwd:empty,env});
    // Dry runs execute Cargo's packaging+verification against the test overlay, never upload.
    await run('cargo',['publish','--dry-run','--registry','crates-io','--manifest-path',join(root,'Cargo.toml'),'--locked'],{cwd:empty,env});
    await run('sh',[offline,'cargo','build','--manifest-path',join(root,'Cargo.toml'),'--locked','--offline'],{cwd:empty,env});
    await run('cargo',['clean','--manifest-path',join(root,'Cargo.toml')],{cwd:empty,env});
  }
  // Unlocked consumer resolution has a separate fetch before both offline installations.
  const consumer=join(session,'consumer');fs.mkdirSync(consumer);fs.mkdirSync(join(consumer,'src'));
  fs.writeFileSync(join(consumer,'src/main.rs'),'fn main() {}');
  fs.writeFileSync(join(consumer,'Cargo.toml'),`[package]\nname="r3-resolution"\nversion="0.0.0"\nedition="2024"\n[dependencies]\nhennery="=${inventory.version}"\nhennery-sessions="=${inventory.version}"\nhennery-host="=${inventory.version}"\nopenssl={version="=0.10.81",features=["vendored"]}\nclap={version="4",features=["derive","env"]}\n`);
  await run('cargo',['fetch','--manifest-path',join(consumer,'Cargo.toml')],{cwd:empty,env});
  await run('cargo',['info',`hennery@${inventory.version}`,'--registry','crates-io'],{cwd:empty,env});
  local.offline();
  for(const locked of [true,false]) {
    const install=join(session,locked?'install-locked':'install-unlocked');
    await run('sh',[offline,'cargo','install','hennery','--registry','crates-io','--version',`=${inventory.version}`,'--root',install,'--offline',...(locked?['--locked']:[])],{cwd:empty,env:{...env,PATH:buildEnvPath}});
    const binary=join(install,'bin/hennery');
    await run('sh',[resolve('packaging/check-web-ui.sh'),binary],{env});
    await run(process.execPath,[resolve('packaging/smoke-crate-ui.mjs'),binary],{env});
  }
  // MSRV is a real extracted-package build with the explicitly selected compiler.
  const msrv=process.env.R3_MSRV_CARGO;
  requireThat(msrv,'set R3_MSRV_CARGO to the tested minimum Cargo executable');
  const cli=join(out,'extracted/hennery',`hennery-${inventory.version}`,'Cargo.toml');
  await run('sh',[offline,msrv,'build','--manifest-path',cli,'--locked','--offline'],{cwd:empty,env:{...env,RUSTC:process.env.R3_MSRV_RUSTC}});
  console.log('R3 acceptance passed for inventory',sha256(fs.readFileSync(join(out,'crates-inventory.json'))));
}finally {await local.close();}
