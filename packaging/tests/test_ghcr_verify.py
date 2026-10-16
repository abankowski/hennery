"""All crypto/registry transports are doubled; production verifiers are executed."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
from test_ghcr_candidate import ReleaseFixture, approval, gate, release_verify, PACKAGING

spec = importlib.util.spec_from_file_location('ghcr_verify', PACKAGING / 'ghcr-verify.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class Bundles(ReleaseFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        producer = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            self.index = producer.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
        self.signatures = self.root / 'signatures'; self.signatures.mkdir()
        (self.signatures / 'release-inventory.json.asc').write_text(self.signature)
        (self.signatures / 'release.sigstore.jsonl').write_text('{}')
        self.bundles = self.root / 'bundles'; self.bundles.mkdir()
        for *_, bundle in helper.subjects(self.work, self.bundles): bundle.write_text('{}')
        self.calls = []
        environment = patch.dict(os.environ, {'REGISTRY_AUTH_FILE': str(self.root / 'registry-auth.json')})
        environment.start(); self.addCleanup(environment.stop)

    def transport(self, command, **kwargs):
        self.calls.append(command)
        return self.crypto(command, **kwargs)

    def test_all_final_artifacts_and_seven_exact_local_oci_subjects_verify(self):
        with patch.object(helper.subprocess, 'run', side_effect=self.transport):
            helper.check(self.candidate, self.work, self.signatures, self.bundles)
        gh = [c for c in self.calls if c[0] == 'gh']
        self.assertEqual(len(gh), len(self.inventory['artifacts']) + 1 + 7)
        self.assertTrue(all('--bundle' in c for c in gh))
        self.assertTrue(all(not str(c[3]).startswith('oci://') for c in gh))
        expected = {self.index['digest'], *self.index['platforms'].values()}
        self.assertEqual({'sha256:' + Path(c[3]).name for c in gh[-7:]}, expected)

    def test_failing_candidate_or_any_oci_verifier_prevents_every_upload(self):
        for failing_call in [1, len(self.inventory['artifacts']) + 2, len(self.inventory['artifacts']) + 8]:
            self.calls = []; count = 0
            def fail(command, **kwargs):
                nonlocal count
                if command[0] == 'gh':
                    count += 1
                    if count == failing_call: raise subprocess.CalledProcessError(97, command)
                return self.transport(command, **kwargs)
            with self.subTest(call=failing_call), patch.object(helper.subprocess, 'run', side_effect=fail):
                with self.assertRaises(subprocess.CalledProcessError):
                    helper.publish(self.candidate, self.work, self.signatures, self.bundles)
            self.assertFalse(any(c[0] in ('oras', 'sh') for c in self.calls))

    def test_verifier_failure_after_gate_prevents_bundle_upload(self):
        gated = False
        def transport(command, **kwargs):
            nonlocal gated
            if command[0] == 'sh': gated = True
            if gated and command[0] == 'gh': raise subprocess.CalledProcessError(97, command)
            return self.transport(command, **kwargs)
        with patch.object(helper.subprocess, 'run', side_effect=transport), self.assertRaises(subprocess.CalledProcessError):
            helper.publish(self.candidate, self.work, self.signatures, self.bundles)
        self.assertTrue(gated)
        self.assertFalse(any(c[0] == 'oras' for c in self.calls))

    def test_uploads_exact_seven_preverified_bundles_then_verifies_remote_images(self):
        with patch.object(helper.subprocess, 'run', side_effect=self.transport):
            helper.publish(self.candidate, self.work, self.signatures, self.bundles)
        uploads = [c for c in self.calls if c[0] == 'oras']
        self.assertEqual(len(uploads), 7)
        self.assertTrue(all(c[:2] == ['oras', 'attach'] and '@sha256:' in c[-2] for c in uploads))
        self.assertEqual({c[-1] for c in uploads}, {str(b) + ':' + helper.BUNDLE_TYPE for *_, b in helper.subjects(self.work, self.bundles)})
        last_upload = max(i for i, c in enumerate(self.calls) if c[0] == 'oras')
        self.assertEqual(len([c for c in self.calls[last_upload + 1:] if c[0] == 'gh' and str(c[3]).startswith('oci://')]), 7)

    def test_local_manifest_must_hash_to_the_exact_signed_image(self):
        digest = self.index['digest']; manifest = self.work / 'layout/blobs/sha256' / digest[7:]
        original = manifest.read_bytes()
        for data in [b'{}', original + b' ']:
            manifest.write_bytes(data); self.calls = []
            with patch.object(helper.subprocess, 'run', side_effect=self.transport), self.assertRaisesRegex(gate.Refused, 'local manifest'):
                helper.check(self.candidate, self.work, self.signatures, self.bundles)
            self.assertFalse(any(c[0] == 'gh' and c[3] == str(manifest) for c in self.calls))

    def test_missing_oci_bundle_refuses_before_any_bundle_upload(self):
        next(helper.subjects(self.work, self.bundles))[-1].unlink()
        with patch.object(helper.subprocess, 'run', side_effect=self.transport), self.assertRaisesRegex(gate.Refused, 'verification bundle'):
            helper.publish(self.candidate, self.work, self.signatures, self.bundles)
        self.assertFalse(any(c[0] == 'oras' for c in self.calls))

    def test_working_metadata_cannot_omit_signed_platform_verification(self):
        metadata = self.work / 'verified.json'
        changed = json.loads(metadata.read_bytes()); changed['platforms'] = {}
        metadata.write_text(json.dumps(changed))
        with patch.object(helper.subprocess, 'run', side_effect=self.transport), self.assertRaisesRegex(gate.Refused, 'signed descriptor'):
            helper.check(self.candidate, self.work, self.signatures, self.bundles)
