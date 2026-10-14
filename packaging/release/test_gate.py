"""Offline acceptance. No test contacts GitHub or any registry."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import gate


class Gates(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'archive').write_bytes(b'approved bytes')
        self.inventory = {
            'schema': 1, 'repository': 'marcinwadon/hennery', 'tag': 'v0.1.0-alpha.1',
            'source_sha': 'a' * 40, 'channels': ['github'], 'targets': ['aarch64-apple-darwin'],
            'candidate': {'run_id': 10, 'run_attempt': 1},
            'artifacts': [{'name': 'archive', 'sha256': hashlib.sha256(b'approved bytes').hexdigest(), 'size': 14}],
        }
        self.digest = gate.digest(gate.canonical(self.inventory))
        self.context = gate.binding(self.inventory, self.digest, 20, 1)
        self.snapshot = {
            'environment': {'id': 7, 'name': 'release', 'can_admins_bypass': False,
                            'protection_rules': [{'type': 'required_reviewers', 'reviewers': [{'type': 'User', 'reviewer': {'id': 123}}]}],
                            'deployment_branch_policy': {'protected_branches': False, 'custom_branch_policies': True}},
            'branch_policies': [{'name': 'main', 'type': 'branch'}],
            'rulesets': [gate.frozen_tag_ruleset()],
            'tag': {'object': {'type': 'tag', 'sha': 'b' * 40}},
            'tag_object': {'tag': self.inventory['tag'], 'object': {'type': 'commit', 'sha': 'a' * 40}},
            'candidate_run': {'id': 10, 'run_attempt': 1, 'head_sha': 'a' * 40, 'head_repository': {'full_name': 'marcinwadon/hennery'},
                              'event': 'push', 'path': '.github/workflows/release-candidate.yml', 'status': 'completed', 'conclusion': 'success'},
            'publisher_run': {'id': 20, 'run_attempt': 1, 'head_sha': 'c' * 40, 'head_branch': 'main', 'event': 'workflow_dispatch',
                              'path': '.github/workflows/release-publish.yml', 'repository': {'full_name': 'marcinwadon/hennery'}},
            'reviews': [{'state': 'approved', 'user': {'id': 123, 'login': 'maintainer'}, 'environments': [{'id': 7, 'name': 'release'}],
                         'comment': gate.challenge(self.context)}],
            'checks': [],
        }
        for path in gate.REQUIRED_WORKFLOWS:
            self.snapshot['checks'].append({'path': path, 'head_sha': 'a' * 40, 'event': 'push', 'head_repository': {'full_name': 'marcinwadon/hennery'},
                                            'status': 'completed', 'conclusion': 'success', 'id': len(self.snapshot['checks']) + 1})

    def validate(self):
        return gate.validate(self.inventory, self.digest, self.root, self.context, self.snapshot)

    def test_approved(self):
        self.assertEqual(self.validate()['approver']['id'], 123)

    def test_independent_refusals(self):
        # Every case changes exactly one otherwise passing input.
        cases = {
            'environment absent': lambda s: s.pop('environment'),
            'admin bypass': lambda s: s['environment'].update(can_admins_bypass=True),
            'reviewers absent': lambda s: s['environment'].update(protection_rules=[]),
            'broad deployment branches': lambda s: s['branch_policies'].append({'name': '*', 'type': 'branch'}),
            'unrestricted environment': lambda s: s['environment'].update(deployment_branch_policy=None),
            'no tag rules': lambda s: s.update(rulesets=[]),
            'tag bypass': lambda s: s['rulesets'][0].update(bypass_actors=[{'actor_type': 'RepositoryRole', 'actor_id': 5}]),
            'tag rule inactive': lambda s: s['rulesets'][0].update(enforcement='disabled'),
            'tag rule exclude': lambda s: s['rulesets'][0]['conditions']['ref_name'].update(exclude=['refs/tags/v*']),
            'tag deleted': lambda s: s.update(tag=None),
            'tag moved': lambda s: s['tag_object']['object'].update(sha='d' * 40),
            'lightweight tag': lambda s: s['tag']['object'].update(type='commit'),
            'approval absent': lambda s: s.update(reviews=[]),
            'unauthorized reviewer': lambda s: s['reviews'][0]['user'].update(id=999),
            'rejected decision': lambda s: s['reviews'][0].update(state='rejected'),
            'different environment': lambda s: s['reviews'][0].update(environments=[{'id': 8, 'name': 'release'}]),
            'unbound approval': lambda s: s['reviews'][0].update(comment='approved'),
            'candidate rerun': lambda s: s['candidate_run'].update(run_attempt=2),
            'candidate wrong SHA': lambda s: s['candidate_run'].update(head_sha='d' * 40),
            'candidate PR': lambda s: s['candidate_run'].update(event='pull_request'),
            'candidate wrong workflow': lambda s: s['candidate_run'].update(path='.github/workflows/build.yml'),
            'publisher rerun': lambda s: s['publisher_run'].update(run_attempt=2),
            'publisher branch': lambda s: s['publisher_run'].update(head_branch='feature'),
            'publisher event': lambda s: s['publisher_run'].update(event='push'),
            'checks missing': lambda s: s.update(checks=[]),
            'checks pending': lambda s: s['checks'][0].update(status='in_progress'),
            'checks failed': lambda s: s['checks'][0].update(conclusion='failure'),
            'checks cancelled': lambda s: s['checks'][0].update(conclusion='cancelled'),
            'checks skipped': lambda s: s['checks'][0].update(conclusion='skipped'),
            'checks other SHA': lambda s: s['checks'][0].update(head_sha='d' * 40),
            'checks wrong workflow': lambda s: s['checks'][0].update(path='.github/workflows/other.yml'),
            'checks PR merge ref': lambda s: s['checks'][0].update(event='pull_request'),
            'checks fork': lambda s: s['checks'][0].update(head_repository={'full_name': 'fork/hennery'}),
        }
        for name, mutate in cases.items():
            with self.subTest(name=name):
                original = self.snapshot
                self.snapshot = copy.deepcopy(original)
                mutate(self.snapshot)
                with self.assertRaises(gate.Refused):
                    self.validate()
                self.snapshot = original

    def test_each_tag_operation_refused_without_rule(self):
        for operation in ('creation', 'update', 'deletion'):
            with self.subTest(operation=operation):
                s = copy.deepcopy(self.snapshot)
                s['rulesets'][0]['rules'] = [r for r in s['rulesets'][0]['rules'] if r['type'] != operation]
                with self.assertRaises(gate.Refused):
                    gate.validate(self.inventory, self.digest, self.root, self.context, s)

    def test_binding_each_field(self):
        for field, value in [('inventory_sha256', 'f' * 64), ('source_sha', 'f' * 40), ('tag', 'v0.1.0'),
                             ('channels', ['crates']), ('targets', ['x86_64-unknown-linux-musl']),
                             ('candidate', {'run_id': 11, 'run_attempt': 1}),
                             ('publishing', {'run_id': 21, 'run_attempt': 1}),
                             ('publishing', {'run_id': 20, 'run_attempt': 2})]:
            with self.subTest(field=field, value=value):
                context = copy.deepcopy(self.context)
                context[field] = value
                with self.assertRaises(gate.Refused):
                    gate.validate(self.inventory, self.digest, self.root, context, self.snapshot)

    def test_byte_change_between_boundaries(self):
        self.validate()
        (self.root / 'archive').write_bytes(b'changed bytes!')
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_missing_candidate(self):
        (self.root / 'archive').unlink()
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_extra_candidate(self):
        (self.root / 'unapproved').write_bytes(b'new')
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_symlink(self):
        (self.root / 'archive').unlink()
        (self.root / 'archive').symlink_to('/etc/passwd')
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_strict_json(self):
        for raw in ('{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '\ufeff{}', '{"X":1,"x":2}'):
            with self.subTest(raw=raw), self.assertRaises(gate.Refused):
                gate.strict_json(raw)

    def test_reconciliation(self):
        remote = {'archive': (self.root / 'archive').read_bytes()}
        self.assertEqual(gate.reconcile(self.inventory, self.root, remote), {'complete': ['archive'], 'missing': []})
        self.assertEqual(gate.reconcile(self.inventory, self.root, {}), {'complete': [], 'missing': ['archive']})
        for bad in ({'archive': b'wrong'}, {'archive': None}):
            with self.assertRaises(gate.Refused):
                gate.reconcile(self.inventory, self.root, bad)
        (self.root / 'archive').unlink()
        with self.assertRaises(gate.Refused):
            gate.reconcile(self.inventory, self.root, remote)


if __name__ == '__main__':
    unittest.main()
