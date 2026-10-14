// Pinned real binstall, loopback archives; no registry credentials or public uploads.
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { run } from './prepare-crates.mjs';
import { requireThat } from './crate-release.mjs';
const version=execFileSync('cargo-binstall',['-V'],{encoding:'utf8'}).trim();
requireThat(version==='1.24.0','binstall acceptance pin changed: '+version);
const metadata=JSON.parse(execFileSync('cargo',['metadata','--no-deps','--format-version','1'],{encoding:'utf8'})).packages.find(p=>p.name==='hennery').metadata.binstall;
requireThat(metadata['pkg-fmt']==='txz' && metadata['disabled-strategies'].join()==='quick-install,compile','binstall metadata strategy/format changed');
const root=fs.mkdtempSync(join(tmpdir(),'hennery-r3-binstall-')), archives=new Map(),requests=[];
const qualified=['aarch64-apple-darwin','x86_64-unknown-linux-musl','aarch64-unknown-linux-musl'];
for(const target of qualified){
 const directory=`hennery-${target}`;fs.mkdirSync(join(root,directory));
 fs.writeFileSync(join(root,directory,'hennery'),'#!/bin/sh\necho hennery-fixture\n',{mode:0o755});
 const archive=join(root,`${directory}.tar.xz`);execFileSync('tar',['-cJf',archive,'-C',root,directory]);archives.set(`/${directory}.tar.xz`,archive);
}
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;requests.push(path);
 const archive=archives.get(path);if(!archive){res.writeHead(404).end();return;}
 res.setHeader('content-length',fs.statSync(archive).size);res.end(req.method==='HEAD'?undefined:fs.readFileSync(archive));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let manifest='[package]\nname="hennery"\nversion="0.1.0-alpha.1"\nedition="2024"\nrepository="'+origin+'"\n[[bin]]\nname="hennery"\npath="main.rs"\n[package.metadata.binstall]\n';
for(const [key,value]of Object.entries(metadata).filter(([k])=>k!=='overrides'))manifest+=`${key} = ${JSON.stringify(typeof value==='string'?value.replace('{ repo }/releases/download/v{ version }',origin):value)}\n`;
for(const [target,override]of Object.entries(metadata.overrides)){
 manifest+=`[package.metadata.binstall.overrides.${target}]\n`;
 for(const [key,value]of Object.entries(override))manifest+=`${key} = ${JSON.stringify(value.replace('{ repo }/releases/download/v{ version }',origin))}\n`;
}
const path=join(root,'Cargo.toml');fs.writeFileSync(path,manifest);fs.writeFileSync(join(root,'main.rs'),'fn main(){}');
const env={...process.env};delete env.GITHUB_TOKEN;delete env.GH_TOKEN;
const args=['hennery','--manifest-path',path,'--version','0.1.0-alpha.1','--strategies','crate-meta-data','--disable-telemetry','--no-discover-github-token','--allow-insecure-http','--no-confirm','--no-track'];
try {
 for(const target of [...qualified,'x86_64-unknown-linux-gnu','aarch64-unknown-linux-gnu']){
  const install=join(root,'install-'+target),start=requests.length;
  await run('cargo-binstall',[...args,'--targets',target,'--install-path',install],{env});
  requireThat(fs.readFileSync(join(install,'hennery'),'utf8').includes('hennery-fixture'),'binary extracted at wrong path');
  const selected=target.replace('-gnu','-musl');
  requireThat(requests.slice(start).some(p=>p===`/hennery-${selected}.tar.xz`),'wrong upstream target archive');
  requireThat(!requests.slice(start).some(p=>p.includes('-gnu.')),'advertised a missing GNU artifact');
 }
 for(const [name,extra]of [['unsupported',['--targets','x86_64-apple-darwin']],['unsigned',['--targets',qualified[0],'--only-signed']]]){
  let refused=false;try{await run('cargo-binstall',[...args,...extra,'--install-path',join(root,name)],{env});}catch{refused=true;}
  requireThat(refused,'binstall did not refuse '+name);
 }
 console.log('binstall 1.24.0: five mappings pass; unsupported/unsigned refuse; scratch:',root);
}finally{await new Promise(r=>server.close(r));}
