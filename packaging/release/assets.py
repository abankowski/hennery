"""Six public assets; qualification and attestation inputs stay in Actions."""
from pathlib import Path

import contract
import gate
import supply

PUBLIC_CHECKSUMS = 'public-SHA256SUMS'
SBOM = 'hennery.spdx.json'


def names(targets):
    gate.require(targets and set(targets) <= gate.TARGETS, 'unqualified public targets')
    return sorted(['hennery-installer.sh', SBOM,
                   *['hennery-' + target + '.tar.xz' for target in targets]])


def prepare(root, source, targets):
    root = Path(root)
    packages = {}
    for target in targets:
        document = gate.strict_json(contract.regular(root / ('hennery-' + target + '.spdx.json')))
        for package in document['packages']:
            key = package['SPDXID']
            gate.require(key not in packages or packages[key] == package, 'conflicting combined SBOM component')
            packages[key] = package
    (root / SBOM).write_bytes(gate.canonical(supply.spdx([packages[key] for key in sorted(packages)], source, 'all-targets')))
    raw = ''.join(gate.digest(contract.regular(root / name)) + '  ' + name + '\n' for name in names(targets)).encode('ascii')
    contract.parse_checksums(raw)
    (root / PUBLIC_CHECKSUMS).write_bytes(raw)


def files(root, targets):
    root = Path(root)
    expected = names(targets)
    checksums = contract.parse_checksums(contract.regular(root / PUBLIC_CHECKSUMS))
    gate.require(checksums == {name: gate.digest(contract.regular(root / name)) for name in expected},
                 'public checksum inventory differs from frozen assets')
    return {contract.CHECKSUMS: (root / PUBLIC_CHECKSUMS).absolute(),
            **{name: (root / name).absolute() for name in expected}}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('source')
    parser.add_argument('--targets', required=True)
    args = parser.parse_args()
    prepare(args.root, args.source, args.targets.split(','))
