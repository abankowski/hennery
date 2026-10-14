#!/usr/bin/env python3
"""Use cargo-dist's real installer with tiny executable fixtures (no cross build).

This tests refusal and publication semantics, never native binary compatibility.
Native candidate installer jobs separately exercise the real release archives.
"""
import argparse
import io
from pathlib import Path
import tarfile

import gate


def make(pristine, output):
    output.mkdir(parents=True, exist_ok=False)
    text = pristine.read_text()
    for target in sorted(gate.TARGETS):
        name = 'hennery-' + target
        archive = output / (name + '.tar.xz')
        with tarfile.open(archive, 'w:xz') as tar:
            directory = tarfile.TarInfo(name + '/')
            directory.type = tarfile.DIRTYPE
            tar.addfile(directory)
            data = b'#!/bin/sh\necho "hennery installer-test fixture"\n'
            binary = tarfile.TarInfo(name + '/hennery')
            binary.mode, binary.size = 0o755, len(data)
            tar.addfile(binary, io.BytesIO(data))
        sha = gate.digest(archive.read_bytes())
        (output / (archive.name + '.sha256')).write_text(sha + '  ' + archive.name + '\n')
        anchor = '"' + archive.name + '")'
        gate.require(text.count(anchor) == 1, 'cargo-dist archive arm changed')
        text = text.replace(anchor, anchor + '\n            _checksum_style="sha256"\n            _checksum_value="' + sha + '"')
    (output / 'hennery-installer.sh').write_text(text)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pristine', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    make(args.pristine, args.output)
