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


if __name__ == '__main__':
    unittest.main()

class Recovery(unittest.TestCase):
    def test_reconcile_then_upload_reuses_the_verified_existing_bundle(self):
        import sys
        import test_gate
        fixture = test_gate.Gates(); fixture.setUp(); self.addCleanup(fixture.tmp.cleanup)
        (fixture.root / 'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        signatures = fixture.root.parent / (fixture.root.name + '-signatures'); signatures.mkdir()
        self.addCleanup(lambda: __import__('shutil').rmtree(signatures))
        (signatures / 'release.sigstore.jsonl').write_bytes(b'new attempt bundle')
        remote = {p.name: p.read_bytes() for p in fixture.root.iterdir()} | {'release.sigstore.jsonl': b'previous verified bundle'}
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
