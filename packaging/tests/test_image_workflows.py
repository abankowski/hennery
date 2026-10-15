"""Negative authority fixtures for GHCR inside R1's real tagged orchestrator."""
import copy
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import yaml

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT / 'packaging/release'))
import workflow_policy

WORKFLOW = ROOT / '.github/workflows/release-publish.yml'
CHANNEL_JOBS = ['ghcr', 'ghcr-attest']


def validate(workflow):
    workflow_policy.check(workflow, WORKFLOW.name)
    for name in CHANNEL_JOBS:
        if name not in workflow['jobs']:
            raise ValueError('GHCR publisher/signing job missing')
        job = workflow['jobs'][name]
        if job.get('permissions', {}).get('packages') != 'read':
            raise ValueError('ordinary package token must be READ')
        if job.get('if') != workflow_policy.CREDENTIAL_CONDITION + " && vars.RELEASE_GHCR_ENABLED == 'true' && contains(fromJSON(inputs.channels), 'ghcr')":
            raise ValueError('GHCR channel enable gate missing')
        steps = job['steps']
        downloads = [s.get('with', {}) for s in steps if s.get('uses', '').startswith('actions/download-artifact@')]
        if not any(s.get('name') == 'signatures-${{ github.run_id }}-${{ github.run_attempt }}'
                   and s.get('path') == 'signatures' for s in downloads):
            raise ValueError('exact current-attempt candidate Sigstore bundle download missing')
        logins = [s for s in steps if 'docker login' in s.get('run', '')]
        if name == 'ghcr':
            if len(logins) != 1 or logins[0].get('env', {}).get('GHCR_TOKEN') != '${{ secrets.GHCR_PUBLISH_TOKEN }}':
                raise ValueError('protected environment registry credential required')
            login = logins[0]
            guard = 'sh packaging/ghcr-gate.sh preflight '
            if guard not in login['run'] or login['run'].index(guard) > login['run'].index('docker login'):
                raise ValueError('pre-credential revalidation missing')
            checks = [i for i, s in enumerate(steps) if 'ghcr-verify.py all' in s.get('run', '')]
            if not checks or checks[0] >= steps.index(login):
                raise ValueError('Sigstore verification must precede registry credential')
            if 'ghcr-attest' not in job['needs']:
                raise ValueError('OCI bundle verification must precede upload')
            if not any(s.get('pattern') == 'ghcr-attestations-*-${{ github.run_id }}-${{ github.run_attempt }}'
                       and s.get('path') == 'attestation-bundles' for s in downloads):
                raise ValueError('current-attempt verified OCI bundle download missing')
        elif logins or any('GHCR_PUBLISH_TOKEN' in str(s) for s in steps):
            raise ValueError('OCI generator must not receive registry credentials')
        for i, step in enumerate(steps):
            if step.get('uses', '').startswith('actions/attest-'):
                if step['with'].get('push-to-registry') is not False:
                    raise ValueError('OCI bundles must verify before registry publication')
                if not steps[i - 1].get('run', '').startswith('sh packaging/ghcr-gate.sh boundary '):
                    raise ValueError('pre-signing revalidation missing')
    signer = workflow['jobs']['ghcr-attest']
    for step in signer['steps']:
        if step.get('uses') == './.github/actions/release-gate' and '${{ matrix.subject }}' not in step['with']['receipt']:
            raise ValueError('matrix gate receipts must be unique')
    checks = [s for s in signer['steps'] if 'packaging/release/verify.py' in s.get('run', '')]
    if len(checks) != 1 or any(x not in checks[0]['run'] for x in ['--approval-signature', '--inventory-directory', '--manifest', 'https://spdx.dev/Document', 'image-sbom binary-sbom']):
        raise ValueError('signed-inventory OCI predicate verification missing')
    receipt = workflow['jobs'].get('ghcr-complete', {})
    if receipt.get('if') != "always() && contains(fromJSON(inputs.channels), 'ghcr')" or set(receipt.get('needs', [])) != {'authorize', 'ghcr', 'ghcr-attest'}:
        raise ValueError('channel completion receipt missing')


