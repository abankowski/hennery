"""Bind the secret-free real Actions scheduler regression to the release DAG."""
import copy
from pathlib import Path
import shlex
import unittest
import workflow_policy
ROOT=Path(__file__).resolve().parents[2]
def workflow(name):return workflow_policy.load_workflow((ROOT/'.github/workflows'/name).read_bytes())
class OptionalScheduling(unittest.TestCase):
    def test_ci_actionlint_covers_every_release_workflow(self):
        command=next(s['run'] for s in workflow('release-tests.yml')['jobs']['refusal-tests']['steps'] if s.get('name')=='Actionlint')
        words=shlex.split(command);checked={p for pattern in words[words.index('actionlint')+1:] for p in ROOT.glob(pattern)}
        self.assertLessEqual(set((ROOT/'.github/workflows').glob('release*.yml')),checked)
    def test_scheduler_uses_exact_production_graph_and_conditions(self):
        real=workflow('release.yml')['jobs'];probe=workflow('release-scheduling.yml')['jobs']
        for key,job in real.items():
            if key=='publish':continue
            self.assertEqual(probe[key].get('needs',[]),job.get('needs',[]),key)
            self.assertEqual(probe[key].get('if'),job.get('if'),key)
        self.assertNotIn('secrets.',str(probe));self.assertNotIn('environment',str(probe))
        workflow_policy.optional_job_status({'jobs':probe},'probe')
    def test_all_transitive_optional_descendants_need_real_status_functions(self):
        original=workflow('release.yml')
        for name in ('assemble','installer','homebrew-native','homebrew','ghcr','attest','publish'):
            for condition in (None,"needs.assemble.result == 'success'","contains('success()', 'success')"):
                data=copy.deepcopy(original)
                if condition is None:data['jobs'][name].pop('if',None)
                else:data['jobs'][name]['if']=condition
                with self.subTest(name=name,condition=condition),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')
