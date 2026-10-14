import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectPackage, validateSource, sha256, publishBody, indexEntry, validateInventory } from './crate-release.mjs';
const hex = 'a'.repeat(40);
const source = { sha: hex, url: `https://github.com/marcinwadon/hennery/releases/download/v0.1.0-alpha.1/hennery-source-${hex}.tar.gz`, sha256: 'b'.repeat(64), notices_sha256:sha256(Buffer.from('React\nMIT License\nCopyright Meta\nPermission is hereby granted...')) };
function fixture(name = 'hennery-kernel') {
  const root = mkdtempSync(join(tmpdir(), 'r3-package-'));
  cpSync('LICENSE', join(root, 'LICENSE'));
  writeFileSync(join(root, 'Cargo.toml'), '[package]\nname="'+name+'"\nversion="0.1.0-alpha.1"\n');
  if (name === 'hennery-kernel') {
    mkdirSync(join(root, 'web-dist'));
    writeFileSync(join(root, 'web-dist/index.html'), '<html>UI</html>');
    writeFileSync(join(root, 'release-ui.json'), JSON.stringify({schema:1, source_sha:hex, files:{'index.html':sha256(Buffer.from('<html>UI</html>'))}}));
    writeFileSync(join(root, 'FRONTEND-NOTICES.txt'), 'React\nMIT License\nCopyright Meta\nPermission is hereby granted...');
    writeFileSync(join(root, 'SOURCE.json'), JSON.stringify(source));
    writeFileSync(join(root, 'README.md'), source.url);
  }
  return root;
}
test('tarball inspection accepts complete packages', () => {
  for (const name of ['hennery-proto','hennery-kernel']) assert.doesNotThrow(() => inspectPackage(fixture(name), name, source));
});
for (const missing of ['LICENSE','FRONTEND-NOTICES.txt','SOURCE.json','README.md','release-ui.json','web-dist/index.html']) test(`refuses missing ${missing}`, () => {
  const root=fixture(); rmSync(join(root,missing));
  assert.throws(() => inspectPackage(root,'hennery-kernel',source));
});
import { rmSync } from 'node:fs';
for (const bad of ['main','v0.1.0','']) test(`refuses mutable/missing source revision ${bad}`, () => {
  assert.throws(() => validateSource({...source,sha:bad,url:source.url.replace(hex,bad)}));
});
test('source must use immutable expected repository/release URL and digest', () => {
  for (const change of [{url:'https://example.com/source.tgz'},{url:source.url.replace(hex,'main')},{sha256:''}]) assert.throws(()=>validateSource({...source,...change}));
});
test('source availability checks actual bytes, status and digest', async () => {
  const s={...source,sha256:sha256(Buffer.from('source'))};
  await validateSource(s, async()=>new Response('source'));
  await assert.rejects(validateSource(s,async()=>new Response('source',{status:404})));
  await assert.rejects(validateSource(s,async()=>new Response('different')));
});
test('inventory rejects changed/missing artifacts and refuses reordered graph', () => {
  const i={schema:1,version:'0.1.0-alpha.1',source,crates:[]};
  assert.throws(()=>validateInventory(i));
});
test('upload framing contains the exact approved crate bytes', () => {
  const bytes=Buffer.from('frozen crate'); const body=publishBody({name:'hennery'},bytes);
  const n=body.readUInt32LE(0), size=body.readUInt32LE(n+4);
  assert.equal(size,bytes.length); assert.deepEqual(body.subarray(n+8),bytes);
  assert.deepEqual(JSON.parse(body.subarray(4,n+4)),{name:'hennery'});
});
test('index preserves dependency renames, feature flags, targets and kinds', () => {
  const dep={name:'real',rename:'alias',req:'=1.2.3',features:['x'],optional:true,uses_default_features:false,target:'cfg(unix)',kind:'build'};
  const e=indexEntry({name:'hennery',version:'1.0.0',dependencies:[dep],features:{default:['dep:alias']},rust_version:'1.88'},'a'.repeat(64));
  assert.deepEqual(e.deps[0],{name:'alias',package:'real',req:'=1.2.3',features:['x'],optional:true,default_features:false,target:'cfg(unix)',kind:'build',registry:null});
  assert.equal(e.v,2); assert.equal(e.rust_version,'1.88');
});

