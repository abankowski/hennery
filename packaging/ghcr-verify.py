#!/usr/bin/env python3
"""Verify exact held candidate/OCI bundles before credentials and registry writes."""
import argparse
import os
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).parent / 'release'))
import gate
import verify

PROVENANCE = 'https://slsa.dev/provenance/v1'
SPDX = 'https://spdx.dev/Document'
BUNDLE_TYPE = 'application/vnd.dev.sigstore.bundle.v0.3+json'


def candidate(root, signatures):
    inventory = gate.strict_json((root / 'release-inventory.json').read_bytes())
    verify.verify(root, signatures / 'release.sigstore.jsonl', inventory['source_sha'],
                  inventory['tag'], approval_signature=signatures / 'release-inventory.json.asc')
    return inventory


def subjects(work, bundles):
    index = gate.strict_json((work / 'verified.json').read_bytes())
    for subject, digest in [('index', index['digest']), *index['platforms'].items()]:
        for kind in (['provenance'] if subject == 'index' else ['provenance', 'image-sbom', 'binary-sbom']):
            yield subject, kind, digest, PROVENANCE if kind == 'provenance' else SPDX, bundles / f'ghcr-{subject}-{kind}.json'


def check(root, work, signatures, bundles, remote=False):
    inventory = candidate(root, signatures)
    gate.require(gate.strict_json((work / 'verified.json').read_bytes())
                 == gate.strict_json((root / 'ghcr-index.json').read_bytes()),
                 'working image must match the signed descriptor')
    for _, _, digest, predicate, bundle in subjects(work, bundles):
        gate.require(bundle.is_file() and not bundle.is_symlink(), 'missing/nonregular OCI verification bundle')
        manifest = None if remote else work / 'layout/blobs/sha256' / digest.removeprefix('sha256:')
        verify.verify_image('ghcr.io/marcinwadon/hennery@' + digest, inventory['tag'], bundle,
                            predicate, root, signatures / 'release-inventory.json.asc', manifest)
    return inventory


def publish(root, work, signatures, bundles):
    # Verify the complete set before the first registry write; verify again after
    # every gate so altered bundles cannot be published under a stale result.
    check(root, work, signatures, bundles)
    for subject, kind, digest, predicate, bundle in subjects(work, bundles):
        subprocess.run(['sh', 'packaging/ghcr-gate.sh', 'boundary',
                        f'ghcr-attach-{subject}-{kind}-{os.getpid()}.json'], check=True)
        check(root, work, signatures, bundles)
        subprocess.run(['oras', 'attach', '--registry-config', os.environ['REGISTRY_AUTH_FILE'],
                        '--artifact-type', BUNDLE_TYPE,
                        '--annotation', 'dev.sigstore.bundle.predicateType=' + predicate,
                        '--annotation', 'dev.sigstore.bundle.content=dsse-envelope',
                        'ghcr.io/marcinwadon/hennery@' + digest,
                        str(bundle) + ':' + BUNDLE_TYPE], check=True)
    check(root, work, signatures, bundles, remote=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['candidate', 'all', 'remote', 'publish'])
    args = parser.parse_args()
    root = Path(os.environ['RELEASE_CANDIDATE'])
    signatures = Path('signatures')
    if args.phase == 'candidate':
        candidate(root, signatures)
    else:
        work = Path(os.environ['IMAGE_CANDIDATE'])
        operation = publish if args.phase == 'publish' else check
        kwargs = {'remote': True} if args.phase == 'remote' else {}
        operation(root, work, signatures, Path('attestation-bundles'), **kwargs)


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.returncode) from None
