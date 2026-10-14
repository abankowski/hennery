"""R1/R4 integration; public-key and platform transports are doubled offline."""
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import unittest
from unittest.mock import patch

import yaml
from test_image import CandidateFixtures, image

PACKAGING = Path(__file__).parents[1]
sys.path.insert(0, str(PACKAGING / 'release'))
import approval
import gate
import supply
import verify as release_verify

TARGETS = {'amd64': 'x86_64-unknown-linux-musl', 'arm64': 'aarch64-unknown-linux-musl'}


def load_helper(test):
    path = PACKAGING / 'ghcr-candidate.py'
    test.assertTrue(path.is_file(), 'R4 must materialize the complete signed R1 candidate')
    spec = importlib.util.spec_from_file_location('ghcr_candidate', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ReleaseFixture(CandidateFixtures):
    def setUp(self):
        super().setUp()
        self.version = '0.1.0'
        self.candidate = self.root / 'candidate'
        self.candidate.mkdir()
        self.work = self.root / 'image-candidate'
        self.natives = []
        base = self.root
        for arch, target in TARGETS.items():
            self.root = base / arch
            (self.root / 'blobs/sha256').mkdir(parents=True)
            self.fixture(arch=arch, labels={'org.opencontainers.image.version': self.version})
            self.natives.append(self.root)
            archive = self.candidate / ('hennery-' + target + '.tar.xz')
            prefix = 'hennery-' + target
            with tarfile.open(archive, 'w:xz') as output:
                directory = tarfile.TarInfo(prefix); directory.type = tarfile.DIRTYPE
                output.addfile(directory)
                for name, data in [('hennery', self.binary), ('LICENSE', b'licence'),
                                   ('README.md', b'readme'), ('THIRD-PARTY-NOTICES.txt', b'notices')]:
                    member = tarfile.TarInfo(prefix + '/' + name); member.size = len(data)
                    output.addfile(member, io.BytesIO(data))
            archive.with_suffix(archive.suffix + '.sha256').write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
        self.root = base

    def freeze(self):
        self.inventory = {
            'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': self.revision,
            'tag': 'v' + self.version, 'channels': ['ghcr', 'github'],
            'targets': sorted(TARGETS.values()), 'candidate': {'run_id': 10, 'run_attempt': 1},
            'binaries': supply.binary_inventory(self.candidate, sorted(TARGETS.values())),
            'artifacts': [{'name': p.name, 'size': p.stat().st_size, 'sha256': gate.digest(p.read_bytes())}
                          for p in sorted(self.candidate.iterdir()) if p.name != 'release-inventory.json'],
        }
        self.raw = gate.canonical(self.inventory)
        (self.candidate / 'release-inventory.json').write_bytes(self.raw)
        self.inventory_digest = gate.digest(self.raw)
        self.signature = '-----BEGIN PGP SIGNATURE-----\n' + self.inventory_digest + '\n-----END PGP SIGNATURE-----\n'
        self.inputs = {'maintainer_signature': self.signature}

    def crypto(self, command, **kwargs):
        if '--verify' in command:
            raw, signature = Path(command[-1]).read_bytes(), Path(command[-2]).read_text()
            valid = gate.digest(raw) in signature
            return subprocess.CompletedProcess(command, 0 if valid else 1,
                '[GNUPG:] VALIDSIG ' + approval.FINGERPRINT + ' 0\n' if valid else '[GNUPG:] BADSIG\n', '')
        return subprocess.CompletedProcess(command, 0, '', '')

    def assembled(self):
        helper = load_helper(self)
        helper.assemble(self.candidate, self.root / 'assembled', self.natives, self.revision, self.version)
        self.freeze()
        return helper


class Candidate(ReleaseFixture, unittest.TestCase):
    def test_native_output_freezes_index_platforms_and_binary_identity(self):
        helper = self.assembled()
        descriptor = json.loads((self.candidate / 'ghcr-index.json').read_bytes())
        self.assertEqual(set(descriptor['platforms']), {'amd64', 'arm64'})
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            verified = helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
        self.assertEqual(verified['digest'], descriptor['digest'])
        self.assertEqual(verified['source_sha'], self.revision)
        self.assertEqual(verified['version'], self.version)
        self.assertEqual((self.work / 'release-inventory.json.asc').read_text(), self.signature)
        for arch, target in TARGETS.items():
            self.assertEqual(verified['platforms'][arch], image.verify(self.work / 'layout',
                {a: self.inventory['binaries'][t]['sha256'] for a, t in TARGETS.items()},
                self.revision, self.version)['platforms'][arch]['digest'])

    def test_missing_or_wrong_inventory_signature_refuses(self):
        helper = self.assembled()
        for inputs in [{}, {'maintainer_signature': 'malformed'},
                       {'maintainer_signature': self.signature.replace(self.inventory_digest, 'b' * 64)}]:
            with self.subTest(inputs=inputs), patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaises(gate.Refused):
                helper.qualify(self.candidate, self.inventory_digest, self.work, inputs)
        self.assertFalse(self.work.exists())

    def test_wrong_global_inventory_digest_refuses(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'inventory digest'):
            helper.qualify(self.candidate, 'f' * 64, self.work, self.inputs)

    def test_invalid_nonempty_inventory_signature_refuses(self):
        helper = self.assembled()
        inputs = {'maintainer_signature': self.signature.replace(self.inventory_digest, 'f' * 64)}
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaises(gate.Refused):
            helper.qualify(self.candidate, self.inventory_digest, self.work, inputs)
        self.assertFalse(self.work.exists())

    def test_modified_hashed_channel_payload_refuses(self):
        helper = self.assembled()
        path = self.candidate / 'ghcr-index.json'
        path.write_bytes(path.read_bytes().replace(b'0.1.0', b'0.2.0'))
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'candidate digest'):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_mutated_working_layout_is_not_replaced_or_published(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            path = self.work / 'layout/oci-layout'; path.write_text('{}')
            with self.assertRaisesRegex(gate.Refused, 'working OCI'):
                helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            self.assertEqual(path.read_text(), '{}')

    def test_working_directory_must_be_outside_immutable_candidate(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'outside'):
            helper.qualify(self.candidate, self.inventory_digest, self.candidate / 'work', self.inputs)

    def test_signed_descriptor_must_match_actual_oci_digests(self):
        helper = self.assembled()
        path = self.candidate / 'ghcr-index.json'
        descriptor = json.loads(path.read_bytes()); descriptor['platforms']['amd64'] = 'sha256:' + 'f' * 64
        path.write_bytes(gate.canonical(descriptor))
        (self.candidate / 'release-inventory.json').unlink(); self.freeze()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'descriptor'):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_existing_assembly_output_refuses_without_overwriting(self):
        helper = load_helper(self); work = self.root / 'existing'; work.mkdir()
        with self.assertRaisesRegex(gate.Refused, 'already exists'):
            helper.assemble(self.candidate, work, self.natives, self.revision, self.version)
        self.assertFalse((self.candidate / 'ghcr-index.json').exists())

    def test_descriptor_needs_one_retained_root_index(self):
        helper = load_helper(self); layout = self.root / 'flat'
        digest = image.merge(layout, self.natives)
        joined = json.loads((layout / 'blobs/sha256' / digest[7:]).read_bytes())
        (layout / 'index.json').write_text(json.dumps({'schemaVersion': 2, 'manifests': joined['manifests']}))
        with self.assertRaisesRegex(gate.Refused, 'one OCI index'):
            helper.descriptor(layout, dict.fromkeys(TARGETS, self.expected), self.revision, self.version)

    def archive(self, entries):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode='w') as archive:
            for name, kind, data in entries:
                member = tarfile.TarInfo(name); member.type = kind
                if kind == tarfile.REGTYPE:
                    member.size = len(data); archive.addfile(member, io.BytesIO(data))
                else:
                    member.linkname = data; archive.addfile(member)
        return output.getvalue()

    def test_ambiguous_oci_archive_paths_refuse(self):
        helper = load_helper(self)
        for name in ['../escape', './index.json', '/index.json', 'blobs//sha256/' + 'a' * 64, 'blobs/sha256/../escape']:
            with self.subTest(name=name), self.assertRaisesRegex(gate.Refused, 'archive path'):
                helper.tar_files(self.archive([(name, tarfile.REGTYPE, b'{}')]))

    def test_oci_archive_links_refuse_before_extraction(self):
        helper = load_helper(self)
        for kind in [tarfile.LNKTYPE, tarfile.SYMTYPE]:
            raw = self.archive([('index.json', tarfile.REGTYPE, b'{}'),
                ('blobs/sha256/' + 'a' * 64, kind, 'index.json')])
            with self.subTest(kind=kind), self.assertRaisesRegex(gate.Refused, 'nonregular'):
                helper.tar_files(raw)

    def test_duplicate_oci_archive_members_refuse(self):
        helper = load_helper(self)
        raw = self.archive([('index.json', tarfile.REGTYPE, b'{}'), ('index.json', tarfile.REGTYPE, b'{}')])
        with self.assertRaisesRegex(gate.Refused, 'duplicate'):
            helper.tar_files(raw)

    def test_retained_payload_changed_after_file_verification_refuses(self):
        helper = self.assembled(); original = gate.verify_files
        def race(inventory, root):
            original(inventory, root)
            path = self.candidate / 'ghcr-index.json'; path.write_bytes(path.read_bytes() + b' ')
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), patch.object(gate, 'verify_files', side_effect=race), self.assertRaisesRegex(gate.Refused, 'during verification'):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_missing_ghcr_channel_in_signed_inventory_refuses(self):
        helper = self.assembled(); self.inventory['channels'] = ['github']
        raw = gate.canonical(self.inventory); (self.candidate / 'release-inventory.json').write_bytes(raw)
        inputs = {'maintainer_signature': self.signature.replace(self.inventory_digest, gate.digest(raw))}
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'GHCR and both Linux'):
            helper.qualify(self.candidate, gate.digest(raw), self.work, inputs)

    def test_working_layout_symlinks_refuse_even_when_bytes_match(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            path = self.work / 'layout/oci-layout'; path.unlink(); path.symlink_to(self.natives[0] / 'oci-layout')
            with self.assertRaisesRegex(gate.Refused, 'nonregular working OCI'):
                helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_working_directory_symlink_refuses_even_when_bytes_match(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            alias = self.root / 'alias'; alias.symlink_to(self.work, target_is_directory=True)
            with self.assertRaisesRegex(gate.Refused, 'nonregular image working directory'):
                helper.qualify(self.candidate, self.inventory_digest, alias, self.inputs)

    def test_working_metadata_tampering_refuses(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            (self.work / 'index-digest.txt').write_text('sha256:' + 'f' * 64)
            with self.assertRaisesRegex(gate.Refused, 'metadata changed'):
                helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)


class Consumer(ReleaseFixture, unittest.TestCase):
    def signed_index(self):
        self.assembled()
        signature = self.root / 'approval.asc'; signature.write_text(self.signature)
        return json.loads((self.candidate / 'ghcr-index.json').read_bytes()), signature

    def test_platform_verification_requires_signature_before_sigstore(self):
        index, _ = self.signed_index()
        with patch.object(approval.subprocess, 'run') as external:
            with self.assertRaisesRegex(gate.Refused, 'signature missing'):
                release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + index['platforms']['amd64'],
                    'v0.1.0', candidate=self.candidate, approval_signature=self.root / 'missing.asc')
        external.assert_not_called()

    def test_unlisted_image_refuses_before_sigstore(self):
        _, signature = self.signed_index(); calls = []
        def crypto(command, **kwargs):
            if command[0] == 'gh': calls.append(command); return subprocess.CompletedProcess(command, 0)
            return self.crypto(command, **kwargs)
        with patch.object(approval.subprocess, 'run', side_effect=crypto), self.assertRaisesRegex(gate.Refused, 'image digest'):
            release_verify.verify_image('ghcr.io/marcinwadon/hennery@sha256:' + 'f' * 64,
                'v0.1.0', candidate=self.candidate, approval_signature=signature)
        self.assertEqual(calls, [])

    def test_signed_descriptor_identity_and_platform_set_are_required(self):
        index, signature = self.signed_index()
        for field, value in [('schema', 2), ('source_sha', 'b' * 40), ('version', '0.2.0'),
                             ('platforms', ['amd64', 'arm64']), ('platforms', {'amd64': index['platforms']['amd64']})]:
            with self.subTest(field=field, value=value):
                changed = copy.deepcopy(index); changed[field] = value
                (self.candidate / 'ghcr-index.json').write_bytes(gate.canonical(changed)); self.freeze()
                signature.write_text(self.signature)
                with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'signed image descriptor'):
                    release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + index['digest'],
                        'v0.1.0', candidate=self.candidate, approval_signature=signature)

    def test_signed_digest_set_is_distinct_and_sha256_only(self):
        index, signature = self.signed_index()
        for value in [index['digest'], 'sha256:sha256:' + 'a' * 64, [], None]:
            with self.subTest(value=value):
                changed = copy.deepcopy(index); changed['platforms']['amd64'] = value
                (self.candidate / 'ghcr-index.json').write_bytes(gate.canonical(changed)); self.freeze()
                signature.write_text(self.signature)
                with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'signed image digest set'):
                    release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + index['digest'],
                        'v0.1.0', candidate=self.candidate, approval_signature=signature)

    def test_shared_verifier_accepts_each_explicitly_signed_platform_and_index(self):
        layout = self.root / 'joined'; digest = image.merge(layout, self.natives)
        report = image.verify(layout, dict.fromkeys(TARGETS, self.expected), self.revision, self.version)
        descriptor = {'schema': 1, 'digest': digest, 'source_sha': self.revision, 'version': self.version,
                      'platforms': {a: p['digest'] for a, p in report['platforms'].items()}}
        (self.candidate / 'ghcr-index.json').write_bytes(gate.canonical(descriptor)); self.freeze()
        signature = self.root / 'approval.asc'; signature.write_text(self.signature)
        for subject in [digest, *descriptor['platforms'].values()]:
            def crypto(command, **kwargs):
                if command[0] == 'gh':
                    self.assertEqual(command[command.index('--cert-identity') + 1],
                        'https://github.com/' + gate.REPOSITORY + '/.github/workflows/release-publish.yml@refs/tags/v0.1.0')
                    return subprocess.CompletedProcess(command, 0)
                return self.crypto(command, **kwargs)
            with self.subTest(subject=subject), patch.object(approval.subprocess, 'run', side_effect=crypto):
                try:
                    release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + subject,
                        'v0.1.0', candidate=self.candidate, approval_signature=signature)
                except gate.Refused as error:
                    self.fail('maintainer-approved platform/index must verify: ' + str(error))


