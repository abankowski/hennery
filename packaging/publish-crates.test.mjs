import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {publishFrozen,crateExists} from './publish-crates.mjs';
import {CRATES_USER_AGENT} from './crate-registry.mjs';
import {ORDER,sha256} from './crate-release.mjs';
import limits from './crates-publish-limits.json' with {type:'json'};
function fixture(){
  const dir=fs.mkdtempSync(join(tmpdir(),'r3-publish-'));
  const source={sha:'a'.repeat(40),url:`https://github.com/marcinwadon/hennery/tree/${'a'.repeat(40)}`};
  const crates=ORDER.map(name=>{const bytes=Buffer.from(name),file=`${name}-0.1.0-alpha.1.crate`;fs.writeFileSync(join(dir,file),bytes);return {name,file,sha256:sha256(bytes),size:bytes.length,upload:{name,vers:'0.1.0-alpha.1'}};});
  fs.writeFileSync(join(dir,'crates-inventory.json'),JSON.stringify({schema:1,version:'0.1.0-alpha.1',source,crates}));
  return {dir,crates,source,digest:sha256(fs.readFileSync(join(dir,'crates-inventory.json')))};
}
function network(f,{existing=false,mismatch=false,ambiguous=false,indexBad=false,unavailable=false}={}){
  const uploads=[],published=new Set(existing?ORDER:[]);
  const fetcher=async(url,options={})=>{
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
    const download=url.endsWith('/download'),name=url.split('/').at(download?-3:-2);
    if(unavailable)return new Response(name,{status:503});
    if(!published.has(name))return download
      ?new Response('<Error><Code>AccessDenied</Code></Error>',{status:403})
      :new Response(JSON.stringify({errors:[{detail:'crate version does not exist'}]}),{status:404});
    return new Response(download?(mismatch?'wrong':name):JSON.stringify({version:{num:'0.1.0-alpha.1'}}));
  };
  return {uploads,fetcher};
}
test('new publication uploads exact bytes in order and confirms remote bytes/index',async()=>{
  const f=fixture(),n=network(f);let credentials=0;
  assert.deepEqual(await publishFrozen({...f,...n,credentials:async()=>{credentials++;return 'ephemeral';}}),ORDER);
  assert.deepEqual(n.uploads,ORDER);assert.equal(credentials,1);
});
test('matching remote bytes reconcile without reupload',async()=>{const f=fixture(),n=network(f,{existing:true});await publishFrozen({...f,...n,credentials:async()=>'ephemeral'});assert.equal(n.uploads.length,0);});
test('every registry request identifies the release client, without sending the token on GET',async()=>{
 const f=fixture(),n=network(f),requests=[];
 await publishFrozen({...f,credentials:async()=>'ephemeral',fetcher:async(url,options)=>{
  requests.push(url);assert.equal(options.headers['User-Agent'],CRATES_USER_AGENT);
  if(options.method!=='PUT')assert.equal(options.headers.Authorization,undefined);
  return n.fetcher(url,options);
 }});
 assert.ok(requests.some(url=>url.endsWith('/new')));
 assert.ok(requests.some(url=>url.endsWith('/download')));
 assert.ok(requests.some(url=>url.endsWith('/0.1.0-alpha.1')));
 assert.ok(requests.some(url=>url.startsWith('https://index.crates.io/')));
});
test('only API 200 and 404 decide existence; other statuses refuse before upload',async()=>{
 for(const status of [201,204,302,401,403,429,503]){
  const f=fixture(),n=network(f);
  await assert.rejects(publishFrozen({...f,credentials:async()=>'ephemeral',fetcher:async(url,options)=>{
   if(url.endsWith('/0.1.0-alpha.1'))return new Response(null,{status});
   return n.fetcher(url,options);
  }}),new RegExp(`registry version unavailable: hennery-proto: HTTP ${status}`));
  assert.equal(n.uploads.length,0);
 }
});
test('post-upload polling waits for API visibility and CDN bytes without reuploading',async()=>{
 const f=fixture(),n=network(f),apiReads=new Map(),cdnReads=new Map();let pauses=0;
 const completed=await publishFrozen({...f,credentials:async()=>'ephemeral',pause:async ms=>{assert.equal(ms,10000);pauses++;},fetcher:async(url,options)=>{
  const download=url.endsWith('/download'),name=url.split('/').at(download?-3:-2);
  if(n.uploads.includes(name) && !url.startsWith('https://index.crates.io/')){
   const reads=download?cdnReads:apiReads,count=(reads.get(name)||0)+1;reads.set(name,count);
   if(count<=2)return new Response(download?'<Error><Code>AccessDenied</Code></Error>':'missing',{status:download?403:404});
  }
  return n.fetcher(url,options);
 }});
 assert.deepEqual(completed,ORDER);assert.deepEqual(n.uploads,ORDER);assert.equal(pauses,4*ORDER.length);
});
test('slow API/CDN propagation consumes the same wall-clock budget as index polling',async t=>{
 const f=fixture(),n=network(f),pauses=[];let now=0,indexReads=0;
 t.mock.method(Date,'now',()=>now);
 await assert.rejects(publishFrozen({...f,credentials:async()=>'ephemeral',pause:async ms=>{pauses.push(ms);now+=ms;},fetcher:async(url,options)=>{
  if(url.endsWith('/0.1.0-alpha.1') && n.uploads.length)now=limits.poll_attempts*limits.poll_interval_ms-1000;
  if(url.startsWith('https://index.crates.io/')){indexReads++;return new Response(null,{status:404});}
  return n.fetcher(url,options);
 }}),/registry propagation deadline exceeded: hennery-proto/);
 assert.equal(indexReads,1);assert.deepEqual(pauses,[1000]);assert.deepEqual(n.uploads,[ORDER[0]]);
});
for(const pending of ['api','cdn-403','cdn-404'])test(`post-upload ${pending} propagation has a bounded retry and stops before consumers`,async()=>{
 const f=fixture(),n=network(f);let pauses=0,reads=0;
 await assert.rejects(publishFrozen({...f,credentials:async()=>'ephemeral',pause:async()=>{pauses++;},fetcher:async(url,options)=>{
  if(n.uploads.length && ((pending==='api' && url.endsWith('/0.1.0-alpha.1')) || (pending!=='api' && url.endsWith('/download')))){
   reads++;return new Response('unavailable',{status:pending==='cdn-403'?403:404});
  }
  return n.fetcher(url,options);
 }}),new RegExp(`remote package unavailable after upload: hennery-proto: HTTP ${pending==='cdn-403'?403:404}`));
 assert.equal(reads,48);assert.equal(pauses,47);assert.deepEqual(n.uploads,[ORDER[0]]);
});
test('a successful upload still requires matching remote bytes',async()=>{
 const f=fixture(),n=network(f,{mismatch:true});
 await assert.rejects(publishFrozen({...f,...n,credentials:async()=>'ephemeral'}),/remote digest differs: hennery-proto/);
 assert.deepEqual(n.uploads,[ORDER[0]]);
});
test('a present version with unavailable CDN bytes refuses without upload',async()=>{
 const f=fixture(),n=network(f,{existing:true});
 await assert.rejects(publishFrozen({...f,credentials:async()=>'ephemeral',fetcher:(url,options)=>url.endsWith('/download')?new Response(null,{status:403}):n.fetcher(url,options)}),/remote package unavailable\/unverifiable: hennery-proto: HTTP 403/);
 assert.equal(n.uploads.length,0);
});
for(const [name,flags]of Object.entries({mismatch:{existing:true,mismatch:true},ambiguous:{ambiguous:true},index:{indexBad:true},remote:{unavailable:true}}))test(`refuses ${name} and never uploads consumers`,async()=>{const f=fixture(),n=network(f,flags);await assert.rejects(publishFrozen({...f,...n,credentials:async()=>'ephemeral'}));assert.ok(n.uploads.length<=1);});
for(const changed of ['inventory','crate','missing'])test(`refuses ${changed} at the actual upload boundary`,async()=>{
 const f=fixture(),n=network(f);let uploadAttempts=0;
 await assert.rejects(publishFrozen({...f,credentials:async()=>'ephemeral',fetcher:async(...args)=>{
  if(args[1]?.method==='PUT')uploadAttempts++;
  const response=await n.fetcher(...args);
  if(args[0].endsWith('/0.1.0-alpha.1')){
   const path=join(f.dir,changed==='inventory'?'crates-inventory.json':f.crates[0].file);
   if(changed==='missing')fs.rmSync(path);else fs.appendFileSync(path,'bad');
  }
  return response;
 }}));
 assert.equal(uploadAttempts,0);assert.equal(n.uploads.length,0);
});
import {createServer} from 'node:http';
test('existence probe uses API status while a real missing-download redirect ends in CDN 403',async()=>{
 const server=createServer((req,res)=>{
  if(req.url.endsWith('/download')){res.writeHead(302,{Location:'/static/missing.crate'}).end();return;}
  if(req.url.startsWith('/static/')){res.writeHead(403).end('<Error><Code>AccessDenied</Code></Error>');return;}
  assert.equal(req.headers['user-agent'],CRATES_USER_AGENT);
  res.writeHead(req.url.includes('/serde/')?200:404).end('{}');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const origin=`http://127.0.0.1:${server.address().port}`,fetcher=(url,options)=>fetch(origin+new URL(url).pathname,options);
  assert.equal((await fetcher('https://crates.io/api/v1/crates/missing/0.0.0/download')).status,403);
  assert.equal(await crateExists('missing','0.0.0',fetcher),false);
  assert.equal(await crateExists('serde','1.0.0',fetcher),true);
 }finally{await new Promise(r=>server.close(r));}
});
test('registry refusals expose bounded errors detail through real fetch at upload, download and index',async()=>{
 for(const phase of ['version','upload','download','index']){
  const f=fixture(),n=network(f,{existing:phase!=='upload'});
  const server=createServer(async(req,res)=>{
   const url=new URL(req.url,'http://loopback').searchParams.get('upstream');
   if((phase==='version' && url.endsWith('/0.1.0-alpha.1')) || (phase==='upload' && req.method==='PUT') || (phase==='download' && url.endsWith('/download')) || (phase==='index' && url.startsWith('https://index.crates.io/'))){
    res.writeHead(phase==='upload'?400:503,{'Content-Type':'application/json'});
    res.end(JSON.stringify({errors:[{detail:'A verified email address is required. '+('x'.repeat(600))+' END-OF-DETAIL'}]}));
   }else{const response=await n.fetcher(url);res.writeHead(response.status);res.end(Buffer.from(await response.arrayBuffer()));}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
   const origin=`http://127.0.0.1:${server.address().port}`;
   await assert.rejects(publishFrozen({...f,credentials:async()=>'ephemeral',fetcher:(url,options)=>fetch(origin+'/?upstream='+encodeURIComponent(url),options)}),error=>{
    assert.match(error.message,new RegExp(`HTTP ${phase==='upload'?400:503}`));
    assert.match(error.message,/A verified email address is required/);
    assert.ok(!error.message.includes('END-OF-DETAIL'));
    assert.ok(error.message.length<500);return true;
   });
  }finally{await new Promise(r=>server.close(r));}
 }
});
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
  await publishFrozen({...f,credentials:async()=>'ephemeral',fetcher:(url,options)=>fetch(origin+'/?upstream='+encodeURIComponent(url),options)});
  assert.equal(received,7);assert.deepEqual(n.uploads,ORDER);
 }finally{await new Promise(r=>server.close(r));}
});
test('valid JSON inventory tampering stops before obtaining credentials',async()=>{
 const f=fixture(),n=network(f),path=join(f.dir,'crates-inventory.json');const i=JSON.parse(fs.readFileSync(path));i.audit_note='tampered';fs.writeFileSync(path,JSON.stringify(i));let acquired=false;
 await assert.rejects(publishFrozen({...f,...n,credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('same-size retained crate tampering stops before credentials',async()=>{
 const f=fixture(),n=network(f);fs.writeFileSync(join(f.dir,f.crates[0].file),'x'.repeat(f.crates[0].size));let acquired=false;
 await assert.rejects(publishFrozen({...f,...n,credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('OIDC acquisition follows shared verifier and explicit bootstrap mode',()=>{
 const yaml=fs.readFileSync('.github/workflows/release.yml','utf8');
 const preflight=yaml.indexOf('id: verified'),auth=yaml.indexOf('uses: rust-lang/crates-io-auth-action@');
 assert.ok(preflight>=0 && auth>preflight);
 assert.match(yaml,/CARGO_REGISTRY_TOKEN: \$\{\{ steps\.cratesio\.outputs\.token \}\}/);
 assert.match(yaml,/RELEASE_CRATES_BOOTSTRAP_ENABLED/);
 assert.ok(yaml.indexOf('id: crates-publish')>auth);
});
import { preflight } from './publish-crates.mjs';
test('precredential preflight validates the frozen candidate without requests',()=>{
 const f=fixture(),result=preflight(f);
 assert.equal(result.inventory.version,'0.1.0-alpha.1');
});
