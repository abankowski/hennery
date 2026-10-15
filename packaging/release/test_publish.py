from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import publish


class Publication(unittest.TestCase):
    def test_remote_status_and_digest_reconciliation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'payload').write_bytes(b'approved')
            expected = {'payload': gate.digest(b'approved')}
            for existing, body, result in [([], None, ['payload']), ([{'name': 'payload', 'url': '/asset'}], b'approved', [])]:
                with patch.object(publish, 'asset_bytes', return_value=body):
                    self.assertEqual(publish.plan(expected, existing)['missing'], result)
            for body in (None, b'wrong'):
                with patch.object(publish, 'asset_bytes', return_value=body), self.assertRaises(gate.Refused):
                    publish.plan(expected, [{'name': 'payload', 'url': '/asset'}])
            with self.assertRaises(gate.Refused):
                publish.plan(expected, [{'name': 'extra', 'url': '/asset'}])

    def test_publication_switch_cannot_be_omitted(self):
        with patch.dict('os.environ', {}, clear=True), self.assertRaises(gate.Refused):
            publish.require_enabled()



class Recovery(unittest.TestCase):
    def setUp(self):
        mocked=patch('approval.verify',side_effect=lambda inventory,signature:{'inventory_sha256':gate.digest(inventory.read_bytes()),'signature_sha256':gate.digest(signature.read_bytes())}); mocked.start(); self.addCleanup(mocked.stop)

    def test_reconcile_then_upload_reuses_the_verified_existing_bundle(self):
        import sys
        import test_gate
        fixture = test_gate.Gates(); fixture.setUp(); self.addCleanup(fixture.tmp.cleanup)
        (fixture.root / 'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        signatures = fixture.root.parent / (fixture.root.name + '-signatures'); signatures.mkdir()
        self.addCleanup(lambda: __import__('shutil').rmtree(signatures))
        (signatures / 'release.sigstore.jsonl').write_bytes(b'new attempt bundle')
        (signatures / 'release-inventory.json.asc').write_bytes(b'verified hardware signature')
        remote = {p.name: p.read_bytes() for p in fixture.root.iterdir()} | {'release.sigstore.jsonl': b'previous verified bundle', 'release-inventory.json.asc':b'verified hardware signature'}
        assets = [{'name': n, 'url': n} for n in remote]
        release = {'id': 42, 'tag_name': fixture.inventory['tag'], 'draft': False, 'immutable': True}
        def api(path, method='GET', **kwargs):
            self.assertEqual(method, 'GET')
            return assets if '/assets?' in path else release
        with patch.object(publish, 'api', side_effect=api), patch.object(publish, 'asset_bytes', side_effect=lambda a: remote[a['name']]), patch('verify.verify') as verified, patch.dict('os.environ', {'RELEASE_PUBLICATION_ENABLED': 'true', 'GITHUB_SHA': 'a' * 40}):
            for operation in ('reconcile', 'upload'):
                with patch.object(sys, 'argv', ['publish.py', operation, '--candidate', str(fixture.root), '--signatures', str(signatures), '--output', str(signatures / (operation + '.json'))]):
                    try:
                        publish.main()
                    except FileExistsError as error:
                        self.fail(f'a verified retained bundle must survive reconcile then upload: {error}')
            self.assertEqual(verified.call_count, 2)
            self.assertEqual((signatures / 'recovered-release.sigstore.jsonl').read_bytes(), remote['release.sigstore.jsonl'])

    def test_existing_recovery_file_cannot_be_replaced(self):
        # A stale local sidecar must never silently become the recovered one.
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'bundle'
            path.write_bytes(b'wrong')
            with self.assertRaisesRegex(gate.Refused, 'recovered bundle differs'):
                publish.recover_bundle(path, b'approved')
            self.assertEqual(path.read_bytes(), b'wrong')

class ImmutablePublication(unittest.TestCase):
    def setUp(self):
        mocked=patch('approval.verify',side_effect=lambda inventory,signature:{'inventory_sha256':gate.digest(inventory.read_bytes()),'signature_sha256':gate.digest(signature.read_bytes())}); mocked.start(); self.addCleanup(mocked.stop)

    def scenario(self, seal):
        import json,sys,urllib.parse
        import test_gate
        fixture=test_gate.Gates();fixture.setUp();self.addCleanup(fixture.tmp.cleanup)
        notes=b'release notes\n';(fixture.root/'release-notes.md').write_bytes(notes)
        fixture.inventory['artifacts'].append({'name':'release-notes.md','sha256':gate.digest(notes),'size':len(notes)})
        (fixture.root/'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        with tempfile.TemporaryDirectory() as tmp:
            signatures=Path(tmp);(signatures/'release.sigstore.jsonl').write_bytes(b'verified bundle')
            (signatures/'release-inventory.json.asc').write_bytes(b'verified hardware signature')
            remote={};release=None;writes=[]
            expected={p.name for p in fixture.root.iterdir()}|{'release.sigstore.jsonl','release-inventory.json.asc'}
            def api(path,method='GET',data=None,**kwargs):
                nonlocal release
                if method=='GET':
                    return [{'name':n,'url':n} for n in remote] if '/assets?' in path else release
                writes.append(method)
                if method=='POST' and path.endswith('/releases'):
                    self.assertIs(json.loads(data)['draft'],True,'assets must be uploaded before immutable publication')
                    release={'id':42,'tag_name':fixture.inventory['tag'],'draft':True,'immutable':False};return release
                if method=='POST':
                    self.assertTrue(release['draft'])
                    remote[urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)['name'][0]]=data;return {}
                self.assertEqual(method,'PATCH')
                self.assertEqual(set(remote),expected,'sealing must follow complete verified upload')
                release=dict(release,draft=False,immutable=seal);return release
            with patch.object(publish,'api',side_effect=api),patch.object(publish,'asset_bytes',side_effect=lambda a:remote[a['name']]),patch.object(publish,'validate_live'),patch('verify.verify'),patch.dict('os.environ',{'RELEASE_PUBLICATION_ENABLED':'true','GITHUB_SHA':'a'*40}),patch.object(sys,'argv',['publish.py','upload','--candidate',str(fixture.root),'--signatures',str(signatures),'--output',str(signatures/'result.json')]):
                if not seal:
                    with self.assertRaisesRegex(gate.Refused, 'did not establish immutability'):
                        publish.main()
                    return
                publish.main()
                self.assertIs(release['immutable'],True)
                self.assertEqual(writes[-1],'PATCH')

    def test_uploads_only_to_draft_then_seals_complete_release(self):
        self.scenario(True)

    def test_publication_must_actually_establish_immutability(self):
        self.scenario(False)

    def test_existing_published_release_must_already_be_immutable(self):
        import sys
        import test_gate
        fixture=test_gate.Gates();fixture.setUp();self.addCleanup(fixture.tmp.cleanup)
        (fixture.root/'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        with tempfile.TemporaryDirectory() as tmp:
            signatures=Path(tmp);(signatures/'release.sigstore.jsonl').write_bytes(b'bundle')
            (signatures/'release-inventory.json.asc').write_bytes(b'verified hardware signature')
            release={'id':42,'tag_name':fixture.inventory['tag'],'draft':False,'immutable':False}
            with patch.dict('os.environ',{'GITHUB_SHA':'a'*40}),patch.object(publish,'api',return_value=release),patch.object(publish,'release_assets',return_value=[]),patch('verify.verify'),patch.object(sys,'argv',['publish.py','reconcile','--candidate',str(fixture.root),'--signatures',str(signatures),'--output',str(signatures/'result.json')]),self.assertRaisesRegex(gate.Refused,'published release must be immutable'):
                publish.main()


if __name__ == '__main__':
    unittest.main()
