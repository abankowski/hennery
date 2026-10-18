// Test-only loopback sparse overlay. Never used by the real publisher.
import { createServer } from 'node:http';
import fs from 'node:fs';
import { join } from 'node:path';
import { sha256 } from './crate-release.mjs';
export const CRATES_USER_AGENT='hennery-release (https://github.com/marcinwadon/hennery)';
export function indexPath(name) {
  if(name.length===1)return `1/${name}`;
  if(name.length===2)return `2/${name}`;
  if(name.length===3)return `3/${name[0]}/${name}`;
  return `${name.slice(0,2)}/${name.slice(2,4)}/${name}`;
}
export async function registry(cache) {
  fs.mkdirSync(cache,{recursive:true});
  const entries=new Map(), archives=new Map(); let offline=false, origin;
  const server=createServer(async(req,res)=>{
    try {
      const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(req.method!=='GET'){res.writeHead(405).end();return;}
      if(path==='/config.json'){res.setHeader('content-type','application/json');res.end(JSON.stringify({dl:`${origin}/download/{crate}/{version}/download`,api:origin}));return;}
      if(entries.has(path)){res.end(JSON.stringify(entries.get(path))+'\n');return;}
      if(archives.has(path)){res.end(fs.readFileSync(archives.get(path)));return;}
      const download=path.match(/^\/download\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.+-]+)\/download$/);
      const url=download?`https://static.crates.io/crates/${download[1]}/${download[1]}-${download[2]}.crate`:`https://index.crates.io${path}`;
      if(!download && !/^\/(?:[a-z0-9_-]+\/){1,2}[a-zA-Z0-9_-]+$/.test(path)){res.writeHead(404).end();return;}
      const file=join(cache,sha256(Buffer.from(url)));
      if(!fs.existsSync(file)) {
        if(offline){res.writeHead(503).end('prefetch required');return;}
        const upstream=await fetch(url,{headers:{'User-Agent':CRATES_USER_AGENT},signal:AbortSignal.timeout(120000)});
        if(!upstream.ok){res.writeHead(upstream.status).end();return;}
        fs.writeFileSync(file,Buffer.from(await upstream.arrayBuffer()));
      }
      res.end(fs.readFileSync(file));
    }catch(error){res.writeHead(502).end(String(error));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  return {url:`sparse+${origin}/`, add(entry,archive){entries.set('/'+indexPath(entry.name),entry);archives.set(`/download/${entry.name}/${entry.vers}/download`,archive);},
    offline(){offline=true;},close(){return new Promise(resolve=>server.close(resolve));}};
}
