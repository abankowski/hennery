"""Workflow structure is part of the gate; every privileged job is checked."""
import copy
from pathlib import Path
import re
import unittest
import tempfile
import shutil

import yaml

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]


class Workflows(unittest.TestCase):
    def candidate(self):
        return yaml.safe_load((ROOT / '.github/workflows/release.yml').read_text())

    def test_reserved_channel_names_belong_only_to_their_job_ids(self):
        for channel in ('crates','ghcr','homebrew'):
            data=self.candidate()
            data['jobs'].pop(channel,None)
            data['jobs']['licence-review']={'name':channel,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(channel=channel), self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs(data)

    def test_candidate_job_names_cannot_be_dynamic_or_collide(self):
        for display in ('archive',"${{ 'ghcr' }}",'${{ matrix.name }}',None,42):
            data=self.candidate()
            data['jobs']['licence-review']={'name':display,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(display=display), self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs(data)

    def test_candidate_job_identity_requires_a_valid_jobs_mapping(self):
        for jobs in (None,{},[],{'ordinary':None},{'ordinary.name':{}},{True:{}}):
            with self.subTest(jobs=jobs),self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs({'jobs':jobs})

    def test_channel_owner_has_literal_own_name_and_no_matrix(self):
        for channel in ('crates','ghcr','homebrew'):
            for changed in ({},{'name':channel}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                workflow_policy.channel_jobs(data)
            for changed in ({'name':'archive'},{'name':'ordinary-display'},{'name':"${{ '"+channel+"' }}"},{'strategy':{'matrix':{'os':['ubuntu-24.04']}}}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                with self.subTest(channel=channel,changed=changed), self.assertRaisesRegex(ValueError,'release job identity'):
                    workflow_policy.channel_jobs(data)

    def test_channel_registry_explicitly_maps_a_channel_to_its_owning_job_id(self):
        from unittest.mock import patch
        data=self.candidate()
        data['jobs'].pop('ghcr', None)
        data['jobs']['container-acceptance']={'name':'ghcr','timeout-minutes':5,'steps':[{'run':'true'}]}
        with patch.dict(workflow_policy.CHANNEL_JOB_IDS,{'ghcr':'container-acceptance'}):
            workflow_policy.channel_jobs(data)
            data['jobs']['unrelated']=data['jobs'].pop('container-acceptance')
            with self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs(data)

    def test_candidate_yaml_decoding_cannot_hide_reserved_name_or_duplicate(self):
        base=(ROOT/'.github/workflows/release.yml').read_text()
        variants=[
            '\ufeff'+base+'\n  licence-review:\n    name: "\\u0067hcr"\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
            base+'\n  licence-review:\n    name: ghcr\n    name: ordinary\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
        ]
        for raw in variants:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                (root/'.github/workflows/release.yml').write_text(raw)
                with self.subTest(raw=raw[-150:]),self.assertRaises(ValueError):
                    workflow_policy.check_repository(root)

    def test_all_release_workflows(self):
        workflow_policy.check_repository(ROOT)

    def test_arbitrary_filename_cannot_hide_publication_authority(self):
        for mutation in ('write','secret','environment','reusable'):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                job={'runs-on':'ubuntu-24.04','steps':[{'run':'true'}]}
                if mutation=='write':job['permissions']={'contents':'write'}
                if mutation=='secret':job['environment']='release';job['steps'][0]['env']={'TOKEN':'${{ secrets.RELEASE_HOMEBREW_TOKEN }}'}
                if mutation=='environment':job['environment']='release'
                if mutation=='reusable':job={'uses':'./.github/workflows/other.yml'}
                (root/'.github/workflows/other.yml').write_text(yaml.safe_dump({'on':'push','jobs':{'other':job}}))
                with self.subTest(mutation=mutation),self.assertRaises(ValueError):workflow_policy.check_repository(root)
