#!/usr/bin/env python3
"""Protected tap Contents API writer; imports and verification never publish.

No git push, formula regeneration, redirect, overwrite of the same release,
downgrade or automatic retry. Only the maintainer may enable this entry point.
"""
import argparse
import base64
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.error
import urllib.request

import gate
import homebrew
import publish

ROOT = Path(__file__).resolve().parents[2]
TAP_PATH = '/repos/marcinwadon/homebrew-tap/contents/Formula/hennery.rb'


def blob_sha(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw, usedforsecurity=False).hexdigest()


def load(candidate, digest):
    candidate = Path(candidate)
    raw = (candidate / 'release-inventory.json').read_bytes()
    inventory = gate.strict_json(raw)
    gate.require(raw == gate.canonical(inventory) and gate.digest(raw) == digest, 'Homebrew inventory digest changed')
    gate.verify_files(inventory, candidate)
    gate.require({'github', 'homebrew'} <= set(inventory['channels']), 'Homebrew and GitHub must both be approved')
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+', inventory['tag']), 'normal Homebrew formula requires a stable release')
    formula = homebrew.check(candidate, inventory['tag'], inventory['targets'])
    return inventory, formula


def run_gate(candidate, digest, phase):
    # CLI checks the YubiKey-backed signature, exact source/ref, live approvals,
    # current attempt, all owning acceptance jobs and retained candidate bytes.
    # It persists a held audit receipt before returning. No tap token is passed.
    env = {k: v for k, v in os.environ.items() if k != 'HOMEBREW_TAP_TOKEN'}
    with tempfile.TemporaryDirectory(prefix='homebrew-gate-') as tmp:
        subprocess.run([str(ROOT / 'packaging/release-gate'), 'homebrew', '--candidate', str(Path(candidate).resolve()),
                        '--inventory-sha256', digest, '--phase', phase, '--receipt', str(Path(tmp) / 'receipt.json')],
                       env=env, check=True)


def check_public_release(candidate, inventory):
    release = publish.api(f'/repos/{gate.REPOSITORY}/releases/tags/{inventory["tag"]}')
    gate.require(isinstance(release, dict) and release.get('tag_name') == inventory['tag']
                 and release.get('draft') is False and release.get('prerelease') is False
                 and release.get('immutable') is True, 'Homebrew requires a public immutable stable GitHub release')
    assets = publish.release_assets(release)
    gate.require(len({a['name'] for a in assets}) == len(assets), 'duplicate public release assets')
    expected = {'hennery.rb', 'release-inventory.json'} | {'hennery-' + t + '.tar.xz' for t in inventory['targets']}
    found = {a['name']: a for a in assets}
    gate.require(expected <= set(found), 'referenced public Homebrew artifacts are missing')
    for name in sorted(expected):
        gate.require(publish.asset_bytes(found[name]) == (Path(candidate) / name).read_bytes(), 'public Homebrew artifact differs: ' + name)


public_release = check_public_release


def tap_api(method='GET', data=None):
    gate.require(method in ('GET', 'PUT'), 'unsupported tap operation')
    headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    if method == 'PUT':
        token = os.environ.get('HOMEBREW_TAP_TOKEN')
        gate.require(token, 'protected tap credential absent')
        headers['Authorization'] = 'Bearer ' + token
        headers['Content-Type'] = 'application/json'
    # Public reads do not need the tap credential. Only this one fixed path
    # can receive it; the main-repository GH_TOKEN remains read-only.
    url = 'https://api.github.com' + TAP_PATH + ('?ref=main' if method == 'GET' else '')
    request = urllib.request.Request(url, method=method, data=gate.canonical(data) if data is not None else None, headers=headers)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
            return gate.strict_json(response.read())
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == 'GET':
            return None
        raise gate.Refused(f'tap HTTP {error.code}; reconcile manually before retry') from error
    except urllib.error.URLError as error:
        raise gate.Refused('ambiguous tap response; reconcile manually before retry') from error


def remote_bytes(remote):
    gate.require(isinstance(remote, dict) and remote.get('type') == 'file' and remote.get('path') == 'Formula/hennery.rb'
                 and remote.get('encoding') == 'base64', 'unexpected tap formula object')
    try:
        raw = base64.b64decode(''.join(remote['content'].splitlines()), validate=True)
    except (KeyError, TypeError, ValueError) as error:
        raise gate.Refused('invalid tap formula encoding') from error
    gate.require(remote.get('sha') == blob_sha(raw), 'tap formula blob digest differs')
    return raw


def version(raw):
    versions = re.findall(rb'^\s*version "([0-9]+)\.([0-9]+)\.([0-9]+)"$', raw, re.M)
    gate.require(len(versions) == 1, 'tap formula must have one stable version')
    return tuple(int(n) for n in versions[0])


def upload(candidate, digest):
    gate.require(os.environ.get('RELEASE_PUBLICATION_ENABLED') == 'true'
                 and os.environ.get('RELEASE_HOMEBREW_ENABLED') == 'true', 'Homebrew publication is disabled')
    inventory, frozen = load(candidate, digest)
    run_gate(candidate, digest, 'preflight')
    public_release(candidate, inventory)
    remote = tap_api('GET')
    if remote is not None:
        previous = remote_bytes(remote)
        if previous == frozen:
            return {'state': 'already-present', 'sha': remote['sha']}
        gate.require(version(previous) < version(frozen), 'tap same-version conflict or downgrade refused')
    payload = {'message': 'chore(formula): release hennery ' + inventory['tag'],
               'branch': 'main', 'content': base64.b64encode(frozen).decode(),
               'committer': {'name': 'Marcin Wadoń', 'email': 'marcin.wadon@gmail.com'}}
    if remote is not None:
        payload['sha'] = remote['sha']  # Atomic blob compare-and-swap, no force.
    run_gate(candidate, digest, 'boundary')
    current, current_formula = load(candidate, digest)
    gate.require(current == inventory and current_formula == frozen, 'formula changed at tap write boundary')
    public_release(candidate, current)
    result = tap_api('PUT', payload)
    gate.require(isinstance(result, dict) and result.get('content', {}).get('sha') == blob_sha(frozen)
                 and re.fullmatch('[0-9a-f]{40}', result.get('commit', {}).get('sha', '')), 'tap write was not confirmed')
    gate.require(remote_bytes(tap_api('GET')) == frozen, 'tap readback differs; reconcile manually')
    return {'state': 'published', 'commit': result['commit']['sha'], 'formula_sha256': gate.digest(frozen)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('candidate', type=Path)
    parser.add_argument('inventory_sha256')
    args = parser.parse_args()
    try:
        if args.verify:
            inventory, _ = load(args.candidate, args.inventory_sha256)
            run_gate(args.candidate, args.inventory_sha256, 'preflight')
            public_release(args.candidate, inventory)
            print('signed Homebrew candidate and public release bytes verified')
        else:
            print(gate.canonical(upload(args.candidate, args.inventory_sha256)).decode(), end='')
    except (gate.Refused, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'Homebrew publication refused: {error}') from error
