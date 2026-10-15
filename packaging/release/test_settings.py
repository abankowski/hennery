import copy
from datetime import datetime, timedelta, timezone
import unittest

import gate
import settings_audit


def settings():
    return {
        'owner': {'login': 'marcinwadon', 'id': 123, 'type': 'User'},
        'environment': {'id': 7, 'name': 'release', 'can_admins_bypass': False,
                        'protection_rules': [{'type': 'required_reviewers', 'reviewers': [{'type': 'User', 'reviewer': {'id': 123}}]}],
                        'deployment_branch_policy': {'protected_branches': False, 'custom_branch_policies': True}},
        'deployment_policies': [{'name': 'v*', 'type': 'tag'}],
        'rulesets': settings_audit.tag_rulesets(123),
        'repository_secrets': [], 'release_secrets': ['RELEASE_PUBLISH_APP_KEY', 'GHCR_PUBLISH_TOKEN'],
        'immutable_releases': True,
        'ghcr': {'repository': gate.REPOSITORY, 'actions_access': 'read', 'dedicated_credential': 'GHCR_PUBLISH_TOKEN',
                 'negative_push': {'read_status': 200, 'push_status': 403, 'credential': 'GITHUB_TOKEN'}},
        'crates': [{'crate': name, 'repository': gate.REPOSITORY, 'workflow': 'release-publish.yml', 'environment': 'release'} for name in settings_audit.CRATES],
    }


class Settings(unittest.TestCase):
    def test_platform_settings_and_each_independent_refusal(self):
        valid = settings(); settings_audit.validate_settings(valid, ['crates', 'ghcr', 'github'])
        mutations = [
            lambda s: s['owner'].update(login='untrusted'),
            lambda s: s.update(deployment_policies=[{'name': 'main', 'type': 'branch'}]),
            lambda s: s['environment'].update(can_admins_bypass=True),
            lambda s: s['environment'].update(deployment_branch_policy=None),
            lambda s: s.update(release_secrets=['GHCR_PUBLISH_TOKEN']),
            lambda s: s['ghcr'].update(dedicated_credential='GITHUB_TOKEN'),
            lambda s: s['crates'].pop(),
            lambda s: s['environment']['protection_rules'][0]['reviewers'][0]['reviewer'].update(id=999),
            lambda s: s['rulesets'][0].update(bypass_actors=[{'actor_type': 'RepositoryRole', 'actor_id': 4, 'bypass_mode': 'always'}]),
            lambda s: s['rulesets'][1].update(bypass_actors=[{'actor_type': 'User', 'actor_id': 123, 'bypass_mode': 'always'}]),
            lambda s: s['rulesets'][1].update(rules=[{'type': 'update'}]),
            lambda s: s.update(repository_secrets=['PUBLISH_TOKEN']),
            lambda s: s.update(immutable_releases=False),
            lambda s: s['ghcr'].update(actions_access='write'),
            lambda s: s['ghcr']['negative_push'].update(push_status=201),
            lambda s: s['ghcr']['negative_push'].update(read_status=401),
            lambda s: s['crates'][0].update(environment=None),
            lambda s: s['crates'][0].update(workflow='branch.yml'),
        ]
        for mutate in mutations:
            bad = copy.deepcopy(valid); mutate(bad)
            with self.subTest(settings=bad), self.assertRaises(gate.Refused):
                settings_audit.validate_settings(bad, ['crates', 'ghcr', 'github'])

    def test_digest_candidate_and_freshness_are_independently_bound(self):
        from test_gate import Gates
        fixture = Gates(); fixture.setUp(); self.addCleanup(fixture.tmp.cleanup)
        now = datetime.now(timezone.utc)
        report = settings_audit.report(fixture.inventory, fixture.digest, settings(), now)
        settings_audit.validate_report(report, gate.digest(gate.canonical(report)), fixture.inventory, fixture.digest, now-timedelta(minutes=1), now)
        for kind in ['digest', 'candidate', 'old', 'before-candidate', 'future', 'auditor']:
            changed = copy.deepcopy(report); expected = gate.digest(gate.canonical(report)); completed = now-timedelta(minutes=1)
            if kind == 'digest': expected = 'f' * 64
            elif kind == 'candidate': changed['candidate']['run_attempt'] += 1
            elif kind == 'old': changed['issued_at'] = (now-timedelta(days=2)).isoformat()
            elif kind == 'before-candidate': completed = now+timedelta(seconds=1)
            elif kind == 'auditor': changed['auditor'] = dict(changed['auditor'], id=999)
            else: changed['issued_at'] = (now+timedelta(hours=1)).isoformat()
            if kind != 'digest': expected = gate.digest(gate.canonical(changed))
            with self.subTest(kind=kind), self.assertRaises(gate.Refused):
                settings_audit.validate_report(changed, expected, fixture.inventory, fixture.digest, completed, now)

    def test_runtime_policy_reader_never_requests_private_settings(self):
        import inspect
        code = inspect.getsource(gate.GitHub.evidence)
        for forbidden in ['/rulesets', '/environments/release']:
            self.assertNotIn(forbidden, code)

    def test_local_audit_checks_signed_tag_before_using_owner_settings_auth(self):
        import contextlib,io,sys,tempfile
        from pathlib import Path
        from unittest.mock import patch
        from test_gate import Gates
        fixture=Gates();fixture.setUp();self.addCleanup(fixture.tmp.cleanup)
        (fixture.root/'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        with tempfile.TemporaryDirectory() as tmp:
            observations=Path(tmp)/'observations.json';observations.write_text('{}')
            argv=['settings_audit.py','--candidate',str(fixture.root),'--observations',str(observations),'--output',str(Path(tmp)/'audit.json')]
            with patch.object(sys,'argv',argv),patch('tag_signature.verify',side_effect=gate.Refused('local signed tag refused')),patch.object(settings_audit,'collect',return_value=settings()) as collect,patch('builtins.input',return_value=gate.REPOSITORY),contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(gate.Refused,'local signed tag refused'):
                    settings_audit.main()
                collect.assert_not_called()
