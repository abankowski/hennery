#!/usr/bin/env python3
"""Verify the fetched annotated tag with the history-pinned maintainer key."""
import argparse
from pathlib import Path
import re
import subprocess

import gate
import verifier_process

# Issuer fingerprint in signed commit 3b7b5f2d2af8821f4617afb08ba1dc766c5b9f14.
# The committed public key also verifies that historical commit. This is not
# GitHub's shared web-flow signing key B5690EEEBB952194.
FINGERPRINT = 'F26C7F594DFE84D131703AFC23E5A318AE8D2861'


def check_status(returncode, status):
    records = [line.split()[1:] for line in status.splitlines() if line.startswith('[GNUPG:] ')]
    valid = [r for r in records if r[0] == 'VALIDSIG']
    gate.require(returncode == 0 and len(valid) == 1 and valid[0][1] == FINGERPRINT and not any(r[0] in {'BADSIG', 'ERRSIG', 'REVKEYSIG', 'EXPKEYSIG', 'EXPSIG', 'KEYEXPIRED', 'SIGEXPIRED'} for r in records), 'release tag signature is missing, invalid, expired or not from the pinned maintainer key')


def verify(tag, source_sha, object_sha=None):
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', tag) and re.fullmatch('[0-9a-f]{40}', source_sha), 'invalid signed-tag binding')
    with verifier_process.environment() as environment:
        # Exclude checkout-local credential helpers, includes and remotes too.
        repository = Path(environment['HOME']) / 'source.git'
        options = dict(env=environment, capture_output=True, text=True)
        subprocess.run(['git', 'init', '--bare', '--template=', str(repository)], check=True, **options)
        git = ['git', '--git-dir=' + str(repository)]
        subprocess.run(git + ['fetch', '--no-tags', 'https://github.com/' + gate.REPOSITORY + '.git', 'refs/tags/' + tag], check=True, **options)
        fetched = subprocess.run(git + ['rev-parse', 'FETCH_HEAD'], check=True, **options).stdout.strip()
        gate.require(re.fullmatch('[0-9a-f]{40}', fetched) and (object_sha is None or fetched == object_sha), 'fetched release tag object changed')
        raw = subprocess.run(git + ['cat-file', 'tag', fetched], check=True, **options).stdout
        header = dict(line.split(' ', 1) for line in raw.split('\n\n', 1)[0].splitlines())
        gate.require(header.get('object') == source_sha and header.get('type') == 'commit' and header.get('tag') == tag, 'signed tag must directly identify the exact candidate commit')
        subprocess.run(['gpg', '--batch', '--no-autostart', '--import', str(Path(__file__).with_name('maintainer.asc'))], check=True, **options)
        result = subprocess.run(git + ['-c', 'gpg.format=openpgp', '-c', 'gpg.program=gpg', 'verify-tag', '--raw', fetched], **options)
        check_status(result.returncode, result.stderr)
    return {'object_sha': fetched, 'commit_sha': source_sha, 'tag': tag, 'fingerprint': FINGERPRINT}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--source-sha', required=True)
    args = parser.parse_args()
    print(gate.canonical(verify(args.tag, args.source_sha)).decode())
