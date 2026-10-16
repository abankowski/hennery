"""Real pinned ORAS and disposable OCI layouts; no registry, gh or credentials."""
import copy
from contextlib import contextmanager
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1] / 'release'))
import gate
import registry_bundles as bundles

MEDIA = 'application/vnd.oci.image.manifest.v1+json'
INDEX = 'application/vnd.oci.image.index.v1+json'
KIND = 'application/vnd.dev.sigstore.bundle.v0.3+json'
PROVENANCE = 'https://slsa.dev/provenance/v1'
SPDX = 'https://spdx.dev/Document'


def descriptor(raw, media=MEDIA):
    return {'mediaType': media, 'digest': 'sha256:' + gate.digest(raw), 'size': len(raw)}


class RegistryBundles(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='release-referrers-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.layout = self.root / 'registry'; (self.layout / 'blobs/sha256').mkdir(parents=True)
        self.environment = {key: value for key, value in os.environ.items() if key in
                            ('PATH', 'NIX_SSL_CERT_FILE', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'SYSTEMROOT')}
        for key in ('HOME','XDG_CONFIG_HOME','DOCKER_CONFIG','GH_CONFIG_DIR','GNUPGHOME'):
            path = self.root / key.lower(); path.mkdir(); self.environment[key] = str(path)
        for key in ('HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'):
            self.environment[key] = 'http://127.0.0.1:9'
        self.environment.update(NO_PROXY='', no_proxy='')
        self.real_run = subprocess.run
        version = self.real_run(['oras','version'], env=self.environment, check=True, capture_output=True, text=True).stdout
        self.assertIn('Version:        1.3.4\n', version, 'ORAS pin changed; requalify the deterministic manifest contract')
        config = self.blob(b'{}', 'application/vnd.oci.empty.v1+json')
        platforms = [self.blob(gate.canonical({'schemaVersion':2,'mediaType':MEDIA,'config':config,'layers':[],
                                            'annotations':{'test.arch':arch}})) for arch in ('amd64','arm64')]
        index = self.blob(gate.canonical({'schemaVersion':2,'mediaType':INDEX,'manifests':platforms}), INDEX)
        (self.layout / 'oci-layout').write_text('{"imageLayoutVersion":"1.0.0"}')
        (self.layout / 'index.json').write_bytes(gate.canonical({'schemaVersion':2,'manifests':[index,*platforms]}))
        self.subjects = []
        for name, subject in [('index',index),('amd64',platforms[0]),('arm64',platforms[1])]:
            for kind in (['provenance'] if name == 'index' else ['provenance','image-sbom','binary-sbom']):
                path = self.root / f'ghcr-{name}-{kind}.json'
                path.write_bytes(gate.canonical({'offlineBundle':name + '-' + kind}))
                self.subjects.append((name,kind,subject['digest'],PROVENANCE if kind == 'provenance' else SPDX,path))
        self.calls = []; self.gates = 0
        # A removed --oci-layout guard must never escape to a network operation.
        # All actual subprocesses are ORAS with fully isolated environment.
        def local_only(command, **kwargs):
            self.assertEqual(command[0], 'oras', 'no other subprocess is authorized')
            if command[1] in ('copy','cp'):
                self.assertIn('--from-oci-layout', command); self.assertIn('--to-oci-layout', command)
            elif command[1] != 'version':
                self.assertIn('--oci-layout', command)
            actual = kwargs['env']
            self.assertEqual(actual['HOME'], self.environment['HOME'])
            self.assertFalse(any('TOKEN' in key or key.startswith(('ACTIONS_','RUNNER_')) for key in actual))
            self.calls.append(list(command))
            return self.real_run(command, **kwargs)
        transport = patch.object(bundles.subprocess, 'run', side_effect=local_only)
        transport.start(); self.addCleanup(transport.stop)

    @contextmanager
    def refusal(self, pattern=None):
        try:
            yield
        except Exception as error:
            self.assertIsInstance(error,gate.Refused,'refusal must retain its fail-closed classification')
            if pattern:self.assertRegex(str(error),pattern)
        else:
            self.fail('expected OCI refusal')

    def blob(self, raw, media=MEDIA):
        desc = descriptor(raw, media)
        path=self.layout / 'blobs/sha256' / desc['digest'][7:]
        if path.exists(): self.assertEqual(path.read_bytes(),raw)
        else: path.write_bytes(raw)
        return desc

    def gate(self):
        self.gates += 1

    def reconcile(self, **kwargs):
        return bundles.reconcile(self.subjects,self.root/'fetched',self.gate,
                                 environment=self.environment,layout=self.layout,**kwargs)

    def copies(self):
        return [c for c in self.calls if c[1] in ('copy','cp')]

    def referrers(self):
        index = gate.strict_json((self.layout/'index.json').read_bytes())
        return [d for d in index['manifests'] if gate.strict_json(
            (self.layout/'blobs/sha256'/d['digest'][7:]).read_bytes()).get('artifactType') == KIND]

    def test_success_fetches_every_frozen_bundle_and_pins_the_manifest_bytes(self):
        fetched = self.reconcile()
        self.assertEqual(len(fetched),7)
        self.assertEqual(len(self.copies()),7);self.assertEqual(self.gates,7)
        self.assertEqual(len(self.referrers()),7)
        for expected,actual in zip(self.subjects,fetched):
            self.assertEqual(actual[:4],expected[:4]);self.assertNotEqual(actual[4],expected[4])
            self.assertTrue(actual[4].is_file())
            self.assertEqual(actual[4].read_bytes(),expected[4].read_bytes())
        for ref in self.referrers():
            raw=(self.layout/'blobs/sha256'/ref['digest'][7:]).read_bytes();value=gate.strict_json(raw)
            self.assertEqual(descriptor(raw),{k:ref[k] for k in ('mediaType','digest','size')})
            self.assertEqual(value['annotations']['org.opencontainers.image.created'],'1970-01-01T00:00:00Z')
            self.assertEqual(value['artifactType'],KIND)
            self.assertEqual(len(value['layers']),1)

    def test_complete_retry_has_no_write_command_or_write_approval(self):
        self.assertEqual(len(self.reconcile()),7)
        before=(self.layout/'index.json').read_bytes();self.calls=[];self.gates=0
        fetched=self.reconcile()
        self.assertEqual(len(fetched),7);self.assertEqual(self.copies(),[]);self.assertEqual(self.gates,0)
        self.assertEqual((self.layout/'index.json').read_bytes(),before)
        self.assertTrue(all(item[4].read_bytes()==original[4].read_bytes() for item,original in zip(fetched,self.subjects)))

    def test_partial_recovery_writes_only_the_four_missing_referrers(self):
        def stop():
            self.gates+=1
            if self.gates==4:raise gate.Refused('test stopped before fourth write')
        with self.refusal('fourth'):
            bundles.reconcile(self.subjects,self.root/'partial',stop,environment=self.environment,layout=self.layout)
        self.assertEqual(len(self.copies()),3)
        existing={p.name:(p.read_bytes(),p.stat().st_mtime_ns) for p in (self.layout/'blobs/sha256').iterdir()}
        self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7);self.assertEqual(len(self.copies()),4);self.assertEqual(self.gates,4)
        self.assertEqual(len(self.referrers()),7)
        for name,state in existing.items():
            path=self.layout/'blobs/sha256'/name
            self.assertEqual((path.read_bytes(),path.stat().st_mtime_ns),state,'existing blob was rewritten')

    def test_lost_success_response_is_reconciled_without_reupload(self):
        original=bundles.subprocess.run;completed=0
        def ambiguous(command,**kwargs):
            nonlocal completed
            result=original(command,**kwargs)
            if command[1] in ('copy','cp'):
                completed+=1
                if completed==3:raise subprocess.CalledProcessError(97,command,stderr=b'offline lost response')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=ambiguous),self.refusal():self.reconcile()
        self.assertEqual(len(self.referrers()),3)
        self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7);self.assertEqual(len(self.copies()),4)

    def test_every_frozen_input_is_regular_and_present_before_any_write(self):
        path=self.subjects[-1][4];raw=path.read_bytes();outside=self.root/'outside';outside.write_bytes(raw)
        for kind in ('missing','symlink','directory'):
            path.unlink(missing_ok=True)
            if kind=='symlink':path.symlink_to(outside)
            if kind=='directory':path.mkdir()
            with self.subTest(kind=kind),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])
            if path.is_dir():path.rmdir()
        path.write_bytes(raw)

    def test_empty_bundle_is_refused_before_any_write(self):
        self.subjects[-1][4].write_bytes(b'')
        with self.refusal():self.reconcile()
        self.assertEqual(self.copies(),[])

    def test_changed_frozen_bundle_at_write_boundary_refuses(self):
        path=self.subjects[0][4]
        def changed():
            self.gates+=1;path.write_bytes(path.read_bytes()+b' ')
        with self.refusal():
            bundles.reconcile(self.subjects,self.root/'fetched',changed,environment=self.environment,layout=self.layout)
        self.assertEqual(self.copies(),[])

    def test_existing_manifest_and_bundle_are_fetched_by_digest_and_checked(self):
        self.assertEqual(len(self.reconcile()),7)
        ref=self.referrers()[0];manifest=self.layout/'blobs/sha256'/ref['digest'][7:]
        raw=manifest.read_bytes();value=gate.strict_json(raw)
        layer=self.layout/'blobs/sha256'/value['layers'][0]['digest'][7:];bundle=layer.read_bytes()
        for kind in ('changed-blob','missing-blob','changed-manifest'):
            self.calls=[]
            # ORAS intentionally marks content-addressed blobs read-only. The
            # adversarial fixture owns these files and explicitly corrupts them.
            layer.chmod(0o600);manifest.chmod(0o600)
            if kind=='changed-blob':layer.write_bytes(bundle+b' ')
            if kind=='missing-blob':layer.unlink()
            if kind=='changed-manifest':manifest.write_bytes(raw+b' ')
            if kind=='missing-manifest':manifest.unlink()
            with self.subTest(kind=kind),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])
            layer.write_bytes(bundle);manifest.write_bytes(raw)

    def test_undiscoverable_missing_manifest_is_repaired_once_then_retry_is_read_only(self):
        self.assertEqual(len(self.reconcile()),7)
        ref=self.referrers()[0];path=self.layout/'blobs/sha256'/ref['digest'][7:]
        path.unlink();self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7)
        self.assertEqual((len(self.copies()),self.gates),(1,1))
        self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7)
        self.assertEqual((len(self.copies()),self.gates),(0,0))

    def test_advertised_but_unfetchable_manifest_refuses_without_writes(self):
        self.assertEqual(len(self.reconcile()),7)
        missing=self.referrers()[0]['digest'];transport=bundles.subprocess.run
        def absent(command,**kwargs):
            if command[1:3]==['manifest','fetch'] and command[-1].endswith('@'+missing):
                raise subprocess.CalledProcessError(1,command,stderr=b'offline advertised manifest missing')
            return transport(command,**kwargs)
        self.calls=[]
        with patch.object(bundles.subprocess,'run',side_effect=absent),self.refusal('transport failed'):self.reconcile()
        self.assertEqual(self.copies(),[])

    def test_gate_refusal_and_changed_fetched_output_never_become_success(self):
        def refuse():raise gate.Refused('approval withdrawn')
        with self.refusal('approval withdrawn'):
            bundles.reconcile(self.subjects,self.root/'fetched',refuse,environment=self.environment,layout=self.layout)
        self.assertEqual(self.copies(),[])
        fetched=self.reconcile();fetched[0][4].write_bytes(b'changed output');self.calls=[]
        with self.refusal('output changed'):self.reconcile()
        self.assertEqual(self.copies(),[])

    def test_caller_tokens_never_reach_the_actual_oras_subprocess(self):
        self.environment.update(GH_TOKEN='must-not-reach-oras',GITHUB_TOKEN='must-not-reach-oras',
            GHCR_PUBLISH_TOKEN='must-not-reach-oras',ACTIONS_ID_TOKEN_REQUEST_TOKEN='must-not-reach-oras')
        self.assertEqual(len(self.reconcile()),7)

    def test_production_transport_pins_origin_and_auth_while_test_routes_only_to_layout(self):
        auth=self.root/'registry-auth.json';auth.write_text('{}')
        local_transport=bundles.subprocess.run;commands=[]
        def offline_remote(command,**kwargs):
            commands.append(list(command));actual=list(command)
            option='--to-registry-config' if command[1] in ('copy','cp') else '--registry-config'
            position=actual.index(option)
            self.assertEqual(actual[position+1],str(auth.resolve()))
            actual[position:position+2]=['--to-oci-layout' if option.startswith('--to-') else '--oci-layout']
            for index,argument in enumerate(actual):
                if argument.startswith('ghcr.io/'):
                    self.assertTrue(argument.startswith('ghcr.io/marcinwadon/hennery@sha256:'))
                    actual[index]=str(self.layout.resolve())+'@'+argument.split('@',1)[1]
            # This is the only actual subprocess path: the existing local-only
            # transport refuses any remaining remote command before execution.
            return local_transport(actual,**kwargs)
        with patch.object(bundles.subprocess,'run',side_effect=offline_remote):
            fetched=bundles.reconcile(self.subjects,self.root/'fetched',self.gate,
                                      environment=self.environment,auth=auth)
        self.assertEqual(len(fetched),7)
        self.assertTrue(all(any(a.startswith('ghcr.io/marcinwadon/hennery@sha256:') for a in c) for c in commands))

    def test_malformed_discovery_and_untrusted_descriptors_refuse_before_writes(self):
        self.assertEqual(len(self.reconcile()),7)
        transport=bundles.subprocess.run
        for kind in ('missing-list','duplicate-key','escaped-key','bom','bad-digest','bad-size','wrong-type','duplicate-referrer'):
            def altered(command,**kwargs):
                result=transport(command,**kwargs)
                if command[1]=='discover':
                    value=gate.strict_json(result.stdout)
                    if kind=='missing-list':raw=b'{}'
                    elif kind=='duplicate-key':raw=b'{"referrers":[],"REFERRERS":[]}'
                    elif kind=='escaped-key':raw=b'{"referrers":[],"refe\\u0072rers":[]}'
                    elif kind=='bom':raw=b'\xef\xbb\xbf'+result.stdout
                    else:
                        desc=value['referrers'][0]
                        if kind=='bad-digest':desc['digest']='sha512:'+'a'*64
                        if kind=='bad-size':desc['size']=-1
                        if kind=='wrong-type':desc['mediaType']=INDEX
                        if kind=='duplicate-referrer':value['referrers'].append(dict(desc))
                        raw=gate.canonical(value)
                    return subprocess.CompletedProcess(command,0,raw,b'')
                return result
            self.calls=[]
            with self.subTest(kind=kind),patch.object(bundles.subprocess,'run',side_effect=altered),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])

    def test_fetched_subject_manifest_and_blob_bytes_are_checked_independently_of_oras(self):
        self.assertEqual(len(self.reconcile()),7);transport=bundles.subprocess.run
        for kind in ('subject','referrer','bundle','config'):
            ref=self.referrers()[0];manifest=gate.strict_json((self.layout/'blobs/sha256'/ref['digest'][7:]).read_bytes())
            digest={'subject':self.subjects[0][2],'referrer':ref['digest'],
                    'bundle':manifest['layers'][0]['digest'],'config':manifest['config']['digest']}[kind]
            def altered(command,**kwargs):
                result=transport(command,**kwargs)
                if command[1] in ('manifest','blob') and command[-1].endswith('@'+digest):
                    return subprocess.CompletedProcess(command,0,result.stdout+b' ',b'')
                return result
            self.calls=[]
            with self.subTest(kind=kind),patch.object(bundles.subprocess,'run',side_effect=altered),self.refusal('digest or size differs|subject digest differs'):self.reconcile()
            self.assertEqual(self.copies(),[])

    def test_new_write_requires_visible_referrer_readback(self):
        transport=bundles.subprocess.run;discoveries=0
        def invisible(command,**kwargs):
            nonlocal discoveries
            result=transport(command,**kwargs)
            if command[1]=='discover':
                discoveries+=1
                if discoveries==5:return subprocess.CompletedProcess(command,0,b'{"referrers":[]}',b'')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=invisible),self.refusal('missing from read-back'):
            self.reconcile()
        self.assertEqual(len(self.copies()),1)

    def test_final_discovery_must_still_cover_the_complete_bundle_set(self):
        transport=bundles.subprocess.run;discoveries=0
        def incomplete(command,**kwargs):
            nonlocal discoveries
            result=transport(command,**kwargs)
            if command[1]=='discover':
                discoveries+=1
                if discoveries>=18:return subprocess.CompletedProcess(command,0,b'{"referrers":[]}',b'')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=incomplete),self.refusal('set incomplete'):
            self.reconcile()
        self.assertEqual(len(self.copies()),7)

    def test_frozen_inputs_cannot_change_during_final_readback(self):
        transport=bundles.subprocess.run;discoveries=0
        def changed(command,**kwargs):
            nonlocal discoveries
            result=transport(command,**kwargs)
            if command[1]=='discover':
                discoveries+=1
                if discoveries==18:
                    path=self.subjects[0][4];path.write_bytes(path.read_bytes()+b' ')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=changed),self.refusal('changed during reconciliation'):
            self.reconcile()
        self.assertEqual(len(self.copies()),7)

    def test_wrong_or_duplicate_subject_selection_refuses_before_transport(self):
        for mutation in ('missing','duplicate','extra-duplicate','predicate','digest','name','kind','filename','different-platform','same-digests'):
            subjects=list(self.subjects)
            if mutation=='missing':subjects.pop()
            if mutation=='duplicate':subjects[-1]=subjects[0]
            if mutation=='extra-duplicate':subjects.append(subjects[0])
            if mutation=='filename':
                path=self.root/'unbound.json';path.write_bytes(subjects[1][4].read_bytes())
                subjects[1]=(*subjects[1][:4],path)
            if mutation=='different-platform':subjects[2]=(*subjects[2][:2],subjects[4][2],*subjects[2][3:])
            if mutation=='same-digests':subjects=[(*row[:2],subjects[0][2],*row[3:]) for row in subjects]
            if mutation=='predicate':subjects[1]=(*subjects[1][:3],SPDX,subjects[1][4])
            if mutation=='digest':subjects[1]=(*subjects[1][:2],'sha512:'+'a'*64,*subjects[1][3:])
            if mutation=='name':subjects[0]=('other',*subjects[0][1:])
            if mutation=='kind':subjects[0]=(subjects[0][0],'other',*subjects[0][2:])
            self.calls=[]
            with self.subTest(mutation=mutation),self.refusal():
                bundles.reconcile(subjects,self.root/'fetched',self.gate,environment=self.environment,layout=self.layout)
            self.assertEqual(self.calls,[])

    def test_descriptor_validator_refuses_malformed_or_unbounded_inputs(self):
        good={'mediaType':MEDIA,'digest':'sha256:'+'a'*64,'size':1}
        bundles.valid_descriptor(good)
        for value in (None,{},good|{'digest':None},good|{'digest':'sha512:'+'a'*64},
                      good|{'size':True},good|{'size':0},good|{'size':16*1024*1024+1}):
            with self.subTest(value=value),self.refusal():bundles.valid_descriptor(value)

    def test_referrers_completed_during_approval_are_not_copied_again(self):
        transport=bundles.subprocess.run;other=False;completed=False;our_writes=[]
        def record(command,**kwargs):
            if command[1] in ('copy','cp') and not other:our_writes.append(command)
            return transport(command,**kwargs)
        def another_writer():
            nonlocal other,completed
            if not completed:
                completed=True;other=True
                try:bundles.reconcile(self.subjects,self.root/'other-fetched',lambda:None,environment=self.environment,layout=self.layout)
                finally:other=False
        with patch.object(bundles.subprocess,'run',side_effect=record):
            fetched=bundles.reconcile(self.subjects,self.root/'fetched',another_writer,environment=self.environment,layout=self.layout)
        self.assertEqual(len(fetched),7);self.assertEqual(our_writes,[])
        self.assertEqual(len(self.copies()),7)

    def test_referrer_metadata_cannot_silently_select_different_bundle_bytes(self):
        self.assertEqual(len(self.reconcile()),7)
        # An extra Sigstore referrer with a valid content-addressed blob is still
        # a conflict if its frozen manifest/predicate/subject differs.
        ref=self.referrers()[0];raw=(self.layout/'blobs/sha256'/ref['digest'][7:]).read_bytes()
        original=gate.strict_json((self.layout/'index.json').read_bytes())
        for field in ('created','predicate','subject','layer'):
            changed=gate.strict_json(raw)
            if field=='created':changed['annotations']['org.opencontainers.image.created']='2026-10-16T00:00:00Z'
            if field=='predicate':changed['annotations']['dev.sigstore.bundle.predicateType']=PROVENANCE if changed['annotations']['dev.sigstore.bundle.predicateType']==SPDX else SPDX
            if field=='subject':changed['subject']['size']+=1
            if field=='layer':changed['layers'][0]=self.blob(b'other',KIND)
            self.assertNotEqual(gate.canonical(changed),raw)
            extra=self.blob(gate.canonical(changed));extra['artifactType']=KIND
            index=copy.deepcopy(original);index['manifests'].append(extra)
            (self.layout/'index.json').write_bytes(gate.canonical(index));self.calls=[]
            with self.subTest(field=field),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])
            (self.layout/'index.json').write_bytes(gate.canonical(original))


if __name__=='__main__':unittest.main()
