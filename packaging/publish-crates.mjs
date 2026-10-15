// Exact-byte uploader inside R1's protected, manually approved tagged orchestrator.
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { sha256, readJSON, requireThat, verifyCandidate, validateSource, publishBody } from './crate-release.mjs';
import { indexPath } from './crate-registry.mjs';
export async function preflight({dir,digest,gate,fetcher=fetch}) {
  const inventoryFile=join(dir,'crates-inventory.json');
  function validate() {
    requireThat(sha256(fs.readFileSync(inventoryFile))===digest,'inventory changed after approval');
    const inventory=readJSON(inventoryFile);verifyCandidate(dir,inventory);return inventory;
  }
  const inventory=validate();
  const authorize=async(phase='boundary')=>{validate();await gate({channel:'crates',dir,digest,source_sha:inventory.source.sha,version:inventory.version,phase});validate();};
  await authorize('preflight');
  await validateSource(inventory.source,fetcher);
  await authorize('preflight');
  return {inventory,authorize};
}
export async function publishFrozen({dir,digest,gate,credentials,fetcher=fetch,pause=delay}) {
  const {inventory,authorize}=await preflight({dir,digest,gate,fetcher});
  const token=await credentials();requireThat(typeof token==='string' && token.length>0,'publication credential missing');
  const completed=[];
  for(const c of inventory.crates) {
    await authorize();
    const download=`https://crates.io/api/v1/crates/${c.name}/${inventory.version}/download`;
    let remote=await fetcher(download,{signal:AbortSignal.timeout(120000)});
    if(remote.status===404) {
      // Revalidate at the actual credentialed boundary. No repackaging or UI rebuild occurs.
      await authorize();
      const bytes=fs.readFileSync(join(dir,c.file));
      requireThat(sha256(bytes)===c.sha256,'package changed at upload boundary');
      let response;
      try {
        response=await fetcher('https://crates.io/api/v1/crates/new',{method:'PUT',headers:{Authorization:token,'Content-Type':'application/octet-stream','User-Agent':'hennery-release-r3'},body:publishBody(c.upload,bytes),signal:AbortSignal.timeout(120000)});
      } catch {throw new Error(`ambiguous upload for ${c.name}: stop; a newly approved attempt must reconcile remote bytes`);}
      requireThat(response.ok,`upload refused/ambiguous for ${c.name}: HTTP ${response.status}; stop and reconcile in a newly approved attempt`);
      // Fetch final remote bytes after upload. A successful response alone proves nothing.
      remote=await fetcher(download,{signal:AbortSignal.timeout(120000)});
    }
    requireThat(remote.ok,`remote package unavailable/unverifiable: ${c.name}`);
    requireThat(sha256(Buffer.from(await remote.arrayBuffer()))===c.sha256,`remote digest differs: ${c.name}; new candidate/version required`);
    let resolvable=false;
    for(let attempt=0;attempt<48;attempt++) {
      await authorize();
      const index=await fetcher(`https://index.crates.io/${indexPath(c.name)}`,{cache:'no-store',signal:AbortSignal.timeout(30000)});
      requireThat(index.ok || index.status===404,'registry index unavailable');
      if(index.ok) {
        const entry=(await index.text()).trim().split('\n').map(line=>JSON.parse(line)).find(e=>e.vers===inventory.version);
        if(entry){requireThat(!entry.yanked && entry.cksum===c.sha256,'registry index digest differs/yanked');resolvable=true;break;}
      }
      await pause(10000);
    }
    requireThat(resolvable,`registry did not resolve ${c.name}; stop before consumers`);
    completed.push(c.name);
  }
  return completed;
}
export function signedCratesDigest(dir,rootDigest) {
  requireThat(/^[a-f0-9]{64}$/.test(rootDigest||''),'R1 global inventory digest missing');
  const path=join(dir,'release-inventory.json');
  requireThat(fs.lstatSync(path).isFile(),'R1 global inventory must be regular');
  const raw=fs.readFileSync(path);requireThat(sha256(raw)===rootDigest,'R1 global inventory digest changed');
  const root=JSON.parse(raw),inventory=readJSON(join(dir,'crates-inventory.json'));
  requireThat(root.channels?.includes('crates') && root.source_sha===inventory.source.sha && root.tag===`v${inventory.version}`,'R1 global inventory source/version/channel differs');
  requireThat(inventory.source.url===`https://github.com/marcinwadon/hennery/releases/download/${root.tag}/hennery-source-${root.source_sha}.tar.gz`,'R1 global inventory source URL differs');
  const names=['crates-inventory.json',`hennery-source-${inventory.source.sha}.tar.gz`,...inventory.crates.map(c=>c.file)];
  for(const name of names) {
    const entries=root.artifacts?.filter(a=>a.name===name);
    requireThat(entries?.length===1,'R1 global inventory lacks unique '+name);
    const file=join(dir,name);requireThat(fs.lstatSync(file).isFile(),'R1 global inventory payload must be regular');
    const bytes=fs.readFileSync(file);
    requireThat(entries[0].size===bytes.length && entries[0].sha256===sha256(bytes),'R1 global inventory payload differs: '+name);
  }
  return root.artifacts.find(a=>a.name==='crates-inventory.json').sha256;
}
export function r1Gate(args) {
  // Resolve only trusted checkout code; never execute anything from the candidate.
  const executable=resolve('packaging/release-gate');
  requireThat(fs.existsSync(executable),'R1 gate missing: packaging/release-gate (publication disabled)');
  requireThat(args.channel==='crates' && ['preflight','boundary'].includes(args.phase),'R1 channel/phase differs');
  const validate=()=>requireThat(signedCratesDigest(args.dir,args.rootDigest)===args.digest,'R1 global inventory channel digest differs');
  validate();
  const receipt=join(fs.mkdtempSync(join(tmpdir(),'hennery-r3-gate-')),'receipt.json');
  execFileSync(executable,['crates','--candidate',resolve(args.dir),'--inventory-sha256',args.rootDigest,'--phase',args.phase,'--receipt',receipt],{encoding:'utf8'});
  validate();
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href) {
  requireThat(process.env.GITHUB_ACTIONS==='true','real publisher only runs through the protected R1 workflow');
  const verify=process.argv[2]==='--verify',dir=resolve(process.argv[verify?3:2]),rootDigest=process.argv[verify?4:3];
  const digest=signedCratesDigest(dir,rootDigest),gate=args=>r1Gate({...args,rootDigest});
  if(verify) {
    await preflight({dir,digest,gate});
  } else {
    await publishFrozen({dir,digest,gate,credentials:async()=>process.env.CARGO_REGISTRY_TOKEN});
  }
}
