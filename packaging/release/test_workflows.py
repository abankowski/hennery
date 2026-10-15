"""Workflow structure is part of the gate; every privileged job is checked."""
import copy
from pathlib import Path
import re
import unittest
import tempfile
import shutil

import yaml

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]


class Workflows(unittest.TestCase):
    def candidate(self):
        return yaml.safe_load((ROOT / '.github/workflows/release-candidate.yml').read_text())

    def test_reserved_channel_names_belong_only_to_their_job_ids(self):
        for channel in ('crates','ghcr','homebrew'):
            data=self.candidate()
            data['jobs'].pop(channel,None)
            data['jobs']['licence-review']={'name':channel,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(channel=channel), self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check(data,'release-candidate.yml')

    def test_candidate_job_names_cannot_be_dynamic_or_collide(self):
        for display in ('archive',"${{ 'ghcr' }}",'${{ matrix.name }}',None,42):
            data=self.candidate()
            data['jobs']['licence-review']={'name':display,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(display=display), self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check(data,'release-candidate.yml')

    def test_candidate_job_identity_requires_a_valid_jobs_mapping(self):
        for jobs in (None,{},[],{'ordinary':None},{'ordinary.name':{}},{True:{}}):
            with self.subTest(jobs=jobs),self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check({'jobs':jobs},'release-candidate.yml')

    def test_channel_owner_has_literal_own_name_and_no_matrix(self):
        for channel in ('crates','ghcr','homebrew'):
            for changed in ({},{'name':channel}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                workflow_policy.check(data,'release-candidate.yml')
            for changed in ({'name':'archive'},{'name':'ordinary-display'},{'name':"${{ '"+channel+"' }}"},{'strategy':{'matrix':{'os':['ubuntu-24.04']}}}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                with self.subTest(channel=channel,changed=changed), self.assertRaisesRegex(ValueError,'candidate job identity'):
                    workflow_policy.check(data,'release-candidate.yml')

    def test_channel_registry_explicitly_maps_a_channel_to_its_owning_job_id(self):
        from unittest.mock import patch
        data=self.candidate()
        data['jobs'].pop('ghcr', None)
        data['jobs']['container-acceptance']={'name':'ghcr','timeout-minutes':5,'steps':[{'run':'true'}]}
        with patch.dict(workflow_policy.CHANNEL_JOB_IDS,{'ghcr':'container-acceptance'}):
            workflow_policy.check(data,'release-candidate.yml')
            data['jobs']['unrelated']=data['jobs'].pop('container-acceptance')
            with self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check(data,'release-candidate.yml')

    def test_candidate_yaml_decoding_cannot_hide_reserved_name_or_duplicate(self):
        base=(ROOT/'.github/workflows/release-candidate.yml').read_text()
        variants=[
            '\ufeff'+base+'\n  licence-review:\n    name: "\\u0067hcr"\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
            base+'\n  licence-review:\n    name: ghcr\n    name: ordinary\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
        ]
        for raw in variants:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                (root/'.github/workflows/release-candidate.yml').write_text(raw)
                with self.subTest(raw=raw[-150:]),self.assertRaises(ValueError):
                    workflow_policy.check_repository(root)

    def test_ghcr_credentials_require_selected_channel_as_well_as_enablement(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for name in ['ghcr', 'ghcr-attest']:
            changed = copy.deepcopy(data)
            selected = " && contains(fromJSON(inputs.channels), 'ghcr')"
            self.assertIn(selected, changed['jobs'][name]['if'])
            changed['jobs'][name]['if'] = changed['jobs'][name]['if'].replace(selected, '')
            with self.subTest(job=name), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_all_release_workflows(self):
        workflow_policy.check_repository(ROOT)

    def test_arbitrary_workflow_filename_cannot_hide_write_authority(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shutil.copytree(ROOT / '.github', root / '.github')
            data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
            data['on'] = data.pop(True) if True in data else data['on']
            data['jobs']['sign'].pop('environment')
            data['jobs']['sign']['steps'] = [s for s in data['jobs']['sign']['steps'] if s.get('uses') != './.github/actions/release-gate']
            (root / '.github/workflows/release.yml').write_text(yaml.safe_dump(data))
            with self.assertRaises(ValueError):
                workflow_policy.check_repository(root)

    def test_credentials_cannot_start_without_current_bound_authorization(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for kind in ('missing-authorize', 'missing-auth-gate', 'old-attempt-condition', 'ignored-authorize-dependency', 'or-bypass'):
            changed = copy.deepcopy(data)
            if kind == 'missing-authorize':
                changed['jobs'].pop('authorize')
            elif kind == 'missing-auth-gate':
                changed['jobs']['authorize']['steps'] = [s for s in changed['jobs']['authorize']['steps'] if s.get('uses') != './.github/actions/release-gate']
            elif kind == 'old-attempt-condition':
                changed['jobs']['sign']['if'] = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == 'refs/heads/main'"
            elif kind == 'ignored-authorize-dependency':
                changed['jobs']['sign']['needs'] = 'approval-tuple'
            else:
                changed['jobs']['sign']['if'] += ' || true'
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_authorization_job_is_protected_and_has_no_publication_authority(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for field, value in [('environment', None), ('permissions', {'contents': 'write'}), ('permissions', {'id-token': 'write'})]:
            changed = copy.deepcopy(data)
            changed['jobs']['authorize'][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_gate_cannot_be_skipped_or_ignore_failure(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for name in ('authorize', 'sign', 'github'):
            for field, value in [('if', 'false'), ('continue-on-error', True)]:
                changed = copy.deepcopy(data)
                step = next(s for s in changed['jobs'][name]['steps'] if s.get('uses') == './.github/actions/release-gate')
                step[field] = value
                with self.subTest(job=name, field=field), self.assertRaises(ValueError):
                    workflow_policy.check(changed, 'release-publish.yml')

    def test_read_only_job_with_release_secrets_still_requires_authorization(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        data['jobs']['bootstrap-crates'] = {
            'runs-on': 'ubuntu-24.04', 'timeout-minutes': 10, 'environment': 'release',
            'permissions': {'contents': 'read'}, 'steps': [{'run': 'echo protected credential job'}],
        }
        with self.assertRaises(ValueError):
            workflow_policy.check(data, 'release-publish.yml')

    def test_authorization_job_cannot_ignore_failures(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        data['jobs']['authorize']['continue-on-error'] = True
        with self.assertRaises(ValueError):
            workflow_policy.check(data, 'release-publish.yml')

    def test_each_privileged_job_requires_environment(self):
        for workflow in (ROOT / '.github/workflows').glob('release-*.yml'):
            data = yaml.safe_load(workflow.read_text())
            for name, job in data['jobs'].items():
                if workflow_policy.privileged(job):
                    for value in (None, 'unguarded'):
                        with self.subTest(workflow=workflow.name, job=name, value=value):
                            mutated = copy.deepcopy(data)
                            mutated['jobs'][name]['environment'] = value
                            with self.assertRaises(ValueError):
                                workflow_policy.check(mutated, workflow.name)

    def test_remove_either_boundary_refuses(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for phase in ('preflight', 'boundary'):
            changed = copy.deepcopy(data)
            # Isolate phase completeness from the independent credential-order
            # guards. Removing this guard must fail our assertion, not a later
            # gates['phase'] lookup with KeyError.
            steps = [s for s in changed['jobs']['github']['steps'] if s.get('uses') == './.github/actions/release-gate']
            changed['jobs']['github']['steps'] = [s for s in steps if s.get('with', {}).get('phase') != phase]
            with self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_credentials_and_writes_cannot_precede_their_gates(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for job_name, match in [('sign', 'actions/attest'), ('github', 'actions/create-github-app-token')]:
            changed = copy.deepcopy(data)
            steps = changed['jobs'][job_name]['steps']
            step = next(s for s in steps if s.get('uses', '').startswith(match))
            steps.remove(step)
            steps.insert(0, step)
            with self.subTest(job=job_name), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_reusable_job_cannot_hide_its_environment(self):
        with self.assertRaises(ValueError):
            workflow_policy.check({'jobs': {'sign': {'uses': './.github/workflows/release-sign.yml'}}}, 'release-wrapper.yml')

    def test_unpinned_action_and_cache_refuse(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-candidate.yml').read_text())
        for action in ('actions/checkout@v4', 'Swatinem/rust-cache@' + 'a' * 40):
            changed = copy.deepcopy(data)
            changed['jobs']['archive']['steps'].append({'uses': action})
            with self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-candidate.yml')



class PlatformBoundary(unittest.TestCase):
    def test_release_jobs_run_on_the_release_tag_without_admin_policy_tokens(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for name in ('authorize', 'sign', 'github'):
            job = data['jobs'][name]
            self.assertNotIn('refs/heads/', job.get('if', ''))
            self.assertIn('refs/tags/', job.get('if', ''))
        text = (ROOT / '.github/workflows/release-publish.yml').read_text()
        self.assertNotIn('RELEASE_POLICY_READ_TOKEN', text)
        self.assertNotIn('permission-administration', text)
        self.assertIn('settings_audit_sha256:', text)
        self.assertIn('settings_audit:', text)

    def test_candidate_retention_requires_prior_tag_signature_validation(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-candidate.yml').read_text())
        self.assertIn('tag-signature', data['jobs'])
        job = data['jobs']['tag-signature']
        self.assertIn('tag_signature.py', str(job))
        for name, job in data['jobs'].items():
            if job.get('environment') == 'release-staging':
                self.assertIn('tag-signature', job['needs'])


if __name__ == '__main__':
    unittest.main()