class Orchestrator(unittest.TestCase):
    def test_channel_jobs_use_real_orchestrator_and_environment_credential(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-publish.yml').read_text())
        for name in ['ghcr', 'ghcr-attest']:
            self.assertIn(name, workflow['jobs'], 'R4 must integrate inside the real tagged R1 orchestrator')
            job = workflow['jobs'][name]
            self.assertEqual(job['environment'], 'release')
            self.assertEqual(job['permissions'].get('packages'), 'read')
            login = next(s for s in job['steps'] if 'docker login' in s.get('run', ''))
            self.assertEqual(login['env']['GHCR_TOKEN'], '${{ secrets.GHCR_PUBLISH_TOKEN }}')

    def test_github_only_candidates_have_no_skipped_optional_channel_job(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-candidate.yml').read_text())
        self.assertEqual(set(workflow['jobs']), {'tag-signature', 'web-ui', 'archive', 'assemble', 'installer', 'retain'})
        for name, job in workflow['jobs'].items():
            if name != 'retain':
                self.assertNotIn('if', job, name + ' must qualify GitHub-only candidates too')
        # Channel selection belongs to steps; no candidate-level skipped GHCR job
        # is introduced for R1's generic selected-channel job policy to classify.
        assemble = workflow['jobs']['assemble']
        self.assertTrue(any('ghcr' in str(step.get('if', '')) for step in assemble['steps']))

    def test_real_candidate_freezes_oci_payloads_before_global_inventory(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-candidate.yml').read_text())
        archive = '\n'.join(s.get('run', '') for s in workflow['jobs']['archive']['steps'])
        self.assertIn('packaging/image-build.sh', archive)
        assemble = '\n'.join(s.get('run', '') for s in workflow['jobs']['assemble']['steps'])
        self.assertIn('ghcr-candidate.py assemble', assemble)
        self.assertLess(assemble.index('ghcr-candidate.py assemble'), assemble.index('supply.py freeze'))


if __name__ == '__main__':
    unittest.main()
