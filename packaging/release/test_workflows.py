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
