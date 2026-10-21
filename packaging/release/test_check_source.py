"""Native archive identity acceptance, with isolated executable fixtures."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class SourceIdentityTests(unittest.TestCase):
    def check(self, lines, expected='a' * 40, exit_code=0):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            binary = root / 'hennery'
            binary.write_text('#!/bin/sh\ncat <<\'VERSION\'\n' + lines + '\nVERSION\nexit ' + str(exit_code) + '\n')
            binary.chmod(0o700)
            identity = root / 'build-identity.json'
            identity.write_text(json.dumps({'source_sha': expected}))
            return subprocess.run([sys.executable, str(ROOT / 'packaging/release/check_source.py'), str(binary), str(identity)],
                                  capture_output=True, text=True, env={**os.environ, 'HOME': str(root)})

    def test_matching_recorded_sha_passes(self):
        for sha in ['a' * 40, 'b' * 64]:
            result = self.check('hennery 0.2.1\nsource: ' + sha, sha)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_unrecorded_mismatched_duplicate_and_failed_binary_refuse(self):
        for lines, code in [('hennery 0.2.1', 0), ('source: unrecorded (dirty source)', 0),
                            ('source: ' + 'b' * 40, 0), ('source: ' + 'a' * 40 + '\nsource: ' + 'a' * 40, 0),
                            ('source: ' + 'a' * 40, 1)]:
            result = self.check(lines, exit_code=code)
            self.assertNotEqual(result.returncode, 0)

    def test_invalid_expected_source_refuses(self):
        result = self.check('source: unrecorded (dirty source)', 'unrecorded (dirty source)')
        self.assertNotEqual(result.returncode, 0)

    def test_native_archive_runs_acceptance_after_ui_check(self):
        script = (ROOT / 'packaging/release/native-archive.sh').read_text()
        acceptance = 'python3 packaging/release/check_source.py "$binary" release-materials/build-identity.json'
        self.assertIn(acceptance, script)
        self.assertLess(script.index('sh packaging/check-web-ui.sh "$binary"'), script.index(acceptance))
