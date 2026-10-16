import copy
from datetime import datetime, timezone
import unittest
from unittest.mock import patch

import contract
import gate
import run_policy


class RunPolicy(unittest.TestCase):
    def setUp(self):
        self.metadata={'schema':2,'repository':gate.REPOSITORY,'tag':'v0.1.0','source_sha':'a'*40,'tag_object':'b'*40,
                       'channels':['github'],'targets':sorted(gate.TARGETS),'attesting':{'run_id':42,'run_attempt':1}}
        self.env={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_REF':'refs/tags/v0.1.0','GITHUB_SHA':'a'*40,
                  'GITHUB_EVENT_NAME':'push','GITHUB_WORKFLOW_REF':gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0',
                  'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'2','RELEASE_ARTIFACT_ID':'77',
                  'RELEASE_ATTESTING_ATTEMPT':'1','RELEASE_PUBLICATION_ENABLED':'true','RELEASE_GITHUB_ENABLED':'true'}
        run={'id':42,'run_attempt':1,'head_sha':'a'*40,'head_branch':'v0.1.0','event':'push','path':contract.WORKFLOW,
             'repository':{'full_name':gate.REPOSITORY},'created_at':'2026-10-01T00:00:00Z'}
        names=['tag-signature','web-ui','assemble','attest',
               'archive (x86_64-unknown-linux-musl, ubuntu-24.04, amd64)',
               'archive (aarch64-unknown-linux-musl, ubuntu-24.04-arm, arm64)',
               'archive (aarch64-apple-darwin, macos-15)']
        names += [f'{job} ({runner})' for job in ('qualification','installer','homebrew-native')
                  for runner in ('ubuntu-24.04','ubuntu-24.04-arm','macos-15')]
        jobs=[{'name':name,'status':'completed','conclusion':'success'} for name in names]
        jobs += [{'name':name,'status':'completed','conclusion':'skipped'} for name in ('crates','ghcr','homebrew')]
        self.evidence={'original':run,'jobs':jobs,'artifact':{'id':77,'name':'attested-release-42-1','expired':False,
             'workflow_run':{'id':42,'head_sha':'a'*40}}, 'owner':{'login':'marcinwadon','id':9},
             'reviews':[{'state':'approved','comment':'publish-run:42:attempt:2','user':{'id':9},'environments':[{'name':'release'}]}]}
        self.now=datetime(2026,10,16,tzinfo=timezone.utc)

    def assert_accepts(self):
        try:
            result=run_policy.validate(self.metadata,self.evidence,self.env,self.now)
        except gate.Refused as error:
            self.fail('real Actions job evidence was refused: '+str(error))
        self.assertEqual(result,self.metadata)

    def test_publish_retry_keeps_original_attesting_attempt(self):
        self.assert_accepts()

    def test_wrong_context_artifact_run_review_and_window_each_refuse(self):
        for field,value in [('GITHUB_REPOSITORY','other/repo'),('GITHUB_REF','refs/heads/main'),('GITHUB_SHA','c'*40),
            ('GITHUB_EVENT_NAME','workflow_dispatch'),('GITHUB_WORKFLOW_REF',self.env['GITHUB_WORKFLOW_REF'].replace('release.yml','other.yml')),
            ('GITHUB_RUN_ID','43'),('GITHUB_RUN_ATTEMPT','52'),('RELEASE_ATTESTING_ATTEMPT','2'),
            ('RELEASE_ARTIFACT_ID','78'),('RELEASE_PUBLICATION_ENABLED','false'),('RELEASE_GITHUB_ENABLED','false')]:
            env=dict(self.env);env[field]=value
            with self.subTest(field=field),self.assertRaises(gate.Refused):run_policy.validate(self.metadata,self.evidence,env,self.now)
        for mutation in ['expired','wrong-artifact-run','wrong-attempt','wrong-source','wrong-workflow','old-window',
                         'missing-review','old-review','other-reviewer','rejected','missing-job','failed-job','skipped-job']:
            data=copy.deepcopy(self.evidence)
            if mutation=='expired':data['artifact']['expired']=True
            if mutation=='wrong-artifact-run':data['artifact']['workflow_run']['id']=43
            if mutation=='wrong-attempt':data['original']['run_attempt']=2
            if mutation=='wrong-source':data['original']['head_sha']='c'*40
            if mutation=='wrong-workflow':data['original']['path']='.github/workflows/other.yml'
            if mutation=='old-window':data['original']['created_at']='2026-09-01T00:00:00Z'
            if mutation=='missing-review':data['reviews']=[]
            if mutation=='old-review':data['reviews'][0]['comment']='publish-run:42:attempt:1'
            if mutation=='other-reviewer':data['reviews'][0]['user']['id']=8
            if mutation=='rejected':data['reviews'][0]['state']='rejected'
            if mutation=='missing-job':data['jobs']=[j for j in data['jobs'] if j['name']!='installer (macos-15)']
            if mutation=='failed-job':data['jobs'][0]['conclusion']='failure'
            if mutation=='skipped-job':data['jobs'][0]['conclusion']='skipped'
            with self.subTest(mutation=mutation),self.assertRaises(gate.Refused):run_policy.validate(self.metadata,data,self.env,self.now)

    def test_selected_acceptance_cannot_be_missing_or_skipped(self):
        meta=copy.deepcopy(self.metadata);meta['targets']=meta['targets'][:1]
        with self.assertRaises(gate.Refused):run_policy.validate(meta,self.evidence,self.env,self.now)
        for channel in ['crates','ghcr','homebrew']:
            meta=copy.deepcopy(self.metadata);meta['channels']=sorted(['github',channel])
            with self.subTest(channel=channel),self.assertRaises(gate.Refused):run_policy.validate(meta,self.evidence,self.env,self.now)

    def test_initial_attempt_requires_owner_approval_without_retry_comment(self):
        self.env['GITHUB_RUN_ATTEMPT']='1';self.evidence['reviews'][0]['comment']=''
        self.assert_accepts()

    def test_matrix_jobs_require_each_exact_expanded_api_name_once(self):
        for mutation in ('missing','duplicate','unknown-platform','bare-name','suffix','wrong-order','unknown-job'):
            data=copy.deepcopy(self.evidence)
            job=next(j for j in data['jobs'] if j['name']=='qualification (ubuntu-24.04-arm)')
            if mutation=='missing':data['jobs'].remove(job)
            if mutation=='duplicate':data['jobs'].append(dict(job))
            if mutation=='unknown-platform':job['name']='qualification (ubuntu-22.04)'
            if mutation=='bare-name':job['name']='qualification'
            if mutation=='suffix':job['name']+=' extra'
            if mutation=='wrong-order':
                next(j for j in data['jobs'] if j['name'].startswith('archive (x86_64'))['name']='archive (ubuntu-24.04, x86_64-unknown-linux-musl, amd64)'
            if mutation=='unknown-job':data['jobs'].append({'name':'unknown','status':'completed','conclusion':'success'})
            with self.subTest(mutation=mutation),self.assertRaises(gate.Refused):
                run_policy.validate(self.metadata,data,self.env,self.now)

    def test_repeated_bare_matrix_names_are_not_real_platform_acceptance(self):
        for job in self.evidence['jobs']:
            job['name']=job['name'].split(' (',1)[0]
        with self.assertRaises(gate.Refused):
            run_policy.validate(self.metadata,self.evidence,self.env,self.now)

    def test_pending_publisher_is_not_an_acceptance_job(self):
        self.evidence['jobs'].append({'name':'publish','status':'in_progress','conclusion':None})
        self.assert_accepts()

    def test_matrix_shape_changes_refuse_until_explicitly_supported(self):
        original=run_policy.workflow_policy.load_workflow((run_policy.ROOT/contract.WORKFLOW).read_bytes())
        for matrix in (None,{}, {'include':[]}, {'include':[{}]}, {'include':'runner'},
                       {'include':[{'runner':123}]}, {'include':[{'runner':'${{ vars.RUNNER }}'}]},
                       {'runner':['ubuntu-24.04'],'include':[{'runner':'macos-15'}]},
                       {'runner':['ubuntu-24.04'],'exclude':[]}, {'runner':[]}, {'runner':'ubuntu-24.04'}):
            data=copy.deepcopy(original)
            data['jobs']['qualification']['strategy']['matrix']=matrix
            with self.subTest(matrix=matrix),patch.object(run_policy.workflow_policy,'load_workflow',return_value=data),self.assertRaises(gate.Refused):
                run_policy.acceptance_names()

    def test_duplicate_workflow_matrix_rows_cannot_collapse_to_one_acceptance(self):
        data=run_policy.workflow_policy.load_workflow((run_policy.ROOT/contract.WORKFLOW).read_bytes())
        data['jobs']['qualification']['strategy']['matrix']['runner']=['ubuntu-24.04','ubuntu-24.04']
        with patch.object(run_policy.workflow_policy,'load_workflow',return_value=data),self.assertRaises(gate.Refused):
            run_policy.acceptance_names()
