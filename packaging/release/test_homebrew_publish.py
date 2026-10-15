"""Offline transport only: no token, signature, registry or tap access."""
import base64
import copy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import test_homebrew
import homebrew_publish as publisher


class Publisher(unittest.TestCase):
    def setUp(self):
        fixture = test_homebrew.Formula(); fixture.setUp(); self.addCleanup(fixture.tmp.cleanup)
        fixture.prepare(); self.root = fixture.root
        self.inventory = {'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': 'a'*40,
                          'tag': fixture.tag, 'channels': ['github', 'homebrew'], 'targets': fixture.targets,
                          'candidate': {'run_id': 10, 'run_attempt': 1},
                          'artifacts': [{'name': p.name, 'size': p.stat().st_size, 'sha256': gate.digest(p.read_bytes())}
                                        for p in sorted(self.root.iterdir())]}
        raw = gate.canonical(self.inventory); self.digest = gate.digest(raw)
        (self.root/'release-inventory.json').write_bytes(raw)
        self.formula = (self.root/'hennery.rb').read_bytes()
        self.env = patch.dict(os.environ, {'RELEASE_PUBLICATION_ENABLED': 'true', 'RELEASE_HOMEBREW_ENABLED': 'true'})
        self.env.start(); self.addCleanup(self.env.stop)
        # Any omitted boundary is a test failure; no real transports can run.
        for name in ('run_gate', 'public_release', 'tap_api'):
            stub = patch.object(publisher, name, side_effect=AssertionError('unstubbed '+name))
            stub.start(); self.addCleanup(stub.stop)

    def remote(self, raw):
        return {'type':'file', 'path':'Formula/hennery.rb', 'encoding':'base64',
                'sha':publisher.blob_sha(raw), 'content':base64.b64encode(raw).decode()}

    def execute(self, previous=None, before_boundary=None):
        self.calls=[]; self.writes=[]
        def live(candidate, digest, phase):
            self.calls.append(phase)
            if phase == 'boundary' and before_boundary: before_boundary()
        def public(candidate, inventory): self.calls.append('public')
        def tap(method='GET', data=None):
            self.calls.append(method)
            if method == 'GET': return self.remote(self.formula) if self.writes else previous
            self.writes.append(data)
            return {'content': {'sha': publisher.blob_sha(self.formula)}, 'commit': {'sha':'b'*40}}
        with patch.object(publisher,'run_gate',side_effect=live), patch.object(publisher,'public_release',side_effect=public), patch.object(publisher,'tap_api',side_effect=tap):
            return publisher.upload(self.root, self.digest)

    def test_create_uploads_exact_frozen_bytes_after_fresh_boundary(self):
        self.execute()
        self.assertEqual(self.calls, ['preflight','public','GET','boundary','public','PUT','GET'])
        self.assertEqual(base64.b64decode(self.writes[0]['content']), self.formula)
        self.assertNotIn('sha', self.writes[0])
        self.assertEqual(self.writes[0]['branch'], 'main')

    def test_existing_older_formula_uses_compare_and_swap(self):
        old=self.formula.replace(b'version "0.1.0"',b'version "0.0.1"')
        self.execute(self.remote(old))
        self.assertIn('sha', self.writes[0])
        self.assertEqual(self.writes[0]['sha'], publisher.blob_sha(old))

    def test_exact_remote_bytes_are_idempotent_without_write(self):
        self.execute(self.remote(self.formula))
        self.assertEqual(self.writes, [])
        self.assertNotIn('PUT', self.calls)

    def test_same_version_conflict_downgrade_and_invalid_remote_refuse(self):
        for previous in (self.remote(self.formula+b'# conflicting bytes\n'),
                         self.remote(self.formula.replace(b'version "0.1.0"',b'version "9.0.0"')),
                         self.remote(b'unrecognised formula'),
                         dict(self.remote(self.formula),sha='0'*40),
                         dict(self.remote(self.formula),encoding='raw'),
                         dict(self.remote(self.formula),path='other.rb'),
                         dict(self.remote(self.formula),type='symlink'),
                         dict(self.remote(self.formula),content='not base64')):
            with self.subTest(previous=previous), self.assertRaises(gate.Refused): self.execute(previous)
            self.assertEqual(self.writes, [])

    def test_both_switches_must_be_explicit_before_any_transport(self):
        for key in ('RELEASE_PUBLICATION_ENABLED','RELEASE_HOMEBREW_ENABLED'):
            for value in ('', 'false'):
                with patch.dict(os.environ,{key:value}), self.subTest(key=key,value=value), self.assertRaises(gate.Refused):
                    publisher.upload(self.root,self.digest)

    def test_inventory_digest_channel_prerelease_and_bytes_refuse(self):
        for mutation in ('digest','channel','prerelease','bytes'):
            inv=copy.deepcopy(self.inventory)
            (self.root/'hennery.rb').write_bytes(self.formula)
            if mutation=='channel': inv['channels']=['github']
            if mutation=='prerelease':
                inv['tag']='v0.1.0-alpha.1'
                path=self.root/'hennery.rb';path.write_bytes(self.formula.replace(b'0.1.0',b'0.1.0-alpha.1'))
                item=next(a for a in inv['artifacts'] if a['name']=='hennery.rb')
                item.update(size=path.stat().st_size,sha256=gate.digest(path.read_bytes()))
            if mutation=='bytes': (self.root/'hennery.rb').write_bytes(self.formula.replace(b'bin.install "hennery"',b'bin.install "hennery" # unapproved bytes'))
            raw=gate.canonical(inv);(self.root/'release-inventory.json').write_bytes(raw)
            digest='0'*64 if mutation=='digest' else gate.digest(raw)
            with self.subTest(mutation=mutation), self.assertRaises(gate.Refused): publisher.upload(self.root,digest)

    def test_gate_rejection_and_boundary_byte_change_prevent_write(self):
        for phase in ('preflight','boundary'):
            def refuse(candidate,digest,actual):
                if phase==actual: raise gate.Refused('rejected signed inventory/fresh approval')
            with patch.object(publisher,'run_gate',side_effect=refuse),patch.object(publisher,'public_release'),patch.object(publisher,'tap_api',return_value=None) as transport:
                with self.subTest(phase=phase),self.assertRaises(gate.Refused): publisher.upload(self.root,self.digest)
                self.assertTrue(all(c.args[0]=='GET' for c in transport.call_args_list))
        with self.assertRaises(gate.Refused):
            self.execute(before_boundary=lambda:(self.root/'hennery.rb').write_bytes(b'changed'))
        self.assertEqual(self.writes,[])

    def test_ambiguous_write_never_retries_and_unconfirmed_content_refuses(self):
        for result in (gate.Refused('ambiguous write'), {'content':{'sha':'0'*40},'commit':{'sha':'b'*40}}):
            written=[]
            def transport(method='GET',data=None):
                if method=='GET': return self.remote(self.formula) if written else None
                written.append(data)
                if isinstance(result,Exception): raise result
                return result
            with patch.object(publisher,'run_gate'),patch.object(publisher,'public_release'),patch.object(publisher,'tap_api',side_effect=transport) as api:
                with self.subTest(result=result),self.assertRaises(gate.Refused): publisher.upload(self.root,self.digest)
                self.assertEqual(sum(c.args[0]=='PUT' for c in api.call_args_list),1)

    def test_public_release_must_be_immutable_and_all_referenced_bytes_match(self):
        valid={'id':1,'tag_name':'v0.1.0','draft':False,'prerelease':False,'immutable':True}
        assets=[{'name':p.name,'url':str(p)} for p in self.root.iterdir()]
        # The class-level safety stub is bypassed only for this pure mocked transport test.
        with patch.object(publisher.publish,'release_assets',return_value=assets),patch.object(publisher.publish,'asset_bytes',side_effect=lambda a:Path(a['url']).read_bytes()):
            for change in ({'draft':True},{'prerelease':True},{'immutable':False},{'tag_name':'v9.9.9'}):
                with patch.object(publisher.publish,'api',return_value=valid|change),self.subTest(change=change),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)
            with patch.object(publisher.publish,'api',return_value=valid):
                publisher.check_public_release(self.root,self.inventory)
                with patch.object(publisher.publish,'asset_bytes',return_value=b'wrong'),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)
                with patch.object(publisher.publish,'release_assets',return_value=assets+assets[:1]),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)
                with patch.object(publisher.publish,'release_assets',return_value=[]),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)


    def test_confirmed_write_still_requires_exact_remote_readback(self):
        written=[]
        def transport(method='GET',data=None):
            if method=='GET': return self.remote(self.formula+b'# changed remote bytes\n') if written else None
            written.append(data)
            return {'content':{'sha':publisher.blob_sha(self.formula)},'commit':{'sha':'b'*40}}
        with patch.object(publisher,'run_gate'),patch.object(publisher,'public_release'),patch.object(publisher,'tap_api',side_effect=transport):
            with self.assertRaises(gate.Refused): publisher.upload(self.root,self.digest)
        self.assertEqual(len(written),1)


