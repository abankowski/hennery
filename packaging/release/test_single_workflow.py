"""Negative authority/DAG tests for the single tagged orchestrator."""
import copy
from pathlib import Path
import unittest

import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


class SingleWorkflow(unittest.TestCase):
    def data(self):
        path=ROOT/'.github/workflows/release.yml'
        self.assertTrue(path.is_file(),'single tag workflow must exist')
        return workflow_policy.load_workflow(path.read_bytes())

    def test_real_workflow_has_only_one_protected_writer(self):
        data=self.data()
        try:workflow_policy.check(data,'release.yml')
        except ValueError as error:self.fail(str(error))
        writers=[name for name,job in data['jobs'].items() if job.get('permissions',{}).get('contents')=='write']
        self.assertEqual(writers,['publish'])
        self.assertEqual(data['jobs']['publish']['environment'],'release')

    def test_environment_switches_are_checked_inside_the_protected_job(self):
        publisher = self.data()['jobs']['publish']
        self.assertEqual(publisher['if'], "${{ !cancelled() && needs.attest.result == 'success' }}")
        verified = next(s for s in publisher['steps'] if s.get('id') == 'verified')
        for switch in ('RELEASE_PUBLICATION_ENABLED', 'RELEASE_GITHUB_ENABLED'):
            self.assertEqual(verified['env'][switch], '${{ vars.' + switch + ' }}')

    def test_id_selected_original_artifact_extracts_at_verifier_paths(self):
        downloads = [s for s in self.data()['jobs']['publish']['steps']
                     if s.get('uses', '').startswith('actions/download-artifact@')]
        self.assertEqual(len(downloads), 1)
        self.assertEqual(downloads[0]['with']['artifact-ids'], '${{ needs.attest.outputs.artifact_id }}')
        self.assertEqual(downloads[0]['with']['path'], 'original')
        self.assertIs(downloads[0]['with'].get('merge-multiple'), True)

    def test_every_authority_guard_refuses_its_removal(self):
        original=self.data()
        for mutation in ['branch','dispatch','outside-write','missing-env','no-attest','no-gate','no-summary','unpin',
                         'ignored','reusable','cache','credential-first','job-secret','channel-switch',
                         'missing-flat-download','missing-switch','unqualified-attest','missing-attest-check','oidc-bypass']:
            data=copy.deepcopy(original);jobs=data['jobs'];publisher=jobs['publish']
            if mutation=='missing-flat-download':
                next(s for s in publisher['steps'] if s.get('uses','').startswith('actions/download-artifact@'))['with'].pop('merge-multiple')
            if mutation=='missing-switch':
                next(s for s in publisher['steps'] if s.get('id')=='verified')['env'].pop('RELEASE_PUBLICATION_ENABLED')
            if mutation=='branch':data['on']={'push':{'branches':['main']}};data.pop(True,None)
            if mutation=='dispatch':data['on']={'workflow_dispatch':{}};data.pop(True,None)
            if mutation=='outside-write':jobs['packaging']['permissions']={'contents':'write'}
            if mutation=='missing-env':publisher.pop('environment')
            if mutation=='no-attest':publisher['needs']=[]
            if mutation=='no-gate':publisher['steps']=[s for s in publisher['steps'] if s.get('id')!='verified']
            if mutation=='no-summary':jobs['attest']['steps']=[s for s in jobs['attest']['steps'] if s.get('id')!='summary']
            if mutation=='unpin':jobs['attest']['steps'][0]['uses']='actions/checkout@v4'
            if mutation=='ignored':jobs['attest']['continue-on-error']=True
            if mutation=='reusable':jobs['packaging']['uses']='./.github/workflows/other.yml'
            if mutation=='cache':jobs['attest']['steps'].append({'uses':'actions/cache@'+'a'*40})
            if mutation=='credential-first':publisher['steps'].insert(0,{'env':{'TOKEN':'${{ secrets.GHCR_PUBLISH_TOKEN }}'},'run':'true'})
            if mutation=='job-secret':publisher['env']={'TOKEN':'${{ secrets.GHCR_PUBLISH_TOKEN }}'}
            if mutation=='channel-switch':next(s for s in publisher['steps'] if s.get('id')=='homebrew-publish')['if']='true'
            if mutation=='unqualified-attest':jobs['attest']['if']=jobs['attest']['if'].replace("needs.packaging.result == 'success'",'true')
            if mutation=='missing-attest-check':jobs['attest']['steps']=[s for s in jobs['attest']['steps'] if 'release_run.py check ' not in s.get('run','')]
            if mutation=='oidc-bypass':next(s for s in publisher['steps'] if s.get('id')=='cratesio')['if']='true'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')
