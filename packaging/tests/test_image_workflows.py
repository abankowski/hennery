"""GHCR authority lives in the single tagged workflow and protected publisher."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).parents[1]/'release'))
import workflow_policy
ROOT=Path(__file__).parents[2]
class Workflow(unittest.TestCase):
    def setUp(self):self.workflow=workflow_policy.load_workflow((ROOT/'.github/workflows/release.yml').read_bytes())
    def test_bundles_are_local_before_registry_credentials(self):
        signing=self.workflow['jobs']['attest'];writer=self.workflow['jobs']['publish']
        self.assertEqual(writer['needs'],['attest']);self.assertNotIn('environment',signing)
        actions=[s for s in signing['steps'] if s.get('uses','').startswith('actions/attest')]
        self.assertEqual(len(actions),8)
        self.assertTrue(all(s['with'].get('push-to-registry',False) is False for s in actions))
        self.assertFalse(any('GHCR_PUBLISH_TOKEN' in str(s) for s in signing['steps']))
        ids=[s.get('id') for s in writer['steps']]
        self.assertLess(ids.index('ghcr-verify'),ids.index('ghcr-publish'))
        workflow_policy.check(self.workflow,'release.yml')
    def test_each_ghcr_switch_selection_and_boundary_cannot_be_removed(self):
        for mutation in ('switch','selection','gate','environment','oidc-write'):
            changed=copy.deepcopy(self.workflow);writer=changed['jobs']['publish']
            step=next(s for s in writer['steps'] if s.get('id')=='ghcr-publish')
            if mutation=='switch':step['if']=step['if'].replace("vars.RELEASE_GHCR_ENABLED == 'true'",'true')
            if mutation=='selection':step['if']=step['if'].replace("contains(fromJSON(steps.verified.outputs.channels), 'ghcr')",'true')
            if mutation=='gate':writer['steps']=[s for s in writer['steps'] if s.get('id')!='ghcr-verify']
            if mutation=='environment':writer.pop('environment')
            if mutation=='oidc-write':changed['jobs']['attest']['permissions']['contents']='write'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):workflow_policy.check(changed,'release.yml')
