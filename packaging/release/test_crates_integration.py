"""Node frozen uploader -> real release gate; offline structural provenance/platform doubles.

Authentic cryptography/JSON shape is in test_verify_cli; this exercises lifecycle
ordering through the actual Python CLI and Node subprocess adapter.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

import contract
import gate


class CratesIntegration(unittest.TestCase):
    def setUp(self):
        temporary=tempfile.TemporaryDirectory(prefix='release-crates-integration-');self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name);self.repo=Path(__file__).resolve().parents[2]

    def fixture(self,kind='valid'):
        root=Path(tempfile.mkdtemp(prefix='case-',dir=self.root));payload=root/'payload';payload.mkdir()
        version='0.1.0';source={'sha':'a'*40,'sha256':gate.digest(b'source'),
            'url':'https://github.com/marcinwadon/hennery/releases/download/v0.1.0/hennery-source-'+'a'*40+'.tar.gz'}
        (payload/('hennery-source-'+source['sha']+'.tar.gz')).write_bytes(b'source')
        crates=[]
        for name in ('hennery-proto','hennery-kernel','hennery-view','hennery-host','hennery-gateway','hennery-sessions','hennery'):
            filename=name+'-'+version+'.crate';data=name.encode();(payload/filename).write_bytes(data)
            crates.append({'name':name,'file':filename,'size':len(data),'sha256':gate.digest(data),'upload':{'name':name,'vers':version}})
        (payload/'crates-inventory.json').write_bytes(gate.canonical({'schema':1,'version':version,'source':source,'crates':crates}))
        metadata={'schema':2,'repository':gate.REPOSITORY,'source_sha':source['sha'],'tag':'v'+version,'tag_object':'b'*40,
                  'channels':['crates','github'],'targets':sorted(gate.TARGETS),'attesting':{'run_id':42,'run_attempt':1}}
        contract.freeze(payload,metadata)
        signatures=root/'signatures';signatures.mkdir();(signatures/contract.BUNDLE).write_text('{}')
        (root/'.github/workflows').mkdir(parents=True)
        shutil.copyfile(self.repo/contract.WORKFLOW,root/contract.WORKFLOW)
        (root/'packaging/release').mkdir(parents=True)
        (root/'packaging/release/channels.json').write_bytes(gate.canonical(metadata['channels']))
        # All authorization predicates, checksum closure, exact-source/tag/run
        # and argument parsing are real. Replace public signature/platform/CLI
        # transports and unrelated archive validation for these tiny crate bytes.
        shim=f'''import os,sys,subprocess
from pathlib import Path
from datetime import datetime,timezone,timedelta
sys.path.insert(0,{str(self.repo/'packaging/release')!r})
import release_run,contract,gate,run_policy,tag_signature,supply
release_run.ROOT=Path({str(root)!r})
for key in ('CARGO_REGISTRY_TOKEN','RELEASE_CRATES_BOOTSTRAP_TOKEN','GHCR_PUBLISH_TOKEN','HOMEBREW_TAP_TOKEN'):
 gate.require(key not in os.environ,'channel credential leaked into verifier')
with Path({str(root/'calls.jsonl')!r}).open('a') as output: output.write(__import__('json').dumps(sys.argv[1:])+'\\n')
def tag(*args):
 gate.require({kind!='bad-tag'!r},'fixture signed tag refused')
 return {{}}
tag_signature.verify=tag
supply.require_contract=lambda *a: None
supply.verify_binary_inventory=lambda *a: None
release_run.require_public=lambda *a: Path({str(root/'public-checked')!r}).touch()
def evidence(api,metadata,environment):
 jobs=[{{'name':name,'status':'completed','conclusion':'success'}} for name in ('tag-signature','qualification','web-ui','archive','assemble','installer','attest','homebrew-native','crates')]
 jobs += [dict(j) for j in list(jobs) if j['name'] in ('qualification','archive','installer','homebrew-native') for _ in range(2)]
 jobs += [{{'name':name,'status':'completed','conclusion':'skipped'}} for name in ('ghcr','homebrew')]
 return {{'original':{{'id':42,'run_attempt':1,'head_sha':'a'*40,'head_branch':'v0.1.0','event':'push','path':contract.WORKFLOW,'repository':{{'full_name':gate.REPOSITORY}},'created_at':(datetime.now(timezone.utc)-timedelta(hours=1)).isoformat()}},
  'jobs':jobs,'artifact':{{'id':77,'name':'attested-release-42-1','expired':False,'workflow_run':{{'id':42,'head_sha':'a'*40}}}},
  'owner':{{'login':'marcinwadon','id':9}},'reviews':[{{'state':{'rejected' if kind=='approval-rejected' else 'approved'!r},'comment':'publish-run:42:attempt:2','user':{{'id':9}},'environments':[{{'name':'release'}}]}}]}}
run_policy.evidence=evidence
def crypto(command,**kwargs):
 gate.require(command[:3]==['gh','attestation','verify'],'unexpected external transport')
 if {kind=='crypto-refused'!r}: raise subprocess.CalledProcessError(1,command)
 certificate={{'sourceRepositoryURI':'https://github.com/'+gate.REPOSITORY,'buildSignerURI':'https://github.com/'+gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0','sourceRepositoryRef':'refs/tags/v0.1.0','sourceRepositoryDigest':'a'*40,'buildSignerDigest':'a'*40,'runnerEnvironment':'github-hosted','issuer':'https://token.actions.githubusercontent.com','runInvocationURI':'https://github.com/'+gate.REPOSITORY+'/actions/runs/42/attempts/1'}}
 if {kind=='wrong-run'!r}:certificate['runInvocationURI']=certificate['runInvocationURI'].replace('/42/','/43/')
 if {kind=='wrong-attempt'!r}:certificate['runInvocationURI']=certificate['runInvocationURI'].replace('attempts/1','attempts/2')
 if {kind=='branch'!r}:certificate['buildSignerURI']=certificate['buildSignerURI'].replace('refs/tags/v0.1.0','refs/heads/main')
 return subprocess.CompletedProcess(command,0,gate.canonical([{{'verificationResult':{{'signature':{{'certificate':certificate}}}}}}]).decode(),'')
contract.subprocess.run=crypto
release_run.main()
if {kind=='changed-after-gate'!r} and len(Path({str(root/'calls.jsonl')!r}).read_text().splitlines())==2:
 with Path({str(payload/'crates-inventory.json')!r}).open('ab') as output:output.write(b' ')
'''
        if kind!='missing-gate':(root/'packaging/release/release_run.py').write_text(shim)
        if kind=='changed-crate':(payload/crates[0]['file']).write_bytes(b'altered')
        env=dict(os.environ,GITHUB_ACTIONS='true',GITHUB_REPOSITORY=gate.REPOSITORY,GITHUB_REF='refs/tags/v0.1.0',GITHUB_SHA='a'*40,
            GITHUB_WORKFLOW_REF=gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0',GITHUB_EVENT_NAME='push',GITHUB_RUN_ID='42',GITHUB_RUN_ATTEMPT='2',
            RELEASE_ARTIFACT_ID='77',RELEASE_ATTESTING_ATTEMPT='1',GH_TOKEN='offline-fixture',RELEASE_PUBLICATION_ENABLED='true',RELEASE_GITHUB_ENABLED='true',RELEASE_CRATES_ENABLED='true',
            CARGO_REGISTRY_TOKEN='offline-child-must-not-see',RELEASE_CRATES_BOOTSTRAP_TOKEN='offline-child-must-not-see',GHCR_PUBLISH_TOKEN='offline-child-must-not-see',HOMEBREW_TAP_TOKEN='offline-child-must-not-see')
        return root,payload,signatures,env

    def run_publish(self,kind,repetitions=1):
        root,payload,signatures,env=self.fixture(kind)
        publisher=Path(os.environ.get('R3_FIXTURE_PUBLISHER',str(self.repo/'packaging/publish-crates.mjs')))
        program=f'''import {{publishFrozen,releaseGate,releaseCratesDigest}} from {str(publisher)!r};
const dir={str(payload)!r},signatures={str(signatures)!r};let credentials=0,uploads=0,error='',completed=[];
try{{const digest=releaseCratesDigest(dir);for(let i=0;i<{repetitions};i++)completed=await publishFrozen({{dir,digest,gate:async()=>{{if(releaseGate({{dir,signatures}})!==digest)throw Error('changed channel digest');}},credentials:async()=>{{credentials++;return 'offline';}},fetcher:async(url,options={{}})=>{{if(options.method==='PUT'){{uploads++;throw Error('unexpected upload');}}if(url.endsWith('/download'))return new Response(url.split('/').at(-3));if(url.startsWith('https://index.crates.io/')){{const name=url.split('/').at(-1);return new Response(JSON.stringify({{vers:'0.1.0',cksum:(await import('node:crypto')).createHash('sha256').update(name).digest('hex')}}));}}return new Response('source');}}}});}}catch(e){{error=String(e);}}
console.log('RESULT:'+JSON.stringify({{credentials,uploads,error,completed}}));'''
        result=subprocess.run([os.environ.get('R3_FIXTURE_NODE','node'),'--input-type=module','-e',program],cwd=root,env=env,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        return json.loads(next(line[7:] for line in result.stdout.splitlines() if line.startswith('RESULT:'))),root

    def test_authenticated_global_bytes_reach_credentials_through_real_adapter(self):
        result,root=self.run_publish('valid')
        self.assertEqual((result['credentials'],result['uploads'],result['error']),(1,0,''))
        self.assertEqual(len(result['completed']),7);self.assertTrue((root/'public-checked').is_file())
        calls=[json.loads(line) for line in (root/'calls.jsonl').read_text().splitlines()]
        self.assertEqual(len(calls),16)
        self.assertTrue(all(args[0]=='verify' and args[-1]=='crates' for args in calls))

    def test_repeat_recovery_reuses_bytes_and_reverifies_each_boundary(self):
        result,root=self.run_publish('valid',2)
        self.assertEqual((result['credentials'],result['uploads'],result['error']),(2,0,''))
        self.assertEqual(len((root/'calls.jsonl').read_text().splitlines()),32)

    def test_each_authority_failure_prevents_credentials_and_uploads(self):
        for kind in ('missing-gate','bad-tag','crypto-refused','branch','wrong-run','wrong-attempt','approval-rejected','changed-crate','changed-after-gate'):
            result,_=self.run_publish(kind)
            with self.subTest(kind=kind):
                self.assertEqual((result['credentials'],result['uploads']),(0,0));self.assertTrue(result['error'])


if __name__=='__main__':unittest.main()
