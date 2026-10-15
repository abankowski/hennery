"""Exercise the executable channel adapter without network or credentials."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
ADAPTER = ROOT / 'packaging/release-gate'


class Adapter(unittest.TestCase):
    def call(self, *arguments):
        return subprocess.run([str(ADAPTER), *arguments], capture_output=True, text=True)

    def test_unknown_legacy_or_overridden_channel_refuses(self):
        complete = ['--candidate', '/missing-release-candidate', '--inventory-sha256', 'a' * 64,
                    '--phase', 'preflight', '--receipt', '/missing-release-receipt.json']
        for arguments in [[], ['crates-io'], ['materialize'], ['verify'], ['upload'],
                          ['ghcr', '--channel', 'github'], ['ghcr', '--channel=github'],
                          ['ghcr', '--chan=github']]:
            with self.subTest(arguments=arguments):
                self.assertEqual(self.call(*arguments, *complete).returncode, 2)

    def test_each_channel_requires_complete_retained_bytes_before_network(self):
        with tempfile.TemporaryDirectory() as candidate:
            for channel in ('github', 'crates', 'ghcr', 'homebrew'):
                with self.subTest(channel=channel):
                    result = self.call(channel, '--candidate', candidate, '--inventory-sha256', 'a' * 64,
                                       '--phase', 'preflight', '--receipt', candidate + '.receipt')
                    self.assertEqual(result.returncode, 1)
                    self.assertIn('release-inventory.json', result.stderr)
                    self.assertIn('release refused:', result.stderr)


if __name__ == '__main__':
    unittest.main()
