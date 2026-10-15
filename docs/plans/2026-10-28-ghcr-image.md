# GHCR collector image (R4) Implementation Plan

> Execute one task at a time, preserve the ledger and request independent parent
> review. Every File block is the complete final file; the plan itself is not
> recursively embedded. Build first, observe RED, then replay fresh.

**Goal:** Produce collector-only linux/amd64 and linux/arm64 OCI images from
unchanged release musl binaries, with labels, licences, binary/base SBOMs,
provenance, exact digest pinning and one multi-arch index. Publish retained bytes
only through R1's real protected gate and the maintainer-signed global inventory.

**Architecture:** Fresh native R1 archives supply the executable, notices and
binary SPDX to the existing Dockerfile's release target. Native OCI outputs and
joined index round-trip through loopback registries. Before R1 freezes its global
inventory, R4 adds `ghcr-oci-layout.tar` and a normalized `ghcr-index.json` listing
index/platform digests. Protected GHCR jobs live inside R1's tagged manual
`release-publish.yml`; they use the complete held root, direct authorization
and current inventory/attempt conditions. Every write calls the shared gate and
rechecks actual OCI/binary bytes. Consumers use R1's hardware-inventory-plus-
Sigstore verifier, extended to explicitly listed platform subjects.

**Tech stack:** existing musl executable; digest-pinned distroless static/debug
bases, BuildKit and Syft; Docker, Skopeo, Python stdlib/PyYAML, OpenPGP through
R1's pinned-key verifier, GitHub keyless attestations. Plain Nix dev shells:
`image` for offline image contracts/lint; `release` for R1's live gate, GnuPG,
held storage and common verifier; default for Rust. No global installs.

**Spec:** [approved release design](../specs/2026-10-15-distribution-release-design.md)
§4.6 and §5, [7a](2026-10-07-release-build.md), merged
[R1 plan](2026-10-28-release-foundation.md), [release process](../release-process.md)
and [gate contract](../../packaging/release/README.md). Original base `14a754b6`;
current base **`191aa71b`**, as requested after R1 merged. House structure follows
plan 3c. The fleet parent assigned this future-dated plan path on 2026-10-15.

## Execution status (2026-10-15)

**Built and integrated with merged R1; scoped integration review and native CI
remain parent-owned. Nothing published or enabled.** Rebased `plan/dist-r4`
onto `origin/main` at `191aa71b` with signing disabled. Conflicts preserved both
release/image shells, R1's hardware-root/bootstrap/package policy, collector
instructions and every upstream plan-index entry. Conflict-resolved staged bytes
were checked against tested snapshots before continuation.

R1 already supplied mandatory OpenPGP inventory approval and exact-tag Sigstore
for OCI. R4 reuses that shared verifier, rather than copying signature logic.
Its normalized descriptor now authorizes both platform manifest digests as well
as the index; schema, source/version, platform set, distinct SHA-256 digests and
signed membership are required. The low-level `image.py` inspects candidate OCI
bytes before approval; it is not a consumer authentication substitute. Every
release consumer uses `packaging/release/verify.py` with the complete frozen root
and external `.asc`. Missing/malformed/wrong-key/different-inventory approvals
remain refused by R1's common verifier.

The provisional adapter, approval-ID environment protocol and orphan reusable
candidate/publisher workflows are removed. `packaging/release-gate ghcr` is the
only live authority. `ghcr` and `ghcr-attest` use environment **`release`**, direct
`needs: authorize` and R1's exact current inventory/attempt condition. All registry
writes, including attestation pushes, use **`secrets.GHCR_PUBLISH_TOKEN`**, held
only in that environment, with `vars.GHCR_PUBLISH_USER`. The ordinary job token
requests package READ; the package's actual Actions access must separately be
READ. No administration credential is given to publishers. Both release switches
remain disabled until maintainer qualification; first alpha remains GitHub only.

The publisher revalidates live approval, global inventory digest and the pinned
maintainer signature before credentials and each write. It binds executable hashes
to signed `inventory.binaries[target]`, compares real index/platform digests and
allows only the verified working layout. Materialization is outside the held
candidate; ambiguous/link/duplicate archive paths, working-file/metadata changes
and changed source/version/descriptors refuse. Unique matrix receipt names avoid
held-audit collisions. Signing jobs verify every provenance and image/binary SPDX
bundle with the common hardware-plus-exact-tag verifier and hold those bundles.

Current RED evidence: 10 new integration tests produced **11 assertion failures**
against the previous implementation, including both rejected approved platform
subjects and missing real workflow integration. The rewritten publisher suite
was RED before wiring the gate. A tool-context regression failed with exit 92
before invoking both gate and qualifier in the pinned release shell. The writer
classifier was strengthened to detect dedicated-credential writes with READ
ordinary tokens; a new lint-reference regression was RED before restricting
classification to executed registry commands. No rule/test/type was weakened.

The first Rust run failed `doctor::tests::the_collector_is_reached_step_by_step_and_its_hello_judged`
under load (130 passed, 1 failed in that binary). The unchanged test passed alone;
the unchanged complete workspace command then passed. Initial/final logs are
retained separately. No Rust/web source was changed by this integration.

Earlier static reviews confirmed the HTTP recovery, tar/link and CI qualification
amendments. Actual CI at `b4bc39d7` passed the repaired BuildKit attestation binding;
its later missing-PID failure was corrected test-first before `fc8aea88`.
Those reviews/results are historical, not approval of this integration. Prior
49/65/70/72/81 mutation counts and 111/114-contract replays are superseded below.

No real registry push/login, token acquisition, release/tag push, settings change
or maintainer/YubiKey signing ran. Disposable software-key tests exercise R1's
cryptography only. Docker is unavailable locally; parent-managed draft #143 is
the real native Docker proof. GitHub checks/reviewDecision/mergeStateStatus and
unresolved human/bot threads are unqueried here. Ledger and retained scratch:
`.superpowers/sdd/r4/ledger.md`.

## Scope

Three tasks: collector/OCI contract; native release candidate/index/loopback
integration; protected publication/signing and maintainer guidance. R1 owns
approval/tag/settings/retention authentication and signature implementation.
R4 extends only shared image membership and writer detection needed for this
channel. No real publication, aliases, agent-host image, extra platforms,
registry creation or credential-kind enablement is authorized.

## Decisions

- Collector-only distroless static; managed Node/agents require glibc and are
  not supported here. Hosts pair beside repositories.
- Preserve executable/OCI bytes and digests. A base rebuild gets a new immutable
  version/revision, never replacement under old approval.
- Freeze the complete flat candidate, not an expiring channel-only Actions copy.
  The signed global inventory hashes OCI tar/descriptor and records binary hashes.
- Use R1's actual channel `ghcr`, protected environment `release`, common manual
  tagged orchestrator, enable variables and exact current authorization condition.
- Environment-held dedicated registry credential only; ordinary package Actions
  access READ. Credential kind and real negative push acceptance are maintainer-only.
- Require the pinned maintainer inventory signature **and** exact-tag Sigstore
  identity at every release consumer. Reuse R1's implementation and trusted bootstrap.
- Receipts/working OCI/signature sidecars stay outside the immutable candidate.
  Revalidate at every write; ambiguous recovery stops. Matrix receipts are unique.

## Global constraints

- No publication, real login, publishing credential, release/tag push, settings
  mutation or hardware signing. Loopback-only acceptance is configured in CI.
- Pinned actions/images, timeouts, least ordinary token permissions, no candidate
  build-cache restores, no mutable aliases. Platform protection and the physical
  inventory signature are the boundary; static workflow checks are defense in depth.
- Every new refusal has an offline regression and assertion-producing COPY probe.
  Mutation probes never run in the worktree. Staged bytes must equal tested bytes.
- Plain Nix tooling, isolated HOME/XDG/config/cache, one Cargo target per worktree,
  personal author, signing-disabled git operations, exact parent-specified lease.
- Preserve all scratch. No memory writes. Parent owns independent reviews and
  complete PR status. New docs retain the required AI review footer.

## Review focus

1. Real shared gate, complete held candidate, signed inventory digest, live review,
   exact source/tag/checks and run attempt at credential/upload/signing boundaries.
2. Dedicated protected registry credential versus READ ordinary package token;
   operator-set package Actions READ, credential capability and branch negative proof.
3. Common OCI verifier requires hardware approval and exact release-publish tag
   identity for index and both listed platforms/SPDX predicates; no copied verifier.
4. Actual OCI/binary/descriptor binding, safe data-only materialization outside
   the root, no alternate upload layout or changed metadata under approval.
5. Native release-target qualification, UI/health/storage/process UID, loopback
   round-trips, fresh receipt uniqueness, held bundles and retry/completion refusal.
6. Honest collector/glibc deployment docs, immutable rollback/source retention and
   no prerelease aliases or channel enablement without maintainer action.

## File structure

- Dockerfile/.dockerignore/image shell: collector/release contents and tooling.
- `packaging/image.py`, signing extractor, native/CI/registry/smoke scripts:
  unapproved candidate payload integrity and loopback acceptance.
- `packaging/ghcr-candidate.py`: signed R1 candidate/actual OCI/index/binary binding.
- `release-candidate.yml`, `build.yml`: native qualification and complete freeze.
- `release-publish.yml`, `ghcr-gate.sh`, `ghcr-publish.sh`, `ghcr-remote.py`:
  actual protected writer/signers, boundary checks and authoritative recovery.
- R1's `verify.py`/`workflow_policy.py`: platform membership and writer recognition.
- Image/release contract tests and deployment/maintainer guide; docs plan index.

## Reading the steps

Each File block replaces its entire path. Start from `191aa71b`; preserve base
file modes and create new source files as 0644. Existing shell script modes remain
0755. No patch fragments or deleted orphan workflows need reconstruction: those
workflows do not exist in this base. Count nonzero blocks and compare bytes/modes
at every task; metadata-only record changes are copied back after verification.

## Task 1: Collector contract and retained OCI verifier

- [x] Tests observed RED, implementation and COPY probes.
- [x] Exact final source below; fresh replay recorded.
- [ ] Parent scoped review and native Docker acceptance.

Run the OCI and smoke/parser contract files in the image shell. These tests use transport/process doubles; they do not start Docker.

### File: `packaging/tests/test_image.py`

~~~~python
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
~~~~

### File: `packaging/tests/test_smoke_image.py`

~~~~python
"""Revert-probeable smoke assertions. Docker and HTTP are fully stubbed."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / 'smoke-image.sh'


class Smoke(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.env = dict(os.environ, PATH=str(root) + os.pathsep + os.environ['PATH'],
                        HTML_CONTENT='<html><div id="root"></div><script src="/assets/index-123.js"></script></html>',
                        JS_CONTENT='compiled module')
        scripts = {
            'docker': '''#!/bin/sh
case "$1" in
 run) case "$*" in *--entrypoint*) echo "${DATA_MODE:-65532:65532 700}";; *) echo container;; esac;;
 exec|rm|logs) exit 0;;
 inspect) case "$*" in *Mounts*) echo volume;; *State.Health*) echo healthy;; *Config.User*) echo "${IMAGE_USER:-65532:65532}";; esac;;
 top)
   if [ "$3" != -eo ] || [ "$4" != pid,uid,user ]; then
     echo "Error response from daemon: Couldn't find PID field in ps output" >&2
     exit 1
   fi
   printf 'PID UID USER\\n123 %s user\\n' "${PROCESS_UID:-65532}"
   exit "${TOP_STATUS:-0}";;
 port) echo "${PORT:-127.0.0.1:12345}";;
 export) exit 0;;
 *) exit 90;;
esac
''',
            'curl': '''#!/bin/sh
case "$*" in
 *assets*) printf '%s' "$JS_CONTENT";;
 *) printf '%s' "$HTML_CONTENT";;
esac
''',
            'tar': '''#!/bin/sh
printf '%s\\n' 'drwx------ 65532/65532 0 date var/lib/hennery/' 'drwxr-xr-x 0/0 0 date var/lib/'
''',
        }
        for name, body in scripts.items():
            path = root / name
            path.write_text(body)
            path.chmod(0o755)

    def run_smoke(self):
        return subprocess.run(['sh', str(SCRIPT), 'stub-image'], env=self.env,
                               capture_output=True, text=True)

    def test_all_smoke_assertions_pass(self):
        result = self.run_smoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('embedded UI and module asset served', result.stdout)

    def test_actual_process_root_is_refused(self):
        self.env['PROCESS_UID'] = '0'
        result = self.run_smoke()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('running process UID', result.stderr)

    def test_failed_docker_top_is_refused_even_with_valid_stdout(self):
        self.env['TOP_STATUS'] = '1'
        result = self.run_smoke()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('cannot inspect running processes', result.stderr)

    def test_image_config_root_is_refused(self):
        self.env['IMAGE_USER'] = '0:0'
        self.assertIn('image runs as', self.run_smoke().stderr)

    def test_open_volume_is_refused(self):
        self.env['DATA_MODE'] = '65532:65532 755'
        self.assertIn('data directory', self.run_smoke().stderr)

    def test_public_port_is_refused(self):
        self.env['PORT'] = '0.0.0.0:12345'
        self.assertIn('not loopback', self.run_smoke().stderr)

    def test_missing_ui_root_is_refused(self):
        self.env['HTML_CONTENT'] = '<html>not the UI</html>'
        self.assertIn('UI root missing', self.run_smoke().stderr)

    def test_placeholder_is_refused(self):
        self.env['HTML_CONTENT'] = '<div id="root">hennery-web-ui-not-embedded</div>'
        self.assertIn('placeholder UI', self.run_smoke().stderr)

    def test_missing_chunk_is_refused(self):
        self.env['HTML_CONTENT'] = '<div id="root"></div>'
        self.assertIn('no embedded module', self.run_smoke().stderr)

    def test_empty_chunk_is_refused(self):
        self.env['JS_CONTENT'] = ''
        self.assertIn('empty UI module', self.run_smoke().stderr)


class ProcessListing(unittest.TestCase):
    def parse(self, listing):
        return subprocess.run(['awk', '-f', str(SCRIPT.with_name('image-processes.awk'))],
                              input=listing, capture_output=True, text=True)

    def test_numeric_uid_with_pid_and_arbitrary_user_name(self):
        for listing in ['PID UID USER\n123 65532 nonroot\n',
                        '    PID   UID USER\n  456 65532 65532\n',
                        'PID UID USER\n123 65532 nonroot\n124 65532 nonroot\n']:
            with self.subTest(listing=listing):
                result = self.parse(listing)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, '65532\n')

    def test_root_or_ambiguous_process_listing_is_refused(self):
        for listing in ['', 'UID\n65532\n', 'PID UID USER\n',
                        'PID UID USER\n123 0 root\n',
                        'PID UID USER\n123 65532 nonroot\n124 0 root\n',
                        'PID UID USER\n123 nonroot nonroot\n',
                        'PID UID USER\n123 1000 user\n',
                        'PID UID USER\nzero 65532 nonroot\n',
                        'PID UID USER\n123x 65532 nonroot\n',
                        'PID UID USER\n0 65532 nonroot\n',
                        'PID UID USER\n123 65532\n',
                        'PID UID USER\n123 65532 nonroot extra\n',
                        'PID USER UID\n123 nonroot 65532\n',
                        'UID PID USER\n123 65532 nonroot\n',
                        'PID USER UID\n123 65532 nonroot\n',
                        'PID UID NAME\n123 65532 nonroot\n',
                        'PID UID USER\n123 65532 nonroot\n\n']:
            with self.subTest(listing=listing):
                result = self.parse(listing)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, '')


if __name__ == '__main__':
    unittest.main()
~~~~

### File: `.dockerignore`

~~~~text
# Only staged distribution inputs and the project licence reach the build context.
*
!dist/
!LICENSE
~~~~

### File: `Dockerfile`

~~~~text
# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# The collector's image (distribution spec §4.1): the released musl binary,
# the same bytes as the archive, on distroless static (CA roots and a
# non-root user, no shell). No Node and no adapters: hosts run next to the
# repositories, never in this image (managed Node/agents require glibc).
# The `build` workflow stages the binary
# at `dist/linux-<arch>/hennery` (plan 7a). Every image is pinned by its
# multi-arch index digest, the tag beside it for the reader.
# The binary embeds the web UI: the archive job builds it first, with
# HENNERY_WEB_REQUIRE=1, and checks the placeholder is absent
# (`packaging/check-web-ui.sh`, plan 4b). Nothing here builds.

# The data directory, owned by the image's user. A volume Docker creates on
# a path the image lacks would be root's, and the collector, running as
# 65532, could not write it. Distroless has no shell to make it with, so a
# stage of the same base's debug variant (busybox) does, 0700. Its parent is
# copied, not the directory: `COPY` of a directory copies what it holds, and
# makes the target with a mode of its own, whatever `--chmod` says.
FROM gcr.io/distroless/static-debian13:debug@sha256:07148a6899406df51906b183f581cf66e5b05fd51aca438bdf1d3998df566961 AS data
RUN ["/busybox/mkdir", "-p", "-m", "0700", "/out/var/lib/hennery"]

FROM gcr.io/distroless/static-debian13:nonroot@sha256:e2e927ec666bae08560abb3c55d0659eceabb657f56b6782ab500a9fc7f555e3 AS collector
ARG TARGETARCH
ARG VERSION=0.0.0
ARG REVISION=0000000000000000000000000000000000000000
LABEL org.opencontainers.image.title="hennery collector" \
      org.opencontainers.image.description="Collector with embedded web UI; pair separate hosts near their repositories" \
      org.opencontainers.image.source="https://github.com/marcinwadon/hennery" \
      org.opencontainers.image.url="https://github.com/marcinwadon/hennery" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
COPY --chmod=0755 dist/linux-${TARGETARCH}/hennery /usr/local/bin/hennery
COPY --chmod=0444 LICENSE /usr/share/doc/hennery/LICENSE
COPY --from=data --chown=65532:65532 /out/var/lib/ /var/lib/
ENV HENNERY_DATA_DIR=/var/lib/hennery HENNERY_LISTEN=0.0.0.0:8080
# Local storage only: SQLite's locking is unreliable on network filesystems.
VOLUME ["/var/lib/hennery"]
USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/usr/local/bin/hennery", "collector", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/hennery"]
CMD ["collector"]

# R1 supplies reviewed Rust + vendored native + frontend notices and SPDX.
# The release target fails to build if those retained inputs are absent.
# The legacy PR/main smoke image uses --target collector; it is never promoted.
FROM collector AS release
ARG TARGETARCH
COPY --chmod=0444 dist/linux-${TARGETARCH}/THIRD-PARTY-NOTICES /usr/share/doc/hennery/THIRD-PARTY-NOTICES
COPY --chmod=0444 dist/linux-${TARGETARCH}/binary.spdx.json /usr/share/doc/hennery/binary.spdx.json
~~~~

### File: `flake.nix`

~~~~nix
{
  description = "hennery: self-hosted cockpit for ACP coding agents";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # The web UI's tools (plan 4b): Node, pnpm and Playwright's browsers,
    # pinned apart from the Rust side, so a bump of either never drags the
    # other along. `@playwright/test` in web/package.json must be exactly
    # this nixpkgs' `playwright-driver` version.
    nixpkgs-web.url = "github:NixOS/nixpkgs/e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa";
    flake-utils.url = "github:numtide/flake-utils";
    # The package and its checks (plan 7e-i, distribution spec §4.3).
    crane.url = "github:ipetkov/crane/v0.24.0";
    advisory-db = {
      url = "github:rustsec/advisory-db";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, nixpkgs-web, flake-utils, crane, advisory-db, ... }:
    # The v1 platforms (distribution spec §1): Intel Macs are not one.
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
        web = import nixpkgs-web { inherit system; };
        # The web UI (plan 7e-ii-b), built with nixpkgs-web's Node and pnpm.
        webUi = import ./nix/web.nix { pkgs = web; };
        hennery = import ./nix/package.nix {
          inherit pkgs crane advisory-db webUi;
          sourceRevision = self.rev or "unrecorded (dirty source)";
        };
        # Chromium alone (headless): what the browser checks run on.
        browsers = web.playwright-driver.browsers.override {
          withChromium = false;
          withChromiumHeadlessShell = true;
          withFirefox = false;
          withWebkit = false;
          withFfmpeg = false;
        };
        # The pnpm the web build is pinned to (`nix/web.nix`).
        webTools = [ web.nodejs_24 webUi.pnpm ];
      in {
        packages.default = hennery.package;
        packages.web = webUi;
        checks = hennery.checks;
        # Building the web UI only (CI's Rust and release jobs): no browsers.
        devShells.web = pkgs.mkShell { packages = webTools; };
        # Offline release-policy tests and Object Lock staging tools, pinned
        # by flake.lock. Publication credentials are never supplied here.
        devShells.release = pkgs.mkShell {
          packages = [
            (pkgs.python3.withPackages (ps: [ ps.pyyaml ]))
            pkgs.actionlint
            pkgs.cargo-audit
            pkgs.awscli2
            pkgs.gh
            pkgs.git
            pkgs.gnupg
            pkgs.jq
          ];
        };
        # R4's non-publishing OCI/registry contract tests. Uses the same pinned
        # nixpkgs as the Rust checks; Docker Engine itself is provided by CI.
        devShells.image = pkgs.mkShell {
          packages = with pkgs; [ (python3.withPackages (p: [ p.pyyaml ])) actionlint shellcheck skopeo ];
        };
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            cargo
            rustc
            clippy
            rustfmt
            rust-analyzer
            sqlite
            # `webauthn-rs` links OpenSSL (plan 3c).
            openssl
            pkg-config
            # The PATH-capture tests run each login shell (plan 7c).
            bashInteractive
            zsh
            fish
            # Execute the shipped same-machine TLS proxy recipes (W2).
            caddy
            nginx
          ] ++ webTools;
          RUST_SRC_PATH = "${pkgs.rustPlatform.rustLibSrc}";
          # Playwright uses the flake's browsers, never a download of its own.
          PLAYWRIGHT_BROWSERS_PATH = "${browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
        };
      });
}
~~~~

### File: `packaging/image.py`

~~~~python
#!/usr/bin/env python3
"""Verify retained OCI bytes; assemble an index without rebuilding either image."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import tarfile

SOURCE = 'https://github.com/marcinwadon/hennery'
INDEX = 'application/vnd.oci.image.index.v1+json'


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def blob(root, descriptor):
    digest = descriptor['digest']
    require(re.fullmatch(r'sha256:[0-9a-f]{64}', digest), 'invalid blob digest')
    data = (root / 'blobs/sha256' / digest[7:]).read_bytes()
    require(len(data) == descriptor['size'] and
            hashlib.sha256(data).hexdigest() == digest[7:], 'blob digest/size mismatch')
    return data


def manifests(root, index):
    for desc in index['manifests']:
        obj = json.loads(blob(root, desc))
        if 'manifests' in obj:
            yield from manifests(root, obj)
        else:
            yield desc, obj


def no_symlink_path(path, symlinks):
    """Walk original components, refusing a symlink before any following '..'.

    No symlink is followed, so resolution depth is zero and cycles cannot be
    traversed. A complete layer-history inventory also catches forward links
    and deliberately rejects traversal through subsequently replaced links.
    """
    parts = []
    for part in path.split('/'):
        if part in ('', '.'):
            continue
        if part == '..':
            if parts:
                parts.pop()
            continue
        parts.append(part)
        require('/'.join(parts) not in symlinks, f'path traverses image symlink: {path}')
    return '/'.join(parts)


def payload(root, manifest):
    wanted = {'usr/local/bin/hennery', 'usr/share/doc/hennery/LICENSE',
              'usr/share/doc/hennery/THIRD-PARTY-NOTICES',
              'usr/share/doc/hennery/binary.spdx.json'}
    ancestors = {path[:i] for path in wanted for i, char in enumerate(path) if char == '/'}
    protected = wanted | ancestors | {''}  # A link to the root also aliases every payload.
    files = {}
    symlinks, parents, links = set(), set(), []
    for layer in manifest['layers']:
        additions, whiteouts = {}, []
        with tarfile.open(fileobj=io.BytesIO(blob(root, layer)), mode='r:*') as archive:
            for member in archive:
                name = member.name
                # A root directory entry has no payload effect. All other names
                # must have a single spelling; extraction must not reinterpret it.
                if name in ('.', './') and member.isdir():
                    continue
                # Distroless layers use one archive-root "./" prefix. It is
                # handled identically for every entry, before all checks.
                name = name.removeprefix('./')
                require(name and not name.startswith('/') and
                        all(part not in ('', '.', '..') for part in name.split('/')),
                        f'ambiguous tar path: {name}')
                if name in ancestors:
                    require(member.isdir(), f'non-directory payload ancestor: {name}')
                parents.add(name.rpartition('/')[0])
                if member.issym():
                    symlinks.add(name)
                if member.issym() or member.islnk():
                    links.append((name, member.linkname, member.issym()))
                parent, _, leaf = name.rpartition('/')
                if leaf == '.wh..wh..opq':
                    whiteouts.append((parent + '/' if parent else '', True))
                elif leaf.startswith('.wh.'):
                    whiteouts.append(((parent + '/' if parent else '') + leaf[4:], False))
                if name in wanted:
                    require(member.isfile(), f'non-regular payload: {name}')
                    additions[name] = archive.extractfile(member).read()
        # Whiteouts affect lower layers, including an entire ancestor directory
        # or the root. Same-layer additions survive regardless of tar ordering.
        for hidden, opaque in whiteouts:
            for path in list(files):
                if (opaque and path.startswith(hidden)) or (
                    not opaque and (path == hidden or path.startswith(hidden + '/'))
                ):
                    del files[path]
        files.update(additions)
    # Conservatively refuse every path/target crossing any image symlink,
    # including forward references, loops and hardlinks to symbolic aliases.
    # Validate original components: normpath before this check would erase
    # x/.. even though POSIX follows x before processing the parent traversal.
    for name, target, symbolic in links:
        if symbolic and not target.startswith('/'):
            target = name.rpartition('/')[0] + '/' + target
        target = no_symlink_path(target, symlinks)
        require(target not in protected, f'link aliases protected payload: {name}')
    for parent in parents:
        no_symlink_path(parent, symlinks)
    for path in wanted:
        require(files.get(path), f'missing payload: {path}')
    bom = json.loads(files['usr/share/doc/hennery/binary.spdx.json'])
    require(bom.get('spdxVersion', '').startswith('SPDX-2.') and bom.get('packages'),
            'missing binary SPDX SBOM')
    return hashlib.sha256(files['usr/local/bin/hennery']).hexdigest()