class Transport(unittest.TestCase):
    def test_fixed_tap_path_credential_confinement_and_no_redirect(self):
        calls=[]
        class Response:
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self): return b'{}'
        class Opener:
            def open(self,request,timeout): calls.append(request);return Response()
        def opener(handler):
            self.assertIsNone(handler.redirect_request(None,None,302,None,None,'https://example.invalid'))
            return Opener()
        with patch.object(publisher.urllib.request,'build_opener',side_effect=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
            publisher.tap_api('GET');publisher.tap_api('PUT',{'content':'eA==','branch':'main'})
        self.assertEqual(calls[0].full_url,'https://api.github.com'+publisher.TAP_PATH+'?ref=main')
        self.assertNotIn('Authorization',calls[0].headers)
        self.assertEqual(calls[1].full_url,'https://api.github.com'+publisher.TAP_PATH)
        self.assertEqual(calls[1].headers['Authorization'],'Bearer offline-fixture')
        self.assertEqual(calls[1].data,gate.canonical({'content':'eA==','branch':'main'}))

    def test_only_authoritative_get_404_is_absence(self):
        import urllib.error
        for method in ('GET','PUT'):
            for code in (301,302,403,404,409,500):
                opener=unittest.mock.Mock()
                import io
                error=urllib.error.HTTPError('https://example.invalid',code,'fixture',{},io.BytesIO())
                self.addCleanup(error.close)
                opener.open.side_effect=error
                with patch.object(publisher.urllib.request,'build_opener',return_value=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
                    if method=='GET' and code==404:self.assertIsNone(publisher.tap_api(method))
                    else:
                        with self.subTest(method=method,code=code),self.assertRaises(gate.Refused):publisher.tap_api(method)
                self.assertEqual(opener.open.call_count,1)

    def test_live_gate_uses_homebrew_and_removes_tap_credential_from_child(self):
        with patch.object(publisher.subprocess,'run') as run,patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
            publisher.run_gate(Path('/tmp/frozen-candidate'),'0'*64,'boundary')
        run.assert_called_once()
        args,kwargs=run.call_args
        self.assertEqual(args[0][1],'homebrew')
        self.assertNotIn('HOMEBREW_TAP_TOKEN',kwargs['env'])
        self.assertIn('--receipt',args[0]);self.assertTrue(kwargs['check'])


if __name__=='__main__': unittest.main()
