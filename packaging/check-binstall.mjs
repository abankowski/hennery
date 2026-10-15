// Native binstall must refuse even available archives until a dual-verification bridge is reviewed.
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { requireThat } from './crate-release.mjs';
const version=execFileSync('cargo-binstall',['-V'],{encoding:'utf8'}).trim();
requireThat(version==='1.24.0','binstall acceptance pin changed: '+version);
const metadata=JSON.parse(execFileSync('cargo',['metadata','--no-deps','--format-version','1'],{encoding:'utf8'})).packages.find(p=>p.name==='hennery').metadata.binstall;
requireThat(metadata['pkg-fmt']==='txz' && metadata['disabled-strategies'].toSorted().join()==='compile,crate-meta-data,quick-install','native binstall must stay disabled');
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
const args=['hennery','--manifest-path',path,'--version','0.1.0-alpha.1','--disable-telemetry','--no-discover-github-token','--allow-insecure-http','--no-confirm','--no-track'];
async function refuse(target,extra=[]){
 const install=join(root,`install-${target}-${extra.length}`);
 const result=await new Promise((yes,no)=>{
  const child=spawn('cargo-binstall',[...args,'--targets',target,'--install-path',install,...extra],{env});let output='';
  child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
  child.on('error',no);child.on('close',code=>yes({code,output}));
 });
 requireThat(result.code!==0 && /disabled|No viable strategy/i.test(result.output),'native binstall refusal missing: '+result.output);
 requireThat(!fs.existsSync(join(install,'hennery')),'native binstall installed without dual verification');
}
try {
 for(const target of [...qualified,'x86_64-unknown-linux-gnu','aarch64-unknown-linux-gnu']){
  await refuse(target);
 }
 await refuse('x86_64-apple-darwin');await refuse(qualified[0],['--only-signed']);
 requireThat(!requests.some(p=>p.endsWith('.tar.xz')),'native binstall fetched an archive');
 console.log('binstall 1.24.0: all seven native attempts refused, no archive fetched or installed; scratch:',root);
}finally{await new Promise(r=>server.close(r));}
