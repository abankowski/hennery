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
