"""Actual pinned-gh crypto contract; substituted certificates test structure only."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import contract
import gate
import verifier_process

FIXTURES = Path(__file__).with_name('fixtures') / 'attestation'
SOURCE = '26d16513386ffaa790b1c32f927544f1322e4194'
UPSTREAM = 'https://github.com/sigstore/sigstore-js'
URI = UPSTREAM + '/actions/runs/6014488666/attempts/1'
HASHES = {'sigstore-js-2.1.0.tgz': 'f0c641fce0310cb43208f4272dc1423153630e44ba8cdc0b5ce8466f724e0eed',
          'sigstore-js-2.1.0-bundle.json': 'cfadddd579b9fb45947530cd0e860986ec610a28f7fa6de3ef31cc051f07f761',
          'trusted_root.json': '455b3fe53e2678889f093d66ebbfda5f12ebb9d682b146c3535fa04e97689787'}


class PinnedCLI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='release-cli-')
        cls.addClassCleanup(cls.tmp.cleanup)
        isolated = verifier_process.environment()
        cls.env = isolated.__enter__()
        cls.addClassCleanup(isolated.__exit__, None, None, None)
        cls.env.update(HTTPS_PROXY='http://127.0.0.1:9', HTTP_PROXY='http://127.0.0.1:9',
                       ALL_PROXY='http://127.0.0.1:9', NO_PROXY='')
        for name, digest in HASHES.items():
            if hashlib.sha256((FIXTURES / name).read_bytes()).hexdigest() != digest:
                raise AssertionError('authentic fixture bytes changed: ' + name)
        version = subprocess.check_output(['gh', '--version'], env=cls.env, text=True)
        if not version.startswith('gh version 2.101.0 '):
            raise AssertionError('CLI contract requires pinned gh 2.101.0; requalify before updating this pin: ' + version)
        cls.command = ['gh', 'attestation', 'verify', str(FIXTURES / 'sigstore-js-2.1.0.tgz'),
                       '--repo', 'sigstore/sigstore-js', '--digest-alg', 'sha512',
                       '--bundle', str(FIXTURES / 'sigstore-js-2.1.0-bundle.json'),
                       '--custom-trusted-root', str(FIXTURES / 'trusted_root.json'),
                       '--cert-identity', UPSTREAM + '/.github/workflows/release.yml@refs/heads/main',
                       '--source-ref', 'refs/heads/main', '--source-digest', SOURCE, '--signer-digest', SOURCE,
                       '--cert-oidc-issuer', 'https://token.actions.githubusercontent.com',
                       '--deny-self-hosted-runners', '--format', 'json']
        result = subprocess.run(cls.command, env=cls.env, capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise AssertionError('authentic offline crypto verification failed: ' + result.stderr)
        cls.verified = json.loads(result.stdout)

    def test_authentic_crypto_success_and_exact_flattened_certificate_shape(self):
        certificate = self.verified[0]['verificationResult']['signature']['certificate']
        self.assertNotIn('extensions', certificate, 'pinned CLI schema changed; do not add a fallback')
        self.assertEqual(certificate['runInvocationURI'], URI)
        for wrong in [URI.replace('/6014488666/', '/6014488667/'), URI.replace('/attempts/1', '/attempts/2')]:
            self.assertNotEqual(certificate['runInvocationURI'], wrong)

    def test_altered_payload_fails_real_cryptographic_verification(self):
        altered = Path(self.tmp.name) / 'altered.tgz'
        altered.write_bytes((FIXTURES / 'sigstore-js-2.1.0.tgz').read_bytes() + b'changed')
        command = list(self.command); command[3] = str(altered)
        result = subprocess.run(command, env=self.env, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)

    def test_production_hennery_cli_policy_rejects_authentic_upstream_identity(self):
        command = contract.attestation_command(FIXTURES / 'sigstore-js-2.1.0.tgz', 'v0.1.0', SOURCE,
                                               FIXTURES / 'sigstore-js-2.1.0-bundle.json', FIXTURES / 'trusted_root.json')
        command += ['--digest-alg', 'sha512']
        result = subprocess.run(command, env=self.env, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)

    def test_structural_hennery_identity_and_run_policy_using_real_json_shape(self):
        # Substitution is structural policy coverage, NOT a Hennery crypto proof.
        rows = copy.deepcopy(self.verified)
        cert = rows[0]['verificationResult']['signature']['certificate']
        cert.update(sourceRepositoryURI='https://github.com/marcinwadon/hennery',
                    buildSignerURI='https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v0.1.0',
                    sourceRepositoryRef='refs/tags/v0.1.0',
                    runInvocationURI='https://github.com/marcinwadon/hennery/actions/runs/42/attempts/1')
        contract.require_identity(rows, 'v0.1.0', SOURCE)
        try:
            contract.require_run(rows, 42, 1)
        except gate.Refused as error:
            self.fail('real pinned CLI certificate shape was refused: ' + str(error))
        for key, value in [('sourceRepositoryURI', UPSTREAM), ('buildSignerURI', cert['buildSignerURI'].replace('release.yml','other.yml')),
                           ('sourceRepositoryRef','refs/heads/main'), ('buildSignerURI',cert['buildSignerURI'].replace('refs/tags/v0.1.0','refs/heads/main')),
                           ('sourceRepositoryDigest','b'*40), ('buildSignerDigest','b'*40)]:
            bad=copy.deepcopy(rows);bad[0]['verificationResult']['signature']['certificate'][key]=value
            with self.subTest(key=key), self.assertRaises(gate.Refused):contract.require_identity(bad,'v0.1.0',SOURCE)
        for run, attempt in [(43,1),(42,2)]:
            with self.subTest(run=run,attempt=attempt),self.assertRaises(gate.Refused):contract.require_run(rows,run,attempt)
        nested=copy.deepcopy(rows);certificate=nested[0]['verificationResult']['signature']['certificate']
        certificate['extensions']={'runInvocationURI':certificate.pop('runInvocationURI')}
        with self.assertRaises(gate.Refused):contract.require_run(nested,42,1)
