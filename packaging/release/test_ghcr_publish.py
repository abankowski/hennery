"""GHCR publication order, tag reconciliation and the remote verifier boundary."""
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import channel_publish
import gate


class GHCRPublish(unittest.TestCase):
    def publish(self, tag='v0.1.4', existing=False, failure=None):
        self.digest = 'sha256:' + 'a' * 64
        self.events = []
        self.tags = {'0.1.4': self.digest} if existing else {}
        self.index = {'digest': self.digest, 'platforms': {'amd64': 'sha256:' + 'b' * 64,
                                                         'arm64': 'sha256:' + 'c' * 64}}
        value = {'tag': tag, 'source_sha': 'd' * 40}
        subjects = [(name, kind, digest, predicate, Path('unused-bundle'))
                    for name, digest in [('index', self.digest), *self.index['platforms'].items()]
                    for kind, predicate in [('provenance', channel_publish.verify.PROVENANCE),
                                            *([] if name == 'index' else [('image-sbom', channel_publish.verify.SPDX)])]]

        def reconcile(ref, digest, auth):
            self.events.append(('reconcile', ref))
            if ref.startswith('sha256:'): return 0 if existing or ('upload', ref) in self.events else 1
            if ref == '0.1.4' and (failure == 'conflict' or
                    failure == 'late-conflict' and any(e[0] == 'verify' for e in self.events)):
                raise ValueError('published image digest mismatch')
            if failure == 'readback' and ref in self.tags: return 1
            return 0 if self.tags.get(ref) == digest else 1

        def transport(command, **kwargs):
            env = kwargs['env']
            self.assertNotIn('GH_TOKEN', env)
            self.assertNotIn('GHCR_PUBLISH_TOKEN', env)
            if command[:2] == ['skopeo', 'login']:
                self.assertEqual(kwargs['input'], 'registry-only')
                Path(command[command.index('--authfile') + 1]).write_text('fixture auth')
            elif command[:2] == ['skopeo', 'copy']:
                self.assertIn('--all', command); self.assertIn('--preserve-digests', command)
                if command[-1].endswith('@' + self.digest): self.events.append(('upload', self.digest))
                else:
                    self.assertEqual(command[-2], 'docker://ghcr.io/marcinwadon/hennery@' + self.digest)
                    ref = command[-1].split(':')[-1]
                    self.events.append(('tag', ref)); self.tags[ref] = self.digest
            elif command[:3] == ['gh', 'attestation', 'verify']:
                raise AssertionError('verifier must use its isolated environment')
            else: self.fail(command)
            return subprocess.CompletedProcess(command, 0)

        # Exercise the real verify_image_subject and its actual subprocess env.
        # A mock returning success unconditionally would miss gh's exit 4.
        def processes(command, **kwargs):
            if command[:3] != ['gh', 'attestation', 'verify']: return transport(command, **kwargs)
            env = kwargs['env']
            if env.get('GH_TOKEN') != 'github-readback': raise subprocess.CalledProcessError(4, command)
            self.assertNotIn('GHCR_PUBLISH_TOKEN', env)
            self.assertNotIn('GITHUB_TOKEN', env)
            self.assertNotIn('ACTIONS_ID_TOKEN_REQUEST_TOKEN', env)
            self.assertEqual(Path(env['REGISTRY_AUTH_FILE']).read_text(), '{"auths":{}}\n')
            self.assertIn('--bundle-from-oci', command)
            self.assertIn(command[3].removeprefix('oci://ghcr.io/marcinwadon/hennery@'),
                          [self.digest, *self.index['platforms'].values()])
            self.events.append(('verify', command[3]))
            if failure == 'verify': raise subprocess.CalledProcessError(1, command)
            return subprocess.CompletedProcess(command, 0)

        env = {'GH_TOKEN': 'github-readback', 'GITHUB_TOKEN': 'unrelated-token',
               'GHCR_PUBLISH_TOKEN': 'registry-only', 'GHCR_PUBLISH_USER': 'fixture',
               'ACTIONS_ID_TOKEN_REQUEST_TOKEN': 'oidc-only'}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, env), \
                patch.object(channel_publish, 'image_helper', return_value=SimpleNamespace(inspect_release=lambda *a: self.index)), \
                patch.object(channel_publish, 'check_images'), patch.object(channel_publish, 'shared_verify', return_value=value), \
                patch.object(channel_publish, 'registry_helper', return_value=SimpleNamespace(reconcile=reconcile)), \
                patch.object(channel_publish, 'image_subjects', side_effect=lambda *a: iter(subjects)), \
                patch.object(channel_publish, 'attach_bundle', side_effect=lambda *a: self.events.append(('attach', a[0]))), \
                patch('subprocess.run', side_effect=processes):
            return channel_publish.ghcr_upload(Path(tmp), Path(tmp), value)

    def test_stable_tags_follow_all_remote_readbacks_and_are_read_back_by_digest(self):
        self.assertEqual(self.publish(), {'state': 'published', 'digest': self.digest})
        self.assertEqual([ref for event, ref in self.events if event == 'tag'], ['0.1.4', 'latest'])
        self.assertEqual(sum(event == 'verify' for event, _ in self.events), 5)
        first_tag = next(i for i, event in enumerate(self.events) if event[0] == 'tag')
        self.assertTrue(all(i < first_tag for i, event in enumerate(self.events) if event[0] in ('upload', 'attach', 'verify')))
        for ref in ['0.1.4', 'latest']:
            i = self.events.index(('tag', ref))
            self.assertEqual(self.events[i + 1], ('reconcile', ref))

    def test_prerelease_only_writes_version_tag(self):
        self.publish(tag='v0.1.4-rc.1')
        self.assertEqual([ref for event, ref in self.events if event == 'tag'], ['0.1.4-rc.1'])

    def test_retry_reuses_matching_version_and_updates_latest(self):
        self.publish(existing=True)
        self.assertEqual([ref for event, ref in self.events if event == 'tag'], ['latest'])
        self.assertFalse(any(event == 'upload' for event, _ in self.events))

    def test_conflicting_version_refuses_before_any_tag_write(self):
        for fault in ['conflict', 'late-conflict']:
            with self.subTest(fault=fault), self.assertRaisesRegex(ValueError, 'digest mismatch'):
                self.publish(failure=fault)
            self.assertFalse(any(event == 'tag' for event, _ in self.events))

    def test_failed_remote_verification_withholds_tags(self):
        with self.assertRaises(subprocess.CalledProcessError): self.publish(failure='verify')
        self.assertFalse(any(event == 'tag' for event, _ in self.events))

    def test_failed_version_tag_readback_withholds_latest(self):
        with self.assertRaises(gate.Refused): self.publish(failure='readback')
        self.assertEqual([ref for event, ref in self.events if event == 'tag'], ['0.1.4'])
