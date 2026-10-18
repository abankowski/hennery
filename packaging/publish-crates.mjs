// Exact-byte uploader inside R1's protected, manually approved tagged orchestrator.
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { sha256, readJSON, requireThat, verifyCandidate, publishBody } from './crate-release.mjs';
import { indexPath, CRATES_USER_AGENT } from './crate-registry.mjs';
import limits from './crates-publish-limits.json' with {type:'json'};

const propagationMs=limits.poll_attempts*limits.poll_interval_ms;

async function registryError(response, context) {
  let errors;
  try {errors=(await response.json())?.errors;} catch { /* Status remains useful for non-JSON errors. */ }
  const detail=(Array.isArray(errors)?errors.flatMap(error=>typeof error?.detail==='string'?[error.detail]:[]):[])
    .join('; ').replace(/\s+/g,' ').slice(0,300);
  return new Error(`${context}: HTTP ${response.status}${detail?': '+detail:''}`);
}

export async function crateExists(name,version,fetcher=fetch,signal=AbortSignal.timeout(limits.api_timeout_ms)) {
  const response=await fetcher(`https://crates.io/api/v1/crates/${name}/${version}`,{
    headers:{'User-Agent':CRATES_USER_AGENT},cache:'no-store',redirect:'manual',signal,
  });
  if(response.status!==200 && response.status!==404)throw await registryError(response,`registry version unavailable: ${name}`);
  await response.body?.cancel();
  return response.status===200;
}

export function preflight({dir,digest}) {
  const inventoryFile=join(dir,'crates-inventory.json');
  requireThat(sha256(fs.readFileSync(inventoryFile))===digest,'inventory changed after approval');
  const inventory=readJSON(inventoryFile);verifyCandidate(dir,inventory);
  return {inventory};
}
export async function publishFrozen({dir,digest,credentials,fetcher=fetch,pause=delay}) {
  const {inventory}=preflight({dir,digest});
  const token=await credentials();requireThat(typeof token==='string' && token.length>0,'publication credential missing');
  const completed=[];
  for(const c of inventory.crates) {
    const download=`https://crates.io/api/v1/crates/${c.name}/${inventory.version}/download`;
    // API/CDN and sparse-index propagation share one wall-clock budget. Slow
    // responses consume that budget too, rather than multiplying it by 48.
    let propagationDeadline;
    const pollSignal=timeout=>{
      const remaining=propagationDeadline-Date.now();
      requireThat(remaining>0,`registry propagation deadline exceeded: ${c.name}`);
      return AbortSignal.timeout(Math.min(timeout,remaining));
    };
    const pollPause=()=>pause(Math.min(limits.poll_interval_ms,Math.max(0,propagationDeadline-Date.now())));
    const downloadBytes=(signal=AbortSignal.timeout(limits.transfer_timeout_ms))=>fetcher(download,{headers:{'User-Agent':CRATES_USER_AGENT},cache:'no-store',signal});
    let remote;
    if(!await crateExists(c.name,inventory.version,fetcher)) {
      // Revalidate at the actual credentialed boundary. No repackaging or UI rebuild occurs.
      requireThat(sha256(fs.readFileSync(join(dir,'crates-inventory.json')))===digest,'inventory changed at upload boundary');
      const bytes=fs.readFileSync(join(dir,c.file));
      requireThat(sha256(bytes)===c.sha256,'package changed at upload boundary');
      let response;
      try {
        response=await fetcher('https://crates.io/api/v1/crates/new',{method:'PUT',headers:{Authorization:token,'Content-Type':'application/octet-stream','User-Agent':CRATES_USER_AGENT},body:publishBody(c.upload,bytes),signal:AbortSignal.timeout(limits.transfer_timeout_ms)});
      } catch {throw new Error(`ambiguous upload for ${c.name}: stop; a newly approved attempt must reconcile remote bytes`);}
      if(!response.ok)throw await registryError(response,`upload refused/ambiguous for ${c.name}; stop and reconcile in a newly approved attempt`);
      await response.body?.cancel();
      propagationDeadline=Date.now()+propagationMs;
      // The API and CDN can propagate separately. Never re-upload on a lagging read.
      let unavailable=`remote package unavailable after upload: ${c.name}: HTTP 404 (version not visible)`;
      for(let attempt=0;attempt<limits.poll_attempts;attempt++) {
        if(await crateExists(c.name,inventory.version,fetcher,pollSignal(limits.api_timeout_ms))) {
          remote=await downloadBytes(pollSignal(limits.transfer_timeout_ms));
          if(remote.ok)break;
          if(![403,404].includes(remote.status))throw await registryError(remote,`remote package unavailable/unverifiable: ${c.name}`);
          unavailable=(await registryError(remote,`remote package unavailable after upload: ${c.name}`)).message;
          remote=undefined;
        }
        if(attempt<limits.poll_attempts-1)await pollPause();
      }
      requireThat(remote?.ok,unavailable);
    }else remote=await downloadBytes();
    if(!remote.ok)throw await registryError(remote,`remote package unavailable/unverifiable: ${c.name}`);
    requireThat(sha256(Buffer.from(await remote.arrayBuffer()))===c.sha256,`remote digest differs: ${c.name}; new signed version required`);
    propagationDeadline??=Date.now()+propagationMs;
    let resolvable=false;
    for(let attempt=0;attempt<limits.poll_attempts;attempt++) {
      const index=await fetcher(`https://index.crates.io/${indexPath(c.name)}`,{headers:{'User-Agent':CRATES_USER_AGENT},cache:'no-store',signal:pollSignal(limits.api_timeout_ms)});
      if(!index.ok && index.status!==404)throw await registryError(index,'registry index unavailable');
      if(index.ok) {
        const entry=(await index.text()).trim().split('\n').map(line=>JSON.parse(line)).find(e=>e.vers===inventory.version);
        if(entry){requireThat(!entry.yanked && entry.cksum===c.sha256,'registry index digest differs/yanked');resolvable=true;break;}
      }
      if(attempt<limits.poll_attempts-1)await pollPause();
    }
    requireThat(resolvable,`registry did not resolve ${c.name}; stop before consumers`);
    completed.push(c.name);
  }
  return completed;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href) {
 requireThat(process.env.GITHUB_ACTIONS==='true','real publisher only runs in the protected tagged workflow');
 const dir=resolve(process.argv[2]),digest=process.argv[3];
 requireThat(/^[a-f0-9]{64}$/.test(digest||''),'verified inventory digest missing');
 await publishFrozen({dir,digest,credentials:async()=>process.env.CARGO_REGISTRY_TOKEN});
}
