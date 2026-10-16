"""Skipped optional ancestors must not suppress candidate acceptance descendants."""
import copy
import json
import os
from pathlib import Path
import subprocess
import shlex
import unittest

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]
NATIVE = "${{ !cancelled() && needs.assemble.result == 'success' }}"
SELECT = "contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')"
AGGREGATE = "${{ !cancelled() && needs.assemble.result == 'success' && needs.homebrew-native.result == 'success' && " + SELECT + " }}"
GHCR_SELECT = SELECT.replace(',homebrew,', ',ghcr,')
GHCR = "${{ !cancelled() && needs.assemble.result == 'success' && " + GHCR_SELECT + " }}"
RETAIN = "${{ !cancelled() && needs.assemble.result == 'success' && needs.installer.result == 'success' && needs.tag-signature.result == 'success' && vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true' && (needs.ghcr.result == 'success' || (needs.ghcr.result == 'skipped' && !" + GHCR_SELECT + ")) }}"


def workflow(name):
    return workflow_policy.load_workflow((ROOT / '.github/workflows' / name).read_text())


class OptionalScheduling(unittest.TestCase):
    def test_ci_actionlint_covers_every_release_workflow(self):
        steps = workflow('release-tests.yml')['jobs']['refusal-tests']['steps']
        command = next(step['run'] for step in steps if step.get('name') == 'Actionlint')
        words = shlex.split(command)
        patterns = words[words.index('actionlint') + 1:]
        checked = {path for pattern in patterns for path in ROOT.glob(pattern)}
        self.assertLessEqual(set((ROOT / '.github/workflows').glob('release-*.yml')), checked)

    def test_native_installer_aggregate_and_retention_have_explicit_safe_conditions(self):
        jobs = workflow('release-candidate.yml')['jobs']
        for name, expected in (('homebrew-native', NATIVE), ('installer', NATIVE),
                               ('homebrew', AGGREGATE), ('ghcr', GHCR), ('retain', RETAIN)):
            with self.subTest(job=name):
                self.assertEqual(jobs[name].get('if'), expected)

    def test_policy_refuses_missing_or_implicit_status_on_transitive_descendants(self):
        original = workflow('release-candidate.yml')
        for name in ('assemble', 'installer', 'homebrew-native', 'homebrew', 'ghcr', 'retain'):
            for condition in (None, "needs.assemble.result == 'success'", "contains('success()', 'success')"):
                data = copy.deepcopy(original)
                if condition is None:
                    data['jobs'][name].pop('if', None)
                else:
                    data['jobs'][name]['if'] = condition
                with self.subTest(job=name, condition=condition), self.assertRaisesRegex(ValueError, 'optional.*status'):
                    workflow_policy.check(data, 'release-candidate.yml')

    def test_policy_walks_new_optional_jobs_and_multiple_ancestor_hops(self):
        data = workflow('release-candidate.yml')
        data['jobs']['future-channel'] = {'if': "inputs.channels == 'future'", 'timeout-minutes': 1,
                                         'steps': [{'run': 'true'}]}
        data['jobs']['join'] = {'needs': ['archive', 'future-channel'], 'if': 'always()',
                               'timeout-minutes': 1, 'steps': [{'run': 'true'}]}
        data['jobs']['middle'] = {'needs': 'join', 'timeout-minutes': 1, 'steps': [{'run': 'true'}]}
        data['jobs']['later'] = {'needs': 'middle', 'timeout-minutes': 1, 'steps': [{'run': 'true'}]}
        with self.assertRaisesRegex(ValueError, 'later.*optional.*status'):
            workflow_policy.check(data, 'release-candidate.yml')
        data['jobs']['middle']['if'] = "!cancelled() && needs.join.result == 'success'"
        data['jobs']['later']['if'] = "!cancelled() && needs.middle.result == 'success'"
        workflow_policy.check(data, 'release-candidate.yml')

    def test_nonoptional_ancestors_keep_implicit_success(self):
        data = {'jobs': {'build': {'timeout-minutes': 1, 'steps': [{'run': 'true'}]},
                         'test': {'needs': 'build', 'timeout-minutes': 1, 'steps': [{'run': 'true'}]}}}
        workflow_policy.check(data, 'release-candidate.yml')

    def test_secret_free_actions_regression_uses_production_guards(self):
        data = workflow('release-scheduling.yml')
        trigger = data.get('on', data.get(True))
        self.assertIn('pull_request', trigger)
        self.assertEqual(trigger['workflow_dispatch']['inputs']['channels']['options'], ['github', 'github,homebrew'])
        self.assertEqual(data['permissions'], {})
        self.assertNotIn('secrets.', str(data))
        jobs = data['jobs']
        self.assertEqual(jobs['crates']['if'], workflow('release-candidate.yml')['jobs']['crates']['if'])
        self.assertEqual(jobs['assemble']['if'], workflow('release-candidate.yml')['jobs']['assemble']['if'])
        for name in ('homebrew-native', 'installer'):
            self.assertEqual(jobs[name]['if'], NATIVE)
        self.assertEqual(jobs['homebrew-native']['strategy']['matrix']['channels'], ['github', 'github,homebrew'])
        native_steps = jobs['homebrew-native']['steps']
        self.assertNotIn('if', native_steps[0])
        self.assertEqual(native_steps[1]['if'], SELECT.replace("github.event.inputs.channels || 'github'", 'matrix.channels'))
        for name, channels in (('homebrew', 'github,homebrew'), ('homebrew-unselected', 'github')):
            self.assertEqual(jobs[name]['if'], AGGREGATE.replace("github.event.inputs.channels || 'github'", repr(channels)))
        self.assertEqual(jobs['retain']['if'], RETAIN.replace("vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true'", 'true'))
        self.assertEqual(jobs['ghcr']['if'], GHCR)
        self.assertEqual(jobs['ghcr-selected']['if'], GHCR.replace("github.event.inputs.channels || 'github'", "'github,ghcr'"))
        self.assertIn('ghcr', jobs['retain']['needs'])
        assertion = jobs['assert-scheduling']
        self.assertEqual(assertion['if'], 'always()')
        self.assertEqual(set(assertion['needs']), set(jobs) - {'assert-scheduling'})
        run = assertion['steps'][0]['run']
        self.assertIn("'crates': 'skipped'", run)
        self.assertIn("'homebrew-unselected': 'skipped'", run)
        self.assertIn("'ghcr': 'skipped'", run)
        for name in ('assemble', 'homebrew-native', 'installer', 'homebrew', 'ghcr-selected', 'retain'):
            self.assertIn(repr(name) + ": 'success'", run)
        workflow_policy.check(data, 'release-scheduling.yml')

    def test_execute_exact_actions_assertion_accepts_only_expected_job_results(self):
        job = workflow('release-scheduling.yml')['jobs']['assert-scheduling']
        script = job['steps'][0]['run']
        expected = {key: {'result': 'skipped' if key in ('crates', 'homebrew-unselected', 'ghcr') else 'success'}
                    for key in job['needs']}
        result = subprocess.run(['bash', '-eu', '-c', script], env=dict(os.environ, RESULTS=json.dumps(expected)),
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in expected:
            for status in ('skipped', 'failure', 'cancelled', 'success'):
                if status == expected[name]['result']:
                    continue
                changed = copy.deepcopy(expected)
                changed[name]['result'] = status
                result = subprocess.run(['bash', '-eu', '-c', script],
                                        env=dict(os.environ, RESULTS=json.dumps(changed)),
                                        capture_output=True, text=True, check=False)
                with self.subTest(job=name, status=status):
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('Scheduling regression:', result.stderr)

    def test_regression_workflow_is_also_subject_to_optional_dag_policy(self):
        data = workflow('release-scheduling.yml')
        data['jobs']['installer'].pop('if')
        with self.assertRaisesRegex(ValueError, 'installer.*optional.*status'):
            workflow_policy.check(data, 'release-scheduling.yml')


if __name__ == '__main__':
    unittest.main()
