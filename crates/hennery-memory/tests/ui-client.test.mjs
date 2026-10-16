import { test } from 'node:test';
import assert from 'node:assert/strict';
import { options, credentialJSON } from '../src/ui-client.mjs';
test('challenge and IDs are decoded without changing origin or user verification', () => {
  const result=options({publicKey:{challenge:'AQID',user:{id:'BAU'},rp:{id:'memory.example.test'},excludeCredentials:[{type:'public-key',id:'Bgc'}],userVerification:'required'}},true);
  assert.deepEqual([...new Uint8Array(result.publicKey.challenge)],[1,2,3]);
  assert.deepEqual([...new Uint8Array(result.publicKey.user.id)],[4,5]);
  assert.deepEqual([...new Uint8Array(result.publicKey.excludeCredentials[0].id)],[6,7]);
  assert.equal(result.publicKey.rp.id,'memory.example.test');
  assert.equal(result.publicKey.userVerification,'required');
  assert.throws(()=>options({},false));
});
test('credential serialization keeps binary evidence and extension results', () => {
  const bytes=new Uint8Array([255,254]).buffer;
  const result=credentialJSON({id:'fixture',rawId:bytes,type:'public-key',response:{clientDataJSON:bytes,signature:bytes},getClientExtensionResults:()=>({})});
  assert.equal(result.rawId,'__4'); assert.equal(result.response.signature,'__4');
  assert.deepEqual(result.clientExtensionResults,{});
  assert.throws(()=>credentialJSON(null));
});
