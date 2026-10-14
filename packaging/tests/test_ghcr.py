"""All registry commands here are fake executables; no network or credentials."""
import json
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import sys
import unittest
import yaml
from unittest.mock import patch
from test_image import CandidateFixtures, image
import test_image as fixtures
from test_ghcr_candidate import ReleaseFixture, approval, gate, load_helper

PACKAGING = Path(__file__).parents[1]


class Gates(ReleaseFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        self.repo = self.root
        (self.repo / 'packaging').mkdir()
        for name in ['ghcr-gate.sh', 'ghcr-publish.sh', 'image.py', 'ghcr-remote.py', 'ghcr-candidate.py']:
            shutil.copyfile(PACKAGING / name, self.repo / 'packaging' / name)
        shutil.copytree(PACKAGING / 'release', self.repo / 'packaging/release',
                        ignore=shutil.ignore_patterns('__pycache__'))
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            report = helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
        candidate, digest = self.work, report['digest']
        self.adapter = self.repo / 'packaging/release-gate'
        self.adapter.write_text('#!' + sys.executable + '''
import os, pathlib, sys
sys.path.insert(0, "packaging/release")
import retention
with open(os.environ['ADAPTER_CALLS'], 'a') as log: log.write(' '.join(sys.argv[1:]) + '\\n')
if os.environ.get('RELEASE_SHELL_FIXTURE') != '1': sys.exit(92)
if pathlib.Path(os.environ['GATE_REVOKED_MARKER']).exists(): sys.exit(19)
if os.environ.get('GATE_EXIT', '0') != '0': sys.exit(int(os.environ['GATE_EXIT']))
receipt = pathlib.Path(sys.argv[sys.argv.index('--receipt') + 1])
with receipt.open('x') as output: output.write('{}')
retention.audit(receipt, 'offline-audit', int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
''')
        self.adapter.chmod(0o755)
        event = self.repo / 'event.json'; event.write_text(json.dumps({'inputs': self.inputs}))
        self.env = dict(os.environ, RELEASE_PUBLICATION_ENABLED='true', RELEASE_GHCR_ENABLED='true',
            INVENTORY_SHA256=self.inventory_digest, RELEASE_CANDIDATE='candidate', IMAGE_CANDIDATE='image-candidate',
            GITHUB_EVENT_PATH=str(event), GITHUB_RUN_ID='456', GITHUB_RUN_ATTEMPT='1',
            GATE_REVOKED_MARKER=str(self.repo / 'approval-revoked'),
            ADAPTER_CALLS=str(self.repo / 'adapter.log'), AWS_AUDIT_ROOT=str(self.repo / 'audit-store'),
            REGISTRY_AUTH_FILE=str(self.repo / 'auth.json'), PYTHONDONTWRITEBYTECODE='1')
        self.bindings = ['INVENTORY_SHA256', 'RELEASE_CANDIDATE', 'IMAGE_CANDIDATE']
        fakebin = self.repo / 'bin'
        fakebin.mkdir()
        aws = fakebin / 'aws'
        aws.write_text('#!' + sys.executable + '''
import json, os, pathlib, sys
args = sys.argv[1:]
def value(flag): return args[args.index(flag) + 1] if flag in args else None
if (args[:2] != ['s3api', 'put-object'] or value('--bucket') != 'offline-audit'
    or value('--if-none-match') != '*' or value('--object-lock-mode') != 'COMPLIANCE'
    or value('--object-lock-legal-hold-status') != 'ON'
    or value('--checksum-algorithm') != 'SHA256' or not value('--object-lock-retain-until-date')):
    sys.exit('immutable audit request required')
key = value('--key')
prefix = 'audit/' + os.environ['GITHUB_RUN_ID'] + '/' + os.environ['GITHUB_RUN_ATTEMPT'] + '/'
if not key.startswith(prefix) or '..' in key.split('/'): sys.exit('invalid audit key')
path = pathlib.Path(os.environ['AWS_AUDIT_ROOT']) / key
path.parent.mkdir(parents=True, exist_ok=True)
try:
    with path.open('xb') as output: output.write(pathlib.Path(value('--body')).read_bytes())
except FileExistsError:
    sys.exit('412 PreconditionFailed: immutable audit object already exists')
print(json.dumps({'VersionId': 'fixture-version'}))
''')
        aws.chmod(0o755)
        nix = fakebin / 'nix'
        nix.write_text('''#!/bin/sh
[ "$1" = develop ] && [ "$2" = '.#release' ] && [ "$3" = -c ] || exit 94
shift 3
export RELEASE_SHELL_FIXTURE=1
exec "$@"
''')
        nix.chmod(0o755)
        python = fakebin / 'python3'
        python.write_text('''#!''' + sys.executable + '''
import io, json, os, runpy, sys, urllib.error, urllib.request
from pathlib import Path
if sys.argv[1] == 'packaging/ghcr-remote.py':
    class Response(io.BytesIO):
        status = 200
    class Opener:
        def open(self, request, timeout):
            if '/token?' in request.full_url:
                return Response(b'{"token":"test-only-fixture"}')
            with open(os.environ['TRANSPORT_CALLS'], 'a') as log:
                log.write('inspect\\n')
            if os.environ.get('REVOKE_AFTER_INSPECT') == '1':
                Path(os.environ['GATE_REVOKED_MARKER']).write_text('review revoked')
            remote = Path(os.environ['REMOTE'])
            if remote.exists():
                return Response(remote.read_bytes())
            status = int(os.environ.get('REMOTE_STATUS', '404'))
            error = os.environ.get('REMOTE_ERROR', 'missing')
            codes = {'missing': 'MANIFEST_UNKNOWN',
                     'name unknown: repository name not known to registry': 'NAME_UNKNOWN'}
            body = json.dumps({'errors': [{'code': codes.get(error, error)}]}).encode()
            raise urllib.error.HTTPError(request.full_url, status, 'fixture', {}, io.BytesIO(body))
    urllib.request.build_opener = lambda *args: Opener()
    sys.argv = sys.argv[1:]
    runpy.run_path(sys.argv[0], run_name='__main__')
else:
    os.execv(''' + repr(sys.executable) + ''', [''' + repr(sys.executable) + ''', *sys.argv[1:]])
''')
        python.chmod(0o755)
        gpg = fakebin / 'gpg'
        gpg.write_text('#!' + sys.executable + '''
import hashlib, os, pathlib, sys
if os.environ.get('RELEASE_SHELL_FIXTURE') != '1': sys.exit(93)
if '--verify' in sys.argv:
    raw = pathlib.Path(sys.argv[-1]).read_bytes()
    signature = pathlib.Path(sys.argv[-2]).read_text()
    if hashlib.sha256(raw).hexdigest() not in signature:
        print('[GNUPG:] BADSIG'); sys.exit(1)
    print('[GNUPG:] VALIDSIG ''' + approval.FINGERPRINT + ''' 0')
''')
        gpg.chmod(0o755)
        (self.repo / 'auth.json').write_text('{"auths":{"ghcr.io":{"auth":"dGVzdDpmaXh0dXJl"}}}')
        self.env['PATH'] = str(fakebin) + os.pathsep + os.environ['PATH']
        skopeo = fakebin / 'skopeo'
        skopeo.write_text('''#!/bin/sh
echo "$1" >> "$TRANSPORT_CALLS"
if [ "$1" = inspect ]; then
    if [ -f "$REMOTE" ]; then cat "$REMOTE"; exit 0; fi
    if [ "${REMOTE_ERROR:-missing}" = missing ]; then echo 'manifest unknown' >&2; else echo "$REMOTE_ERROR" >&2; fi
    exit 1
fi
if [ "$1" = copy ]; then cp "$CORRECT_REMOTE" "$REMOTE"; exit "${COPY_EXIT:-0}"; fi
exit 90
''')
        skopeo.chmod(0o755)
        correct = self.repo / 'correct-remote.json'
        correct.write_bytes((candidate / 'layout/blobs/sha256' / digest[7:]).read_bytes())
        self.env.update(TRANSPORT_CALLS=str(self.repo / 'transport.log'),
                        REMOTE=str(self.repo / 'remote.json'), CORRECT_REMOTE=str(correct))
        self.digest = digest

    def run_script(self, script='ghcr-gate.sh', *args):
        if script == 'ghcr-gate.sh':
            args = (*args, 'receipt-' + str(len(list(self.repo.glob('receipt-*')))) + '.json')
        return subprocess.run(['sh', 'packaging/' + script, *args], cwd=self.repo,
                               env=self.env, text=True, capture_output=True)

    def transport(self):
        p = self.repo / 'transport.log'
        return p.read_text().splitlines() if p.exists() else []

    def test_repeated_gates_retain_distinct_immutable_audit_objects(self):
        for _ in range(2):
            result = self.run_script('ghcr-gate.sh', 'preflight')
            self.assertEqual(result.returncode, 0, result.stderr)
        for _ in range(2):
            result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
            self.assertEqual(result.returncode, 0, result.stderr)
        objects = list((self.repo / 'audit-store/audit/456/1').glob('*.json'))
        self.assertEqual(len(objects), 5, 'every real audit call must retain a unique basename')
        # A different local directory cannot evade the remote basename collision.
        other = self.repo / 'other'; other.mkdir()
        receipt = other / objects[0].name; receipt.write_text('{}')
        result = self.audit(receipt)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('412', result.stderr)

    def audit(self, receipt):
        return subprocess.run([sys.executable, '-c',
            'import sys, subprocess; sys.path.insert(0,"packaging/release"); import retention\n'
            'try: retention.audit(sys.argv[1],"offline-audit",456,1)\n'
            'except subprocess.CalledProcessError as error:\n'
            ' sys.stderr.buffer.write(error.stderr); sys.exit(error.returncode)\n', str(receipt)],
            cwd=self.repo, env=self.env, text=True, capture_output=True)

    def test_matrix_gate_receipts_pass_real_immutable_audit(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-publish.yml').read_text())
        job = workflow['jobs']['ghcr-attest']; names = []
        for subject in job['strategy']['matrix']['subject']:
            directory = self.repo / ('job-' + subject); directory.mkdir()
            for step in job['steps']:
                if step.get('uses') == './.github/actions/release-gate':
                    name = step['with']['receipt'].replace('${{ matrix.subject }}', subject)
                elif step.get('run', '').startswith('sh packaging/ghcr-gate.sh '):
                    name = shlex.split(step['run'].splitlines()[0])[3].replace('$SUBJECT', subject)
                elif step.get('name', '').startswith('Preserve ') and 'bundle' in step['name']:
                    if subject == 'index' and step.get('if'):
                        continue
                    name = shlex.split(step['run'].splitlines()[-1])[-1].replace('$SUBJECT', subject)
                else:
                    continue
                receipt = directory / name; receipt.parent.mkdir(parents=True, exist_ok=True)
                receipt.write_text('{}')
                result = self.audit(receipt)
                self.assertEqual(result.returncode, 0, 'real audit refused ' + name + ': ' + result.stderr)
                names.append(name)
        self.assertEqual(len(names), 25)
        self.assertEqual(len(list((self.repo / 'audit-store/audit/456/1').glob('*.json'))), 25)

    def test_approved_binding_is_revalidated_and_local_bytes_checked(self):
        result = self.run_script('ghcr-gate.sh', 'preflight')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.repo / 'adapter.log').read_text().strip(),
                         'ghcr --candidate candidate --inventory-sha256 ' + self.inventory_digest + ' --phase preflight --receipt receipt-0.json')

    def test_each_missing_binding_refuses_before_adapter(self):
        for field in self.bindings:
            with self.subTest(field=field):
                value = self.env.pop(field)
                self.assertNotEqual(self.run_script('ghcr-gate.sh', 'preflight').returncode, 0)
                self.env[field] = value
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_disabled_channel_refuses(self):
        for variable in ['RELEASE_PUBLICATION_ENABLED', 'RELEASE_GHCR_ENABLED']:
            self.env[variable] = 'false'
            self.assertNotEqual(self.run_script('ghcr-gate.sh', 'preflight').returncode, 0)
            self.env[variable] = 'true'
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_empty_working_directory_refuses_before_gate(self):
        self.env['IMAGE_CANDIDATE'] = ''
        result = self.run_script('ghcr-gate.sh', 'preflight')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_missing_shared_gate_refuses_before_registry_access(self):
        self.adapter.unlink()
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('shared release gate', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_missing_signature_refuses_before_registry_access(self):
        Path(self.env['GITHUB_EVENT_PATH']).write_text('{"inputs":{}}')
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('signature input missing', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_wrong_inventory_refuses_before_registry_access(self):
        self.env['INVENTORY_SHA256'] = 'f' * 64
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('inventory digest mismatch', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_wrong_layout_argument_refuses_before_registry_access(self):
        shutil.copytree(self.work / 'layout', self.repo / 'other-layout')
        result = self.run_script('ghcr-publish.sh', 'other-layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('layout argument', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_r1_rejection_prevents_registry_access(self):
        self.env['GATE_EXIT'] = '19'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 19)
        self.assertEqual(self.transport(), [])

    def test_approval_revoked_after_inspection_refuses_before_copy(self):
        self.env['REVOKE_AFTER_INSPECT'] = '1'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertEqual(result.returncode, 19)
        self.assertEqual(self.transport(), ['inspect'])

    def test_actual_payload_change_after_approval_refuses(self):
        candidate = self.repo / 'image-candidate'
        self.root = self.repo / 'changed'
        self.root.mkdir()
        self.binary = b'changed after approval'
        inputs = fixtures.Index.pair(self)
        digest = image.merge(candidate / 'changed-layout', inputs)
        (candidate / 'layout').rename(candidate / 'old-layout')
        (candidate / 'changed-layout').rename(candidate / 'layout')
        (candidate / 'index-digest.txt').write_text(digest)
        self.root = self.repo
        result = self.run_script('ghcr-gate.sh', 'boundary')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('working OCI', result.stderr)

    def test_valid_but_unapproved_publish_arguments_refuse(self):
        for version, digest in [('0.2.0', self.digest), ('0.1.0', 'sha256:' + 'f' * 64)]:
            with self.subTest(version=version, digest=digest):
                result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', version, digest)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.transport(), [])
                self.assertIn('arguments differ', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_single_platform_signed_inventory_refuses(self):
        raw = json.loads((self.candidate / 'release-inventory.json').read_bytes())
        raw['targets'] = ['aarch64-unknown-linux-musl']
        data = gate.canonical(raw)
        (self.candidate / 'release-inventory.json').write_bytes(data)
        self.env['INVENTORY_SHA256'] = gate.digest(data)
        signature = self.signature.replace(self.inventory_digest, gate.digest(data))
        Path(self.env['GITHUB_EVENT_PATH']).write_text(json.dumps({'inputs': {'maintainer_signature': signature}}))
        result = self.run_script('ghcr-gate.sh', 'boundary')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('both Linux targets', result.stderr)

    def test_invalid_boundary_refuses(self):
        self.assertNotEqual(self.run_script('ghcr-gate.sh', 'other').returncode, 0)
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_invalid_expected_digest_refuses(self):
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', 'bad-digest')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.transport(), [])

    def test_index_digest_sidecar_mismatch_refuses(self):
        (self.repo / 'image-candidate/index-digest.txt').write_text('sha256:' + 'f' * 64)
        self.assertIn('metadata changed', self.run_script('ghcr-gate.sh', 'boundary').stderr)

    def test_missing_retained_candidate_refuses(self):
        (self.candidate / 'ghcr-oci-layout.tar').unlink()
        self.assertNotEqual(self.run_script('ghcr-gate.sh', 'boundary').returncode, 0)

    def test_remote_matching_bytes_skip_write(self):
        shutil.copyfile(self.env['CORRECT_REMOTE'], self.env['REMOTE'])
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.transport(), ['inspect'])

    def test_remote_mismatched_bytes_refuse_write(self):
        Path(self.env['REMOTE']).write_text('other bytes')
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('digest mismatch', result.stderr)
        self.assertEqual(self.transport(), ['inspect'])

    def test_remote_unauthorized_or_ambiguous_refuses_write(self):
        self.env['REMOTE_ERROR'] = 'unexpected registry failure'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('cannot be reconciled', result.stderr)
        self.assertEqual(self.transport(), ['inspect'])

    def test_remote_auth_error_with_missing_manifest_text_refuses(self):
        for error in ['unauthorized: manifest unknown', 'status code: 500: manifest unknown',
                      'connection reset: name unknown']:
            with self.subTest(error=error):
                self.env['REMOTE_ERROR'] = error
                Path(self.env['REMOTE']).unlink(missing_ok=True)
                Path(self.env['TRANSPORT_CALLS']).unlink(missing_ok=True)
                result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.transport(), ['inspect'])

    def test_http_auth_failure_with_manifest_unknown_refuses_write(self):
        # Skopeo flattens these real 401/403 responses to "manifest unknown".
        # Its identical text is insufficient proof of absence.
        for status in ['401', '403']:
            with self.subTest(status=status):
                self.env['REMOTE_STATUS'] = status
                Path(self.env['REMOTE']).unlink(missing_ok=True)
                Path(self.env['TRANSPORT_CALLS']).unlink(missing_ok=True)
                result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertEqual(self.transport(), ['inspect'])

    def test_remote_timeout_refuses_write(self):
        self.env['REMOTE_ERROR'] = 'timeout'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.transport(), ['inspect'])

    def test_explicit_missing_namespace_can_be_created_after_approval(self):
        self.env['REMOTE_ERROR'] = 'name unknown: repository name not known to registry'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.transport(), ['inspect', 'copy', 'inspect'])

    def test_missing_upload_is_revalidated_then_digest_checked(self):
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.transport(), ['inspect', 'copy', 'inspect'])
        self.assertEqual(len((self.repo / 'adapter.log').read_text().splitlines()), 2)

    def test_ambiguous_upload_stops_and_retry_reconciles(self):
        self.env['COPY_EXIT'] = '5'
        args = ('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(self.run_script(*args).returncode, 5)
        self.assertEqual(self.transport(), ['inspect', 'copy'])
        self.env['GITHUB_RUN_ATTEMPT'] = '2'
        self.assertEqual(self.run_script(*args).returncode, 0)
        self.assertEqual(self.transport(), ['inspect', 'copy', 'inspect'])

    def test_moving_or_injected_version_refuses(self):
        for version in ['latest', '0.1', '../image', '0.1.0;echo bad', '-x']:
            with self.subTest(version=version):
                self.assertNotEqual(self.run_script('ghcr-publish.sh', 'image-candidate/layout', version, self.digest).returncode, 0)
        self.assertEqual(self.transport(), [])


class SigningInputs(CandidateFixtures, unittest.TestCase):
    def test_all_three_subjects_are_retained_digests(self):
        inputs = fixtures.Index.pair(self)
        layout = self.root / 'joined'
        digest = image.merge(layout, inputs)
        for subject in ['amd64', 'arm64', 'index']:
            result = subprocess.run([sys.executable, str(PACKAGING / 'image-signing-inputs.py'),
                str(layout), subject, str(self.root / ('sign-' + subject))],
                capture_output=True, text=True, env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1'))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(result.stdout.startswith('digest=sha256:'))
            if subject == 'index':
                self.assertEqual(result.stdout.strip(), 'digest=' + digest)
            else:
                output = self.root / ('sign-' + subject)
                self.assertEqual(json.loads((output / 'image.spdx.json').read_text())['packages'][0]['name'], 'base')
                self.assertEqual(len(json.loads((output / 'binary.spdx.json').read_text())['packages']), 2)

if __name__ == '__main__':
    unittest.main()
