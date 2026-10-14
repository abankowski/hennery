import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import retention


class Retention(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'payload').write_bytes(b'final')
        self.inventory = {'artifacts': [{'name': 'payload', 'sha256': gate.digest(b'final'), 'size': 5}]}
        self.raw = gate.canonical(self.inventory)
        (self.root / 'release-inventory.json').write_bytes(self.raw)
        self.hash = gate.digest(self.raw)

    def test_requires_compliance_legal_hold_and_version(self):
        good = {'VersionId': 'immutable-v1', 'ObjectLockMode': 'COMPLIANCE', 'ObjectLockLegalHoldStatus': 'ON',
                'ObjectLockRetainUntilDate': '2099-01-01T00:00:00Z', 'ChecksumSHA256': 'ZmluYWw='}
        retention.check_lock(good)
        for field, value in [('VersionId', None), ('VersionId', 'null'), ('ObjectLockMode', 'GOVERNANCE'),
                             ('ObjectLockLegalHoldStatus', 'OFF'), ('ObjectLockRetainUntilDate', '2000-01-01T00:00:00Z')]:
            with self.subTest(field=field), self.assertRaises(gate.Refused):
                retention.check_lock(good | {field: value})

    def test_stage_uses_conditional_creation(self):
        calls = []
        def aws(*args):
            calls.append(args)
            return {'VersionId': 'v1'}
        with patch.object(retention, 'aws', aws), patch.object(retention, 'verify'):
            retention.stage(self.root, 'candidate-bucket', self.hash)
        self.assertEqual(len(calls), 2)
        for call in calls:
            self.assertIn('--if-none-match', call)
            self.assertIn('COMPLIANCE', call)
            self.assertIn('ON', call)

    def test_fetch_digest_and_exact_versions(self):
        receipt = {'schema': 1, 'bucket': 'candidate-bucket', 'inventory_sha256': self.hash,
                   'objects': [{'name': 'release-inventory.json', 'key': 'candidates/' + self.hash + '/release-inventory.json',
                                'version': 'v1', 'sha256': self.hash}]}
        dest = self.root / 'fetched'
        def aws(*args):
            self.assertIn('--version-id', args)
            if args[0] == 'get-object':
                Path(args[-1]).write_bytes(self.raw)
            return {'VersionId': 'v1', 'ObjectLockMode': 'COMPLIANCE', 'ObjectLockLegalHoldStatus': 'ON',
                    'ObjectLockRetainUntilDate': '2099-01-01T00:00:00Z'}
        with patch.object(retention, 'aws', aws), self.assertRaises(gate.Refused):
            # Incomplete receipt cannot recover a complete candidate.
            retention.fetch(receipt, dest, self.hash)


if __name__ == '__main__':
    unittest.main()
