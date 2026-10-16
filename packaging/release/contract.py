"""Signed-source, checksums and exact-run provenance for final release bytes."""
import re
from pathlib import Path
import subprocess

import gate
import workflow_policy

CHECKSUMS = 'SHA256SUMS'
METADATA = 'release-metadata.json'
BUNDLE = 'release.sigstore.jsonl'
WORKFLOW = '.github/workflows/release.yml'
TAG = r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?'
SHA = r'[0-9a-f]{40}'


def parse_checksums(raw):
    gate.require(isinstance(raw, bytes) and raw.endswith(b'\n'), 'checksum list must end with newline')
    try:
        lines = raw.decode('ascii').splitlines()
    except UnicodeError as error:
        raise gate.Refused('checksum list must be ASCII') from error
    entries, folded = {}, set()
    for line in lines:
        match = re.fullmatch(r'([0-9a-f]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)', line)
        gate.require(match is not None, 'malformed checksum entry')
        digest, name = match.groups()
        gate.require(name.casefold() not in (CHECKSUMS.casefold(), BUNDLE.casefold()) and name.casefold() not in folded,
                     'duplicate, ambiguous or cyclic checksum entry')
        entries[name] = digest
        folded.add(name.casefold())
    gate.require(entries and list(entries) == sorted(entries), 'checksum list must be nonempty and sorted')
    gate.require(raw == ''.join(f'{sha}  {name}\n' for name, sha in entries.items()).encode('ascii'),
                 'checksum list must use canonical lines')
    return entries


def selected_channels(raw, workflow):
    channels = gate.strict_json(raw)
    gate.require(isinstance(channels, list) and channels and all(isinstance(c, str) for c in channels), 'invalid channel selection')
    gate.require(channels == sorted(set(channels)) and set(channels) <= gate.CHANNELS and 'github' in channels,
                 'channel selection must be unique, known, sorted and include github')
    available = workflow_policy.candidate_channel_jobs(workflow)
    gate.require(set(channels) - {'github'} <= set(available), 'selected channel has no owning acceptance job')
    return channels


def attestation_command(subject, tag, source_sha, bundle, trusted_root=None):
    gate.require(isinstance(tag, str) and re.fullmatch(TAG, tag) and isinstance(source_sha, str)
                 and re.fullmatch(SHA, source_sha), 'invalid attestation tag/source binding')
    command = ['gh', 'attestation', 'verify', str(subject), '--repo', gate.REPOSITORY,
               '--cert-identity', f'https://github.com/{gate.REPOSITORY}/{WORKFLOW}@refs/tags/{tag}',
               '--source-ref', 'refs/tags/' + tag, '--source-digest', source_sha, '--signer-digest', source_sha,
               '--cert-oidc-issuer', 'https://token.actions.githubusercontent.com',
               '--predicate-type', 'https://slsa.dev/provenance/v1', '--deny-self-hosted-runners', '--format', 'json']
    if bundle is not None:
        command += ['--bundle', str(bundle)]
    if trusted_root is not None:
        command += ['--custom-trusted-root', str(trusted_root)]
    return command


def require_run(results, run_id, attesting_attempt):
    gate.require(type(run_id) is int and run_id > 0 and type(attesting_attempt) is int and attesting_attempt > 0,
                 'invalid attesting run/attempt')
    expected = f'https://github.com/{gate.REPOSITORY}/actions/runs/{run_id}/attempts/{attesting_attempt}'
    gate.require(isinstance(results, list) and results, 'no verified attestation results')
    for result in results:
        try:
            actual = result['verificationResult']['signature']['certificate']['runInvocationURI']
        except (KeyError, TypeError) as error:
            raise gate.Refused('verified certificate run invocation missing') from error
        gate.require(actual == expected, 'verified certificate belongs to another run/attesting attempt')
    return expected


def require_identity(results, tag, source_sha):
    # These fields come from the verified certificate, never the predicate.
    # The real pinned-CLI test must fail if upstream changes its JSON layout.
    expected = {'sourceRepositoryURI': 'https://github.com/' + gate.REPOSITORY,
                'buildSignerURI': f'https://github.com/{gate.REPOSITORY}/{WORKFLOW}@refs/tags/{tag}',
                'sourceRepositoryRef': 'refs/tags/' + tag, 'sourceRepositoryDigest': source_sha,
                'buildSignerDigest': source_sha, 'runnerEnvironment': 'github-hosted',
                'issuer': 'https://token.actions.githubusercontent.com'}
    gate.require(isinstance(results, list) and results, 'no verified identity results')
    for result in results:
        try:
            certificate = result['verificationResult']['signature']['certificate']
            gate.require(all(certificate.get(key) == value for key, value in expected.items()), 'verified certificate identity differs')
        except (KeyError, TypeError, AttributeError) as error:
            raise gate.Refused('verified certificate identity missing') from error


