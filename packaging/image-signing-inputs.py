#!/usr/bin/env python3
"""Extract subjects/SBOM predicates from already verified retained OCI bytes."""
import json
from pathlib import Path
import sys
import tarfile
import io
from image import blob, manifests, require

root, subject, output = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
index = json.loads((root / 'index.json').read_bytes())
output.mkdir(parents=True, exist_ok=False)
if subject == 'index':
    require(len(index['manifests']) == 1, 'missing retained index descriptor')
    print('digest=' + index['manifests'][0]['digest'])
else:
    entries = list(manifests(root, index))
    runtime = [(d, m) for d, m in entries if d.get('platform', {}).get('architecture') == subject
               and d.get('platform', {}).get('os') == 'linux']
    require(len(runtime) == 1, 'missing signing platform')
    desc, manifest = runtime[0]
    print('digest=' + desc['digest'])
    count = 0
    for att, body in entries:
        if att.get('annotations', {}).get('vnd.docker.reference.digest') != desc['digest']:
            continue
        for layer in body['layers']:
            statement = json.loads(blob(root, layer))
            if statement.get('predicateType') == 'https://spdx.dev/Document':
                (output / 'image.spdx.json').write_text(json.dumps(statement['predicate']))
                count += 1
    require(count == 1, 'expected one image SBOM')
    binary_bom = None
    for layer in manifest['layers']:
        with tarfile.open(fileobj=io.BytesIO(blob(root, layer)), mode='r:*') as archive:
            for member in archive:
                if member.name.removeprefix('./').lstrip('/') == 'usr/share/doc/hennery/binary.spdx.json':
                    require(member.isfile(), 'non-regular binary SBOM')
                    binary_bom = archive.extractfile(member).read()
    require(binary_bom, 'missing binary SBOM')
    (output / 'binary.spdx.json').write_bytes(binary_bom)
