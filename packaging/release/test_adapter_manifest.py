from pathlib import Path
import hashlib
import subprocess
import sys
import tempfile
import unittest


class AdapterManifest(unittest.TestCase):
    def invoke(self, root):
        return subprocess.run([sys.executable, str(Path(__file__).with_name('adapter_manifest.py')),
                               '--sha256', str(root)], capture_output=True, text=True, check=False)

    def test_build_cli_hashes_exact_bytes_in_each_layout(self):
        raw = b'{"schema": 1}\n'
        locations = ['adapters/manifest.json', 'crates/hennery-host/manifest.json']
        for present in [locations[:1], locations[1:], locations]:
            with self.subTest(present=present), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                for location in present:
                    path = root / location
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(raw)
                result = self.invoke(root)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, hashlib.sha256(raw).hexdigest() + '\n')

    def test_build_cli_refuses_conflicting_layouts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for location, raw in [('adapters/manifest.json', b'{"schema":1}\n'),
                                  ('crates/hennery-host/manifest.json', b'{"schema": 1}\n')]:
                path = root / location
                path.parent.mkdir(parents=True)
                path.write_bytes(raw)
            result = self.invoke(root)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('adapter manifest locations disagree', result.stderr)
            self.assertEqual(result.stdout, '')

    def test_build_cli_refuses_missing_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = self.invoke(tmp)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('adapter manifest missing', result.stderr)
            self.assertEqual(result.stdout, '')
