"""Node frozen uploader and parent-only real policy; all public transports mocked.

Provenance substitutions below are structural tests. No gh executable or real
registry is contacted; the real Node uploader and Python parent process do run.
"""
from contextlib import ExitStack
from datetime import datetime,timezone,timedelta
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import contract
import channel_publish
import crates_delivery
import gate
import release_run
import supply
import tag_signature


class CratesIntegration(unittest.TestCase):
    def setUp(self):
        temporary=tempfile.TemporaryDirectory(prefix='release-crates-integration-');self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name);self.repo=Path(__file__).resolve().parents[2]

    def fixture(self,kind='valid'):
        root=Path(tempfile.mkdtemp(prefix='case-',dir=self.root));payload=root/'payload';payload.mkdir()
        version='0.1.0';source={'sha':'a'*40,
            'url':'https://github.com/marcinwadon/hennery/tree/'+'a'*40}
        crates=[]
        for name in ('hennery-proto','hennery-kernel','hennery-view','hennery-host','hennery-gateway','hennery-sessions','hennery'):
            filename=name+'-'+version+'.crate';data=name.encode();(payload/filename).write_bytes(data)
            crates.append({'name':name,'file':filename,'size':len(data),'sha256':gate.digest(data),'upload':{'name':name,'vers':version}})
        (payload/'crates-inventory.json').write_bytes(gate.canonical({'schema':1,'version':version,'source':source,'crates':crates}))
        if kind=='wrong-inventory-source':
            inventory=gate.strict_json((payload/'crates-inventory.json').read_bytes())
            inventory['source']={'sha':'c'*40,'url':'https://github.com/marcinwadon/hennery/tree/'+'c'*40}
            (payload/'crates-inventory.json').write_bytes(gate.canonical(inventory))
        metadata={'schema':3,'repository':gate.REPOSITORY,'source_sha':source['sha'],'tag':'v'+version,'tag_object':'b'*40,
                  'channels':sorted(gate.CHANNELS),'targets':sorted(gate.TARGETS)}
        contract.freeze(payload,metadata)
        signatures=root/'signatures';signatures.mkdir();(signatures/contract.BUNDLE).write_text('{}')
        (root/'.github/workflows').mkdir(parents=True)
        shutil.copyfile(self.repo/contract.WORKFLOW,root/contract.WORKFLOW)
        (root/'packaging/release').mkdir(parents=True)
        if kind=='changed-crate':(payload/crates[0]['file']).write_bytes(b'altered')
        environment=dict(os.environ,GITHUB_ACTIONS='true',GITHUB_REPOSITORY=gate.REPOSITORY,GITHUB_REF='refs/tags/v0.1.0',GITHUB_SHA='a'*40,
            GITHUB_WORKFLOW_REF=gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0',GITHUB_EVENT_NAME='push',GITHUB_RUN_ID='42',GITHUB_RUN_ATTEMPT='2',
            RELEASE_ARTIFACT_ID='77',GH_TOKEN='offline-parent-only',RELEASE_PUBLICATION_ENABLED='true',RELEASE_GITHUB_ENABLED='true',RELEASE_CRATES_ENABLED='true',RELEASE_HOMEBREW_ENABLED='true',RELEASE_GHCR_ENABLED='true',
            ACTIONS_ID_TOKEN_REQUEST_TOKEN='offline-parent-only',ACTIONS_ID_TOKEN_REQUEST_URL='offline-parent-only')
        return root,payload,signatures,environment

    def run_publish(self,kind):
        root,payload,signatures,environment=self.fixture(kind)
        publisher=Path(os.environ.get('R3_FIXTURE_PUBLISHER',str(self.repo/'packaging/publish-crates.mjs')))
        resultfile=root/'node-result.json'
        program=f'''import fs from 'node:fs';
import {{publishFrozen}} from {str(publisher)!r};
const dir={str(payload)!r},digest=process.argv[1];
let credentials=0,uploads=0,error='',completed=[];
const published=new Set(),indexReads=new Map(),apiReads=new Map();
for(const key of ['GH_TOKEN','GITHUB_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL','GH_CONFIG_DIR','NODE_OPTIONS'])
  if(key in process.env)throw Error('authority leaked into Node');
try{{
  completed=await publishFrozen({{dir,digest,
    credentials:async()=>{{
      credentials++;
      fs.writeFileSync({str(root/'credential-read')!r},String(credentials));
      return process.env.CARGO_REGISTRY_TOKEN;
    }},
    pause:async()=>{{}},
    fetcher:async(url,options={{}})=>{{
      if(options.method==='PUT'){{
        uploads++;
        published.add(JSON.parse(options.body.subarray(4,4+options.body.readUInt32LE(0))).name);
        return new Response('{{}}');
      }}
      if(url.endsWith('/download'))return new Response(url.split('/').at(-3));
      if(url.startsWith('https://index.crates.io/')){{
        const name=url.split('/').at(-1),reads=indexReads.get(name)||0;
        indexReads.set(name,reads+1);
        return reads<2?new Response(null,{{status:404}}):new Response(JSON.stringify({{
          vers:'0.1.0',cksum:(await import('node:crypto')).createHash('sha256').update(name).digest('hex')
        }}));
      }}
      if(url.endsWith('/0.1.0')){{
        const name=url.split('/').at(-2),reads=apiReads.get(name)||0;
        apiReads.set(name,reads+1);
        return new Response('{{}}',{{status:published.has(name) && reads>=3?200:404}});
      }}
      throw Error('unexpected registry URL: '+url);
    }}
  }});
}}catch(e){{error=String(e);}}
fs.writeFileSync({str(resultfile)!r},JSON.stringify({{credentials,uploads,error,completed}}));
if(error)process.exitCode=1;'''
        calls=[]
        def tag(*args,**kwargs):
            gate.require(kind!='bad-tag','fixture signed tag refused');return {}
        def crypto(command,**kwargs):
            self.assertEqual(command[:3],['gh','attestation','verify'])
            if kind=='crypto-refused':raise subprocess.CalledProcessError(1,command)
            return subprocess.CompletedProcess(command,0,'verified','')
        original_verify=release_run.verify
        def verify(*args):
            calls.append('verify')
            gate.require(kind!='missing-gate','fixture gate unavailable')
            return original_verify(*args)
        original_run=crates_delivery.run
        def deliver(root,token,digest,**kwargs):
            if kind=='changed-after-gate':
                with (payload/'crates-inventory.json').open('ab') as output:output.write(b' ')
            if kind=='wrong-inventory-digest':digest='f'*64
            return original_run(root,token,digest,**kwargs,
                                command=[os.environ.get('R3_FIXTURE_NODE','node'),'--input-type=module','-e',program,digest])
        parenterror=''
        with ExitStack() as stack:
            stack.enter_context(patch.dict(os.environ,environment,clear=True))
            stack.enter_context(patch.object(release_run,'ROOT',root))
            stack.enter_context(patch.object(release_run,'verify',side_effect=verify))
            stack.enter_context(patch.object(crates_delivery,'run',side_effect=deliver))
            stack.enter_context(patch.object(tag_signature,'verify',side_effect=tag))
            stack.enter_context(patch('channel_publish.verify_images'))
            stack.enter_context(patch.object(supply,'require_contract',return_value=None))
            stack.enter_context(patch.object(supply,'verify_binary_inventory',return_value=None))
            stack.enter_context(patch.object(contract.subprocess,'run',side_effect=crypto))
            try:
                with patch.dict(os.environ,{'CARGO_REGISTRY_TOKEN':'offline-chosen-crates-token'}):
                    verified=release_run.verified_manifest(payload,signatures)
                    channel_publish.publish(payload,signatures,'crates',verified)
            except Exception as failure:parenterror=type(failure).__name__
        result=json.loads(resultfile.read_text()) if resultfile.exists() else {'credentials':int((root/'credential-read').read_text()) if (root/'credential-read').exists() else 0,'uploads':0,'error':parenterror,'completed':[]}
        if parenterror:result['error']=result['error'] or parenterror
        return result,root,calls

    def test_authenticated_global_bytes_reach_credentials_through_real_adapter(self):
        result,root,calls=self.run_publish('valid')
        self.assertEqual((result['credentials'],result['uploads'],result['error']),(1,7,''))
        self.assertEqual(len(result['completed']),7)
        self.assertEqual(len(calls),1,'full release verification must run once per publication')

    def test_each_authority_failure_prevents_credentials_and_uploads(self):
        for kind in ('missing-gate','bad-tag','crypto-refused','changed-crate','changed-after-gate','wrong-inventory-digest','wrong-inventory-source'):
            result,_,_=self.run_publish(kind)
            with self.subTest(kind=kind):
                self.assertEqual((result['credentials'],result['uploads']),(0,0));self.assertTrue(result['error'])


if __name__=='__main__':unittest.main()
