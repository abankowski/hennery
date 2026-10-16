import copy
from pathlib import Path
import unittest
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def workflow(name): return workflow_policy.load_workflow((ROOT/'.github/workflows'/name).read_text())


class HomebrewWorkflows(unittest.TestCase):
    def test_channel_has_an_owning_aggregate_job_and_native_acceptance(self):
        data=workflow('release.yml')
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

    def test_writer_exposes_tap_credential_only_after_immutable_release_and_verifier(self):
        data=workflow('release.yml');job=data['jobs']['publish'];steps=job['steps']
        self.assertEqual(job['environment'],'release')
        credential=[i for i,s in enumerate(steps) if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s)]
        self.assertEqual(len(credential),1)
        ids=[s.get('id') for s in steps]
        self.assertLess(ids.index('github-publish'),ids.index('homebrew-verify'))
        self.assertLess(ids.index('homebrew-verify'),credential[0])
        self.assertIn("vars.RELEASE_HOMEBREW_ENABLED == 'true'",steps[credential[0]]['if'])
        self.assertNotIn('RELEASE_HOMEBREW_TOKEN',str(job.get('env',{})))
        workflow_policy.check(data,'release.yml')

    def test_policy_refuses_each_missing_or_ignored_tap_boundary(self):
        for kind in ('early','job-env','missing-verifier','missing-switch','ignored-upload','skip-verifier'):
            data=workflow('release.yml');job=data['jobs']['publish'];steps=job['steps']
            verify=next(s for s in steps if s.get('id')=='homebrew-verify')
            upload=next(s for s in steps if s.get('id')=='homebrew-publish')
            if kind=='early':steps.remove(upload);steps.insert(0,upload)
            if kind=='job-env':job['env']={'TOKEN':'${{ secrets.RELEASE_HOMEBREW_TOKEN }}'}
            if kind=='missing-verifier':steps.remove(verify)
            if kind=='missing-switch':upload['if']='true'
            if kind=='ignored-upload':upload['continue-on-error']=True
            if kind=='skip-verifier':verify['if']='false'
            with self.subTest(kind=kind),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')

    def test_workflow_level_credential_aliases_refuse(self):
        for expression in ("${{ secrets.RELEASE_HOMEBREW_TOKEN }}", "${{ secrets.release_homebrew_token }}",
                           "${{ secrets['RELEASE_HOMEBREW_TOKEN'] }}", '${{ secrets["release_homebrew_token"] }}'):
            data=workflow('release.yml');data['env']={'TOKEN':expression}
            with self.subTest(expression=expression),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')

    def test_unrelated_read_only_job_cannot_hide_publication_secret(self):
        import tempfile,shutil,yaml
        for expression in ("${{ secrets.RELEASE_HOMEBREW_TOKEN }}","${{ secrets['release_homebrew_token'] }}"):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                (root/'.github/workflows/other.yml').write_text(yaml.safe_dump({'on':'push','permissions':{'contents':'read'},'jobs':{'ordinary':{'runs-on':'ubuntu-24.04','steps':[{'env':{'TOKEN':expression},'run':'true'}]}}}))
                with self.subTest(expression=expression),self.assertRaises(ValueError):workflow_policy.check_repository(root)
