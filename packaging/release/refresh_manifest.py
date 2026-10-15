#!/usr/bin/env python3
"""After adding notices, update dist's build manifest before global generation."""
import hashlib
import json
from pathlib import Path
import sys


def refresh(manifest, archive):
    artifacts = manifest['artifacts']
    entry = artifacts[archive.name]
    # cargo-dist 0.30.4 consumes this digest for its installer and formula.
    entry['assets'].append({'name': 'THIRD-PARTY-NOTICES.txt', 'path': 'THIRD-PARTY-NOTICES.txt', 'kind': 'license'})
    entry.setdefault('checksums', {})['sha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
    return manifest


if __name__ == '__main__':
    path, archive = map(Path, sys.argv[1:])
    path.write_text(json.dumps(refresh(json.loads(path.read_text()), archive), indent=2) + '\n')