test('refuses wrong licence text, damaged UI, empty notices and forbidden distributables',()=>{
 for(const [path,bytes]of [['LICENSE','wrong'],['web-dist/index.html','modified'],['FRONTEND-NOTICES.txt',''],['web-dist/app.js.map','source map'],['.npmrc','registry=bad']]){
  const root=fixture();writeFileSync(join(root,path),bytes);assert.throws(()=>inspectPackage(root,'hennery-kernel',source),path);
 }
});
import { checkSourceTree } from './crate-release.mjs';
const required=['Cargo.toml','Cargo.lock','LICENSE','web/package.json','web/pnpm-lock.yaml','web/vite.config.ts','crates/hennery-kernel/build.rs','crates/hennery-host/manifest.json','web/src/main.tsx','crates/hennery/src/main.rs'];
function sourceTree(){const root=mkdtempSync(join(tmpdir(),'r3-source-'));const inventory={};for(const p of required){mkdirSync(join(root,p,'..'),{recursive:true});writeFileSync(join(root,p),p);inventory[p]=sha256(Buffer.from(p));}return {root,inventory:Object.fromEntries(Object.entries(inventory).sort(([a],[b])=>a.localeCompare(b)))};}
test('accepts complete corresponding source inventory',()=>{const {root,inventory}=sourceTree();assert.doesNotThrow(()=>checkSourceTree(root,inventory));});
for(const p of required)test(`refuses incomplete corresponding source: ${p}`,()=>{const {root,inventory}=sourceTree();rmSync(join(root,p));delete inventory[p];assert.throws(()=>checkSourceTree(root,inventory));});
test('refuses mismatched corresponding source',()=>{const {root,inventory}=sourceTree();writeFileSync(join(root,'web/src/main.tsx'),'wrong');assert.throws(()=>checkSourceTree(root,inventory));});
import { ORDER } from './crate-release.mjs';
function inventoryFixture(){return {schema:1,version:'0.1.0-alpha.1',source,crates:ORDER.map(name=>({name,file:`${name}-0.1.0-alpha.1.crate`,sha256:'a'.repeat(64),size:100,upload:{name,vers:'0.1.0-alpha.1'}}))};}
test('accepts a complete package inventory',()=>assert.doesNotThrow(()=>validateInventory(inventoryFixture())));
for(const [name,mutate]of [
 ['schema',i=>i.schema=2],['version',i=>i.version='main'],['order',i=>i.crates.reverse()],
 ['filename',i=>i.crates[0].file='../other.crate'],['digest',i=>i.crates[0].sha256='bad'],
 ['empty',i=>i.crates[0].size=0],['size limit',i=>i.crates[0].size=10_000_001],
 ['upload name',i=>i.crates[0].upload.name='other'],['upload version',i=>i.crates[0].upload.vers='9.9.9']
])test(`refuses inventory ${name}`,()=>{const i=inventoryFixture();mutate(i);assert.throws(()=>validateInventory(i));});
for(const [name,value]of [['schema',2],['source_sha','b'.repeat(40)]])test(`refuses mismatched UI ${name}`,()=>{const root=fixture(),m=JSON.parse(readFileSync(join(root,'release-ui.json')));m[name]=value;writeFileSync(join(root,'release-ui.json'),JSON.stringify(m));assert.throws(()=>inspectPackage(root,'hennery-kernel',source));});
test('requires the generated frontend notice inventory and exact licence bytes',()=>{
 const root=fixture();writeFileSync(join(root,'FRONTEND-NOTICES.txt'),'MIT License\nCopyright Wrong\nPermission is hereby granted to copy different bytes from another package.');assert.throws(()=>inspectPackage(root,'hennery-kernel',source));
});
import { execFileSync } from 'node:child_process';
import { gitSourceFiles, extract } from './crate-release.mjs';
test('export-ignore cannot hide corresponding-source fixtures from the acceptance inventory',()=>{
 const {root}=sourceTree();mkdirSync(join(root,'fixtures'));
 writeFileSync(join(root,'fixtures/needed.json'),'source fixture');
 writeFileSync(join(root,'.gitattributes'),'fixtures/needed.json export-ignore\n');
 execFileSync('git',['init','--quiet',root]);execFileSync('git',['add','-A'],{cwd:root});
 const tree=execFileSync('git',['write-tree'],{cwd:root,encoding:'utf8'}).trim(),expected=gitSourceFiles(tree,root);
 const dir=mkdtempSync(join(tmpdir(),'r3-export-ignore-')),archive=join(dir,'source.tar.gz');
 writeFileSync(archive,execFileSync('git',['archive','--format=tar.gz',tree],{cwd:root}));
 const extracted=join(dir,'source');extract(archive,extracted);
 assert.ok(expected['fixtures/needed.json']);assert.throws(()=>checkSourceTree(extracted,expected),/does not match source inventory/);
});
import { prepare } from './prepare-crates.mjs';
test('release preparation itself refuses export-ignored source before any build or resolver',async()=>{
 const {root}=sourceTree();mkdirSync(join(root,'fixtures'));writeFileSync(join(root,'fixtures/needed.json'),'needed fixture');writeFileSync(join(root,'.gitattributes'),'fixtures/needed.json export-ignore\n');
 execFileSync('git',['init','--quiet',root]);execFileSync('git',['add','-A'],{cwd:root});const tree=execFileSync('git',['write-tree'],{cwd:root,encoding:'utf8'}).trim();
 const destination=join(mkdtempSync(join(tmpdir(),'r3-prep-export-ignore-')),'candidate'),prior=process.cwd();
 try{process.chdir(root);await assert.rejects(prepare(destination,tree),/corresponding source does not match source inventory/);}finally{process.chdir(prior);}
});
import { files } from './crate-release.mjs';
test('source inventories preserve reserved JavaScript property names as real files',()=>{
 const root=mkdtempSync(join(tmpdir(),'r3-file-names-'));writeFileSync(join(root,'__proto__'),'required source');
 const inventory=files(root);assert.ok(Object.hasOwn(inventory,'__proto__'));assert.equal(inventory.__proto__,sha256(Buffer.from('required source')));
 execFileSync('git',['init','--quiet',root]);execFileSync('git',['add','-A'],{cwd:root});const tree=execFileSync('git',['write-tree'],{cwd:root,encoding:'utf8'}).trim();
 const expected=gitSourceFiles(tree,root);assert.ok(Object.hasOwn(expected,'__proto__'));assert.equal(expected.__proto__,inventory.__proto__);
});
test('a matching notice digest cannot authorize an empty frontend notice payload',()=>{
 const root=fixture(),empty={...source,notices_sha256:sha256(Buffer.alloc(0))};
 writeFileSync(join(root,'FRONTEND-NOTICES.txt'),'');writeFileSync(join(root,'SOURCE.json'),JSON.stringify(empty));
 assert.throws(()=>inspectPackage(root,'hennery-kernel',empty));
});
import { frontendNotices } from './prepare-crates.mjs';
test('frontend notices include build-tool runtime helpers as well as production dependencies',()=>{
 const web=mkdtempSync(join(tmpdir(),'r3-notice-closure-'));mkdirSync(join(web,'node_modules'));
 writeFileSync(join(web,'package.json'),JSON.stringify({dependencies:{react:'1.0.0'},devDependencies:{vite:'1.0.0'}}));
 writeFileSync(join(web,'vite.config.ts'),"import { defineConfig } from 'vite'\n");
 for(const name of ['react','vite']){mkdirSync(join(web,'node_modules',name));writeFileSync(join(web,'node_modules',name,'package.json'),JSON.stringify({name,version:'1.0.0',license:'MIT'}));writeFileSync(join(web,'node_modules',name,'LICENSE'),`MIT License\nCopyright ${name}\nPermission is hereby granted to copy this fixture.`);}
 const text=frontendNotices(web);assert.match(text,/react@1\.0\.0/);assert.match(text,/vite@1\.0\.0/);assert.match(text,/Copyright vite/);
});
