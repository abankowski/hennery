import copy
import base64
import json
import unittest

import gate
import test_gate
import settings_audit


def workflow_content(workflow):
    return {'type':'file','path':'.github/workflows/release-candidate.yml','encoding':'base64',
            'content':base64.b64encode(json.dumps(workflow).encode()).decode()}


class Platform(unittest.TestCase):
    def fixture(self):
        fixture = test_gate.Gates()
        fixture.setUp()
        self.addCleanup(fixture.tmp.cleanup)
        return fixture

    def test_skipped_jobs_cannot_hide_in_successful_workflow(self):
        fixture = self.fixture()
        class Fake(gate.GitHub):
            def verify_tag(self, inventory, object_sha):
                return fixture.snapshot['tag_signature']

            def get(self, path):
                if path == '/contents/.github/workflows/release-candidate.yml?ref='+fixture.inventory['source_sha']:
                    return workflow_content({'jobs':{'archive':{},'crates':{},'ghcr':{}}})
                if path.startswith('/git/ref/'):
                    return fixture.snapshot['tag']
                if path.startswith('/git/tags/'):
                    return fixture.snapshot['tag_object']
                if path.startswith('/rulesets/'):
                    raise AssertionError('publishers must not read private ruleset settings')
                if path == '/environments/release':
                    raise AssertionError('publishers must not read private environment settings')
                if path == '/actions/runs/10':
                    return fixture.snapshot['candidate_run']
                if path == '/actions/runs/20':
                    return fixture.snapshot['publisher_run']
                if path == '/actions/runs/20/approvals':
                    return fixture.snapshot['reviews']
                raise AssertionError(path)

            def pages(self, path, key=None):
                if path == '/rulesets':
                    raise AssertionError('publishers must not inspect ruleset bypass actors')
                if path.endswith('/deployment-branch-policies'):
                    raise AssertionError('publishers must use the approved settings audit')
                if path.startswith('/actions/runs?'):
                    return [dict(r, run_attempt=1) for r in fixture.snapshot['checks']]
                if path.endswith('/jobs'):
                    return self.jobs
                raise AssertionError(path)

        client = Fake('offline-fixture')
        client.jobs = [{'status': 'completed', 'conclusion': 'success'}]
        snapshot = client.evidence(fixture.inventory, fixture.context, fixture.snapshot['settings_audit'])
        gate.validate(fixture.inventory, fixture.digest, fixture.root, fixture.context, snapshot)
        for jobs in ([], [{'status': 'completed', 'conclusion': 'skipped'}], [{'status': 'queued', 'conclusion': None}],
                     [{'status': 'completed', 'conclusion': 'cancelled'}]):
            client.jobs = jobs
            with self.subTest(jobs=jobs), self.assertRaises(gate.Refused):
                client.evidence(fixture.inventory, fixture.context, fixture.snapshot['settings_audit'])

    def test_checked_in_settings_match_the_validated_policy(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        rules = gate.strict_json((root / '.github/release-tag-ruleset.json').read_bytes())
        creation = gate.strict_json((root / '.github/release-tag-creation.json').read_bytes())
        self.assertEqual([creation, rules], settings_audit.tag_rulesets(0))
        gate.check_tag_rules([creation, rules], 0)
        environment = gate.strict_json((root / '.github/release-environment.example.json').read_bytes())
        self.assertIs(environment['can_admins_bypass'], False)
        self.assertEqual(environment['reviewers'], [{'type': 'User', 'id': 0}])
        self.assertEqual(gate.strict_json((root / '.github/release-branch-policy.json').read_bytes()), {'name': 'v*', 'type': 'tag'})

    def candidate_evidence(self, channels, jobs, required_jobs=None, workflow=None, validate=False):
        fixture = self.fixture()
        fixture.inventory['channels'] = channels
        if workflow is None: workflow={'jobs':{'archive':{},'crates':{},'ghcr':{}}}
        class Fake(gate.GitHub):
            def verify_tag(self, inventory, object_sha):
                return fixture.snapshot['tag_signature']

            def get(self, path):
                if path == '/contents/.github/workflows/release-candidate.yml?ref='+fixture.inventory['source_sha']:
                    if workflow is False: raise gate.Refused('fixture workflow unavailable')
                    return workflow_content(workflow)
                if path.startswith('/git/ref/'): return fixture.snapshot['tag']
                if path.startswith('/git/tags/'): return fixture.snapshot['tag_object']
                return {
                    '/actions/runs/10': fixture.snapshot['candidate_run'],
                    '/actions/runs/20': fixture.snapshot['publisher_run'],
                    '/actions/runs/20/approvals': fixture.snapshot['reviews'],
                }[path]

            def pages(self, path, key=None):
                if path.startswith('/actions/runs?'):
                    return [dict(r, run_attempt=1) for r in fixture.snapshot['checks']]
                if path == '/actions/runs/10/attempts/1/jobs': return jobs
                if path.endswith('/jobs'):
                    return required_jobs if required_jobs is not None else [{'status':'completed','conclusion':'success'}]
                raise AssertionError(path)
        snapshot=Fake('offline-fixture').evidence(fixture.inventory, fixture.context, fixture.snapshot['settings_audit'])
        if validate: gate.validate(fixture.inventory, fixture.digest, fixture.root, fixture.context, snapshot)
        return snapshot

    @staticmethod
    def job(name, conclusion='success', status='completed'):
        return {'name':name,'status':status,'conclusion':conclusion}

    def test_github_only_accepts_unselected_crates_and_ghcr_skips(self):
        self.candidate_evidence(['github'], [self.job('archive'), self.job('crates','skipped'), self.job('ghcr','skipped')])
        self.candidate_evidence(['github'], [self.job('archive')])
        self.candidate_evidence(['github'], [self.job('archive'),self.job('crates'),self.job('ghcr')])

    def test_selected_channel_acceptance_must_exist_and_succeed(self):
        for channel in ('crates','ghcr'):
            self.candidate_evidence(['github',channel], [self.job('archive'),self.job(channel)])
            for jobs in ([], [self.job(channel,'skipped')], [self.job(channel,'failure')],
                         [self.job(channel,'cancelled')], [self.job(channel,None,'queued')],
                         [self.job(channel),self.job(channel)]):
                with self.subTest(channel=channel,jobs=jobs), self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github',channel], [self.job('archive'),*jobs])

    def test_optional_channels_do_not_waive_failures_or_other_skipped_jobs(self):
        for channel in ('crates','ghcr'):
            for job in (self.job(channel,'failure'),self.job(channel,'skipped','queued'),self.job(channel,'cancelled')):
                with self.subTest(channel=channel,job=job), self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github'],[self.job('archive'),job])
            with self.subTest(duplicate=channel), self.assertRaises(gate.Refused):
                self.candidate_evidence(['github'],[self.job('archive'),self.job(channel,'skipped'),self.job(channel,'skipped')])
        with self.assertRaises(gate.Refused):
            self.candidate_evidence(['github'],[self.job('archive','skipped'),self.job('crates','skipped')])

    def test_unselected_channel_cannot_skip_a_required_workflow_job(self):
        with self.assertRaises(gate.Refused):
            self.candidate_evidence(['github'],[self.job('archive')],required_jobs=[self.job('crates','skipped')])

    def test_each_selected_channel_is_required_when_both_are_selected(self):
        channels=['github','crates','ghcr']
        self.candidate_evidence(channels,[self.job('archive'),self.job('crates'),self.job('ghcr')])
        for channel in ('crates','ghcr'):
            with self.subTest(channel=channel), self.assertRaises(gate.Refused):
                self.candidate_evidence(channels,[self.job('archive'),self.job(channel)])

    def test_candidate_crates_job_has_registered_platform_name(self):
        from pathlib import Path
        import yaml
        workflow=yaml.safe_load((Path(__file__).resolve().parents[2]/'.github/workflows/release-candidate.yml').read_text())
        self.assertEqual(workflow['jobs']['crates'].get('name','crates'),'crates')
        self.assertIn("',crates,'",workflow['jobs']['crates']['if'])

    def test_ordinary_job_renamed_to_reserved_channel_cannot_be_exempted(self):
        for channel in ('crates','ghcr'):
            for owner_present in (False,True):
                workflow={'jobs':{'archive':{},'licence-review':{'name':channel}}}
                if owner_present: workflow['jobs'][channel]={'name':channel}
                with self.subTest(channel=channel,owner_present=owner_present), self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github'],[self.job('archive'),self.job(channel,'skipped')],workflow=workflow,validate=True)

    def test_dynamic_job_name_cannot_claim_reserved_channel_at_runtime(self):
        for expression in ("${{ 'ghcr' }}",'${{ matrix.name }}'):
            workflow={'jobs':{'archive':{},'licence-review':{'name':expression}}}
            with self.subTest(expression=expression), self.assertRaises(gate.Refused):
                self.candidate_evidence(['github'],[self.job('archive'),self.job('ghcr','skipped')],workflow=workflow)

    def test_reserved_evidence_name_requires_owner_in_tagged_workflow(self):
        for channel in ('crates','ghcr'):
            for selected in (False,True):
                with self.subTest(channel=channel,selected=selected),self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github',channel] if selected else ['github'],
                                            [self.job('archive'),self.job(channel,'success' if selected else 'skipped')],
                                            workflow={'jobs':{'archive':{}}})

    def test_tagged_workflow_unavailable_refuses_even_unselected_channels(self):
        with self.assertRaises(gate.Refused):
            self.candidate_evidence(['github'],[self.job('archive')],workflow=False)

    def test_ghcr_waits_for_its_registered_owner_in_the_tagged_workflow(self):
        from pathlib import Path
        import yaml
        workflow=yaml.safe_load((Path(__file__).resolve().parents[2]/'.github/workflows/release-candidate.yml').read_text())
        # Model a signed workflow before R4 adds its aggregate owner. This
        # negative fixture must remain valid after that integration lands.
        workflow['jobs'].pop('ghcr',None)
        for extra in ([],[self.job('ghcr')]):
            with self.subTest(extra=extra),self.assertRaises(gate.Refused):
                self.candidate_evidence(['github','ghcr'],[self.job('archive'),*extra],workflow=workflow)

    def test_runtime_registry_uses_explicit_channel_to_owner_mapping(self):
        from unittest.mock import patch
        import workflow_policy
        workflow={'jobs':{'archive':{},'container-acceptance':{'name':'ghcr'}}}
        with patch.dict(workflow_policy.CHANNEL_JOB_IDS,{'ghcr':'container-acceptance'}):
            self.candidate_evidence(['github','ghcr'],[self.job('archive'),self.job('ghcr')],workflow=workflow)

    def test_candidate_workflow_content_must_be_a_valid_file_at_the_pinned_path(self):
        from unittest.mock import patch
        valid=workflow_content({'jobs':{'archive':{}}})
        for change in ({'type':'dir'},{'path':'another.yml'},{'encoding':'raw'},{'content':'not-base64'},
                       {'content':None},{'content':base64.b64encode(b'[]').decode()},
                       {'content':base64.b64encode(b'jobs: {archive: {}, archive: {}}').decode()}):
            client=gate.GitHub('offline-fixture')
            with self.subTest(change=change),patch.object(client,'get',return_value=valid|change),self.assertRaises(gate.Refused):
                client.candidate_channels('a'*40)

    def test_environment_bypass_must_be_explicit_false(self):
        fixture = self.fixture()
        for value in (None, True, 'false'):
            fixture.snapshot['settings_audit']['settings']['environment']['can_admins_bypass'] = value
            with self.subTest(value=value), self.assertRaises(gate.Refused):
                fixture.validate()


if __name__ == '__main__':
    unittest.main()
