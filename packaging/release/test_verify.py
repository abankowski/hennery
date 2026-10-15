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

class SignerIdentity(unittest.TestCase):
    def test_branch_and_other_tag_signatures_are_rejected_for_files_and_images(self):
        fixture = test_gate.Gates(); fixture.setUp(); self.addCleanup(fixture.tmp.cleanup)
        (fixture.root / 'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        expected = 'https://github.com/' + gate.REPOSITORY + '/.github/workflows/release-publish.yml@refs/tags/' + fixture.inventory['tag']
        for actual in [expected.replace('@refs/tags/', '@refs/heads/'), expected.replace('@refs/tags/' + fixture.inventory['tag'], '@refs/heads/main'), expected.replace(fixture.inventory['tag'], 'v9.9.9')]:
            def crypto(command, **kwargs):
                identity = command[command.index('--cert-identity') + 1] if '--cert-identity' in command else None
                if identity is not None and identity != actual:
                    raise subprocess.CalledProcessError(1, command)
            with self.subTest(identity=actual), patch.object(verify.subprocess, 'run', side_effect=crypto), patch.object(verify.supply, 'verify_checksums'), patch.object(verify.supply, 'verify_binary_inventory'):
                with self.assertRaises(subprocess.CalledProcessError):
                    verify.verify(fixture.root, Path('bundle'), fixture.inventory['source_sha'], fixture.inventory['tag'])

    def test_exact_tag_identity_is_required_for_oci_too(self):
        command = verify.attestation_command('oci://ghcr.io/marcinwadon/hennery@sha256:' + 'a' * 64, 'v0.1.0', None)
        self.assertEqual(command[command.index('--cert-identity') + 1], 'https://github.com/' + gate.REPOSITORY + '/.github/workflows/release-publish.yml@refs/tags/v0.1.0')
        self.assertEqual(command[command.index('--source-ref') + 1], 'refs/tags/v0.1.0')
        self.assertNotIn('refs/heads/main', command)

    def test_oci_refuses_branch_signature_and_mutable_image_reference(self):
        expected = 'https://github.com/' + gate.REPOSITORY + '/.github/workflows/release-publish.yml@refs/tags/v0.1.0'
        def crypto(command, **kwargs):
            if '--cert-identity' in command and command[command.index('--cert-identity') + 1] == expected:
                raise subprocess.CalledProcessError(1, command)
        with patch.object(verify.subprocess, 'run', side_effect=crypto), self.assertRaises(subprocess.CalledProcessError):
            verify.verify_image('ghcr.io/marcinwadon/hennery@sha256:' + 'a' * 64, 'v0.1.0')
        with patch.object(verify.subprocess, 'run'), self.assertRaisesRegex(gate.Refused, 'immutable image'):
            verify.verify_image('ghcr.io/marcinwadon/hennery:latest', 'v0.1.0')
