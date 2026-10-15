#!/usr/bin/env python3
"""Verify downloaded final bytes before executing the cargo-dist installer."""
import argparse
from pathlib import Path
import re
import subprocess

import gate
import supply


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


def verify_image(image, tag, bundle=None, predicate_type='https://slsa.dev/provenance/v1'):
    gate.require(re.fullmatch(r'ghcr\.io/marcinwadon/hennery@sha256:[0-9a-f]{64}', image), 'verification requires an immutable image digest')
    gate.require(predicate_type in ('https://slsa.dev/provenance/v1', 'https://spdx.dev/Document'), 'unexpected attestation predicate')
    command = attestation_command('oci://' + image, tag, bundle) + ['--predicate-type', predicate_type]
    if bundle is None:
        command += ['--bundle-from-oci']
    subprocess.run(command, check=True)


def verify(candidate, bundle, source_sha, tag, signer_sha=None):
    candidate, bundle = Path(candidate), Path(bundle)
    inventory_path = candidate / 'release-inventory.json'
    # Verify the inventory signature first: hashes beside bytes alone do not
    # authenticate an author. The signer is the protected publication workflow.
    command = attestation_command(inventory_path, tag, bundle)
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
    subject = parser.add_mutually_exclusive_group(required=True)
    subject.add_argument('--candidate', type=Path)
    subject.add_argument('--image')
    parser.add_argument('--bundle', type=Path)
    parser.add_argument('--source-sha')
    parser.add_argument('--tag', required=True)
    parser.add_argument('--signer-sha')
    parser.add_argument('--predicate-type', default='https://slsa.dev/provenance/v1')
    args = parser.parse_args()
    if args.image:
        verify_image(args.image, args.tag, args.bundle, args.predicate_type)
    else:
        if args.bundle is None or args.source_sha is None:
            parser.error('file verification requires --bundle and --source-sha')
        verify(args.candidate, args.bundle, args.source_sha, args.tag, args.signer_sha)
