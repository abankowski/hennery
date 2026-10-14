#!/usr/bin/env python3
"""Verify downloaded final bytes before executing the cargo-dist installer."""
import argparse
from pathlib import Path
import subprocess

import gate
import supply


def verify(candidate, bundle, source_sha, tag, signer_sha=None):
    candidate, bundle = Path(candidate), Path(bundle)
    inventory_path = candidate / 'release-inventory.json'
    # Verify the inventory signature first: hashes beside bytes alone do not
    # authenticate an author. The signer is the protected publication workflow.
    command = ['gh', 'attestation', 'verify', str(inventory_path), '--bundle', str(bundle), '--repo', gate.REPOSITORY,
               '--signer-workflow', gate.REPOSITORY + '/.github/workflows/release-publish.yml',
               '--source-ref', 'refs/heads/main', '--deny-self-hosted-runners']
    if signer_sha:
        command += ['--signer-digest', signer_sha]
    subprocess.run(command, check=True)
    inventory = gate.strict_json(inventory_path.read_bytes())
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
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--bundle', required=True, type=Path)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--signer-sha')
    args = parser.parse_args()
    verify(args.candidate, args.bundle, args.source_sha, args.tag, args.signer_sha)
