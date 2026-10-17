import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ORDER,sha256} from './crate-release.mjs';
import * as stage from './prepare-crates.mjs';
function fixture(){
 const root=fs.mkdtempSync(join(tmpdir(),'r3-stage-')),from=join(root,'prepared'),to=join(root,'flat');fs.mkdirSync(from);fs.mkdirSync(to);
 const source={sha:'a'.repeat(40),url:`https://github.com/marcinwadon/hennery/tree/${'a'.repeat(40)}`};
 const crates=ORDER.map(name=>{const file=name+'-0.1.0.crate';fs.writeFileSync(join(from,file),name);return{name,file,sha256:sha256(name),size:name.length,upload:{name,vers:'0.1.0'}};});
 fs.writeFileSync(join(from,'crates-inventory.json'),JSON.stringify({schema:1,version:'0.1.0',source,crates}));
 fs.writeFileSync(join(from,'source-snapshot.tar.gz'),'local preparation snapshot; never exported');
 fs.mkdirSync(join(from,'pnpm-store'));fs.writeFileSync(join(from,'candidate-config.toml'),'scratch registry config');
 return{from,to,crates};
}
test('flat R1 staging exports only final immutable crates, channel inventory without a source asset',()=>{
 const f=fixture();stage.stageCrates(f.from,f.to);assert.equal(fs.readdirSync(f.to).length,8);
 for(const file of fs.readdirSync(f.to))assert.deepEqual(fs.readFileSync(join(f.to,file)),fs.readFileSync(join(f.from,file)));
});
test('flat staging refuses changed preparation bytes before any copy',()=>{
 const f=fixture();fs.appendFileSync(join(f.from,f.crates[0].file),'bad');assert.throws(()=>stage.stageCrates(f.from,f.to));assert.equal(fs.readdirSync(f.to).length,0);
});
test('flat staging refuses an existing name instead of overwriting native material',()=>{
 const f=fixture();fs.writeFileSync(join(f.to,'crates-inventory.json'),'existing');assert.throws(()=>stage.stageCrates(f.from,f.to));assert.equal(fs.readFileSync(join(f.to,'crates-inventory.json'),'utf8'),'existing');
});
test('flat staging refuses a destination created after preflight',()=>{
 const f=fixture(),copy=fs.copyFileSync,path=join(f.to,'crates-inventory.json');
 fs.copyFileSync=(from,to,flags)=>{fs.writeFileSync(to,'raced');return copy(from,to,flags);};
 try{assert.throws(()=>stage.stageCrates(f.from,f.to));assert.equal(fs.readFileSync(path,'utf8'),'raced');}finally{fs.copyFileSync=copy;}
});