class Workflow(unittest.TestCase):
    def setUp(self):
        self.workflow = yaml.safe_load(WORKFLOW.read_text())

    def test_channel_selection_is_required_for_both_ghcr_jobs(self):
        for name in CHANNEL_JOBS:
            self.assertIn("contains(fromJSON(inputs.channels), 'ghcr')", self.workflow['jobs'][name]['if'])

    def test_oci_bundles_are_generated_before_registry_publication(self):
        signer = self.workflow['jobs']['ghcr-attest']
        self.assertIn('sign', signer['needs'])
        self.assertNotIn('ghcr', signer['needs'])
        self.assertIn('ghcr-attest', self.workflow['jobs']['ghcr']['needs'])
        for step in signer['steps']:
            if step.get('uses', '').startswith('actions/attest-'):
                self.assertIs(step['with'].get('push-to-registry'), False)
        self.assertFalse(any('docker login' in step.get('run', '') for step in signer['steps']))

    def test_sigstore_verification_precedes_registry_credentials(self):
        steps = self.workflow['jobs']['ghcr']['steps']
        checks = [i for i, s in enumerate(steps) if 'ghcr-verify.py' in s.get('run', '')]
        self.assertTrue(checks, 'all exact candidate/OCI bundles must verify before registry credentials')
        login = next(i for i, s in enumerate(steps) if 'docker login' in s.get('run', ''))
        self.assertLess(checks[0], login)

    def test_all_writers_and_signers_are_protected(self):
        try:
            validate(self.workflow)
        except ValueError as error:
            self.fail('shipped workflow violates release authority: ' + str(error))

    def test_each_unprotected_writer_or_signer_is_refused(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow); del changed['jobs'][job]['environment']
            with self.subTest(job=job), self.assertRaises(ValueError): validate(changed)

    def test_each_writer_requires_maintainer_enable(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow); del changed['jobs'][job]['if']
            with self.subTest(job=job), self.assertRaises(ValueError): validate(changed)

    def test_early_write_permissions_are_refused(self):
        changed = copy.deepcopy(self.workflow); changed['jobs']['authorize']['permissions']['packages'] = 'write'
        with self.assertRaises(ValueError): validate(changed)

    def test_dedicated_credential_writers_are_detected_with_read_only_job_tokens(self):
        for command in ['docker login ghcr.io', 'sh packaging/ghcr-publish.sh layout 0.1.0 digest',
                        'nix develop .#release -c python3 packaging/ghcr-verify.py publish']:
            job = {'permissions': {'contents': 'read', 'packages': 'read'}, 'steps': [{'run': command}]}
            with self.subTest(command=command): self.assertTrue(workflow_policy.privileged(job))

    def test_lint_reference_is_not_a_registry_writer(self):
        job = {'permissions': {'contents': 'read'}, 'steps': [{'run':
            'nix develop .#image -c shellcheck packaging/ghcr-publish.sh packaging/ghcr-gate.sh'}]}
        self.assertFalse(workflow_policy.privileged(job))

    def test_stale_inventory_or_attempt_authorization_is_refused(self):
        for job in CHANNEL_JOBS:
            for expression in ['needs.authorize.outputs.run_attempt == github.run_attempt',
                               'needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256']:
                changed = copy.deepcopy(self.workflow)
                changed['jobs'][job]['if'] = changed['jobs'][job]['if'].replace(expression, 'true')
                with self.subTest(job=job, expression=expression), self.assertRaises(ValueError): validate(changed)

    def test_skipped_jobs_cannot_report_channel_completion(self):
        changed = copy.deepcopy(self.workflow); del changed['jobs']['ghcr-complete']
        with self.assertRaisesRegex(ValueError, 'channel completion'): validate(changed)

    def run_receipt(self, changes):
        script = self.workflow['jobs']['ghcr-complete']['steps'][0]['run']
        with tempfile.TemporaryDirectory() as temporary:
            env = dict(os.environ, AUTH_RESULT='success', PUBLISH_RESULT='success', ATTEST_RESULT='success',
                AUTH_ATTEMPT='1', GITHUB_RUN_ATTEMPT='1', AUTH_INVENTORY='a' * 64,
                INVENTORY_SHA256='a' * 64, DIGEST='sha256:' + 'b' * 64,
                GITHUB_OUTPUT=str(Path(temporary) / 'receipt'))
            env.update(changes)
            return subprocess.run(['bash', '-e', '-c', script], env=env, capture_output=True, text=True)

    def test_successful_current_attempt_can_complete(self):
        self.assertEqual(self.run_receipt({}).returncode, 0)

    def test_each_failed_or_stale_receipt_binding_refuses(self):
        for field, value in [('AUTH_RESULT', 'skipped'), ('PUBLISH_RESULT', 'skipped'),
                             ('ATTEST_RESULT', 'skipped'), ('ATTEST_RESULT', 'failure'), ('AUTH_ATTEMPT', '2'),
                             ('AUTH_INVENTORY', 'b' * 64), ('DIGEST', ''), ('DIGEST', 'not-a-digest')]:
            with self.subTest(field=field, value=value):
                self.assertNotEqual(self.run_receipt({field: value}).returncode, 0)

    def test_each_signing_boundary_requires_fresh_revalidation(self):
        steps = self.workflow['jobs']['ghcr-attest']['steps']
        guards = [i for i, s in enumerate(steps) if s.get('run', '').startswith('sh packaging/ghcr-gate.sh boundary ')]
        self.assertEqual(len(guards), 3)
        for i in guards:
            changed = copy.deepcopy(self.workflow); changed['jobs']['ghcr-attest']['steps'][i]['run'] = 'true'
            with self.subTest(boundary=i), self.assertRaisesRegex(ValueError, 'pre-signing'): validate(changed)

    def test_registry_credential_boundary_requires_revalidation(self):
        for job in ['ghcr']:
            changed = copy.deepcopy(self.workflow)
            for step in changed['jobs'][job]['steps']:
                if 'docker login' in step.get('run', ''):
                    step['run'] = step['run'].replace('sh packaging/ghcr-gate.sh preflight', 'true')
            with self.subTest(job=job), self.assertRaisesRegex(ValueError, 'pre-credential'): validate(changed)

    def test_ordinary_token_cannot_replace_environment_registry_credential(self):
        for job in ['ghcr']:
            changed = copy.deepcopy(self.workflow)
            for step in changed['jobs'][job]['steps']:
                if 'docker login' in step.get('run', ''): step['env']['GHCR_TOKEN'] = '${{ github.token }}'
            with self.subTest(job=job), self.assertRaisesRegex(ValueError, 'environment registry credential'): validate(changed)

    def test_ordinary_package_write_permissions_are_refused(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow); changed['jobs'][job]['permissions']['packages'] = 'write'
            with self.subTest(job=job), self.assertRaisesRegex(ValueError, 'READ'): validate(changed)

    def test_matrix_receipt_names_cannot_collide(self):
        changed = copy.deepcopy(self.workflow)
        for step in changed['jobs']['ghcr-attest']['steps']:
            if step.get('uses') == './.github/actions/release-gate': step['with']['receipt'] = 'shared-receipt.json'
        with self.assertRaisesRegex(ValueError, 'unique'): validate(changed)

    def test_oci_consumer_verification_is_required(self):
        changed = copy.deepcopy(self.workflow)
        changed['jobs']['ghcr-attest']['steps'] = [s for s in changed['jobs']['ghcr-attest']['steps'] if 'packaging/release/verify.py' not in s.get('run', '')]
        with self.assertRaisesRegex(ValueError, 'OCI predicate'): validate(changed)

    def test_orphaned_reusable_workflows_are_removed(self):
        for name in ['ghcr-publish.yml', 'image-candidate.yml']:
            self.assertFalse((ROOT / '.github/workflows' / name).exists())


if __name__ == '__main__': unittest.main()
