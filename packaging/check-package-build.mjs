// Exercise the actual compiled kernel build script, including precedence and fail-closed packaging.
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { sha256,requireThat } from './crate-release.mjs';
const directory=resolve('target/debug/build');
const candidates=fs.readdirSync(directory).filter(n=>n.startsWith('hennery-kernel-')).map(n=>join(directory,n,'build-script-build')).filter(p=>fs.existsSync(p)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
requireThat(candidates.length>0,'build hennery-kernel before checking its build script');
let checks=0;
function check(name,setup,expected,options={}){
 const root=fs.mkdtempSync(join(tmpdir(),'hennery-r3-build-')),manifest=join(root,'crates/hennery-kernel'),out=join(root,'out');
 fs.mkdirSync(manifest,{recursive:true});fs.mkdirSync(out);
 setup({root,manifest,out});
 const result=spawnSync(candidates[0],[],{encoding:'utf8',env:{...process.env,CARGO_MANIFEST_DIR:manifest,OUT_DIR:out,HENNERY_WEB_DIST:'',HENNERY_WEB_REQUIRE:'',...options}});
 requireThat(result.status===expected,`${name}: exit ${result.status}, expected ${expected}: ${result.stderr}`);checks++;
 return {root,manifest,out};
}
function neighboring({root}){fs.mkdirSync(join(root,'web/dist'),{recursive:true});fs.writeFileSync(join(root,'web/dist/index.html'),'checkout UI');}
function marked({manifest}){fs.mkdirSync(join(manifest,'web-dist'));fs.writeFileSync(join(manifest,'web-dist/index.html'),'package UI');fs.writeFileSync(join(manifest,'release-ui.json'),JSON.stringify({schema:1,source_sha:'a'.repeat(40),files:{'index.html':sha256(Buffer.from('package UI'))}}));}
let result=check('development placeholder',()=>{},0);
requireThat(fs.readFileSync(join(result.out,'placeholder.html'),'utf8').includes('hennery-web-ui-not-embedded'),'development placeholder missing');
check('checkout default',neighboring,0);
result=check('marked UI before checkout',ctx=>{neighboring(ctx);marked(ctx);},0);
requireThat(fs.readFileSync(join(result.out,'web_assets.rs'),'utf8').includes('/web-dist/index.html'),'checkout took precedence over package');
check('damaged marked UI refuses neighboring fallback',ctx=>{neighboring(ctx);marked(ctx);fs.unlinkSync(join(ctx.manifest,'web-dist/index.html'));},101);
check('normalized package cannot lose marker',ctx=>{neighboring(ctx);fs.writeFileSync(join(ctx.manifest,'Cargo.toml.orig'),'[package]');},101);
check('explicit relative override',()=>{},101,{HENNERY_WEB_DIST:'relative'});
check('explicit missing override',()=>{},101,{HENNERY_WEB_DIST:'/no-such-hennery-ui-directory'});
check('require real UI',()=>{},101,{HENNERY_WEB_REQUIRE:'1'});
check('invalid require value',()=>{},101,{HENNERY_WEB_REQUIRE:'yes'});
const override=fs.mkdtempSync(join(tmpdir(),'hennery-r3-override-'));fs.writeFileSync(join(override,'index.html'),'override UI');
result=check('explicit source-builder override precedes package marker',ctx=>{marked(ctx);fs.unlinkSync(join(ctx.manifest,'web-dist/index.html'));},0,{HENNERY_WEB_DIST:override});
requireThat(fs.readFileSync(join(result.out,'web_assets.rs'),'utf8').includes(override),'explicit override not embedded');
console.log(checks,'compiled build-script checks passed');
