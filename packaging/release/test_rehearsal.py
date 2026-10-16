"""Unsigned rehearsal must exercise the real graph without gaining authority."""
import copy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import contract
import gate
import rehearsal
import release_run
import test_assemble
import workflow_policy

ROOT = Path(__file__).resolve().parents[2]


class Rehearsal(unittest.TestCase):
    def workflow(self, name):
        return workflow_policy.load_workflow((ROOT / '.github/workflows' / name).read_bytes())

    def test_checked_workflow_is_generated_from_real_job_graph(self):
        real = self.workflow('release.yml'); probe = self.workflow('release-rehearsal.yml')
        self.assertEqual(probe, rehearsal.workflow(real))
        for name in rehearsal.SHARED_JOBS:
            for field in ('needs', 'if', 'strategy', 'runs-on', 'timeout-minutes'):
                self.assertEqual(probe['jobs'][name].get(field), real['jobs'][name].get(field), (name, field))
            uploads = lambda job: [s for s in job['steps'] if s.get('uses', '').startswith(('actions/upload-artifact@', 'actions/download-artifact@'))]
            self.assertEqual(uploads(probe['jobs'][name]), uploads(real['jobs'][name]), name)
        workflow_policy.check(probe, 'release-rehearsal.yml')
        self.assertEqual(probe['jobs']['verify']['needs'], real['jobs']['attest']['needs'])
        self.assertEqual(probe['jobs']['verify']['if'], real['jobs']['attest']['if'])

    def test_context_rehearses_the_selected_stable_channels_too(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / '.github/workflows').mkdir(parents=True)
            (root / 'packaging/release').mkdir(parents=True)
            (root / 'Cargo.toml').write_text('[workspace.package]\nversion="0.1.0"\n')
            (root / contract.WORKFLOW).write_bytes((ROOT / contract.WORKFLOW).read_bytes())
            channels = ['crates', 'ghcr', 'github', 'homebrew']
            (root / 'packaging/release/channels.json').write_bytes(gate.canonical(channels))
            with patch.object(rehearsal, 'ROOT', root):
                self.assertEqual(rehearsal.context(), {'tag': 'v0.1.0', 'tag_object': '0' * 40, 'channels': channels})

    def test_policy_refuses_authority_or_drift(self):
        for kind in ('write', 'oidc', 'environment', 'secret', 'token', 'reusable', 'unpin',
                     'ignore-failure', 'different-runner', 'flat-download', 'skip-freeze', 'publish', 'trigger'):
            data = copy.deepcopy(self.workflow('release-rehearsal.yml'))
            job = data['jobs']['assemble']
            if kind == 'write': data['permissions'] = {'contents': 'write'}
            if kind == 'oidc': job['permissions'] = {'contents': 'read', 'id-token': 'write'}
            if kind == 'environment': job['environment'] = 'other'
            if kind == 'secret': job['env'] = {'KEY': '${{ secrets.ANY }}'}
            if kind == 'token': job['env'] = {'GH_TOKEN': '${{ github.token }}'}
            if kind == 'reusable': job['uses'] = './.github/workflows/other.yml'
            if kind == 'unpin': job['steps'][0]['uses'] = 'actions/checkout@v4'
            if kind == 'ignore-failure': job['continue-on-error'] = True
            if kind == 'different-runner': job['runs-on'] = 'ubuntu-latest'
            if kind == 'flat-download': next(s for s in job['steps'] if s.get('with', {}).get('pattern') == 'candidate-*')['with']['merge-multiple'] = True
            if kind == 'skip-freeze': job['steps'] = job['steps'][:-2]
            if kind == 'publish': data['jobs']['publish'] = copy.deepcopy(job)
            if kind == 'trigger': data['on'] = {'pull_request_target': None}
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                workflow_policy.check(data, 'release-rehearsal.yml')

    def test_nix_is_installed_before_any_rehearsal_command_needs_it(self):
        for name, job in self.workflow('release-rehearsal.yml')['jobs'].items():
            installed = False
            for step in job['steps']:
                if step.get('uses') == rehearsal.NIX: installed = True
                if 'nix develop' in step.get('run', ''):
                    self.assertTrue(installed, (name, step))

    def test_real_layout_assembly_freeze_upload_download_and_local_verification(self):
        synthetic = {'tag': 'v0.1.0-alpha.3', 'tag_object': '0' * 40, 'channels': ['github']}
        with patch.object(rehearsal, 'context', return_value=synthetic), tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); payload = root / 'payload'
            import assemble
            assemble.assemble(test_assemble.candidates(root / 'candidates'), payload)
            tag = rehearsal.context()['tag']
            import supply
            for name in supply.required_payloads(['github'], sorted(gate.TARGETS), tag):
                if not (payload / name).exists(): (payload / name).write_bytes(b'fixture')
            with patch.dict(os.environ, {'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '42', 'GITHUB_RUN_ATTEMPT': '1'}):
                rehearsal.freeze(payload)
                # actions/upload-artifact uses LCA(payload/,signatures/).
                import zipfile
                signatures = root / 'signatures'; signatures.mkdir()
                (signatures / contract.BUNDLE).write_bytes(b'UNSIGNED STUB: no provenance')
                transport = root / 'attested.zip'
                with zipfile.ZipFile(transport, 'w') as archive:
                    for folder in (payload, signatures):
                        for path in folder.iterdir(): archive.write(path, path.relative_to(root))
                original = root / 'original'
                with zipfile.ZipFile(transport) as archive: archive.extractall(original)
                rehearsal.verify(original / 'payload')
                for field, value in (('GITHUB_SHA', 'b' * 40), ('GITHUB_RUN_ID', '43'), ('GITHUB_RUN_ATTEMPT', '2')):
                    with self.subTest(field=field), patch.dict(os.environ, {field: value}), self.assertRaises(gate.Refused):
                        rehearsal.verify(original / 'payload')
                subjects = {p.name for p in (original / 'payload').iterdir()}
                self.assertEqual(subjects, set(contract.verify_files(original / 'payload')) | {contract.CHECKSUMS})
                self.assertTrue((original / 'signatures' / contract.BUNDLE).is_file())
                with patch.object(release_run, 'configuration', side_effect=gate.Refused('no signed tag')), self.assertRaises(gate.Refused):
                    release_run.freeze(root / 'cannot-publish')
                (original / 'payload' / 'runtime-inventory.json').write_bytes(b'tampered')
                with self.assertRaises(gate.Refused): rehearsal.verify(original / 'payload')

    def test_stubs_never_call_signature_network_or_attestation_verification(self):
        with patch.object(release_run.tag_signature, 'verify', side_effect=AssertionError('signature')), patch.object(release_run, 'verify', side_effect=AssertionError('network')):
            self.assertEqual(rehearsal.context()['tag_object'], '0' * 40)
        with patch('subprocess.check_output', return_value='a' * 40), patch.dict(os.environ, {'GITHUB_SHA': 'b' * 40}), self.assertRaises(gate.Refused):
            rehearsal.source()
