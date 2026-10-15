import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {publishFrozen,r1Gate} from './publish-crates.mjs';
import {ORDER,sha256} from './crate-release.mjs';
function fixture(){
  const dir=fs.mkdtempSync(join(tmpdir(),'r3-publish-'));
  const source={sha:'a'.repeat(40),sha256:sha256(Buffer.from('source')),url:`https://github.com/marcinwadon/hennery/releases/download/v0.1.0-alpha.1/hennery-source-${'a'.repeat(40)}.tar.gz`};
  fs.writeFileSync(join(dir,`hennery-source-${source.sha}.tar.gz`),'source');
  const crates=ORDER.map(name=>{const bytes=Buffer.from(name),file=`${name}-0.1.0-alpha.1.crate`;fs.writeFileSync(join(dir,file),bytes);return {name,file,sha256:sha256(bytes),size:bytes.length,upload:{name,vers:'0.1.0-alpha.1'}};});
  fs.writeFileSync(join(dir,'crates-inventory.json'),JSON.stringify({schema:1,version:'0.1.0-alpha.1',source,crates}));
  return {dir,crates,source,digest:sha256(fs.readFileSync(join(dir,'crates-inventory.json')))};
}
function network(f,{existing=false,mismatch=false,ambiguous=false,indexBad=false,unavailable=false,sourceBad=false}={}){
  const uploads=[],published=new Set(existing?ORDER:[]);
  const fetcher=async(url,options={})=>{
    if(url===f.source.url)return new Response(sourceBad?'bad':'source');
    if(url.endsWith('/new')){
      const body=options.body,n=body.readUInt32LE(0),meta=JSON.parse(body.subarray(4,n+4));
      assert.equal(options.headers.Authorization,'ephemeral');
      assert.deepEqual(body.subarray(n+8),Buffer.from(meta.name));
      uploads.push(meta.name);published.add(meta.name);
      if(ambiguous)throw new Error('lost response');
      return new Response('{}');
    }
    if(url.startsWith('https://index.crates.io/')){
      const name=url.split('/').at(-1),c=f.crates.find(c=>c.name===name);
      return new Response(JSON.stringify({vers:'0.1.0-alpha.1',cksum:indexBad?'b'.repeat(64):c.sha256}));
    }
    const name=url.split('/').at(-3);
    if(unavailable)return new Response(name,{status:503});
    if(!published.has(name))return new Response('missing',{status:404});
    return new Response(mismatch?'wrong':name);
  };
  return {uploads,fetcher};
}
test('new publication uploads exact bytes in order after gates, and confirms remote bytes/index',async()=>{
  const f=fixture(),n=network(f);let gates=0,credentials=0;
  assert.deepEqual(await publishFrozen({...f,...n,gate:async()=>{gates++},credentials:async()=>{credentials++;assert.ok(gates>=2);return 'ephemeral';}}),ORDER);
  assert.deepEqual(n.uploads,ORDER);assert.equal(credentials,1);assert.ok(gates>=ORDER.length*3+2);
});
test('matching remote bytes reconcile without reupload',async()=>{const f=fixture(),n=network(f,{existing:true});await publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>'ephemeral'});assert.equal(n.uploads.length,0);});
for(const [name,flags]of Object.entries({mismatch:{existing:true,mismatch:true},ambiguous:{ambiguous:true},index:{indexBad:true},remote:{unavailable:true},source:{sourceBad:true}}))test(`refuses ${name} and never uploads consumers`,async()=>{const f=fixture(),n=network(f,flags);await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>'ephemeral'}));assert.ok(n.uploads.length<=1);});
test('approval failure refuses before obtaining credentials',async()=>{const f=fixture(),n=network(f);let acquired=false;await assert.rejects(publishFrozen({...f,...n,gate:async()=>{throw Error('refused');},credentials:async()=>{acquired=true;}}));assert.equal(acquired,false);});
for(const changed of ['inventory','crate','missing'])test(`refuses ${changed} after approval`,async()=>{const f=fixture(),n=network(f);let count=0;await assert.rejects(publishFrozen({...f,...n,credentials:async()=>'ephemeral',gate:async()=>{if(++count===3){const p=join(f.dir,changed==='inventory'?'crates-inventory.json':f.crates[0].file);if(changed==='missing')fs.rmSync(p);else fs.appendFileSync(p,'bad');}}}));assert.equal(n.uploads.length,0);});
test('R1 adapter missing from trusted checkout fails closed',()=>{
 const cwd=process.cwd(),root=fs.mkdtempSync(join(tmpdir(),'r3-no-gate-'));
 try{process.chdir(root);assert.throws(()=>r1Gate({channel:'crates',digest:'a'.repeat(64)}),/gate.*missing/);}finally{process.chdir(cwd);}
});
test('crate publication uses the real protected manual orchestrator and current authorization',()=>{
 assert.equal(fs.existsSync('.github/workflows/publish-crates.yml'),false);
 const yaml=fs.readFileSync('.github/workflows/release-publish.yml','utf8'),job=yaml.slice(yaml.indexOf('  crates:\n'));
 assert.ok(yaml.includes('  crates:\n'));assert.match(job,/environment: release/);
 assert.match(job,/needs: \[github, authorize\]/);assert.match(job,/vars\.RELEASE_CRATES_ENABLED == 'true'/);
 assert.match(job,/needs\.authorize\.outputs\.run_attempt == github\.run_attempt/);
 assert.match(job,/needs\.authorize\.outputs\.inventory_sha256 == inputs\.inventory_sha256/);
 assert.match(job,/channel: crates/);assert.match(job,/phase: preflight/);assert.match(job,/phase: boundary/);
 assert.doesNotMatch(job,/secrets\..*(?:CARGO|CRATES)|R3_PUBLISH_ENABLED/);
 for(const [,action]of job.matchAll(/uses: ([^\s]+)/g))if(!action.startsWith('./'))assert.match(action,/@[a-f0-9]{40}$/);
});
test('approval invalidated during source verification refuses credentials',async()=>{
 const f=fixture(),n=network(f);let invalid=false,acquired=false;
 await assert.rejects(publishFrozen({...f,fetcher:async(...args)=>{const r=await n.fetcher(...args);if(args[0]===f.source.url)invalid=true;return r;},gate:async()=>{if(invalid)throw Error('approval changed');},credentials:async()=>{acquired=true;return 'ephemeral';}}));
 assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('approval invalidated during registry reconciliation refuses the upload boundary',async()=>{
 const f=fixture(),n=network(f);let invalid=false;
 await assert.rejects(publishFrozen({...f,fetcher:async(...args)=>{const r=await n.fetcher(...args);if(args[0].endsWith('/download'))invalid=true;return r;},gate:async()=>{if(invalid)throw Error('approval changed');},credentials:async()=>'ephemeral'}));
 assert.equal(n.uploads.length,0);
});
import {createServer} from 'node:http';
test('loopback receiver gets frozen upload bytes through real fetch HTTP framing',async()=>{
 const f=fixture(),n=network(f);let received=0;
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://loopback').searchParams.get('upstream');const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const response=await n.fetcher(url,{body:Buffer.concat(chunks),headers:{Authorization:req.headers.authorization},method:req.method});
   if(req.method==='PUT')received++;
   res.writeHead(response.status);res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500).end(String(error));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const origin=`http://127.0.0.1:${server.address().port}`;
  await publishFrozen({...f,gate:async()=>{},credentials:async()=>'ephemeral',fetcher:(url,options)=>fetch(origin+'/?upstream='+encodeURIComponent(url),options)});
  assert.equal(received,7);assert.deepEqual(n.uploads,ORDER);
 }finally{await new Promise(r=>server.close(r));}
});
test('changed retained source bytes stop before credentials',async()=>{const f=fixture(),n=network(f);fs.appendFileSync(join(f.dir,`hennery-source-${f.source.sha}.tar.gz`),'changed');let acquired=false;await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);});
test('valid JSON inventory tampering stops before obtaining credentials',async()=>{
 const f=fixture(),n=network(f),path=join(f.dir,'crates-inventory.json');const i=JSON.parse(fs.readFileSync(path));i.audit_note='tampered';fs.writeFileSync(path,JSON.stringify(i));let acquired=false;
 await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('same-size retained crate tampering stops before credentials',async()=>{
 const f=fixture(),n=network(f);fs.writeFileSync(join(f.dir,f.crates[0].file),'x'.repeat(f.crates[0].size));let acquired=false;
 await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('OIDC acquisition follows frozen-byte preflight and only its ephemeral output reaches upload',()=>{
 const yaml=fs.readFileSync('.github/workflows/release-publish.yml','utf8');
 const preflight=yaml.indexOf('publish-crates.mjs --verify'),auth=yaml.indexOf('uses: rust-lang/crates-io-auth-action@');
 assert.ok(preflight>=0 && auth>preflight,'credentials acquired before preflight');
 assert.match(yaml,/CARGO_REGISTRY_TOKEN: \$\{\{ steps\.cratesio\.outputs\.token \}\}/);
});
test('maintainer and exact Sigstore verification precede crate OIDC in the common orchestrator',()=>{
 const yaml=fs.readFileSync('.github/workflows/release-publish.yml','utf8'),job=yaml.slice(yaml.indexOf('  crates:\n'));
 const verify=job.indexOf('packaging/release/verify.py'),preflight=job.indexOf('publish-crates.mjs --verify'),oidc=job.indexOf('uses: rust-lang/crates-io-auth-action@');
 assert.ok(verify>=0 && verify<oidc && preflight>=0 && preflight<oidc);
 assert.match(job,/--approval-signature signatures\/release-inventory\.json\.asc/);
 assert.match(job,/INVENTORY: \$\{\{ inputs\.inventory_sha256 \}\}/);
});
test('candidate freezes qualified crates alongside native payloads using its single UI build',()=>{
 const yaml=fs.readFileSync('.github/workflows/release-candidate.yml','utf8');
 assert.match(yaml,/  crates:\n/);assert.match(yaml,/prepare-crates\.mjs .*\$PWD\/web\/dist/);
 assert.match(yaml,/ci-crates\.sh/);assert.match(yaml,/name: release-crates/);
 const stage=yaml.indexOf('prepare-crates.mjs --stage'),freeze=yaml.indexOf('supply.py freeze');
 assert.ok(stage>=0 && freeze>stage);
});
import { preflight } from './publish-crates.mjs';
test('precredential preflight validates source and approval without any upload',async()=>{
 const f=fixture(),n=network(f);let gates=0;
 const result=await preflight({...f,...n,gate:async()=>{gates++;}});
 assert.equal(result.inventory.version,'0.1.0-alpha.1');assert.equal(gates,2);assert.equal(n.uploads.length,0);
});
