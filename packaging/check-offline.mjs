import {createServer}from 'node:http';
import {spawn}from 'node:child_process';
import fs from 'node:fs';
import {join,resolve}from 'node:path';
import {tmpdir}from 'node:os';
import {requireThat}from './crate-release.mjs';
const server=createServer((req,res)=>res.end('reachable'));
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
function status(args,env=process.env){return new Promise((resolve,reject)=>{const p=spawn('/bin/sh',args,{env,stdio:'inherit'});p.on('error',reject);p.on('exit',resolve);});}
try{
 requireThat((await fetch(url)).ok,'positive network control failed');
 const code=`fetch(${JSON.stringify(url)},{signal:AbortSignal.timeout(3000)}).then(()=>process.exit(42)).catch(()=>process.exit(0))`;
 requireThat(await status([resolve('packaging/offline-build.sh'),process.execPath,'-e',code])===0,'network-denied build subprocess reached loopback');
 requireThat(await status([resolve('packaging/offline-build.sh'),'/bin/sh','-c','exit 7'])===7,'offline wrapper lost subprocess status');
 const scratch=fs.mkdtempSync(join(tmpdir(),'hennery-r3-platform-'));fs.writeFileSync(join(scratch,'uname'),'#!/bin/sh\necho UnsupportedOS\n',{mode:0o755});
 requireThat(await status([resolve('packaging/offline-build.sh'),'/usr/bin/true'],{...process.env,PATH:scratch})===1,'unsupported platform was accepted');
 console.log('OS network denial, subprocess status and unsupported-host refusal pass');
}finally{await new Promise(r=>server.close(r));}
