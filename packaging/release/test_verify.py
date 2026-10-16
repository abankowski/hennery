"""Consumer lifecycle and structural identity tests; real crypto is in test_verify_cli."""
import copy
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import contract
import gate
import tag_signature
import verify


class Verification(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(); self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / 'installer.sh').write_bytes(b'fixture installer')
        self.metadata = {'schema': 2, 'repository': gate.REPOSITORY, 'source_sha': 'a' * 40,
                         'tag': 'v0.1.0', 'tag_object': 'b' * 40, 'channels': ['github'],
                         'targets': sorted(gate.TARGETS), 'attesting': {'run_id': 42, 'run_attempt': 1}}
        contract.freeze(self.root, self.metadata)
        self.certificate = {'runInvocationURI': 'https://github.com/' + gate.REPOSITORY + '/actions/runs/42/attempts/1',
                            'sourceRepositoryURI': 'https://github.com/' + gate.REPOSITORY,
                            'buildSignerURI': 'https://github.com/' + gate.REPOSITORY + '/' + contract.WORKFLOW + '@refs/tags/v0.1.0',
                            'sourceRepositoryRef': 'refs/tags/v0.1.0', 'sourceRepositoryDigest': 'a' * 40,
                            'buildSignerDigest': 'a' * 40, 'runnerEnvironment': 'github-hosted',
                            'issuer': 'https://token.actions.githubusercontent.com'}
        self.calls = []

    def crypto(self, command, **kwargs):
        self.calls.append(command)
        return subprocess.CompletedProcess(command, 0, gate.canonical([{
            'verificationResult': {'signature': {'certificate': self.certificate}}}]).decode(), '')

    def run_verify(self, **kwargs):
        return verify.verify(self.root, Path('bundle'), 'a' * 40, 'v0.1.0', **kwargs)

    def test_signed_tag_precedes_checksum_and_all_payload_verification(self):
        with patch('tag_signature.verify') as tag, patch.object(verify.subprocess, 'run', side_effect=self.crypto), patch.object(verify.supply, 'verify_binary_inventory') as binaries:
            actual = self.run_verify(run_id=42, attesting_attempt=1)
        tag.assert_called_once_with('v0.1.0', 'a' * 40, 'b' * 40)
        binaries.assert_called_once_with(actual, self.root)
        self.assertEqual([Path(c[3]).name for c in self.calls], ['SHA256SUMS', 'installer.sh', 'release-metadata.json'])
        for command in self.calls:
            self.assertNotIn('--signer-workflow', command)
            self.assertEqual(command[command.index('--cert-identity') + 1], self.certificate['buildSignerURI'])
            self.assertEqual(command[command.index('--source-digest') + 1], 'a' * 40)
            self.assertEqual(command[command.index('--signer-digest') + 1], 'a' * 40)

    def test_tag_or_crypto_authentication_failure_stops_before_installer(self):
        with patch('tag_signature.verify', side_effect=gate.Refused('invalid tag')), patch.object(verify.subprocess, 'run') as crypto:
            with self.assertRaisesRegex(gate.Refused, 'invalid tag'): self.run_verify()
            crypto.assert_not_called()
        with patch('tag_signature.verify'), patch.object(verify.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'gh')):
            with self.assertRaises(subprocess.CalledProcessError): self.run_verify()

    def test_source_tag_and_original_run_bindings_cannot_change(self):
        for source, tag, run, attempt in [('c' * 40, 'v0.1.0',42,1), ('a' * 40,'v0.2.0',42,1), ('a' * 40,'v0.1.0',43,1), ('a' * 40,'v0.1.0',42,2)]:
            with self.subTest(source=source, tag=tag, run=run, attempt=attempt), patch.object(verify.subprocess, 'run') as crypto, self.assertRaises(gate.Refused):
                verify.verify(self.root, Path('bundle'), source, tag, run_id=run, attesting_attempt=attempt)
            crypto.assert_not_called()

    def test_structural_branch_other_tag_workflow_or_run_certificate_refuses(self):
        original = dict(self.certificate)
        for field, value in [('buildSignerURI', original['buildSignerURI'].replace('@refs/tags/v0.1.0', '@refs/heads/main')),
                             ('buildSignerURI', original['buildSignerURI'].replace('release.yml', 'other.yml')),
                             ('sourceRepositoryRef', 'refs/tags/v9.9.9'), ('buildSignerDigest', 'b' * 40),
                             ('runInvocationURI', original['runInvocationURI'].replace('/42/', '/43/')),
                             ('runInvocationURI', original['runInvocationURI'].replace('/1', '/2'))]:
            self.certificate = original | {field: value}
            with self.subTest(field=field, value=value), patch('tag_signature.verify'), patch.object(verify.subprocess, 'run', side_effect=self.crypto), self.assertRaises(gate.Refused): self.run_verify()

    def test_byte_change_during_binary_check_refuses(self):
        def mutate(value, root):
            (root / 'installer.sh').write_bytes(b'changed after attestation')
        with patch('tag_signature.verify'), patch.object(verify.subprocess, 'run', side_effect=self.crypto), patch.object(verify.supply, 'verify_binary_inventory', side_effect=mutate), self.assertRaises(gate.Refused): self.run_verify()

    def test_cli_parser_requires_release_source_tag_and_original_attempt_options(self):
        args = verify.arguments(['--release-directory', str(self.root), '--bundle', 'bundle', '--source-sha', 'a' * 40,
                                 '--tag', 'v0.1.0', '--run-id', '42', '--attesting-attempt', '1'])
        self.assertEqual((args.run_id, args.attesting_attempt), (42, 1))


class BinstallMetadata(unittest.TestCase):
    def test_metadata_cannot_advertise_an_unverified_or_branch_signed_path(self):
        good = {'binstall': {'disabled-strategies': ['crate-meta-data','quick-install','compile']},
                'hennery-release': {'verification': 'external-signed-tag-sigstore',
                 'maintainer-fingerprint': tag_signature.FINGERPRINT,
                 'signer-identity': 'https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v0.1.0'}}
        verify.require_binstall_metadata(good, 'v0.1.0')
        for kind in ('native','branch','wrong-tag','wrong-maintainer','no-verifier'):
            bad = copy.deepcopy(good)
            if kind == 'native': bad['binstall']['disabled-strategies'].remove('crate-meta-data')
            elif kind == 'branch': bad['hennery-release']['signer-identity'] = bad['hennery-release']['signer-identity'].replace('@refs/tags/v0.1.0','@refs/heads/main')
            elif kind == 'wrong-tag': bad['hennery-release']['signer-identity'] += '-other'
            elif kind == 'wrong-maintainer': bad['hennery-release']['maintainer-fingerprint'] = '0' * 40
            else: bad['hennery-release']['verification'] = 'checksum-only'
            with self.subTest(kind=kind), self.assertRaises(gate.Refused): verify.require_binstall_metadata(bad,'v0.1.0')


if __name__ == '__main__': unittest.main()
