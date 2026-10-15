#!/usr/bin/env python3
"""GitHub channel reconciliation/upload. Never overwrites or rebuilds payloads.

Only called by the protected manual workflow after live validation. This module
has no side effects on import; offline tests replace the transport entirely.
"""
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

import gate


def require_enabled():
    gate.require(os.environ.get('RELEASE_PUBLICATION_ENABLED') == 'true', 'publication is disabled')


def api(path, method='GET', data=None, content_type='application/json', binary=False):
    gate.require(path.startswith('/repos/' + gate.REPOSITORY + '/') and '..' not in path, 'invalid publication API path')
    host = 'https://uploads.github.com' if method == 'POST' and '/assets?' in path else 'https://api.github.com'
    request = urllib.request.Request(host + path, method=method, data=data,
                                     headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Content-Type': content_type,
                                              'Accept': 'application/octet-stream' if binary else 'application/vnd.github+json',
                                              'X-GitHub-Api-Version': '2022-11-28'})
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
            body = response.read()
            return body if binary else gate.strict_json(body)
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == 'GET' and not binary:
            return None
        if error.code in (301, 302, 303, 307, 308) and method == 'GET' and binary:
            location = error.headers.get('Location', '')
            url = urllib.parse.urlsplit(location)
            gate.require(url.scheme == 'https' and url.hostname in ('release-assets.githubusercontent.com', 'objects.githubusercontent.com')
                         and url.username is None and url.port in (None, 443), 'untrusted asset redirect')
            # No Authorization header goes to the signed object-store URL.
            with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(location), timeout=60) as response:
                return response.read()
        raise gate.Refused(f'publication API failed with HTTP {error.code}; reconcile before retry') from error
    except urllib.error.URLError as error:
        raise gate.Refused('ambiguous publication response; reconcile before retry') from error


def asset_bytes(asset):
    url = urllib.parse.urlsplit(asset['url'])
    gate.require(url.scheme == 'https' and url.netloc == 'api.github.com', 'invalid asset API URL')
    return api(url.path, binary=True)


def plan(expected, assets):
    gate.require(len({a['name'] for a in assets}) == len(assets), 'duplicate remote assets')
    gate.require({a['name'] for a in assets} <= set(expected), 'unapproved remote release assets')
    complete = []
    for asset in assets:
        data = asset_bytes(asset)
        gate.require(data is not None and gate.digest(data) == expected[asset['name']], f'remote artifact mismatch/unverifiable: {asset["name"]}')
        complete.append(asset['name'])
    return {'complete': sorted(complete), 'missing': sorted(set(expected) - set(complete))}