def verify(root, expected, revision, version):
    root = Path(root)
    require(expected and set(expected) <= {'amd64', 'arm64'}, 'unexpected platform inventory')
    require(re.fullmatch('[0-9a-f]{40}', revision), 'invalid source revision')
    require(re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', version), 'invalid image version')
    index = json.loads((root / 'index.json').read_bytes())
    runtimes, attestations = {}, []
    for desc, manifest in manifests(root, index):
        platform = desc.get('platform', {})
        if platform == {'architecture': 'unknown', 'os': 'unknown'}:
            attestations.append((desc, manifest))
            continue
        arch = platform.get('architecture')
        require(platform.get('os') == 'linux' and arch in expected and arch not in runtimes,
                'unexpected/duplicate platform')
        config = json.loads(blob(root, manifest['config']))
        require(config.get('os') == 'linux' and config.get('architecture') == arch, 'config platform mismatch')
        require(config['config'].get('User') == '65532:65532', 'image must run as non-root 65532:65532')
        labels = config['config'].get('Labels', {})
        for key, value in {'revision': revision, 'version': version, 'source': SOURCE,
                           'licenses': 'AGPL-3.0-only'}.items():
            require(labels.get('org.opencontainers.image.' + key) == value, f'image label mismatch: {key}')
        actual = payload(root, manifest)
        require(actual == expected[arch], f'binary digest mismatch: {arch}')
        runtimes[arch] = {'digest': desc['digest'], 'binary_sha256': actual, 'predicates': []}
    require(set(runtimes) == set(expected), 'missing image platform')
    by_digest = {item['digest']: item for item in runtimes.values()}
    for desc, manifest in attestations:
        annotations = desc.get('annotations', {})
        digest = annotations.get('vnd.docker.reference.digest')
        require(annotations.get('vnd.docker.reference.type') == 'attestation-manifest' and
                digest in by_digest, 'orphan attestation')
        blob(root, manifest['config'])
        for layer in manifest['layers']:
            statement = json.loads(blob(root, layer))
            kind = statement.get('predicateType')
            subjects = statement.get('subject', [])
            require(any(s.get('digest', {}).get('sha256') == digest[7:]
                        for s in subjects),
                    f'attestation subject mismatch: {kind}; expected platform manifest {digest}; '
                    f'{len(subjects)} subject(s)')
            if kind == 'https://spdx.dev/Document':
                predicate = statement['predicate']
                require(predicate.get('spdxVersion', '').startswith('SPDX-2.') and predicate.get('packages'),
                        'empty image SBOM')
            by_digest[digest]['predicates'].append(kind)
    for item in runtimes.values():
        require('https://slsa.dev/provenance/v0.2' in item['predicates'] or
                'https://slsa.dev/provenance/v1' in item['predicates'], 'missing provenance')
        require('https://spdx.dev/Document' in item['predicates'], 'missing image SBOM')
    return {'platforms': runtimes, 'revision': revision, 'version': version}


def merge(output, inputs):
    require(not output.exists(), 'output already exists')
    require(len(inputs) == 2, 'exactly two native layouts required')
    (output / 'blobs/sha256').mkdir(parents=True)
    descriptors = []
    for root in inputs:
        for desc, _ in manifests(root, json.loads((root / 'index.json').read_bytes())):
            descriptors.append(desc)
        for path in (root / 'blobs/sha256').iterdir():
            require(path.is_file() and not path.is_symlink(), 'invalid OCI blob file')
            require(hashlib.sha256(path.read_bytes()).hexdigest() == path.name, 'blob digest mismatch')
            shutil.copyfile(path, output / 'blobs/sha256' / path.name)
    descriptors.sort(key=lambda d: (d['platform']['os'], d['platform']['architecture'], d['digest']))
    platforms = [d['platform']['architecture'] for d in descriptors if d['platform']['os'] == 'linux']
    require(sorted(platforms) == ['amd64', 'arm64'], 'index requires both native platforms exactly once')
    data = json.dumps({'schemaVersion': 2, 'mediaType': INDEX, 'manifests': descriptors},
                      separators=(',', ':')).encode()
    digest = hashlib.sha256(data).hexdigest()
    (output / 'blobs/sha256' / digest).write_bytes(data)
    (output / 'oci-layout').write_text('{"imageLayoutVersion":"1.0.0"}')
    (output / 'index.json').write_text(json.dumps({'schemaVersion': 2, 'manifests': [{
        'mediaType': INDEX, 'digest': 'sha256:' + digest, 'size': len(data),
        'annotations': {'org.opencontainers.image.ref.name': 'collector'}}]}))
    return 'sha256:' + digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    check = sub.add_parser('verify')
    check.add_argument('layout', type=Path)
    check.add_argument('binary_inventory', type=Path)
    check.add_argument('revision')
    check.add_argument('version')
    join = sub.add_parser('merge')
    join.add_argument('output', type=Path)
    join.add_argument('inputs', type=Path, nargs='+')
    args = parser.parse_args()
    if args.command == 'verify':
        print(json.dumps(verify(args.layout, json.loads(args.binary_inventory.read_text()),
                                args.revision, args.version), indent=2))
    else:
        print(merge(args.output, args.inputs))


if __name__ == '__main__':
    main()
~~~~

### File: `packaging/smoke-image.sh`

~~~~sh
#!/bin/sh
# The collector image starts and is healthy (distribution spec §4.1, §9):
# run with the anonymous volume its `VOLUME` makes, as its own user, the
# collector must find that directory its own (65532, 0700), write it, answer
# `collector healthcheck`, and be reported healthy by Docker's own
# `HEALTHCHECK`. Reading the volume's directory on the host needs `sudo`.
#
# Usage: smoke-image.sh <image>
set -eu

image=$1
name="hennery-smoke-$$"
scratch=$(mktemp -d)
trap 'docker rm -fv "$name" >/dev/null 2>&1 || true; rm -f "$scratch/index.html" "$scratch/asset.js"; rmdir "$scratch"' EXIT

fail() {
    docker logs "$name" >&2 || true
    echo "FAIL: $*" >&2
    exit 1
}

# Docker's checks start one interval after the start: shortened here.
docker run -d --name "$name" --health-interval=2s \
    -p 127.0.0.1::8080 "$image" >/dev/null

# The healthcheck itself, as the HEALTHCHECK runs it (no shell in the image).
healthy=0
for _ in $(seq 1 30); do
    if docker exec "$name" /usr/local/bin/hennery collector healthcheck; then
        healthy=1
        break
    fi
    sleep 1
done
[ "$healthy" = 1 ] || fail "collector healthcheck never passed"
echo "ok: collector healthcheck passes"

# The database is in the volume, so the collector could write it.
docker exec "$name" /usr/local/bin/hennery admin hosts >/dev/null ||
    fail "the admin socket in the data directory does not answer"
volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/hennery"}}{{.Name}}{{end}}{{end}}' "$name")
[ -n "$volume" ] || fail "no volume at /var/lib/hennery"
mode=$(docker run --rm --user 65532:65532 -v "$volume:/data:ro" \
    --entrypoint /busybox/stat \
    gcr.io/distroless/static-debian13:debug@sha256:07148a6899406df51906b183f581cf66e5b05fd51aca438bdf1d3998df566961 \
    -c '%u:%g %a' /data)
[ "$mode" = "65532:65532 700" ] || fail "the data directory is $mode, not 65532:65532 700"
# The collector warns when it finds its data directory open to others.
if docker logs "$name" 2>&1 | grep -q "other users"; then
    fail "the collector warned about its data directory's permissions"
fi
echo "ok: the data directory is the collector's (65532:65532 700)"

status=
for _ in $(seq 1 30); do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$name")
    [ "$status" = healthy ] && break
    sleep 1
done
[ "$status" = healthy ] || fail "Docker reports the container $status"
echo "ok: Docker reports the container healthy"

# In the image itself: the directory is 65532's and 0700, and its parent is
# still root's (`COPY --from=data … /var/lib/` merges into the existing one).
listing=$(docker export "$name" | tar -tvf - | grep -E ' var/lib/(hennery/)?$' || true)
printf '%s\n' "$listing" | grep -Eq '^drwx------ +65532/65532 .* var/lib/hennery/$' ||
    fail "the image's /var/lib/hennery is not 65532's and 0700: $listing"
printf '%s\n' "$listing" | grep -Eq '^drwxr-xr-x +0/0 .* var/lib/$' ||
    fail "the image's /var/lib is not root's and 0755: $listing"
echo "ok: the image's /var/lib/hennery is 65532's and 0700, /var/lib root's"

user=$(docker inspect --format '{{.Config.User}}' "$image")
[ "$user" = 65532:65532 ] || fail "the image runs as $user"
echo "ok: the image runs as 65532:65532"

# Docker's daemon requires a PID column in ps output. Keep its failure status
# separate from parsing so a transport/daemon error cannot pass via a pipeline.
processes=$(docker top "$name" -eo pid,uid,user) || fail "cannot inspect running processes"
printf '%s\n' "$processes" | awk -f "$(dirname "$0")/image-processes.awk" >/dev/null ||
    fail "running process UID listing is invalid: $processes"
echo "ok: the running collector is non-root (UID 65532)"

# Check what the running collector actually serves, including a real JS chunk.
port=$(docker port "$name" 8080/tcp)
case "$port" in 127.0.0.1:*) ;; *) fail "port is not loopback: $port" ;; esac
curl --fail --silent --show-error "http://$port/" > "$scratch/index.html"
grep -q 'id="root"' "$scratch/index.html" || fail "UI root missing"
if grep -q hennery-web-ui-not-embedded "$scratch/index.html"; then
    fail "placeholder UI is embedded"
fi
asset=$(sed -n 's/.*src="\(\/assets\/[^" ]*\.js\)".*/\1/p' "$scratch/index.html" | head -n 1)
[ -n "$asset" ] || fail "no embedded module asset"
curl --fail --silent --show-error "http://$port$asset" > "$scratch/asset.js"
[ -s "$scratch/asset.js" ] || fail "empty UI module"
echo "ok: embedded UI and module asset served"
~~~~

### File: `packaging/image-processes.awk`

~~~~awk
# Parse `docker top <container> -eo pid,uid,user` on the Linux runner.
# USER may be a name or a number; only the numeric UID proves the identity.
NR == 1 {
    if (NF != 3 || $1 != "PID" || $2 != "UID" || $3 != "USER") bad = 1
    next
}
{
    if (NF != 3 || $1 !~ /^[0-9]+$/ || $1 + 0 <= 0 || $2 != "65532") bad = 1
}
END {
    if (NR < 2 || bad) exit 1
    print "65532"
}
~~~~

## Task 2: Native candidate/index builds and loopback CI

- [x] Tests observed RED, implementation and COPY probes.
- [x] Exact final source below; fresh replay recorded.
- [ ] Parent scoped review and native Docker acceptance.

Run command-boundary tests and `test_ghcr_candidate.Candidate` with `PYTHONPATH=packaging/tests`, plus actionlint on build/release-candidate and shellcheck on image scripts. The common consumer/workflow tests are completed in Task 3.

### File: `packaging/tests/test_image_commands.py`

~~~~python
"""Build and loopback boundaries with fake tools; no daemon or network."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

PACKAGING = Path(__file__).parents[1]


class Commands(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'bin').mkdir()
        (self.root / 'packaging').mkdir()
        for name in ['image-build.sh', 'image-ci.sh', 'test-image-registry.sh']:
            shutil.copyfile(PACKAGING / name, self.root / 'packaging' / name)
        self.env = dict(os.environ, PATH=str(self.root / 'bin') + os.pathsep + os.environ['PATH'],
                        LOG=str(self.root / 'calls'), TEST_OS='Linux', TEST_ARCH='x86_64',
                        ENDPOINT='127.0.0.1:12345')
        self.tool('uname', '#!/bin/sh\nif [ "$1" = -s ]; then echo "$TEST_OS"; else echo "$TEST_ARCH"; fi\n')
        self.tool('docker', '''#!/bin/sh
echo "docker $*" >> "$LOG"
case "$1" in
 buildx) exit 73;;
 port) echo "$ENDPOINT";;
 run) echo temporary-registry;;
 rm) exit 0;;
 *) exit 90;;
esac
''')
        self.tool('skopeo', '#!/bin/sh\necho "skopeo $*" >> "$LOG"\nexit 74\n')
        (self.root / 'bin/python3').symlink_to(sys.executable)
        staged = self.root / 'dist/linux-amd64'
        staged.mkdir(parents=True)
        for name in ['hennery', 'THIRD-PARTY-NOTICES', 'binary.spdx.json']:
            (staged / name).write_text('staged input')

    def tool(self, name, body):
        path = self.root / 'bin' / name
        path.write_text(body)
        path.chmod(0o755)

    def run_script(self, name='image-build.sh', *args):
        if not args:
            args = ('amd64', 'output', '0.1.0-alpha.1', 'a' * 40, '1')
        return subprocess.run(['sh', 'packaging/' + name, *args], cwd=self.root,
                               env=self.env, capture_output=True, text=True)

    def calls(self):
        path = self.root / 'calls'
        return path.read_text() if path.exists() else ''

    def test_native_build_pins_scanner_and_exports_attestations_without_cache(self):
        self.assertEqual(self.run_script().returncode, 73)
        calls = self.calls()
        for arg in ['--no-cache', '--target release', '--provenance=mode=max',
                    '--attest type=sbom,generator=', '@sha256:', '--output type=oci,',
                    '--tag localhost/hennery-collector:' + 'a' * 40 + '-amd64']:
            self.assertIn(arg, calls)
        self.assertNotIn('--push', calls)

    def test_each_missing_legal_or_binary_input_refuses_before_docker(self):
        for name in ['hennery', 'THIRD-PARTY-NOTICES', 'binary.spdx.json']:
            with self.subTest(name=name):
                path = self.root / 'dist/linux-amd64' / name
                path.unlink()
                self.assertIn('missing R1 input', self.run_script().stderr)
                path.write_text('restored')
        self.assertEqual(self.calls(), '')

    def test_non_linux_build_is_refused(self):
        self.env['TEST_OS'] = 'Darwin'
        self.assertIn('native Linux runner required', self.run_script().stderr)
        self.assertEqual(self.calls(), '')

    def test_wrong_native_architecture_is_refused(self):
        self.env['TEST_ARCH'] = 'aarch64'
        self.assertIn('native Linux runner required', self.run_script().stderr)
        self.assertEqual(self.calls(), '')

    def test_unsupported_build_architecture_is_refused(self):
        result = self.run_script('image-build.sh', 'ppc64', 'output', '0.1.0', 'a' * 40, '1')
        self.assertIn('unsupported image architecture', result.stderr)
        self.assertEqual(self.calls(), '')

    def test_existing_build_output_is_refused(self):
        (self.root / 'output').mkdir()
        self.assertIn('output already exists', self.run_script().stderr)
        (self.root / 'dist/image-amd64').mkdir()
        self.assertIn('CI output already exists', self.run_script('image-ci.sh', 'amd64', 'a' * 40).stderr)
        self.assertEqual(self.calls(), '')

    def test_external_registry_endpoint_is_refused_before_push(self):
        self.tool('curl', '#!/bin/sh\nexit 0\n')
        self.env['ENDPOINT'] = '0.0.0.0:12345'
        result = self.run_script('test-image-registry.sh', 'layout')
        self.assertIn('refusing non-loopback registry', result.stderr)
        self.assertNotIn('skopeo', self.calls())
        self.assertIn('-p 127.0.0.1::5000', self.calls())

    def test_registry_transport_can_only_target_allocated_loopback(self):
        self.tool('curl', '#!/bin/sh\nexit 0\n')
        result = self.run_script('test-image-registry.sh', 'layout')
        self.assertEqual(result.returncode, 74)
        self.assertIn('skopeo copy --all --preserve-digests --dest-tls-verify=false oci:layout docker://127.0.0.1:12345/hennery:test', self.calls())

    def ci_fixture(self):
        # BuildKit alone is stubbed; verifier and signing extraction run on
        # actual OCI fixtures, so omitting either call is observable.
        import json
        from test_image import CandidateFixtures, image
        fixture = CandidateFixtures()
        fixture.addCleanup = self.addCleanup
        fixture.setUp()
        fixture.fixture(labels={'org.opencontainers.image.version': '0.0.0'},
                        buildkit_name='localhost/hennery-collector')
        expected = image.verify(fixture.root, {'amd64': fixture.expected}, fixture.revision, '0.0.0')
        for name in ['image.py', 'image-signing-inputs.py']:
            shutil.copyfile(PACKAGING / name, self.root / 'packaging' / name)
        import tarfile
        with tarfile.open(self.root / 'fixture.tar', 'w') as archive:
            for path in fixture.root.iterdir():
                archive.add(path, arcname=path.name)
        fixture.replace_subjects([])
        with tarfile.open(self.root / 'fixture-unnamed.tar', 'w') as archive:
            for path in fixture.root.iterdir():
                archive.add(path, arcname=path.name)
        (self.root / 'dist/linux-amd64/hennery').write_bytes(fixture.binary)
        self.tool('docker', '''#!/bin/sh
echo "docker $*" >> "$LOG"
case "$2" in
 create) exit 0;;
 build) case " $* " in
    *" --tag "*) cp fixture.tar dist/image-amd64/image.tar;;
    *) cp fixture-unnamed.tar dist/image-amd64/image.tar;;
    esac;;
 *) exit 90;;
esac
''')
        return fixture, expected

    def test_ci_qualifies_release_oci_and_extracts_real_signing_inputs(self):
        fixture, expected = self.ci_fixture()
        import json
        result = self.run_script('image-ci.sh', 'amd64', fixture.revision)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertIn('--target release', calls)
        self.assertIn('--tag localhost/hennery-collector:' + fixture.revision + '-amd64', calls)
        self.assertNotIn('--target collector', calls)
        self.assertNotIn('--load', calls)
        report = json.loads((self.root / 'dist/image-amd64/verified.json').read_text())
        self.assertEqual(report, expected)
        signed = self.root / 'dist/image-amd64/signing-inputs'
        self.assertTrue((signed / 'image.spdx.json').is_file())
        self.assertTrue((signed / 'binary.spdx.json').is_file())
        for name in ['THIRD-PARTY-NOTICES', 'binary.spdx.json']:
            self.assertIn('CI FIXTURE', (self.root / 'dist/linux-amd64' / name).read_text())

    def test_ci_verifier_refuses_unapproved_binary_before_signing(self):
        self.ci_fixture()
        (self.root / 'dist/linux-amd64/hennery').write_bytes(b'wrong binary')
        result = self.run_script('image-ci.sh', 'amd64', 'a' * 40)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('binary digest mismatch', result.stderr)
        self.assertFalse((self.root / 'dist/image-amd64/signing-inputs').exists())


if __name__ == '__main__':
    unittest.main()
~~~~

### File: `packaging/tests/test_ghcr_candidate.py`

~~~~python
"""R1/R4 integration; public-key and platform transports are doubled offline."""
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import unittest
from unittest.mock import patch

import yaml
from test_image import CandidateFixtures, image

PACKAGING = Path(__file__).parents[1]
sys.path.insert(0, str(PACKAGING / 'release'))
import approval
import gate
import supply
import verify as release_verify

TARGETS = {'amd64': 'x86_64-unknown-linux-musl', 'arm64': 'aarch64-unknown-linux-musl'}


def load_helper(test):
    path = PACKAGING / 'ghcr-candidate.py'
    test.assertTrue(path.is_file(), 'R4 must materialize the complete signed R1 candidate')
    spec = importlib.util.spec_from_file_location('ghcr_candidate', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ReleaseFixture(CandidateFixtures):
    def setUp(self):
        super().setUp()
        self.version = '0.1.0'
        self.candidate = self.root / 'candidate'
        self.candidate.mkdir()
        self.work = self.root / 'image-candidate'
        self.natives = []
        base = self.root
        for arch, target in TARGETS.items():
            self.root = base / arch
            (self.root / 'blobs/sha256').mkdir(parents=True)
            self.fixture(arch=arch, labels={'org.opencontainers.image.version': self.version})
            self.natives.append(self.root)
            archive = self.candidate / ('hennery-' + target + '.tar.xz')
            prefix = 'hennery-' + target
            with tarfile.open(archive, 'w:xz') as output:
                directory = tarfile.TarInfo(prefix); directory.type = tarfile.DIRTYPE
                output.addfile(directory)
                for name, data in [('hennery', self.binary), ('LICENSE', b'licence'),
                                   ('README.md', b'readme'), ('THIRD-PARTY-NOTICES.txt', b'notices')]:
                    member = tarfile.TarInfo(prefix + '/' + name); member.size = len(data)
                    output.addfile(member, io.BytesIO(data))
            archive.with_suffix(archive.suffix + '.sha256').write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
        self.root = base

    def freeze(self):
        self.inventory = {
            'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': self.revision,
            'tag': 'v' + self.version, 'channels': ['ghcr', 'github'],
            'targets': sorted(TARGETS.values()), 'candidate': {'run_id': 10, 'run_attempt': 1},
            'binaries': supply.binary_inventory(self.candidate, sorted(TARGETS.values())),
            'artifacts': [{'name': p.name, 'size': p.stat().st_size, 'sha256': gate.digest(p.read_bytes())}
                          for p in sorted(self.candidate.iterdir()) if p.name != 'release-inventory.json'],
        }
        self.raw = gate.canonical(self.inventory)
        (self.candidate / 'release-inventory.json').write_bytes(self.raw)
        self.inventory_digest = gate.digest(self.raw)
        self.signature = '-----BEGIN PGP SIGNATURE-----\n' + self.inventory_digest + '\n-----END PGP SIGNATURE-----\n'
        self.inputs = {'maintainer_signature': self.signature}

    def crypto(self, command, **kwargs):
        if '--verify' in command:
            raw, signature = Path(command[-1]).read_bytes(), Path(command[-2]).read_text()
            valid = gate.digest(raw) in signature
            return subprocess.CompletedProcess(command, 0 if valid else 1,
                '[GNUPG:] VALIDSIG ' + approval.FINGERPRINT + ' 0\n' if valid else '[GNUPG:] BADSIG\n', '')
        return subprocess.CompletedProcess(command, 0, '', '')

    def assembled(self):
        helper = load_helper(self)
        helper.assemble(self.candidate, self.root / 'assembled', self.natives, self.revision, self.version)
        self.freeze()
        return helper


class Candidate(ReleaseFixture, unittest.TestCase):
    def test_native_output_freezes_index_platforms_and_binary_identity(self):
        helper = self.assembled()
        descriptor = json.loads((self.candidate / 'ghcr-index.json').read_bytes())
        self.assertEqual(set(descriptor['platforms']), {'amd64', 'arm64'})
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            verified = helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
        self.assertEqual(verified['digest'], descriptor['digest'])
        self.assertEqual(verified['source_sha'], self.revision)
        self.assertEqual(verified['version'], self.version)
        self.assertEqual((self.work / 'release-inventory.json.asc').read_text(), self.signature)
        for arch, target in TARGETS.items():
            self.assertEqual(verified['platforms'][arch], image.verify(self.work / 'layout',
                {a: self.inventory['binaries'][t]['sha256'] for a, t in TARGETS.items()},
                self.revision, self.version)['platforms'][arch]['digest'])

    def test_missing_or_wrong_inventory_signature_refuses(self):
        helper = self.assembled()
        for inputs in [{}, {'maintainer_signature': 'malformed'},
                       {'maintainer_signature': self.signature.replace(self.inventory_digest, 'b' * 64)}]:
            with self.subTest(inputs=inputs), patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaises(gate.Refused):
                helper.qualify(self.candidate, self.inventory_digest, self.work, inputs)
        self.assertFalse(self.work.exists())

    def test_wrong_global_inventory_digest_refuses(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'inventory digest'):
            helper.qualify(self.candidate, 'f' * 64, self.work, self.inputs)

    def test_invalid_nonempty_inventory_signature_refuses(self):
        helper = self.assembled()
        inputs = {'maintainer_signature': self.signature.replace(self.inventory_digest, 'f' * 64)}
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaises(gate.Refused):
            helper.qualify(self.candidate, self.inventory_digest, self.work, inputs)
        self.assertFalse(self.work.exists())

    def test_modified_hashed_channel_payload_refuses(self):
        helper = self.assembled()
        path = self.candidate / 'ghcr-index.json'
        path.write_bytes(path.read_bytes().replace(b'0.1.0', b'0.2.0'))
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'candidate digest'):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_mutated_working_layout_is_not_replaced_or_published(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            path = self.work / 'layout/oci-layout'; path.write_text('{}')
            with self.assertRaisesRegex(gate.Refused, 'working OCI'):
                helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            self.assertEqual(path.read_text(), '{}')

    def test_working_directory_must_be_outside_immutable_candidate(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'outside'):
            helper.qualify(self.candidate, self.inventory_digest, self.candidate / 'work', self.inputs)

    def test_signed_descriptor_must_match_actual_oci_digests(self):
        helper = self.assembled()
        path = self.candidate / 'ghcr-index.json'
        descriptor = json.loads(path.read_bytes()); descriptor['platforms']['amd64'] = 'sha256:' + 'f' * 64
        path.write_bytes(gate.canonical(descriptor))
        (self.candidate / 'release-inventory.json').unlink(); self.freeze()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'descriptor'):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_existing_assembly_output_refuses_without_overwriting(self):
        helper = load_helper(self); work = self.root / 'existing'; work.mkdir()
        with self.assertRaisesRegex(gate.Refused, 'already exists'):
            helper.assemble(self.candidate, work, self.natives, self.revision, self.version)
        self.assertFalse((self.candidate / 'ghcr-index.json').exists())

    def test_descriptor_needs_one_retained_root_index(self):
        helper = load_helper(self); layout = self.root / 'flat'
        digest = image.merge(layout, self.natives)
        joined = json.loads((layout / 'blobs/sha256' / digest[7:]).read_bytes())
        (layout / 'index.json').write_text(json.dumps({'schemaVersion': 2, 'manifests': joined['manifests']}))
        with self.assertRaisesRegex(gate.Refused, 'one OCI index'):
            helper.descriptor(layout, dict.fromkeys(TARGETS, self.expected), self.revision, self.version)

    def archive(self, entries):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode='w') as archive:
            for name, kind, data in entries:
                member = tarfile.TarInfo(name); member.type = kind
                if kind == tarfile.REGTYPE:
                    member.size = len(data); archive.addfile(member, io.BytesIO(data))
                else:
                    member.linkname = data; archive.addfile(member)
        return output.getvalue()

    def test_ambiguous_oci_archive_paths_refuse(self):
        helper = load_helper(self)
        for name in ['../escape', './index.json', '/index.json', 'blobs//sha256/' + 'a' * 64, 'blobs/sha256/../escape']:
            with self.subTest(name=name), self.assertRaisesRegex(gate.Refused, 'archive path'):
                helper.tar_files(self.archive([(name, tarfile.REGTYPE, b'{}')]))

    def test_oci_archive_links_refuse_before_extraction(self):
        helper = load_helper(self)
        for kind in [tarfile.LNKTYPE, tarfile.SYMTYPE]:
            raw = self.archive([('index.json', tarfile.REGTYPE, b'{}'),
                ('blobs/sha256/' + 'a' * 64, kind, 'index.json')])
            with self.subTest(kind=kind), self.assertRaisesRegex(gate.Refused, 'nonregular'):
                helper.tar_files(raw)

    def test_duplicate_oci_archive_members_refuse(self):
        helper = load_helper(self)
        raw = self.archive([('index.json', tarfile.REGTYPE, b'{}'), ('index.json', tarfile.REGTYPE, b'{}')])
        with self.assertRaisesRegex(gate.Refused, 'duplicate'):
            helper.tar_files(raw)

    def test_retained_payload_changed_after_file_verification_refuses(self):
        helper = self.assembled(); original = gate.verify_files
        def race(inventory, root):
            original(inventory, root)
            path = self.candidate / 'ghcr-index.json'; path.write_bytes(path.read_bytes() + b' ')
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), patch.object(gate, 'verify_files', side_effect=race), self.assertRaisesRegex(gate.Refused, 'during verification'):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_missing_ghcr_channel_in_signed_inventory_refuses(self):
        helper = self.assembled(); self.inventory['channels'] = ['github']
        raw = gate.canonical(self.inventory); (self.candidate / 'release-inventory.json').write_bytes(raw)
        inputs = {'maintainer_signature': self.signature.replace(self.inventory_digest, gate.digest(raw))}
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'GHCR and both Linux'):
            helper.qualify(self.candidate, gate.digest(raw), self.work, inputs)

    def test_working_layout_symlinks_refuse_even_when_bytes_match(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            path = self.work / 'layout/oci-layout'; path.unlink(); path.symlink_to(self.natives[0] / 'oci-layout')
            with self.assertRaisesRegex(gate.Refused, 'nonregular working OCI'):
                helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)

    def test_working_directory_symlink_refuses_even_when_bytes_match(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            alias = self.root / 'alias'; alias.symlink_to(self.work, target_is_directory=True)
            with self.assertRaisesRegex(gate.Refused, 'nonregular image working directory'):
                helper.qualify(self.candidate, self.inventory_digest, alias, self.inputs)

    def test_working_metadata_tampering_refuses(self):
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
            (self.work / 'index-digest.txt').write_text('sha256:' + 'f' * 64)
            with self.assertRaisesRegex(gate.Refused, 'metadata changed'):
                helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)


class Consumer(ReleaseFixture, unittest.TestCase):
    def signed_index(self):
        self.assembled()
        signature = self.root / 'approval.asc'; signature.write_text(self.signature)
        return json.loads((self.candidate / 'ghcr-index.json').read_bytes()), signature

    def test_platform_verification_requires_signature_before_sigstore(self):
        index, _ = self.signed_index()
        with patch.object(approval.subprocess, 'run') as external:
            with self.assertRaisesRegex(gate.Refused, 'signature missing'):
                release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + index['platforms']['amd64'],
                    'v0.1.0', candidate=self.candidate, approval_signature=self.root / 'missing.asc')
        external.assert_not_called()

    def test_unlisted_image_refuses_before_sigstore(self):
        _, signature = self.signed_index(); calls = []
        def crypto(command, **kwargs):
            if command[0] == 'gh': calls.append(command); return subprocess.CompletedProcess(command, 0)
            return self.crypto(command, **kwargs)
        with patch.object(approval.subprocess, 'run', side_effect=crypto), self.assertRaisesRegex(gate.Refused, 'image digest'):
            release_verify.verify_image('ghcr.io/marcinwadon/hennery@sha256:' + 'f' * 64,
                'v0.1.0', candidate=self.candidate, approval_signature=signature)
        self.assertEqual(calls, [])

    def test_signed_descriptor_identity_and_platform_set_are_required(self):
        index, signature = self.signed_index()
        for field, value in [('schema', 2), ('source_sha', 'b' * 40), ('version', '0.2.0'),
                             ('platforms', ['amd64', 'arm64']), ('platforms', {'amd64': index['platforms']['amd64']})]:
            with self.subTest(field=field, value=value):
                changed = copy.deepcopy(index); changed[field] = value
                (self.candidate / 'ghcr-index.json').write_bytes(gate.canonical(changed)); self.freeze()
                signature.write_text(self.signature)
                with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'signed image descriptor'):
                    release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + index['digest'],
                        'v0.1.0', candidate=self.candidate, approval_signature=signature)

    def test_signed_digest_set_is_distinct_and_sha256_only(self):
        index, signature = self.signed_index()
        for value in [index['digest'], 'sha256:sha256:' + 'a' * 64, [], None]:
            with self.subTest(value=value):
                changed = copy.deepcopy(index); changed['platforms']['amd64'] = value
                (self.candidate / 'ghcr-index.json').write_bytes(gate.canonical(changed)); self.freeze()
                signature.write_text(self.signature)
                with patch.object(approval.subprocess, 'run', side_effect=self.crypto), self.assertRaisesRegex(gate.Refused, 'signed image digest set'):
                    release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + index['digest'],
                        'v0.1.0', candidate=self.candidate, approval_signature=signature)

    def test_shared_verifier_accepts_each_explicitly_signed_platform_and_index(self):
        layout = self.root / 'joined'; digest = image.merge(layout, self.natives)
        report = image.verify(layout, dict.fromkeys(TARGETS, self.expected), self.revision, self.version)
        descriptor = {'schema': 1, 'digest': digest, 'source_sha': self.revision, 'version': self.version,
                      'platforms': {a: p['digest'] for a, p in report['platforms'].items()}}
        (self.candidate / 'ghcr-index.json').write_bytes(gate.canonical(descriptor)); self.freeze()
        signature = self.root / 'approval.asc'; signature.write_text(self.signature)
        for subject in [digest, *descriptor['platforms'].values()]:
            def crypto(command, **kwargs):
                if command[0] == 'gh':
                    self.assertEqual(command[command.index('--cert-identity') + 1],
                        'https://github.com/' + gate.REPOSITORY + '/.github/workflows/release-publish.yml@refs/tags/v0.1.0')
                    return subprocess.CompletedProcess(command, 0)
                return self.crypto(command, **kwargs)
            with self.subTest(subject=subject), patch.object(approval.subprocess, 'run', side_effect=crypto):
                try:
                    release_verify.verify_image('ghcr.io/marcinwadon/hennery@' + subject,
                        'v0.1.0', candidate=self.candidate, approval_signature=signature)
                except gate.Refused as error:
                    self.fail('maintainer-approved platform/index must verify: ' + str(error))


class Orchestrator(unittest.TestCase):
    def test_channel_jobs_use_real_orchestrator_and_environment_credential(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-publish.yml').read_text())
        for name in ['ghcr', 'ghcr-attest']:
            self.assertIn(name, workflow['jobs'], 'R4 must integrate inside the real tagged R1 orchestrator')
            job = workflow['jobs'][name]
            self.assertEqual(job['environment'], 'release')
            self.assertEqual(job['permissions'].get('packages'), 'read')
            login = next(s for s in job['steps'] if 'docker login' in s.get('run', ''))
            self.assertEqual(login['env']['GHCR_TOKEN'], '${{ secrets.GHCR_PUBLISH_TOKEN }}')

    def test_github_only_candidates_have_no_skipped_optional_channel_job(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-candidate.yml').read_text())
        self.assertEqual(set(workflow['jobs']), {'tag-signature', 'web-ui', 'archive', 'assemble', 'installer', 'retain'})
        for name, job in workflow['jobs'].items():
            if name != 'retain':
                self.assertNotIn('if', job, name + ' must qualify GitHub-only candidates too')
        # Channel selection belongs to steps; no candidate-level skipped GHCR job
        # is introduced for R1's generic selected-channel job policy to classify.
        assemble = workflow['jobs']['assemble']
        self.assertTrue(any('ghcr' in str(step.get('if', '')) for step in assemble['steps']))

    def test_real_candidate_freezes_oci_payloads_before_global_inventory(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-candidate.yml').read_text())
        archive = '\n'.join(s.get('run', '') for s in workflow['jobs']['archive']['steps'])
        self.assertIn('packaging/image-build.sh', archive)
        assemble = '\n'.join(s.get('run', '') for s in workflow['jobs']['assemble']['steps'])
        self.assertIn('ghcr-candidate.py assemble', assemble)
        self.assertLess(assemble.index('ghcr-candidate.py assemble'), assemble.index('supply.py freeze'))


if __name__ == '__main__':
    unittest.main()
~~~~

### File: `packaging/image-signing-inputs.py`

~~~~python
#!/usr/bin/env python3
"""Extract subjects/SBOM predicates from already verified retained OCI bytes."""
import json
from pathlib import Path
import sys
import tarfile
import io
from image import blob, manifests, require

root, subject, output = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
index = json.loads((root / 'index.json').read_bytes())
output.mkdir(parents=True, exist_ok=False)
if subject == 'index':
    require(len(index['manifests']) == 1, 'missing retained index descriptor')
    print('digest=' + index['manifests'][0]['digest'])
else:
    entries = list(manifests(root, index))
    runtime = [(d, m) for d, m in entries if d.get('platform', {}).get('architecture') == subject
               and d.get('platform', {}).get('os') == 'linux']
    require(len(runtime) == 1, 'missing signing platform')
    desc, manifest = runtime[0]
    print('digest=' + desc['digest'])
    count = 0
    for att, body in entries:
        if att.get('annotations', {}).get('vnd.docker.reference.digest') != desc['digest']:
            continue
        for layer in body['layers']:
            statement = json.loads(blob(root, layer))
            if statement.get('predicateType') == 'https://spdx.dev/Document':
                (output / 'image.spdx.json').write_text(json.dumps(statement['predicate']))
                count += 1
    require(count == 1, 'expected one image SBOM')
    binary_bom = None
    for layer in manifest['layers']:
        with tarfile.open(fileobj=io.BytesIO(blob(root, layer)), mode='r:*') as archive:
            for member in archive:
                if member.name.removeprefix('./').lstrip('/') == 'usr/share/doc/hennery/binary.spdx.json':
                    require(member.isfile(), 'non-regular binary SBOM')
                    binary_bom = archive.extractfile(member).read()
    require(binary_bom, 'missing binary SBOM')
    (output / 'binary.spdx.json').write_bytes(binary_bom)
~~~~

### File: `packaging/image-build.sh`

~~~~sh
#!/bin/sh
# Native runner only. R1 stages approved bytes and includes this OCI output in
# its candidate inventory BEFORE approval. No registry credential or push.
# Usage: image-build.sh amd64|arm64 output-directory version revision epoch
set -eu
arch=$1
output=$2
version=$3
revision=$4
epoch=$5
case "$arch" in amd64|arm64) ;; *) echo 'unsupported image architecture' >&2; exit 1 ;; esac
case "$(uname -m):$arch" in x86_64:amd64|aarch64:arm64|arm64:arm64) ;; *) echo 'native Linux runner required' >&2; exit 1 ;; esac
[ "$(uname -s)" = Linux ] || { echo 'native Linux runner required' >&2; exit 1; }
[ ! -e "$output" ] || { echo 'output already exists' >&2; exit 1; }
for file in hennery THIRD-PARTY-NOTICES binary.spdx.json; do
    [ -s "dist/linux-$arch/$file" ] || { echo "missing R1 input: $file" >&2; exit 1; }
done
mkdir -p "$output"
# Pinned scanner/base and no restored build cache. OCI export preserves
# BuildKit's SBOM/provenance descriptors, unlike a classic docker save.
# The local export name supplies BuildKit's per-platform self subjects.
docker buildx build --no-cache --platform "linux/$arch" --target release \
    --tag "localhost/hennery-collector:$revision-$arch" \
    --build-arg "VERSION=$version" --build-arg "REVISION=$revision" \
    --build-arg "SOURCE_DATE_EPOCH=$epoch" \
    --provenance=mode=max \
    --attest type=sbom,generator=docker.io/docker/buildkit-syft-scanner:stable-1@sha256:ae4f3b554449e7e25548e7d8ccc029d17357348e30c6e3df01b92bc93654d6a9 \
    --output "type=oci,dest=$output/image.tar,compression=gzip,force-compression=true" .
mkdir "$output/layout"
tar -xf "$output/image.tar" -C "$output/layout"
rm "$output/image.tar"
~~~~

### File: `packaging/image-ci.sh`

~~~~sh
#!/bin/sh
# PR/main qualification of the RELEASE target with explicit CI fixture legal
# inputs. These are not reviewed notices/SBOMs and MUST NEVER be promoted.
set -eu
arch=$1
revision=$2
case "$arch" in amd64|arm64) ;; *) exit 1 ;; esac
output="dist/image-$arch"
version=0.0.0
[ ! -e "$output" ] || { echo 'CI output already exists' >&2; exit 1; }
mkdir -p "$output/layout"
python3 - "$arch" "$output" <<'PY'
import hashlib
import json
from pathlib import Path
import sys
arch, output = sys.argv[1:]
staged = Path('dist') / ('linux-' + arch)
digest = hashlib.sha256((staged / 'hennery').read_bytes()).hexdigest()
(staged / 'THIRD-PARTY-NOTICES').write_text('CI FIXTURE ONLY: not reviewed release notices.\n')
(staged / 'binary.spdx.json').write_text(json.dumps({
    'spdxVersion': 'SPDX-2.3', 'SPDXID': 'SPDXRef-DOCUMENT',
    'name': 'CI FIXTURE ONLY - not a release SBOM',
    'dataLicense': 'CC0-1.0',
    'documentNamespace': 'https://hennery.dev/ci-fixture/' + digest,
    'creationInfo': {'creators': ['Tool: hennery-ci-fixture'], 'created': '1970-01-01T00:00:00Z'},
    'packages': [{'name': 'CI FIXTURE ONLY', 'SPDXID': 'SPDXRef-CIFixture',
                  'downloadLocation': 'NOASSERTION', 'filesAnalyzed': False}]}))
(Path(output) / 'binary-sha256.json').write_text(json.dumps({arch: digest}))
PY
docker buildx create --use --name hennery-ci --driver docker-container \
    --driver-opt image=moby/buildkit:buildx-stable-1@sha256:cec9f139f45e93c5c69c60f8b07cfad9f43f4ef6b6a6cd917527fea5ff2e3dea
# The local export name supplies BuildKit's per-platform self subjects.
docker buildx build --target release --platform "linux/$arch" \
    --tag "localhost/hennery-collector:$revision-$arch" \
    --build-arg "REVISION=$revision" --build-arg "VERSION=$version" --provenance=mode=max \
    --attest type=sbom,generator=docker.io/docker/buildkit-syft-scanner:stable-1@sha256:ae4f3b554449e7e25548e7d8ccc029d17357348e30c6e3df01b92bc93654d6a9 \
    --output "type=oci,dest=$output/image.tar,compression=gzip,force-compression=true" .
tar -xf "$output/image.tar" -C "$output/layout"
rm "$output/image.tar"
# Qualify the real OCI output before any loopback acceptance. The subsequent
# registry test pulls this exact digest and runs its embedded UI/non-root smoke.
python3 packaging/image.py verify "$output/layout" "$output/binary-sha256.json" \
    "$revision" "$version" > "$output/verified.json"
python3 packaging/image-signing-inputs.py "$output/layout" "$arch" "$output/signing-inputs" \
    > "$output/signing-digest.txt"
~~~~

### File: `packaging/test-image-registry.sh`

~~~~sh
#!/bin/sh
# Only a loopback registry is allowed here. No credentials; no real push.
# Usage: test-image-registry.sh OCI-layout [amd64|arm64]
set -eu
layout=$1
arch=${2:-}
case "$arch" in ''|amd64|arm64) ;; *) echo 'unsupported architecture' >&2; exit 1 ;; esac
name="hennery-registry-$$"
registry_image=docker.io/library/registry:3@sha256:ddf754342cfc8acc51a56d5d0ab6af06826461864460636d8bd5c546dab2a7b8
scratch=$(mktemp -d)
trap 'docker rm -fv "$name" >/dev/null 2>&1 || true; rm -f "$scratch/remote.json"; rmdir "$scratch"' EXIT
# The registry and all test volumes disappear, never any existing container.
docker run -d --name "$name" -p 127.0.0.1::5000 "$registry_image" >/dev/null
endpoint=$(docker port "$name" 5000/tcp)
case "$endpoint" in 127.0.0.1:*) ;; *) echo 'refusing non-loopback registry' >&2; exit 1 ;; esac
for attempt in $(seq 1 30); do
    if curl --fail --silent "http://$endpoint/v2/" >/dev/null; then break; fi
    [ "$attempt" != 30 ] || { echo 'registry did not start' >&2; exit 1; }
    sleep 1
done
reference="$endpoint/hennery:test"
# preserve-digests refuses a registry that rewrites approved OCI bytes.
skopeo copy --all --preserve-digests --dest-tls-verify=false \
    "oci:$layout" "docker://$reference"
skopeo inspect --raw --tls-verify=false "docker://$reference" > "$scratch/remote.json"
expected=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["manifests"][0]["digest"])' "$layout/index.json")
actual="sha256:$(shasum -a 256 "$scratch/remote.json" | cut -d ' ' -f 1)"
[ "$actual" = "$expected" ] || { echo 'registry index digest mismatch' >&2; exit 1; }
echo "ok: loopback registry retained $actual"
# Pull by immutable digest, then smoke. The native matrix tests each platform;
# the assembled index job verifies both descriptors without emulation.
if [ -n "$arch" ]; then
    docker pull --platform "linux/$arch" "$endpoint/hennery@$actual"
    sh packaging/smoke-image.sh "$endpoint/hennery@$actual"
fi
~~~~

### File: `packaging/ghcr-candidate.py`

~~~~python
#!/usr/bin/env python3
"""Freeze and materialize OCI bytes through R1's signed global inventory."""
import argparse
import io
import json
import os
from pathlib import Path
import re
import sys
import tarfile

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / 'release'))
import approval
import gate
import supply
import image

