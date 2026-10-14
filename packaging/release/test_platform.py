import copy
import unittest

import gate
import test_gate


class Platform(unittest.TestCase):
    def fixture(self):
        fixture = test_gate.Gates()
        fixture.setUp()
        self.addCleanup(fixture.tmp.cleanup)
        return fixture

    def test_skipped_jobs_cannot_hide_in_successful_workflow(self):
        fixture = self.fixture()
        class Fake(gate.GitHub):
            def get(self, path):
                if path.startswith('/git/ref/'):
                    return fixture.snapshot['tag']
                if path.startswith('/git/tags/'):
                    return fixture.snapshot['tag_object']
                if path.startswith('/rulesets/'):
                    return gate.frozen_tag_ruleset()
                if path == '/environments/release':
                    return fixture.snapshot['environment']
                if path == '/actions/runs/10':
                    return fixture.snapshot['candidate_run']
                if path == '/actions/runs/20':
                    return fixture.snapshot['publisher_run']
                if path == '/actions/runs/20/approvals':
                    return fixture.snapshot['reviews']
                raise AssertionError(path)

            def pages(self, path, key=None):
                if path == '/rulesets':
                    return [{'id': 99}]
                if path.endswith('/deployment-branch-policies'):
                    return fixture.snapshot['branch_policies']
                if path.startswith('/actions/runs?'):
                    return [dict(r, run_attempt=1) for r in fixture.snapshot['checks']]
                if path.endswith('/jobs'):
                    return self.jobs
                raise AssertionError(path)

        client = Fake('offline-fixture')
        client.jobs = [{'status': 'completed', 'conclusion': 'success'}]
        snapshot = client.evidence(fixture.inventory, fixture.context)
        gate.validate(fixture.inventory, fixture.digest, fixture.root, fixture.context, snapshot)
        for jobs in ([], [{'status': 'completed', 'conclusion': 'skipped'}], [{'status': 'queued', 'conclusion': None}],
                     [{'status': 'completed', 'conclusion': 'cancelled'}]):
            client.jobs = jobs
            with self.subTest(jobs=jobs), self.assertRaises(gate.Refused):
                client.evidence(fixture.inventory, fixture.context)

    def test_checked_in_settings_match_the_validated_policy(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        rules = gate.strict_json((root / '.github/release-tag-ruleset.json').read_bytes())
        self.assertEqual(rules, gate.frozen_tag_ruleset())
        gate.check_tag_rules([rules])
        environment = gate.strict_json((root / '.github/release-environment.example.json').read_bytes())
        self.assertIs(environment['can_admins_bypass'], False)
        self.assertEqual(environment['reviewers'], [{'type': 'User', 'id': 0}])
        self.assertEqual(gate.strict_json((root / '.github/release-branch-policy.json').read_bytes()), {'name': 'main', 'type': 'branch'})

    def test_environment_bypass_must_be_explicit_false(self):
        fixture = self.fixture()
        for value in (None, True, 'false'):
            fixture.snapshot['environment']['can_admins_bypass'] = value
            with self.subTest(value=value), self.assertRaises(gate.Refused):
                fixture.validate()


if __name__ == '__main__':
    unittest.main()
