"""Folded GHCR lifecycle with standard attachment transport and no registry access.

Real OCI closure lives in test_release_images; actual HTTP status classification
lives in test_ghcr_remote; authentic crypto lives in test_verify_cli.
"""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parents[1]/'release'))
import channel_publish as publisher
import gate


class GHCR(unittest.TestCase):
    def execute(self, mode='new'):
        self.events=[];self.copies=0;self.attaches=0;self.tags=[];present=mode in ('present','partial')
        digest='sha256:'+'a'*64
        version_present=present
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);value={'tag':'v0.1.0'}
            def reconcile(*args):
                self.events.append('reconcile')
                if mode in ('conflict','unauthorized','timeout'):raise gate.Refused('remote refused')
                if mode=='late-conflict' and self.attaches==7:raise gate.Refused('new conflicting version')
                if args[0]=='0.1.0':return 0 if version_present or '0.1.0' in self.tags else 1
                if args[0]=='latest':return 0 if 'latest' in self.tags else 1
                return 0 if present else 1
            def run(command,**kwargs):
                nonlocal present
                operation=command[0]+' '+command[1];self.events.append(operation)
                if operation=='skopeo login':
                    self.assertEqual(kwargs['input'],'offline-credential')
                    self.assertNotIn('offline-credential',str(command))
                    Path(command[command.index('--authfile')+1]).write_text('{}')
                if operation=='skopeo copy':
                    self.assertIn('--preserve-digests',command);self.assertIn('--all',command)
                    if command[-1]=='docker://ghcr.io/marcinwadon/hennery@'+digest:
                        self.copies+=1
                        self.assertNotIn(':latest',' '.join(command));self.assertNotIn(':0.1.0',' '.join(command));present=True
                        if mode=='copy-failure':raise subprocess.CalledProcessError(1,command)
                    else:
                        self.assertEqual(command[-2],'docker://ghcr.io/marcinwadon/hennery@'+digest)
                        self.assertIn(command[-1],['docker://ghcr.io/marcinwadon/hennery:0.1.0','docker://ghcr.io/marcinwadon/hennery:latest'])
                        self.assertEqual(self.attaches,7);self.assertIn('fetched-verify',self.events)
                        self.tags.append(command[-1].split(':')[-1])
            def attach(digest,predicate,bundle,auth,environment):
                self.assertNotIn('GH_TOKEN',environment)
                self.assertNotIn('ACTIONS_ID_TOKEN_REQUEST_TOKEN',environment)
                self.attaches+=1
                if mode=='attach-failure':raise subprocess.CalledProcessError(1,['oras','attach'])
            def fetched(*args,**kwargs):
                self.events.append('fetched-verify')
                self.assertEqual(kwargs['github_token'],'write-canary')
                if mode=='remote-failure':raise gate.Refused('fetched signature refused')
            subjects=[('index','provenance',digest,'slsa',root/'index.json')]+[(arch,kind,digest,'slsa' if kind=='provenance' else 'spdx',root/(arch+kind+'.json')) for arch in ('amd64','arm64') for kind in ('provenance','image-sbom','binary-sbom')]
            for *_,bundle in subjects:bundle.write_bytes(b'bundle')
            with patch.dict(os.environ,{'GHCR_PUBLISH_TOKEN':'offline-credential','GHCR_PUBLISH_USER':'fixture','GH_TOKEN':'write-canary','ACTIONS_ID_TOKEN_REQUEST_TOKEN':'oidc-canary'}),patch.object(publisher,'materialize_image',return_value={'digest':digest}),patch.object(publisher,'registry_helper',return_value=SimpleNamespace(reconcile=reconcile)),patch.object(publisher,'check_images',side_effect=AssertionError('repeated image verification')),patch.object(publisher,'image_subjects',return_value=subjects),patch.object(publisher,'attach_bundle',side_effect=attach),patch.object(publisher.verify,'verify_image_subject',side_effect=fetched),patch.object(publisher.subprocess,'run',side_effect=run):
                return publisher.publish(root,root,'ghcr',{'metadata':value,'signatures':{s[-1].name:gate.digest(b'bundle') for s in subjects}})

    def test_absent_uploads_digest_and_all_seven_bundles_before_tagging(self):
        self.execute();self.assertEqual(self.copies,1);self.assertEqual(self.attaches,7);self.assertEqual(self.tags,['0.1.0','latest'])
    def test_matching_retry_reuses_image_and_allows_duplicate_bundles(self):
        self.execute('present');self.assertEqual(self.copies,0);self.assertEqual(self.attaches,7)
    def test_conflict_auth_and_timeout_never_overwrite(self):
        for mode in ('conflict','unauthorized','timeout'):
            with self.subTest(mode=mode),self.assertRaises(gate.Refused):self.execute(mode)
            self.assertEqual(self.copies,0);self.assertEqual(self.attaches,0)
    def test_late_version_conflict_withholds_tags_after_upload(self):
        with self.assertRaises(gate.Refused):self.execute('late-conflict')
        self.assertEqual(self.copies,1);self.assertEqual(self.attaches,7);self.assertEqual(self.tags,[])
    def test_ambiguous_upload_stops_then_new_approved_retry_reconciles(self):
        with self.assertRaises(subprocess.CalledProcessError):self.execute('copy-failure')
        self.assertEqual(self.copies,1);self.assertEqual(self.attaches,0)
        self.execute('present');self.assertEqual(self.copies,0)
    def test_partial_bundle_upload_stops_then_matching_retry_reattaches_valid_bundles(self):
        with self.assertRaises(subprocess.CalledProcessError):self.execute('attach-failure')
        self.assertEqual(self.attaches,1)
        self.execute('partial');self.assertEqual(self.copies,0);self.assertEqual(self.attaches,7)
        self.execute('present');self.assertEqual(self.copies,0);self.assertEqual(self.attaches,7)
    def test_remote_verification_failure_is_not_channel_success(self):
        with self.assertRaises(gate.Refused):self.execute('remote-failure')
        self.assertEqual(self.attaches,7)