def regular(path):
    path = Path(path)
    gate.require(path.is_file() and not path.is_symlink(), 'missing/nonregular release file: ' + path.name)
    return path.read_bytes()


def verify_files(root):
    root = Path(root)
    gate.require(root.is_dir() and not root.is_symlink(), 'nonregular release directory')
    entries = parse_checksums(regular(root / CHECKSUMS))
    actual = {}
    for path in root.iterdir():
        data = regular(path)
        if path.name != CHECKSUMS:
            actual[path.name] = gate.digest(data)
    gate.require(actual == entries, 'release checksum closure incomplete or bytes changed')
    return entries


def validate_metadata(value):
    gate.require(isinstance(value, dict) and value.get('schema') == 2 and value.get('repository') == gate.REPOSITORY,
                 'invalid release metadata repository/schema')
    required = {'schema', 'repository', 'source_sha', 'tag', 'tag_object', 'channels', 'targets', 'attesting'}
    gate.require(required <= set(value) <= required | {'binaries'}, 'unexpected release metadata fields')
    gate.require(isinstance(value.get('tag'), str) and re.fullmatch(TAG, value['tag']), 'invalid release metadata tag')
    for field in ('source_sha', 'tag_object'):
        gate.require(isinstance(value.get(field), str) and re.fullmatch(SHA, value[field]), 'invalid release metadata ' + field)
    for field, allowed in [('channels', gate.CHANNELS), ('targets', gate.TARGETS)]:
        items = value.get(field)
        gate.require(isinstance(items, list) and items and all(isinstance(x, str) for x in items)
                     and items == sorted(set(items)) and set(items) <= allowed, 'invalid release metadata ' + field)
    gate.require('github' in value['channels'] and ('-' not in value['tag'] or value['channels'] == ['github']),
                 'prerelease channels must remain GitHub only')
    run = value.get('attesting')
    gate.require(isinstance(run, dict) and set(run) == {'run_id', 'run_attempt'}
                 and all(type(n) is int and n > 0 for n in run.values()), 'invalid attesting run metadata')
    return value


def freeze(root, metadata):
    root = Path(root)
    gate.require(not any((root / name).exists() or (root / name).is_symlink() for name in (METADATA, CHECKSUMS, BUNDLE)),
                 'release already frozen or cyclic sidecar present')
    validate_metadata(metadata)
    (root / METADATA).write_bytes(gate.canonical(metadata))
    entries = [(p.name, gate.digest(regular(p))) for p in sorted(root.iterdir())]
    raw = ''.join(f'{digest}  {name}\n' for name, digest in entries).encode('ascii')
    parse_checksums(raw)
    (root / CHECKSUMS).write_bytes(raw)
    verify_files(root)
    return gate.digest(raw)


def load(root):
    root = Path(root)
    entries = verify_files(root)
    value = validate_metadata(gate.strict_json(regular(root / METADATA)))
    # Derived view for channel validators. SHA256SUMS remains the only global
    # digest list on disk; metadata contains no duplicated payload inventory.
    return value | {'artifacts': [{'name': name, 'sha256': digest, 'size': len(regular(root / name))}
                                  for name, digest in entries.items()]}


def verify(root, tag, source_sha, bundle, run_id=None, attesting_attempt=None, trusted_root=None):
    import tag_signature
    root = Path(root)
    value = load(root)
    gate.require(value['tag'] == tag and value['source_sha'] == source_sha, 'release tag/source binding differs')
    run = value['attesting']
    if run_id is None:
        run_id = run['run_id']
    if attesting_attempt is None:
        attesting_attempt = run['run_attempt']
    gate.require(run == {'run_id': run_id, 'run_attempt': attesting_attempt}, 'release attesting run differs')
    tag_signature.verify(tag, source_sha, value['tag_object'])
    subjects = [CHECKSUMS] + [item['name'] for item in value['artifacts']]
    for subject in subjects:
        command = attestation_command(root / subject, tag, source_sha, bundle, trusted_root)
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        results = gate.strict_json(result.stdout)
        require_identity(results, tag, source_sha)
        require_run(results, run_id, attesting_attempt)
    gate.require(load(root) == value, 'release bytes changed during verification')
    return value
