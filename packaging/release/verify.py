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


def verify_image(image, tag, bundle=None, predicate_type='https://slsa.dev/provenance/v1', candidate=None, approval_signature=None, manifest=None):
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
    subject = 'oci://' + image
    if manifest is not None:
        manifest = Path(manifest)
        gate.require(bundle is not None and manifest.is_file() and not manifest.is_symlink()
                     and 'sha256:' + gate.digest(manifest.read_bytes()) == image.split('@', 1)[1],
                     'local manifest must match the approved image digest and have a bundle')
        subject = manifest
    command = attestation_command(subject, tag, bundle) + ['--predicate-type', predicate_type]
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
    parser.add_argument('--manifest', type=Path, help='verify a local manifest against its exact approved digest before upload')
    parser.add_argument('--source-sha')
    parser.add_argument('--tag', required=True)
    parser.add_argument('--signer-sha')
    parser.add_argument('--predicate-type', default='https://slsa.dev/provenance/v1')
    args = parser.parse_args()
    if args.image:
        verify_image(args.image, args.tag, args.bundle, args.predicate_type, args.inventory_directory, args.approval_signature, args.manifest)
    else:
        if args.bundle is None or args.source_sha is None:
            parser.error('file verification requires --bundle and --source-sha')
        verify(args.candidate, args.bundle, args.source_sha, args.tag, args.signer_sha, args.approval_signature)
