# R2 — Homebrew tap

> Build first, then replay. Base `cbd002b0`; branch `plan/dist-homebrew`.
> No publication is authorized.

## Execution status

**Blocked in task 1.** The native cargo-dist build passed with the real UI;
local notices generation reported zero findings. Formula tests: six passed;
release suite: 135 passed. Eight cloned-copy guard probes were caught and the
restored six tests passed. The real scratch Homebrew install fetched the local
archive, then refused the host's Command Line Tools: macOS 27.0.1 requires
CLT 27 while CLT 26.6 is installed. No Xcode 27 installation is available to
select. The same isolated install was rerun to confirm this deterministic
refusal. No check was bypassed and no operator Homebrew/tools were changed.

Install/upgrade/uninstall are **not proven**. Task 2, final fresh replay and six
Rust checks remain pending; this is a partial executable record, not completed
R2. Parent infrastructure action is required before continuation. Independent
review and Linux/macOS CI remain required. Publication stays disabled.

## Scope

Distribution/release design §4.3 and R2: an actual isolated local-tap install,
upgrade and removal; a registered acceptance channel and protected exact-byte
publisher; service executable/PATH guidance. R1 owns hardware-backed inventory
approval, fresh run-attempt receipts, protected settings and retention. R3's
channel registry establishes the owning job contract.

Two tasks: (1) frozen formula tests and real Homebrew acceptance; (2) channel
integration, publisher, negative tests and guidance. No Homebrew core submission,
new platform qualification, second service manager or external publication.

## Decisions

- Tap: `marcinwadon/homebrew-tap`, created by the maintainer. Only
  `Formula/hennery.rb` is written by the publisher.
- A fine-grained contents token (or short-lived App installation token supplied
  through the same protected secret) is confined to that tap. No credential
  reaches candidate code, job environment or preflight steps.
- Formula bytes come from cargo-dist 0.30.4, with version/UI/notices tests added
  before freezing. Publication never regenerates or rewrites the formula.
- Homebrew 4.6.18 is pinned by commit. Each proof uses a fresh scratch prefix,
  home, tap, cache and config. Local URL substitution occurs only in the proof
  after checking original candidate hashes. The frozen candidate is rechecked.
- The older-keg fixture contains the same binary and synthetic version 0.0.0;
  the real upgrade proves package-manager behavior, not N-1 data migration.
- Homebrew installation never starts services or downloads agents. Operators
  explicitly reinstall their existing Hennery service after an upgrade and
  remove it before uninstalling. User data survives package removal.

## Global constraints

Plain Nix dev shells; no global installs, real Homebrew writes, real data,
registry login, tokens, GitHub API actions, releases or tag/tap pushes by this
builder. SSH push of this feature branch only. Never share Cargo targets.
Cloned-copy probes and one fresh final replay; six Rust checks once per plan.
Parent owns reviews and PR status. Retain scratch directories for the parent.

## Review focus

Credential scope/ordering; signed inventory and fresh receipt before credential;
exact frozen formula and public immutable archive integrity; atomic update and
partial-release reconciliation; channel ownership and optional skips; no
publication on merge; isolation and honest native-platform acceptance limits.

## File structure

Task 1: `packaging/release/homebrew.py`, `test_homebrew.py`,
`homebrew_accept.py`. Task 2: release workflows and registry/policy, protected
publisher and tests, README and service guidance. Exact source blocks follow
when implementation is complete; the plan itself is not recursively embedded.

## Task 1: Frozen formula and isolated Homebrew proof

### RED

Run the new formula tests before implementation; importing the missing helper
must fail. Add implementation, rerun green, build a native cargo-dist candidate
with real embedded UI and notices, and execute real Homebrew install/upgrade/
test/uninstall in a fresh scratch prefix. Compare installed executable bytes
and data/service sentinels; recheck original candidate hashes after removal.


### Exact task 1 source (partial implementation)

