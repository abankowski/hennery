import base64
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import channel_publish
import gate
import homebrew_publish as tap
import test_homebrew


def frozen(root, value):
    return dict(value, artifacts=[{'name': p.name, 'sha256': gate.digest(p.read_bytes())} for p in root.iterdir() if p.is_file()])


class ChannelDelivery(unittest.TestCase):
    def test_crates_bootstrap_is_explicit_and_never_oidc_fallback(self):
        self.assertEqual(channel_publish.crates_token({'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','RELEASE_CRATES_BOOTSTRAP_TOKEN':'bootstrap'}),'bootstrap')
        self.assertEqual(channel_publish.crates_token({'CARGO_REGISTRY_TOKEN':'ephemeral'}),'ephemeral')
        for env in [{},{'RELEASE_CRATES_BOOTSTRAP_TOKEN':'bootstrap'},
                    {'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','CARGO_REGISTRY_TOKEN':'ephemeral'},
                    {'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','CARGO_REGISTRY_TOKEN':'ephemeral','RELEASE_CRATES_BOOTSTRAP_TOKEN':'bootstrap'}]:
            with self.subTest(env=env),self.assertRaises(gate.Refused):channel_publish.crates_token(env)

    def test_homebrew_publishes_exact_bytes_and_reconciles_without_overwrite(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        root=fixture.root;formula=(root/'hennery.rb').read_bytes()
        metadata=frozen(root, {'tag':fixture.tag,'channels':['github','homebrew'],'targets':fixture.targets,'source_sha':'a'*40})
        calls=[];remote=None
        def api(method='GET',data=None):
            nonlocal remote
            calls.append(method)
            if method=='GET':return remote
            self.assertEqual(base64.b64decode(data['content']),formula)
            remote={'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':data['content'],'sha':tap.blob_sha(formula)}
            return {'content':{'sha':tap.blob_sha(formula)},'commit':{'sha':'c'*40}}
        with patch.object(tap,'tap_api',side_effect=api):
            result=channel_publish.homebrew_upload(root,Path('signatures'),metadata)
            self.assertEqual(result['state'],'published')
            self.assertEqual(channel_publish.homebrew_upload(root,Path('signatures'),metadata)['state'],'already-present')
        self.assertEqual(calls.count('PUT'),1)

    def test_homebrew_conflicting_same_version_refuses(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        formula=(fixture.root/'hennery.rb').read_bytes()+b'# changed\n'
        remote={'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':base64.b64encode(formula).decode(),'sha':tap.blob_sha(formula)}
        meta=frozen(fixture.root, {'tag':fixture.tag,'channels':['github','homebrew'],'targets':fixture.targets,'source_sha':'a'*40})
        def only_read(method='GET',data=None):
            self.assertEqual(method,'GET','same-version conflict must never write')
            return remote
        with patch.object(tap,'tap_api',side_effect=only_read) as api,self.assertRaises(gate.Refused):
            channel_publish.homebrew_upload(fixture.root,Path('signatures'),meta)
        self.assertEqual([c.args for c in api.call_args_list],[('GET',)])

    def test_bootstrap_reports_revocation_on_success_and_abandonment(self):
        for failure in [False,True]:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);messages=[]
                raw=gate.canonical({'version':'0.1.0','source':{'sha':'a'*40}})
                (root/'crates-inventory.json').write_bytes(raw)
                value={'tag':'v0.1.0','source_sha':'a'*40,'artifacts':[{'name':'crates-inventory.json','sha256':gate.digest(raw)}]}
                env={'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','RELEASE_CRATES_BOOTSTRAP_TOKEN':'offline-bootstrap'}
                with patch.dict(os.environ,env),patch('builtins.print',side_effect=lambda text:messages.append(text)),patch.object(channel_publish.crates_delivery,'run',side_effect=RuntimeError('upload failed') if failure else None):
                    if failure:
                        with self.assertRaises(RuntimeError):channel_publish.publish(root,root,'crates',{'metadata':value})
                    else:channel_publish.publish(root,root,'crates',{'metadata':value})
                self.assertTrue(any('revoke' in str(message).lower() and 'bootstrap' in str(message).lower() for message in messages))

    def test_homebrew_cas_and_all_remote_conflicts(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        formula=(fixture.root/'hennery.rb').read_bytes();value=frozen(fixture.root, {'tag':fixture.tag,'targets':fixture.targets})
        def remote(raw):return {'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':base64.b64encode(raw).decode(),'sha':tap.blob_sha(raw)}
        for previous in [remote(formula+b'changed'),remote(formula.replace(b'0.1.0',b'9.0.0')),remote(b'invalid formula'),dict(remote(formula),sha='0'*40),dict(remote(formula),encoding='raw'),dict(remote(formula),type='symlink'),dict(remote(formula),path='other.rb'),dict(remote(formula),content='invalid base64')]:
            def read_only(method='GET',data=None):self.assertEqual(method,'GET');return previous
            with self.subTest(previous=previous),patch.object(tap,'tap_api',side_effect=read_only),self.assertRaises(gate.Refused):
                channel_publish.homebrew_upload(fixture.root,Path('signatures'),value)
        old=remote(formula.replace(b'0.1.0',b'0.0.1'));writes=[]
        def api(method='GET',data=None):
            if method=='GET':return remote(formula) if writes else old
            self.assertEqual(data['sha'],old['sha']);writes.append(data)
            return {'content':{'sha':tap.blob_sha(formula)},'commit':{'sha':'c'*40}}
        with patch.object(tap,'tap_api',side_effect=api):
            self.assertEqual(channel_publish.homebrew_upload(fixture.root,Path('signatures'),value)['state'],'published')
        self.assertEqual(len(writes),1)

    def test_homebrew_late_failure_or_changed_formula_never_overwrites(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        formula=(fixture.root/'hennery.rb').read_bytes();value=frozen(fixture.root, {'tag':fixture.tag,'targets':fixture.targets})
        for fault in ('changed','ambiguous','unconfirmed','readback'):
            (fixture.root/'hennery.rb').write_bytes(formula);events=[]
            def api(method='GET',data=None):
                events.append(method)
                if method=='GET':
                    if 'PUT' not in events:
                        if fault=='changed':(fixture.root/'hennery.rb').write_bytes(b'changed formula')
                        return None
                    return {'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':base64.b64encode(formula+b'changed').decode(),'sha':tap.blob_sha(formula+b'changed')}
                if fault=='ambiguous':raise gate.Refused('lost response')
                return {'content':{'sha':tap.blob_sha(formula) if fault!='unconfirmed' else '0'*40},'commit':{'sha':'c'*40}}
            with self.subTest(fault=fault),patch.object(tap,'tap_api',side_effect=api),self.assertRaises(gate.Refused):
                channel_publish.homebrew_upload(fixture.root,Path('signatures'),value)
            self.assertEqual(events.count('PUT'),0 if fault=='changed' else 1)
