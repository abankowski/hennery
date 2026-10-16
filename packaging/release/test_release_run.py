import contextlib
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import contract
import gate
import release_run
import test_contract


class Orchestrator(unittest.TestCase):
    def test_configuration_binds_original_signed_tag_and_checked_source(self):
        workflow=(release_run.ROOT/contract.WORKFLOW).read_bytes()
        for version,channels in [('0.1.0-alpha.1',['github']),('0.1.0',['crates','ghcr','github','homebrew'])]:
            with self.subTest(version=version),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp)
                (root/'Cargo.toml').write_text('[workspace.package]\nversion="'+version+'"\n')
                (root/contract.WORKFLOW).parent.mkdir(parents=True)
                (root/contract.WORKFLOW).write_bytes(workflow)
                (root/'packaging/release').mkdir(parents=True)
                (root/'packaging/release/channels.json').write_bytes(gate.canonical(channels))
                env={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_EVENT_NAME':'push','GITHUB_REF':'refs/tags/v'+version,
                     'GITHUB_REF_NAME':'v'+version,'GITHUB_SHA':'a'*40,'GITHUB_RUN_ATTEMPT':'1'}
                with patch.object(release_run,'ROOT',root),patch.dict(os.environ,env,clear=True),patch.object(release_run.tag_signature,'verify',return_value={'object_sha':'b'*40}) as signature:
                    self.assertEqual(release_run.configuration(),{'channels':channels,'tag_object':'b'*40})
                    signature.assert_called_once_with('v'+version,'a'*40)
                    for field,value in [('GITHUB_RUN_ATTEMPT','2'),('GITHUB_REF','refs/heads/main'),('GITHUB_REPOSITORY','other/repo'),('GITHUB_EVENT_NAME','workflow_dispatch'),('GITHUB_REF_NAME','v9.9.9')]:
                        with self.subTest(field=field),patch.dict(os.environ,{field:value}),self.assertRaises(gate.Refused):release_run.configuration()

    def test_summary_lists_every_asset_and_original_attempt_without_draft(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload';root.mkdir();test_contract.Contract().fixture(root)
            signatures=Path(tmp)/'signatures';signatures.mkdir();(signatures/contract.BUNDLE).write_bytes(b'bundle')
            output=io.StringIO()
            with patch.dict(os.environ,{'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'1'}),contextlib.redirect_stdout(output):
                release_run.summary(root,signatures)
            for directory in (root,signatures):
                for p in directory.iterdir():self.assertIn(p.name,output.getvalue());self.assertIn(gate.digest(p.read_bytes()),output.getvalue())
            self.assertIn('No draft exists',output.getvalue())
            with patch.dict(os.environ,{'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'2'}),self.assertRaises(gate.Refused):release_run.summary(root,signatures)

    def test_attestation_check_refuses_rerun_before_signing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);test_contract.Contract().fixture(root)
            with patch.dict(os.environ,{'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'2'}),self.assertRaises(gate.Refused):
                release_run.check_original(root)

    def test_every_optional_channel_needs_selection_and_its_explicit_switch(self):
        for channel in ('homebrew','crates','ghcr'):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);test_contract.Contract().fixture(root)
                value=contract.load(root)
                with patch.dict(os.environ,{'GH_TOKEN':'offline'}),patch.object(release_run.run_policy,'evidence',return_value={}),patch.object(release_run.run_policy,'validate'),patch.object(release_run.contract,'load',return_value=value),self.assertRaises(gate.Refused):
                    release_run.verify(root,root,channel)
                value['channels']=sorted(['github',channel])
                for flag in ('','false'):
                    with self.subTest(channel=channel,flag=flag),patch.dict(os.environ,{'GH_TOKEN':'offline','RELEASE_'+channel.upper()+'_ENABLED':flag}),patch.object(release_run.run_policy,'evidence',return_value={}),patch.object(release_run.run_policy,'validate'),patch.object(release_run.contract,'load',return_value=value),self.assertRaises(gate.Refused):
                        release_run.verify(root,root,channel)

    def test_channels_require_all_public_immutable_bytes_including_sidecars(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload';root.mkdir();test_contract.Contract().fixture(root)
            signatures=Path(tmp)/'signatures';signatures.mkdir();(signatures/contract.BUNDLE).write_bytes(b'bundle')
            value=contract.load(root);remote={'id':42,'tag_name':value['tag'],'draft':False,'immutable':True}
            files={p.name:p.read_bytes() for folder in (root,signatures) for p in folder.iterdir()}
            assets=[{'name':name} for name in files]
            with patch.object(release_run.publish,'release_assets',return_value=assets),patch.object(release_run.publish,'asset_bytes',side_effect=lambda a:files[a['name']]):
                with patch.object(release_run.publish,'api',return_value=remote):release_run.require_public(root,signatures,value)
                for change in ({'draft':True},{'immutable':False},{'tag_name':'v9.0.0'}):
                    with self.subTest(change=change),patch.object(release_run.publish,'api',return_value=remote|change),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
                with patch.object(release_run.publish,'api',return_value=remote):
                    with patch.object(release_run.publish,'asset_bytes',return_value=b'wrong'),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
                    with patch.object(release_run.publish,'release_assets',return_value=assets[:-1]),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
                    with patch.object(release_run.publish,'release_assets',return_value=assets+assets[:1]),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
