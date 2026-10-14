// The installed binary runs with no Node/pnpm on PATH and only disposable state.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { requireThat } from './crate-release.mjs';
const binary=resolve(process.argv[2]), home=fs.mkdtempSync(join(tmpdir(),'hennery-r3-ui-'));
const listener=createServer(); await new Promise(r=>listener.listen(0,'127.0.0.1',r));
const port=listener.address().port;await new Promise(r=>listener.close(r));
const url=`http://127.0.0.1:${port}`;
const env={...process.env,PATH:'/usr/bin:/bin',HOME:home,XDG_CONFIG_HOME:join(home,'config'),XDG_DATA_HOME:join(home,'data'),XDG_CACHE_HOME:join(home,'cache'),HENNERY_DATA_DIR:join(home,'collector'),HENNERY_HOST_DATA_DIR:join(home,'host')};
const log=fs.openSync(join(home,'collector.log'),'w');
const child=spawn(binary,['collector','--listen',`127.0.0.1:${port}`,'--data-dir',join(home,'collector')],{env,stdio:['ignore',log,log]});
const exited=new Promise(resolve=>child.on('exit',resolve));
try {
  let ready=false;
  for(let n=0;n<120;n++) {
    requireThat(child.exitCode===null,'installed collector exited: '+fs.readFileSync(join(home,'collector.log'),'utf8'));
    try {ready=(await fetch(url+'/healthz')).ok;}catch{}
    if(ready)break;await delay(500);
  }
  requireThat(ready,'installed collector never became ready');
  const response=await fetch(url+'/'), html=await response.text();
  requireThat(response.ok && !html.includes('hennery-web-ui-not-embedded'),'installed collector serves a placeholder');
  const assets=[...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(m=>m[1]);
  requireThat(assets.some(p=>p.endsWith('.js')) && assets.some(p=>p.endsWith('.css')),'UI lacks JS or CSS');
  for(const path of assets) {
    const asset=await fetch(url+path);requireThat(asset.ok,'missing embedded asset: '+path);
    requireThat(!asset.headers.get('content-type')?.includes('text/html'),'asset fell back to HTML: '+path);
    requireThat((await asset.arrayBuffer()).byteLength>0,'empty embedded asset');
  }
  // Playwright is a test driver only. The collector's environment above has neither Node nor pnpm.
  if(process.env.R3_PLAYWRIGHT_MODULE) {
    const {chromium}=await import(process.env.R3_PLAYWRIGHT_MODULE);
    const browser=await chromium.launch({headless:true});
    try {
      const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(url);await page.waitForSelector('#root > *');
      requireThat((await page.locator('#root').innerText()).trim().length>0,'React did not render');
      requireThat(errors.length===0,'browser errors: '+errors.join('\n'));
    } finally {await browser.close();}
  } else throw new Error('set R3_PLAYWRIGHT_MODULE to the pinned Playwright module for browser acceptance');
  console.log('Installed collector, HTML, JS/CSS/assets and browser pass; scratch:',home);
} finally {
  if(child.exitCode===null)child.kill('SIGTERM');
  await Promise.race([exited,delay(10000)]);
  if(child.exitCode===null){child.kill('SIGKILL');await exited;}
  fs.closeSync(log);
}
