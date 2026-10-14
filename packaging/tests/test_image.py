"""Non-publishing negative acceptance for R4's retained OCI candidate."""
import hashlib
import importlib.util
import io
import json
import os
import posixpath
from pathlib import Path
import tarfile
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('image', Path(__file__).parents[1] / 'image.py')
image = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(image)


class CandidateFixtures:
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'blobs/sha256').mkdir(parents=True)
        self.revision = 'a' * 40
        self.binary = b'approved executable'
        self.expected = hashlib.sha256(self.binary).hexdigest()

    def blob(self, value, media='application/vnd.oci.image.manifest.v1+json', **extra):
        data = value if isinstance(value, bytes) else json.dumps(value).encode()
        digest = hashlib.sha256(data).hexdigest()
        (self.root / 'blobs/sha256' / digest).write_bytes(data)
        return dict(mediaType=media, digest='sha256:' + digest, size=len(data), **extra)

    def fixture(self, arch='amd64', user='65532:65532', binary=None, notices=True,
                provenance=True, sbom=True, subject=None, revision=None, labels=None,
                binary_bom=None, scanner_bom=None, symlink=False, config_arch=None,
                reference_digest=None, whiteout=None, same_layer_files=False,
                extra_layers=(), extra_first=False, buildkit_name=None):
        files = {'usr/local/bin/hennery': self.binary if binary is None else binary,
                 'usr/share/doc/hennery/LICENSE': b'AGPL licence',
                 'usr/share/doc/hennery/binary.spdx.json': json.dumps(binary_bom if binary_bom is not None else {
                     'spdxVersion': 'SPDX-2.3', 'packages': [{'name': 'rust'}, {'name': 'web'}]
                 }).encode()}
        if notices:
            files['usr/share/doc/hennery/THIRD-PARTY-NOTICES'] = b'reviewed dependency notices'
        if symlink:
            files = {'usr/local/bin/other-executable': self.binary, **files}
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as archive:
            for name, data in files.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                if symlink and name == 'usr/local/bin/hennery':
                    info.type = tarfile.SYMTYPE
                    info.linkname = 'other-executable'
                archive.addfile(info, io.BytesIO(data))
        config = self.blob({'architecture': config_arch or arch, 'os': 'linux', 'config': {
            'User': user, 'Labels': {'org.opencontainers.image.revision': revision or self.revision,
                                    'org.opencontainers.image.version': '0.1.0-alpha.1',
                                    'org.opencontainers.image.source': 'https://github.com/marcinwadon/hennery',
                                    'org.opencontainers.image.licenses': 'AGPL-3.0-only',
                                    **(labels or {})}}})
        layers = [self.blob(stream.getvalue())]
        if whiteout:
            hidden = io.BytesIO()
            with tarfile.open(fileobj=hidden, mode='w:gz') as archive:
                if same_layer_files:
                    for name, data in files.items():
                        info = tarfile.TarInfo(name)
                        info.size = len(data)
                        archive.addfile(info, io.BytesIO(data))
                archive.addfile(tarfile.TarInfo(whiteout))
            layers.append(self.blob(hidden.getvalue()))
        overlays = []
        for entries in extra_layers:
            stream = io.BytesIO()
            with tarfile.open(fileobj=stream, mode='w:gz') as archive:
                for name, kind, value in entries:
                    info = tarfile.TarInfo(name)
                    info.type = kind
                    if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                        info.linkname = value
                        archive.addfile(info)
                    else:
                        info.size = len(value)
                        archive.addfile(info, io.BytesIO(value))
            overlays.append(self.blob(stream.getvalue()))
        layers = overlays + layers if extra_first else layers + overlays
        runtime = self.blob({'schemaVersion': 2, 'config': config,
                             'layers': layers},
                            platform={'os': 'linux', 'architecture': arch})
        statements = []
        for enabled, kind, predicate in [(provenance, 'https://slsa.dev/provenance/v0.2', {'buildType': 'buildkit'}),
                                         (sbom, 'https://spdx.dev/Document', scanner_bom if scanner_bom is not None else {'spdxVersion': 'SPDX-2.3', 'packages': [{'name': 'base'}]})]:
            if enabled:
                # Pinned BuildKit v0.33.1 writer.go:304-318 + make.go:122-166:
                # an unnamed OCI export has no default self subjects. Names
                # produce a PURL and the PLATFORM MANIFEST hash, without prefix.
                subjects = [{'name': 'image' if buildkit_name is None else
                    'pkg:docker/hennery-collector@' + self.revision + '-' + arch +
                    '?platform=linux%2F' + arch + '&repository_url=localhost',
                    'digest': {'sha256': subject or runtime['digest'][7:]}}]
                if buildkit_name == '':
                    subjects = []
                statements.append(self.blob({'_type': 'https://in-toto.io/Statement/' +
                    ('v0.1' if buildkit_name is None else 'v1'), 'subject': subjects,
                    'predicateType': kind, 'predicate': predicate},
                    media='application/vnd.in-toto+json',
                    annotations={'in-toto.io/predicate-type': kind}))
        config = self.blob({})
        att_body = {'schemaVersion': 2, 'config': config, 'layers': statements}
        if buildkit_name is not None:
            config.update(mediaType='application/vnd.oci.empty.v1+json', data='e30=')
            att_body.update(mediaType='application/vnd.oci.image.manifest.v1+json',
                artifactType='application/vnd.docker.attestation.manifest.v1+json',
                subject={key: runtime[key] for key in ['mediaType', 'digest', 'size']})
        attestation = self.blob(att_body,
            platform={'os': 'unknown', 'architecture': 'unknown'},
            annotations={'vnd.docker.reference.type': 'attestation-manifest',
                         'vnd.docker.reference.digest': reference_digest or runtime['digest']})
        (self.root / 'index.json').write_text(json.dumps({'schemaVersion': 2, 'manifests': [runtime, attestation]}))
        (self.root / 'oci-layout').write_text('{"imageLayoutVersion":"1.0.0"}')
        return runtime

    def replace_subjects(self, subjects, predicate_type=None):
        path = self.root / 'index.json'
        index = json.loads(path.read_text())
        descriptor = index['manifests'][1]
        body = json.loads(image.blob(self.root, descriptor))
        for layer in body['layers']:
            statement = json.loads(image.blob(self.root, layer))
            if predicate_type is not None and statement['predicateType'] != predicate_type:
                continue
            statement['subject'] = subjects
            layer.update(self.blob(statement, media=layer['mediaType']))
        descriptor.update(self.blob(body))
        path.write_text(json.dumps(index))

    def check(self, arch='amd64'):
        return image.verify(self.root, {arch: self.expected}, self.revision, '0.1.0-alpha.1')