<!-- r2:file {"task": 1, "path": "packaging/release/test_homebrew.py", "sha256": "f68df3ffc5ca759a502bf12a16f282676e76dabce2e1ea11f7ae4c323bf40d9c", "size": 4500, "mode": "100644"} -->
```python
"""Frozen formula validation; never invokes Homebrew or a publication transport."""
from pathlib import Path
import tempfile
import unittest

import gate
import homebrew


class Formula(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.tag = 'v0.1.0'
        self.targets = sorted(gate.TARGETS)
        lines = ['class Hennery < Formula', '  version "0.1.0"']
        for target in self.targets:
            name = 'hennery-' + target + '.tar.xz'
            data = target.encode()
            (self.root / name).write_bytes(data)
            lines += [f'  url "https://github.com/{gate.REPOSITORY}/releases/download/{self.tag}/{name}"',
                      f'  sha256 "{gate.digest(data)}"']
        lines += ['  def install', '    bin.install "hennery"', '  end', 'end', '']
        self.original = '\n'.join(lines)
        self.path = self.root / 'hennery.rb'
        self.path.write_text(self.original)

    def prepare(self):
        homebrew.prepare(self.root, self.tag, self.targets)
        return self.path.read_text()

    def test_prepare_preserves_dist_formula_and_adds_executed_version_ui_test(self):
        result = self.prepare()
        self.assertEqual(result, self.original[:-4] + homebrew.TEST_BLOCK + 'end\n')
        self.assertIn('test do', result)
        self.assertIn('shell_output', result)
        self.assertIn('hennery-web-ui-not-embedded', result)
        homebrew.check(self.root, self.tag, self.targets)

    def test_prepare_is_idempotent(self):
        self.assertEqual(self.prepare(), self.prepare())

    def test_wrong_url_hash_version_or_hooks_refuse(self):
        valid = self.prepare()
        for bad in (valid.replace('github.com/', 'example.invalid/'),
                    valid.replace(gate.digest(self.targets[0].encode()), '0' * 64),
                    valid.replace('version "0.1.0"', 'version "9.0.0"'),
                    valid + '\nservice do\nend\n', valid + '\ndef post_install\nend\n',
                    valid.replace(homebrew.TEST_BLOCK, ''), valid + '\n  url "https://example.invalid/extra"\n',
                    valid.replace('sha256 "', 'sha256 "#{', 1)):
            self.path.write_text(bad)
            with self.subTest(bad=bad), self.assertRaises(gate.Refused):
                homebrew.check(self.root, self.tag, self.targets)

    def test_missing_or_changed_archive_refuses(self):
        self.prepare()
        path = self.root / ('hennery-' + self.targets[0] + '.tar.xz')
        path.write_bytes(b'changed')
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)
        path.unlink()
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)

    def test_nonregular_formula_and_archive_refuse(self):
        self.prepare()
        archive = self.root / ('hennery-' + self.targets[0] + '.tar.xz')
        data = archive.read_bytes(); archive.unlink()
        target = self.root / 'outside'; target.write_bytes(data); archive.symlink_to(target)
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)
        archive.unlink(); archive.write_bytes(data)
        data = self.path.read_bytes(); self.path.unlink(); target.write_bytes(data); self.path.symlink_to(target)
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)

    def test_platform_selection_must_be_nonempty_unique_and_qualified(self):
        self.prepare()
        # A self-consistent formula/archive for an unqualified platform must
        # fail the platform guard, independently of URL/hash validation.
        unsupported = 'x86_64-apple-darwin'
        previous = self.targets[0]
        path = self.root / ('hennery-' + previous + '.tar.xz')
        path.rename(self.root / ('hennery-' + unsupported + '.tar.xz'))
        self.path.write_text(self.path.read_text().replace(previous, unsupported))
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, [unsupported, *self.targets[1:]])
        for targets in ([], ['x86_64-apple-darwin'], [self.targets[0], self.targets[0]]):
            with self.subTest(targets=targets), self.assertRaises(gate.Refused):
                homebrew.check(self.root, self.tag, targets)


if __name__ == '__main__':
    unittest.main()
```

<!-- r2:file {"task": 1, "path": "packaging/release/homebrew.py", "sha256": "fc1b4a786099e3ab543732a925b244a2633d6ff4076af127ea7ba17c61accc50", "size": 3101, "mode": "100644"} -->
```python
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
```

