// Standalone screen acceptance, using the repository's pinned Playwright.
import { createRequire } from 'node:module';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../../web/package.json',import.meta.url));
const { chromium, expect }=require('@playwright/test');
const scratch=await mkdtemp(join(tmpdir(),'hennery-memory-browser-'));
const binary=resolve('target/debug/hennery-memory');
const data=join(scratch,'private');
const env={...process.env,HOME:scratch,XDG_CONFIG_HOME:join(scratch,'config'),XDG_DATA_HOME:join(scratch,'data'),XDG_STATE_HOME:join(scratch,'state'),XDG_CACHE_HOME:join(scratch,'cache')};
for(const key of ['HENNERY_DATA_DIR','HENNERY_HOST_DATA_DIR','HENNERY_MASTER_KEY','CREDENTIALS_DIRECTORY','CODEX_HOME','CLAUDE_CONFIG_DIR']) delete env[key];
function command(args,input) {
  const result=spawnSync(binary,['--data-dir',data,...args],{env,input,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  return result.stdout;
}
// First execution has no deadline: Gatekeeper can inspect this exact binary.
const credentials=JSON.parse(command(['create','--owner','fixture-owner','--hat','garden']));
const net=await import('node:net');
const socket=net.createServer();
await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
const port=socket.address().port;
await new Promise(resolve=>socket.close(resolve));
const origin=`http://127.0.0.1:${port}`;
command(['ui-init','--owner','fixture-owner','--public-url',origin],'synthetic browser password\n');
const server=spawn(binary,['--data-dir',data,'serve','--listen',`127.0.0.1:${port}`],{env,stdio:['ignore','pipe','pipe']});
let browser;
try {
  const deadline=Date.now()+30000;
  while(true) {
    try { const response=await fetch(`${origin}/login`);if(response.ok)break; } catch {}
    assert.ok(Date.now()<deadline,'memory listener unavailable');
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  browser=await chromium.launch({headless:true});
  const toolResponse=await fetch(`${origin}/mcp`,{method:'POST',headers:{Authorization:`Bearer ${credentials.tool_credential}`,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
  assert.equal(toolResponse.status,200); assert.equal((await toolResponse.json()).result.tools.length,4);
  for(const width of [1280,390]) {
    const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
    const page=await context.newPage();
    const requests=[];
    page.on('request',request=>requests.push(request.url()));
    page.on('dialog',()=>assert.fail('untrusted note executed'));
    await page.goto(`${origin}/login`);
    await page.getByLabel('Password',{exact:true}).fill('synthetic browser password');
    const loginResponse=page.waitForResponse(response=>response.url()===`${origin}/login` && response.request().method()==='POST');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    const signedIn=await loginResponse;
    assert.equal(signedIn.status(),303,signedIn.status()===303?'':await signedIn.text());
    await page.waitForURL(`${origin}/`);
    await page.getByRole('link',{name:'garden (active)',exact:true}).click();
    await page.getByLabel('Title',{exact:true}).fill(`Curated fixture ${width}`);
    const hostile='<img src="https://evil.example.test/leak" onerror="alert(1)"> <script>alert(1)</script> [link](javascript:alert(1))';
    await page.getByLabel('Markdown',{exact:true}).fill(hostile);
    await page.getByRole('button',{name:'Create memory',exact:true}).click();
    assert.equal(await page.locator('pre').first().textContent(),hostile);
    assert.equal(await page.locator('img').count(),0);
    assert.equal(await page.locator('a[href^="javascript:"]').count(),0);
    assert.ok(requests.every(url=>url.startsWith(origin)), 'render made an external request');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
    await page.getByLabel('Markdown',{exact:true}).fill('Edited synthetic continuity marker');
    await page.getByRole('button',{name:'Save revision',exact:true}).click();
    await page.getByRole('button',{name:'Pin memory',exact:true}).click();
    assert.ok((await page.getByRole('button',{name:'Unpin',exact:true}).count())===1);
    await page.screenshot({path:join(scratch,`screen-${width}.png`),fullPage:true});
    await page.getByRole('link',{name:'Back to namespace',exact:true}).click();
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export Markdown and manifest',exact:true}).click();
    await (await download).saveAs(join(scratch,`export-${width}.tar`));
    await page.getByRole('link',{name:`Curated fixture ${width}`,exact:true}).click();
    await page.getByText('Delete this entry',{exact:true}).click();
    await page.getByLabel('Type delete',{exact:true}).fill('delete');
    await page.getByRole('button',{name:'Delete entry',exact:true}).click();
    assert.equal(await page.getByRole('link',{name:`Curated fixture ${width}`,exact:true}).count(),0);
    await page.goto(`${origin}/import`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'import form horizontal overflow');
    const bundle={version:1,vault:'synthetic-browser-vault',files:[{path:`notes/garden/legacy-${width}.md`,body:'Legacy synthetic observation'},{path:`sources/garden/source-${width}.md`,body:'# Original source\nhnry_plugin_DEADBEEF\n<img src="https://evil.example.test/import">'}]};
    const mapping={scopes:{garden:{action:'namespace',namespace:credentials.namespace}},files:{},mixed:[]};
    if(width===1280) {
      await page.getByLabel('Load bundle JSON',{exact:true}).setInputFiles({name:'synthetic-bundle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
      await expect(page.getByLabel('Bundle JSON',{exact:true})).toHaveValue(JSON.stringify(bundle));
    } else { await page.getByLabel('Bundle JSON',{exact:true}).fill(JSON.stringify(bundle)); }
    await page.getByLabel('Mapping JSON',{exact:true}).fill(JSON.stringify(mapping));
    await page.getByRole('button',{name:'Preview import',exact:true}).click();
    assert.equal(await page.getByRole('heading',{name:'Review import manifest',exact:true}).count(),1);
    assert.ok(!(await page.content()).includes('DEADBEEF'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'preview horizontal overflow');
    await page.screenshot({path:join(scratch,`import-${width}.png`),fullPage:true});
    await page.getByLabel('Type apply',{exact:true}).fill('apply');
    await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();
    assert.ok((await page.locator('pre').textContent()).includes('committed'));
    await page.getByRole('link',{name:'Namespaces',exact:true}).click();
    await page.getByRole('link',{name:'garden (active)',exact:true}).click();
    await page.getByRole('link',{name:'Session notes',exact:true}).click();
    await page.getByRole('link',{name:`legacy-${width}`,exact:true}).click();
    await page.getByText('Source provenance',{exact:true}).click();
    assert.ok((await page.locator('pre').last().textContent()).includes('unverified'));
    await page.getByRole('link',{name:'Back to namespace',exact:true}).click();
    await page.getByRole('link',{name:'Imported sources',exact:true}).click();
    await page.getByRole('link',{name:`source-${width}`,exact:true}).click();
    assert.ok((await page.locator('pre').first().textContent()).includes('# Original source'));
    assert.equal(await page.locator('img').count(),0);
    assert.ok(requests.every(url=>url.startsWith(origin)), 'import render made an external request');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'import horizontal overflow');
    await context.close();
  }
  await writeFile(join(scratch,'result.json'),JSON.stringify({passed:2,widths:[1280,390],namespace:credentials.namespace}));
  console.log(`memory browser: 2 passed; artifacts ${scratch}`);
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
  await new Promise(resolve=>server.once('exit',resolve));
}