class Candidate(CandidateFixtures, unittest.TestCase):
    def test_accepts_approved_candidate(self):
        self.fixture()
        self.assertEqual(self.check()['platforms']['amd64']['binary_sha256'], self.expected)

    def test_pinned_buildkit_named_oci_subjects_bind_platform_manifest(self):
        for arch in ['amd64', 'arm64']:
            with self.subTest(arch=arch):
                runtime = self.fixture(arch=arch, buildkit_name='localhost/hennery-collector')
                self.assertEqual(self.check(arch)['platforms'][arch]['digest'], runtime['digest'])

    def test_pinned_buildkit_unnamed_oci_subjects_are_refused(self):
        runtime = self.fixture(buildkit_name='')
        index = json.loads((self.root / 'index.json').read_text())
        attestation = json.loads(image.blob(self.root, index['manifests'][1]))
        self.assertEqual(attestation['subject']['digest'], runtime['digest'])
        for layer in attestation['layers']:
            statement = json.loads(image.blob(self.root, layer))
            self.assertEqual(statement['_type'], 'https://in-toto.io/Statement/v1')
            self.assertEqual(statement['subject'], [])
        with self.assertRaisesRegex(ValueError, 'attestation subject mismatch'):
            self.check()
        # Neither predicate can borrow the other's valid binding or rely only
        # on the enclosing OCI artifact's correct image subject descriptor.
        for kind in ['https://spdx.dev/Document', 'https://slsa.dev/provenance/v0.2']:
            with self.subTest(kind=kind):
                self.fixture(buildkit_name='localhost/hennery-collector')
                self.replace_subjects([], predicate_type=kind)
                with self.assertRaisesRegex(ValueError, 'attestation subject mismatch'):
                    self.check()

    def test_subject_config_index_or_prefixed_digest_cannot_replace_manifest(self):
        runtime = self.fixture(buildkit_name='localhost/hennery-collector')
        manifest = json.loads(image.blob(self.root, runtime))
        wrong = [manifest['config']['digest'][7:],
                 hashlib.sha256((self.root / 'index.json').read_bytes()).hexdigest(),
                 runtime['digest']]
        for digest in wrong:
            with self.subTest(digest=digest):
                self.replace_subjects([{'name': 'image', 'digest': {'sha256': digest}}])
                with self.assertRaisesRegex(ValueError, 'attestation subject mismatch'):
                    self.check()

    def test_each_identity_label_is_bound(self):
        for key in ['version', 'source', 'licenses']:
            with self.subTest(label=key):
                self.fixture(labels={'org.opencontainers.image.' + key: 'wrong'})
                with self.assertRaisesRegex(ValueError, key):
                    self.check()

    def test_whiteouts_cannot_hide_payload_from_verification(self):
        for whiteout in ['.wh..wh..opq', 'usr/local/bin/.wh..wh..opq', 'usr/share/doc/.wh.hennery',
                         'usr/.wh.local', 'usr/local/bin/.wh.hennery']:
            with self.subTest(whiteout=whiteout):
                self.fixture(whiteout=whiteout)
                with self.assertRaisesRegex(ValueError, 'missing payload'):
                    self.check()

    def test_same_layer_files_survive_whiteout_regardless_of_tar_order(self):
        self.fixture(whiteout='usr/local/bin/.wh..wh..opq', same_layer_files=True)
        try:
            report = self.check()
        except ValueError as error:
            self.fail(f'valid same-layer additions were rejected: {error}')
        self.assertEqual(report['platforms']['amd64']['binary_sha256'], self.expected)

    def test_symlink_payload_is_refused(self):
        self.fixture(symlink=True)
        with self.assertRaisesRegex(ValueError, 'non-regular payload'):
            self.check()

    def test_equivalent_tar_paths_refuse_in_either_layer_order(self):
        for name in ['usr/local/bin/./hennery', '././usr/local/bin/hennery',
                     '/usr/local/bin/hennery', 'usr//local/bin/hennery',
                     'usr/local/bin/../bin/hennery', 'usr/local/bin/hennery/']:
            for first in [False, True]:
                with self.subTest(name=name, first=first):
                    self.assertEqual(posixpath.normpath(name.lstrip('/').rstrip('/')),
                                     'usr/local/bin/hennery')
                    self.fixture(extra_layers=[[(name, tarfile.REGTYPE, b'changed')]], extra_first=first)
                    with self.assertRaisesRegex(ValueError, 'ambiguous tar path'):
                        self.check()

    def test_canonical_overlays_follow_layer_order(self):
        for name in ['usr/local/bin/hennery', './usr/local/bin/hennery']:
            with self.subTest(name=name):
                overlay = [[(name, tarfile.REGTYPE, b'changed')]]
                self.fixture(extra_layers=overlay, extra_first=True)
                self.assertEqual(self.check()['platforms']['amd64']['binary_sha256'], self.expected)
                self.fixture(extra_layers=overlay)
                with self.assertRaisesRegex(ValueError, 'binary digest mismatch'):
                    self.check()

    def test_ancestor_replacements_refuse_in_either_layer_order(self):
        for name in ['usr', 'usr/local', 'usr/local/bin', 'usr/share/doc/hennery']:
            for kind in [tarfile.REGTYPE, tarfile.SYMTYPE, tarfile.LNKTYPE]:
                for first in [False, True]:
                    with self.subTest(name=name, kind=kind, first=first):
                        value = b'changed' if kind == tarfile.REGTYPE else 'elsewhere'
                        self.fixture(extra_layers=[[(name, kind, value)]], extra_first=first)
                        with self.assertRaisesRegex(ValueError, 'non-directory payload ancestor'):
                            self.check()

    def test_links_to_payload_or_ancestors_refuse_before_alias_writes(self):
        for kind in [tarfile.SYMTYPE, tarfile.LNKTYPE]:
            for target in ['usr/local/bin/hennery', '/usr/local/bin', 'usr',
                           './usr/local/bin/../bin/hennery', '/', '.']:
                for first in [False, True]:
                    with self.subTest(kind=kind, target=target, first=first):
                        self.fixture(extra_layers=[[('alias', kind, target)],
                            [('alias/hennery', tarfile.REGTYPE, b'changed')]], extra_first=first)
                        with self.assertRaisesRegex(ValueError, 'link aliases protected payload'):
                            self.check()

    def test_empty_binary_sbom_is_refused(self):
        self.fixture(binary_bom={})
        with self.assertRaisesRegex(ValueError, 'binary SPDX SBOM'):
            self.check()

    def test_symlink_components_are_checked_before_parent_traversal(self):
        # Compare against the filesystem, where '..' is applied AFTER x/y is
        # resolved. A lexical normpath of the very same tar target disagrees.
        for absolute in [False, True]:
            for chained in [False, True]:
                for alias, target in [('alias', 'x/../hennery'),
                                      ('alias', '/x/../hennery'),
                                      ('links/alias', '../x/../hennery')]:
                    for reverse in [False, True]:
                        for split in [False, True]:
                            with self.subTest(absolute=absolute, chained=chained,
                                              alias=alias, target=target, reverse=reverse, split=split):
                                first = '/usr/local/bin/sub' if absolute else 'usr/local/bin/sub'
                                links = [('x', tarfile.SYMTYPE, first)]
                                final_target = target
                                if chained:
                                    links.append(('y', tarfile.SYMTYPE, 'x'))
                                    final_target = target.replace('x/', 'y/')
                                links.append((alias, tarfile.SYMTYPE, final_target))
                                hard_alias = str(Path(alias).with_name('hard-alias'))
                                links.append((hard_alias, tarfile.LNKTYPE, '/' + alias if absolute else alias))
                                if reverse:
                                    links.reverse()
                                with tempfile.TemporaryDirectory(dir=self.root) as directory:
                                    fs = Path(directory).resolve()
                                    (fs / 'usr/local/bin/sub').mkdir(parents=True)
                                    (fs / 'usr/local/bin/hennery').write_bytes(self.binary)
                                    (fs / 'links').mkdir()
                                    for name, kind, destination in links:
                                        if kind != tarfile.SYMTYPE:
                                            continue
                                        actual = str(fs / destination.lstrip('/')) if destination.startswith('/') else destination
                                        (fs / name).symlink_to(actual)
                                    os.link(fs / alias, fs / hard_alias, follow_symlinks=False)
                                    self.assertEqual((fs / alias).resolve(strict=True), fs / 'usr/local/bin/hennery')
                                    self.assertEqual((fs / hard_alias).resolve(strict=True), fs / 'usr/local/bin/hennery')
                                entries = [('usr/local/bin/sub', tarfile.DIRTYPE, b''), *links]
                                layers = [[entry] for entry in entries] if split else [entries]
                                self.fixture(extra_layers=layers)
                                with self.assertRaisesRegex(ValueError, 'path traverses image symlink'):
                                    self.check()

    def test_symlink_loops_refuse_without_recursive_resolution(self):
        for links in [[('x', tarfile.SYMTYPE, 'x')],
                      [('x', tarfile.SYMTYPE, 'y'), ('y', tarfile.SYMTYPE, 'x')],
                      [('x', tarfile.SYMTYPE, '/y'), ('y', tarfile.SYMTYPE, './x')]]:
            for ordered in [links, list(reversed(links))]:
                with self.subTest(links=ordered):
                    self.fixture(extra_layers=[[entry] for entry in ordered])
                    with self.assertRaisesRegex(ValueError, 'path traverses image symlink'):
                        self.check()

    def test_hardlinks_to_symlink_aliases_refuse_in_both_orders(self):
        for target in ['x', '/x', './x', 'x/../elsewhere']:
            for reverse in [False, True]:
                with self.subTest(target=target, reverse=reverse):
                    entries = [('x', tarfile.SYMTYPE, 'usr/local/bin/sub'),
                               ('hard-alias', tarfile.LNKTYPE, target)]
                    if reverse:
                        entries.reverse()
                    self.fixture(extra_layers=[[entry] for entry in entries])
                    with self.assertRaisesRegex(ValueError, 'path traverses image symlink'):
                        self.check()

    def test_tar_members_cannot_write_through_symlinked_parents(self):
        self.fixture(extra_layers=[[('x', tarfile.SYMTYPE, 'usr/local/bin/sub')],
                                   [('x/child', tarfile.REGTYPE, b'changed')]])
        with self.assertRaisesRegex(ValueError, 'path traverses image symlink'):
            self.check()

    def test_direct_unprotected_symlinks_remain_allowed(self):
        self.fixture(extra_layers=[[('x', tarfile.SYMTYPE, 'usr/local/bin/sub')]])
        self.assertEqual(self.check()['platforms']['amd64']['binary_sha256'], self.expected)

    def test_empty_scanner_sbom_is_refused(self):
        self.fixture(scanner_bom={})
        with self.assertRaisesRegex(ValueError, 'empty image SBOM'):
            self.check()

    def test_orphan_attestation_is_refused(self):
        self.fixture(reference_digest='sha256:' + 'f' * 64)
        with self.assertRaisesRegex(ValueError, 'orphan attestation'):
            self.check()

    def test_config_platform_mismatch_is_refused(self):
        self.fixture(config_arch='arm64')
        with self.assertRaisesRegex(ValueError, 'config platform mismatch'):
            self.check()

    def test_missing_platform_is_refused(self):
        self.fixture()
        with self.assertRaisesRegex(ValueError, 'missing image platform'):
            image.verify(self.root, dict.fromkeys(['amd64', 'arm64'], self.expected),
                         self.revision, '0.1.0-alpha.1')

    def test_invalid_inventory_is_refused(self):
        self.fixture()
        with self.assertRaisesRegex(ValueError, 'platform inventory'):
            image.verify(self.root, {}, self.revision, '0.1.0-alpha.1')

    def test_invalid_source_identity_is_refused(self):
        self.fixture()
        with self.assertRaisesRegex(ValueError, 'invalid source revision'):
            image.verify(self.root, {'amd64': self.expected}, 'not-a-sha', '0.1.0-alpha.1')

    def test_invalid_version_is_refused(self):
        self.fixture()
        with self.assertRaisesRegex(ValueError, 'invalid image version'):
            image.verify(self.root, {'amd64': self.expected}, self.revision, 'latest')

    def test_binary_must_match_approved_inventory(self):
        self.fixture(binary=b'changed')
        with self.assertRaisesRegex(ValueError, 'binary digest'):
            self.check()

    def test_notices_are_required(self):
        self.fixture(notices=False)
        with self.assertRaisesRegex(ValueError, 'THIRD-PARTY-NOTICES'):
            self.check()

    def test_root_is_refused(self):
        self.fixture(user='0')
        with self.assertRaisesRegex(ValueError, 'non-root'):
            self.check()

    def test_revision_is_bound(self):
        self.fixture(revision='b' * 40)
        with self.assertRaisesRegex(ValueError, 'revision'):
            self.check()

    def test_provenance_is_required(self):
        self.fixture(provenance=False)
        with self.assertRaisesRegex(ValueError, 'provenance'):
            self.check()

    def test_sbom_is_required(self):
        self.fixture(sbom=False)
        with self.assertRaisesRegex(ValueError, 'SBOM'):
            self.check()

    def test_attestations_name_runtime_digest(self):
        self.fixture(subject='f' * 64)
        with self.assertRaisesRegex(ValueError, 'subject'):
            self.check()

    def test_invalid_blob_algorithm_is_refused(self):
        desc = self.fixture()
        # Keep bytes/size and the on-disk suffix valid, isolating the algorithm
        # check from missing-file and downstream attestation errors.
        desc['digest'] = desc['digest'].replace('sha256:', 'sha512:')
        with self.assertRaisesRegex(ValueError, 'invalid blob digest'):
            image.blob(self.root, desc)

    def test_blob_tampering_is_refused(self):
        desc = self.fixture()
        path = self.root / 'blobs/sha256' / desc['digest'][7:]
        manifest = json.loads(path.read_bytes())
        manifest['annotations'] = {'tampered': 'structurally valid JSON'}
        path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, 'blob digest'):
            self.check()

    def test_wrong_platform_is_refused(self):
        self.fixture(arch='arm64')
        with self.assertRaisesRegex(ValueError, 'platform'):
            self.check()

    def test_duplicate_platform_is_refused(self):
        self.fixture()
        path = self.root / 'index.json'
        index = json.loads(path.read_text())
        index['manifests'].append(index['manifests'][0])
        path.write_text(json.dumps(index))
        with self.assertRaisesRegex(ValueError, 'unexpected/duplicate platform'):
            self.check()


