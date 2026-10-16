import copy
from datetime import datetime, timezone
import unittest

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
        jobs=[{'name':name,'status':'completed','conclusion':'success'} for name in
              ('tag-signature','qualification','web-ui','archive','assemble','installer','attest','homebrew-native')]
        jobs += [dict(j) for j in list(jobs) if j['name'] in ('qualification','archive','installer','homebrew-native') for _ in range(2)]
        jobs += [{'name':name,'status':'completed','conclusion':'skipped'} for name in ('crates','ghcr','homebrew')]
        self.evidence={'original':run,'jobs':jobs,'artifact':{'id':77,'name':'attested-release-42-1','expired':False,
             'workflow_run':{'id':42,'head_sha':'a'*40}}, 'owner':{'login':'marcinwadon','id':9},
             'reviews':[{'state':'approved','comment':'publish-run:42:attempt:2','user':{'id':9},'environments':[{'name':'release'}]}]}
        self.now=datetime(2026,10,16,tzinfo=timezone.utc)

    def test_publish_retry_keeps_original_attesting_attempt(self):
        self.assertEqual(run_policy.validate(self.metadata,self.evidence,self.env,self.now),self.metadata)

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
            if mutation=='missing-job':data['jobs']=[j for j in data['jobs'] if j['name']!='installer']
            if mutation=='failed-job':data['jobs'][0]['conclusion']='failure'
            if mutation=='skipped-job':data['jobs'][0]['conclusion']='skipped'
            with self.subTest(mutation=mutation),self.assertRaises(gate.Refused):run_policy.validate(self.metadata,data,self.env,self.now)

    def test_selected_acceptance_cannot_be_missing_or_skipped(self):
        for channel in ['crates','ghcr','homebrew']:
            meta=copy.deepcopy(self.metadata);meta['channels']=sorted(['github',channel])
            with self.subTest(channel=channel),self.assertRaises(gate.Refused):run_policy.validate(meta,self.evidence,self.env,self.now)

    def test_initial_attempt_requires_owner_approval_without_retry_comment(self):
        self.env['GITHUB_RUN_ATTEMPT']='1';self.evidence['reviews'][0]['comment']=''
        self.assertEqual(run_policy.validate(self.metadata,self.evidence,self.env,self.now),self.metadata)
