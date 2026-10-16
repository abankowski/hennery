#!/usr/bin/env python3
"""Audit Rust source inputs against Crane's actual materialized Nix fileset.

Literal include_str!/include_bytes! paths are resolved relative to their source.
All files in crate fixture directories are required too, including runtime
loaders with computed filenames. Unsupported include expressions fail closed.
Generated Rust text inside strings and comments is deliberately not scanned.
"""
import argparse
import json
import pathlib
import re
import sys


def tokens(text):
    result = []
    at = 0
    while at < len(text):
        if text[at].isspace():
            at += 1
        elif text.startswith('//', at):
            end = text.find('\n', at)
            at = len(text) if end < 0 else end + 1
        elif text.startswith('/*', at):
            depth = 1
            at += 2
            while depth and at < len(text):
                if text.startswith('/*', at):
                    depth += 1
                    at += 2
                elif text.startswith('*/', at):
                    depth -= 1
                    at += 2
                else:
                    at += 1
            if depth:
                raise ValueError('unterminated Rust comment')
        elif match := re.match(r'(?:b)?r(#+)?"', text[at:]):
            start = at + match.end()
            delimiter = '"' + (match[1] or '')
            end = text.find(delimiter, start)
            if end < 0:
                raise ValueError('unterminated Rust raw string')
            result.append(('string', text[start:end]))
            at = end + len(delimiter)
        elif match := re.match(r'(?:b)?"(?:\\.|[^"\\])*"', text[at:]):
            raw = match[0].removeprefix('b')
            # Non-JSON Rust escapes cannot occur in repository paths. Preserve
            # other strings as opaque so source snippets do not become macros.
            try:
                value = json.loads(raw)
            except ValueError:
                value = None
            result.append(('string', value))
            at += match.end()
        elif match := re.match(r"'(?:\\.|[^'\\])'", text[at:]):
            at += match.end()
        elif match := re.match(r'[A-Za-z_][A-Za-z_0-9]*', text[at:]):
            result.append(('word', match[0]))
            at += match.end()
        else:
            result.append(('punct', text[at]))
            at += 1
    return result


def required_paths(root):
    needed = set()
    for source in sorted((root / 'crates').rglob('*.rs')):
        stream = tokens(source.read_text())
        for i, token in enumerate(stream):
            if token not in [('word', 'include_str'), ('word', 'include_bytes')]:
                continue
            if stream[i + 1:i + 2] != [('punct', '!')]:
                continue
            args = stream[i + 2:i + 5]
            if (len(args) != 3 or args[0] != ('punct', '(')
                    or args[1][0] != 'string' or args[1][1] is None
                    or args[2] not in [('punct', ')'), ('punct', ',')]):
                raise ValueError(f'{source.relative_to(root)}: unsupported include expression; extend this checker explicitly')
            target = (source.parent / args[1][1]).resolve()
            if not target.is_relative_to(root):
                raise ValueError(f'{source.relative_to(root)}: include outside source root')
            needed.add(target.relative_to(root))
    # A computed runtime loader cannot hide an omitted golden recording.
    needed.update(p.relative_to(root) for p in (root / 'crates').rglob('*')
                  if p.is_file() and 'fixtures' in p.relative_to(root).parts)
    return needed


def check(root, filtered):
    missing = sorted(str(p) for p in required_paths(root) if not (filtered / p).is_file())
    if missing:
        raise ValueError('Nix source fileset omits required inputs:\n' + '\n'.join(missing))
    print(f'Nix source fileset covers {len(required_paths(root))} Rust includes and fixture inputs')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=pathlib.Path, required=True)
    parser.add_argument('--filtered', type=pathlib.Path, required=True)
    args = parser.parse_args()
    try:
        check(args.root.resolve(), args.filtered.resolve())
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
