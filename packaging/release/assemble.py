#!/usr/bin/env python3
"""Merge native material without last-writer-wins artifact replacement."""
import argparse
from pathlib import Path
import shutil

import gate


def assemble(candidates, output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    notices, findings = [], []
    expected = {'candidate-' + t for t in gate.TARGETS}
    gate.require({p.name for p in Path(candidates).iterdir()} == expected, 'native candidate target set incomplete')
    for directory in sorted(Path(candidates).iterdir()):
        target = directory.name.removeprefix('candidate-')
        for path in sorted(directory.iterdir()):
            name = path.name
            gate.require(path.is_file() and not path.is_symlink(), 'nonregular native material')
            if name == 'THIRD-PARTY-NOTICES.txt':
                notices.append(f'\n===== {target} =====\n' + path.read_text())
                continue
            if name == 'licence-findings.json':
                findings.extend(gate.strict_json(path.read_bytes())['findings'])
                continue
            if name in ('builder.json', 'third-party-source.tar.xz', 'rust-advisories.json', 'rust-advisory-revision.txt', 'web-advisories.json'):
                name = target + '-' + name
            destination = output / name
            if destination.exists():
                gate.require(destination.read_bytes() == path.read_bytes(), f'conflicting candidate material: {name}')
            else:
                shutil.copyfile(path, destination)
    (output / 'THIRD-PARTY-NOTICES.txt').write_text(''.join(notices))
    (output / 'licence-findings.json').write_bytes(gate.canonical({'findings': sorted(set(findings))}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidates', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    assemble(args.candidates, args.output)