TARGETS = {'amd64': 'x86_64-unknown-linux-musl', 'arm64': 'aarch64-unknown-linux-musl'}


def descriptor(layout, binaries, revision, version):
    verified = image.verify(layout, binaries, revision, version)
    index = gate.strict_json((layout / 'index.json').read_bytes())
    gate.require(len(index['manifests']) == 1, 'expected one OCI index')
    return {'schema': 1, 'digest': index['manifests'][0]['digest'], 'source_sha': revision,
            'version': version, 'platforms': {a: p['digest'] for a, p in verified['platforms'].items()}}


def assemble(candidate, work, natives, revision, version):
    candidate, work = Path(candidate), Path(work)
    gate.require(not work.exists(), 'image assembly output already exists')
    work.mkdir(parents=True, exist_ok=True)
    binaries = supply.binary_inventory(candidate, sorted(TARGETS.values()))
    image.merge(work / 'layout', [Path(p) for p in natives])
    index = descriptor(work / 'layout', {a: binaries[t]['sha256'] for a, t in TARGETS.items()}, revision, version)
    with (candidate / 'ghcr-oci-layout.tar').open('xb') as output, tarfile.open(fileobj=output, mode='w') as archive:
        for path in sorted((work / 'layout').rglob('*')):
            if path.is_file():
                data = path.read_bytes()
                member = tarfile.TarInfo(path.relative_to(work / 'layout').as_posix())
                member.size = len(data); member.mode = 0o644
                archive.addfile(member, io.BytesIO(data))
    with (candidate / 'ghcr-index.json').open('xb') as output:
        output.write(gate.canonical(index))
    return index


def tar_files(raw):
    files = {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as archive:
        for member in archive:
            name = member.name
            gate.require(re.fullmatch(r'oci-layout|index\.json|blobs/sha256/[0-9a-f]{64}', name), 'unsafe OCI archive path')
            gate.require(member.isfile(), 'nonregular OCI archive member')
            gate.require(name not in files, 'duplicate OCI archive member')
            files[name] = archive.extractfile(member).read()
    return files


def retained_file(candidate, inventory, name):
    entry = next(a for a in inventory['artifacts'] if a['name'] == name)
    raw = (candidate / name).read_bytes()
    gate.require(len(raw) == entry['size'] and gate.digest(raw) == entry['sha256'], 'retained OCI payload changed during verification')
    return raw


def materialize_layout(layout, files):
    if not layout.exists():
        layout.mkdir(parents=True)
        for name, raw in files.items():
            path = layout / name; path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('xb') as output:
                output.write(raw)
    paths = list(layout.rglob('*'))
    gate.require(not layout.is_symlink() and all(not p.is_symlink() and (p.is_file() or p.is_dir()) for p in paths), 'nonregular working OCI')
    actual = {p.relative_to(layout).as_posix(): p.read_bytes() for p in paths if p.is_file()}
    gate.require(actual == files, 'working OCI differs from signed layout')


def metadata(path, raw):
    if path.exists() or path.is_symlink():
        gate.require(path.is_file() and not path.is_symlink() and path.read_bytes() == raw, 'working image metadata changed')
    else:
        with path.open('xb') as output:
            output.write(raw)


def qualify(candidate, expected, work, inputs):
    candidate, work = Path(candidate), Path(work)
    gate.require(not work.resolve().is_relative_to(candidate.resolve()), 'OCI working directory must be outside immutable candidate')
    raw = (candidate / 'release-inventory.json').read_bytes()
    proof = approval.verify_dispatch(candidate, inputs)
    gate.require(proof['inventory_sha256'] == gate.digest(raw) == expected, 'signed inventory digest mismatch')
    inventory = gate.strict_json(raw)
    gate.verify_files(inventory, candidate)
    gate.require('ghcr' in inventory['channels'] and set(TARGETS.values()) <= set(inventory['targets']), 'signed inventory needs GHCR and both Linux targets')
    supply.verify_binary_inventory(inventory, candidate)
    files = tar_files(retained_file(candidate, inventory, 'ghcr-oci-layout.tar'))
    index = gate.strict_json(retained_file(candidate, inventory, 'ghcr-index.json'))
    if work.exists():
        gate.require(work.is_dir() and not work.is_symlink(), 'nonregular image working directory')
    else:
        work.mkdir(parents=True)
    materialize_layout(work / 'layout', files)
    binaries = {a: inventory['binaries'][t]['sha256'] for a, t in TARGETS.items()}
    actual = descriptor(work / 'layout', binaries, inventory['source_sha'], inventory['tag'].removeprefix('v'))
    gate.require(index == actual, 'signed image descriptor differs from actual OCI')
    metadata(work / 'verified.json', gate.canonical(actual))
    metadata(work / 'binary-sha256.json', gate.canonical(binaries))
    metadata(work / 'index-digest.txt', (actual['digest'] + '\n').encode())
    metadata(work / 'release-inventory.json.asc', inputs['maintainer_signature'].encode())
    return actual


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    build = sub.add_parser('assemble')
    build.add_argument('candidate', type=Path); build.add_argument('work', type=Path)
    build.add_argument('revision'); build.add_argument('version')
    build.add_argument('natives', type=Path, nargs=2)
    check = sub.add_parser('qualify')
    check.add_argument('candidate', type=Path); check.add_argument('inventory_sha256')
    check.add_argument('work', type=Path)
    args = parser.parse_args()
    if args.command == 'assemble':
        result = assemble(args.candidate, args.work, args.natives, args.revision, args.version)
    else:
        inputs = gate.strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())['inputs']
        result = qualify(args.candidate, args.inventory_sha256, args.work, inputs)
    print(gate.canonical(result).decode(), end='')


if __name__ == '__main__':
    main()
~~~~

### File: `.github/workflows/build.yml`

~~~~yaml
# Release artifacts, built the way a release builds them (distribution spec
# §2, plan 7a), and checked: Linux musl-static for both architectures and
# macOS arm64, the shell installer, the Homebrew formula and the collector
# image.
#
# This workflow publishes nothing. It has no tag trigger, no release, no
# external registry push, no signing, and only `contents: read`. OCI SBOM and
# unsigned build metadata are tested using a temporary loopback registry.
# What it builds
# stays a workflow artifact, kept for a week. Publishing is the operator's
# to switch on (packaging/README.md).
#
# The archives hold the `hennery` binary, its licence and its README, nothing
# else, which `check-archive.sh` asserts. No job here downloads, builds or
# uploads an adapter: the Claude CLI is never redistributed (distribution spec
# §3.3).
#
# Third-party actions are pinned by commit, images by digest, cargo-dist by
# SHA-256 (`install-dist.sh`); GitHub's own actions by commit too. Workflow
# artifacts are never promoted to a release (packaging/README.md).
name: build

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  # A pull request's superseded run is cancelled. Outside pull requests
  # (pushes to main, manual runs) every commit is a group of its own: a
  # shared group would let a newer pending run replace an older one even
  # without cancel-in-progress, so no run there is ever cancelled.
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.sha }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  image-contract:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
      - name: Image guards and workflow contracts (no credentials or external writes)
        run: |
          nix develop .#image -c python3 -m unittest discover -s packaging/tests -v
          nix develop .#image -c actionlint .github/workflows/*.yml
          nix develop .#image -c shellcheck packaging/image-build.sh packaging/image-ci.sh packaging/test-image-registry.sh packaging/ghcr-gate.sh packaging/ghcr-publish.sh packaging/smoke-image.sh packaging/release-gate

  # One archive per target, each on a native runner.
  archive:
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-unknown-linux-musl
            runner: ubuntu-24.04
            image: amd64
          - target: aarch64-unknown-linux-musl
            runner: ubuntu-24.04-arm
            image: arm64
          - target: aarch64-apple-darwin
            runner: macos-latest
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: stable
          targets: ${{ matrix.target }}
      - uses: Swatinem/rust-cache@6323deb102c322ba6fcbdcafc7e3dddab59af2b6 # v2.9.2
        with:
          key: ${{ matrix.target }}
      # `musl-gcc` builds the C parts (OpenSSL, SQLite, ring) for musl.
      - name: musl tools (Linux)
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y musl-tools
      - name: Install dist
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
      # The web UI (plan 4b), embedded in the binary: Node and pnpm from the
      # flake's `web` shell.
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Build the web UI
        run: nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
      - name: Build the archive
        env:
          # Without the web UI the build fails, rather than embed the
          # placeholder.
          HENNERY_WEB_REQUIRE: "1"
        run: |
          dist build --artifacts=local --target=${{ matrix.target }} --print=linkage --output-format=json > dist-manifest.json
          cp dist-manifest.json "target/distrib/${{ matrix.target }}-dist-manifest.json"
      - name: Unpack the binary
        run: |
          mkdir -p unpacked
          tar -xJf "target/distrib/hennery-${{ matrix.target }}.tar.xz" -C unpacked
          echo "BINARY=$PWD/unpacked/hennery-${{ matrix.target }}/hennery" >> "$GITHUB_ENV"
      - name: Holds the binary, its licence and README only
        run: sh packaging/check-archive.sh "target/distrib/hennery-${{ matrix.target }}.tar.xz" ${{ matrix.target }}
      - name: Links nothing outside the system
        run: sh packaging/check-linkage.sh "$BINARY"
      # The image reuses the musl binaries, so this covers it too.
      - name: Embeds the web UI, not the placeholder
        run: sh packaging/check-web-ui.sh "$BINARY"
      - name: Runs
        run: |
          "$BINARY" --version
          "$BINARY" collector --help > /dev/null
      - name: Runs on Alpine (musl)
        if: runner.os == 'Linux'
        run: docker run --rm -v "$BINARY:/hennery:ro" alpine:3@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 /hennery --version
      - name: Qualify the release OCI image with CI fixture legal inputs
        if: runner.os == 'Linux'
        run: |
          mkdir -p "dist/linux-${{ matrix.image }}"
          cp "$BINARY" "dist/linux-${{ matrix.image }}/hennery"
          sh packaging/image-ci.sh "${{ matrix.image }}" "$GITHUB_SHA"
      - name: Test a push to loopback, then smoke the retained digest
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y skopeo
          sh packaging/test-image-registry.sh "dist/image-${{ matrix.image }}/layout" "${{ matrix.image }}"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: runner.os == 'Linux'
        with:
          name: ci-image-${{ matrix.image }}
          path: dist/image-${{ matrix.image }}/
          retention-days: 7
          if-no-files-found: error
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: archive-${{ matrix.target }}
          retention-days: 7
          if-no-files-found: error
          path: |
            target/distrib/hennery-${{ matrix.target }}.tar.xz
            target/distrib/hennery-${{ matrix.target }}.tar.xz.sha256
            target/distrib/${{ matrix.target }}-dist-manifest.json

  # Exercise the exact R4 OCI merge/registry code on every PR and main run.
  # These release-target images contain CI fixture legal inputs, never approval.
  image-index:
    needs: archive
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: ci-image-*
          path: images/
      - name: Test both-platform index in loopback registry only
        run: |
          python3 packaging/image.py merge index-layout images/ci-image-amd64/layout images/ci-image-arm64/layout
          python3 - <<'PY'
          import json
          from pathlib import Path
          inventory = {}
          for path in Path('images').glob('ci-image-*/binary-sha256.json'):
              inventory.update(json.loads(path.read_text()))
          assert set(inventory) == {'amd64', 'arm64'}, 'both CI platforms required'
          Path('ci-binary-sha256.json').write_text(json.dumps(inventory))
          PY
          python3 packaging/image.py verify index-layout ci-binary-sha256.json "$GITHUB_SHA" 0.0.0
          python3 packaging/image-signing-inputs.py index-layout index index-signing-inputs
          sudo apt-get update
          sudo apt-get install -y skopeo
          sh packaging/test-image-registry.sh index-layout

  # What spans the archives: the installer (their checksums embedded), the
  # Homebrew formula, and `sha256.sum`.
  installers:
    needs: archive
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - name: Install dist
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: archive-*
          path: target/distrib/
          merge-multiple: true
      - name: Build the installers
        run: dist build --artifacts=global
      # cargo-dist's installer skips the check without `sha256sum`; the spec
      # wants it to refuse (packaging/harden-installer.py).
      - name: Harden the installer
        run: python3 packaging/harden-installer.py target/distrib/hennery-installer.sh
      - name: The installer installs, and refuses what it cannot check
        run: sh packaging/test-installer.sh target/distrib
      - name: The formula names every archive's SHA-256
        run: sh packaging/check-formula.sh target/distrib
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: installers
          retention-days: 7
          if-no-files-found: error
          path: |
            target/distrib/hennery-installer.sh
            target/distrib/hennery.rb
            target/distrib/sha256.sum

  # The same installer, on macOS: its own `sha256sum` and `shasum`, its own
  # archive.
  installer-macos:
    needs: installers
    runs-on: macos-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: archive-*
          path: target/distrib/
          merge-multiple: true
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: installers
          path: target/distrib/
      - name: The installer installs, and refuses what it cannot check
        run: sh packaging/test-installer.sh target/distrib
~~~~

### File: `.github/workflows/release-candidate.yml`

~~~~yaml
name: release-candidate
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      tag:
        description: Annotated approved release tag; candidate creation only
        required: true
        type: string
      channels:
        description: Comma-separated channels; first alpha is github only
        default: github
        required: true
        type: string
permissions:
  contents: read
concurrency:
  group: release-candidate-${{ github.event.inputs.tag || github.ref }}-${{ github.run_id }}
  cancel-in-progress: false
