// Run under nix develop. Creates a NEW isolated source snapshot; never mutates checkout inputs.
import fs from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { ORDER, sha256, files, gitSourceFiles, readJSON, requireThat, extract, inspectPackage, indexEntry, uploadMetadata, verifyCandidate, checkSourceTree } from './crate-release.mjs';
import { registry } from './crate-registry.mjs';
export function run(command,args,options={}) {
  console.log('+',command,...args);
  return new Promise((yes,no)=>{
    const child=spawn(command,args,{stdio:'inherit',...options});
    child.on('error',no);child.on('exit',code=>code===0?yes():no(new Error(`${command} exited ${code}`)));
  });
}
export function frontendNotices(web) {
  const seen=new Map();
  function visit(dir) {
    dir=fs.realpathSync(dir); const pkg=readJSON(join(dir,'package.json')), key=`${pkg.name}@${pkg.version}`;
    if(seen.has(key)) return;
    const texts=fs.readdirSync(dir).filter(n=>/^(licen[cs]e|notice|copying)(\.|$|-)/i.test(n)).filter(n=>fs.statSync(join(dir,n)).isFile());
    requireThat(texts.length>0,`licence review required: no licence text for ${key}`);
    seen.set(key,`${key} (${pkg.license||'UNDECLARED'})\n${texts.map(n=>fs.readFileSync(join(dir,n),'utf8')).join('\n')}`);
    for(const name of Object.keys(pkg.dependencies||{})) {
      let cursor=dir;
      while(!fs.existsSync(join(cursor,'node_modules',name)) && cursor!=='/') cursor=resolve(cursor,'..');
      requireThat(cursor!=='/',`dependency licence unresolved: ${key} -> ${name}`);
      visit(join(cursor,'node_modules',name));
    }
  }
  const manifest=readJSON(join(web,'package.json'));
  // Configured build tools can emit runtime helpers/CSS even though they are
  // dev dependencies. Follow their package closures as well as production.
  const config=fs.readFileSync(join(web,'vite.config.ts'),'utf8');
  const tools=[...config.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(name=>!name.startsWith('.')&&!name.startsWith('node:'));
  for(const name of new Set([...Object.keys(manifest.dependencies||{}),...tools,...(manifest.devDependencies?.typescript?['typescript']:[])])) visit(join(web,'node_modules',name));
  return 'Frontend third-party licence texts (production and configured build-tool closure).\nBuild-tool notices cover emitted helpers and CSS; their binaries are not redistributed.\nNo external fonts; application icons/assets are covered by LICENSE.\n\n'+[...seen].sort(([a],[b])=>a.localeCompare(b)).map(([,text])=>text).join('\n\n'+'='.repeat(72)+'\n\n')+'\n';
}
export function stageCrates(prepared,destination) {
  const inventory=readJSON(join(prepared,'crates-inventory.json'));verifyCandidate(prepared,inventory);
  const names=['crates-inventory.json',`hennery-source-${inventory.source.sha}.tar.gz`,...inventory.crates.map(c=>c.file)];
  for(const name of names) {
    requireThat(fs.lstatSync(join(prepared,name)).isFile(),'nonregular crate staging input');
    requireThat(!fs.existsSync(join(destination,name)),'refusing to overwrite candidate material: '+name);
  }
  for(const name of names)fs.copyFileSync(join(prepared,name),join(destination,name),fs.constants.COPYFILE_EXCL);
}
export async function prepare(destination,revision,retainedUI) {
  const out=resolve(destination); requireThat(!out.startsWith(resolve(".")+"/"),"stage outside the checkout, so extracted crates have no workspace parent"); requireThat(!fs.existsSync(out),'destination must be fresh');
  requireThat(/^[a-f0-9]{40}$/.test(revision),'use a full source SHA');
  fs.mkdirSync(out,{recursive:true});
  const src=join(out,'source');
  const archive=join(out,`hennery-source-${revision}.tar.gz`);
  fs.writeFileSync(archive,execFileSync('git',['archive','--format=tar.gz',revision],{maxBuffer:100*1024*1024}));
  extract(archive,src);
  const sourceFiles=gitSourceFiles(revision);
  checkSourceTree(src,sourceFiles);
  const meta=JSON.parse(execFileSync('cargo',['metadata','--no-deps','--format-version','1'],{cwd:src,encoding:'utf8'}));
  const version=meta.packages.find(p=>p.name==='hennery').version;
  const source={sha:revision,url:`https://github.com/marcinwadon/hennery/releases/download/v${version}/hennery-source-${revision}.tar.gz`,sha256:sha256(fs.readFileSync(archive))};
  await run('pnpm',['--dir',join(src,'web'),'install','--frozen-lockfile','--store-dir',join(out,'pnpm-store')]);
  if(retainedUI)requireThat(isAbsolute(retainedUI) && fs.lstatSync(join(retainedUI,'index.html')).isFile(),'retained UI must be an absolute, existing build');
  else await run('pnpm',['--dir',join(src,'web'),'build']);
  const kernel=join(src,'crates/hennery-kernel');
  const dist=join(kernel,'web-dist'); fs.mkdirSync(dist);
  function copy(dir,prefix='') {
    for(const e of fs.readdirSync(dir,{withFileTypes:true})) {
      requireThat(!e.isSymbolicLink(),'symlink in web output');
      if(e.name.startsWith('.')||e.name.endsWith('.map'))continue;
      const p=prefix?`${prefix}/${e.name}`:e.name;
      if(e.isDirectory()){fs.mkdirSync(join(dist,p));copy(join(dir,e.name),p);}
      else {requireThat(e.isFile(),'special file in web output');fs.copyFileSync(join(dir,e.name),join(dist,p));}
    }
  }
  copy(retainedUI || join(src,'web/dist'));
  const noticeText=frontendNotices(join(src,'web'));
  source.notices_sha256=sha256(Buffer.from(noticeText));
  fs.writeFileSync(join(kernel,'FRONTEND-NOTICES.txt'),noticeText);
  fs.writeFileSync(join(kernel,'SOURCE.json'),JSON.stringify(source,null,2)+'\n');
  fs.writeFileSync(join(kernel,'README.md'),fs.readFileSync(join(kernel,'README.md'),'utf8').replace('Generated with Claude AI',`Corresponding source: ${source.url}\n\nSource archive SHA-256: ${source.sha256}\n\nGenerated with Claude AI`));
  fs.writeFileSync(join(kernel,'release-ui.json'),JSON.stringify({schema:1,source_sha:revision,files:files(dist)},null,2)+'\n');
  const local=await registry(join(out,'registry-cache'));
  const cargoConfig=join(out,'candidate-config.toml');
  fs.writeFileSync(cargoConfig,`[source.crates-io]\nreplace-with="candidate"\n[source.candidate]\nregistry="${local.url}"\n`);
  const common=['--config',cargoConfig];
  const inventory={schema:1,version,source,source_files:sourceFiles,crates:[]};
  try {
    for(const name of ORDER) {
      await run('cargo',[...common,'package','-p',name,'--list','--allow-dirty'],{cwd:src});
      await run('cargo',[...common,'package','-p',name,'--registry','crates-io','--locked','--no-verify','--allow-dirty'],{cwd:src});
      const filename=`${name}-${version}.crate`, path=join(out,filename);
      fs.copyFileSync(join(src,'target/package',filename),path);
      const extracted=join(out,'extracted',name); extract(path,extracted);
      const root=join(extracted,`${name}-${version}`); inspectPackage(root,name,source);
      const pkg=JSON.parse(execFileSync('cargo',['metadata','--no-deps','--format-version','1','--manifest-path',join(root,'Cargo.toml')],{encoding:'utf8'})).packages[0];
      const bytes=fs.readFileSync(path), digest=sha256(bytes), index=indexEntry(pkg,digest);
      for(const dep of pkg.dependencies.filter(d=>ORDER.includes(d.name))) requireThat(dep.req===`=${version}` && !dep.path,'internal registry dependency is not exact');
      requireThat(pkg.publish?.join()==='crates-io' && pkg.description && pkg.readme && pkg.repository,'normalized metadata incomplete');
      const entry={name,file:filename,sha256:digest,size:bytes.length,index,upload:uploadMetadata(pkg)};
      inventory.crates.push(entry);local.add(index,path);
    }
    verifyCandidate(out,inventory);
    // Prove archive completeness before accepting the digest. Generated UI is not source.
    const sourceProbe=join(out,'source-probe');extract(archive,sourceProbe);checkSourceTree(sourceProbe,sourceFiles);
    fs.writeFileSync(join(out,'crates-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
    console.log('R3 candidate:',out,'inventory SHA-256:',sha256(fs.readFileSync(join(out,'crates-inventory.json'))));
  } finally {await local.close();}
}
if(import.meta.url===`file://${process.argv[1]}`) {
  if(process.argv[2]==='--stage')stageCrates(process.argv[3],process.argv[4]);
  else await prepare(process.argv[2],process.argv[3],process.argv[4]);
}
