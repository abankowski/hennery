#!/usr/bin/env python3
"""Retain/recover candidates in S3 Object Lock storage provisioned by maintainer.

Never releases a legal hold or deletes/overwrites an object. AWS authority is
limited to the staging bucket, independent of publication credentials.
"""
import argparse
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import re
import subprocess

import gate


def aws(*args):
    completed = subprocess.run(['aws', 's3api', *args, '--output', 'json'], check=True, capture_output=True)
    return gate.strict_json(completed.stdout)


def check_lock(info):
    gate.require(info.get('VersionId') not in (None, '', 'null'), 'candidate storage is not versioned')
    gate.require(info.get('ObjectLockMode') == 'COMPLIANCE', 'candidate storage must use compliance retention')
    gate.require(info.get('ObjectLockLegalHoldStatus') == 'ON', 'candidate legal hold missing')
    try:
        until = datetime.fromisoformat(info.get('ObjectLockRetainUntilDate', '').replace('Z', '+00:00'))
        gate.require(until > datetime.now(timezone.utc), 'candidate retention expired')
    except (ValueError, TypeError) as error:
        raise gate.Refused('candidate retention missing') from error


def verify(receipt):
    gate.require(receipt.get('schema') == 1 and re.fullmatch('[0-9a-f]{64}', receipt.get('inventory_sha256', '')), 'invalid retention receipt')
    gate.require(re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', receipt.get('bucket', '')), 'invalid retention bucket')
    names = []
    for item in receipt.get('objects', []):
        name = item['name']
        gate.require(re.fullmatch('[A-Za-z0-9][A-Za-z0-9._-]*', name), 'unsafe retained artifact')
        gate.require(item['key'] == f"candidates/{receipt['inventory_sha256']}/{name}", 'retained object outside candidate namespace')
        gate.require(item['version'] not in ('', 'null', None), 'retained version absent')
        info = aws('head-object', '--bucket', receipt['bucket'], '--key', item['key'], '--version-id', item['version'])
        check_lock(info)
        gate.require(info['VersionId'] == item['version'], 'retained version changed')
        names.append(name)
    gate.require(names and len(names) == len(set(names)) and 'release-inventory.json' in names, 'incomplete/duplicate retention receipt')


def stage(root, bucket, inventory_sha256):
    root = Path(root)
    raw = (root / 'release-inventory.json').read_bytes()
    gate.require(gate.digest(raw) == inventory_sha256, 'inventory changed before retention')
    receipt = {'schema': 1, 'bucket': bucket, 'inventory_sha256': inventory_sha256, 'objects': []}
    until = (datetime.now(timezone.utc) + timedelta(days=365)).strftime('%Y-%m-%dT%H:%M:%SZ')
    for path in sorted(root.iterdir()):
        gate.require(path.is_file() and not path.is_symlink(), 'nonregular candidate cannot be retained')
        key = f'candidates/{inventory_sha256}/{path.name}'
        info = aws('put-object', '--bucket', bucket, '--key', key, '--body', str(path), '--if-none-match', '*',
                   '--object-lock-mode', 'COMPLIANCE', '--object-lock-retain-until-date', until,
                   '--object-lock-legal-hold-status', 'ON', '--checksum-algorithm', 'SHA256')
        receipt['objects'].append({'name': path.name, 'key': key, 'version': info['VersionId'], 'sha256': gate.digest(path.read_bytes())})
    verify(receipt)
    return receipt


def fetch(receipt, destination, inventory_sha256):
    gate.require(receipt.get('inventory_sha256') == inventory_sha256, 'retention receipt is for another inventory')
    verify(receipt)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    for item in receipt['objects']:
        path = destination / item['name']
        aws('get-object', '--bucket', receipt['bucket'], '--key', item['key'], '--version-id', item['version'], str(path))
        gate.require(path.is_file() and not path.is_symlink() and gate.digest(path.read_bytes()) == item['sha256'], 'retained bytes changed')
    raw = (destination / 'release-inventory.json').read_bytes()
    gate.require(gate.digest(raw) == inventory_sha256, 'retained inventory changed')
    gate.verify_files(gate.strict_json(raw), destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['stage', 'fetch', 'verify'])
    parser.add_argument('--candidate', type=Path)
    parser.add_argument('--bucket')
    parser.add_argument('--inventory-sha256', required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    if args.operation == 'stage':
        receipt = stage(args.candidate, args.bucket, args.inventory_sha256)
        # The receipt itself also gets an immutable, versioned, held object.
        with args.receipt.open('xb') as output:
            output.write(gate.canonical(receipt))
        aws('put-object', '--bucket', args.bucket, '--key', f'candidates/{args.inventory_sha256}/retention-receipt.json',
            '--body', str(args.receipt), '--if-none-match', '*', '--object-lock-mode', 'COMPLIANCE',
            '--object-lock-retain-until-date', (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            '--object-lock-legal-hold-status', 'ON', '--checksum-algorithm', 'SHA256')
    else:
        receipt = gate.strict_json(args.receipt.read_bytes())
        gate.require(receipt['inventory_sha256'] == args.inventory_sha256, 'retention inventory mismatch')
        if args.operation == 'fetch':
            fetch(receipt, args.candidate, args.inventory_sha256)
        else:
            verify(receipt)


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, KeyError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'candidate retention refused: {error}') from error
