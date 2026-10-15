#!/usr/bin/env python3
"""Add acceptance tests to cargo-dist's formula before freezing; validate final bytes."""
import argparse
from pathlib import Path
import re

import gate

TEST_BLOCK = '''  test do
    assert_match version.to_s, shell_output("#{bin}/hennery --version")
    refute_match "hennery-web-ui-not-embedded", File.binread(bin/"hennery")
    assert_path_exists pkgshare/"THIRD-PARTY-NOTICES.txt"
  end
'''


def check(root, tag, targets, require_test=True):
    root = Path(root)
    gate.require(targets and len(set(targets)) == len(targets) and set(targets) <= gate.TARGETS,
                 'unqualified Homebrew targets')
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', tag), 'invalid Homebrew tag')
    path = root / 'hennery.rb'
    gate.require(path.is_file() and not path.is_symlink(), 'nonregular Homebrew formula')
    formula = path.read_text()
    gate.require(formula.startswith('class Hennery < Formula\n') and formula.endswith('\nend\n'), 'unexpected formula structure')
    versions = re.findall(r'^\s*version (.+)$', formula, re.M)
    gate.require(versions == ['"' + tag[1:] + '"'], 'formula version differs from candidate')
    gate.require(not re.search(r'\b(service|post_install)\b', formula), 'formula must not manage services or run post-install hooks')
    pairs = re.findall(r'^\s*url "([^"\n]+)"\n\s*sha256 "([0-9a-f]{64})"$', formula, re.M)
    gate.require(len(pairs) == len(targets) == len(re.findall(r'^\s*url\b', formula, re.M))
                 == len(re.findall(r'^\s*sha256\b', formula, re.M)), 'formula URL/checksum set incomplete or extra')
    expected = {}
    for target in targets:
        name = 'hennery-' + target + '.tar.xz'
        archive = root / name
        gate.require(archive.is_file() and not archive.is_symlink(), 'nonregular Homebrew archive')
        expected[f'https://github.com/{gate.REPOSITORY}/releases/download/{tag}/{name}'] = gate.digest(archive.read_bytes())
    gate.require(len(dict(pairs)) == len(pairs) and dict(pairs) == expected, 'formula URL or digest differs from candidate archives')
    if require_test:
        gate.require(formula.count(TEST_BLOCK) == 1, 'formula must carry the version, UI and notices test')
    return formula.encode()


def prepare(root, tag, targets):
    check(root, tag, targets, require_test=False)
    path = Path(root) / 'hennery.rb'
    formula = path.read_text()
    if TEST_BLOCK not in formula:
        path.write_text(formula[:-4] + TEST_BLOCK + 'end\n')
    check(root, tag, targets)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['prepare', 'check'])
    parser.add_argument('candidate', type=Path)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--targets', required=True)
    args = parser.parse_args()
    try:
        (prepare if args.operation == 'prepare' else check)(args.candidate, args.tag, args.targets.split(','))
    except (gate.Refused, OSError) as error:
        raise SystemExit(f'Homebrew refused: {error}') from error
