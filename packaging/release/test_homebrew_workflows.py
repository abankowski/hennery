import copy
from pathlib import Path
import unittest
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def workflow(name): return workflow_policy.load_workflow((ROOT/'.github/workflows'/name).read_text())


class HomebrewWorkflows(unittest.TestCase):
    def test_channel_has_an_owning_aggregate_job_and_native_acceptance(self):
        data=workflow('release-candidate.yml')
        self.assertEqual(workflow_policy.CHANNEL_JOB_IDS['homebrew'],'homebrew')
        job=data['jobs']['homebrew']
        self.assertEqual(job['name'],'homebrew')
        self.assertIn('homebrew-native',job['needs'])
        native=data['jobs']['homebrew-native']
        self.assertEqual(native['if'], "${{ !cancelled() && needs.assemble.result == 'success' }}")
        self.assertEqual({x['runner'] for x in native['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew_accept.py',str(native))
        self.assertIn('homebrew.py prepare',str(data['jobs']['assemble']))
        self.assertIn('native-archive.sh',str(data['jobs']['archive']))

    def test_pr_proof_is_secret_free_pinned_and_covers_every_advertised_platform(self):
        data=workflow('release-homebrew.yml')
        trigger=data.get('on',data.get(True))
        self.assertIn('pull_request',trigger)
        self.assertIn('packaging/**',trigger['pull_request']['paths'])
        self.assertEqual(data['permissions'],{'contents':'read'})
        self.assertNotIn('secrets.',str(data))
        job=data['jobs']['proof']
        self.assertEqual({x['runner'] for x in job['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew-proof.sh',str(job))
        workflow_policy.check(data,'release-homebrew.yml')

    def test_writer_exposes_tap_credential_only_after_signature_and_both_gates(self):
        data=workflow('release-publish.yml'); job=data['jobs']['homebrew']
        self.assertEqual(job['needs'],['github','authorize'])
        self.assertEqual(job['permissions'],{'contents':'read','actions':'read'})
        self.assertIn("vars.RELEASE_HOMEBREW_ENABLED == 'true'",job['if'])
        steps=job['steps']
        credential=[i for i,s in enumerate(steps) if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s)]
        self.assertEqual(len(credential),1)
        boundary=next(i for i,s in enumerate(steps) if s.get('with',{}).get('phase')=='boundary')
        signature=next(i for i,s in enumerate(steps) if 'verify.py --candidate' in s.get('run',''))
        self.assertLess(signature,boundary);self.assertLess(boundary,credential[0])
        self.assertNotIn('RELEASE_HOMEBREW_TOKEN',str(job.get('env',{})))
        workflow_policy.check(data,'release-publish.yml')

    def test_policy_refuses_early_credential_missing_integrity_or_switch(self):
        data=workflow('release-publish.yml')
        for kind in ('early','job-env','missing-signature','missing-byte-check','missing-switch','ignored-upload','skip-signature'):
            changed=copy.deepcopy(data);job=changed['jobs']['homebrew'];steps=job['steps']
            if kind=='early':
                step=next(s for s in steps if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s));steps.remove(step);steps.insert(0,step)
            elif kind=='job-env': job.setdefault('env',{})['HOMEBREW_TAP_TOKEN']='${{ secrets.RELEASE_HOMEBREW_TOKEN }}'
            elif kind=='missing-signature': job['steps']=[s for s in steps if 'verify.py --candidate' not in s.get('run','')]
            elif kind=='missing-byte-check': job['steps']=[s for s in steps if 'homebrew_publish.py --verify' not in s.get('run','')]
            elif kind=='missing-switch': job['if']=workflow_policy.CREDENTIAL_CONDITION
            elif kind=='ignored-upload': steps[-1]['continue-on-error']=True
            else: next(s for s in steps if 'verify.py --candidate' in s.get('run',''))['if']='false'
            with self.subTest(kind=kind),self.assertRaises(ValueError): workflow_policy.check(changed,'release-publish.yml')

    def test_registered_homebrew_name_cannot_be_stolen_or_missing_when_selected(self):
        data=workflow('release-candidate.yml');data['jobs'].pop('homebrew')
        data['jobs']['ordinary']={'name':'homebrew','timeout-minutes':5,'steps':[{'run':'false'}]}
        with self.assertRaises(ValueError): workflow_policy.check(data,'release-candidate.yml')


    def test_workflow_level_credential_aliases_refuse_before_any_job(self):
        for expression in ("${{ secrets.RELEASE_HOMEBREW_TOKEN }}", "${{ secrets.release_homebrew_token }}",
                           "${{ secrets['RELEASE_HOMEBREW_TOKEN'] }}", '${{ secrets["release_homebrew_token"] }}'):
            data=workflow('release-publish.yml');data['env']={'HOMEBREW_TAP_TOKEN':expression}
            with self.subTest(expression=expression),self.assertRaises(ValueError):workflow_policy.check(data,'release-publish.yml')


    def test_renamed_job_and_workflow_cannot_hide_an_early_tap_credential(self):
        data=workflow('release-publish.yml')
        job=data['jobs'].pop('homebrew');data['jobs']['tap-mirror']=job
        steps=job['steps'];step=next(s for s in steps if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s))
        steps.remove(step);steps.insert(0,step)
        with self.assertRaises(ValueError): workflow_policy.check(data,'generated.yml')


if __name__=='__main__': unittest.main()
