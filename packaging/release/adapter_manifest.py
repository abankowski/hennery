#!/usr/bin/env python3
"""Resolve the adapter manifest across the R3 source-layout transition.

Hash the original bytes, never a reserialized JSON document. A temporary tree
containing both layouts is accepted only when both files are byte-identical.
"""
import argparse
import hashlib
from pathlib import Path


def read_manifest(root=Path('.')):
    root = Path(root)
    paths = [root / name for name in ('adapters/manifest.json', 'crates/hennery-host/manifest.json')]
    present = [path for path in paths if path.is_file()]
    if not present:
        raise ValueError('adapter manifest missing in both supported locations')
    raw = present[0].read_bytes()
    if any(path.read_bytes() != raw for path in present[1:]):
        raise ValueError('adapter manifest locations disagree')
    return raw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha256', action='store_true', required=True)
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    print(hashlib.sha256(read_manifest(args.root)).hexdigest())


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(f'adapter manifest refused: {error}') from error
