"""Run PR proof orchestration through the real material generator and finalizer."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import assemble
import gate
import workflow_policy
from adapter_manifest import read_manifest

ROOT = Path(__file__).resolve().parents[2]


class HomebrewProof(unittest.TestCase):
    def test_proof_produces_the_exact_release_native_layout(self):
        cases = [(target, None) for target in sorted(gate.TARGETS)]
        cases += [(sorted(gate.TARGETS)[0], failure) for failure in ('rust-audit', 'revision', 'web-audit')]
        for target, failure in cases:
            with self.subTest(target=target, failure=failure), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                shutil.copytree(ROOT / 'packaging', root / 'packaging', ignore=shutil.ignore_patterns('__pycache__'))
                shutil.copytree(ROOT / 'adapters', root / 'adapters')
                (root / 'adapters/manifest.json').write_bytes(read_manifest(ROOT))
                for name in ('Cargo.toml', 'Cargo.lock', 'README.md', 'CHANGELOG.md', 'LICENSE'):
                    shutil.copyfile(ROOT / name, root / name)
                (root / 'web').mkdir()
                shutil.copyfile(ROOT / 'web/pnpm-lock.yaml', root / 'web/pnpm-lock.yaml')
                tools = root / 'tools'; tools.mkdir()
                scratch = root / 'scratch'; scratch.mkdir()
                (root / 'home').mkdir()
                # Only external builds/downloads/audit services are fixtures.
                # The production scripts, supply generation, manifest refresh,
                # archive acceptance and strict pre-upload validator run intact.
                scripts = {
                    'cargo': 'print(\'{"packages":[]}\')',
                    'git': 'import os,sys\nif "-C" in sys.argv and os.environ.get("FAILURE") == "revision": raise SystemExit(64)\nprint("a" * 40)',
                    'rustc': 'print("fixture rustc")',
                    'nix': '''import os, sys
from pathlib import Path
args = sys.argv[1:]
if 'cargo-audit' in args:
    if os.environ.get('FAILURE') == 'rust-audit': raise SystemExit(64)
    print('{"vulnerabilities":{"count":0}}')
elif 'audit' in args or 'licenses' in args:
    if 'audit' in args and os.environ.get('FAILURE') == 'web-audit': raise SystemExit(64)
    print('{}')
elif args[:3] == ['develop', '.#web', '-c']:
    Path('web/dist').mkdir(parents=True, exist_ok=True)
    Path('web/dist/index.html').write_text('fixture UI')
else:
    raise SystemExit('unexpected nix call: ' + repr(args))
''',
                    'dist': '''import json, os, sys, tarfile
from pathlib import Path
if '--artifacts=global' in sys.argv:
    # Stop after the native check, before unrelated formula construction.
    raise SystemExit(73)
base = 'hennery-' + os.environ['TARGET']
output = Path('target/distrib'); output.mkdir(parents=True)
staging = output / base; staging.mkdir()
for name in ('README.md', 'CHANGELOG.md', 'LICENSE'):
    (staging / name).write_bytes(Path(name).read_bytes())
binary = staging / 'hennery'
binary.write_text('#!/bin/sh\\necho fixture hennery\\n'); binary.chmod(0o755)
with tarfile.open(output / (base + '.tar.xz'), 'w:xz') as archive:
    archive.add(staging, arcname=base)
print(json.dumps({'artifacts': {base + '.tar.xz': {'assets': []}}}))
''',
                }
                for name, body in scripts.items():
                    path = tools / name
                    path.write_text('#!' + sys.executable + '\n' + body + '\n')
                    path.chmod(0o755)
                (root / 'packaging/install-dist.sh').write_text(
                    '#!/bin/sh\nset -eu\nmkdir -p "$1"\ncp "$FIXTURE_TOOLS/dist" "$1/dist"\n')
                # A shell executable stands in for the platform-native binary;
                # linkage is orthogonal to the material/layout regression.
                (root / 'packaging/check-linkage.sh').write_text('#!/bin/sh\nexit 0\n')
                env = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ['PATH'],
                           FAILURE=failure or '',
                           FIXTURE_TOOLS=str(tools), HOME=str(root / 'home'),
                           XDG_CONFIG_HOME=str(root / 'home/config'), XDG_CACHE_HOME=str(root / 'home/cache'))
                env.pop('RUNNER_TEMP', None)  # Local callers supply the scratch argument instead.
                result = subprocess.run(['sh', 'packaging/release/homebrew-proof.sh', target, str(scratch)],
                                        cwd=root, env=env, capture_output=True, text=True)
                if failure:
                    self.assertEqual(result.returncode, 64, result.stdout + result.stderr)
                    self.assertFalse((root / 'target/distrib').exists())
                    continue
                self.assertEqual(result.returncode, 73, result.stdout + result.stderr)
                directory = root / 'target/distrib'
                assemble.check_native(directory, target)
                self.assertEqual({p.name for p in directory.iterdir()},
                                 assemble.native_files(target) | {'hennery-' + target})
                self.assertEqual(gate.strict_json((directory / 'rust-advisories.json').read_bytes()),
                                 {'vulnerabilities': {'count': 0}})
                self.assertEqual((directory / 'rust-advisory-revision.txt').read_text().strip(), 'a' * 40)
                self.assertEqual(gate.strict_json((directory / 'web-advisories.json').read_bytes()), {})

    def test_release_and_proof_use_the_same_advisory_material_producer(self):
        real = workflow_policy.load_workflow((ROOT / '.github/workflows/release.yml').read_bytes())
        command = 'sh packaging/release/advisory-materials.sh'
        self.assertEqual(next(s for s in real['jobs']['archive']['steps']
                              if s.get('name') == 'Current advisory databases; findings stop candidate creation')['run'].strip(), command)
        proof = (ROOT / 'packaging/release/homebrew-proof.sh').read_text()
        self.assertLess(proof.index(command), proof.index('sh packaging/release/native-archive.sh'))