jobs:
  tag-signature:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
      - name: Verify pinned maintainer signature and exact candidate SHA before storage credentials
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: nix develop .#release -c python3 packaging/release/tag_signature.py --tag "$RELEASE_TAG" --source-sha "$GITHUB_SHA"
  web-ui:
    needs: tag-signature
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Build the UI once from the pinned lock
        run: nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: release-ui
          retention-days: 90
          if-no-files-found: error
          path: web/dist/
  archive:
    needs: web-ui
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-unknown-linux-musl
            runner: ubuntu-24.04
            image: amd64
          - target: aarch64-unknown-linux-musl
            runner: ubuntu-24.04-arm
            image: arm64
          - target: aarch64-apple-darwin
            runner: macos-15
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - name: Annotated tag, exact source and workspace version
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: |
          test "$(git cat-file -t "$RELEASE_TAG")" = tag
          source_sha=$(git rev-parse "$RELEASE_TAG^{commit}")
          test "$source_sha" = "$(git rev-parse HEAD)"
          echo "RELEASE_SOURCE_SHA=$source_sha" >> "$GITHUB_ENV"
          python3 -c 'import os,tomllib; from pathlib import Path; v=tomllib.loads(Path("Cargo.toml").read_text())["workspace"]["package"]["version"]; assert os.environ["RELEASE_TAG"] == "v"+v'
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: 1.98.1
          targets: ${{ matrix.target }}
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Native build tools
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y musl-tools
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: release-ui
          path: web/dist/
      - name: Pinned dist and source and licence inputs
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web licenses list --json > frontend-licences.json'
          cargo metadata --locked --all-features --filter-platform '${{ matrix.target }}' --format-version=1 > cargo-metadata.json
          nix develop .#release -c python3 packaging/release/supply.py materials --output release-materials \
            --source-sha "$RELEASE_SOURCE_SHA" --target '${{ matrix.target }}' \
            --cargo-metadata cargo-metadata.json --frontend-licences frontend-licences.json
      - name: Current advisory databases; findings stop candidate creation
        run: |
          nix develop .#release -c cargo-audit audit --file Cargo.lock --db "$RUNNER_TEMP/release-advisories" --json > release-materials/rust-advisories.json
          git -C "$RUNNER_TEMP/release-advisories" rev-parse HEAD > release-materials/rust-advisory-revision.txt
          nix develop .#web -c pnpm --dir web audit --json > release-materials/web-advisories.json
      - name: Build fresh final archive with notices
        env:
          HENNERY_WEB_REQUIRE: '1'
        run: |
          python3 - <<'PY' >> "$GITHUB_ENV"
          import json
          i=json.load(open('release-materials/build-identity.json'))
          for key, field in [('HENNERY_BUILD_SOURCE_SHA','source_sha'),('HENNERY_BUILD_UI_SHA256','ui_sha256'),('HENNERY_BUILD_MANIFEST_SHA256','adapter_manifest_sha256')]:
              print(key+'='+i[field])
          PY
      - name: Archive and content acceptance
        env:
          HENNERY_WEB_REQUIRE: '1'
        run: |
          dist build --artifacts=local --target='${{ matrix.target }}' --print=linkage --output-format=json > target-manifest.json
          archive='hennery-${{ matrix.target }}'
          mkdir -p unpacked
          tar -xJf "target/distrib/$archive.tar.xz" -C unpacked
          cp release-materials/THIRD-PARTY-NOTICES.txt "unpacked/$archive/"
          tar -cJf "target/distrib/$archive.tar.xz" -C unpacked "$archive"
          (cd target/distrib && shasum -a 256 "$archive.tar.xz" > "$archive.tar.xz.sha256")
          sh packaging/check-archive.sh "target/distrib/$archive.tar.xz" '${{ matrix.target }}' --notices
          binary="$PWD/unpacked/$archive/hennery"
          sh packaging/check-linkage.sh "$binary"
          sh packaging/check-web-ui.sh "$binary"
          "$binary" --version
          cp target-manifest.json 'target/distrib/${{ matrix.target }}-dist-manifest.json'
          python3 packaging/release/refresh_manifest.py 'target/distrib/${{ matrix.target }}-dist-manifest.json' "target/distrib/$archive.tar.xz"
          cp release-materials/* target/distrib/
          python3 - <<'PY' > target/distrib/builder.json
          import json,os,platform,subprocess
          print(json.dumps({'os':platform.platform(),'runner_image':os.environ.get('ImageVersion'),'rust':subprocess.check_output(['rustc','-vV'],text=True),'sdk':subprocess.getoutput('xcrun --show-sdk-version') if platform.system()=='Darwin' else subprocess.getoutput('ldd --version')}))
          PY
      - name: Alpine executable and retained release image acceptance
        if: runner.os == 'Linux'
        env:
          IMAGE_ARCH: ${{ matrix.image }}
          TARGET: ${{ matrix.target }}
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: |
          binary="$PWD/unpacked/hennery-$TARGET/hennery"
          docker run --rm -v "$binary:/hennery:ro" alpine:3@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 /hennery --version
          mkdir -p "dist/linux-$IMAGE_ARCH"
          cp "$binary" "dist/linux-$IMAGE_ARCH/hennery"
          cp release-materials/THIRD-PARTY-NOTICES.txt "dist/linux-$IMAGE_ARCH/THIRD-PARTY-NOTICES"
          cp "release-materials/hennery-$TARGET.spdx.json" "dist/linux-$IMAGE_ARCH/binary.spdx.json"
          docker buildx create --use --name r4 --driver docker-container --driver-opt image=moby/buildkit:buildx-stable-1@sha256:cec9f139f45e93c5c69c60f8b07cfad9f43f4ef6b6a6cd917527fea5ff2e3dea
          sh packaging/image-build.sh "$IMAGE_ARCH" image-output "${RELEASE_TAG#v}" "$RELEASE_SOURCE_SHA" "$(git show -s --format=%ct HEAD)"
          python3 - <<'PY'
          import hashlib,json,os
          from pathlib import Path
          arch=os.environ['IMAGE_ARCH']
          Path('native-binaries.json').write_text(json.dumps({arch:hashlib.sha256(Path('dist/linux-'+arch+'/hennery').read_bytes()).hexdigest()}))
          PY
          python3 packaging/image.py verify image-output/layout native-binaries.json "$RELEASE_SOURCE_SHA" "${RELEASE_TAG#v}" > image-output/verified.json
          python3 packaging/image-signing-inputs.py image-output/layout "$IMAGE_ARCH" native-signing-inputs
          sudo apt-get update
          sudo apt-get install -y skopeo
          sh packaging/test-image-registry.sh image-output/layout "$IMAGE_ARCH"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: runner.os == 'Linux'
        with:
          name: release-image-${{ matrix.image }}
          retention-days: 90
          if-no-files-found: error
          path: image-output/
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: candidate-${{ matrix.target }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  assemble:
    needs: archive
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: candidate-*
          path: candidates
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',ghcr,')
        with:
          pattern: release-image-*
          path: images
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Assemble global inputs; never silently merge conflicting materials
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
          RELEASE_CHANNELS: ${{ github.event.inputs.channels || 'github' }}
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          python3 packaging/release/assemble.py candidates target/distrib
          "$RUNNER_TEMP/dist-bin/dist" build --artifacts=global --output-format=json > target/distrib/dist-manifest.json
          python3 packaging/harden-installer.py target/distrib/hennery-installer.sh
          sh packaging/test-installer.sh target/distrib
          sh packaging/check-formula.sh target/distrib
          git show HEAD:CHANGELOG.md > target/distrib/release-notes.md
          git archive --format=tar --prefix=hennery-source/ HEAD | xz > target/distrib/hennery-source.tar.xz
          case ",$RELEASE_CHANNELS," in
            *,ghcr,*)
              python3 packaging/ghcr-candidate.py assemble target/distrib image-assembly "$(git rev-parse HEAD)" "${RELEASE_TAG#v}" \
                images/release-image-amd64/layout images/release-image-arm64/layout
              sudo apt-get update
              sudo apt-get install -y skopeo
              sh packaging/test-image-registry.sh image-assembly/layout
              ;;
          esac
          python3 packaging/release/supply.py freeze --output target/distrib \
            --source-sha "$(git rev-parse HEAD)" --tag "$RELEASE_TAG" --channels "$RELEASE_CHANNELS" \
            --run-id "$GITHUB_RUN_ID" --run-attempt "$GITHUB_RUN_ATTEMPT" > inventory-sha256.txt
          cat inventory-sha256.txt >> "$GITHUB_STEP_SUMMARY"
          echo 'Candidate still needs Object Lock retention and channel acceptance before approval.' >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  installer:
    needs: assemble
    strategy:
      fail-fast: false
      matrix:
        runner: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Native installer positives and refusals
        run: sh packaging/test-installer.sh candidate
  retain:
    needs: [assemble, installer, tag-signature]
    if: vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true'
    environment: release-staging
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Retain exact versions under compliance retention and legal hold
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          inventory=$(sha256sum candidate/release-inventory.json | cut -d' ' -f1)
          nix develop .#release -c python3 packaging/release/retention.py stage \
            --candidate candidate --bucket "$RELEASE_BUCKET" --inventory-sha256 "$inventory" --receipt retention-receipt.json
          echo "Held candidate inventory: $inventory" >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: retention-receipt-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: retention-receipt.json
~~~~

## Task 3: Gated GHCR publication, signing and deployment guidance

- [x] Tests observed RED, implementation and COPY probes.
- [x] Exact final source below; fresh replay recorded.
- [ ] Parent scoped review and native Docker acceptance.

Run all R4 contracts, all R1 release contracts, actionlint on every workflow and shellcheck on all seven relevant scripts. The production workflow checker must pass the whole repository. Six Rust checks and fresh replay/probes are recorded below.

### File: `packaging/tests/test_ghcr.py`

~~~~python
"""All registry commands here are fake executables; no network or credentials."""
import json
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import sys
import unittest
import yaml
from unittest.mock import patch
from test_image import CandidateFixtures, image
import test_image as fixtures
from test_ghcr_candidate import ReleaseFixture, approval, gate, load_helper

PACKAGING = Path(__file__).parents[1]


class Gates(ReleaseFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        self.repo = self.root
        (self.repo / 'packaging').mkdir()
        for name in ['ghcr-gate.sh', 'ghcr-publish.sh', 'image.py', 'ghcr-remote.py', 'ghcr-candidate.py']:
            shutil.copyfile(PACKAGING / name, self.repo / 'packaging' / name)
        shutil.copytree(PACKAGING / 'release', self.repo / 'packaging/release',
                        ignore=shutil.ignore_patterns('__pycache__'))
        helper = self.assembled()
        with patch.object(approval.subprocess, 'run', side_effect=self.crypto):
            report = helper.qualify(self.candidate, self.inventory_digest, self.work, self.inputs)
        candidate, digest = self.work, report['digest']
        self.adapter = self.repo / 'packaging/release-gate'
        self.adapter.write_text('#!' + sys.executable + '''
import os, pathlib, sys
sys.path.insert(0, "packaging/release")
import retention
with open(os.environ['ADAPTER_CALLS'], 'a') as log: log.write(' '.join(sys.argv[1:]) + '\\n')
if os.environ.get('RELEASE_SHELL_FIXTURE') != '1': sys.exit(92)
if pathlib.Path(os.environ['GATE_REVOKED_MARKER']).exists(): sys.exit(19)
if os.environ.get('GATE_EXIT', '0') != '0': sys.exit(int(os.environ['GATE_EXIT']))
receipt = pathlib.Path(sys.argv[sys.argv.index('--receipt') + 1])
with receipt.open('x') as output: output.write('{}')
retention.audit(receipt, 'offline-audit', int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
''')
        self.adapter.chmod(0o755)
        event = self.repo / 'event.json'; event.write_text(json.dumps({'inputs': self.inputs}))
        self.env = dict(os.environ, RELEASE_PUBLICATION_ENABLED='true', RELEASE_GHCR_ENABLED='true',
            INVENTORY_SHA256=self.inventory_digest, RELEASE_CANDIDATE='candidate', IMAGE_CANDIDATE='image-candidate',
            GITHUB_EVENT_PATH=str(event), GITHUB_RUN_ID='456', GITHUB_RUN_ATTEMPT='1',
            GATE_REVOKED_MARKER=str(self.repo / 'approval-revoked'),
            ADAPTER_CALLS=str(self.repo / 'adapter.log'), AWS_AUDIT_ROOT=str(self.repo / 'audit-store'),
            REGISTRY_AUTH_FILE=str(self.repo / 'auth.json'), PYTHONDONTWRITEBYTECODE='1')
        self.bindings = ['INVENTORY_SHA256', 'RELEASE_CANDIDATE', 'IMAGE_CANDIDATE']
        fakebin = self.repo / 'bin'
        fakebin.mkdir()
        aws = fakebin / 'aws'
        aws.write_text('#!' + sys.executable + '''
import json, os, pathlib, sys
args = sys.argv[1:]
def value(flag): return args[args.index(flag) + 1] if flag in args else None
if (args[:2] != ['s3api', 'put-object'] or value('--bucket') != 'offline-audit'
    or value('--if-none-match') != '*' or value('--object-lock-mode') != 'COMPLIANCE'
    or value('--object-lock-legal-hold-status') != 'ON'
    or value('--checksum-algorithm') != 'SHA256' or not value('--object-lock-retain-until-date')):
    sys.exit('immutable audit request required')
key = value('--key')
prefix = 'audit/' + os.environ['GITHUB_RUN_ID'] + '/' + os.environ['GITHUB_RUN_ATTEMPT'] + '/'
if not key.startswith(prefix) or '..' in key.split('/'): sys.exit('invalid audit key')
path = pathlib.Path(os.environ['AWS_AUDIT_ROOT']) / key
path.parent.mkdir(parents=True, exist_ok=True)
try:
    with path.open('xb') as output: output.write(pathlib.Path(value('--body')).read_bytes())
except FileExistsError:
    sys.exit('412 PreconditionFailed: immutable audit object already exists')
print(json.dumps({'VersionId': 'fixture-version'}))
''')
        aws.chmod(0o755)
        nix = fakebin / 'nix'
        nix.write_text('''#!/bin/sh
[ "$1" = develop ] && [ "$2" = '.#release' ] && [ "$3" = -c ] || exit 94
shift 3
export RELEASE_SHELL_FIXTURE=1
exec "$@"
''')
        nix.chmod(0o755)
        python = fakebin / 'python3'
        python.write_text('''#!''' + sys.executable + '''
import io, json, os, runpy, sys, urllib.error, urllib.request
from pathlib import Path
if sys.argv[1] == 'packaging/ghcr-remote.py':
    class Response(io.BytesIO):
        status = 200
    class Opener:
        def open(self, request, timeout):
            if '/token?' in request.full_url:
                return Response(b'{"token":"test-only-fixture"}')
            with open(os.environ['TRANSPORT_CALLS'], 'a') as log:
                log.write('inspect\\n')
            if os.environ.get('REVOKE_AFTER_INSPECT') == '1':
                Path(os.environ['GATE_REVOKED_MARKER']).write_text('review revoked')
            remote = Path(os.environ['REMOTE'])
            if remote.exists():
                return Response(remote.read_bytes())
            status = int(os.environ.get('REMOTE_STATUS', '404'))
            error = os.environ.get('REMOTE_ERROR', 'missing')
            codes = {'missing': 'MANIFEST_UNKNOWN',
                     'name unknown: repository name not known to registry': 'NAME_UNKNOWN'}
            body = json.dumps({'errors': [{'code': codes.get(error, error)}]}).encode()
            raise urllib.error.HTTPError(request.full_url, status, 'fixture', {}, io.BytesIO(body))
    urllib.request.build_opener = lambda *args: Opener()
    sys.argv = sys.argv[1:]
    runpy.run_path(sys.argv[0], run_name='__main__')
else:
    os.execv(''' + repr(sys.executable) + ''', [''' + repr(sys.executable) + ''', *sys.argv[1:]])
''')
        python.chmod(0o755)
        gpg = fakebin / 'gpg'
        gpg.write_text('#!' + sys.executable + '''
import hashlib, os, pathlib, sys
if os.environ.get('RELEASE_SHELL_FIXTURE') != '1': sys.exit(93)
if '--verify' in sys.argv:
    raw = pathlib.Path(sys.argv[-1]).read_bytes()
    signature = pathlib.Path(sys.argv[-2]).read_text()
    if hashlib.sha256(raw).hexdigest() not in signature:
        print('[GNUPG:] BADSIG'); sys.exit(1)
    print('[GNUPG:] VALIDSIG ''' + approval.FINGERPRINT + ''' 0')
''')
        gpg.chmod(0o755)
        (self.repo / 'auth.json').write_text('{"auths":{"ghcr.io":{"auth":"dGVzdDpmaXh0dXJl"}}}')
        self.env['PATH'] = str(fakebin) + os.pathsep + os.environ['PATH']
        skopeo = fakebin / 'skopeo'
        skopeo.write_text('''#!/bin/sh
echo "$1" >> "$TRANSPORT_CALLS"
if [ "$1" = inspect ]; then
    if [ -f "$REMOTE" ]; then cat "$REMOTE"; exit 0; fi
    if [ "${REMOTE_ERROR:-missing}" = missing ]; then echo 'manifest unknown' >&2; else echo "$REMOTE_ERROR" >&2; fi
    exit 1
fi
if [ "$1" = copy ]; then cp "$CORRECT_REMOTE" "$REMOTE"; exit "${COPY_EXIT:-0}"; fi
exit 90
''')
        skopeo.chmod(0o755)
        correct = self.repo / 'correct-remote.json'
        correct.write_bytes((candidate / 'layout/blobs/sha256' / digest[7:]).read_bytes())
        self.env.update(TRANSPORT_CALLS=str(self.repo / 'transport.log'),
                        REMOTE=str(self.repo / 'remote.json'), CORRECT_REMOTE=str(correct))
        self.digest = digest

    def run_script(self, script='ghcr-gate.sh', *args):
        if script == 'ghcr-gate.sh':
            args = (*args, 'receipt-' + str(len(list(self.repo.glob('receipt-*')))) + '.json')
        return subprocess.run(['sh', 'packaging/' + script, *args], cwd=self.repo,
                               env=self.env, text=True, capture_output=True)

    def transport(self):
        p = self.repo / 'transport.log'
        return p.read_text().splitlines() if p.exists() else []

    def test_repeated_gates_retain_distinct_immutable_audit_objects(self):
        for _ in range(2):
            result = self.run_script('ghcr-gate.sh', 'preflight')
            self.assertEqual(result.returncode, 0, result.stderr)
        for _ in range(2):
            result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
            self.assertEqual(result.returncode, 0, result.stderr)
        objects = list((self.repo / 'audit-store/audit/456/1').glob('*.json'))
        self.assertEqual(len(objects), 5, 'every real audit call must retain a unique basename')
        # A different local directory cannot evade the remote basename collision.
        other = self.repo / 'other'; other.mkdir()
        receipt = other / objects[0].name; receipt.write_text('{}')
        result = self.audit(receipt)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('412', result.stderr)

    def audit(self, receipt):
        return subprocess.run([sys.executable, '-c',
            'import sys, subprocess; sys.path.insert(0,"packaging/release"); import retention\n'
            'try: retention.audit(sys.argv[1],"offline-audit",456,1)\n'
            'except subprocess.CalledProcessError as error:\n'
            ' sys.stderr.buffer.write(error.stderr); sys.exit(error.returncode)\n', str(receipt)],
            cwd=self.repo, env=self.env, text=True, capture_output=True)

    def test_matrix_gate_receipts_pass_real_immutable_audit(self):
        workflow = yaml.safe_load((PACKAGING.parent / '.github/workflows/release-publish.yml').read_text())
        job = workflow['jobs']['ghcr-attest']; names = []
        for subject in job['strategy']['matrix']['subject']:
            directory = self.repo / ('job-' + subject); directory.mkdir()
            for step in job['steps']:
                if step.get('uses') == './.github/actions/release-gate':
                    name = step['with']['receipt'].replace('${{ matrix.subject }}', subject)
                elif step.get('run', '').startswith('sh packaging/ghcr-gate.sh '):
                    name = shlex.split(step['run'].splitlines()[0])[3].replace('$SUBJECT', subject)
                elif step.get('name', '').startswith('Preserve ') and 'bundle' in step['name']:
                    if subject == 'index' and step.get('if'):
                        continue
                    name = shlex.split(step['run'].splitlines()[-1])[-1].replace('$SUBJECT', subject)
                else:
                    continue
                receipt = directory / name; receipt.parent.mkdir(parents=True, exist_ok=True)
                receipt.write_text('{}')
                result = self.audit(receipt)
                self.assertEqual(result.returncode, 0, 'real audit refused ' + name + ': ' + result.stderr)
                names.append(name)
        self.assertEqual(len(names), 25)
        self.assertEqual(len(list((self.repo / 'audit-store/audit/456/1').glob('*.json'))), 25)

    def test_approved_binding_is_revalidated_and_local_bytes_checked(self):
        result = self.run_script('ghcr-gate.sh', 'preflight')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.repo / 'adapter.log').read_text().strip(),
                         'ghcr --candidate candidate --inventory-sha256 ' + self.inventory_digest + ' --phase preflight --receipt receipt-0.json')

    def test_each_missing_binding_refuses_before_adapter(self):
        for field in self.bindings:
            with self.subTest(field=field):
                value = self.env.pop(field)
                self.assertNotEqual(self.run_script('ghcr-gate.sh', 'preflight').returncode, 0)
                self.env[field] = value
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_disabled_channel_refuses(self):
        for variable in ['RELEASE_PUBLICATION_ENABLED', 'RELEASE_GHCR_ENABLED']:
            self.env[variable] = 'false'
            self.assertNotEqual(self.run_script('ghcr-gate.sh', 'preflight').returncode, 0)
            self.env[variable] = 'true'
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_empty_working_directory_refuses_before_gate(self):
        self.env['IMAGE_CANDIDATE'] = ''
        result = self.run_script('ghcr-gate.sh', 'preflight')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_missing_shared_gate_refuses_before_registry_access(self):
        self.adapter.unlink()
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('shared release gate', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_missing_signature_refuses_before_registry_access(self):
        Path(self.env['GITHUB_EVENT_PATH']).write_text('{"inputs":{}}')
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('signature input missing', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_wrong_inventory_refuses_before_registry_access(self):
        self.env['INVENTORY_SHA256'] = 'f' * 64
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('inventory digest mismatch', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_wrong_layout_argument_refuses_before_registry_access(self):
        shutil.copytree(self.work / 'layout', self.repo / 'other-layout')
        result = self.run_script('ghcr-publish.sh', 'other-layout', self.version, self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('layout argument', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_r1_rejection_prevents_registry_access(self):
        self.env['GATE_EXIT'] = '19'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 19)
        self.assertEqual(self.transport(), [])

    def test_approval_revoked_after_inspection_refuses_before_copy(self):
        self.env['REVOKE_AFTER_INSPECT'] = '1'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', self.version, self.digest)
        self.assertEqual(result.returncode, 19)
        self.assertEqual(self.transport(), ['inspect'])

    def test_actual_payload_change_after_approval_refuses(self):
        candidate = self.repo / 'image-candidate'
        self.root = self.repo / 'changed'
        self.root.mkdir()
        self.binary = b'changed after approval'
        inputs = fixtures.Index.pair(self)
        digest = image.merge(candidate / 'changed-layout', inputs)
        (candidate / 'layout').rename(candidate / 'old-layout')
        (candidate / 'changed-layout').rename(candidate / 'layout')
        (candidate / 'index-digest.txt').write_text(digest)
        self.root = self.repo
        result = self.run_script('ghcr-gate.sh', 'boundary')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('working OCI', result.stderr)

    def test_valid_but_unapproved_publish_arguments_refuse(self):
        for version, digest in [('0.2.0', self.digest), ('0.1.0', 'sha256:' + 'f' * 64)]:
            with self.subTest(version=version, digest=digest):
                result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', version, digest)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.transport(), [])
                self.assertIn('arguments differ', result.stderr)
        self.assertEqual(self.transport(), [])

    def test_single_platform_signed_inventory_refuses(self):
        raw = json.loads((self.candidate / 'release-inventory.json').read_bytes())
        raw['targets'] = ['aarch64-unknown-linux-musl']
        data = gate.canonical(raw)
        (self.candidate / 'release-inventory.json').write_bytes(data)
        self.env['INVENTORY_SHA256'] = gate.digest(data)
        signature = self.signature.replace(self.inventory_digest, gate.digest(data))
        Path(self.env['GITHUB_EVENT_PATH']).write_text(json.dumps({'inputs': {'maintainer_signature': signature}}))
        result = self.run_script('ghcr-gate.sh', 'boundary')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('both Linux targets', result.stderr)

    def test_invalid_boundary_refuses(self):
        self.assertNotEqual(self.run_script('ghcr-gate.sh', 'other').returncode, 0)
        self.assertFalse((self.repo / 'adapter.log').exists())

    def test_invalid_expected_digest_refuses(self):
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', 'bad-digest')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.transport(), [])

    def test_index_digest_sidecar_mismatch_refuses(self):
        (self.repo / 'image-candidate/index-digest.txt').write_text('sha256:' + 'f' * 64)
        self.assertIn('metadata changed', self.run_script('ghcr-gate.sh', 'boundary').stderr)

    def test_missing_retained_candidate_refuses(self):
        (self.candidate / 'ghcr-oci-layout.tar').unlink()
        self.assertNotEqual(self.run_script('ghcr-gate.sh', 'boundary').returncode, 0)

    def test_remote_matching_bytes_skip_write(self):
        shutil.copyfile(self.env['CORRECT_REMOTE'], self.env['REMOTE'])
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.transport(), ['inspect'])

    def test_remote_mismatched_bytes_refuse_write(self):
        Path(self.env['REMOTE']).write_text('other bytes')
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('digest mismatch', result.stderr)
        self.assertEqual(self.transport(), ['inspect'])

    def test_remote_unauthorized_or_ambiguous_refuses_write(self):
        self.env['REMOTE_ERROR'] = 'unexpected registry failure'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('cannot be reconciled', result.stderr)
        self.assertEqual(self.transport(), ['inspect'])

    def test_remote_auth_error_with_missing_manifest_text_refuses(self):
        for error in ['unauthorized: manifest unknown', 'status code: 500: manifest unknown',
                      'connection reset: name unknown']:
            with self.subTest(error=error):
                self.env['REMOTE_ERROR'] = error
                Path(self.env['REMOTE']).unlink(missing_ok=True)
                Path(self.env['TRANSPORT_CALLS']).unlink(missing_ok=True)
                result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.transport(), ['inspect'])

    def test_http_auth_failure_with_manifest_unknown_refuses_write(self):
        # Skopeo flattens these real 401/403 responses to "manifest unknown".
        # Its identical text is insufficient proof of absence.
        for status in ['401', '403']:
            with self.subTest(status=status):
                self.env['REMOTE_STATUS'] = status
                Path(self.env['REMOTE']).unlink(missing_ok=True)
                Path(self.env['TRANSPORT_CALLS']).unlink(missing_ok=True)
                result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertEqual(self.transport(), ['inspect'])

    def test_remote_timeout_refuses_write(self):
        self.env['REMOTE_ERROR'] = 'timeout'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.transport(), ['inspect'])

    def test_explicit_missing_namespace_can_be_created_after_approval(self):
        self.env['REMOTE_ERROR'] = 'name unknown: repository name not known to registry'
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.transport(), ['inspect', 'copy', 'inspect'])

    def test_missing_upload_is_revalidated_then_digest_checked(self):
        result = self.run_script('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.transport(), ['inspect', 'copy', 'inspect'])
        self.assertEqual(len((self.repo / 'adapter.log').read_text().splitlines()), 2)

    def test_ambiguous_upload_stops_and_retry_reconciles(self):
        self.env['COPY_EXIT'] = '5'
        args = ('ghcr-publish.sh', 'image-candidate/layout', '0.1.0', self.digest)
        self.assertEqual(self.run_script(*args).returncode, 5)
        self.assertEqual(self.transport(), ['inspect', 'copy'])
        self.env['GITHUB_RUN_ATTEMPT'] = '2'
        self.assertEqual(self.run_script(*args).returncode, 0)
        self.assertEqual(self.transport(), ['inspect', 'copy', 'inspect'])

    def test_moving_or_injected_version_refuses(self):
        for version in ['latest', '0.1', '../image', '0.1.0;echo bad', '-x']:
            with self.subTest(version=version):
                self.assertNotEqual(self.run_script('ghcr-publish.sh', 'image-candidate/layout', version, self.digest).returncode, 0)
        self.assertEqual(self.transport(), [])


class SigningInputs(CandidateFixtures, unittest.TestCase):
    def test_all_three_subjects_are_retained_digests(self):
        inputs = fixtures.Index.pair(self)
        layout = self.root / 'joined'
        digest = image.merge(layout, inputs)
        for subject in ['amd64', 'arm64', 'index']:
            result = subprocess.run([sys.executable, str(PACKAGING / 'image-signing-inputs.py'),
                str(layout), subject, str(self.root / ('sign-' + subject))],
                capture_output=True, text=True, env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1'))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(result.stdout.startswith('digest=sha256:'))
            if subject == 'index':
                self.assertEqual(result.stdout.strip(), 'digest=' + digest)
            else:
                output = self.root / ('sign-' + subject)
                self.assertEqual(json.loads((output / 'image.spdx.json').read_text())['packages'][0]['name'], 'base')
                self.assertEqual(len(json.loads((output / 'binary.spdx.json').read_text())['packages']), 2)

if __name__ == '__main__':
    unittest.main()
~~~~

### File: `packaging/tests/test_ghcr_remote.py`

~~~~python
"""Registry HTTP classification; fake responses, no network or credentials."""
import base64
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

SPEC = importlib.util.spec_from_file_location('ghcr_remote', Path(__file__).parents[1] / 'ghcr-remote.py')
remote = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(remote)


class Response(io.BytesIO):
    status = 200


class HTTP(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.authfile = Path(scratch.name) / 'auth.json'
        self.auth = base64.b64encode(b'fixture:never-real-credentials').decode()
        self.authfile.write_text(json.dumps({'auths': {'ghcr.io': {'auth': self.auth}}}))
        self.body = b'{"schemaVersion":2,"manifests":[]}'
        self.digest = 'sha256:' + hashlib.sha256(self.body).hexdigest()
        self.status, self.codes = 200, ['MANIFEST_UNKNOWN']
        self.token_status = 200
        self.token = 'fixture-bearer'
        self.token_response_status = self.manifest_response_status = 200
        self.calls = []

    def open(self, request, timeout):
        self.calls.append((request, timeout))
        token_request = '/token?' in request.full_url
        status = self.token_status if token_request else self.status
        if status == 200:
            response = Response(json.dumps({'token': self.token}).encode() if token_request else self.body)
            response.status = self.token_response_status if token_request else self.manifest_response_status
            return response
        body = json.dumps({'errors': [{'code': code} for code in self.codes]}).encode()
        raise urllib.error.HTTPError(request.full_url, status, 'fixture', {}, io.BytesIO(body))

    def check(self):
        return remote.reconcile('0.1.0-alpha.1', self.digest, self.authfile, self)

    def test_matching_bytes_and_fixed_authenticated_requests(self):
        self.assertEqual(self.check(), 0)
        token, manifest = [request for request, _ in self.calls]
        self.assertTrue(token.full_url.startswith('https://ghcr.io/token?'))
        self.assertEqual(token.get_header('Authorization'), 'Basic ' + self.auth)
        self.assertEqual(manifest.full_url, 'https://ghcr.io/v2/marcinwadon/hennery/manifests/0.1.0-alpha.1')
        self.assertEqual(manifest.get_header('Authorization'), 'Bearer fixture-bearer')
        self.assertEqual([timeout for _, timeout in self.calls], [30, 30])

    def test_mismatched_remote_digest_refuses(self):
        self.body = b'other manifest bytes'
        with self.assertRaisesRegex(ValueError, 'digest mismatch'):
            self.check()

    def test_only_authenticated_404_with_explicit_absence_is_absent(self):
        self.status = 404
        for code in ['MANIFEST_UNKNOWN', 'NAME_UNKNOWN']:
            self.codes = [code]
            self.assertEqual(self.check(), 1)

    def test_same_absent_body_on_auth_server_or_redirect_status_refuses(self):
        for status in [301, 302, 307, 401, 403, 408, 429, 500, 503]:
            with self.subTest(status=status):
                self.status = status
                with self.assertRaisesRegex(ValueError, 'cannot be reconciled'):
                    self.check()

    def test_ambiguous_404_refuses(self):
        self.status = 404
        for codes in [[], ['DENIED'], ['MANIFEST_UNKNOWN', 'UNAUTHORIZED']]:
            with self.subTest(codes=codes):
                self.codes = codes
                with self.assertRaisesRegex(ValueError, 'cannot be reconciled'):
                    self.check()

    def test_token_auth_failure_cannot_be_classified_as_absent(self):
        self.token_status = 401
        with self.assertRaises(urllib.error.HTTPError):
            self.check()
        self.assertEqual(len(self.calls), 1)

    def test_invalid_credentials_refuse_before_http(self):
        for auth in ['invalid', base64.b64encode(b'no-separator').decode()]:
            self.authfile.write_text(json.dumps({'auths': {'ghcr.io': {'auth': auth}}}))
            with self.assertRaises(ValueError):
                self.check()
        self.assertEqual(self.calls, [])

    def test_invalid_boundary_arguments_refuse_before_http(self):
        for version, digest in [('latest', self.digest), ('0.1.0', 'invalid')]:
            with self.subTest(version=version, digest=digest):
                with self.assertRaises(ValueError):
                    remote.reconcile(version, digest, self.authfile, self)
        self.assertEqual(self.calls, [])

    def test_invalid_token_refuses_before_manifest_request(self):
        for token in ['', None, 'injected\r\nheader']:
            with self.subTest(token=token):
                self.calls.clear()
                self.token = token
                with self.assertRaisesRegex(ValueError, 'invalid registry authorization'):
                    self.check()
                self.assertEqual(len(self.calls), 1)

    def test_unexpected_success_response_status_refuses(self):
        self.token_response_status = 202
        with self.assertRaisesRegex(ValueError, 'registry authorization failed'):
            self.check()

    def test_unexpected_manifest_success_status_refuses(self):
        self.manifest_response_status = 202
        with self.assertRaisesRegex(ValueError, 'unexpected registry status'):
            self.check()

    def test_production_opener_disables_proxy_and_redirect_forwarding(self):
        with patch.object(remote.urllib.request, 'build_opener', return_value=self) as factory:
            self.assertEqual(remote.reconcile('0.1.0', self.digest, self.authfile), 0)
        proxy, redirects = factory.call_args.args
        self.assertEqual(proxy.proxies, {})
        self.assertIsInstance(redirects, remote.NoRedirect)

    def test_redirects_are_refused(self):
        self.assertIsNone(remote.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid'))

    def test_cli_exception_output_never_contains_registry_secrets(self):
        error = io.StringIO()
        with patch.object(remote, 'reconcile', side_effect=RuntimeError('fixture-secret')):
            with contextlib.redirect_stderr(error):
                self.assertEqual(remote.main(), 2)
        self.assertNotIn('fixture-secret', error.getvalue())


if __name__ == '__main__':
    unittest.main()
~~~~

### File: `packaging/tests/test_image_workflows.py`

~~~~python
"""Negative authority fixtures for GHCR inside R1's real tagged orchestrator."""
import copy
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import yaml

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT / 'packaging/release'))
import workflow_policy

WORKFLOW = ROOT / '.github/workflows/release-publish.yml'
CHANNEL_JOBS = ['ghcr', 'ghcr-attest']


def validate(workflow):
    workflow_policy.check(workflow, WORKFLOW.name)
    for name in CHANNEL_JOBS:
        if name not in workflow['jobs']:
            raise ValueError('GHCR publisher/signing job missing')
        job = workflow['jobs'][name]
        if job.get('permissions', {}).get('packages') != 'read':
            raise ValueError('ordinary package token must be READ')
        if job.get('if') != workflow_policy.CREDENTIAL_CONDITION + " && vars.RELEASE_GHCR_ENABLED == 'true'":
            raise ValueError('GHCR channel enable gate missing')
        steps = job['steps']
        logins = [s for s in steps if 'docker login' in s.get('run', '')]
        if len(logins) != 1 or logins[0].get('env', {}).get('GHCR_TOKEN') != '${{ secrets.GHCR_PUBLISH_TOKEN }}':
            raise ValueError('protected environment registry credential required')
        login = logins[0]
        guard = 'sh packaging/ghcr-gate.sh preflight '
        if guard not in login['run'] or login['run'].index(guard) > login['run'].index('docker login'):
            raise ValueError('pre-credential revalidation missing')
        preflight = next(i for i, s in enumerate(steps) if s.get('with', {}).get('phase') == 'preflight')
        if preflight >= steps.index(login):
            raise ValueError('credentials precede preflight')
        for i, step in enumerate(steps):
            if step.get('uses', '').startswith('actions/attest-'):
                if not steps[i - 1].get('run', '').startswith('sh packaging/ghcr-gate.sh boundary '):
                    raise ValueError('pre-signing revalidation missing')
    signer = workflow['jobs']['ghcr-attest']
    for step in signer['steps']:
        if step.get('uses') == './.github/actions/release-gate' and '${{ matrix.subject }}' not in step['with']['receipt']:
            raise ValueError('matrix gate receipts must be unique')
    checks = [s for s in signer['steps'] if 'packaging/release/verify.py' in s.get('run', '')]
    if len(checks) != 1 or any(x not in checks[0]['run'] for x in ['--approval-signature', '--inventory-directory', 'https://spdx.dev/Document', 'image-sbom binary-sbom']):
        raise ValueError('signed-inventory OCI predicate verification missing')
    receipt = workflow['jobs'].get('ghcr-complete', {})
    if receipt.get('if') != "always() && contains(fromJSON(inputs.channels), 'ghcr')" or set(receipt.get('needs', [])) != {'authorize', 'ghcr', 'ghcr-attest'}:
        raise ValueError('channel completion receipt missing')


class Workflow(unittest.TestCase):
    def setUp(self):
        self.workflow = yaml.safe_load(WORKFLOW.read_text())

    def test_all_writers_and_signers_are_protected(self):
        try:
            validate(self.workflow)
        except ValueError as error:
            self.fail('shipped workflow violates release authority: ' + str(error))

    def test_each_unprotected_writer_or_signer_is_refused(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow); del changed['jobs'][job]['environment']
            with self.subTest(job=job), self.assertRaises(ValueError): validate(changed)

    def test_each_writer_requires_maintainer_enable(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow); del changed['jobs'][job]['if']
            with self.subTest(job=job), self.assertRaises(ValueError): validate(changed)

    def test_early_write_permissions_are_refused(self):
        changed = copy.deepcopy(self.workflow); changed['jobs']['authorize']['permissions']['packages'] = 'write'
        with self.assertRaises(ValueError): validate(changed)

    def test_dedicated_credential_writers_are_detected_with_read_only_job_tokens(self):
        for command in ['docker login ghcr.io', 'sh packaging/ghcr-publish.sh layout 0.1.0 digest']:
            job = {'permissions': {'contents': 'read', 'packages': 'read'}, 'steps': [{'run': command}]}
            with self.subTest(command=command): self.assertTrue(workflow_policy.privileged(job))

    def test_lint_reference_is_not_a_registry_writer(self):
        job = {'permissions': {'contents': 'read'}, 'steps': [{'run':
            'nix develop .#image -c shellcheck packaging/ghcr-publish.sh packaging/ghcr-gate.sh'}]}
        self.assertFalse(workflow_policy.privileged(job))

    def test_stale_inventory_or_attempt_authorization_is_refused(self):
        for job in CHANNEL_JOBS:
            for expression in ['needs.authorize.outputs.run_attempt == github.run_attempt',
                               'needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256']:
                changed = copy.deepcopy(self.workflow)
                changed['jobs'][job]['if'] = changed['jobs'][job]['if'].replace(expression, 'true')
                with self.subTest(job=job, expression=expression), self.assertRaises(ValueError): validate(changed)

    def test_skipped_jobs_cannot_report_channel_completion(self):
        changed = copy.deepcopy(self.workflow); del changed['jobs']['ghcr-complete']
        with self.assertRaisesRegex(ValueError, 'channel completion'): validate(changed)

    def run_receipt(self, changes):
        script = self.workflow['jobs']['ghcr-complete']['steps'][0]['run']
        with tempfile.TemporaryDirectory() as temporary:
            env = dict(os.environ, AUTH_RESULT='success', PUBLISH_RESULT='success', ATTEST_RESULT='success',
                AUTH_ATTEMPT='1', GITHUB_RUN_ATTEMPT='1', AUTH_INVENTORY='a' * 64,
                INVENTORY_SHA256='a' * 64, DIGEST='sha256:' + 'b' * 64,
                GITHUB_OUTPUT=str(Path(temporary) / 'receipt'))
            env.update(changes)
            return subprocess.run(['bash', '-e', '-c', script], env=env, capture_output=True, text=True)

    def test_successful_current_attempt_can_complete(self):
        self.assertEqual(self.run_receipt({}).returncode, 0)

    def test_each_failed_or_stale_receipt_binding_refuses(self):
        for field, value in [('AUTH_RESULT', 'skipped'), ('PUBLISH_RESULT', 'skipped'),
                             ('ATTEST_RESULT', 'skipped'), ('ATTEST_RESULT', 'failure'), ('AUTH_ATTEMPT', '2'),
                             ('AUTH_INVENTORY', 'b' * 64), ('DIGEST', ''), ('DIGEST', 'not-a-digest')]:
            with self.subTest(field=field, value=value):
                self.assertNotEqual(self.run_receipt({field: value}).returncode, 0)

    def test_each_signing_boundary_requires_fresh_revalidation(self):
        steps = self.workflow['jobs']['ghcr-attest']['steps']
        guards = [i for i, s in enumerate(steps) if s.get('run', '').startswith('sh packaging/ghcr-gate.sh boundary ')]
        self.assertEqual(len(guards), 3)
        for i in guards:
            changed = copy.deepcopy(self.workflow); changed['jobs']['ghcr-attest']['steps'][i]['run'] = 'true'
            with self.subTest(boundary=i), self.assertRaisesRegex(ValueError, 'pre-signing'): validate(changed)

    def test_registry_credential_boundary_requires_revalidation(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow)
            for step in changed['jobs'][job]['steps']:
                if 'docker login' in step.get('run', ''):
                    step['run'] = step['run'].replace('sh packaging/ghcr-gate.sh preflight', 'true')
            with self.subTest(job=job), self.assertRaisesRegex(ValueError, 'pre-credential'): validate(changed)

    def test_ordinary_token_cannot_replace_environment_registry_credential(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow)
            for step in changed['jobs'][job]['steps']:
                if 'docker login' in step.get('run', ''): step['env']['GHCR_TOKEN'] = '${{ github.token }}'
            with self.subTest(job=job), self.assertRaisesRegex(ValueError, 'environment registry credential'): validate(changed)

    def test_ordinary_package_write_permissions_are_refused(self):
        for job in CHANNEL_JOBS:
            changed = copy.deepcopy(self.workflow); changed['jobs'][job]['permissions']['packages'] = 'write'
            with self.subTest(job=job), self.assertRaisesRegex(ValueError, 'READ'): validate(changed)

    def test_matrix_receipt_names_cannot_collide(self):
        changed = copy.deepcopy(self.workflow)
        for step in changed['jobs']['ghcr-attest']['steps']:
            if step.get('uses') == './.github/actions/release-gate': step['with']['receipt'] = 'shared-receipt.json'
        with self.assertRaisesRegex(ValueError, 'unique'): validate(changed)

    def test_oci_consumer_verification_is_required(self):
        changed = copy.deepcopy(self.workflow)
        changed['jobs']['ghcr-attest']['steps'] = [s for s in changed['jobs']['ghcr-attest']['steps'] if 'packaging/release/verify.py' not in s.get('run', '')]
        with self.assertRaisesRegex(ValueError, 'OCI predicate'): validate(changed)

    def test_orphaned_reusable_workflows_are_removed(self):
        for name in ['ghcr-publish.yml', 'image-candidate.yml']:
            self.assertFalse((ROOT / '.github/workflows' / name).exists())


if __name__ == '__main__': unittest.main()
~~~~

### File: `packaging/ghcr-gate.sh`

~~~~sh
#!/bin/sh
# R1 authenticates the live approval, signed inventory, tag, checks and attempt.
# R4 then binds the retained OCI/index and binaries to those same signed bytes.
# Usage: ghcr-gate.sh preflight|boundary fresh-receipt.json
set -eu
[ "$#" = 2 ] || { echo 'usage: ghcr-gate.sh preflight|boundary receipt' >&2; exit 1; }
case "$1" in preflight|boundary) ;; *) echo 'invalid GHCR boundary' >&2; exit 1 ;; esac
for field in INVENTORY_SHA256 RELEASE_CANDIDATE IMAGE_CANDIDATE; do
    value=$(printenv "$field") || { echo "missing R1 binding: $field" >&2; exit 1; }
    [ -n "$value" ] || { echo "empty R1 binding: $field" >&2; exit 1; }
done
[ "${RELEASE_PUBLICATION_ENABLED:-}" = true ] && [ "${RELEASE_GHCR_ENABLED:-}" = true ] || {
    echo 'GHCR publication is disabled' >&2; exit 1
}
[ -x packaging/release-gate ] || { echo 'shared release gate is required' >&2; exit 1; }
nix develop .#release -c packaging/release-gate ghcr --candidate "$RELEASE_CANDIDATE" \
    --inventory-sha256 "$INVENTORY_SHA256" --phase "$1" --receipt "$2"
# Reuse R1's pinned-key verifier on a byte snapshot, then qualify the actual
# layout against ghcr-index.json and inventory.binaries from that signed set.
nix develop .#release -c python3 packaging/ghcr-candidate.py qualify "$RELEASE_CANDIDATE" "$INVENTORY_SHA256" "$IMAGE_CANDIDATE" >/dev/null
~~~~

### File: `packaging/ghcr-publish.sh`

~~~~sh
#!/bin/sh
# Runs only in the protected publishing job. No rebuilding, no mutable aliases.
# Usage: ghcr-publish.sh OCI-layout immutable-version expected-index-digest
set -eu
layout=$1
version=$2
expected=$3
# Validate before interpolating a registry reference. Do not accept tags such as
# latest, spaces, slashes or shell option injection.
printf '%s\n' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' || exit 1
printf '%s\n' "$expected" | grep -Eq '^sha256:[0-9a-f]{64}$' || exit 1
reference="ghcr.io/marcinwadon/hennery:$version"
# Inspect the authenticated registry HTTP response itself. Skopeo can flatten
# 401/403 MANIFEST_UNKNOWN responses to the same text as an absent manifest.
check_remote() {
    if python3 packaging/ghcr-remote.py "$version" "$expected" "$REGISTRY_AUTH_FILE"; then
        return 0
    else
        result=$?
    fi
    [ "$result" = 1 ] || exit "$result"
    return 1
}
sh packaging/ghcr-gate.sh preflight "ghcr-preflight-$$.json"
approved_version=$(python3 -c 'import json,os; print(json.load(open(os.environ["IMAGE_CANDIDATE"]+"/verified.json"))["version"])')
approved_digest=$(cat "$IMAGE_CANDIDATE/index-digest.txt")
[ "$version" = "$approved_version" ] && [ "$expected" = "$approved_digest" ] || {
    echo 'publish arguments differ from retained candidate' >&2
    exit 1
}
# The verified working layout is the sole upload source. A correct expected
# digest must not authorize an unrelated caller-supplied OCI directory.
python3 - "$layout" "$IMAGE_CANDIDATE/layout" <<'PY'
from pathlib import Path
import sys
if Path(sys.argv[1]).resolve() != Path(sys.argv[2]).resolve():
    raise SystemExit('layout argument differs from signed candidate')
PY
if check_remote; then
    echo "ok: already published $reference@$expected"
    exit 0
fi
# Revalidation immediately precedes the write; renewed publishing attempt
# approval is required even for the identical retained candidate.
sh packaging/ghcr-gate.sh boundary "ghcr-upload-$$.json"
skopeo copy --all --preserve-digests --authfile "$REGISTRY_AUTH_FILE" \
    "oci:$layout" "docker://$reference"
# An ambiguous upload is accepted only if remote bytes match exactly.
check_remote || { echo 'upload not visible; stop and reconcile on an approved retry' >&2; exit 1; }
echo "ok: published $reference@$expected"
~~~~

### File: `packaging/ghcr-remote.py`

~~~~python
#!/usr/bin/env python3
"""Reconcile GHCR bytes: 0 matching, 1 verified absent, 2 ambiguous/refused.

Never classify Skopeo stderr: it discards HTTP status for registry errors.
Credentials/token stay in memory, requests use fixed HTTPS origins, and neither
redirects nor ambient proxy configuration may forward authorization elsewhere.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def reconcile(version, expected, authfile, opener=None):
    if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', version):
        raise ValueError('invalid image version')
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', expected):
        raise ValueError('invalid image digest')
    auth = json.loads(Path(authfile).read_bytes())['auths']['ghcr.io']['auth']
    if b':' not in base64.b64decode(auth, validate=True):
        raise ValueError('missing registry credentials')
    opener = opener or urllib.request.build_opener(
        urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(
        'https://ghcr.io/token?service=ghcr.io&scope=repository%3Amarcinwadon%2Fhennery%3Apull',
        headers={'Authorization': 'Basic ' + auth})
    with opener.open(request, timeout=30) as response:
        if response.status != 200:
            raise ValueError('registry authorization failed')
        token = json.load(response)['token']
    if not isinstance(token, str) or not token or '\r' in token or '\n' in token:
        raise ValueError('invalid registry authorization')
    request = urllib.request.Request(
        'https://ghcr.io/v2/marcinwadon/hennery/manifests/' + version,
        headers={'Authorization': 'Bearer ' + token,
                 'Accept': ', '.join(['application/vnd.oci.image.index.v1+json',
                     'application/vnd.docker.distribution.manifest.list.v2+json',
                     'application/vnd.oci.image.manifest.v1+json',
                     'application/vnd.docker.distribution.manifest.v2+json'])})
    try:
        with opener.open(request, timeout=30) as response:
            if response.status != 200:
                raise ValueError('unexpected registry status')
            actual = 'sha256:' + hashlib.sha256(response.read()).hexdigest()
        if actual != expected:
            raise ValueError('published image digest mismatch; new candidate/approval required')
        return 0
    except urllib.error.HTTPError as error:
        # Only an authenticated 404 with an explicit registry classification is
        # absent. Identical MANIFEST_UNKNOWN bodies on 401/403 fail closed.
        if error.code == 404:
            errors = json.load(error).get('errors')
            if (isinstance(errors, list) and errors and
                    all(item.get('code') in ('MANIFEST_UNKNOWN', 'NAME_UNKNOWN') for item in errors)):
                return 1
        raise ValueError('remote image cannot be reconciled; refusing recovery') from None


def main():
    try:
        return reconcile(*sys.argv[1:])
    except ValueError as error:
        # Only our fixed messages are useful. JSON/base64 errors can contain
        # registry data, so the CLI emits a generic refusal for those too.
        if str(error).startswith('published image digest mismatch'):
            print(str(error), file=sys.stderr)
        else:
            print('remote image cannot be reconciled; refusing recovery', file=sys.stderr)
        return 2
    except Exception:
        print('remote image cannot be reconciled; refusing recovery', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
~~~~

### File: `packaging/release/verify.py`

~~~~python
#!/usr/bin/env python3
"""Verify downloaded final bytes before executing the cargo-dist installer."""
import argparse
from pathlib import Path
import re
import subprocess

import gate
import supply
import approval


def attestation_command(subject, tag, bundle=None):
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', tag), 'invalid signer release tag')
    workflow = gate.REPOSITORY + '/.github/workflows/release-publish.yml'
    command = ['gh', 'attestation', 'verify', str(subject), '--repo', gate.REPOSITORY,
               '--signer-workflow', workflow, '--cert-identity', 'https://github.com/' + workflow + '@refs/tags/' + tag,
               '--source-ref', 'refs/tags/' + tag, '--cert-oidc-issuer', 'https://token.actions.githubusercontent.com',
               '--deny-self-hosted-runners']
    if bundle is not None:
        command += ['--bundle', str(bundle)]
    return command


def verify_image(image, tag, bundle=None, predicate_type='https://slsa.dev/provenance/v1', candidate=None, approval_signature=None):
    gate.require(re.fullmatch(r'ghcr\.io/marcinwadon/hennery@sha256:[0-9a-f]{64}', image), 'verification requires an immutable image digest')
    gate.require(predicate_type in ('https://slsa.dev/provenance/v1', 'https://spdx.dev/Document'), 'unexpected attestation predicate')
    gate.require(candidate is not None and approval_signature is not None, 'image requires maintainer-signed inventory')
    candidate = Path(candidate)
    proof = approval.verify(candidate / 'release-inventory.json', approval_signature)
    raw = (candidate / 'release-inventory.json').read_bytes()
    gate.require(gate.digest(raw) == proof['inventory_sha256'], 'signed image inventory changed during verification')
    inventory = gate.strict_json(raw)
    gate.verify_files(inventory, candidate)
    gate.require(inventory['tag'] == tag and 'ghcr' in inventory['channels'], 'image inventory release/channel mismatch')
    index = gate.strict_json((candidate / 'ghcr-index.json').read_bytes())
    digests = [index.get('digest')]
    if 'platforms' in index:
        gate.require(index.get('schema') == 1 and index.get('source_sha') == inventory['source_sha']
                     and index.get('version') == tag.removeprefix('v')
                     and isinstance(index['platforms'], dict)
                     and set(index['platforms']) == {'amd64', 'arm64'}, 'invalid signed image descriptor')
        digests.extend(index['platforms'].values())
        gate.require(all(isinstance(d, str) and re.fullmatch(r'sha256:[0-9a-f]{64}', d) for d in digests)
                     and len(set(digests)) == 3, 'invalid signed image digest set')
    gate.require(image.split('@', 1)[1] in digests, 'image digest is not in maintainer-signed inventory')
    command = attestation_command('oci://' + image, tag, bundle) + ['--predicate-type', predicate_type]
    if bundle is None:
        command += ['--bundle-from-oci']
    subprocess.run(command, check=True)


def require_binstall_metadata(metadata, tag):
    # Upstream binstall has no Sigstore identity verifier. Disable its native
    # strategies until a reviewed bridge exists; this custom namespace describes
    # the external verifier, never pretends to enable native Sigstore support.
    disabled = metadata.get('binstall', {}).get('disabled-strategies')
    gate.require(isinstance(disabled, list) and sorted(disabled) == ['compile', 'crate-meta-data', 'quick-install'], 'native binstall strategies must remain disabled without an identity-verifying bridge')
    policy = metadata.get('hennery-release', {})
    command = attestation_command('unused', tag)
    gate.require(policy.get('verification') == 'external-openpgp-sigstore' and policy.get('maintainer-fingerprint') == approval.FINGERPRINT and policy.get('signer-identity') == command[command.index('--cert-identity') + 1], 'binstall external verification metadata must pin the exact release-tag identity')


def verify(candidate, bundle, source_sha, tag, signer_sha=None, approval_signature=None):
    candidate, bundle = Path(candidate), Path(bundle)
    inventory_path = candidate / 'release-inventory.json'
    proof = approval.verify(inventory_path, approval_signature or candidate.parent / 'release-inventory.json.asc')
    # Verify Sigstore too: hashes beside bytes alone do not
    # authenticate an author. Hardware approval is authority; workflow is provenance.
    command = attestation_command(inventory_path, tag, bundle)
    if signer_sha:
        command += ['--signer-digest', signer_sha]
    subprocess.run(command, check=True)
    raw = inventory_path.read_bytes()
    gate.require(gate.digest(raw) == proof['inventory_sha256'], 'signed inventory changed during verification')
    inventory = gate.strict_json(raw)
    gate.require(inventory['source_sha'] == source_sha and inventory['tag'] == tag, 'attested release source/tag mismatch')
    gate.verify_files(inventory, candidate)
    supply.verify_checksums(candidate)
    supply.verify_binary_inventory(inventory, candidate)
    # Every final payload has provenance too, including SBOMs and installer.
    for artifact in inventory['artifacts']:
        per_file = list(command)
        per_file[3] = str(candidate / artifact['name'])
        subprocess.run(per_file, check=True)
    return inventory


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    subject = parser.add_mutually_exclusive_group(required=True)
    subject.add_argument('--candidate', type=Path)
    subject.add_argument('--image')
    parser.add_argument('--bundle', type=Path)
    parser.add_argument('--approval-signature', required=True, type=Path)
    parser.add_argument('--inventory-directory', type=Path)
    parser.add_argument('--source-sha')
    parser.add_argument('--tag', required=True)
    parser.add_argument('--signer-sha')
    parser.add_argument('--predicate-type', default='https://slsa.dev/provenance/v1')
    args = parser.parse_args()
    if args.image:
        verify_image(args.image, args.tag, args.bundle, args.predicate_type, args.inventory_directory, args.approval_signature)
    else:
        if args.bundle is None or args.source_sha is None:
            parser.error('file verification requires --bundle and --source-sha')
        verify(args.candidate, args.bundle, args.source_sha, args.tag, args.signer_sha, args.approval_signature)
~~~~

### File: `packaging/release/workflow_policy.py`

~~~~python
#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys

import yaml


CREDENTIAL_CONDITION = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256"


def privileged(job):
    return any(job.get('permissions', {}).get(scope) == 'write' for scope in ('contents', 'packages', 'attestations', 'id-token')) or any(
        s.get('uses', '').startswith('actions/create-github-app-token@') or
        'publish.py upload' in s.get('run', '') or
        re.search(r'(?m)(?:^|[|;&])\s*(?:(?:nix\s+develop\s+\S+\s+-c\s+)?(?:ba)?sh\s+)?(?:packaging/ghcr-publish\.sh|docker\s+login)(?:\s|$)', s.get('run', ''))
        for s in job.get('steps', []))


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def writer(name, job):
    # Protected-environment secrets can be publication credentials even when
    # the ordinary job token is read-only (for example crates.io bootstrap).
    return privileged(job) or (environment_name(job) == 'release' and name != 'authorize')


def check(data, name):
    jobs = data.get('jobs', {})
    writers = [j for key, j in jobs.items() if writer(key, dict(j, permissions=j.get('permissions', data.get('permissions', {}))))]
    if writers:
        authorization = jobs.get('authorize', {})
        effective = dict(authorization, permissions=authorization.get('permissions', data.get('permissions', {})))
        if not authorization or privileged(effective) or authorization.get('environment') != 'release':
            raise ValueError('a protected read-only authorization job must precede credential issuance')
        proof = [s.get('with', {}).get('phase') for s in authorization.get('steps', []) if s.get('uses') == './.github/actions/release-gate']
        if proof != ['preflight']:
            raise ValueError('credential authorization must run the live preflight gate')
    for key, job in jobs.items():
        if 'uses' in job:
            raise ValueError(f'{name}/{key}: reusable jobs need explicit authority review; put the gate inside the protected callee')
        if not job.get('timeout-minutes'):
            raise ValueError(f'{name}/{key}: timeout required')
        permissions = job.get('permissions', data.get('permissions', {}))
        effective = dict(job, permissions=permissions)
        if job.get('continue-on-error') not in (None, False):
            raise ValueError('release jobs cannot ignore failures')
        for step in job.get('steps', []):
            if step.get('uses') == './.github/actions/release-gate' and (step.get('if') is not None or step.get('continue-on-error') not in (None, False)):
                raise ValueError('release gates must run unconditionally and stop on failure')
        if writer(key, effective):
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if 'authorize' not in needs:
                raise ValueError('writer must depend on protected credential authorization')
            condition = ' '.join(job.get('if', '').split())
            allowed = {CREDENTIAL_CONDITION} | {CREDENTIAL_CONDITION + " && vars.RELEASE_" + channel + "_ENABLED == 'true'" for channel in ('GITHUB', 'CRATES', 'GHCR', 'HOMEBREW')}
            if condition not in allowed:
                raise ValueError('credential issuance must match the authorized inventory and current run attempt')
            env = job.get('environment')
            if (env.get('name') if isinstance(env, dict) else env) != 'release':
                raise ValueError(f'{name}/{key}: protected release environment required')
            steps = job.get('steps', [])
            phases = [s.get('with', {}).get('phase') for s in steps if s.get('uses') == './.github/actions/release-gate']
            if phases != ['preflight', 'boundary']:
                raise ValueError(f'{name}/{key}: live preflight and boundary gates required')
            gates = {s['with']['phase']: i for i, s in enumerate(steps) if s.get('uses') == './.github/actions/release-gate'}
            for i, step in enumerate(steps):
                uses, run = step.get('uses', ''), step.get('run', '')
                if uses.startswith('actions/create-github-app-token@') and not gates['preflight'] < i < gates['boundary']:
                    raise ValueError('publication credentials must be acquired after preflight and before revalidation')
                if (uses.startswith('actions/attest') or 'publish.py upload' in run) and not gates['boundary'] < i:
                    raise ValueError('signing/upload must follow boundary revalidation')
        for step in job.get('steps', []):
            uses = step.get('uses', '')
            if uses and not uses.startswith('./') and not re.fullmatch(r'[^@]+@[0-9a-f]{40}', uses):
                raise ValueError(f'{name}/{key}: action must be pinned by commit')
            if name == 'release-candidate.yml' and ('cache' in uses.lower() or 'cache:' in str(step.get('with', {}))):
                raise ValueError('candidate builds must restore no Actions cache')
    if name == 'release-publish.yml':
        # Safe defaults: dispatch only; per-channel opt-in is a separate switch.
        trigger = data.get('on', data.get(True, {}))
        if set(trigger) != {'workflow_dispatch'}:
            raise ValueError('publication must be manual only')
        for job in data['jobs'].values():
            if privileged(job) and "vars.RELEASE_PUBLICATION_ENABLED == 'true'" not in job.get('if', ''):
                raise ValueError('publication switch missing')


def check_repository(root):
    directory = Path(root) / '.github/workflows'
    paths = sorted(set(directory.glob('*.yml')) | set(directory.glob('*.yaml')))
    if not {'release-candidate.yml', 'release-publish.yml', 'release-tests.yml'} <= {p.name for p in paths}:
        raise ValueError('candidate, publish and negative-test workflows required')
    for path in paths:
        data = yaml.safe_load(path.read_text())
        authority = any(privileged(dict(job, permissions=job.get('permissions', data.get('permissions', {}))))
                        or environment_name(job) == 'release' or 'uses' in job for job in data.get('jobs', {}).values())
        # Read-only legacy qualification jobs retain their existing style.
        # Every writer/signer or reusable indirection is checked, whatever
        # the filename: a generated release.yml cannot bypass this policy.
        if path.name.startswith('release-') or authority:
            check(data, path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
~~~~

### File: `.github/workflows/release-publish.yml`

~~~~yaml
name: release-publish
run-name: Release inventory ${{ inputs.inventory_sha256 }} from ${{ inputs.tag }}
on:
  workflow_dispatch:
    inputs:
      inventory_sha256:
        description: Frozen candidate inventory SHA-256
        required: true
        type: string
      maintainer_signature:
        description: Armored hardware-backed detached signature over the exact frozen inventory
        required: true
        type: string
      settings_audit_sha256:
        description: SHA-256 of the maintainer local settings audit
        required: true
        type: string
      settings_audit:
        description: Canonical maintainer audit JSON, fresh for this completed candidate
        required: true
        type: string
      source_sha:
        description: Exact qualified source commit
        required: true
        type: string
      tag:
        description: Protected annotated release tag
        required: true
        type: string
      channels:
        description: Approved sorted JSON channel array
        required: true
        type: string
      targets:
        description: Approved sorted JSON target array
        required: true
        type: string
      candidate:
        description: JSON candidate run_id and run_attempt
        required: true
        type: string
      retention_receipt_version:
        description: Exact S3 version of the held retention receipt
        required: true
        type: string
permissions:
  contents: read
  actions: read
concurrency:
  group: release-publish-${{ inputs.tag }}
  cancel-in-progress: false
jobs:
  approval-tuple:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - name: Display exact approval binding for this run attempt
        run: python3 packaging/release/approval_summary.py
  authorize:
    needs: approval-tuple
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag)
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
    outputs:
      run_attempt: ${{ steps.authorized.outputs.run_attempt }}
      inventory_sha256: ${{ steps.authorized.outputs.inventory_sha256 }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      # AWS read access is restricted to held candidate versions; it conveys
      # no registry/release authority. No write token is given to candidate code.
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: authorize-preflight.json
      - name: Publish the validated credential-issuance binding
        id: authorized
        env:
          INVENTORY: ${{ inputs.inventory_sha256 }}
        run: |
          echo "run_attempt=$GITHUB_RUN_ATTEMPT" >> "$GITHUB_OUTPUT"
          echo "inventory_sha256=$INVENTORY" >> "$GITHUB_OUTPUT"
  sign:
    needs: authorize
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256
    environment:
      name: release
      url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      # AWS read access is restricted to held candidate versions; it conveys
      # no registry/release authority. No write token is given to candidate code.
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: sign-preflight.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: boundary
          receipt: sign-boundary.json
      - name: Attest final bytes, including signed inventory and SPDX files
        id: attest
        uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be # v2.4.0
        with:
          subject-path: candidate/*
      - name: Preserve downloadable Sigstore bundle and approval receipts
        run: |
          mkdir signatures
          python3 - <<'PYAPPROVAL'
          import json, os
          from pathlib import Path
          Path('signatures/release-inventory.json.asc').write_text(json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())['inputs']['maintainer_signature'])
          PYAPPROVAL
          cp '${{ steps.attest.outputs.bundle-path }}' signatures/release.sigstore.jsonl
          cp sign-preflight.json sign-boundary.json retention-receipt.json signatures/
          nix develop .#release -c python3 - <<'PY'
          import os,sys
          from pathlib import Path
          sys.path.insert(0,'packaging/release')
          import retention
          retention.audit(Path('signatures/release-inventory.json.asc'), os.environ['RELEASE_AUDIT_BUCKET'], int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
          retention.audit(Path('signatures/release.sigstore.jsonl'), os.environ['RELEASE_AUDIT_BUCKET'], int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
          PY
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: signatures/
  github:
    needs: [sign, authorize]
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256 && vars.RELEASE_GITHUB_ENABLED == 'true'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          path: signatures
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: publish-preflight.json
      - name: Reconcile every existing remote byte before any upload
        env:
          GH_TOKEN: ${{ github.token }}
        run: nix develop .#release -c python3 packaging/release/publish.py reconcile --candidate candidate --signatures signatures --output reconciliation.json
      - name: Obtain short-lived publication authority after preflight
        id: publication-token
        uses: actions/create-github-app-token@67018539274d69449ef7c02e8e71183d1719ab42 # v2.1.4
        with:
          app-id: ${{ vars.RELEASE_PUBLISH_APP_ID }}
          private-key: ${{ secrets.RELEASE_PUBLISH_APP_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: hennery
          permission-contents: write
          permission-actions: read
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: boundary
          receipt: publish-boundary.json
      - name: Publish only verified missing bytes; verify upload responses by fetch/hash
        env:
          GH_TOKEN: ${{ steps.publication-token.outputs.token }}
          RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
        run: nix develop .#release -c python3 packaging/release/publish.py upload --candidate candidate --signatures signatures --output public-path.json
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: always()
        with:
          name: publication-audit-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: |
            publish-preflight.json
            publish-boundary.json
            reconciliation.json
            public-path.json

  # R4: all registry writes use the protected credential, never GITHUB_TOKEN.
  ghcr:
    needs:
      - authorize
      - sign
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256 && vars.RELEASE_GHCR_ENABLED == 'true'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
      GH_TOKEN: ${{ github.token }}
      RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
      RELEASE_GHCR_ENABLED: ${{ vars.RELEASE_GHCR_ENABLED }}
      INVENTORY_SHA256: ${{ inputs.inventory_sha256 }}
      RELEASE_CANDIDATE: candidate
      IMAGE_CANDIDATE: image-candidate
    permissions:
      contents: read
      actions: read
      packages: read
    outputs:
      index-digest: ${{ steps.image.outputs.digest }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: ghcr
          phase: preflight
          receipt: ghcr-publish-preflight.json
      - name: Install image transport
        run: |
          sudo apt-get update
          sudo apt-get install -y skopeo
      - name: Authenticate only the protected environment GHCR credential
        env:
          GHCR_TOKEN: ${{ secrets.GHCR_PUBLISH_TOKEN }}
          GHCR_USER: ${{ vars.GHCR_PUBLISH_USER }}
        run: |
          sh packaging/ghcr-gate.sh preflight "ghcr-publish-login.json"
          test -n "$GHCR_TOKEN"
          test -n "$GHCR_USER"
          export DOCKER_CONFIG="$RUNNER_TEMP/ghcr-registry"
          mkdir -p "$DOCKER_CONFIG"
          printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username "$GHCR_USER" --password-stdin
          echo "DOCKER_CONFIG=$DOCKER_CONFIG" >> "$GITHUB_ENV"
          echo "REGISTRY_AUTH_FILE=$DOCKER_CONFIG/config.json" >> "$GITHUB_ENV"
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: ghcr
          phase: boundary
          receipt: ghcr-publish-boundary.json
      - name: Publish only signed retained OCI bytes
        id: image
        run: |
          version=$(python3 -c 'import json; print(json.load(open("image-candidate/verified.json"))["version"])')
          digest=$(cat image-candidate/index-digest.txt)
          sh packaging/ghcr-publish.sh image-candidate/layout "$version" "$digest"
          echo "digest=$digest" >> "$GITHUB_OUTPUT"
      - name: Remove registry credential
        if: always()
        run: rm -f "$RUNNER_TEMP/ghcr-registry/config.json"
  ghcr-attest:
    needs:
      - authorize
      - ghcr
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256 && vars.RELEASE_GHCR_ENABLED == 'true'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        subject:
          - amd64
          - arm64
          - index
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
      GH_TOKEN: ${{ github.token }}
      RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
      RELEASE_GHCR_ENABLED: ${{ vars.RELEASE_GHCR_ENABLED }}
      INVENTORY_SHA256: ${{ inputs.inventory_sha256 }}
      RELEASE_CANDIDATE: candidate
      IMAGE_CANDIDATE: image-candidate
      SUBJECT: ${{ matrix.subject }}
      RELEASE_TAG: ${{ inputs.tag }}
    permissions:
      contents: read
      actions: read
      packages: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: ghcr
          phase: preflight
          receipt: ghcr-${{ matrix.subject }}-preflight.json
      - name: Authenticate only the protected environment GHCR credential
        env:
          GHCR_TOKEN: ${{ secrets.GHCR_PUBLISH_TOKEN }}
          GHCR_USER: ${{ vars.GHCR_PUBLISH_USER }}
        run: |
          sh packaging/ghcr-gate.sh preflight "ghcr-$SUBJECT-login.json"
          test -n "$GHCR_TOKEN"
          test -n "$GHCR_USER"
          export DOCKER_CONFIG="$RUNNER_TEMP/ghcr-registry"
          mkdir -p "$DOCKER_CONFIG"
          printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username "$GHCR_USER" --password-stdin
          echo "DOCKER_CONFIG=$DOCKER_CONFIG" >> "$GITHUB_ENV"
          echo "REGISTRY_AUTH_FILE=$DOCKER_CONFIG/config.json" >> "$GITHUB_ENV"
      - name: Extract signed retained signing inputs
        id: subject
        run: python3 packaging/image-signing-inputs.py image-candidate/layout "$SUBJECT" signing-inputs >> "$GITHUB_OUTPUT"
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: ghcr
          phase: boundary
          receipt: ghcr-${{ matrix.subject }}-boundary.json
      - name: Revalidate signed inventory immediately before provenance
        run: sh packaging/ghcr-gate.sh boundary "ghcr-$SUBJECT-provenance-boundary.json"
      - name: Attest retained provenance
        id: provenance
        uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be # v2.4.0
        with:
          subject-name: ghcr.io/marcinwadon/hennery
          subject-digest: ${{ steps.subject.outputs.digest }}
          push-to-registry: true
      - name: Preserve provenance bundle
        env:
          BUNDLE: ${{ steps.provenance.outputs.bundle-path }}
        run: |
          mkdir -p attestation-bundles
          cp "$BUNDLE" "attestation-bundles/ghcr-$SUBJECT-provenance.json"
      - name: Revalidate signed inventory immediately before image-sbom
        run: sh packaging/ghcr-gate.sh boundary "ghcr-$SUBJECT-image-sbom-boundary.json"
      - name: Attest retained image-sbom
        id: image-sbom
        uses: actions/attest-sbom@bd218ad0dbcb3e146bd073d1d9c6d78e08aa8a0b # v2.2.0
        with:
          subject-name: ghcr.io/marcinwadon/hennery
          subject-digest: ${{ steps.subject.outputs.digest }}
          push-to-registry: true
          sbom-path: signing-inputs/image.spdx.json
        if: matrix.subject != 'index'
      - name: Preserve image-sbom bundle
        env:
          BUNDLE: ${{ steps.image-sbom.outputs.bundle-path }}
        run: |
          mkdir -p attestation-bundles
          cp "$BUNDLE" "attestation-bundles/ghcr-$SUBJECT-image-sbom.json"
        if: matrix.subject != 'index'
      - name: Revalidate signed inventory immediately before binary-sbom
        run: sh packaging/ghcr-gate.sh boundary "ghcr-$SUBJECT-binary-sbom-boundary.json"
      - name: Attest retained binary-sbom
        id: binary-sbom
        uses: actions/attest-sbom@bd218ad0dbcb3e146bd073d1d9c6d78e08aa8a0b # v2.2.0
        with:
          subject-name: ghcr.io/marcinwadon/hennery
          subject-digest: ${{ steps.subject.outputs.digest }}
          push-to-registry: true
          sbom-path: signing-inputs/binary.spdx.json
        if: matrix.subject != 'index'
      - name: Preserve binary-sbom bundle
        env:
          BUNDLE: ${{ steps.binary-sbom.outputs.bundle-path }}
        run: |
          mkdir -p attestation-bundles
          cp "$BUNDLE" "attestation-bundles/ghcr-$SUBJECT-binary-sbom.json"
        if: matrix.subject != 'index'
      - name: Verify hardware approval and exact-tag Sigstore identity for every OCI predicate
        env:
          DIGEST: ${{ steps.subject.outputs.digest }}
        run: |
          nix develop .#release -c python3 packaging/release/verify.py --image "ghcr.io/marcinwadon/hennery@$DIGEST" \
            --inventory-directory candidate --approval-signature image-candidate/release-inventory.json.asc --tag "$RELEASE_TAG" \
            --bundle "attestation-bundles/ghcr-$SUBJECT-provenance.json"
          if [ "$SUBJECT" != index ]; then
              for kind in image-sbom binary-sbom; do
                  nix develop .#release -c python3 packaging/release/verify.py --image "ghcr.io/marcinwadon/hennery@$DIGEST"         \
                    --inventory-directory candidate --approval-signature image-candidate/release-inventory.json.asc --tag "$RELEASE_TAG" \
                    --predicate-type https://spdx.dev/Document --bundle "attestation-bundles/ghcr-$SUBJECT-$kind.json"
              done
          fi
      - name: Hold verification bundles with the publishing attempt
        run: |
          nix develop .#release -c python3 - <<'PYHOLD'
          import os,sys
          from pathlib import Path
          sys.path.insert(0,'packaging/release')
          import retention
          for path in sorted(Path('attestation-bundles').glob('*.json')):
              retention.audit(path,os.environ['RELEASE_AUDIT_BUCKET'],int(os.environ['GITHUB_RUN_ID']),int(os.environ['GITHUB_RUN_ATTEMPT']))
          PYHOLD
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: ghcr-attestations-${{ matrix.subject }}-${{ github.run_id }}-${{ github.run_attempt }}
          path: attestation-bundles/
          retention-days: 90
          if-no-files-found: error
      - name: Remove registry credential
        if: always()
        run: rm -f "$RUNNER_TEMP/ghcr-registry/config.json"
  ghcr-complete:
    needs:
      - authorize
      - ghcr
      - ghcr-attest
    if: always() && contains(fromJSON(inputs.channels), 'ghcr')
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    permissions:
      contents: read
      actions: read
    outputs:
      index-digest: ${{ steps.receipt.outputs.digest }}
    steps:
      - name: Require all GHCR writes and verification in this authorized attempt
        id: receipt
        env:
          AUTH_RESULT: ${{ needs.authorize.result }}
          PUBLISH_RESULT: ${{ needs.ghcr.result }}
          ATTEST_RESULT: ${{ needs.ghcr-attest.result }}
          AUTH_ATTEMPT: ${{ needs.authorize.outputs.run_attempt }}
          AUTH_INVENTORY: ${{ needs.authorize.outputs.inventory_sha256 }}
          INVENTORY_SHA256: ${{ inputs.inventory_sha256 }}
          DIGEST: ${{ needs.ghcr.outputs.index-digest }}
        run: |
          test "$AUTH_RESULT" = success
          test "$PUBLISH_RESULT" = success
          test "$ATTEST_RESULT" = success
          test "$AUTH_ATTEMPT" = "$GITHUB_RUN_ATTEMPT"
          test "$AUTH_INVENTORY" = "$INVENTORY_SHA256"
          printf '%s\n' "$DIGEST" | grep -Eq '^sha256:[0-9a-f]{64}$'
          echo "digest=$DIGEST" >> "$GITHUB_OUTPUT"
~~~~

### File: `packaging/images.md`

~~~~markdown
# Collector images (R4)

No GHCR image has been published by this work. The intended package is
`ghcr.io/marcinwadon/hennery`, for `linux/amd64` and `linux/arm64`.
R1 is merged at `191aa71b`. Publication remains disabled pending independent
review, platform qualification and maintainer approval for this channel. A merged workflow is not approval.

## What runs here

The image runs `hennery collector`, including its embedded web UI. It copies
the release's musl executable unchanged into digest-pinned distroless static,
with CA roots and user/group **65532:65532**. It contains neither a shell nor
Node, adapters, agent CLIs, credentials or repositories.

Pair separate hennery hosts running beside the repositories. Although the
executable also contains host subcommands, this is not a supported agent-host
image. The managed Node/agent runtime requires **glibc >= 2.28** and Linux
kernel >= 4.18 (and the pinned agents may require more). Distroless **static**
has no glibc loader; a static collector running here does not qualify managed
agents here or on Alpine. Installing glibc/Node/agents in a custom derivative
would require separate qualification and changes this image's contents and
supply-chain record.

## Deployment and storage

Use an independently trusted checkout of R1's [shared verifier](release/verify.py),
with the complete frozen candidate directory, the external
`release-inventory.json.asc` and exact release tag. It requires the pinned
maintainer's hardware-backed signature over the global inventory before checking
Sigstore. The inventory hashes `ghcr-index.json`, which lists the exact index
and both platform digests. An exact-tag Sigstore certificate alone is insufficient.
The verifier rejects missing/wrong inventory signatures and unlisted subjects.
Follow the [trusted bootstrap and release process](../docs/release-process.md);
a verifier or public key downloaded from an unverified release is not a trust root.

Verify the index **and** selected platform manifest and its image/base and binary
SPDX attestations. The exact certificate identity is
`https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<exact-release-tag>`,
with GitHub's OIDC issuer and matching source ref. R1's verifier supports the
SLSA provenance and SPDX predicates and requires `--inventory-directory` and
`--approval-signature` for every OCI subject. Keep the `.asc` and Sigstore
bundles outside the immutable candidate directory. BuildKit's embedded provenance
is unsigned build metadata; the protected signing jobs add authenticated provenance.
Preserve the public approval and verification bundles with the release record.

Set your deployment's image to `ghcr.io/marcinwadon/hennery@sha256:<verified-index>`;
the angle-bracket value is a placeholder, not an existing release digest.
Use a release's immutable version tag only when selecting the digest. A base
image security rebuild gets a new immutable revision/version and provenance;
never overwrite an existing version tag. R4 deliberately creates no `latest`
or minor aliases. R1 may advance those only for stable releases, after all
enabled channels and both architectures and their attestations are healthy.
Prereleases never advance moving aliases.

Publish the collector port on loopback, for example Docker's
`-p 127.0.0.1:8080:8080`, behind a TLS reverse proxy with the intended
`HENNERY_PUBLIC_URL`. Persist `/var/lib/hennery` on **local storage** (SQLite
locking rules exclude network filesystems). A newly created Docker named
volume inherits the image's UID/GID and mode **0700**. A bind mount retains its
host owner and permissions: prepare it for **65532:65532, 0700** before start.
Never mount an agent home into the collector. Protect backups as credentials.

Change the listening address/port with `HENNERY_LISTEN`, keeping the container
port mapping in sync. The image's healthcheck reads that environment variable;
changing only a command-line `--listen` would break the healthcheck.
Read setup using `docker exec <container> hennery admin setup-url`; avoid
allocating a TTY or obtaining setup credentials through logs. The admin socket
is local to the data volume. Pair hosts using the normal collector setup.

For an upgrade, record the running digest, stop the collector and make a
consistent backup of the **entire** local volume (database/WAL, configuration,
keys and attachments). Start the new verified digest on that volume, then
check health and load the UI before resuming use. Retain the previous digest
and its matching pre-upgrade backup. A schema upgrade is not necessarily
backward compatible: rollback means restoring that backup with its matching
old digest, with the associated loss of writes since the backup. Do not put
an older executable against an upgraded database without explicit support.

## Candidate and approval contract

R1's actual `release-candidate.yml` builds each native image beside its fresh
Linux archive. It supplies that target's musl executable, reviewed notices and
binary SPDX from R1's release materials. The builder uses the `release` target,
pinned BuildKit/scanner/bases, native amd64/arm64 runners and no restored cache.
It names local exports so BuildKit supplies manifest-bound attestation subjects.
It verifies executable bytes, labels, legal files and SBOM/provenance, extracts
signing inputs, then tests the retained digest through a loopback registry.
Smoke covers health, private writable storage, actual process UID and embedded UI.

When `ghcr` is in the candidate channel set, R1 assembles and round-trips the
index before freezing the complete flat root. `ghcr-candidate.py` produces:

- `ghcr-oci-layout.tar`, containing the exact platform/index/BuildKit attestation
  blobs; no reconstruction is permitted after approval;
- `ghcr-index.json`, a schema-1 descriptor containing the index `digest`,
  `platforms.amd64` and `platforms.arm64` manifest digests, source SHA and version.

The global inventory hashes both files and records exact executable hashes in
`binaries[target]`. The image payload must match those approved archive binaries.
Notices/SPDX cover Rust, vendored OpenSSL/SQLite and embedded frontend; R1's
corresponding-source/licence/advisory review remains mandatory. Image scanner
SBOMs additionally cover the base filesystem. Binary SPDX is embedded and signed
separately because filesystem scanning cannot discover all static/frontend code.

PR/main `build.yml` also qualifies real release-target OCI output using explicitly
marked CI notices/SPDX fixtures, signing-input extraction and loopback acceptance.
Those fixture images are never promoted to release candidates. Real Docker
acceptance is CI proof; transport/process doubles are offline contract tests.

### Publication boundary

The only orchestrator is R1's manual, exact signed-tag `release-publish.yml`.
There is no alternate reusable R4 publisher or provisional approval-ID adapter.
The shared interface is `packaging/release-gate ghcr`, in **`release`**, with
the complete held candidate, approved global inventory SHA-256, explicit
`preflight`/`boundary` phase and a new receipt outside the candidate. R1 checks
live environment review, signed inventory/tag, settings audit, exact-SHA checks,
retention and candidate/publishing run attempts. Its audit is maintainer-local;
publishers receive no administration credential. See the [R1 contract](release/README.md).

`ghcr` and `ghcr-attest` depend directly on protected read-only `authorize` and
match its inventory and current attempt. In-job preflight precedes registry
authentication; every upload and provenance/SPDX signing operation gets fresh
boundary validation. Receipt names include the matrix subject, avoiding held
storage collisions. `ghcr-gate.sh` calls the real gate, then reuses R1's pinned-key
inventory verifier and checks both OCI platform/index digests and executable
identity. OCI is materialized outside the held root; changed working bytes or
metadata refuse. The publisher accepts only that verified layout path.

Both registry-writing jobs authenticate with **`GHCR_PUBLISH_TOKEN`**, a secret
held only in `release`, and `GHCR_PUBLISH_USER`, its environment variable.
The ordinary job token requests `packages: read`; the package's Actions access
must independently be **READ**, with inherited write/admin access disabled.
GitHub's attestation API uses the ordinary token with protected OIDC/attestation
permissions; registry pushes use the separately logged-in credential. The pinned
[action implementation](https://github.com/actions/attest/blob/ce27ba3b4a9a139d9a20a4a07d69fabb52f1e5bc/src/attest.ts)
obtains registry credentials separately from its GitHub API token. Credential
kind/capability must be qualified by the maintainer; no App/fine-grained registry
support is assumed. No fallback to `GITHUB_TOKEN` is present.

After signing, each platform/index provenance and both platform SPDX bundles are
checked with R1's shared hardware-inventory-plus-Sigstore verifier. Bundles and
gate receipts are held under that publishing attempt. The final read-only
completion check refuses skipped/failed jobs, stale inventory/attempts and an
invalid digest. Rerunning failed jobs requires renewed whole-attempt approval.
Both `RELEASE_PUBLICATION_ENABLED` and `RELEASE_GHCR_ENABLED` remain disabled
until maintainer setup and review. First alpha releases are GitHub only; GHCR
requires a separately approved stable channel set.

Recovery reads and hashes the immutable remote version. Equal bytes may skip
upload; only authenticated HTTP 404 plus structured absence permits copying
retained bytes. Auth/network/ambiguous errors or differing digests stop. Lost
responses require reconciliation on a newly approved attempt. No mutable aliases,
rebuild, changed approval signature or replacement release bytes are permitted.

## Maintainer-only setup and release steps

1. Approve the exact **namespace/package** `ghcr.io/marcinwadon/hennery` and
   its creation under the personal account, and link it to this repository.
   The source OCI label is present; verify the actual package linkage.
2. Set and verify **visibility** explicitly. Confirm anonymous pull of the
   intended public package only after the approved initial publication;
   initial GHCR package visibility must not be assumed to be public.
3. Choose **retention**: keep version/index/platform/attestation digests and
   verification bundles needed for rollback, exclude them from automatic
   deletion, and retain candidates durably until all approved channels finish.
   Decide the base-image security rebuild/purge policy. No cleanup job is added.
4. Set package **Manage Actions access to READ**, disabling inherited write/admin.
   Qualify R1's explicitly authorized negative branch push and dedicated
   credential capability before enablement; offline tests do not prove platform
   enforcement. Store `GHCR_PUBLISH_TOKEN` only in `release` and configure
   `GHCR_PUBLISH_USER` there. Signing needs protected `id-token: write` and
   `attestations: write`, while the ordinary package token remains READ.
5. Complete R1's protected **release** environment, immutable signed-tag rules,
   hardware-touch signing setup, independently confirmed public-key bootstrap,
   settings audit and held-storage policy. Approve the exact canonical global
   inventory with the YubiKey and provide the public detached signature through
   the dispatch. Exercise actual missing/rejected/stale approvals, wrong/missing
   signatures, inventory/source/tag/target changes and package permission refusals.
6. Independently review this integration and native Linux acceptance, then
   explicitly qualify `RELEASE_PUBLICATION_ENABLED` and `RELEASE_GHCR_ENABLED`
   for an approved stable channel set. Merging/enabling/tagging is not publication
   consent. Renew audit/attempt approval for retries and never replace held bytes.
7. After authorized upload and keyless attestations, independently pull by
   index digest, verify each platform and SBOM/provenance identity, check the
   non-root health/UI/volume behavior, record the index digest in release notes,
   and only then consider stable aliases/announcements through R1.

Generated with Claude AI — please review before distribution.
~~~~

### File: `packaging/README.md`

~~~~markdown
# Release builds

What a hennery release would ship is built by the `build` workflow
(`.github/workflows/build.yml`) on every pull request and every push to
`main` (distribution spec §2, plan 7a). It is checked, then kept as workflow
artifacts for a week. **Nothing is published:** there are no releases yet.

R1 adds separate, disabled-by-default candidate and publication workflows.
They rebuild at the approved tag, add notices/SBOM/source, retain exact candidate
versions, and bind protected-environment approval to inventory/run attempts.
The [release process](../docs/release-process.md) lists maintainer setup and the
[shared gate interface](release/README.md) is the R3/R4 integration contract.
The original `build` workflow remains a qualification probe; its artifacts are
never promoted to a release.

| Artifact | Built by | Checked by |
|---|---|---|
| `hennery-x86_64-unknown-linux-musl.tar.xz`, `hennery-aarch64-unknown-linux-musl.tar.xz` | `dist build`, natively on each architecture, with `musl-gcc` | `check-archive.sh` (the binary, its licence and README, nothing else); `check-linkage.sh` (no shared library, no loader); runs on the runner and on Alpine |
| `hennery-aarch64-apple-darwin.tar.xz` | `dist build` on macOS arm64 | `check-archive.sh`; `check-linkage.sh` (system libraries only); runs |
| `hennery-installer.sh` | `dist build --artifacts=global`, then `harden-installer.py` | `test-installer.sh`, on Linux x86_64 and on macOS |
| `hennery.rb` (Homebrew formula) | `dist build --artifacts=global` | `check-formula.sh` |
| `sha256.sum` | `dist build --artifacts=global` | — |
| CI collector images and a two-platform OCI index | native BuildKit of `Dockerfile --target release` on staged musl binaries with marked CI fixture notices/SPDX; preserves SBOM/provenance metadata | OCI payload verification, signing-input extraction, then retained-digest loopback round-trip and `smoke-image.sh` |

[R4's collector-image guide](images.md) describes the release target, labels,
reviewed notices and binary/image SBOMs, native OCI candidates, gated GHCR
publication, digest deployment, volume upgrades and maintainer-only setup.
Its R1 adapter integration remains mandatory and publication is disabled.
PR/main images are never promoted to releases.

Every archive builds with the `vendored-openssl` feature
(`dist-workspace.toml`). OpenSSL, which `webauthn-rs-core` links, is then
compiled in from source. Without it, the macOS binary would load Homebrew's
`libssl` and fail on a Mac without it, and a static musl build would not
link at all (distribution §1.1). Development and `ci.yml` use the system
OpenSSL.

Third-party actions are pinned by commit, every image by its multi-arch
digest, and cargo-dist by the SHA-256 in `install-dist.sh`.

## OpenSSL

The release binaries carry their own OpenSSL: 3.6.3, from `openssl-src`
300.6.1+3.6.3 in `Cargo.lock`. Updating the system's OpenSSL does not
reach them. An OpenSSL fix reaches users only when `openssl-src` is bumped
in `Cargo.lock` and a new release is made. `webauthn-rs` passes what a
browser sends (attestation and assertion data) through it, so OpenSSL's
advisories are this project's to follow.

OpenSSL 3.6 is not a long-term-support line. Check its end of support
against openssl.org's release strategy before the first release, and move
to a supported line if it ends first.

## Locally

The dev shell's toolchain links Nix's `libiconv` on macOS, so a local
release build is for trying out, not for handing on; `check-linkage.sh` says
so. Linux archives and the image are built in CI only.

```sh
nix develop -c cargo build --profile dist -p hennery --features vendored-openssl
sh packaging/check-linkage.sh target/dist/hennery
```

## Pin bumps

A bump of `adapters/pins.toml` is `hennery-pins lock`, then `generate`,
then the pin-bump job (`.github/workflows/pins.yml`). These checks are
live, with logged-in agents, and the operator's to run before it merges:

- the live e2e gate (umbrella spec §14) on every platform;
- **Codex's `thread/delete` still removes everything** (plan 9d
  decision 14). After a turn in a scratch `CODEX_HOME`, delete the session
  from hennery and check that nothing of the thread is left: its rollout
  files in `sessions/` and `archived_sessions/`, its rows in
  `thread_history_1.sqlite` (`thread_items`, `thread_turns`,
  `thread_realtime_items`), its rows in the state DB (`state_5.sqlite`),
  and its entries in `session_index.jsonl`. hennery itself only checks the
  rollout files: the rest is `thread/delete`'s contract. If the bundled
  Codex version changed, read `thread/delete`'s call shape from its source
  first and update `[codex_app_server]` in `pins.toml`.
- **What the host reads from Codex is still what it says** (the 9d-ii
  review). Re-read, in the bumped version's source and against a live run
  in a scratch `CODEX_HOME`:
  - the refusal texts `classify_delete` matches (`forked history still
    references it`, `thread is not persisted`, `live internal threads`,
    `no rollout found for thread id`, `thread not found:`, and the
    `Invalid request: unknown variant` / `missing field` / `invalid type`
    prefixes);
  - the `codexHome` field of `initialize`'s answer, canonical;
  - `--version`'s `codex-cli X.Y.Z` line.

## Publishing is the operator's

These need the operator's decision, credentials, or both. None is set up:

- **GitHub Releases.** `dist generate` writes a `release.yml` that builds the
  same archives and creates a release on every version tag. It is not
  committed (`allow-dirty = ["ci"]` in `dist-workspace.toml`). Any generated
  replacement for R1's explicit gated workflows must:
  - keep this workflow's checks: `check-archive.sh`, `check-linkage.sh`,
    `test-installer.sh`, `check-formula.sh`;
  - run `harden-installer.py` before the installer is uploaded, and before
    it is attested;
  - pin every action by commit;
  - restore no Actions cache (no `rust-cache`), since anything a `main`
    workflow runs can write one;
  - build with a pinned toolchain (`rust-toolchain.toml`).

  The `build` workflow's artifacts are never promoted to a release: a pull
  request's are built from code nobody has reviewed yet.
- **Artifact attestations** (`github-attestations = true`): protected release-tag
  jobs need OIDC/attestation authority and write to the public Sigstore log.
  Neither repository-only nor exact-tag Sigstore verification authorizes a
  release by itself. The common verifier first requires the detached
  `release-inventory.json.asc` from the pinned hardware-backed maintainer key
  over the exact inventory digest set. Its trusted public key comes from the
  reviewed verifier, not a downloaded replacement. The common
  [verifier](release/verify.py) pins the exact certificate identity to
  `marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<release-tag>`
  and rejects branch signers. The [guarded README bootstrap](../README.md#verify-a-release-installer-before-running-it)
  authenticates the inventory using a full fingerprint checked through main,
  the maintainer's account keys and keys.openpgp.org, then checks the installer
  SHA-256 before executing it. No release-supplied verifier or key is its trust anchor;
  its archive verifier requires both the maintainer-approved digest and this identity. Native binstall signature
  support needs a reviewed bridge; no unverified strategy is an accepted path.
- **The Homebrew tap** (`marcinwadon/homebrew-tap`): the repository and a
  token allowed to push to it.
- **The image on GHCR:** a dedicated credential held only in `release`, with
  this repository's package Actions access READ, one multi-arch manifest from
  the per-architecture images, and its provenance attestation. Complete
  [R4's maintainer setup and R1 gate integration](images.md) before enabling
  publication. Namespace, public visibility, retention and permissions remain
  maintainer-only. Publish the port on loopback behind a TLS proxy
  (`-p 127.0.0.1:8080:8080`); read the setup link with
  `docker exec … hennery admin setup-url`, not from `docker logs` (with
  `docker run -t` the link itself is logged); a bind mount keeps the host's
  owner, so it must belong to 65532; change the port with `HENNERY_LISTEN`,
  not `--listen` on the command, because the `HEALTHCHECK` reads
  `HENNERY_LISTEN`.
- **Third-party licence notices:** the archives carry only hennery's
  `LICENSE` in the original `build` probe; the CI image includes it too. R1's candidates
  generate target-specific notices, SPDX and corresponding-source bundles;
  their immutable supplemental licence texts need maintainer review. R4's
  release target requires reviewed notices and a binary SPDX document. Before
  the first release, review the
  notices for the Rust crates and the vendored OpenSSL (Apache-2.0), e.g.
  with `cargo-about`; ship them in each archive and in the image; and
  update `check-archive.sh`'s exact list. R4 permits only staged distribution
  inputs and `LICENSE` through `.dockerignore`.
- **Dependency updates** (Dependabot, or another bot): for `openssl-src`
  above all, the pinned actions and the image digests. It opens pull
  requests on its own schedule, so it is the operator's to switch on.
- **Fork pull requests:** require approval before their workflows run.

---

_Generated with Claude AI — please review before distribution._
~~~~

### File: `docs/README.md`

~~~~markdown
# hennery design documents

Status: the walking skeleton is implemented (Rust workspace, end-to-end host ↔ collector
slice); everything else is design. The maintainer's decisions are recorded below.

## Reading order

1. [Architecture (umbrella spec)](specs/2026-09-25-hennery-architecture-design.md)
   — product, topology, protocol principles, sessions, auth, hats, module
   boundaries, testing. Authoritative where subsystem specs disagree.
2. Subsystem specs:
   - [ACP core](specs/2026-09-26-acp-core-design.md) — host, adapters,
     host↔collector protocol, session state machine, storage, session API.
   - [Kernel](specs/2026-09-26-kernel-design.md) — storage, config, operator
     auth, pairing, hats, push, HTTP security.
   - [MCP gateway](specs/2026-09-26-mcp-gateway-design.md) — connections,
     OAuth, per-session tokens, streaming proxy, renderers.
   - [Delegation](specs/2026-10-14-delegation-design.md) — proposed opt-in parent/child sessions, shared session-bound MCP delivery for optional plug-ins, durable reports/questions, operator fallback and family UI; two operator questions remain.
   - [Optional memory plug-in](specs/2026-10-14-memory-design.md) — proposed generic opt-in activity/startup contract, separate reference service, scoped vault import and purge; scope amendment dated 2026-10-14.
   - [Client view](specs/2026-10-02-client-view-design.md) — the display fold
     on the collector (`hennery-view`), the view API every client uses, and the
     web UI reused from the predecessor frontend.
   - [Frontend](specs/2026-09-26-frontend-design.md) — views, data layer,
     transcript fold rules, cards, PWA.
   - [Phone, Web Push and PWA](specs/2026-10-14-phone-design.md) — proposed browser push/device controls, installed app shell, question deep links, mobile answers and iOS acceptance.
   - [Distribution](specs/2026-09-26-distribution-design.md) — binary,
     managed runtime and adapter manifest, release pipeline, services, doctor.
   - [Distribution and releases](specs/2026-10-15-distribution-release-design.md) — proposed publication contract, crates.io with packaged UI, platform qualification, channel rollout and maintainer-only setup; six operator questions remain.
   - [Remote hosts over WSS](specs/2026-10-14-wss-design.md) — approved design per the fleet parent, including the three re-confirmed amendments; verified TLS/private-CA trust, tunnel migration and reconnect/doctor parity are W1; reverse-proxy attribution/public deployment remain W2.
3. Evidence:
   - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
     and its [harness](../spikes/2026-09-25-mcp-per-session/).
4. Plans:
   - [Walking skeleton](plans/2026-09-26-walking-skeleton.md) — the first
     implementation plan (9 tasks) — executed 2026-09-27; its "Execution status" section
     lists where the built code deviates from the task text.
   - [Teardown and reconciliation](plans/2026-09-27-teardown-and-reconciliation.md) —
     plan A of the resume work (9 tasks): adapter supervisor and exit watcher, park/close,
     idle reaper, conflict events and reconciliation after reconnect. Executed 2026-09-27 (see its
     "Execution status").
   - [Resume (B1)](plans/2026-09-28-resume.md) — plan B1 (10 tasks): `resume_session` with
     `session/load` and replay suppression, presumed park while a host is offline, conn_id-keyed
     waiters, one visibility rule for unapplied facts. Executed 2026-09-29 (see its "Execution status").
   - [Cancel and capabilities (B2a)](plans/2026-09-29-cancel-capabilities.md) — `cancel_turn`,
     `hello.capabilities` with the park gate, and B1's two carry-overs. Executed 2026-09-29 (see its "Execution status").
   - [Session config (B2b)](plans/2026-09-30-session-config.md) — model, axes and mode on start
     and resume, `set_config`, the session catalogue, and B2a's two folds. Executed 2026-09-30 (see its "Execution status").
   - [Permission and elicitation](plans/2026-10-01-permissions.md) — plan (2) (7 tasks): the
     pending set and answer queue, teardown hooks, answer endpoint. Executed 2026-10-01 (see its "Execution status").
   - [Host pairing (3a)](plans/2026-10-01-host-pairing.md) — the first part of plan (3) (7 tasks):
     pairing codes and enrollment, `hennery host join`, the Ed25519 `hello` proof, `up` pairing its
     own host, and host revoke. Operator auth (3b) and passkeys (3c) follow. Reviewed and amended
     2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [Operator auth (3b-i)](plans/2026-10-02-operator-auth.md) — the first part of plan 3b (7 tasks):
     the setup link, the owner's password and `public_url`, login and sessions behind the cookie, the
     `Origin` rules, step-up, and the development bearer removed. Listeners, `config.toml` and the admin
     socket (3b-ii), then `owner_id` everywhere (3b-iii), follow. Amended after the security review of
     2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Operator auth (3b-ii)](plans/2026-10-03-operator-auth-2.md) — the second part of plan 3b (7 tasks):
     several listeners and the health checks, `config.toml`, the admin socket with `hennery admin`
     (setup link, password and `public_url` resets, hosts, pairing codes), and agents no longer
     inheriting stray descriptors. `owner_id` everywhere (3b-iii) and passkeys (3c) follow. Amended after
     the security review of 2026-10-03; executed 2026-10-01 as PRs #14 and #15 (see its "Execution status").
   - [`owner_id` everywhere (3b-iii)](plans/2026-10-04-owner-id.md) — the third part of plan 3b (5 tasks): the owner from the first start, so `up`'s host paired before setup has one; `owner_id` on the older tables; every query of the operator, host registry and sessions store naming it, with a test that reads every statement. Amended after the security review of 2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [Passkeys (3c)](plans/2026-10-05-passkeys.md) — plan 3c (6 tasks): `webauthn-rs` with the relying party from `public_url`, the `passkeys` table, ceremonies in memory, registration from a stepped-up session, login and step-up by passkey with the counter checked, and `admin reset-public-url` removing the passkeys of a host name it leaves. `admin reset-password` removes every passkey. The API only; the frontend is plan 4's. Amended after the security review of 2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [The web shell (4b)](plans/2026-10-16-web-shell.md) — part 4b of plan 4, the frontend (7 tasks): `web/` (React 19, strict TypeScript, Vite, Tailwind v4, Vitest) imported with the shell's look, icons and hooks; `GET /api/capabilities` (`{mode, features[]}`); a typed transport client (401 to sign-in with a same-origin `?next=`, one step-up and one retry, plain 409 messages, SSE over `fetch` with `Last-Event-ID`); the router, the rail and the mobile tab bar, setup with the token out of the address bar at once, passkey-first sign-in and step-up; the binary embedding the build by a build script (a placeholder without it, `HENNERY_WEB_REQUIRE=1` refusing that), served as the router's fallback but never for `/api` or `/mcp/…`, under the CSP, with no inline script; Playwright in Chromium against the binary; CI and the release archives checking the UI is embedded. The capabilities name `mcp_connections`, as plan 8a merged first. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [The session list and the read-only transcript (4c-i)](plans/2026-10-18-web-sessions.md) — part 4c-i of plan 4, the frontend (5 tasks), in `web/` only: a typed view client over 4a-ii's view API; the SSE helper's deferred fixes (a throwing handler never loses its event, one abort listener, `closed` at once, bodies cancelled); an item store per session (upsert by id and version, groups by opaque `turn_id`, older pages by `before_turn`, a resync that replaces the store and reopens, backed off when it repeats) and a list store fed by `session_upsert`, `session_removed` and `waiting_changed`, refetching on no event. The session list: day buckets across DST that move on with the clock, rows by lifecycle and activity, "Waiting on a question", the server's waiting count in the badge and the tab title (kept through a refused search), search on the server, Hide closed, the hat switch. The read-only session view: the header from the list or the detail, every item kind and all 18 markers, Markdown with raw HTML as text and no remote image, an error boundary per item, a tail window of 200 items measured in Chromium; a session's link (a push notification's) opens it beside the list. A guard on the tests' text locators. Amended after the security review of 2026-10-02, its re-confirmation of 2026-10-03, the task reviews and the whole-branch review; executed 2026-10-03 (see its "Execution status").
   - [The composer, cards, New Session and the session menu (4c-ii)](plans/2026-10-18-web-sessions.md) — part 4c-ii of plan 4, the frontend (Tasks 6–10 of the same plan), in `web/` only: a composer under each transcript (Ctrl/Cmd+Enter, images by paste, drop or pick with `[Image #N]` markers, a slash menu, the config bar taken back on a refusal, Cancel with the turn's real outcome, every prompt refusal in words, drafts per session and forgotten at sign-out, "Send again" refilling the draft); question cards (permissions by option kind, digits only from a focused card on a desktop and never stealing typing, forms with pairing, every delivery state, a verdict that never goes back, "Answer as a new message" as a draft); New Session (hosts, agents behind one function, the project picker, the hat preview, the first prompt as its own request); footers by lifecycle with every resume refusal in words and the header menu (park, close, delete behind a confirmation and step-up); "delivers when the host reconnects" following the host from what the view streams. Playwright starts a session on a host paired with the page's command, answers a permission, crashes the host and resumes, at two widths; CI builds the fake agent. Amended after its security review and re-confirmation of 2026-10-03, the task reviews, the whole-branch review and the review of its fixes; executed 2026-10-03 (see its "Execution status").
   - [The PWA and device Settings (P1)](plans/2026-10-26-phone-pwa.md) — four tasks: manifest/icons, digest-verified static-only worker, natural updates, fenced push lifecycle and minimum device Settings/mobile sign-out. Five review fixes independently CONFIRMED; CI 15/15 at `88ac41e2`. Rebased onto D1 `37fc7488`: both generator checks and full web/browser gate exit 0 (1,784 web tests; PWA 5 passed; Chromium 86 passed / 11 existing skips). Fresh tree replay: 64 blocks/eight matching trees. Earlier full replay: 2,148 Rust tests and 144 BITE probes. Draft #142 remains parent-managed; new-head CI/status and deployment approval remain with the parent. P2 owns click/deep-link/mobile-answer/relay and live iOS/vendor acceptance.
   - [The management screens: hosts and hats (4d-i)](plans/2026-10-18-web-manage.md) — part 4d-i of plan 4, the frontend (4 tasks), in `web/` only: every server string shown escaped and bidi-isolated (`visible()`, `<Text>`); a confirmation that runs its action and stays open under the step-up dialog; the page `inert` behind that dialog; a failed sign-out that says the browser is still signed in. Hosts: the list with each host's state, pairing with a one-time code minted on the click behind step-up and kept in the page's state only, with the exact `hennery host join` command and a countdown; rename, default hat and revoke, confirmed then stepped up. Hats: create, rename, recolour, the default for new hosts, each host's path rules saved as a set with a live tester that asks the host, and purge from the server's preview. Playwright pairs a real host with the command the page shows, at two widths, with every binary in a scratch environment. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status").
   - [The MCP connections screen (4e-i)](plans/2026-10-22-web-mcp.md) — part 4e-i of plan 4, the frontend (3 tasks), in `web/` only, over plan 8a's routes: `/mcp` (nothing under it, which the server reserves), shown only when `features` names `mcp_connections`; each connection with `hennery-<slug>`, its URL, hat, kind, whether a token is stored and its state in words (`needs_auth` "needs sign-in again", `error` "is failing", never a reconnect), the vendor's note escaped and cut at 300 characters; add (step-up; the hat starts at the default for new hosts), edit sending only the changed fields (a label edit needs no step-up; the token's loss confirmed first), delete (confirmed, then stepped up); the static token write-only, read once from an uncontrolled field kept from password managers and emptied before the request; the hosts ticked as a full set built from the connection's own mounts; a note that changes apply to new and resumed sessions, and how Codex, Claude on the operator's own CLI and any other agent command get them (without isolation, only both in the host's default hat; may change). Playwright creates one, sets its token and mounts it on a real paired host at two widths. Stdio servers, OAuth and the delivery indicator are 4e-ii's. Amended after the security review of 2026-10-03 and its re-confirmation. Executed 2026-10-03, with the whole-branch review fixes completed and rebased onto merged 8e (`d54c704c`) on 2026-10-12 (see its "Execution status").
   - [Web MCP delivery and local servers (4e-ii-a)](plans/2026-10-23-web-mcp-delivery.md) — six web-only tasks over merged 8e: last-start/resume mode/count, bounded metadata refresh, host/agent predictions, full-set local stdio configuration with write-only env values and step-up, isolation refusals, and security-review amendments. Executed 2026-10-13 on `7a8dab28`; opus review APPROVE AFTER AMENDMENTS and scoped re-confirmation CONFIRMED WITH NOTES (maintainer's behalf, 2026-10-13), all N1–N3 taken. Fresh v2 replay: 88 blocks / 33 files, twelve matching phase trees; 1465 Vitest / 84 files, prior full Playwright 58 passed / 11 skipped and changed spec 8/8; 171 historical/new caught probe records. Final-tip gate is logged in the ledger before push (see Execution status). OAuth Connect is 4e-ii-b after 8f.
   - [Web MCP OAuth (4e-ii-b)](plans/2026-10-24-web-mcp-oauth.md) — five web-only tasks over merged 8f (4684d1d9): DCR/pre-registered write-only clients, isolated fresh-click consent, last gateway reports/probes and shared attention, real collector/loopback vendor at 1280/390 px. Executed 2026-10-13; opus review APPROVE AFTER AMENDMENTS, scoped re-confirmation CONFIRMED WITH NOTES (maintainer's behalf, parent, 2026-10-13), I1/M1–M10 and N1–N3 taken. Fresh post-N1 replay: 81 blocks / 24 files, ten matching phase trees; 1618 Vitest / 93 files, full Playwright 86 passed / 11 existing skips including 28 OAuth cases; 250 historical + 7 N1 caught source-probe records. Final-tip gate is logged before push. Draft PR #133 is parent-managed; hint-only browser proof, flow identity, password-manager residual and service-worker push relay remain follow-ups. No push subscription UI before testers.
   - [`public_url` over the HTTP API (4d-B4)](plans/2026-10-18-public-url-api.md) — a backend part of plan 4d, the frontend (3 tasks): `PATCH /api/settings {public_url}` does what `hennery admin reset-public-url` does, through one operator function and in one transaction: the URL checked as setup checks it, the row and the cached origin replaced, every signed-in session ended (the caller's too) and so every stream and push subscription, the passkeys removed only when the host name changes, every ceremony ended, the contact beside it in the same transaction. A body naming `public_url` needs a fresh step-up, checked before anything is read and again as the write's first statement; a contact alone needs none. The answer reports what ended and clears the cookie as the old `public_url` set it; the move is logged at `warn` with both origins. Proven against the admin socket on a copy of one database. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status"). Q1 (refuse a loopback `http` `public_url`, a lockout from a remote browser) is open for the maintainer, with parity as the default.
   - [Hat logos, server side (4d-B2)](plans/2026-10-18-hat-logos.md) — part of plan 4d, the management screens' backend (4 tasks, and a fifth from the whole-branch review): a hat's logo is a PNG of at most 64 KiB, uploaded as base64 in JSON behind step-up, its size checked from its header before anything is decoded (1024 pixels a side), decoded and written afresh as `IHDR`, `IDAT` and `IEND` alone, at most 256 KiB; SVG, WebP and JPEG refused (the browser rasterises them first); `GET /api/hats/{id}/logo` serves it as `image/png` with `nosniff`, a sandbox policy, a fixed `Content-Disposition`, same-origin CORP and a strong `ETag` revalidated each time; `HatItem.logo` carries the `ETag`; a hat frozen for its purge takes no new logo but can lose its own, and the purge leaves no logo in the database or its WAL; the next kernel migration adds the columns. Kernel §5.1 and the frontend spec's hats bullet written back. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status").
   - [The README quickstart (4f)](plans/2026-10-22-quickstart.md) — part 4f of plan 4, the frontend (1 task) — executed 2026-10-03; finalized against main `82d41c0f` on 2026-10-13 after #133. Source/Nix build, up/setup, SSH-tunnel pairing, first session, static-token/OAuth/local stdio MCP and admin recovery match the merged code. All nine shell blocks have test/CI runners; OAuth and SSH are prose. The accuracy amendments and substitution/expiry guards are recorded in the single execution status; final OAuth accuracy review and PR #125 CI remain parent-owned.
   - [Build without Nix](plans/2026-10-25-build-without-nix.md) — extends plan 4f with latest stable Rust, Node 24, pinned pnpm 12.3.4 through npx and vendored OpenSSL. The new named block has a dedicated Ubuntu/macOS CI runner and a job-scoped guard; local execution, probes and replay are recorded in its Execution status. Independent review and non-Nix CI remain parent-owned.
   - [Kernel hats (5a)](plans/2026-10-06-hats.md) — the first part of plan 5, hats (3 tasks): `hats` and `hat_path_rules` with `owner_id` and composite foreign keys, a default hat on every host from the first start (setup names it), the pure resolver (segment match, longest prefix, default fallback), and the hats, path-rules and `PATCH /api/hosts/{id}` API behind step-up. No session carries a hat yet: `resolve_path` (5b), the session's hat on start and resume (5c) and re-assignment (5d) follow. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [`resolve_path` (5b)](plans/2026-10-07-resolve-path.md) — the second part of plan 5 (3 tasks): the host resolves a typed path (`~`, symlinks, a missing tail kept under its resolved ancestor, a `..` past it refused); `resolve_path`, a probe of its own capability on plan 6c's probe map; `POST /api/hats/resolve`; and rules saved only through their connected host. Amended after the security review of 2026-10-02 (it covered 5b–5d); executed 2026-10-02 and rebased onto 6c (see its "Execution status").
   - [Session hats (5c)](plans/2026-10-08-session-hats.md) — the third part of plan 5 (3 tasks): a start resolves its cwd on the host and stores the hat its rules give with the canonical cwd (no session for a host that is away); a resume refuses a moved cwd (`cwd_moved`) or another hat (`hat_mismatch`); a case near miss is `hat_ambiguous`; the host starts an adapter only in its canonical cwd; `hat_id` on the list item, the list's `?hat=` filter, and recents under the session's hat. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Re-assigning a session's hat (5d)](plans/2026-10-09-reassign-hat.md) — the last part of plan 5's sessions side (2 tasks): `PATCH /api/sessions/{id} {hat_id}` behind step-up moves a session with no running adapter to another of the owner's hats (a presumed-parked one is refused: close it first), writes `hat_reassigned{from, to}`, and the next resume must agree with the new hat. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Connections and credentials at rest (8a)](plans/2026-10-13-gateway-store.md) — the first part of plan 8, the MCP gateway (5 tasks): the `hennery-gateway` crate and its `gateway` migration component (`gw_connections`, `gw_credentials`, `gw_mounts`, every row the owner's); the master key (`<data>/master.key`, made once, private, checked on every load; or `HENNERY_MASTER_KEY`, or a systemd credential), kept from `up`'s host child and every agent; a missing or wrong key while credentials are stored stops the start and says what to restore; credentials sealed with XChaCha20-Poly1305, bound to their row, field and key version; `GET/POST /api/mcp/connections`, `PATCH/DELETE …/{id}`, `PUT …/{id}/mounts` and the write-only `PUT …/{id}/credential`, behind step-up where a token's reach changes, `no-store` on every answer; another origin or kind deletes the credential in the same transaction; an upstream URL logged only as its origin; `purge_hat` for the purge hook; the wire types documented into the TypeScript. No proxy yet (8d). Amended after the security review of 2026-10-02 and its two re-confirmations; executed 2026-10-02 (see its "Execution status"). Q1 (what a lost key takes down) and Q2 (a secret in a vendor's URL) are open for the maintainer, with defaults in place.
   - [The outbound HTTP policy (8b)](plans/2026-10-13-egress.md) — the second part of plan 8, the MCP gateway (2 tasks): `hennery_kernel::egress`, the one policy for every request hennery sends out (the gateway's proxy and OAuth, Web Push). One `reqwest` client per allowance (public only, or internal network); no redirects followed, no proxy from the environment; `https`, or `http` to loopback only (`localhost` answered by rule); a name with any non-public address refused, IP literals checked the same way (IPv6 public only in `2000::/3` outside its special ranges); a connect timeout and a deadline (the whole exchange, or a stream's head); errors without the URL; a per-key permit limiter. Nothing calls it yet. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status"). Decision 6 (plain `http` to a LAN address under the internal-network marking) was answered by the operator: allowed, in 8b-ii.
   - [The proxy and session tokens (8d)](plans/2026-10-14-gateway-proxy.md) — the fourth part of plan 8, the MCP gateway (4 tasks): session tokens (`hnry_session_…`, SHA-256 only) minted and revoked inside the caller's transaction for plan 8e, `ClientIdentity` and `MountPolicy` with their full-mode implementation, and the proxy `POST|GET|DELETE /mcp/<slug>` for static and `none` credentials, served outside the operator's routes: one 404 for everything out of scope, header allowlists both ways, the credential under its header, streaming event by event, a 401 never passed on (502 `upstream_auth`), the tool allowlist in JSON, batches and SSE, `initialize` without sampling, elicitation and roots, server requests for them refused, the egress policy chosen from the stored flag, per-connection limits, `nosniff`, `ApiError` answers. Amended after the security review of 2026-10-02, two re-confirmations and the execution's reviews; executed 2026-10-02 (see its "Execution status"). Q1 (server requests inside a JSON answer) was decided by the lane parent: event streams only, as §5.6. Open for the maintainer: whether a revoke ends a token's open streams (8e).
   - [Differential tests for the proxy's filters](plans/2026-10-15-gateway-differential.md) — a fix-forward to 8d, before 8e mints tokens (3 tasks). Each filter that reads parsed input is driven through the real proxy with a table of vectors: key case, duplicates, escapes, marks and whitespace, lenient forms, NUL, the envelope, large ids. What crossed the gateway is decoded again as serde_json, a first-wins decoder, Go's `encoding/json`, json-c and cJSON do, each measured. The tests found that a NUL-cut key or method (json-c, cJSON), a non-string `method`, a non-object batch element or `initialize` `params`, a JSON `tools/list` answer spelt otherwise, and an event not UTF-8 all passed a filter; each is now refused, 400 up and dropped or 502 down. Amended after the security review of 2026-10-02 and its re-confirmation. Open for the lane parent: §5.5's accepted gaps and 8d's Q1, against the brief's "under any interpretation".
   - [JSON answers read whole, every tools list filtered](plans/2026-10-15-gateway-json-answers.md) — a fix-forward after the differential tests, before 8e mints tokens (3 tasks). It reverses 8d's Q1 ruling: every JSON answer is read whole (8 MiB) and judged, and one holding a refused server request is 502 `upstream_invalid` (§5.6: in any answer). Under an allowlist every `result.tools` is filtered whatever its id, on `POST`s, `GET` streams and `Last-Event-ID` replays. An id of another type and an answer on another stream are accepted and pinned by tests. The differential harness moves to `tests/support/differential.rs` for 8e and 8f. Amended after the security review of 2026-10-02. Open for 8e: the upstream `Mcp-Session-Id` is not bound to a token.
   - [Plain `http` on an internal network (8b-ii)](plans/2026-10-13-internal-http.md) — the operator's decision of 2026-10-02 (1 task and the write-back): under the internal-network marking, plain `http` to internal addresses only (RFC 1918, loopback, unique-local IPv6 except AWS's metadata address `fd00:ec2::254`); a public address, link-local, CGNAT and everything neither public nor internal stay `https` only. A literal is checked by the URL check; a name goes through a third, internal-only client whose resolver refuses it if any address is not internal. Additive: 8b's API unchanged. Q1 (link-local, metadata), Q2 (CGNAT) and Q3 (a UI warning) are open for the maintainer, with the restrictive defaults. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Per-session MCP servers on the host (8c)](plans/2026-10-13-session-mcp-host.md) — the third part of plan 8, the MCP gateway (4 tasks): `start_session` and `resume_session` carry `mcp_servers` and `hat_id`, left out when empty; a host announces `mcp_servers` and `hello.mcp_isolation` (only the pinned `claude` is `claude_strict`); the hub sends servers only to a connection that can take them (`McpUndeliverable`), and a host refuses servers it cannot isolate unless the collector waives isolation (`mcp_isolation_unavailable`), before any spawn; Claude gets `strict-mcp-config` on every `session/new` and `session/load`, so the user's own MCP servers and claude.ai connectors no longer load in hennery's Claude sessions; no token in a frame's `Debug`, a log (the ACP crate's held at `error`, tungstenite's at `info`) or the host's own text. The collector sends no servers yet (8e). Release blocker: no release with 8c but without 8e. Amended after the security review of 2026-10-02 and its re-confirmation, and after its task reviews; executed 2026-10-02 (see its "Execution status").
   - [Sessions get their MCP servers (8e)](plans/2026-10-16-gateway-session-delivery.md) — the fifth part of plan 8, the MCP gateway (12 tasks): every start and resume decides what its session gets (`isolated`, `unisolated`, `fallback`, `unsupported`) and, inside its own transaction, mints a session token and hands the hat's connections mounted on the host plus its local stdio servers (`GET/PUT /api/mcp/stdio-servers`, env values sealed per row, step-up); every site that ends a session's right to MCP revokes its token in its transaction and, once that commits, ends what is open on it (`commit_then_cut`, a source audit); a host revoke cuts at once; an upstream's `Mcp-Session-Id` is bound to the token and connection by HMAC, `Last-Event-ID` goes up only beside one, a JSON answer has a 60 s deadline; a hat's purge runs the gateway's part first; a token an agent prints is stored, published and logged redacted; `HostItem.mcp_delivery` and `SessionDetail.mcp_delivery`; `mcp_isolation_unavailable` is 409 on every path. Amended after the security review of 2026-10-03 and its re-confirmation; executed 2026-10-03, rebased onto `a3146be6` and reverified 2026-10-12: 1736 Rust tests, 1303 web tests (73 files), 132 probe anchors matched once; the historical result is 131 BITE and [11] INERT (see its "Execution status"). Deferred: the proxy's early-reject drain. Open for the maintainer: whether a connection change cuts open streams, redacting echoed stdio values, and a default-hat change revoking nothing.
   - [OAuth MCP connections (8f)](plans/2026-10-15-gateway-oauth.md) — the sixth part of plan 8, the MCP gateway (10 tasks): discovery, DCR and pre-registered clients, PKCE consent, callback, sealed grants/secrets, refresh, probe and Web Push notices. Task 10 shares failed attempts, backs off unavailable/unsaved issuance, retires only HTTP 400 invalid_grant, preserves expired Unsaved as credential_unsaved, guards status with token-read stamps and clears Attempts after committed credential changes. Parent-authorized boxing keeps the stamp while clearing the enum-size Clippy errors. Base `94121391` retains 8e, 4e-i, 4e-ii-a and #130: 1948 Rust tests, 382 gateway tests, 1465 web tests (84 files), browser 58 passed / 11 skipped. Boxing races in four copies × two rounds: 24 runs / 1144 passes; before boxing, four copies × three rounds: 36 runs / 1716 passes. Fresh v5 replay: 397 blocks, 57 files, 20 snapshots and complete tree match. 384 anchors, 383 BITE plus accepted C23; all 26 final confirmation probes BITE, and PX16 freshly BITE after boxing. Task 10 scoped re-review CONFIRMED WITH NOTES; four parent rulings implemented, final follow-up review requested. Refresh-lock/probe-slot pruning and PQ1–5 remain open with defaults unchanged; see Execution status. Opener-null in 4e-ii remains required before consent-popup shipping.
   - [Image attachments (6a)](plans/2026-10-07-images.md) — plan 6a (6 tasks): the collector checks a prompt's content before anything is written, stores its images as content-addressed files (`attachments`, `event_attachments`) referenced from the turn and its `user_turn`, serves them at `GET /api/attachments/{sha256}`, and reports their size at `GET /api/settings/attachments`; the host announces `images`, reads 32 MiB frames, and refuses images to an agent that takes none. The API only. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Session list and search (6b)](plans/2026-10-07-session-list.md) — plan 6b (7 tasks, two PRs): the `title` and `commands` extracts (a load's replay included, an early title only filling an empty one), commands in the catalogue and `catalog_changed` as the catalogue stands, fixed-width stamps and recency moved only by listed events, `GET /api/sessions` (keyset pages, a search over title, cwd, branch and id across every lifecycle, `hat` refused until hats), a list item under 1 KiB whatever the agent reports, the detail built from it with the model and mode; then the `git_state` body and the host's git probe, off the actor and bounded to 3 s (6b-ii). Amended after two security reviews of 2026-10-02; executed 2026-10-02 as PRs #46 and #48 (see its "Execution status").
   - [Release build (7a)](plans/2026-10-07-release-build.md) — the first part of plan 7, distribution (4 tasks): OpenSSL built into release binaries (`vendored-openssl`), `hennery collector healthcheck`, cargo-dist's archives and installers built and checked in CI (`build.yml`; the installer hardened to refuse what it cannot check), and the collector image started and checked. Nothing publishes; packaging/README.md lists what publishing needs. 7b (managed runtime), 7c (services), 7d (doctor) and 7e (Nix) follow. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [`close_range` (7a-ii)](plans/2026-10-10-close-range.md) — one task: on Linux 5.11 and later, an adapter's spawn marks every inherited descriptor close-on-exec with one `close_range`, past the closing loop's 65536 cap, with the loop as the fallback; CI raises its hard descriptor limit so the test can hold one past the cap. Handed over by the debt lane. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Services, supervisor and host lock (7c)](plans/2026-10-09-services.md) — the third part of plan 7, distribution (4 tasks): `host.lock` and `up.lock`; `up` restarting a crashed child with a backoff (1 s to 60 s) and giving it up after ten crashes in five minutes, with `<data>/supervisor.json` for `status` and `doctor`; `hennery service install|uninstall|status` with the login shell's PATH, a launchd user agent or a systemd user unit, linger advised and WSL explained. Amended after the security review of 2026-10-01; executed 2026-10-02 as PR #42 and its stacked follow-up (see its "Execution status").
   - [Rotating logs and children that die with up (7c-iii)](plans/2026-10-11-logs-parent-death.md) — 7c's two gaps (2 tasks): run by a service, `up`, the collector and `host run` each write a rotating log of their own (`hennery-<process>.log`, 10 MiB × 5) in §8's directory or `HENNERY_LOG_DIR`, so launchd's `<role>.log` gets crash output only; and every child of `up` holds the read end of a pipe only `up` writes to, so a killed `up` leaves no child holding the port or `host.lock`. Amended after the security review and the plan review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Project picker (6c)](plans/2026-10-07-projects.md) — plan 6c (6 tasks): the probe map shared with hats' `resolve_path`, workspace roots in `host.toml` or `--workspace-root`, `list_projects` and `browse_directory` behind the browse fence, `GET /api/hosts/{id}/projects` and `…/browse` with the 60 s cache, and recents per hat, shown for the hat a path resolves to. Amended after the security review of 2026-10-01 and, for hats 5a, of 2026-10-02; executed 2026-10-02 as PRs #41 and B (see its "Execution status").
   - [`hennery doctor` (7d)](plans/2026-10-13-doctor.md) — plan 7d, distribution, in two PRs. 7d-i (3 tasks): `hennery doctor [--data-dir]` reads only, and says `ok`, `warn` or `fail` with a fix for checks 1 (the binary and the set present), 2 (glibc ≥ 2.28 by its loader's banner, kernel ≥ 4.18, NixOS without nix-ld), 5 (the service's PATH and its drift), 6 (nesting variables, root), 9 (disk, outbox, orphaned outboxes), 10 (the service, `up`'s children as `service status` judges them, restart needed by the running executable's identity), 11 (another `hennery` on PATH), 12 (the set against the pin, the hold), 14 (`host.lock`'s holder without taking it, the directory's and key's modes) and 17 (`--use-cli`); it exits 1 only on a failure. [7d-ii](plans/2026-10-14-doctor-ii.md) (3 tasks) adds checks 3 (each adapter answers `initialize` as the host would start it, its group killed after; on macOS a silence only warns), 4 (each CLI logged in, by its exit code alone), 7 (the collector step by step: URL rule, DNS, TCP, TLS, `/healthz`, then a `hello` only while no host holds `host.lock`), 8 (the clock against the collector's `Date`), 13 and 17's gap (the bundled CLIs against the terminal's and the overrides), and 16 (listeners and `public_url`); `probe_agents` and check 15 wait for their lanes. Amended after the security reviews of 2026-10-02; 7d-i and 7d-ii executed 2026-10-02 (see their "Execution status").
   - [Nix package (7e-i)](plans/2026-10-12-nix-package.md) — 2 tasks: `nix build` gives `hennery` (crane, on nixpkgs' own toolchain and OpenSSL), and `nix flake check` runs the package, clippy, rustfmt and cargo-audit against a pinned advisory database, on Linux and macOS in a new CI job on every PR. The adapter and frontend derivations and the NixOS modules are 7e-ii's. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Nix web UI (7e-ii-b)](plans/2026-10-20-nix-web.md) — 3 tasks: the web UI as a derivation of its own (`nix/web.nix`: `fetchPnpmDeps` with `fetcherVersion = 4` on nixpkgs-web's `pnpm_12`; one dependency hash for every system, as the fetcher's `--force` takes every platform, so no `supportedArchitectures`; pnpm 12's `v11/links` dropped before the fetcher's fixup), embedded in the package through `HENNERY_WEB_DIST` with `HENNERY_WEB_REQUIRE=1`, a `web-ui` flake check on the binary, reference guards on both, and `packaging/update-web-hash.sh` for every change to `web/pnpm-lock.yaml`. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Managed runtime and pinned adapters (7b)](plans/2026-10-08-managed-runtime.md) — plan 7b (7 tasks, two PRs): the adapter manifest (`adapters/manifest.json`, compiled in) and its generator `hennery-pins`, the pin-bump job, the installer (resumable verified downloads, safe extraction, sets with `current`/`previous`, rollback hold, collection), `hennery host adapters update|rollback`, `join` installing the runtime, `host run`'s default agents from the installed set, and `--use-cli`. Pins proposed, operator to confirm. Amended after the security review of 2026-10-01 and the plan review of 2026-10-02; executed 2026-10-02 as PR #51 and its stacked follow-up (see its "Execution status").
   - [Web Push: the VAPID key, subscriptions and hat policies (10a)](plans/2026-10-14-push.md) — the first part of plan 10, Web Push (2 tasks): `<data>/vapid.key` (made once, never replaced; a damaged, symlinked, FIFO or readable one stops the start), the RFC 8292 token signed by hand with `p256` (ES256 as raw `r ‖ s`, checked against RFC 6979's and RFC 8292's vectors), push subscriptions that end with the signed-in session that made them (subscribing needs step-up; a push service's rotation needs none), endpoints checked as `https` on a public domain name and stored as parsed, per-hat push policies, the push contact in `GET/PATCH /api/settings`. Nothing is sent: delivery and the triggers are 10b's. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Web Push: the push triggers (10b-i)](plans/2026-10-15-push-triggers.md) — the second part of plan 10 (3 tasks): `pending_opened` carries the question's title from the host; the store reports the push edge a host fact crosses (a turn blocked on its first question, a turn ended `completed` or `failed`), read in the fact's own transaction with the session as it left it; one function decides what notifies; a per-tag coalescing queue that never blocks ingest; a resent backlog notifies only once reconciled and only what still holds; a question asked again after a withdrawal is quiet. A question outside a turn is an edge of its own; it notified nothing here, and 10b-iii makes it notify (the operator's decision). Nothing is sent: delivery is 10b-ii's. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Web Push: delivery (10b-ii)](plans/2026-10-17-push-delivery.md) — the third part of plan 10 (2 tasks): the collector sends its notices. Each goes to every subscription of the owner's under the hat's policy (muted, generic title, details), encrypted to the browser (RFC 8291, `web-push-native` with default features off), signed with 10a's VAPID token (reused until an hour before it expires), padded to 512-byte buckets, `TTL` 3600 and `Urgency` high or normal, never `Topic`. It goes through the shared egress client, public addresses only; one `Egress` is built in `main.rs` and the gateway shares it. A 429, 5xx, timeout or failed connection is retried (1 s, 4 s, `Retry-After` up to 10 s; 10 s a try, 30 s a subscription); 404/410 removes the subscription and expired ones are pruned, an outcome landing only on the endpoint pushed to. Amended after the security review of 2026-10-02, its re-confirmation and the whole-branch review; executed 2026-10-02 (see its "Execution status").
   - [Web Push: a question outside a turn notifies (10b-iii)](plans/2026-10-16-push-outside-turn.md) — one task, the operator's decision of 2026-10-02: a question opened while no turn runs notifies "needs your answer" like a blocked turn, under 10b-i's rules. Only the first open question notifies; one asked again after the agent withdrew one is quiet until the owner's next prompt, ordered by event id (sessions migration 11: `pending.opened_event_id`, `events_by_kind`); a resent question notifies after reconciliation if still open. A blocking question with no turn id gets the same bound. Amended after its review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Session delete (9a)](plans/2026-10-15-session-delete.md) — the first part of plan 9, delete and purge (3 tasks): `DELETE /api/sessions/{id}` behind step-up closes an attached session first, then deletes its events, turns, questions, answers, catalogue and project recent, and its images once no turn or event of any owner names them (`turn_attachments`); a scrubbed tombstone and one `session_deleted` event remain, triggers refuse any write for it, its host's frames are acked and discarded and its adapter is closed at the next handshake, or at once if the host reconnected during the delete; `secure_delete` on. The orphan sweep (9b) and the per-hat purge (9c) follow. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [The client view: the display fold (4a-i)](plans/2026-10-16-view-fold.md) — the first part of plan 4, the frontend (4 tasks): a pure crate, `hennery-view`, folds a session's stored events into the display items every client renders (client view spec §3): `user_turn`, `message`, `thinking`, `tool_call`, `plan`, `question`, `marker` and `unrecognised`, with ids stable for the session's life and the version of their last change. Groups cut at each prompt, every merge kept inside its group; tool calls merged without erasing, their output read from every shape, with the fabrication warning; questions parsed for their cards, with a monotonic verdict and `answerable` from the server's pending set; anything unknown kept as an `unrecognised` item, its JSON as text. Every agent string and count is capped, and a turn past its budget is elided behind one marker. `apply` and `take`. Golden tests over scrubbed recordings of `claude-agent-acp` 0.81.0 and `codex-acp` 1.13.0. Nothing serves the items yet: the view API is 4a-ii's. Amended after the security review of 2026-10-02, its re-confirmation and the plan review; executed 2026-10-02 (see its "Execution status").
   - [The client view: the view API (4a-ii)](plans/2026-10-17-view-api.md) — the second part of plan 4, the frontend (5 tasks): the collector serves 4a-i's display items to every client, folding the stored events as it is asked; nothing new is stored and no migration is added. `GET /api/view/sessions/{id}` answers a page of whole turns, the newest first, within a byte budget; `GET /api/stream/view/sessions/{id}` streams whole items as they change, resumable from `Last-Event-ID` or `?after=<epoch>:<revision>`, with `catalog_changed`, `session_removed` and `resync_required`; `GET /api/view/sessions` and `GET /api/stream/sessions` serve the session list as summaries, with `question_waits` and the count of sessions waiting (`waiting`, `waiting_changed`), the stream holding 250 ms after a ring and sending a summary only when it changed; `GET /api/view/sessions/{id}/turns/{turn_id}` gives the prompt of a turn not delivered, for "send again". Every route is behind `operator_only`; an unknown or foreign session is 404 before anything is read; each stream takes the hub as a doorbell and reads the store from its own cursor, through a queue bounded by count and bytes. 18 new owner-filtered statements, in the owner audit; one parser for the list's filters; `hennery-view`'s generator writes `web/src/generated/view.ts` and its schema, checked in CI. Amended after the security review of 2026-10-02, its re-confirmations and the plan review; executed 2026-10-03 (see its "Execution status").
   - [The orphan sweep (9b)](plans/2026-10-17-orphan-sweep.md) — the second part of plan 9, delete and purge (1 task): at the collector's start and then hourly, the owner's image rows that no turn or event references go, then the files in `attachments/` that no owner's row names and leftover `.tmp` files, each only past a one-hour grace; only regular files with a hash or a temporary name, never through a link, listed outside the store's lock and removed in batches under it, stopping at shutdown; an image saved again has its time refreshed. Covered by plan 9's security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The per-hat purge (9c)](plans/2026-10-18-hat-purge.md) — the third part of plan 9, delete and purge (2 tasks): `POST /api/hats/{id}/purge` behind step-up refuses a default hat and a hat with a session running on a reachable host, then freezes the hat (`purged_hats`, its rules deleted; nothing enters or leaves it), deletes each of its sessions as 9a does (unreachable ones closed collector-side, `unconfirmed`), and the hat row last, its recents and push policies with it; a re-POST resumes; `GET …/purge` previews; `forget_hat` after every handshake; the WAL checkpointed once. Amended after plan 9's security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The agent's transcript on its host, Claude (9d-i)](plans/2026-10-19-host-transcripts.md) — the fourth part of plan 9 (4 tasks, two PRs; operator delegated, parent decided 2026-10-02): the host records each session's agent home at start in a registry of its own; a delete or a purge writes a `host_forgets` record before the scrub and sends `forget_session` when the host is ready, after every handshake and after the session closes; for Claude the host runs the adapter's `session/delete`, then removes the transcript's family and the session's `file-history`, `session-env`, `tasks` and `debug` entries through directory descriptors, never through a link, and checks afterwards; what is left is reported (kinds and counts, never paths) and listed in Settings; transcripts started after a context clear inside the agent are not removed. Codex is 9d-ii. Amended after two security reviews of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The agent's transcript on its host, Codex (9d-ii)](plans/2026-10-20-codex-transcripts.md) — the last part of plan 9 (4 tasks; operator delegated, parent decided 2026-10-02): the host runs the bundled `codex app-server` against the session's recorded `CODEX_HOME` only, checks `initialize`'s `codexHome`, calls `thread/delete` and checks afterwards; when the app-server cannot be used (or timed out three times in a row) codex-acp archives and the host removes the rollouts through the descriptor walk, reporting that copies may remain in Codex's database; the call shape is pinned per Codex version in the manifest, checked by `hennery-pins` and re-read at every pin bump. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Delete and purge: the design record (plan 9)](plans/2026-10-21-delete-and-purge-design-record.md) — why plan 9 was built as it was: the decisions and the security reviews' amendments for 9a–9c and 9d, the operator's delegated decisions (the parent, 2026-10-02), and the evidence on Claude's and Codex's own session storage (claude-agent-acp 0.81.0, codex-acp 1.13.0, Codex 0.155.1) to re-read at a pin bump.
   - [Generic plug-in contract (C1)](plans/2026-10-26-plugin-contract.md) — generic owner/hat registration, completed activity with typed provenance, exposure bindings and durable deletion lifecycle; built first and replayed on merged design main (40 blocks, exact tree match). The PR #140 flake investigation fixed writer-registry identity lifetime test-first and rebased onto W1 main `26cc3cca`; current verification and historical replay are distinguished in its execution record. Parent re-review and Linux/macOS CI remain pending.

   - [WSS transport and diagnostics (W1)](plans/2026-10-26-wss-transport.md) — merged as #139; verified HTTPS/WSS transport, private-CA trust, durable enrollment recovery, migration and diagnostics. Its record preserves the build/review history; public real-adapter/MCP acceptance is carried into W2.

   - [Proxy attribution and public deployment (W2)](plans/2026-10-27-wss-proxy.md) — built and replayed on `256691fe`: exact trusted peers across all limiter charges/clears, executed proxy/HTTPS README recipes and W1 recovery gates. PR #147 maintainer-delegated review returned APPROVE AFTER AMENDMENTS; its one request-cap coverage Minor is implemented, removal-probed and locally checked. Scoped re-confirmation, Linux/macOS CI and live public-adapter/MCP acceptance remain pending.
   - [Session-bound MCP and family identity (D1)](plans/2026-10-27-delegation-mcp.md) — collector-local opt-in MCP delivery, generation-bound grants, shared identity and immutable scoped family storage; built first, exact fresh replay and guard/load evidence recorded. Actual pinned Claude/Codex discovery passed. Maintainer-delegated review returned APPROVE; its one cycle-fixture Minor is corrected and independently probed. Linux/macOS CI remains parent-owned; tools, durable delivery and UI follow in D2–D4.

   - [Release foundation (R1)](plans/2026-10-28-release-foundation.md) — hardware-backed inventory approval plus the executed verify-then-run README bootstrap, re-confirmed by the parent. The Linux CI tool-directory collision is repaired with duplicate-name/conflict regressions. Rebased onto W2 at `e36e66c8`; post-rebase checks, COPY probes and fresh replay evidence are recorded in the plan. PR #145 awaits review and CI; maintainer-only setup remains and publication is disabled.
   - [GHCR collector image (R4)](plans/2026-10-28-ghcr-image.md) — rebased onto merged R1 at `191aa71b`: real shared `release-gate ghcr`, protected environment credentials and hardware-signed inventory plus exact-tag Sigstore. Native OCI/index bytes enter the complete held candidate; each writer revalidates actual image/binary digests. R1's shared OCI verifier also checks both platform subjects. Fresh 29-file replay, 152 R4 and 96 R1 contracts, 130 assertion-producing copy probes; current Rust/lint evidence is in the plan. Draft #143 Docker acceptance and scoped integration review remain parent-owned. Nothing published.

## Maintainer decisions (2026-09-27)

Every open design decision is resolved; the specs carry the details.

| # | Question | Decision | Where |
|---|---|---|---|
| 1 | `master.key` in the OS keystore | No — a 0600 file in v1; a separate OS user or container is the real protection | kernel §10 |
| 2 | Per-hat "isolate agent user config" | Documentation only in v1 | umbrella §8.4, ACP core §15 |
| 3 | Codex sharing a composed `CODEX_HOME` | Stays on the mixed-host fallback until measured | umbrella §8.5, ACP core §6 |
| 4 | Headless macOS hosts | A logged-in user is required in v1 | distribution §6.2, §13 |
| 5 | "Use my own CLI" | Advanced install option (`--use-cli`), not the default | distribution §13 |
| 6a | Attachment size cap | None in v1; disk usage shown in Settings | ACP core §15 |
| 6b | VAPID contact | Not asked at setup; derived from `public_url`, optional in Settings | kernel §6 |
| 6c | Multiple listeners | Supported; browser access stays bound to `public_url` | kernel §7 |
| 6d | Static-token header | Header name plus optional value prefix | gateway §1 |
| 6e | Windowing threshold, vendor token behaviour, `GET` SSE | Measured once the code exists | frontend §15, gateway §13 |
| 7 | Plain `http` to a LAN MCP server (operator, 2026-10-02) | Only for a connection marked "internal network", and only to internal addresses; a public address stays `https` only | kernel §7.1, gateway §5.7 |

---

_Generated with Claude AI — please review before distribution._
~~~~

## Verification record

Final fresh snapshot: `.superpowers/sdd/r4/replay-15`, from **`191aa71b`**.
**29 complete File blocks, 0 patches**, with identical source bytes/modes after
each task. The plan itself is excluded from recursive embedding and is copied
back after the execution record. Final staged and committed bytes are compared
with that frozen tested snapshot before the exact-lease push.

R4 contracts: **152 passed**, exit 0, including candidate materialization,
consumer platform membership, signature/inventory/gate refusal, registry recovery,
workflow boundaries, real immutable audit receipt uniqueness, GitHub-only candidate
job selection and process/UI smoke doubles. R1's complete release suite:
**96 passed**, exit 0, including actual disposable-key cryptography. Actionlint
on all **seven workflows** and shellcheck on **seven scripts** exit 0. Production
workflow-policy repository check exits 0. Native Docker is not proven by fixtures.

**130 distinct copy-only mutations, 130 caught, 0 missed**. Every counted probe
has an actual assertion failure, never an ERROR/message-only result. This is the
current distinct set, not historical runs added together. It includes skipping
the live gate, missing/invalid signature or wrong global inventory, revocation
between inspection and upload, wrong upload layout, signed descriptor/platform
membership, archive/link/path/metadata refusal, pinned tool context, ordinary-token
credential substitution and each signing boundary. Fresh replay repeats the same
mutation set. Receipt collision probes call the REAL `retention.audit()` through
an immutable-store transport double; no audit no-op is used. R4 adds no optional
candidate job, so GitHub-only releases introduce no skipped GHCR candidate job.
Selected skipped/failed publishers still refuse completion; R3’s generic channel
hook is left untouched. A real-audit regression first reproduced HTTP 412
when a gate receipt shared a basename with its retained attestation bundle.
Each signing gate now uses a distinct `-boundary.json` basename; all **25**
matrix gate/bundle objects pass real immutable audit, and three independent
revert probes restore the collisions. Earlier counts are historical. Logs: `r1-probe4-*`,
`replay15-task*-*.log`, `replay15-probes.log` in the lane ledger directory.

Replay 12 was retained after nested Nix temporary paths exceeded GnuPG’s
agent socket limit. Fresh replay 15 uses `TMPDIR=/tmp`; no cryptographic or test
requirement changed. Replay 13 caught a transport-double restriction to attempt
1; the fixture now accepts the current attempt while retaining immutable keys.
Replay 14 predates the subsequently discovered gate/bundle basename collision;
replay 15 contains the final fix and expanded real-audit regression.

Six Rust checks, all final exits **0**:

~~~~sh
nix develop -c cargo fmt --all --check
nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
nix develop -c cargo clippy -p hennery --locked -- -D warnings
nix develop -c cargo test --workspace --locked
nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
nix develop -c cargo run -p hennery-view --bin gen-view --locked -- --check
~~~~

Final workspace: **2,220 passed, 0 failed, 0 ignored**, **150 result groups**.
Fmt/Clippy logs: `/tmp/dist-r4-r1-{fmt,clippy,clippy-binary}.log`.
Final workspace/generator logs: `/tmp/dist-r4-r1-retry-*.log`. Initial workspace
exit101 and the isolated **1 passed** doctor run are retained separately at
`/tmp/dist-r4-r1-test.log` and `/tmp/dist-r4-r1-doctor-isolated.log`; the unchanged
full retry passed. No Rust/web source change or test/type/rule weakening occurred.

## Maintainer-only steps

| Area | Required maintainer action before enablement |
|---|---|
| Namespace | Approve `ghcr.io/marcinwadon/hennery`, creation and repository linkage |
| Visibility | Set intended visibility and qualify anonymous pull after authorized publication |
| Retention | Hold candidate/audit versions; retain image/index/platform/attestation digests, verification bundles, corresponding source and rollback backups |
| Package access | Set package Actions access **READ**, disabling inherited write/admin; qualify the expressly authorized branch negative push |
| Publishing credential | Qualify permitted credential kind/capability; store `GHCR_PUBLISH_TOKEN` only in `release`, configure `GHCR_PUBLISH_USER`; no ordinary-token registry-write fallback |
| Hardware approval | Independently confirm public-key bootstrap and hardware-only signing authority/touch policy; sign the exact held inventory locally and provide its `.asc` through dispatch |
| Environment/settings | Configure R1's protected `release`, signed immutable tag rules, fresh settings audit, exact-SHA checks and held-storage credentials; audit actual negative outcomes |
| Enablement | Independent review, native/public-path acceptance and a separately approved stable channel set before either release/GHCR switch; first alpha remains GitHub only |

## After this plan

- Parent scoped review of the **`fc8aea88..R4 head` integration**, with full branch
  based on **`191aa71b`**. Inspect new shared membership/classifier changes,
  protected credential selection, exact held bytes, every boundary and retries.
- Parent watches draft **#143** native Docker proof and reads checks,
  reviewDecision, mergeStateStatus and unresolved human/bot threads. Local Docker
  is unavailable; no real publication/login or live settings acceptance was run.
- Maintainer completes the setup table and R1's real platform/hardware negative
  acceptance before any switch. Code merge/enabling/tag creation is not consent.
- No mutable aliases/announcements until every approved channel and public-path
  acceptance succeeds. New bytes require a new immutable version/candidate.
- Scratch retained: current `r1-rebase-task1`, `r1-rebase-task3`,
  `r1-rebase-task4`, `r1-probe-1` through `r1-probe-4`, `replay-12` through `replay-15`; prior
  `replay-1` through `replay-11`, `amend-probe-1` through `amend-probe-6`,
  `chain-probe-1`, `subject-probe-1`/`subject-probe-2`, `uid-probe-1` through
  `uid-probe-3`, `base-probe-3`/`base-probe-4`. None is deleted by this lane.
  Parent owns cleanup and durable cross-project lessons; no questions remain.

Generated with Claude AI — please review before distribution.
