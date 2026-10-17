"""Offline platform acceptance; registry and live-evidence checks use real policy."""
import copy
from pathlib import Path
import unittest
from unittest.mock import patch

import gate
import post_setup
import run_policy
import settings_audit
import workflow_policy
import test_run_policy
from test_settings import settings


class Platform(unittest.TestCase):
    def setUp(self):
        self.fixture = test_run_policy.RunPolicy()
        self.fixture.setUp()

    def test_original_evidence_is_read_only_and_keeps_original_attempt(self):
        calls=[]
        fixture=self.fixture
        class API:
            def get(self, path):
                calls.append(('get',path))
                return {'/actions/runs/42/attempts/1':fixture.evidence['original'],
                        '/actions/artifacts/77':fixture.evidence['artifact'],
                        '/':{'owner':fixture.evidence['owner']},
                        '/actions/runs/42/approvals':fixture.evidence['reviews']}[path]
        evidence=run_policy.evidence(API(),fixture.metadata,fixture.env)
        self.assertEqual(evidence,fixture.evidence)
        self.assertEqual(len(calls),4)
        self.assertFalse(any('/rulesets' in str(call) or '/environments/' in str(call) for call in calls))

    def test_checked_in_platform_examples_match_policy(self):
        root=Path(__file__).resolve().parents[2]
        rules=gate.strict_json((root/'.github/release-tag-ruleset.json').read_bytes())
        creation=gate.strict_json((root/'.github/release-tag-creation.json').read_bytes())
        self.assertEqual([creation,rules],settings_audit.tag_rulesets(0))
        settings_audit.check_tag_rules([creation,rules],0)
        environment=gate.strict_json((root/'.github/release-environment.example.json').read_bytes())
        self.assertIs(environment['can_admins_bypass'],False)
        self.assertEqual(environment['reviewers'],[{'type':'User','id':0}])
        self.assertEqual(gate.strict_json((root/'.github/release-branch-policy.json').read_bytes()),{'name':'v*','type':'tag'})

    def test_workflow_parser_rejects_missing_mapping_and_duplicate_keys(self):
        for raw in ('[]','jobs: {archive: {}, archive: {}}','jobs: {archive: {}, "\\u0061rchive": {}}',
                    '\ufeffjobs: {archive: {}, archive: {}}'):
            with self.subTest(raw=raw),self.assertRaises(ValueError):workflow_policy.load_workflow(raw)
    def test_environment_bypass_must_be_explicit_false(self):
        for value in (None,True,'false'):
            data=settings();data['environment']['can_admins_bypass']=value
            with self.subTest(value=value),self.assertRaises(gate.Refused):settings_audit.validate_settings(data,['github'])

    def test_negative_ghcr_acceptance_never_receives_any_release_credential(self):
        post_setup.require_no_release_credentials({'GITHUB_TOKEN':'ordinary-token'})
        for name in ('GHCR_PUBLISH_TOKEN','RELEASE_HOMEBREW_TOKEN','RELEASE_CRATES_BOOTSTRAP_TOKEN','CARGO_REGISTRY_TOKEN'):
            with self.subTest(name=name),self.assertRaises(gate.Refused):post_setup.require_no_release_credentials({name:'secret'})

    def test_negative_acceptance_cli_context_and_read_authentication_refuse_before_push(self):
        import contextlib,io,os,sys
        known=b'known';digest=gate.digest(known)
        environment={'GITHUB_ACTIONS':'true','GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_REF':'refs/heads/acceptance',
                     'GITHUB_ACTOR':'marcinwadon','GITHUB_TOKEN':'offline-placeholder','GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'1'}
        calls=[]
        def request(url,headers,method='GET',data=None):
            calls.append((url,method))
            if 'scope=repository:' in url:return 200,gate.canonical({'token':'offline-placeholder'})
            if method=='GET':return 200,known
            return 403,b'denied'
        argv=['post_setup.py','--expected-digest',digest]
        with patch.object(sys,'argv',argv),patch.dict(os.environ,environment,clear=True),patch.object(post_setup,'request',side_effect=request),contextlib.redirect_stdout(io.StringIO()):
            post_setup.main()
        self.assertEqual(calls[-1][1],'PUT')
        for changes in ({'GITHUB_ACTIONS':'false'},{'GITHUB_REPOSITORY':'wrong/repo'},
                        {'GITHUB_REF':'refs/tags/v0.1.0'},{'GHCR_PUBLISH_TOKEN':'placeholder'}):
            with patch.object(sys,'argv',argv),patch.dict(os.environ,environment|changes,clear=True),patch.object(post_setup,'request',side_effect=request) as remote:
                with self.subTest(changes=changes),self.assertRaises(gate.Refused):post_setup.main()
                remote.assert_not_called()
        with patch.object(sys,'argv',['post_setup.py','--expected-digest','bad']),patch.dict(os.environ,environment,clear=True),patch.object(post_setup,'request',side_effect=request) as remote:
            with self.assertRaises(gate.Refused):post_setup.main()
            remote.assert_not_called()
        with patch.object(sys,'argv',argv),patch.dict(os.environ,environment,clear=True),patch.object(post_setup,'request',return_value=(401,gate.canonical({'token':'offline-placeholder'}))) as remote:
            with self.assertRaises(gate.Refused):post_setup.main()
            self.assertEqual(remote.call_count,1)