def validate_live(candidate, phase):
    event = gate.strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())['inputs']
    raw = (candidate / 'release-inventory.json').read_bytes()
    inventory = gate.strict_json(raw)
    gate.require(gate.digest(raw) == event['inventory_sha256'], 'candidate inventory changed at upload boundary')
    gate.require(os.environ.get('GITHUB_REPOSITORY') == gate.REPOSITORY and os.environ.get('GITHUB_REF') == 'refs/tags/' + inventory['tag'] and os.environ.get('GITHUB_SHA') == inventory['source_sha']
                 and os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'untrusted publication context')
    context = gate.binding(inventory, event['inventory_sha256'], int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']), event['settings_audit_sha256'])
    for key in ('source_sha', 'tag', 'channels', 'targets', 'candidate'):
        value = gate.strict_json(event[key]) if key in ('channels', 'targets', 'candidate') else event[key]
        gate.require(value == inventory[key], 'dispatch approval changed')
    gate.require('github' in inventory['channels'], 'GitHub channel not enabled')
    import approval
    proof = approval.verify_dispatch(candidate, event)
    gate.require(proof['inventory_sha256'] == event['inventory_sha256'], 'maintainer signature differs at publication boundary')
    receipt = gate.validate(inventory, event['inventory_sha256'], candidate, context, gate.GitHub(os.environ['GH_TOKEN']).evidence(inventory, context, gate.strict_json(event['settings_audit'])))
    receipt['phase'] = phase
    audit = Path('audit')
    audit.mkdir(exist_ok=True)
    path = audit / f'{phase}.json'
    with path.open('xb') as output:
        output.write(gate.canonical(receipt))
    # An authenticated, append-only audit record exists before any public write.
    import retention
    retention.audit(path, os.environ['RELEASE_AUDIT_BUCKET'], context['publishing']['run_id'], context['publishing']['run_attempt'])
    return inventory


def release_assets(release):
    if release is None:
        return []
    assets = []
    for page in range(1, 101):
        result = api(f'/repos/{gate.REPOSITORY}/releases/{release["id"]}/assets?per_page=100&page={page}')
        gate.require(isinstance(result, list), 'release asset listing unavailable')
        assets.extend(result)
        if len(result) < 100:
            return assets
    raise gate.Refused('incomplete release asset pagination')


def recover_bundle(path, data):
    if path.exists() or path.is_symlink():
        gate.require(path.is_file() and not path.is_symlink() and path.read_bytes() == data, 'recovered bundle differs from verified remote bytes')
    else:
        with path.open('xb') as output:
            output.write(data)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['reconcile', 'upload'])
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--signatures', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    inventory = gate.strict_json((args.candidate / 'release-inventory.json').read_bytes())
    gate.verify_files(inventory, args.candidate)
    # Signatures are verification sidecars, not inventory payloads (no cycles).
    bundle = args.signatures / 'release.sigstore.jsonl'
    gate.require(bundle.is_file() and not bundle.is_symlink(), 'downloadable attestation bundle missing')
    import approval
    approval_signature = args.signatures / 'release-inventory.json.asc'
    proof = approval.verify(args.candidate / 'release-inventory.json', approval_signature)
    gate.require(proof['inventory_sha256'] == gate.digest(gate.canonical(inventory)), 'maintainer approval differs from publication inventory')
    tag_path = '/repos/' + gate.REPOSITORY + '/releases/tags/' + urllib.parse.quote(inventory['tag'], safe='')
    release = api(tag_path)
    if release is not None:
        gate.require(release.get('tag_name') == inventory['tag'], 'remote release tag differs')
        gate.require(release.get('draft') is True or release.get('immutable') is True, 'published release must be immutable')
    assets = release_assets(release)
    import verify
    prior = [a for a in assets if a['name'] == 'release.sigstore.jsonl']
    if prior:
        gate.require(len(prior) == 1, 'duplicate remote attestation bundles')
        # A retry reuses a cryptographically verified existing bundle rather
        # than overwriting it with this attempt's different signing bytes.
        data = asset_bytes(prior[0])
        gate.require(data is not None, 'existing signature is unverifiable')
        bundle = recover_bundle(args.signatures / 'recovered-release.sigstore.jsonl', data)
        verify.verify(args.candidate, bundle, inventory['source_sha'], inventory['tag'], approval_signature=approval_signature)
    else:
        verify.verify(args.candidate, bundle, inventory['source_sha'], inventory['tag'], os.environ['GITHUB_SHA'], approval_signature)
    files = {p.name: p for p in args.candidate.iterdir()}
    files['release.sigstore.jsonl'] = bundle
    files['release-inventory.json.asc'] = approval_signature
    expected = {name: gate.digest(path.read_bytes()) for name, path in files.items()}
    gate.require(expected['release-inventory.json.asc'] == proof['signature_sha256'], 'maintainer signature changed before publication')
    reconciliation = plan(expected, release_assets(release))
    if args.operation == 'upload':
        require_enabled()
        gate.require(release is None or release.get('draft') is True or not reconciliation['missing'], 'immutable published release is incomplete; use a new version')
        if release is None:
            validate_live(args.candidate, 'create-release')
            release = api('/repos/' + gate.REPOSITORY + '/releases', method='POST', data=gate.canonical({
                'tag_name': inventory['tag'], 'target_commitish': inventory['source_sha'], 'name': inventory['tag'],
                'draft': True, 'prerelease': '-' in inventory['tag'], 'make_latest': 'false',
                'body': (args.candidate / 'release-notes.md').read_text() + '\n\nSource: https://github.com/' + gate.REPOSITORY + '/tree/' + inventory['source_sha'] + '\nInventory SHA-256: ' + gate.digest((args.candidate / 'release-inventory.json').read_bytes()) + '\n\nGenerated with Claude AI — please review before distribution.'}))
        for index, name in enumerate(reconciliation['missing']):
            # Revalidate both the platform and all retained bytes for EACH write.
            validate_live(args.candidate, f'upload-{index}')
            data = files[name].read_bytes()
            gate.require(gate.digest(data) == expected[name], 'upload bytes changed after approval')
            api(f'/repos/{gate.REPOSITORY}/releases/{release["id"]}/assets?name=' + urllib.parse.quote(name, safe=''),
                method='POST', data=data, content_type='application/octet-stream')
            verified = plan(expected, release_assets(release))
            gate.require(name in verified['complete'], 'upload acknowledgement did not produce matching remote bytes')
        reconciliation = plan(expected, release_assets(release))
        gate.require(not reconciliation['missing'], 'release incomplete; moving aliases and announcements remain held')
        if release.get('draft') is True:
            validate_live(args.candidate, 'publish-release')
            release = api(f'/repos/{gate.REPOSITORY}/releases/{release["id"]}', method='PATCH', data=gate.canonical({'draft': False, 'make_latest': 'false'}))
            gate.require(release.get('draft') is False and release.get('immutable') is True, 'release publication did not establish immutability')
    with args.output.open('xb') as output:
        output.write(gate.canonical(reconciliation))


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, OSError, KeyError, ValueError) as error:
        raise SystemExit(f'release publication refused: {error}') from error
