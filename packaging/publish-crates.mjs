// Exact-byte uploader. The reusable job stays disabled until R1's authenticated gate is integrated.
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { sha256, readJSON, requireThat, verifyCandidate, validateSource, publishBody } from './crate-release.mjs';
import { indexPath } from './crate-registry.mjs';
export async function publishFrozen({dir,digest,gate,credentials,fetcher=fetch,pause=delay}) {
  const inventoryFile=join(dir,'crates-inventory.json');
  function validate() {
    requireThat(sha256(fs.readFileSync(inventoryFile))===digest,'inventory changed after approval');
    const inventory=readJSON(inventoryFile);verifyCandidate(dir,inventory);return inventory;
  }
  const inventory=validate();
  const authorize=async()=>{validate();await gate({channel:'crates-io',digest,source_sha:inventory.source.sha,version:inventory.version});validate();};
  await authorize();
  await validateSource(inventory.source,fetcher);
  await authorize();
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
export function r1Gate(args) {
  // INTEGRATION POINT R1: this trusted executable must authenticate platform approval,
  // tag/checks/settings, inventory+channels+targets and BOTH run IDs/attempts. It must
  // materialize only retained bytes and reconcile channel completion. No artifact-supplied code.
  const executable=resolve('packaging/release-gate');
  requireThat(fs.existsSync(executable),'R1 integration missing: packaging/release-gate (publication disabled)');
  execFileSync(executable,['verify','--channel',args.channel,'--inventory-sha256',args.digest,'--source-sha',args.source_sha,'--version',args.version],{stdio:'inherit'});
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href) {
  requireThat(process.env.GITHUB_ACTIONS==='true','real publisher only runs through the protected R1 workflow');
  await publishFrozen({dir:resolve(process.argv[2]),digest:process.argv[3],gate:r1Gate,credentials:async()=>process.env.CARGO_REGISTRY_TOKEN});
}
