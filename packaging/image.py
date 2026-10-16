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
