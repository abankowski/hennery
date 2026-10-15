import importlib.util
from pathlib import Path
import unittest
import hashlib
import json
import os
import subprocess
import tempfile

spec = importlib.util.spec_from_file_location('hardener', Path(__file__).resolve().parents[1] / 'harden-installer.py')
hardener = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hardener)


class Hardener(unittest.TestCase):
    def test_maintainer_signature_is_required_even_with_valid_tag_attestation(self):
        block = hardener.REPLACEMENTS[0][1]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / 'archive'
            archive.write_bytes(b'archive fixture')
            inventory = {'schema': 1, 'repository': 'marcinwadon/hennery', 'tag': 'v1.2.3', 'artifacts': [{'name': 'hennery-test.tar.xz', 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}]}
            raw = json.dumps(inventory).encode()
            (root / 'inventory').write_bytes(raw)
            (root / 'signature').write_bytes(raw)
            (root / 'bundle').write_text('valid-looking exact-tag attestation')
            tools = root / 'tools'
            tools.mkdir()
            (tools / 'gh').write_text('#!/bin/sh\nexit 0\n')
            (tools / 'gpg').write_text('''#!/bin/sh
for arg in "$@"; do
    if [ "$arg" = --import ]; then
        [ "$HENNERY_TEST_SIGNATURE" != import-failed ] || exit 1
        exit 0
    fi
done
printf called > "$TEST_ROOT/gpg-called"
case "$HENNERY_TEST_SIGNATURE" in
  unsigned|malformed) exit 1 ;;
  wrong-key) echo '[GNUPG:] VALIDSIG 0000000000000000000000000000000000000000'; exit 0 ;;
  revoked) echo '[GNUPG:] REVKEYSIG bad'; echo '[GNUPG:] VALIDSIG F26C7F594DFE84D131703AFC23E5A318AE8D2861'; exit 0 ;;
  failed-valid) echo '[GNUPG:] VALIDSIG F26C7F594DFE84D131703AFC23E5A318AE8D2861'; exit 1 ;;
  expired) echo '[GNUPG:] KEYEXPIRED 123'; echo '[GNUPG:] VALIDSIG F26C7F594DFE84D131703AFC23E5A318AE8D2861'; exit 0 ;;
  no-status) exit 0 ;;
  duplicate) echo '[GNUPG:] VALIDSIG F26C7F594DFE84D131703AFC23E5A318AE8D2861' ;;
esac
cmp "$HENNERY_RELEASE_SIGNATURE" "$HENNERY_RELEASE_INVENTORY" || exit 1
echo '[GNUPG:] VALIDSIG F26C7F594DFE84D131703AFC23E5A318AE8D2861'
''')
            for tool in tools.iterdir():
                tool.chmod(0o755)
            script = root / 'check.sh'
            script.write_text('''#!/bin/sh
set -eu
check_cmd() {
case "$HENNERY_TEST_SIGNATURE:$1" in missing-gpg:gpg|missing-jq:jq) return 1 ;; esac
command -v "$1" >/dev/null
}
err() { echo "$*" >&2; exit 1; }
run() {
local _dir="$TEST_ROOT/$HENNERY_TEST_SIGNATURE" _file="$TEST_ROOT/archive" _artifact_name=hennery-test.tar.xz
APP_VERSION=1.2.3
''' + block + '\nprintf authenticated > "$TEST_ROOT/authenticated"\n}\nrun\n')
            env = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ['PATH'], TEST_ROOT=str(root),
                       HENNERY_ATTESTATION_BUNDLE=str(root / 'bundle'), HENNERY_RELEASE_INVENTORY=str(root / 'inventory'),
                       HENNERY_RELEASE_SIGNATURE=str(root / 'signature'))
            for case in ['valid', 'unsigned', 'malformed', 'wrong-key', 'revoked', 'expired', 'duplicate', 'no-status', 'failed-valid', 'import-failed', 'different-inventory', 'missing', 'empty-signature', 'missing-inventory', 'wrong-archive', 'wrong-tag', 'duplicate-archive', 'missing-gpg', 'missing-jq', 'wrong-repository', 'wrong-schema']:
                with self.subTest(case=case):
                    (root / case).mkdir()
                    (root / 'inventory').write_bytes(raw)
                    (root / 'signature').write_bytes(raw)
                    (root / 'authenticated').unlink(missing_ok=True)
                    (root / 'gpg-called').unlink(missing_ok=True)
                    if case == 'different-inventory':
                        (root / 'inventory').write_bytes(raw + b' ')
                    elif case == 'missing':
                        (root / 'signature').unlink()
                    elif case == 'missing-inventory':
                        (root / 'inventory').unlink()
                    elif case == 'empty-signature':
                        (root / 'signature').write_bytes(b'')
                    elif case in ('wrong-archive', 'wrong-tag', 'duplicate-archive', 'wrong-repository', 'wrong-schema'):
                        changed = json.loads(raw)
                        if case == 'wrong-archive':
                            changed['artifacts'][0]['sha256'] = '0' * 64
                        elif case == 'wrong-tag':
                            changed['tag'] = 'v9.9.9'
                        elif case == 'wrong-repository':
                            changed['repository'] = 'another/repository'
                        elif case == 'wrong-schema':
                            changed['schema'] = 2
                        else:
                            changed['artifacts'].append(changed['artifacts'][0].copy())
                        data = json.dumps(changed).encode()
                        (root / 'inventory').write_bytes(data)
                        (root / 'signature').write_bytes(data)
                    result = subprocess.run(['sh', str(script)], env=dict(env, HENNERY_TEST_SIGNATURE=case), capture_output=True, text=True)
                    if case == 'valid':
                        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                        self.assertTrue((root / 'authenticated').exists())
                    else:
                        self.assertNotEqual(result.returncode, 0, 'valid-looking tag attestation bypassed ' + case)
                        self.assertFalse((root / 'authenticated').exists())
                        self.assertIn('maintainer', result.stderr)
                        if case in ('missing', 'empty-signature', 'missing-inventory'):
                            self.assertFalse((root / 'gpg-called').exists(), 'missing input must be refused before invoking gpg')

    def test_signature_identity_is_exact_tag_and_verification_precedes_extraction(self):
        result = hardener.harden('\n'.join(old for old, _ in hardener.REPLACEMENTS))
        self.assertIn('--cert-identity "https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/v$APP_VERSION"', result)
        self.assertIn('--source-ref "refs/tags/v$APP_VERSION"', result)
        self.assertIn('refusing an archive without valid release-tag provenance', result)

    def test_all_anchors_are_required_once(self):
        pristine = '\n'.join(old for old, _ in hardener.REPLACEMENTS)
        result = hardener.harden(pristine)
        self.assertIn('ln "$_stage/$_bin_name" "$_install_dir/"', result)
        self.assertIn('[ "${#_checksum_value}" = 64 ]', result)
        for old, _ in hardener.REPLACEMENTS:
            with self.subTest(anchor=old[:60]):
                with self.assertRaises(SystemExit):
                    hardener.harden(pristine.replace(old, '', 1))
                with self.assertRaises(SystemExit):
                    hardener.harden(pristine + '\n' + old)


if __name__ == '__main__':
    unittest.main()
