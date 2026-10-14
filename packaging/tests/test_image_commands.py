"""Build and loopback boundaries with fake tools; no daemon or network."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

PACKAGING = Path(__file__).parents[1]


class Commands(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'bin').mkdir()
        (self.root / 'packaging').mkdir()
        for name in ['image-build.sh', 'image-ci.sh', 'test-image-registry.sh']:
            shutil.copyfile(PACKAGING / name, self.root / 'packaging' / name)
        self.env = dict(os.environ, PATH=str(self.root / 'bin') + os.pathsep + os.environ['PATH'],
                        LOG=str(self.root / 'calls'), TEST_OS='Linux', TEST_ARCH='x86_64',
                        ENDPOINT='127.0.0.1:12345')
        self.tool('uname', '#!/bin/sh\nif [ "$1" = -s ]; then echo "$TEST_OS"; else echo "$TEST_ARCH"; fi\n')
        self.tool('docker', '''#!/bin/sh
echo "docker $*" >> "$LOG"
case "$1" in
 buildx) exit 73;;
 port) echo "$ENDPOINT";;
 run) echo temporary-registry;;
 rm) exit 0;;
 *) exit 90;;
esac
''')
        self.tool('skopeo', '#!/bin/sh\necho "skopeo $*" >> "$LOG"\nexit 74\n')
        (self.root / 'bin/python3').symlink_to(sys.executable)
        staged = self.root / 'dist/linux-amd64'
        staged.mkdir(parents=True)
        for name in ['hennery', 'THIRD-PARTY-NOTICES', 'binary.spdx.json']:
            (staged / name).write_text('staged input')

    def tool(self, name, body):
        path = self.root / 'bin' / name
        path.write_text(body)
        path.chmod(0o755)

    def run_script(self, name='image-build.sh', *args):
        if not args:
            args = ('amd64', 'output', '0.1.0-alpha.1', 'a' * 40, '1')
        return subprocess.run(['sh', 'packaging/' + name, *args], cwd=self.root,
                               env=self.env, capture_output=True, text=True)

    def calls(self):
        path = self.root / 'calls'
        return path.read_text() if path.exists() else ''

    def test_native_build_pins_scanner_and_exports_attestations_without_cache(self):
        self.assertEqual(self.run_script().returncode, 73)
        calls = self.calls()
        for arg in ['--no-cache', '--target release', '--provenance=mode=max',
                    '--attest type=sbom,generator=', '@sha256:', '--output type=oci,',
                    '--tag localhost/hennery-collector:' + 'a' * 40 + '-amd64']:
            self.assertIn(arg, calls)
        self.assertNotIn('--push', calls)

    def test_each_missing_legal_or_binary_input_refuses_before_docker(self):
        for name in ['hennery', 'THIRD-PARTY-NOTICES', 'binary.spdx.json']:
            with self.subTest(name=name):
                path = self.root / 'dist/linux-amd64' / name
                path.unlink()
                self.assertIn('missing R1 input', self.run_script().stderr)
                path.write_text('restored')
        self.assertEqual(self.calls(), '')

    def test_non_linux_build_is_refused(self):
        self.env['TEST_OS'] = 'Darwin'
        self.assertIn('native Linux runner required', self.run_script().stderr)
        self.assertEqual(self.calls(), '')

    def test_wrong_native_architecture_is_refused(self):
        self.env['TEST_ARCH'] = 'aarch64'
        self.assertIn('native Linux runner required', self.run_script().stderr)
        self.assertEqual(self.calls(), '')

    def test_unsupported_build_architecture_is_refused(self):
        result = self.run_script('image-build.sh', 'ppc64', 'output', '0.1.0', 'a' * 40, '1')
        self.assertIn('unsupported image architecture', result.stderr)
        self.assertEqual(self.calls(), '')

    def test_existing_build_output_is_refused(self):
        (self.root / 'output').mkdir()
        self.assertIn('output already exists', self.run_script().stderr)
        (self.root / 'dist/image-amd64').mkdir()
        self.assertIn('CI output already exists', self.run_script('image-ci.sh', 'amd64', 'a' * 40).stderr)
        self.assertEqual(self.calls(), '')

    def test_external_registry_endpoint_is_refused_before_push(self):
        self.tool('curl', '#!/bin/sh\nexit 0\n')
        self.env['ENDPOINT'] = '0.0.0.0:12345'
        result = self.run_script('test-image-registry.sh', 'layout')
        self.assertIn('refusing non-loopback registry', result.stderr)
        self.assertNotIn('skopeo', self.calls())
        self.assertIn('-p 127.0.0.1::5000', self.calls())

    def test_registry_transport_can_only_target_allocated_loopback(self):
        self.tool('curl', '#!/bin/sh\nexit 0\n')
        result = self.run_script('test-image-registry.sh', 'layout')
        self.assertEqual(result.returncode, 74)
        self.assertIn('skopeo copy --all --preserve-digests --dest-tls-verify=false oci:layout docker://127.0.0.1:12345/hennery:test', self.calls())

    def ci_fixture(self):
        # BuildKit alone is stubbed; verifier and signing extraction run on
        # actual OCI fixtures, so omitting either call is observable.
        import json
        from test_image import CandidateFixtures, image
        fixture = CandidateFixtures()
        fixture.addCleanup = self.addCleanup
        fixture.setUp()
        fixture.fixture(labels={'org.opencontainers.image.version': '0.0.0'},
                        buildkit_name='localhost/hennery-collector')
        expected = image.verify(fixture.root, {'amd64': fixture.expected}, fixture.revision, '0.0.0')
        for name in ['image.py', 'image-signing-inputs.py']:
            shutil.copyfile(PACKAGING / name, self.root / 'packaging' / name)
        import tarfile
        with tarfile.open(self.root / 'fixture.tar', 'w') as archive:
            for path in fixture.root.iterdir():
                archive.add(path, arcname=path.name)
        fixture.replace_subjects([])
        with tarfile.open(self.root / 'fixture-unnamed.tar', 'w') as archive:
            for path in fixture.root.iterdir():
                archive.add(path, arcname=path.name)
        (self.root / 'dist/linux-amd64/hennery').write_bytes(fixture.binary)
        self.tool('docker', '''#!/bin/sh
echo "docker $*" >> "$LOG"
case "$2" in
 create) exit 0;;
 build) case " $* " in
    *" --tag "*) cp fixture.tar dist/image-amd64/image.tar;;
    *) cp fixture-unnamed.tar dist/image-amd64/image.tar;;
    esac;;
 *) exit 90;;
esac
''')
        return fixture, expected

    def test_ci_qualifies_release_oci_and_extracts_real_signing_inputs(self):
        fixture, expected = self.ci_fixture()
        import json
        result = self.run_script('image-ci.sh', 'amd64', fixture.revision)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertIn('--target release', calls)
        self.assertIn('--tag localhost/hennery-collector:' + fixture.revision + '-amd64', calls)
        self.assertNotIn('--target collector', calls)
        self.assertNotIn('--load', calls)
        report = json.loads((self.root / 'dist/image-amd64/verified.json').read_text())
        self.assertEqual(report, expected)
        signed = self.root / 'dist/image-amd64/signing-inputs'
        self.assertTrue((signed / 'image.spdx.json').is_file())
        self.assertTrue((signed / 'binary.spdx.json').is_file())
        for name in ['THIRD-PARTY-NOTICES', 'binary.spdx.json']:
            self.assertIn('CI FIXTURE', (self.root / 'dist/linux-amd64' / name).read_text())

    def test_ci_verifier_refuses_unapproved_binary_before_signing(self):
        self.ci_fixture()
        (self.root / 'dist/linux-amd64/hennery').write_bytes(b'wrong binary')
        result = self.run_script('image-ci.sh', 'amd64', 'a' * 40)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('binary digest mismatch', result.stderr)
        self.assertFalse((self.root / 'dist/image-amd64/signing-inputs').exists())


if __name__ == '__main__':
    unittest.main()
