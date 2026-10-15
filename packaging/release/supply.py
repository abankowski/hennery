#!/usr/bin/env python3
"""Generate notices, source material, SPDX and final inventories before signing.

Includes build/dev dependencies conservatively. Missing licence material is a
finding, never automatically treated as permission to redistribute. Downloaded
host runtimes are described separately and never included as payloads.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import tarfile
import uuid
import urllib.parse

import gate
from adapter_manifest import read_manifest


def tree_digest(files):
    return gate.digest(gate.canonical([{'name': name, 'sha256': gate.digest(data)} for name, data in sorted(files.items())]))


def component(name, version, licence, root, ecosystem):
    notices = []
    for path in sorted(root.rglob('*')):
        if path.is_file() and not path.is_symlink() and not any(p in ('node_modules', '.git', 'target') for p in path.relative_to(root).parts[:-1]):
            if path.name.lower().startswith(('license', 'licence', 'copying', 'notice', 'copyright')) or any(part.lower() in ('licenses', 'licences') for part in path.relative_to(root).parts[:-1]):
                notices.append((str(path.relative_to(root)), path.read_text(errors='replace')))
    identifier = 'SPDXRef-' + gate.digest(f'{ecosystem}:{name}@{version}'.encode())[:24]
    return {'SPDXID': identifier, 'name': name, 'versionInfo': version, 'downloadLocation': 'NOASSERTION',
            'filesAnalyzed': False, 'licenseConcluded': 'NOASSERTION', 'licenseDeclared': ('MIT OR Apache-2.0' if licence == 'MIT/Apache-2.0' else licence) or 'NOASSERTION',
            'copyrightText': 'NOASSERTION', 'externalRefs': [{'referenceCategory': 'PACKAGE-MANAGER', 'referenceType': 'purl',
                                                            'referenceLocator': f'pkg:{ecosystem}/{urllib.parse.quote(name, safe="/")}@{urllib.parse.quote(version, safe="")}'}]}, notices



def frontend_sources(frontend):
    # pnpm 12 groups by licence and coalesces package versions/paths. Read
    # each package manifest so a coalesced entry never pairs the wrong version.
    for licence, group in frontend.items():
        for p in group:
            for raw_path in p['paths']:
                root = Path(raw_path)
                manifest = gate.strict_json((root / 'package.json').read_bytes())
                gate.require(manifest['name'] == p['name'] and manifest['version'] in p['versions'], 'frontend licence input differs from package bytes')
                yield p['name'], manifest['version'], licence, root, 'npm'



def rust_packages(cargo):
    if not cargo.get('resolve'):
        return cargo['packages']
    nodes = {node['id']: node for node in cargo['resolve']['nodes']}
    reachable, todo = set(), list(cargo['workspace_members'])
    while todo:
        node = todo.pop()
        if node not in reachable:
            reachable.add(node)
            todo.extend(nodes[node]['dependencies'])
    return [p for p in cargo['packages'] if p['id'] in reachable]


def supplemental(ecosystem, name, version):
    root = Path(__file__).resolve().parent / 'licences'
    path = root / 'manifest.json'
    if not path.is_file():
        return []
    manifest = gate.strict_json(path.read_bytes())
    texts = []
    for entry in manifest.get(f'{ecosystem}:{name}@{version}', []):
        text = (root / entry['file']).read_bytes()
        gate.require(gate.digest(text) == entry['sha256'], 'supplemental licence text changed')
        texts.append((entry['source'], text.decode()))
    return texts


def components(cargo, frontend):
    packages, notices, findings = [], [], []
    sources = []
    for p in rust_packages(cargo):
        if p.get('source') is not None:
            sources.append((p['name'], p['version'], p.get('license'), Path(p['manifest_path']).parent, 'cargo'))
    sources.extend(frontend_sources(frontend))
    seen = set()
    for name, version, licence, root, ecosystem in sorted(sources):
        if (ecosystem, name, version) in seen:
            continue
        seen.add((ecosystem, name, version))
        p, texts = component(name, version, licence, root, ecosystem)
        packages.append(p)
        if not texts:
            texts = supplemental(ecosystem, name, version)
        if not licence or licence in ('UNKNOWN', 'UNLICENSED', 'NOASSERTION') or not texts:
            findings.append(f'{ecosystem}:{name}@{version}: missing licence expression or text')
        notices.append(f'\n===== {ecosystem}:{name}@{version} ({licence}) =====\n')
        for path, text in texts:
            notices.append(f'\n--- {path} ---\n{text}\n')
    # Name the native libraries separately, rather than implying their Rust
    # wrapper's version is the bundled C library version.
    for native in rust_packages(cargo):
        root = Path(native['manifest_path']).parent
        if native['name'] == 'libsqlite3-sys':
            header = root / 'sqlite3/sqlite3.h'
            if header.is_file():
                version = re.search(r'#define SQLITE_VERSION\s+"([^"]+)"', header.read_text())
                gate.require(version is not None, 'bundled SQLite version missing')
                p, _ = component('SQLite', version.group(1), None, root / 'sqlite3', 'generic')
                p['sourceInfo'] = 'Bundled SQLite C source in libsqlite3-sys; public-domain declaration preserved in sqlite3.c and corresponding source.'
                packages.append(p)
                notices.append('\n===== Bundled SQLite public-domain declaration =====\n' + (root / 'sqlite3/sqlite3.c').read_text()[:1000])
        if native['name'] == 'openssl-src':
            version_file = root / 'openssl/VERSION.dat'
            if version_file.is_file():
                fields = dict(re.findall(r'^(MAJOR|MINOR|PATCH)=(\d+)$', version_file.read_text(), re.M))
                gate.require(set(fields) == {'MAJOR', 'MINOR', 'PATCH'}, 'bundled OpenSSL version missing')
                p, _ = component('OpenSSL', '.'.join(fields[k] for k in ('MAJOR', 'MINOR', 'PATCH')), 'Apache-2.0', root / 'openssl', 'generic')
                p['sourceInfo'] = 'Vendored OpenSSL source shipped by openssl-src; exact source preserved.'
                packages.append(p)
    return packages, ''.join(notices), findings


def spdx(packages, source_sha, target):
    return {'spdxVersion': 'SPDX-2.3', 'dataLicense': 'CC0-1.0', 'SPDXID': 'SPDXRef-DOCUMENT',
            'name': f'hennery-{target}', 'documentNamespace': f'https://github.com/{gate.REPOSITORY}/releases/spdx/{source_sha}/{target}/{uuid.uuid4()}',
            'creationInfo': {'created': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'creators': ['Tool: hennery-release-r1']},
            'packages': packages, 'relationships': [{'spdxElementId': 'SPDXRef-DOCUMENT', 'relationshipType': 'DESCRIBES',
                                                   'relatedSpdxElement': p['SPDXID']} for p in packages]}


def checksums(root):
    files = sorted(p for p in Path(root).iterdir() if p.name not in ('sha256.sum', 'release-inventory.json'))
    gate.require(all(p.is_file() and not p.is_symlink() for p in files), 'checksum inventory contains nonregular file')
    (Path(root) / 'sha256.sum').write_text(''.join(f'{gate.digest(p.read_bytes())}  {p.name}\n' for p in files))
    verify_checksums(root)


def verify_checksums(root):
    root = Path(root)
    listed = {}
    for line in (root / 'sha256.sum').read_text().splitlines():
        match = re.fullmatch(r'([0-9a-f]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)', line)
        gate.require(match is not None, 'malformed combined checksum list')
        sha, name = match.groups()
        gate.require(name not in listed and name not in ('sha256.sum', 'release-inventory.json'), 'duplicate/cyclic checksum entry')
        listed[name] = sha
    actual = {p.name: gate.digest(p.read_bytes()) for p in root.iterdir() if p.name not in ('sha256.sum', 'release-inventory.json') and p.is_file() and not p.is_symlink()}
    gate.require(listed and listed == actual, 'combined checksum inventory incomplete or digest mismatch')


def dependency_sources(cargo, frontend, destination):
    # Include registry source, native vendored source (OpenSSL, SQLite), web
    # packages and licence texts. No managed Node or agent downloads.
    roots = [('cargo', p['name'], p['version'], Path(p['manifest_path']).parent) for p in rust_packages(cargo) if p.get('source')]
    roots += [(ecosystem, name, version, root) for name, version, _, root, ecosystem in frontend_sources(frontend)]
    seen = set()
    with tarfile.open(destination, 'w:xz', dereference=False, preset=1) as archive:
        for ecosystem, name, version, root in sorted(roots):
            prefix = f'{ecosystem}/{name.replace("/", "_")}@{version}'
            if prefix in seen:
                continue
            seen.add(prefix)
            for path in sorted(root.rglob('*')):
                relative = path.relative_to(root)
                if any(part in ('node_modules', '.git', 'target') for part in relative.parts):
                    continue
                gate.require(not path.is_symlink(), f'third-party source symlink needs review: {prefix}/{relative}')
                if path.is_file():
                    archive.add(path, arcname=f'{prefix}/{relative}', recursive=False)




def binary_inventory(root, targets):
    binaries = {}
    for target in targets:
        base = 'hennery-' + target
        archive = Path(root) / (base + '.tar.xz')
        with tarfile.open(archive, 'r:xz') as tar:
            members = tar.getmembers()
            expected = {base, base + '/hennery', base + '/LICENSE', base + '/README.md', base + '/THIRD-PARTY-NOTICES.txt'}
            gate.require(len(members) == len(expected) and {m.name.rstrip('/') for m in members} == expected,
                         'release archive content inventory differs')
            gate.require(all(m.isdir() if m.name.rstrip('/') == base else m.isfile() for m in members), 'release archive contains nonregular payload')
            data = tar.extractfile(base + '/hennery').read()
        sidecar = (Path(root) / (archive.name + '.sha256')).read_text().split()
        gate.require(sidecar == [gate.digest(archive.read_bytes()), archive.name], 'per-archive checksum sidecar differs')
        binaries[target] = {'sha256': gate.digest(data), 'size': len(data), 'archive': archive.name, 'member': base + '/hennery'}
    return binaries


def verify_binary_inventory(inventory, root):
    gate.require(inventory.get('binaries') == binary_inventory(root, inventory['targets']), 'approved binary inventory differs from archive bytes')


def required_payloads(channels, targets, tag):
    required = {'hennery-installer.sh', 'hennery.rb', 'hennery-source.tar.xz', 'dist-manifest.json',
                'THIRD-PARTY-NOTICES.txt', 'licence-findings.json', 'runtime-inventory.json', 'build-identity.json', 'release-notes.md'}
    for target in targets:
        base = 'hennery-' + target
        required.update({base + '.tar.xz', base + '.tar.xz.sha256', base + '.spdx.json',
                         target + '-third-party-source.tar.xz', target + '-builder.json', target + '-rust-advisories.json',
                         target + '-rust-advisory-revision.txt', target + '-web-advisories.json'})
    if 'crates' in channels:
        required.update(name + '-' + tag.removeprefix('v') + '.crate' for name in
                        ('hennery-proto', 'hennery-kernel', 'hennery-view', 'hennery-host', 'hennery-gateway', 'hennery-sessions', 'hennery'))
    if 'ghcr' in channels:
        required.update({'ghcr-index.json', 'ghcr-oci-layout.tar'})
    return required


def require_contract(root, channels, targets, tag):
    gate.require(set(channels) <= gate.CHANNELS and set(targets) <= gate.TARGETS, 'unqualified release channel/target')
    gate.require('-' not in tag or channels == ['github'], 'prerelease channels are GitHub only')
    gate.require(required_payloads(channels, targets, tag) <= {p.name for p in Path(root).iterdir()}, 'required release/channel payload missing')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['materials', 'freeze'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--target')
    parser.add_argument('--cargo-metadata', type=Path)
    parser.add_argument('--frontend-licences', type=Path)
    parser.add_argument('--channels', default='github')
    parser.add_argument('--targets', default=','.join(sorted(gate.TARGETS)))
    parser.add_argument('--tag')
    parser.add_argument('--run-id', type=int)
    parser.add_argument('--run-attempt', type=int)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if args.operation == 'materials':
        cargo = gate.strict_json(args.cargo_metadata.read_bytes())
        frontend = gate.strict_json(args.frontend_licences.read_bytes())
        packages, notices, findings = components(cargo, frontend)
        (args.output / 'THIRD-PARTY-NOTICES.txt').write_text(notices)
        (args.output / f'hennery-{args.target}.spdx.json').write_bytes(gate.canonical(spdx(packages, args.source_sha, args.target)))
        (args.output / 'licence-findings.json').write_bytes(gate.canonical({'findings': findings, 'scope': 'Rust and frontend including build/dev; assets and corresponding source still require maintainer review'}))
        dependency_sources(cargo, frontend, args.output / 'third-party-source.tar.xz')
        manifest = read_manifest()
        (args.output / 'runtime-inventory.json').write_bytes(gate.canonical({'adapter_manifest_sha256': gate.digest(manifest),
                                                                          'redistributed': False, 'manifest': gate.strict_json(manifest)}))
        ui = {str(p.relative_to('web/dist')): p.read_bytes() for p in Path('web/dist').rglob('*') if p.is_file()}
        gate.require('index.html' in ui, 'release UI missing')
        identity = {'source_sha': args.source_sha, 'ui_sha256': tree_digest(ui), 'adapter_manifest_sha256': gate.digest(manifest),
                    'cargo_lock_sha256': gate.digest(Path('Cargo.lock').read_bytes()), 'web_lock_sha256': gate.digest(Path('web/pnpm-lock.yaml').read_bytes())}
        (args.output / 'build-identity.json').write_bytes(gate.canonical(identity))
    else:
        gate.require(not (args.output / 'release-inventory.json').exists(), 'candidate already frozen')
        findings = gate.strict_json((args.output / 'licence-findings.json').read_bytes())
        gate.require(not findings['findings'], 'unresolved licence findings: maintainer review/materials required')
        require_contract(args.output, sorted(args.channels.split(',')), sorted(args.targets.split(',')), args.tag)
        manifest_path = args.output / 'dist-manifest.json'
        manifest = gate.strict_json(manifest_path.read_bytes())
        # Acyclic extension: native dist entries remain available to binstall;
        # the extension covers added material without hashing itself/checksums.
        manifest['hennery_release_materials'] = [{'name': p.name, 'sha256': gate.digest(p.read_bytes()), 'size': p.stat().st_size}
            for p in sorted(args.output.iterdir()) if p.name not in ('dist-manifest.json', 'sha256.sum', 'release-inventory.json')]
        manifest_path.write_bytes(gate.canonical(manifest))
        checksums(args.output)
        inventory = {'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': args.source_sha, 'tag': args.tag,
                     'channels': sorted(args.channels.split(',')), 'targets': sorted(args.targets.split(',')),
                     'candidate': {'run_id': args.run_id, 'run_attempt': args.run_attempt},
                     'artifacts': [{'name': p.name, 'sha256': gate.digest(p.read_bytes()), 'size': p.stat().st_size} for p in sorted(args.output.iterdir())]}
        gate.verify_files(inventory, args.output)
        inventory['binaries'] = binary_inventory(args.output, inventory['targets'])
        raw = gate.canonical(inventory)
        (args.output / 'release-inventory.json').write_bytes(raw)
        print(gate.digest(raw))


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, KeyError, OSError, ValueError) as error:
        raise SystemExit(f'release materials refused: {error}') from error