class Index(CandidateFixtures, unittest.TestCase):
    def test_subject_cannot_bind_a_different_platform_manifest(self):
        inputs = self.pair()
        other = json.loads((inputs[1] / 'index.json').read_text())['manifests'][0]['digest']
        self.root = inputs[0]
        self.replace_subjects([{'name': 'image', 'digest': {'sha256': other[7:]}}])
        with self.assertRaisesRegex(ValueError, 'attestation subject mismatch'):
            self.check()

    def pair(self, second_arch='arm64'):
        base = self.root
        self.root = base / 'amd64'
        (self.root / 'blobs/sha256').mkdir(parents=True)
        self.fixture()
        self.root = base / 'arm64'
        (self.root / 'blobs/sha256').mkdir(parents=True)
        self.fixture(arch=second_arch)
        self.root = base
        return [base / 'amd64', base / 'arm64']

    def test_merge_preserves_both_subjects_and_all_blobs(self):
        inputs = self.pair()
        digest = image.merge(self.root / 'joined', inputs)
        report = image.verify(self.root / 'joined', dict.fromkeys(['amd64', 'arm64'], self.expected),
                              self.revision, '0.1.0-alpha.1')
        self.assertEqual(set(report['platforms']), {'amd64', 'arm64'})
        self.assertTrue(digest.startswith('sha256:'))
        for source in inputs:
            for path in (source / 'blobs/sha256').iterdir():
                self.assertEqual(path.read_bytes(), (self.root / 'joined/blobs/sha256' / path.name).read_bytes())

    def test_merge_refuses_existing_output(self):
        inputs = self.pair()
        output = self.root / 'joined'
        output.mkdir()
        with self.assertRaisesRegex(ValueError, 'output already exists'):
            image.merge(output, inputs)

    def test_merge_refuses_symlink_blob(self):
        inputs = self.pair()
        first = next((inputs[0] / 'blobs/sha256').iterdir())
        (inputs[0] / 'blobs/sha256' / ('0' * 64)).symlink_to(first)
        with self.assertRaisesRegex(ValueError, 'invalid OCI blob file'):
            image.merge(self.root / 'joined', inputs)

    def test_merge_refuses_unreferenced_corrupt_blob(self):
        inputs = self.pair()
        (inputs[0] / 'blobs/sha256' / ('0' * 64)).write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError, 'blob digest mismatch'):
            image.merge(self.root / 'joined', inputs)

    def test_merge_rejects_duplicate_platform(self):
        inputs = self.pair('amd64')
        with self.assertRaisesRegex(ValueError, 'both native platforms'):
            image.merge(self.root / 'joined', inputs)

    def test_merge_rejects_missing_platform(self):
        inputs = self.pair()
        with self.assertRaisesRegex(ValueError, 'two native layouts'):
            image.merge(self.root / 'joined', inputs[:1])

if __name__ == '__main__':
    unittest.main()
