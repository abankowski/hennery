import hashlib
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import gate
import verify
import test_gate


class Verification(unittest.TestCase):
    def test_authentication_failure_stops_before_installer(self):
        with patch.object(verify.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'verifier')):
            with self.assertRaises(subprocess.CalledProcessError):
                verify.verify(Path('/unused'), Path('/unused-bundle'), 'a' * 40, 'v0.1.0')

    def test_source_and_tag_bound_inside_signed_inventory(self):
        fixture = test_gate.Gates()
        fixture.setUp()
        self.addCleanup(fixture.tmp.cleanup)
        (fixture.root / 'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        with patch.object(verify.subprocess, 'run') as call:
            for source, tag in [('b' * 40, fixture.inventory['tag']), ('a' * 40, 'v0.1.0')]:
                with self.assertRaises(gate.Refused):
                    verify.verify(fixture.root, Path('bundle'), source, tag)
            args = call.call_args.args[0]
            self.assertIn('--signer-workflow', args)
            self.assertIn('--source-ref', args)
            self.assertIn('--deny-self-hosted-runners', args)


if __name__ == '__main__':
    unittest.main()
