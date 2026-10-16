// Test-only native transport audit. Never retain request/response bodies,
// arguments, headers, authentication or free text. /mcp is adapter-local.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
const root = process.env.HENNERY_D4_NATIVE_AUDIT_DIR;
const native = process.env.HENNERY_D4_NATIVE_AUDIT_BINARY;
const child = spawn(native, process.argv.slice(2), {stdio:['pipe','pipe','inherit']});
const ids = new Map();
const methods = new Set();
const expected = JSON.parse(fs.readFileSync(path.join(root,'expected-mcp-schemas.json'),'utf8'));
let held;
let threadId;
const input = readline.createInterface({input:process.stdin});
input.on('line', line => {
  let request;try { request=JSON.parse(line); } catch { process.exit(1); }
  // Only these fixed method names can reach the audit file.
  if (['turn/start','review/start','thread/start','mcpServerStatus/list'].includes(request.method)) methods.add(request.method);
  fs.writeFileSync(path.join(root,'native-methods.json'),JSON.stringify([...methods]),{mode:0o600});
  if(['turn/start','review/start'].includes(request.method)) {
    process.stdout.write(JSON.stringify({id:request.id,error:{code:-32600,message:'no-inference probe refuses provider turns'}})+'\n');
    return;
  }
  if(request.method==='thread/start') ids.set(String(request.id),'thread');
  if(request.method==='mcpServerStatus/list' && fs.existsSync(path.join(root,'pause-mcp-status'))) {
    if(typeof threadId!=='string') process.exit(1);
    // Adapter /mcp omits threadId and sees only global servers. The pinned
    // native protocol advertises this optional selector for session servers.
    request.params={...request.params,threadId,detail:'toolsAndAuthOnly'};
    ids.set(String(request.id),'status');
  }
  child.stdin.write(JSON.stringify(request)+'\n');
});
input.on('close',()=>child.stdin.end());
readline.createInterface({input:child.stdout}).on('line',line=>{
  let response;try { response=JSON.parse(line); } catch { process.exit(1); }
  const kind=ids.get(String(response.id));ids.delete(String(response.id));
  if(kind==='thread') threadId=response.result?.thread?.id;
  if(kind==='status') {
    const server=response.result?.data?.find(server=>server.name==='hennery');
    const tools=Object.fromEntries(Object.values(server?.tools??{}).map(tool=>[tool.name,tool]));
    const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
    const names=Object.keys(tools).sort();
    const valid=Object.keys(server?.tools??{}).length===expected.length && names.length===expected.length && expected.every(([name,schema])=>JSON.stringify(sorted(tools[name]?.inputSchema))===JSON.stringify(sorted(schema)));
    const known=expected.map(([name])=>name).filter(name=>names.includes(name));
    const shape={result_fields:Object.keys(response.result??{}),server_count:response.result?.data?.length,server_found:server!==undefined,tool_count:names.length,tool_fields:Object.keys(Object.values(tools)[0]??{}),schema_fields:Object.keys(Object.values(tools)[0]?.inputSchema??{})};
    fs.writeFileSync(path.join(root,'held-mcp-status.json'),JSON.stringify({names:known,schemas_valid:valid,thread_scoped:true,shape}),{mode:0o600});
    held=line;
  } else process.stdout.write(line+'\n');
});
const timer=setInterval(()=>{
  if(held!==undefined && !fs.existsSync(path.join(root,'pause-mcp-status'))) {
    process.stdout.write(held+'\n');held=undefined;
  }
},10);
process.on('SIGTERM',()=>child.kill('SIGTERM'));
child.on('error',()=>process.exit(1));
child.on('exit',code=>{clearInterval(timer);process.exit(code??1)});
