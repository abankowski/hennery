"""Workflow structure is part of the gate; every privileged job is checked."""
import copy
from pathlib import Path
import re
import unittest

import yaml

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]


class Workflows(unittest.TestCase):
    def test_all_release_workflows(self):
        workflow_policy.check_repository(ROOT)

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
            steps = changed['jobs']['github']['steps']
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


if __name__ == '__main__':
    unittest.main()
