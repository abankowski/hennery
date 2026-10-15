"""R3 -> real R1 adapter/approval verification; offline transport and software-key fixtures."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

import gate


class CratesIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='r3r1-', dir='/tmp')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.root = Path(cls.temporary.name)
        cls.keyhome = cls.root / 'gpg'; cls.keyhome.mkdir(mode=0o700)
        cls.keyenv = dict(os.environ, GNUPGHOME=str(cls.keyhome))
        def gpg(*args):
            return subprocess.check_output(['gpg', '--batch', '--pinentry-mode', 'loopback', '--passphrase', '', *args], env=cls.keyenv, stderr=subprocess.DEVNULL)
        cls.gpg = staticmethod(gpg)
        gpg('--quick-generate-key', 'R3 offline fixture <fixture@example.invalid>', 'ed25519', 'sign', '0')
        cls.fingerprint = next(line.split(':')[9] for line in gpg('--with-colons', '--list-keys').decode().splitlines() if line.startswith('fpr:'))
        cls.public = cls.root / 'public.asc'; cls.public.write_bytes(gpg('--armor', '--export', cls.fingerprint))
        cls.repo = Path(__file__).resolve().parents[2]

    def fixture(self, kind='valid'):
        root = Path(tempfile.mkdtemp(prefix='case-', dir=self.root)); candidate = root / 'candidate'; candidate.mkdir()
        version = '0.1.0'; source = {'sha':'a'*40, 'sha256':gate.digest(b'source'), 'url':'https://github.com/marcinwadon/hennery/releases/download/v0.1.0/hennery-source-'+'a'*40+'.tar.gz'}
        source_name = 'hennery-source-'+source['sha']+'.tar.gz'; (candidate/source_name).write_bytes(b'source')
        names = ['hennery-proto','hennery-kernel','hennery-view','hennery-host','hennery-gateway','hennery-sessions','hennery']
        crates = []
        for name in names:
            filename = name+'-'+version+'.crate'; data = name.encode(); (candidate/filename).write_bytes(data)
            crates.append({'name':name,'file':filename,'size':len(data),'sha256':gate.digest(data),'upload':{'name':name,'vers':version}})
        subinventory = {'schema':1,'version':version,'source':source,'crates':crates}
        (candidate/'crates-inventory.json').write_bytes(gate.canonical(subinventory))
        artifacts = [{'name':p.name,'size':p.stat().st_size,'sha256':gate.digest(p.read_bytes())} for p in sorted(candidate.iterdir())]
        inventory = {'schema':1,'repository':gate.REPOSITORY,'source_sha':source['sha'],'tag':'v'+version,'channels':['crates','github'],'targets':['aarch64-apple-darwin'],'candidate':{'run_id':10,'run_attempt':1},'artifacts':artifacts}
        raw = gate.canonical(inventory); (candidate/'release-inventory.json').write_bytes(raw)
        signed = root/'signed.json'; signed.write_bytes(raw if kind!='different-signature' else gate.canonical(dict(inventory, candidate={'run_id':11,'run_attempt':1})))
        signature = self.gpg('--armor','--detach-sign','--output','-',str(signed)).decode()
        inputs = {key:inventory[key] for key in ('source_sha','tag','channels','targets','candidate')}
        for key in ('channels','targets','candidate'): inputs[key]=json.dumps(inputs[key])
        digest = gate.digest(raw)
        inputs.update(inventory_sha256=digest, settings_audit_sha256='b'*64, settings_audit='{}')
        if kind!='missing-signature': inputs['maintainer_signature']=signature
        event = root/'event.json'; event.write_text(json.dumps({'inputs':inputs}))
        (root/'packaging/release').mkdir(parents=True)
        if kind!='missing-gate':
            shutil.copyfile(self.repo/'packaging/release-gate',root/'packaging/release-gate'); (root/'packaging/release-gate').chmod(0o755)
        # Keep the actual shell argument parser, gate.main, digest/dispatch and
        # approval.verify_dispatch/verify. Substitute only a disposable key and
        # live GitHub/storage/material transports, never the signature decision.
        shim = f'''import sys, subprocess
from pathlib import Path
sys.path.insert(0,{str(self.repo/'packaging/release')!r})
import gate, approval, supply, retention
approval.FINGERPRINT={self.fingerprint!r}
real_run=subprocess.run
def run(command,**kwargs):
 if '--import' in command: command=command[:-1]+[{str(self.public)!r}]
 return real_run(command,**kwargs)
approval.subprocess.run=run
supply.require_contract=lambda *a: None
supply.verify_binary_inventory=lambda *a: None
def evidence(*a):
 Path({str(root/'live')!r}).touch()
 return {{}}
gate.GitHub.evidence=evidence
def validate(*a):
 if {kind=='approval-rejected'!r}: raise gate.Refused('fixture platform approval rejected')
 return {{}}
gate.validate=validate
audit_root=Path({str(root/'audit')!r}); audit_root.mkdir(exist_ok=True)
def aws(*args):
 # Exercise real retention.audit, replacing only S3 transport. Conditional
 # create models the immutable store across separate gate processes.
 gate.require(args[0]=='put-object','unexpected audit transport operation')
 for flag,value in [('--if-none-match','*'),('--object-lock-mode','COMPLIANCE'),('--object-lock-legal-hold-status','ON'),('--checksum-algorithm','SHA256')]:
  gate.require(args[args.index(flag)+1]==value,'audit conditional write or retention weakened')
 key=args[args.index('--key')+1]
 with Path({str(root/'audit-calls.jsonl')!r}).open('a') as output: output.write(__import__('json').dumps(list(args))+'\\n')
 try:
  with (audit_root/key.replace('/','_')).open('xb') as output: output.write(Path(args[args.index('--body')+1]).read_bytes())
 except FileExistsError: raise gate.Refused('412 PreconditionFailed: audit key already exists')
 return {{'VersionId':'fixture-version'}}
retention.aws=aws
with Path({str(root/'calls.jsonl')!r}).open('a') as output: output.write(__import__('json').dumps(sys.argv[1:])+'\\n')
gate.main()
if {kind=='global-after-gate'!r} and len(Path({str(root/'calls.jsonl')!r}).read_text().splitlines())==2:
 with Path({str(candidate/'release-inventory.json')!r}).open('ab') as output: output.write(b' ')
'''
        (root/'packaging/release/gate.py').write_text(shim)
        if kind=='wrong-channel-digest':
            subinventory['note']='changed'; (candidate/'crates-inventory.json').write_bytes(gate.canonical(subinventory))
        env = dict(os.environ, GITHUB_ACTIONS='true',GITHUB_REPOSITORY=gate.REPOSITORY,GITHUB_REF='refs/tags/v0.1.0',GITHUB_SHA=source['sha'],GITHUB_EVENT_NAME='workflow_dispatch',GITHUB_EVENT_PATH=str(event),GITHUB_RUN_ID='20',GITHUB_RUN_ATTEMPT='1',GH_TOKEN='offline-fixture',RELEASE_AUDIT_BUCKET='offline-fixture',R1_INVENTORY_SHA256=digest,TMPDIR=str(self.root))
        return root,candidate,digest,env

    def run_publish(self,kind,repetitions=1):
        root,candidate,digest,env = self.fixture(kind)
        program = f'''import fs from 'node:fs';
import {{publishFrozen,r1Gate}} from {str(self.repo/'packaging/publish-crates.mjs')!r};
const dir={str(candidate)!r}, digest={gate.digest((candidate/'crates-inventory.json').read_bytes())!r};
let credentials=0, uploads=0,error='';
try{{for(let i=0;i<{repetitions};i++) await publishFrozen({{dir,digest,gate:args=>r1Gate({{...args,rootDigest:{digest!r}}}),credentials:async()=>{{credentials++;return 'offline';}},fetcher:async(url,options={{}})=>{{if(options.method==='PUT'){{uploads++;throw Error('unexpected upload');}}if(url.endsWith('/download'))return new Response(url.split('/').at(-3));if(url.startsWith('https://index.crates.io/')){{const name=url.split('/').at(-1);return new Response(JSON.stringify({{vers:'0.1.0',cksum:(await import('node:crypto')).createHash('sha256').update(name).digest('hex')}}));}}return new Response('source');}}}});}}catch(e){{error=String(e);}}
console.log('RESULT:'+JSON.stringify({{credentials,uploads,error}}));
'''
        result = subprocess.run([os.environ.get('R3_FIXTURE_NODE','node'),'--input-type=module','-e',program],cwd=root,env=env,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        line = next(line for line in result.stdout.splitlines() if line.startswith('RESULT:'))
        return json.loads(line[7:]),root

    def test_signed_exact_inventory_reaches_credentials_through_real_adapter(self):
        result,root=self.run_publish('valid')
        self.assertEqual(result,{'credentials':1,'uploads':0,'error':''})
        self.assertTrue((root/'live').exists())
        calls=[json.loads(line) for line in (root/'calls.jsonl').read_text().splitlines()]
        phases=[c[c.index('--phase')+1] for c in calls]
        self.assertEqual(phases[:2],['preflight','preflight'])
        self.assertEqual(phases[2:],['boundary']*14)
        receipts=[c[c.index('--receipt')+1] for c in calls]
        self.assertEqual(len(set(receipts)),len(calls))
        self.assertTrue(all(Path(p).is_file() and not Path(p).is_relative_to(root/'candidate') for p in receipts))

    def test_repeated_preflights_and_publications_use_immutable_unique_audit_keys(self):
        result,root=self.run_publish('valid',repetitions=2)
        self.assertEqual(result,{'credentials':2,'uploads':0,'error':''})
        calls=[json.loads(line) for line in (root/'audit-calls.jsonl').read_text().splitlines()]
        self.assertEqual(len(calls),32)
        keys=[c[c.index('--key')+1] for c in calls]
        self.assertEqual(len(set(keys)),32)
        self.assertTrue(all(key.startswith('audit/20/1/') for key in keys))
        self.assertEqual(len(list((root/'audit').iterdir())),32)
        for call,key in zip(calls,keys):
            self.assertEqual(call[call.index('--if-none-match')+1],'*')
            path=Path(call[call.index('--body')+1])
            self.assertEqual((root/'audit'/key.replace('/','_')).read_bytes(),path.read_bytes())

    def test_missing_gate_refuses_before_credentials(self):
        result,root=self.run_publish('missing-gate')
        self.assertEqual((result['credentials'],result['uploads']),(0,0)); self.assertIn('gate',result['error'])
        self.assertFalse((root/'live').exists())

    def test_missing_maintainer_signature_refuses_before_live_evidence_and_credentials(self):
        result,root=self.run_publish('missing-signature')
        self.assertEqual((result['credentials'],result['uploads']),(0,0)); self.assertIn('maintainer inventory signature input missing',result['error'])
        self.assertFalse((root/'live').exists())

    def test_signature_for_different_inventory_refuses_before_live_evidence_and_credentials(self):
        result,root=self.run_publish('different-signature')
        self.assertEqual((result['credentials'],result['uploads']),(0,0)); self.assertIn('maintainer inventory signature invalid',result['error'])
        self.assertFalse((root/'live').exists())

    def test_channel_digest_must_be_in_signed_global_inventory(self):
        result,root=self.run_publish('wrong-channel-digest')
        self.assertEqual((result['credentials'],result['uploads']),(0,0)); self.assertIn('global inventory',result['error'])
        self.assertFalse((root/'live').exists())

    def test_platform_approval_refusal_stops_credentials_after_valid_signature(self):
        result,root=self.run_publish('approval-rejected')
        self.assertEqual((result['credentials'],result['uploads']),(0,0)); self.assertIn('platform approval rejected',result['error'])
        self.assertTrue((root/'live').exists())

    def test_global_inventory_changed_during_final_preflight_stops_before_credentials(self):
        result,_=self.run_publish('global-after-gate')
        self.assertEqual((result['credentials'],result['uploads']),(0,0)); self.assertIn('global inventory digest changed',result['error'])

    def test_crates_oidc_obeys_shared_gate_graph(self):
        import copy, yaml, workflow_policy
        workflow=yaml.safe_load((self.repo/'.github/workflows/release-publish.yml').read_text())
        workflow_policy.check(workflow,'release-publish.yml')
        mutated=copy.deepcopy(workflow);steps=mutated['jobs']['crates']['steps']
        auth=next(s for s in steps if s.get('uses','').startswith('rust-lang/crates-io-auth-action@'))
        steps.remove(auth);steps.insert(0,auth)
        with self.assertRaisesRegex(ValueError,'credentials'):
            workflow_policy.check(mutated,'release-publish.yml')
