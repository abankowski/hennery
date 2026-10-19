"""New release contract binds real R4 OCI fixtures; crypto is covered separately."""
from pathlib import Path
import sys
import unittest
import subprocess
from unittest.mock import patch

from test_ghcr_candidate import ReleaseFixture,load_helper,TARGETS
sys.path.insert(0,str(Path(__file__).parents[1]/'release'))
import contract
import gate
import supply
import channel_publish


class ReleaseImages(ReleaseFixture,unittest.TestCase):
    def setUp(self):
        super().setUp();self.helper=load_helper(self)
        self.helper.assemble(self.candidate,self.root/'assembled',self.natives,self.revision,self.version)
        value={'schema':3,'repository':gate.REPOSITORY,'source_sha':self.revision,'tag':'v'+self.version,'tag_object':'b'*40,
               'channels':['ghcr','github'],'targets':sorted(TARGETS.values()),
               'binaries':supply.binary_inventory(self.candidate,sorted(TARGETS.values()))}
        contract.freeze(self.candidate,value)

    def test_materializes_exact_checksum_bound_oci_without_inventory_signature(self):
        self.assertTrue(hasattr(self.helper,'inspect_release'))
        value=self.helper.inspect_release(self.candidate,self.work,contract.load(self.candidate))
        self.assertEqual(value,gate.strict_json((self.candidate/'ghcr-index.json').read_bytes()))
        self.assertFalse((self.work/'release-inventory.json.asc').exists())

    def test_tampered_oci_or_working_layout_refuses(self):
        self.assertTrue(hasattr(self.helper,'inspect_release'))
        self.helper.inspect_release(self.candidate,self.work,contract.load(self.candidate))
        path=self.work/'layout/oci-layout';path.write_text('{}')
        with self.assertRaises(gate.Refused):self.helper.inspect_release(self.candidate,self.work,contract.load(self.candidate))
        path=self.candidate/'ghcr-oci-layout.tar';path.write_bytes(path.read_bytes()+b'x')
        with self.assertRaises(gate.Refused):contract.load(self.candidate)

    def test_seven_exact_local_oci_predicates_verify_before_registry_credentials(self):
        value=contract.load(self.candidate);signatures=self.root/'signatures';signatures.mkdir()
        self.helper.inspect_release(self.candidate,self.work,value)
        for *_,bundle in channel_publish.image_subjects(self.work,signatures):bundle.write_text('{}')
        calls=[]
        def crypto(command,**kwargs):
            calls.append(command)
            return subprocess.CompletedProcess(command,0,'verified','')
        with patch.object(channel_publish.subprocess,'run',side_effect=crypto):
            channel_publish.check_images(self.candidate,signatures,value,self.work)
        self.assertEqual(len(calls),7)
        self.assertTrue(all(c[0]=='gh' and not str(c[3]).startswith('oci://') and '--signer-workflow' not in c for c in calls))
        self.assertEqual(sum(c[c.index('--predicate-type')+1]=='https://spdx.dev/Document/v2.3' for c in calls),4)
        next(channel_publish.image_subjects(self.work,signatures))[-1].unlink()
        with patch.object(channel_publish.subprocess,'run',side_effect=crypto),self.assertRaises(gate.Refused):
            channel_publish.check_images(self.candidate,signatures,value,self.work)

    def test_layer_change_between_verification_and_write_refuses(self):
        value=contract.load(self.candidate)
        self.helper.inspect_release(self.candidate,self.work,value)
        signatures=self.root/'signatures';signatures.mkdir()
        for *_,bundle in channel_publish.image_subjects(self.work,signatures):bundle.write_text('{}')
        layer=next(p for p in (self.work/'layout/blobs/sha256').iterdir() if p.read_bytes().startswith(b'\x1f\x8b'))
        layer.write_bytes(b'changed layer')
        with patch.object(channel_publish.subprocess,'run',side_effect=AssertionError('crypto or registry reached')),self.assertRaises((gate.Refused,ValueError)):
            channel_publish.check_images(self.candidate,signatures,value,self.work)

    def test_publish_workflow_runs_one_full_verification_for_all_channels(self):
        """Execute the workflow's real CLI entry points and all four publishers.

        OCI/archive inputs come from the real fixture producer. Qualification
        materials for unrelated platforms and external services are substituted;
        genuine CLI crypto and GitHub wire contracts have their own suites.
        """
        import base64
        import os
        import shlex
        from types import SimpleNamespace
        import yaml
        import assets
        import hosting
        import release_run

        root=self.candidate;signatures=self.root/'signatures';signatures.mkdir()
        (signatures/contract.BUNDLE).write_text('{}')
        value=contract.load(root)
        self.helper.inspect_release(root,self.work,value)
        for *_,bundle in channel_publish.image_subjects(self.work,signatures):bundle.write_text('{}')
        for name in assets.names(sorted(gate.TARGETS)):
            if not (root/name).exists():(root/name).write_bytes(b'public fixture')
        (root/'release-notes.md').write_text('Release fixture')
        (root/'hennery.rb').write_text('class Hennery < Formula\n  version "0.1.0"\nend\n')
        (root/'crates-inventory.json').write_bytes(gate.canonical({'version':self.version,'source':{'sha':self.revision}}))
        (root/assets.PUBLIC_CHECKSUMS).write_text(''.join(
            gate.digest((root/name).read_bytes())+'  '+name+'\n' for name in assets.names(sorted(gate.TARGETS))))
        for name in (contract.CHECKSUMS,contract.METADATA):(root/name).unlink()
        metadata={k:v for k,v in value.items() if k!='artifacts'}
        contract.freeze(root,metadata | {'channels':sorted(gate.CHANNELS),'targets':sorted(gate.TARGETS)})
        remote=None;uploads={};tap=None;events=[];registry={}
        image_digest=gate.strict_json((root/'ghcr-index.json').read_bytes())['digest']

        def github(*args):
            nonlocal remote
            op=args[0];events.append(op)
            if op=='create':remote={'tagName':'v'+self.version,'isDraft':True,'isImmutable':False,'assets':[]}
            elif op=='upload':
                uploads.update({p.name:p.read_bytes() for p in args[2:]})
            elif op=='download':
                destination=Path(args[args.index('--dir')+1])
                for name,raw in uploads.items():(destination/name).write_bytes(raw)
            elif op=='edit':remote.update(isDraft=False,isImmutable=True)
            if remote is not None:remote.update(isPrerelease=False,assets=[{'name':n} for n in uploads])
            return subprocess.CompletedProcess(args,1 if remote is None else 0,
                gate.canonical(remote).decode() if remote else '', 'release not found' if remote is None else '')

        def tap_api(method='GET',data=None):
            nonlocal tap
            if method=='GET':return tap
            raw=base64.b64decode(data['content']);sha=channel_publish.tap.blob_sha(raw)
            tap={'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':data['content'],'sha':sha}
            return {'content':{'sha':sha},'commit':{'sha':'c'*40}}

        def process(command,**kwargs):
            if command[:2]==['skopeo','login']:
                Path(command[command.index('--authfile')+1]).write_text('{}')
            elif command[:2]==['skopeo','copy']:
                destination=command[-1]
                ref=destination.rsplit('@',1)[-1] if '@' in destination else destination.rsplit(':',1)[-1]
                registry[ref]=image_digest
                events.append('image-upload' if '@' in destination else 'image-tag')
            elif command[:2]==['oras','attach']:events.append('image-attach')
            elif command[:3]==['gh','attestation','verify']:events.append('remote-crypto' if '--bundle-from-oci' in command else 'local-crypto')
            elif command[0] not in ('skopeo','oras'):self.fail(command)
            return subprocess.CompletedProcess(command,0,'verified','')

        env={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_EVENT_NAME':'push',
             'GITHUB_REF':'refs/tags/v'+self.version,'GITHUB_SHA':self.revision,
             'GITHUB_WORKFLOW_REF':gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v'+self.version,
             'RELEASE_PUBLICATION_ENABLED':'true',**{'RELEASE_'+c.upper()+'_ENABLED':'true' for c in gate.CHANNELS},
             'GH_TOKEN':'offline','GHCR_PUBLISH_TOKEN':'offline','GHCR_PUBLISH_USER':'fixture',
             'CARGO_REGISTRY_TOKEN':'offline'}
        workflow=yaml.safe_load((release_run.ROOT/contract.WORKFLOW).read_bytes())
        with patch.dict(os.environ,env), patch.object(subprocess,'run',side_effect=process), \
                patch.object(supply,'require_contract'),patch.object(supply,'verify_binary_inventory'), \
                patch.object(hosting,'command',side_effect=github), \
                patch.object(channel_publish.tap,'tap_api',side_effect=tap_api), \
                patch.object(channel_publish,'registry_helper',return_value=SimpleNamespace(
                    reconcile=lambda ref,digest,auth:0 if registry.get(ref)==digest else 1)), \
                patch.object(channel_publish.crates_delivery,'run',return_value={'state':'published'}) as crates, \
                patch.object(release_run,'verify',wraps=release_run.verify) as full, \
                patch.object(channel_publish,'check_images',wraps=channel_publish.check_images) as images:
            operations=[]
            for step in workflow['jobs']['publish']['steps']:
                script=step.get('run','')
                if 'release_run.py' not in script:continue
                args=shlex.split(script)
                args=args[args.index('packaging/release/release_run.py'):]
                args=[a.replace('original/payload',str(root)).replace('original/signatures',str(signatures))
                      .replace('$RUNNER_TEMP',str(self.root)).replace('$GITHUB_OUTPUT',str(self.root/'outputs')) for a in args]
                operations.append(args[1])
                with patch.object(sys,'argv',args):release_run.main()
            self.assertEqual(operations,['verify','publish','channel','channel','channel'])
            self.assertEqual(full.call_count,1,'full verification must run exactly once per publish job')
            self.assertEqual(images.call_count,1,'local OCI verification belongs only to the first step')
            self.assertEqual(crates.call_count,1)
        self.assertEqual(len(uploads),6)
        self.assertFalse(remote['isDraft']);self.assertTrue(remote['isImmutable'])
        self.assertEqual(events.count('remote-crypto'),5)
        self.assertEqual(events.count('image-upload'),1);self.assertEqual(events.count('image-attach'),7)
        self.assertEqual(registry,{ref:image_digest for ref in [image_digest,self.version,'latest']})

    def test_publisher_materializes_frozen_oci_and_rejects_changed_payloads(self):
        value=contract.load(self.candidate)
        index=channel_publish.materialize_image(self.candidate,self.work,value)
        self.assertEqual(index,gate.strict_json((self.candidate/'ghcr-index.json').read_bytes()))
        self.assertEqual({p.relative_to(self.work/'layout').as_posix():p.read_bytes()
                          for p in (self.work/'layout').rglob('*') if p.is_file()},
                         self.helper.tar_files((self.candidate/'ghcr-oci-layout.tar').read_bytes()))
        for name in ('ghcr-oci-layout.tar','ghcr-index.json'):
            path=self.candidate/name;original=path.read_bytes();path.write_bytes(original+b'changed')
            with self.subTest(name=name),self.assertRaises(gate.Refused):
                channel_publish.materialize_image(self.candidate,self.root/('bad-'+name),value)
            path.write_bytes(original)