<!-- r2:file {"task": 1, "path": "packaging/release/homebrew_accept.py", "sha256": "be2dac0ba0a9247945fb75fca8c8bb6b7afc92c949168d75589c2a20d6f0679d", "size": 6605, "mode": "100644"} -->
```python
#!/usr/bin/env python3
"""Real local-tap install/upgrade/remove in a fresh, pinned Homebrew prefix.

Only the URL origins are rewritten to local files, after original formula and
candidate digests are checked. The old formula uses the same candidate binary
with version 0.0.0: this proves Homebrew's upgrade transaction, not N-1 data
migration. No services, agents or registry credentials are used.
"""
import argparse
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess

import gate
import homebrew

BREW_COMMIT = '00001bedf8eac442bdabd327148be0b97998b27b'  # Homebrew 4.6.18
ROOT = Path(__file__).resolve().parents[2]


def run(candidate, work, brew_source=None):
    candidate, work = Path(candidate).resolve(), Path(work).resolve()
    raw = (candidate / 'release-inventory.json').read_bytes()
    inventory = gate.strict_json(raw)
    gate.verify_files(inventory, candidate)
    original = homebrew.check(candidate, inventory['tag'], inventory['targets']).decode()
    native = {('Darwin', 'arm64'): 'aarch64-apple-darwin', ('Linux', 'x86_64'): 'x86_64-unknown-linux-musl',
              ('Linux', 'aarch64'): 'aarch64-unknown-linux-musl'}.get((platform.system(), platform.machine()))
    gate.require(native in inventory['targets'], 'candidate has no qualified native Homebrew archive')
    work.mkdir(parents=True, exist_ok=False)
    prefix = work / 'prefix'
    env = {k: v for k, v in os.environ.items() if k in ('PATH', 'SSL_CERT_FILE', 'NIX_SSL_CERT_FILE', 'TMPDIR', 'TERM')}
    # Exclude the operator's package manager from every subprocess search path.
    env['PATH'] = ':'.join(p for p in env.get('PATH', '').split(':') if p.startswith('/nix/')) + ':/usr/bin:/bin:/usr/sbin:/sbin'
    for key, directory in {'HOME': 'home', 'XDG_CONFIG_HOME': 'config', 'XDG_DATA_HOME': 'data',
                           'XDG_CACHE_HOME': 'cache', 'HOMEBREW_CACHE': 'brew-cache', 'HOMEBREW_LOGS': 'logs',
                           'HOMEBREW_TEMP': 'tmp'}.items():
        env[key] = str(work / directory); Path(env[key]).mkdir()
    env.update(HOMEBREW_NO_AUTO_UPDATE='1', HOMEBREW_NO_ANALYTICS='1', HOMEBREW_NO_INSTALL_FROM_API='1',
               HOMEBREW_NO_INSTALL_CLEANUP='1', HOMEBREW_NO_ENV_HINTS='1', HOMEBREW_NO_GITHUB_API='1',
               HOMEBREW_NO_BOOTSNAP='1', HOMEBREW_NO_COLOR='1', HOMEBREW_NO_EMOJI='1', CI='1')
    def command(*args, capture=False):
        return subprocess.run(args, env=env, cwd=work, check=True, text=True,
                              stdout=subprocess.PIPE if capture else None).stdout
    source = str(Path(brew_source).resolve()) if brew_source else 'https://github.com/Homebrew/brew.git'
    args = ['git', 'clone', '--no-hardlinks']
    if not brew_source:
        args += ['--depth', '1', '--branch', '4.6.18']
    command(*args, source, str(prefix))
    gate.require(command('git', '-C', str(prefix), 'rev-parse', 'HEAD', capture=True).strip() == BREW_COMMIT,
                 'Homebrew source revision differs from pin')
    brew = str(prefix / 'bin/brew')
    gate.require(Path(command(brew, '--prefix', capture=True).strip()).resolve() == prefix, 'Homebrew escaped scratch prefix')
    gate.require(Path(command(brew, '--repository', capture=True).strip()).resolve() == prefix, 'Homebrew escaped scratch repository')
    env['PATH'] = str(prefix / 'bin') + ':' + env['PATH']
    tap = prefix / 'Library/Taps/marcinwadon/homebrew-tap'
    (tap / 'Formula').mkdir(parents=True)
    command('git', '-C', str(tap), 'init', '-q')
    command('git', '-C', str(tap), 'remote', 'add', 'origin', str(tap))
    formula = tap / 'Formula/hennery.rb'
    local = original
    for target in inventory['targets']:
        name = 'hennery-' + target + '.tar.xz'
        local = local.replace(f'https://github.com/{gate.REPOSITORY}/releases/download/{inventory["tag"]}/{name}', (candidate / name).as_uri())
    old = local.replace(f'version "{inventory["tag"][1:]}"', 'version "0.0.0"')
    formula.write_text(old)
    sentinels = [work / 'data/hennery/preserve', work / 'home/Library/LaunchAgents/hennery-preserve.plist']
    for path in sentinels:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b'operator-owned sentinel\n')
    # First install is a real older-keg fixture using the exact candidate payload.
    command(brew, 'install', '--formula', 'marcinwadon/tap/hennery')
    gate.require((prefix / 'Cellar/hennery/0.0.0/bin/hennery').is_file(), 'old keg missing')
    formula.write_text(local)
    command(brew, 'upgrade', '--formula', 'marcinwadon/tap/hennery')
    installed = prefix / 'bin/hennery'
    gate.require(installed.resolve().parent.parent.name == inventory['tag'][1:], 'upgrade did not select candidate keg')
    command(brew, 'test', 'marcinwadon/tap/hennery')
    # Compare installed native executable to the actual approved archive entry.
    import tarfile
    with tarfile.open(candidate / ('hennery-' + native + '.tar.xz')) as archive:
        entries = [m for m in archive.getmembers() if m.isfile() and m.name.endswith('/hennery')]
        gate.require(len(entries) == 1, 'candidate executable ambiguous')
        expected = archive.extractfile(entries[0]).read()
    gate.require(installed.read_bytes() == expected, 'Homebrew changed executable bytes')
    command(brew, 'uninstall', '--force', 'marcinwadon/tap/hennery')
    gate.require(not installed.exists() and not installed.is_symlink() and not (prefix / 'Cellar/hennery').exists(), 'uninstall left package files')
    gate.require(all(p.read_bytes() == b'operator-owned sentinel\n' for p in sentinels), 'package operation changed user data/service definitions')
    gate.require((candidate / 'release-inventory.json').read_bytes() == raw, 'acceptance changed frozen inventory')
    gate.verify_files(inventory, candidate)
    homebrew.check(candidate, inventory['tag'], inventory['targets'])
    report = {'brew_commit': BREW_COMMIT, 'native': native, 'inventory_sha256': gate.digest(raw),
              'install': '0.0.0 fixture', 'upgrade': inventory['tag'][1:], 'test': 'version/UI/notices',
              'uninstall': True, 'binary_unchanged': True, 'data_and_service_preserved': True}
    (work / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('work', type=Path)
    parser.add_argument('--brew-source', type=Path)
    args = parser.parse_args()
    run(args.candidate, args.work, args.brew_source)
```


## Task 2: Registered gated publication and operator guidance

### RED

Add channel-ownership, credential-ordering, remote-conflict and exact-byte
regressions; observe failure first. Add the owning acceptance job, protected
publisher and service/PATH guidance. Run workflow policy, actionlint and all
release tests. Revert each guard in a cloned copy and require refusal tests to
fail. Embed exact final files and replay both tasks from the base in a fresh
copy; require nonzero extraction and exact tracked tree/mode equality.

## After this plan

The maintainer must create the tap, scope/store its credential only in the
protected release environment, review the signed stable candidate, and enable
GitHub then Homebrew independently. The first alpha stays GitHub-only.
Acceptance on all claimed native platforms is mandatory before enabling the
channel; local macOS proof does not claim Linux success. R4 workflow changes
must be integrated additively after its merge. No publication is automatic.

Generated with Claude AI — please review before distribution.
