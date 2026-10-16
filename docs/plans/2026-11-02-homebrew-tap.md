# R2 — Homebrew tap

> Build first, then replay. Base `cbd002b0`; branch `plan/dist-homebrew`.
> Built code: `71bc4a2b`; initial task 1: `31979159`; review amendment: `cabc7420`.
> Parent rebase: main `6cb867c6`, head `d04c32fe`; native CI amendment: `12b11772`.
> No publication is authorized.

## Execution status

Implementation and both amendments are built and locally checked. The parent
reported scheduling re-review APPROVE, then rebased onto main `6cb867c6` with an
identical range-diff and pushed `d04c32fe`. The branch was pulled before task 4.
PR #155's three native jobs then installed the labelled old fixture successfully
but all failed the whole-stdout version comparison. Task 4 corrects that check,
binds the reported source commit, and proves a separate candidate-version
install before seeding the lower upgrade fixture. Its native CI rerun remains
pending. Local CLT refusal evidence remains intact; no successful complete local
Homebrew transaction is claimed. Publication stays disabled; merge never
authorizes publication.

The original build's six Rust gates exited 0: fmt, both Clippy modes, workspace
tests (2,376 passed, one pre-existing ignored test, 161 suite summaries), and both generator
checks. Its release Python suite passed 163 tests. Workflow policy,
actionlint on all four release workflows and shellcheck on both new shell
helpers exited 0. Guard probes ran in copies with APFS-cloned targets: nine
formula guards, 27 publication/registry/scope/smoke guards,
one selected-channel contract guard and two credential-alias guards were
caught; restored suites passed. Python mutation runs use isolated bytecode
cache prefixes so stale code cannot invalidate a probe.

Fresh replay completed at the end of the build: 26 extracted blocks;
both tasks RED first, then GREEN; final release suite 163 passed; workflow
policy and actionlint exited 0. The complete tracked tree and file modes match
across 842 files, including this execution record. The replay
used an APFS-cloned target and did not repeat the full Rust suite.

The amendment passed 171 release tests, workflow policy, actionlint on all five
release workflows, shellcheck on both archive helpers, and 15 additional caught
probes in a copy with an APFS-cloned target. Its tests were seen RED first.
The amendment does not change Rust; the verification budget and parent ruling
exclude another full replay or Rust run. The original replay remains historical
evidence for tasks 1/2. The new secret-free scheduling workflow runs on PR pushes;
its actual Actions result remains pending parent relay.

The native CI amendment passed 175 release tests, workflow policy and actionlint
on all five workflows. Seven focused tests were seen RED first and passed after
the fix. Thirteen new guard probes were caught in a copy with an APFS-cloned
target; the restored suite passed and all three source files matched the tested
and staged bytes. No Rust code changed; no full replay or Rust run was repeated.
These are offline harness checks, not a substitute for the real native CI rerun.

Local evidence, retained in the ledger:
- Native cargo-dist build and web build succeeded. Generated notices had zero
  missing-licence findings. Scratch Homebrew 4.6.18 fetched the local archive,
  then twice refused macOS 27.0.1 with CLT 26.6: “Your Command Line Tools are too
  outdated. Install the Command Line Tools for Xcode 27”. No check was bypassed.
- Running the shared release archive finalizer with local Nix Rust also exposed
  a Nix libiconv dependency, which the unchanged release linkage check refused.
  The unqualified artifact was never promoted. Global formula preparation and
  unsigned proof-manifest creation were separately exercised as data-format
  checks, without claiming native acceptance.
- CI uses R1's pinned upstream Rust 1.98.1 and installed native targets, with
  Nix supplying the pinned web tools. This preserves the actual release build
  environment rather than accepting Nix-only runtime dependencies.

The parent owns PR creation, checks, reviewDecision, mergeStateStatus and all
unresolved threads. No GitHub API/gh action, actual publication, tap/tag push,
registry login, real credential, maintainer-key operation or real data/service
change was performed by this builder. Only this feature branch is pushed.

## Scope

Distribution/release design §4.3 and R2: real local-tap install/smoke/upgrade/
uninstall acceptance on each advertised platform, a registered owning channel,
protected exact-byte publication, and service executable/PATH guidance.

R1's “After this plan” obligations remain: hardware-backed inventory approval,
exact source/tag and run-attempt binding, protected settings and retention,
public immutable releases and native qualification before enablement. R3's
channel registry supplies the owning-job contract; this plan extends it without
changing R1's runtime evidence algorithm or weakening other channels.

Two initial tasks and two review amendments:

1. Frozen formula checks and an isolated actual Homebrew acceptance harness.
2. Shared release/PR native archive build, three-platform proof CI, owning job,
   signed protected publication, negative tests and operator guidance.
3. Review amendment: explicit optional-channel scheduling and a real Actions regression.
4. Native CI amendment: multiline version/source checks and a candidate-version install.

Out: Homebrew core, new platform qualification, a second service manager,
automatic publication, token minting, actual releases, and application N-1 data
migration. Initial prereleases remain GitHub-only.

## Decisions

- The maintainer creates `marcinwadon/homebrew-tap`, with a `main` branch. Only
  `Formula/hennery.rb` is updated. An atomic Contents API update includes the
  previous blob SHA; no branch force-push or automatic retry is used.
- Use a tap-only fine-grained PAT or valid App installation token, stored only
  as `RELEASE_HOMEBREW_TOKEN` in protected `release`. The audit requires the
  maintainer's explicit scope observation: only this tap, contents write,
  no workflow/admin permission. CI cannot independently infer token rights.
  App-token expiry/refresh and rotation remain maintainer responsibilities.
- The signed inventory and fresh gate receipts precede credential exposure.
  The final writer rechecks live approval with the tap token excluded from the
  gate subprocess, and verifies the public immutable release at its boundary.
- cargo-dist 0.30.4 generates the formula; acceptance tests are added before
  freezing. Validation reads raw UTF-8 bytes, rejecting CRLF instead of silently
  normalizing them. Publication uploads the frozen bytes and never regenerates.
- Homebrew 4.6.18 is pinned to
  `00001bedf8eac442bdabd327148be0b97998b27b`. Each acceptance uses a fresh prefix,
  home, cache, config and file-based local tap. Only the proof's copy has its
  URLs rewritten to file URLs, after original digests are checked. Candidate
  bytes are rechecked after removal. No real tap or operator brew is touched.
- The older-keg fixture contains the same candidate binary with a formula
  version of 0.0.0. Install and upgrade both execute version and byte smoke
  checks; the upgraded formula's tests check version, UI and notices. This
  proves Homebrew's transaction, not an older application's migration.
- Advertised native matrix: macOS arm64, Linux x86_64 musl and Linux arm64 musl.
  The PR proof runs on macos-15, ubuntu-24.04 and ubuntu-24.04-arm. The candidate
  proof consumes the complete frozen candidate on those same native runners.
- The owning aggregate is exactly `homebrew`. Unselected native jobs succeed
  as explicit no-ops; only the registered aggregate may be skipped. Selected
  native failures/skips make publication refuse. The first alpha remains
  selectable as GitHub-only with the Homebrew aggregate skipped.
- Package operations never install agents or start services. Use the existing
  Hennery service installer with a stable Homebrew link and login-shell PATH;
  refresh the same role/data directory to restart after upgrade. Remove the
  service explicitly before uninstalling package files. Data is preserved.

## Global constraints

Plain Nix development shells for local tools, no global installs, no shared
Cargo target. Probe/replay copies get APFS-cloned targets. One final fresh replay
and one full workspace test run; no timing/concurrency changes, so no load run.
Pinned actions, timeouts, read-only ordinary job tokens, no secrets in PR proofs,
no restored candidate caches, protected manual publication and both switches
off by default. Personal author identity and signing disabled per command.
No memory writes, deletion of scratch trees, parent checkout edits, real data,
registry login, actual publication, tap/tag pushes or GitHub API actions.
Parent-only independent reviews; this builder does not approve its own work.

## Review focus

Credential confinement and ordering; hardware-root and current attempt binding;
exact raw frozen formula and immutable public archive/inventory integrity;
atomic update, same-version conflict/downgrade refusal, idempotent reconciliation
and ambiguous responses; channel registry ownership and optional matrix skips;
three-platform CI proof and original candidate immutability; no publication on
merge; service PATH/Cellar restart guidance. Reconcile R4 additively when it
lands, preserving its GHCR credential detectors and gate integration.

## File structure and extraction

Each `r2:file` block below records task, path, decoded SHA-256, byte length,
mode, encoding and tests/feature phase. Code is verbatim UTF-8; fence lengths
exceed any fence in the source. The plan itself is not recursively embedded.
Task 1 preserves its initial implementation exactly; task 2 overwrites those
files with their final form and adds the integration. The replay must extract
more than zero blocks, observe RED before implementation for both tasks, run
GREEN after each task, and compare the complete tracked tree and modes.

## Task 1: Frozen formula and isolated Homebrew proof

### Step 1 — RED

Apply task 1's tests block, then run inside the release dev shell:
`python3 -m unittest discover -s packaging/release -p test_homebrew.py`.
Expected: nonzero, missing `homebrew` implementation. Observed locally: exit 1.

### Step 2 — implementation and GREEN

Apply the other task 1 blocks. Rerun the same command: six tests pass. Build a
real native cargo-dist archive and UI, add notices and run the harness in a
fresh scratch prefix. This local run is the documented CLT refusal, not a
claimed success. The parent ruling assigns the real native proof to task 2 CI.

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew.py", "phase": "tests", "sha256": "f68df3ffc5ca759a502bf12a16f282676e76dabce2e1ea11f7ae4c323bf40d9c", "size": 4500, "task": 1} -->
```text
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

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/homebrew.py", "phase": "feature", "sha256": "fc1b4a786099e3ab543732a925b244a2633d6ff4076af127ea7ba17c61accc50", "size": 3101, "task": 1} -->
```text
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

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/homebrew_accept.py", "phase": "feature", "sha256": "be2dac0ba0a9247945fb75fca8c8bb6b7afc92c949168d75589c2a20d6f0679d", "size": 6605, "task": 1} -->
```text
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


## Task 2: Native CI, owning channel, gated publication and guidance

### Step 1 — RED

Apply all task 2 test blocks before the feature blocks. Run the Homebrew test
bank in the release dev shell. Expected: failure for absent publisher, owning
workflow/channel and enhanced harness. The initial local bank exited 1; scoped
scope-audit, harness, raw-byte and credential-alias regressions also failed
first. The raw-byte case observed an assertion failure before replacing the
universal-newline reader. The scope audit had ten independent refusal failures;
the workflow-level secret alias regression had four.

### Step 2 — implementation and GREEN

Apply all remaining task 2 blocks. Run:
- `nix develop .#release -c python3 -m unittest discover -s packaging/release -p 'test_*.py'`
- `nix develop .#release -c python3 packaging/release/workflow_policy.py`
- `nix develop .#release -c actionlint .github/workflows/release-candidate.yml .github/workflows/release-publish.yml .github/workflows/release-tests.yml .github/workflows/release-homebrew.yml`
- shellcheck on `packaging/release/native-archive.sh` and `homebrew-proof.sh`.

Run the six Rust checks listed in AGENTS.md once for the plan. The PR workflow
runs `homebrew-proof.sh` with the same upstream Rust/targets as R1 and pinned
Nix web tools, then executes `homebrew_accept.py`. The release workflow uses
the same native archive helper and accepts the final complete frozen candidate;
its signed owning-job evidence is mandatory when Homebrew is selected. CI
executes all three exact guide shell blocks, compares both installed binaries
with the archive, and checks package leftovers and retained data/service
sentinels. No publisher credential is present in either acceptance workflow.

### Step 3 — probes and fresh replay

Run guard removals only in copies, never in the working tree. Require semantic
test failures and restore/recheck green. Use isolated Python bytecode prefixes.
Extract this plan into a new checkout at the base; clone target before any
build. For each task apply tests, see RED, apply implementation, see GREEN.
Run release tests and workflow checks on the final tree. Require nonzero block
extraction and exact tracked byte/mode equality, then copy this execution record
and compare the complete tree again. Check staged bytes match the tested bytes.

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": ".github/workflows/release-candidate.yml", "phase": "feature", "sha256": "119e62fc3a9fb45974718ee1ac7046650ab67a135b6688472265175299934a3c", "size": 16407, "task": 2} -->
```text
name: release-candidate
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      tag:
        description: Annotated approved release tag; candidate creation only
        required: true
        type: string
      channels:
        description: Comma-separated channels; first alpha is github only
        default: github
        required: true
        type: string
permissions:
  contents: read
concurrency:
  group: release-candidate-${{ github.event.inputs.tag || github.ref }}-${{ github.run_id }}
  cancel-in-progress: false
jobs:
  tag-signature:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
      - name: Verify pinned maintainer signature and exact candidate SHA before storage credentials
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: nix develop .#release -c python3 packaging/release/tag_signature.py --tag "$RELEASE_TAG" --source-sha "$GITHUB_SHA"
  web-ui:
    needs: tag-signature
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Build the UI once from the pinned lock
        run: nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: release-ui
          retention-days: 90
          if-no-files-found: error
          path: web/dist/
  archive:
    needs: web-ui
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-unknown-linux-musl
            runner: ubuntu-24.04
            image: amd64
          - target: aarch64-unknown-linux-musl
            runner: ubuntu-24.04-arm
            image: arm64
          - target: aarch64-apple-darwin
            runner: macos-15
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - name: Annotated tag, exact source and workspace version
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: |
          test "$(git cat-file -t "$RELEASE_TAG")" = tag
          source_sha=$(git rev-parse "$RELEASE_TAG^{commit}")
          test "$source_sha" = "$(git rev-parse HEAD)"
          echo "RELEASE_SOURCE_SHA=$source_sha" >> "$GITHUB_ENV"
          python3 -c 'import os,tomllib; from pathlib import Path; v=tomllib.loads(Path("Cargo.toml").read_text())["workspace"]["package"]["version"]; assert os.environ["RELEASE_TAG"] == "v"+v'
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: 1.98.1
          targets: ${{ matrix.target }}
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Native build tools
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y musl-tools
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: release-ui
          path: web/dist/
      - name: Pinned dist and source and licence inputs
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web licenses list --json > frontend-licences.json'
          cargo metadata --locked --all-features --filter-platform '${{ matrix.target }}' --format-version=1 > cargo-metadata.json
          nix develop .#release -c python3 packaging/release/supply.py materials --output release-materials \
            --source-sha "$RELEASE_SOURCE_SHA" --target '${{ matrix.target }}' \
            --cargo-metadata cargo-metadata.json --frontend-licences frontend-licences.json
      - name: Current advisory databases; findings stop candidate creation
        run: |
          nix develop .#release -c cargo-audit audit --file Cargo.lock --db "$RUNNER_TEMP/release-advisories" --json > release-materials/rust-advisories.json
          git -C "$RUNNER_TEMP/release-advisories" rev-parse HEAD > release-materials/rust-advisory-revision.txt
          nix develop .#web -c pnpm --dir web audit --json > release-materials/web-advisories.json
      - name: Build fresh final archive with notices
        env:
          HENNERY_WEB_REQUIRE: '1'
        run: |
          python3 - <<'PY' >> "$GITHUB_ENV"
          import json
          i=json.load(open('release-materials/build-identity.json'))
          for key, field in [('HENNERY_BUILD_SOURCE_SHA','source_sha'),('HENNERY_BUILD_UI_SHA256','ui_sha256'),('HENNERY_BUILD_MANIFEST_SHA256','adapter_manifest_sha256')]:
              print(key+'='+i[field])
          PY
      - name: Archive and content acceptance
        env:
          HENNERY_WEB_REQUIRE: '1'
          TARGET: ${{ matrix.target }}
        run: |
          sh packaging/release/native-archive.sh
      - name: Alpine executable and collector image smoke
        if: runner.os == 'Linux'
        env:
          IMAGE_ARCH: ${{ matrix.image }}
          TARGET: ${{ matrix.target }}
        run: |
          binary="$PWD/unpacked/hennery-$TARGET/hennery"
          docker run --rm -v "$binary:/hennery:ro" alpine:3@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 /hennery --version
          mkdir -p "dist/linux-$IMAGE_ARCH"
          cp "$binary" "dist/linux-$IMAGE_ARCH/hennery"
          docker build -t hennery-collector:candidate .
          sh packaging/smoke-image.sh hennery-collector:candidate
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: candidate-${{ matrix.target }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  crates:
    # Channel -> owning job ID: workflow_policy.CHANNEL_JOB_IDS. R4 uses "ghcr".
    name: crates
    needs: web-ui
    if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',crates,')
    runs-on: ubuntu-24.04
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          fetch-depth: 0
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: release-ui
          path: web/dist/
      - name: Isolate package acceptance homes and the MSRV toolchain
        run: |
          mkdir -p "$RUNNER_TEMP/r3-home"
          for name in HOME CARGO_HOME RUSTUP_HOME XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME npm_config_userconfig npm_config_cache; do
            case "$name" in
              HOME) value="$RUNNER_TEMP/r3-home" ;;
              *) value="$RUNNER_TEMP/r3-home/$name" ;;
            esac
            echo "$name=$value" >> "$GITHUB_ENV"
          done
      - name: Prepare and qualify all seven using the already built candidate UI
        run: |
          nix develop -c rustup toolchain install 1.88.0 --profile minimal
          nix develop -c node packaging/prepare-crates.mjs "$RUNNER_TEMP/crates-prepared" "$GITHUB_SHA" "$PWD/web/dist"
          nix develop -c sh packaging/ci-crates.sh "$RUNNER_TEMP/crates-prepared"
          mkdir crates-flat
          nix develop -c node packaging/prepare-crates.mjs --stage "$RUNNER_TEMP/crates-prepared" crates-flat
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: release-crates
          retention-days: 90
          if-no-files-found: error
          path: crates-flat/
  assemble:
    needs: [archive, crates]
    if: always() && needs.archive.result == 'success' && (needs.crates.result == 'success' || needs.crates.result == 'skipped')
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: candidate-*
          path: candidates
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        if: needs.crates.result == 'success'
        with:
          name: release-crates
          path: crates-flat
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Assemble global inputs; never silently merge conflicting materials
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
          RELEASE_CHANNELS: ${{ github.event.inputs.channels || 'github' }}
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          python3 packaging/release/assemble.py candidates target/distrib
          if test -d crates-flat; then
            nix develop -c node packaging/prepare-crates.mjs --stage crates-flat target/distrib
          fi
          "$RUNNER_TEMP/dist-bin/dist" build --artifacts=global --output-format=json > target/distrib/dist-manifest.json
          python3 packaging/harden-installer.py target/distrib/hennery-installer.sh
          sh packaging/test-installer.sh target/distrib
          sh packaging/check-formula.sh target/distrib
          nix develop .#release -c python3 packaging/release/homebrew.py prepare target/distrib --tag "$RELEASE_TAG" --targets aarch64-apple-darwin,aarch64-unknown-linux-musl,x86_64-unknown-linux-musl
          git show HEAD:CHANGELOG.md > target/distrib/release-notes.md
          git archive --format=tar --prefix=hennery-source/ HEAD | xz > target/distrib/hennery-source.tar.xz
          python3 packaging/release/supply.py freeze --output target/distrib \
            --source-sha "$(git rev-parse HEAD)" --tag "$RELEASE_TAG" --channels "$RELEASE_CHANNELS" \
            --run-id "$GITHUB_RUN_ID" --run-attempt "$GITHUB_RUN_ATTEMPT" > inventory-sha256.txt
          cat inventory-sha256.txt >> "$GITHUB_STEP_SUMMARY"
          echo 'Candidate still needs Object Lock retention and channel acceptance before approval.' >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  installer:
    needs: assemble
    strategy:
      fail-fast: false
      matrix:
        runner: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Native installer positives and refusals
        run: sh packaging/test-installer.sh candidate
  homebrew-native:
    needs: assemble
    strategy:
      fail-fast: false
      matrix:
        include:
          - runner: macos-15
          - runner: ubuntu-24.04
          - runner: ubuntu-24.04-arm
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 30
    steps:
      - name: Preserve successful native no-ops for unselected Homebrew
        run: echo 'Native acceptance executes only for a selected Homebrew channel'
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Real isolated tap install, smoke, upgrade and uninstall of frozen bytes
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        run: nix develop .#release -c python3 packaging/release/homebrew_accept.py candidate "$RUNNER_TEMP/homebrew-proof"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        with:
          name: homebrew-proof-${{ matrix.runner }}
          if-no-files-found: error
          path: ${{ runner.temp }}/homebrew-proof/result.json
  homebrew:
    name: homebrew
    needs: [assemble, homebrew-native]
    if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - name: All advertised native Homebrew platforms passed
        run: echo 'Native local-tap acceptance passed on all three platforms'
  retain:
    needs: [assemble, installer, tag-signature]
    if: vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true'
    environment: release-staging
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Retain exact versions under compliance retention and legal hold
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          inventory=$(sha256sum candidate/release-inventory.json | cut -d' ' -f1)
          nix develop .#release -c python3 packaging/release/retention.py stage \
            --candidate candidate --bucket "$RELEASE_BUCKET" --inventory-sha256 "$inventory" --receipt retention-receipt.json
          echo "Held candidate inventory: $inventory" >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: retention-receipt-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: retention-receipt.json
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": ".github/workflows/release-homebrew.yml", "phase": "feature", "sha256": "3c626f7ed5e6f6c5537998fccb3263f12329639c9de7a690e0bbcc27bc56c3cd", "size": 2030, "task": 2} -->
```text
name: release-homebrew
on:
  pull_request:
    paths:
      - 'packaging/**'
      - '.github/workflows/**'
      - '.github/actions/release-gate/**'
      - 'dist-workspace.toml'
      - 'Cargo.toml'
      - 'Cargo.lock'
      - 'crates/**'
      - 'web/**'
      - 'flake.nix'
      - 'flake.lock'
      - 'README.md'
      - 'docs/homebrew.md'
  workflow_dispatch:
permissions:
  contents: read
jobs:
  proof:
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: aarch64-apple-darwin
            runner: macos-15
          - target: x86_64-unknown-linux-musl
            runner: ubuntu-24.04
          - target: aarch64-unknown-linux-musl
            runner: ubuntu-24.04-arm
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: 1.98.1
          targets: ${{ matrix.target }}
      - name: Native musl build tools
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y musl-tools
      - name: Build native candidate exactly as release archive construction
        env:
          TARGET: ${{ matrix.target }}
        run: sh packaging/release/homebrew-proof.sh "$TARGET" "$RUNNER_TEMP"
      - name: Install, version, exact executable smoke, upgrade, test, uninstall and leftovers
        run: nix develop .#release -c python3 packaging/release/homebrew_accept.py "$RUNNER_TEMP/homebrew-candidate" "$RUNNER_TEMP/homebrew-proof"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: homebrew-proof-${{ matrix.target }}
          if-no-files-found: error
          path: ${{ runner.temp }}/homebrew-proof/result.json
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": ".github/workflows/release-publish.yml", "phase": "feature", "sha256": "b3ce9ea586904954035f8f36339d1c1d996bb3019fc975358f49052883df9b6b", "size": 21302, "task": 2} -->
```text
name: release-publish
run-name: Release inventory ${{ inputs.inventory_sha256 }} from ${{ inputs.tag }}
on:
  workflow_dispatch:
    inputs:
      inventory_sha256:
        description: Frozen candidate inventory SHA-256
        required: true
        type: string
      maintainer_signature:
        description: Armored hardware-backed detached signature over the exact frozen inventory
        required: true
        type: string
      settings_audit_sha256:
        description: SHA-256 of the maintainer local settings audit
        required: true
        type: string
      settings_audit:
        description: Canonical maintainer audit JSON, fresh for this completed candidate
        required: true
        type: string
      source_sha:
        description: Exact qualified source commit
        required: true
        type: string
      tag:
        description: Protected annotated release tag
        required: true
        type: string
      channels:
        description: Approved sorted JSON channel array
        required: true
        type: string
      targets:
        description: Approved sorted JSON target array
        required: true
        type: string
      candidate:
        description: JSON candidate run_id and run_attempt
        required: true
        type: string
      retention_receipt_version:
        description: Exact S3 version of the held retention receipt
        required: true
        type: string
permissions:
  contents: read
  actions: read
concurrency:
  group: release-publish-${{ inputs.tag }}
  cancel-in-progress: false
jobs:
  approval-tuple:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - name: Display exact approval binding for this run attempt
        run: python3 packaging/release/approval_summary.py
  authorize:
    needs: approval-tuple
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag)
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
    outputs:
      run_attempt: ${{ steps.authorized.outputs.run_attempt }}
      inventory_sha256: ${{ steps.authorized.outputs.inventory_sha256 }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      # AWS read access is restricted to held candidate versions; it conveys
      # no registry/release authority. No write token is given to candidate code.
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: authorize-preflight.json
      - name: Publish the validated credential-issuance binding
        id: authorized
        env:
          INVENTORY: ${{ inputs.inventory_sha256 }}
        run: |
          echo "run_attempt=$GITHUB_RUN_ATTEMPT" >> "$GITHUB_OUTPUT"
          echo "inventory_sha256=$INVENTORY" >> "$GITHUB_OUTPUT"
  sign:
    needs: authorize
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256
    environment:
      name: release
      url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      # AWS read access is restricted to held candidate versions; it conveys
      # no registry/release authority. No write token is given to candidate code.
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: sign-preflight.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: boundary
          receipt: sign-boundary.json
      - name: Attest final bytes, including signed inventory and SPDX files
        id: attest
        uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be # v2.4.0
        with:
          subject-path: candidate/*
      - name: Preserve downloadable Sigstore bundle and approval receipts
        run: |
          mkdir signatures
          python3 - <<'PYAPPROVAL'
          import json, os
          from pathlib import Path
          Path('signatures/release-inventory.json.asc').write_text(json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())['inputs']['maintainer_signature'])
          PYAPPROVAL
          cp '${{ steps.attest.outputs.bundle-path }}' signatures/release.sigstore.jsonl
          cp sign-preflight.json sign-boundary.json retention-receipt.json signatures/
          nix develop .#release -c python3 - <<'PY'
          import os,sys
          from pathlib import Path
          sys.path.insert(0,'packaging/release')
          import retention
          retention.audit(Path('signatures/release-inventory.json.asc'), os.environ['RELEASE_AUDIT_BUCKET'], int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
          retention.audit(Path('signatures/release.sigstore.jsonl'), os.environ['RELEASE_AUDIT_BUCKET'], int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
          PY
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: signatures/
  github:
    needs: [sign, authorize]
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256 && vars.RELEASE_GITHUB_ENABLED == 'true'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          path: signatures
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: publish-preflight.json
      - name: Reconcile every existing remote byte before any upload
        env:
          GH_TOKEN: ${{ github.token }}
        run: nix develop .#release -c python3 packaging/release/publish.py reconcile --candidate candidate --signatures signatures --output reconciliation.json
      - name: Obtain short-lived publication authority after preflight
        id: publication-token
        uses: actions/create-github-app-token@67018539274d69449ef7c02e8e71183d1719ab42 # v2.1.4
        with:
          app-id: ${{ vars.RELEASE_PUBLISH_APP_ID }}
          private-key: ${{ secrets.RELEASE_PUBLISH_APP_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: hennery
          permission-contents: write
          permission-actions: read
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: boundary
          receipt: publish-boundary.json
      - name: Publish only verified missing bytes; verify upload responses by fetch/hash
        env:
          GH_TOKEN: ${{ steps.publication-token.outputs.token }}
          RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
        run: nix develop .#release -c python3 packaging/release/publish.py upload --candidate candidate --signatures signatures --output public-path.json
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: always()
        with:
          name: publication-audit-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: |
            publish-preflight.json
            publish-boundary.json
            reconciliation.json
            public-path.json
  crates:
    needs: [github, authorize]
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256 && vars.RELEASE_CRATES_ENABLED == 'true'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 60
    permissions:
      contents: read
      actions: read
      id-token: write
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Fetch the complete exact held candidate; never rebuild during publication
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          path: signatures
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: crates
          phase: preflight
          receipt: crates-preflight.json
      - name: Verify maintainer approval and exact tagged Sigstore provenance before credentials
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ inputs.tag }}
          SOURCE_SHA: ${{ inputs.source_sha }}
        run: |
          nix develop .#release -c python3 packaging/release/verify.py --candidate candidate --tag "$TAG" --source-sha "$SOURCE_SHA" --bundle signatures/release.sigstore.jsonl --approval-signature signatures/release-inventory.json.asc
      - name: Revalidate signed global and channel bytes and public corresponding source before OIDC
        env:
          GH_TOKEN: ${{ github.token }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
        run: nix develop .#release -c node packaging/publish-crates.mjs --verify candidate "$INVENTORY"
      - name: Obtain temporary crates.io authority; revoke in the action post step
        id: cratesio
        uses: rust-lang/crates-io-auth-action@9c067fc5d5c254b33978fed918cb50c032549d0e # main @ 2026-10-15
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: crates
          phase: boundary
          receipt: crates-boundary.json
      - name: Upload frozen crates in dependency order; renew the live gate at every boundary
        env:
          GH_TOKEN: ${{ github.token }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          CARGO_REGISTRY_TOKEN: ${{ steps.cratesio.outputs.token }}
        run: nix develop .#release -c node packaging/publish-crates.mjs candidate "$INVENTORY"
  homebrew:
    needs: [github, authorize]
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256 && vars.RELEASE_HOMEBREW_ENABLED == 'true'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    permissions:
      contents: read
      actions: read
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Fetch the complete exact held candidate; never rebuild during publication
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          path: signatures
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: homebrew
          phase: preflight
          receipt: homebrew-preflight.json
      - name: Verify maintainer approval and exact tagged Sigstore provenance before credentials
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ inputs.tag }}
          SOURCE_SHA: ${{ inputs.source_sha }}
        run: |
          nix develop .#release -c python3 packaging/release/verify.py --candidate candidate --tag "$TAG" --source-sha "$SOURCE_SHA" --bundle signatures/release.sigstore.jsonl --approval-signature signatures/release-inventory.json.asc
      - name: Verify frozen formula and public immutable release before tap credential
        env:
          GH_TOKEN: ${{ github.token }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
        run: nix develop .#release -c python3 packaging/release/homebrew_publish.py --verify candidate "$INVENTORY"
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: homebrew
          phase: boundary
          receipt: homebrew-boundary.json
      - name: Publish exact formula bytes with atomic conflict detection
        env:
          GH_TOKEN: ${{ github.token }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
          RELEASE_HOMEBREW_ENABLED: ${{ vars.RELEASE_HOMEBREW_ENABLED }}
          HOMEBREW_TAP_TOKEN: ${{ secrets.RELEASE_HOMEBREW_TOKEN }}
        run: nix develop .#release -c python3 packaging/release/homebrew_publish.py candidate "$INVENTORY"
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "README.md", "phase": "feature", "sha256": "5472f510adc679fad756e89ab7266658ef09a5cabefcf1fee9704d3f8cbda8f7", "size": 21088, "task": 2} -->
````text
# hennery

hennery is a self-hosted cockpit for coding agents. It lets one developer drive
[Agent Client Protocol](https://agentclientprotocol.com) (ACP) sessions — Claude
Code, Codex, or any other ACP adapter — running on any of their machines, from a
single browser tab or a phone. It also includes an MCP gateway: connect a
server once, then choose its hat and the hosts whose sessions may use it.

hennery never proxies agent licences. You bring your own subscriptions and log in
to each agent CLI on your own machines; hennery only drives the sessions.

## Status

**Early testing.** hennery is ready for early testers who build it from
source. There are no published releases, installers or images yet, and stored
data may not survive an upgrade: expect things to change.

What works:

- **Sessions from the browser.** The collector serves its web UI from the
  binary. From it you start Claude Code and Codex sessions on a connected,
  paired machine, prompt them, answer their permission requests, and park
  and resume them.
- **Hats.** Path rules put each session in a hat by its project directory,
  for organising sessions and choosing their MCP servers.
- **MCP servers.** Connect a server with a static token or OAuth through the
  gateway, or configure local stdio servers for a host and hat, on the **MCP** screen.

Known limitations:

- One owner per collector. Setup requires a password; it also offers a
  passkey, which you can use to sign in afterwards.
- Web Push is built on the collector, but the web UI has no subscribe
  button yet.
- Codex sessions get hennery MCP servers only in the host's default hat, without per-hat isolation, and also load the user's own `~/.codex` MCP servers; other hats get none, until per-hat isolation lands.
- Hosts support verified `wss://`; exact trusted proxy peers provide separate
  client rate-limit budgets. Public adapter/MCP acceptance is pending. Restrict ingress until
  those deployment checks are complete.
- The designs are in [`docs/specs/`](docs/specs/) and the plans in
  [`docs/plans/`](docs/plans/); [`docs/README.md`](docs/README.md) lists
  them.

## Verify a release installer before running it

Releases are not published yet; this procedure is for when publication is enabled.
Until then, use the source quickstart below. You need trusted, already installed
`curl`, GnuPG, `jq`, and either `sha256sum` or `shasum` (plus `gh` for the
installer's archive verification).

The release signing subkey's **full fingerprint** is
**`F26C7F594DFE84D131703AFC23E5A318AE8D2861`**. Confirm it through channels
independent of any release: this [README on main](https://github.com/marcinwadon/hennery/blob/main/README.md),
the [maintainer's account keys](https://github.com/marcinwadon.gpg), and
[keys.openpgp.org](https://keys.openpgp.org/vks/v1/by-fingerprint/F26C7F594DFE84D131703AFC23E5A318AE8D2861).
The block below fetches all three and requires the full fingerprint to match.
Stop if a source is unavailable or disagrees; never use a key or verifier
supplied alongside a release as the trust anchor. Review these commands from
main and compare the fingerprint independently before running them.

Set `release_tag` to the published version you intend to install. The block
downloads public data into a private temporary directory, verifies the inventory
with an isolated keyring, and checks the installer's SHA-256 against that signed
inventory. Only then does it run the installer, which authenticates the archives
with the maintainer signature and exact-tag Sigstore provenance. Keep the printed
directory for inspection. Verification uses installed tools; only the
authenticated installer is executed.

<!-- check: release-bootstrap -->
```sh
(
set -eu
release_fingerprint=F26C7F594DFE84D131703AFC23E5A318AE8D2861
release_tag=v0.1.0-alpha.1
release_dir=$(mktemp -d "${TMPDIR:-/tmp}/hennery-release.XXXXXXXX") || exit 1
printf 'Release verification directory: %s\n' "$release_dir"
mkdir "$release_dir/keyring" || exit 1
chmod 0700 "$release_dir/keyring" || exit 1
release_fetch() {
    curl --proto '=https' --proto-redir '=https' --tlsv1.2 -fsSL "$1" -o "$2" || exit 1
}
release_gpg() {
    gpg --batch --no-options --homedir "$release_dir/keyring" --no-autostart --no-auto-key-retrieve "$@"
}
release_fetch https://raw.githubusercontent.com/marcinwadon/hennery/refs/heads/main/README.md "$release_dir/main-readme"
grep -F -- "$release_fingerprint" "$release_dir/main-readme" >/dev/null || exit 1
release_fetch https://github.com/marcinwadon.gpg "$release_dir/github.asc"
release_fetch "https://keys.openpgp.org/vks/v1/by-fingerprint/$release_fingerprint" "$release_dir/keyserver.asc"
for release_source in github keyserver; do
    release_gpg --with-colons --with-subkey-fingerprint --show-keys "$release_dir/$release_source.asc" > "$release_dir/$release_source.fingerprints" || exit 1
    awk -F: -v fp="$release_fingerprint" '$1 == "fpr" && $10 == fp { found=1 } END { exit !found }' "$release_dir/$release_source.fingerprints" || exit 1
done
release_gpg --import "$release_dir/github.asc" "$release_dir/keyserver.asc" || exit 1
release_url="https://github.com/marcinwadon/hennery/releases/download/$release_tag"
for release_file in release-inventory.json release-inventory.json.asc hennery-installer.sh; do
    release_fetch "$release_url/$release_file" "$release_dir/$release_file"
done
cd "$release_dir" || exit 1
release_gpg --status-fd 1 --verify release-inventory.json.asc release-inventory.json > inventory-status || exit 1
awk -v fp="$release_fingerprint" '
    $1 == "[GNUPG:]" && $2 == "VALIDSIG" { count++; if ($3 != fp) bad=1 }
    $1 == "[GNUPG:]" && $2 ~ /^(BADSIG|ERRSIG|EXPSIG|EXPKEYSIG|REVKEYSIG|KEYEXPIRED|SIGEXPIRED|KEYREVOKED|NO_PUBKEY|NODATA|FAILURE|ERROR)$/ { bad=1 }
    END { exit !(count == 1 && !bad) }
' inventory-status || exit 1
release_sha=$(jq -er --arg tag "$release_tag" '
    if .schema != 1 or .repository != "marcinwadon/hennery" or .tag != $tag then error("wrong release inventory") else
        [.artifacts[] | select(.name == "hennery-installer.sh")] |
        if length != 1 then error("installer missing or duplicated") else .[0].sha256 end |
        if type == "string" and test("^[0-9a-f]{64}$") then . else error("invalid installer digest") end
    end' release-inventory.json) || exit 1
printf '%s  hennery-installer.sh\n' "$release_sha" > installer.sha256 || exit 1
if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c installer.sha256 || exit 1
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c installer.sha256 || exit 1
else
    printf 'A SHA-256 tool is required\n' >&2
    exit 1
fi
sh ./hennery-installer.sh
)
```

## Homebrew

The project tap is implemented with publication disabled until a stable release
passes native acceptance. The first alpha stays GitHub-only. See the
[Homebrew guide](docs/homebrew.md) for installation, upgrade, removal and the
service PATH/restart requirements. Package operations preserve user data and
never automatically manage services or agent logins.

## Quickstart

Build with [Nix](https://nixos.org/download/) with flakes enabled, or use
[Build without Nix](#build-without-nix) below. On every machine that runs
agents, you need the CLI for each agent you want to use
already logged in with your own subscription. The flake supports Apple
Silicon macOS, and x86_64 and aarch64 Linux.
The bundled CLIs are not added to your `PATH`. After `up` or `host join`
installs the runtime, run `hennery doctor` on each agent machine. Check 4,
**logged in**, reports whether each agent is logged in and prints a fix when
it is not; doctor does not log in for you.

### 1. Build

Get the source:

<!-- check: clone -->
```sh
git clone https://github.com/marcinwadon/hennery.git
cd hennery
```

Build the web UI, then the binary, which embeds it. The dev shell brings
Rust, Node and pnpm; with direnv, `direnv allow` once and leave out the
`nix develop -c` prefixes. `HENNERY_WEB_REQUIRE=1` makes the build fail if
the web UI was not built first, instead of embedding a placeholder page.

<!-- check: build -->
```sh
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web build
HENNERY_WEB_REQUIRE=1 nix develop -c cargo build --release --locked -p hennery
export PATH="$PWD/target/release:$PATH"
```

Or let Nix build the whole package:

<!-- check: nix -->
```sh
nix build
./result/bin/hennery --version
```

The binary is then `result/bin/hennery`; put that directory on your `PATH`
instead.

#### Build without Nix

Prerequisites (plus Git to get the source above):

- **Linux:** a C compiler, `make` and `perl` (including its core modules).
- **macOS:** Xcode Command Line Tools; macOS supplies `perl`.
- **Both:** Rust via [rustup](https://rustup.rs/) (latest stable, the
  toolchain CI uses), and Node 24 with its `npm`/`npx` on `PATH`.

From the source directory, build the web UI with the flake's pinned pnpm
12.3.4 through `npx`, without installing pnpm globally. OpenSSL is built
and linked into the binary; no system OpenSSL is needed.

<!-- check: build-without-nix -->
```sh
npx --yes pnpm@12.3.4 --dir web install --frozen-lockfile
npx --yes pnpm@12.3.4 --dir web build
HENNERY_WEB_REQUIRE=1 cargo build --release --locked -p hennery --features vendored-openssl
export PATH="$PWD/target/release:$PATH"
```

Continue with step 2 below. Starting hennery, setup, `doctor` and agent
logins are the same for both builds.

### 2. Start

<!-- check: up -->
```sh
hennery up
```

`hennery up` runs the collector and a host for this machine, and pairs the
two. It listens on `http://127.0.0.1:7117` and keeps its data in
`~/Library/Application Support/hennery` (macOS) or `$XDG_DATA_HOME/hennery`,
by default `~/.local/share/hennery` (Linux). The first start downloads Node
and the managed adapter set, including its bundled agent CLIs.

On its first start it writes a one-time setup link, valid for an hour, to
`collector/setup-url` in the data directory until setup, and prints the link
when running in a terminal. Open that link: by default it uses
`http://localhost:7117`, which is the browser origin to keep using. Choose
and confirm a password of at least 12 characters, check **Public URL** and
**Default hat**, then press **Set up**. You are signed in; add a passkey or
press **Skip** (or **Continue** if passkeys are unavailable). Back up
`collector/master.key` together with `collector/hennery.db`: the gateway's
credentials cannot be read without it.
If the setup link has expired, `hennery admin setup-url` prints a fresh one.

### 3. Pair another machine

With a verified HTTPS front end, use the public `https://` origin printed by
**Hosts → Add host**: the host enrolls over HTTPS and runs over WSS. System
roots are the default. `host join --ca-cert <file>` imports a private CA for
this collector only and saves it; browsers and adapters need their own trust
configuration. Use `hennery doctor` to check TLS, health and the host upgrade.

To move an existing tunnel pairing, park its sessions and stop the host
service, then use `hennery host transport set <https-origin> --system-roots`
(or `--ca-cert <file>`) with the existing host data directory. This verifies
the existing identity and preserves its key, roots, CLI settings and outbox.
Restarting the host parks adapters; resume sessions normally afterwards.
For CA rotation, save an old-plus-new CA bundle, restart, renew the server,
then save a bundle without the old CA and restart again. Leaf renewal under
the same CA needs no host restart. A `DurabilityUncertain` save means the new
settings are visible but may not survive a crash: inspect the saved endpoint
and repeat the explicit save after storage is healthy.

An uncertain enrollment blocks `join`, `run` and `up`. Follow doctor's attempt
id: inspect the collector's Hosts list, revoke any entry created by that
attempt, then use the explicit enrollment archive action before joining
again. Archiving preserves the journal and key locally; it cannot confirm a
remote revoke. Automatic pairing remains suppressed after an archive.

The SSH tunnel remains an optional deployment choice. On the other machine,
open it with
`ssh -N -L 7117:127.0.0.1:7117 <collector-machine>`; replace
`<collector-machine>` with your SSH destination. Keep this terminal open
while pairing and while `hennery host run` runs. If local port 7117 is
already in use, choose another local port in the tunnel and join command.

For browser access over HTTPS, a reverse proxy on the collector's machine
can serve `up` at an `https://` address, including its host WebSocket. If `up` is already running,
stop it with Ctrl-C and restart it with that address before setup:

<!-- check: up-public -->
```sh
hennery up --public-url https://hennery.example
```

Already set up at `localhost`? Then `--public-url` is ignored: move it
with `hennery admin reset-public-url` (see [Recovery](#recovery)), and from
then on open hennery at the new address, since the old one is refused.
For the collector's machine configuration, set `proxy_client_ip_peers` to
only the proxy's exact backend connection IP (for these loopback recipes,
`["127.0.0.1"]`) in `<collector-data>/config.toml`, then restart the
collector. It is an address budget policy, never login authority. A missing
header falls back to the TCP peer, so local `up` enrollment still works;
without this setting all clients behind the proxy share its limiter budget.
A typo, CIDR, hostname, port, duplicate, unspecified/multicast address, or
more than eight peers fails configuration. IPv4-mapped peers are normalized.

Use the [tested Caddy/nginx recipes](packaging/proxy/README.md). The final
same-machine proxy must overwrite every `Hennery-Client-IP` instance from
its actual connection peer; standard forwarding headers grant nothing.
Restrict backend access, preserve Origin and the upgrade nonce, and apply
edge connection/request caps. A trusted loopback peer also trusts local
processes to assert budget addresses. Healthy HTTPS alone cannot establish
header stripping or two separate client budgets; doctor says so.

The fixture deployment gate covers both recipes and W1 recovery through
them. Public acceptance with both pinned real adapters and mounted MCP is
still pending; keep ingress restricted to a trusted population until the
[public deployment gate](packaging/proxy/README.md#public-deployment-gate)
is recorded. Tailscale Serve needs its own attribution qualification; if
it cannot overwrite an authenticated client address, use a trusted VPN
population and retain the shared-budget limitation.

With that HTTPS origin configured, **Hosts → Add host** supplies the remote
pairing command. Here `hennery.example` is a public-join placeholder for your
collector's DNS name, `443` is a public-join placeholder for its HTTPS port,
and `ABCD-EFGH` is a public-join placeholder for the displayed code. Replace
only those values; retain `https://`. Omitting the code reads it from stdin.

<!-- check: join-public -->
```sh
hennery host join https://hennery.example:443 ABCD-EFGH
```

Run the host block below after pairing. It saves and reconnects through
`wss://<your-origin>/api/hosts/ws`, validating the same server name and roots.
The tunnel command below remains an optional fallback.

In the web UI, **Hosts → Add host** shows a pairing code, valid for ten
minutes, after asking for your password again if a fresh step-up is needed.
Its printed command uses the public URL; when choosing the tunnel, adapt it to the
`http://127.0.0.1` address as below. Build hennery on the other machine and
run the join command in another terminal (it also downloads the runtime).
In this block, `7117` is a placeholder for the tunnel's local port, and
`ABCD-EFGH` is a placeholder for the code shown by **Add host**. Replace
them with your port and code; leave the code out to type it instead and
keep it out of shell history. Keep the `http://127.0.0.1` scheme and host:

<!-- check: join -->
```sh
hennery host join http://127.0.0.1:7117 ABCD-EFGH
```

<!-- check: host-run -->
```sh
hennery host run
```

`host run` uses the saved WSS endpoint for HTTPS pairings. A tunnel pairing
uses `ws://127.0.0.1:<port>/api/hosts/ws`; keep that tunnel port available
on future runs. Transport failures never authorize a fresh pairing.

### 4. Start a session

**New session**: pick a connected host, an agent and a project directory, then
**Start session**, and type your first prompt.
Unless workspace roots are configured, the project list is empty: use
**Browse** under the host user's home, or pass `--workspace-root <directory>`
to `up` or `host run` to list repositories under that root. The flag is
repeatable.

### 5. Connect an MCP server

For a remote server with a static token, open **MCP → Add connection**.
Fill in **Name**, **Slug**, **Server URL** and **Hat**; choose **Token** under
**Authentication**, and set **Header** and **Prefix** as the server requires
(the prefix includes any trailing space). Press **Create**, then enter the
**Token** and press **Save token**. Under **Hosts whose sessions get it**,
tick the hosts to use it; each tick saves immediately. Where delivery is
supported, sessions in that hat on those hosts receive it as
`hennery-<slug>` at their next start or resume.
The status stays **Not used yet** until traffic goes through it.
Use an HTTPS server URL; **Internal network** permits plain HTTP only to
internal addresses (loopback included), for a server you run there.

For a local stdio server, use **MCP → Local MCP servers**. Choose **Host**
and **Hat**, then **Add local server**. Fill in **Server name** and
**Command** (on that host); use **Add argument** for each argument and
**Add environment variable** for secrets. Press **Review local servers**,
check the commands, then **Save local servers**. Saving replaces the whole
set for that host and hat, including removals, at the next start or resume.
Environment values cannot be read back from hennery.

Agents without per-hat isolation receive hennery MCP servers only in the
host's default hat. Check the delivery prediction beside the host or on
**New session** for the agent you chose; the session reports what it was
given at its last start or resume.
This default-hat restriction also applies to Claude with `--use-cli`.

These actions may ask you to confirm your password again.

#### OAuth

In **MCP → Add connection**, fill in the connection fields and choose
**OAuth: automatic registration** under **Authentication** if the vendor
supports dynamic registration, or **OAuth: pre-registered client** if you
register the client yourself. Press **Create**. OAuth addresses must use
HTTPS, or HTTP to this machine.

The vendor must allow hennery's redirect URI:
`<public_url>/api/mcp/oauth/callback`, using the collector's configured
browser origin as `public_url`. The exact URI is shown in the pre-registered
add/edit form and client settings beside **Register this redirect URI at the vendor:**
For a pre-registered client, enter **Client ID**, then choose
**Public client (no secret)** or **Set a new secret** under **Client secret action**.
Enter **Client secret** if you chose **Set a new secret**. Press **Save client**.
Saved secrets are write-only and cannot be read back from hennery.

Click **Connect** or **Reconnect** when offered to open the vendor consent
popup. If popups are blocked, use **Open vendor sign-in**. Return to hennery
after consent. If a fresh confirmation is required before authorization,
the popup closes and you confirm your password in the main window (or use
**Confirm with passkey** if offered). Then follow the card and click
**Connect** or **Reconnect** again if offered; authorization is not retried
automatically.

The card shows the gateway's last report, with **Status recorded** and
**Last checked**. **Probe now** requests a report;
it does not establish live health, and **Working** is a recorded status.
**May need sign-in** (`needs_auth`) calls for **Reconnect**; read the
gateway note, since an authorization-server outage can also cause this state.

## Recovery

Run these on the collector's machine while hennery runs, as the user that
runs it; each asks for confirmation on the terminal. For a collector not in
the default place, give `--data-dir <dir>` right after `admin`.

- **A forgotten password:** set a new one. It signs out every browser session and
  removes every passkey.

  <!-- check: reset-password -->
  ```sh
  hennery admin reset-password
  ```

- **The collector moved** (another address, or behind a proxy): every
  sign-in and change is refused with `origin_mismatch` until hennery knows
  the address the browser now uses. Give it that origin: `https://`, or
  `http://` to a loopback address, with no path. It signs out every browser
  session; passkeys stop working if the host name changes, and are then
  removed.

  <!-- check: reset-public-url -->
  ```sh
  hennery admin reset-public-url https://hennery.example
  ```

## Licence

hennery is licensed under the [GNU Affero General Public License v3.0](LICENSE).
````

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "docs/README.md", "phase": "feature", "sha256": "720c569ed2f029bd05782ab9ffca4acb16f1a93321a8cf8e2c951c3747bc41c3", "size": 55792, "task": 2} -->
```text
# hennery design documents

Status: the walking skeleton is implemented (Rust workspace, end-to-end host ↔ collector
slice); everything else is design. The maintainer's decisions are recorded below.

## Reading order

1. [Architecture (umbrella spec)](specs/2026-09-25-hennery-architecture-design.md)
   — product, topology, protocol principles, sessions, auth, hats, module
   boundaries, testing. Authoritative where subsystem specs disagree.
2. Subsystem specs:
   - [ACP core](specs/2026-09-26-acp-core-design.md) — host, adapters,
     host↔collector protocol, session state machine, storage, session API.
   - [Kernel](specs/2026-09-26-kernel-design.md) — storage, config, operator
     auth, pairing, hats, push, HTTP security.
   - [MCP gateway](specs/2026-09-26-mcp-gateway-design.md) — connections,
     OAuth, per-session tokens, streaming proxy, renderers.
   - [Delegation](specs/2026-10-14-delegation-design.md) — proposed opt-in parent/child sessions, shared session-bound MCP delivery for optional plug-ins, durable reports/questions, operator fallback and family UI; two operator questions remain.
   - [Optional memory plug-in](specs/2026-10-14-memory-design.md) — proposed generic opt-in activity/startup contract, separate reference service, scoped vault import and purge; scope amendment dated 2026-10-14.
   - [Client view](specs/2026-10-02-client-view-design.md) — the display fold
     on the collector (`hennery-view`), the view API every client uses, and the
     web UI reused from the predecessor frontend.
   - [Frontend](specs/2026-09-26-frontend-design.md) — views, data layer,
     transcript fold rules, cards, PWA.
   - [Phone, Web Push and PWA](specs/2026-10-14-phone-design.md) — proposed browser push/device controls, installed app shell, question deep links, mobile answers and iOS acceptance.
   - [Distribution](specs/2026-09-26-distribution-design.md) — binary,
     managed runtime and adapter manifest, release pipeline, services, doctor.
   - [Distribution and releases](specs/2026-10-15-distribution-release-design.md) — proposed publication contract, crates.io with packaged UI, platform qualification, channel rollout and maintainer-only setup; six operator questions remain.
   - [Remote hosts over WSS](specs/2026-10-14-wss-design.md) — approved design per the fleet parent, including the three re-confirmed amendments; verified TLS/private-CA trust, tunnel migration and reconnect/doctor parity are W1; reverse-proxy attribution/public deployment remain W2.
3. Evidence:
   - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
     and its [harness](../spikes/2026-09-25-mcp-per-session/).
4. Plans:
   - [Walking skeleton](plans/2026-09-26-walking-skeleton.md) — the first
     implementation plan (9 tasks) — executed 2026-09-27; its "Execution status" section
     lists where the built code deviates from the task text.
   - [Teardown and reconciliation](plans/2026-09-27-teardown-and-reconciliation.md) —
     plan A of the resume work (9 tasks): adapter supervisor and exit watcher, park/close,
     idle reaper, conflict events and reconciliation after reconnect. Executed 2026-09-27 (see its
     "Execution status").
   - [Resume (B1)](plans/2026-09-28-resume.md) — plan B1 (10 tasks): `resume_session` with
     `session/load` and replay suppression, presumed park while a host is offline, conn_id-keyed
     waiters, one visibility rule for unapplied facts. Executed 2026-09-29 (see its "Execution status").
   - [Cancel and capabilities (B2a)](plans/2026-09-29-cancel-capabilities.md) — `cancel_turn`,
     `hello.capabilities` with the park gate, and B1's two carry-overs. Executed 2026-09-29 (see its "Execution status").
   - [Session config (B2b)](plans/2026-09-30-session-config.md) — model, axes and mode on start
     and resume, `set_config`, the session catalogue, and B2a's two folds. Executed 2026-09-30 (see its "Execution status").
   - [Permission and elicitation](plans/2026-10-01-permissions.md) — plan (2) (7 tasks): the
     pending set and answer queue, teardown hooks, answer endpoint. Executed 2026-10-01 (see its "Execution status").
   - [Host pairing (3a)](plans/2026-10-01-host-pairing.md) — the first part of plan (3) (7 tasks):
     pairing codes and enrollment, `hennery host join`, the Ed25519 `hello` proof, `up` pairing its
     own host, and host revoke. Operator auth (3b) and passkeys (3c) follow. Reviewed and amended
     2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [Operator auth (3b-i)](plans/2026-10-02-operator-auth.md) — the first part of plan 3b (7 tasks):
     the setup link, the owner's password and `public_url`, login and sessions behind the cookie, the
     `Origin` rules, step-up, and the development bearer removed. Listeners, `config.toml` and the admin
     socket (3b-ii), then `owner_id` everywhere (3b-iii), follow. Amended after the security review of
     2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Operator auth (3b-ii)](plans/2026-10-03-operator-auth-2.md) — the second part of plan 3b (7 tasks):
     several listeners and the health checks, `config.toml`, the admin socket with `hennery admin`
     (setup link, password and `public_url` resets, hosts, pairing codes), and agents no longer
     inheriting stray descriptors. `owner_id` everywhere (3b-iii) and passkeys (3c) follow. Amended after
     the security review of 2026-10-03; executed 2026-10-01 as PRs #14 and #15 (see its "Execution status").
   - [`owner_id` everywhere (3b-iii)](plans/2026-10-04-owner-id.md) — the third part of plan 3b (5 tasks): the owner from the first start, so `up`'s host paired before setup has one; `owner_id` on the older tables; every query of the operator, host registry and sessions store naming it, with a test that reads every statement. Amended after the security review of 2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [Passkeys (3c)](plans/2026-10-05-passkeys.md) — plan 3c (6 tasks): `webauthn-rs` with the relying party from `public_url`, the `passkeys` table, ceremonies in memory, registration from a stepped-up session, login and step-up by passkey with the counter checked, and `admin reset-public-url` removing the passkeys of a host name it leaves. `admin reset-password` removes every passkey. The API only; the frontend is plan 4's. Amended after the security review of 2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [The web shell (4b)](plans/2026-10-16-web-shell.md) — part 4b of plan 4, the frontend (7 tasks): `web/` (React 19, strict TypeScript, Vite, Tailwind v4, Vitest) imported with the shell's look, icons and hooks; `GET /api/capabilities` (`{mode, features[]}`); a typed transport client (401 to sign-in with a same-origin `?next=`, one step-up and one retry, plain 409 messages, SSE over `fetch` with `Last-Event-ID`); the router, the rail and the mobile tab bar, setup with the token out of the address bar at once, passkey-first sign-in and step-up; the binary embedding the build by a build script (a placeholder without it, `HENNERY_WEB_REQUIRE=1` refusing that), served as the router's fallback but never for `/api` or `/mcp/…`, under the CSP, with no inline script; Playwright in Chromium against the binary; CI and the release archives checking the UI is embedded. The capabilities name `mcp_connections`, as plan 8a merged first. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [The session list and the read-only transcript (4c-i)](plans/2026-10-18-web-sessions.md) — part 4c-i of plan 4, the frontend (5 tasks), in `web/` only: a typed view client over 4a-ii's view API; the SSE helper's deferred fixes (a throwing handler never loses its event, one abort listener, `closed` at once, bodies cancelled); an item store per session (upsert by id and version, groups by opaque `turn_id`, older pages by `before_turn`, a resync that replaces the store and reopens, backed off when it repeats) and a list store fed by `session_upsert`, `session_removed` and `waiting_changed`, refetching on no event. The session list: day buckets across DST that move on with the clock, rows by lifecycle and activity, "Waiting on a question", the server's waiting count in the badge and the tab title (kept through a refused search), search on the server, Hide closed, the hat switch. The read-only session view: the header from the list or the detail, every item kind and all 18 markers, Markdown with raw HTML as text and no remote image, an error boundary per item, a tail window of 200 items measured in Chromium; a session's link (a push notification's) opens it beside the list. A guard on the tests' text locators. Amended after the security review of 2026-10-02, its re-confirmation of 2026-10-03, the task reviews and the whole-branch review; executed 2026-10-03 (see its "Execution status").
   - [The composer, cards, New Session and the session menu (4c-ii)](plans/2026-10-18-web-sessions.md) — part 4c-ii of plan 4, the frontend (Tasks 6–10 of the same plan), in `web/` only: a composer under each transcript (Ctrl/Cmd+Enter, images by paste, drop or pick with `[Image #N]` markers, a slash menu, the config bar taken back on a refusal, Cancel with the turn's real outcome, every prompt refusal in words, drafts per session and forgotten at sign-out, "Send again" refilling the draft); question cards (permissions by option kind, digits only from a focused card on a desktop and never stealing typing, forms with pairing, every delivery state, a verdict that never goes back, "Answer as a new message" as a draft); New Session (hosts, agents behind one function, the project picker, the hat preview, the first prompt as its own request); footers by lifecycle with every resume refusal in words and the header menu (park, close, delete behind a confirmation and step-up); "delivers when the host reconnects" following the host from what the view streams. Playwright starts a session on a host paired with the page's command, answers a permission, crashes the host and resumes, at two widths; CI builds the fake agent. Amended after its security review and re-confirmation of 2026-10-03, the task reviews, the whole-branch review and the review of its fixes; executed 2026-10-03 (see its "Execution status").
   - [The PWA and device Settings (P1)](plans/2026-10-26-phone-pwa.md) — four tasks: manifest/icons, digest-verified static-only worker, natural updates, fenced push lifecycle and minimum device Settings/mobile sign-out. Five review fixes independently CONFIRMED; CI 15/15 at `88ac41e2`. Rebased onto D1 `37fc7488`: both generator checks and full web/browser gate exit 0 (1,784 web tests; PWA 5 passed; Chromium 86 passed / 11 existing skips). Fresh tree replay: 64 blocks/eight matching trees. Earlier full replay: 2,148 Rust tests and 144 BITE probes. Draft #142 remains parent-managed; new-head CI/status and deployment approval remain with the parent. P2 owns click/deep-link/mobile-answer/relay and live iOS/vendor acceptance.
   - [Phone answers, deep links and gateway relay (P2)](plans/2026-10-29-phone-answers.md) — coherent owner-filtered question snapshots shared by HTTP/SSE, fenced notification navigation, mobile answers through the durable queue and gateway relay. Review amendments independently CONFIRMED per parent. Rebased onto R1 191aa71b with unchanged P2 implementation bytes and both README entries preserved; all six Rust gates (2,223 tests), web (1,818 tests / 101 files) and PWA (8 passed, 1280/390 px) exit 0. Six embedded patches reproduce 33 files and the rebased source tree. PR #148 was green before rebase; new-head CI/full status and installed-iOS/vendor/pinned-adapter acceptance remain parent-owned.
   - [The management screens: hosts and hats (4d-i)](plans/2026-10-18-web-manage.md) — part 4d-i of plan 4, the frontend (4 tasks), in `web/` only: every server string shown escaped and bidi-isolated (`visible()`, `<Text>`); a confirmation that runs its action and stays open under the step-up dialog; the page `inert` behind that dialog; a failed sign-out that says the browser is still signed in. Hosts: the list with each host's state, pairing with a one-time code minted on the click behind step-up and kept in the page's state only, with the exact `hennery host join` command and a countdown; rename, default hat and revoke, confirmed then stepped up. Hats: create, rename, recolour, the default for new hosts, each host's path rules saved as a set with a live tester that asks the host, and purge from the server's preview. Playwright pairs a real host with the command the page shows, at two widths, with every binary in a scratch environment. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status").
   - [The MCP connections screen (4e-i)](plans/2026-10-22-web-mcp.md) — part 4e-i of plan 4, the frontend (3 tasks), in `web/` only, over plan 8a's routes: `/mcp` (nothing under it, which the server reserves), shown only when `features` names `mcp_connections`; each connection with `hennery-<slug>`, its URL, hat, kind, whether a token is stored and its state in words (`needs_auth` "needs sign-in again", `error` "is failing", never a reconnect), the vendor's note escaped and cut at 300 characters; add (step-up; the hat starts at the default for new hosts), edit sending only the changed fields (a label edit needs no step-up; the token's loss confirmed first), delete (confirmed, then stepped up); the static token write-only, read once from an uncontrolled field kept from password managers and emptied before the request; the hosts ticked as a full set built from the connection's own mounts; a note that changes apply to new and resumed sessions, and how Codex, Claude on the operator's own CLI and any other agent command get them (without isolation, only both in the host's default hat; may change). Playwright creates one, sets its token and mounts it on a real paired host at two widths. Stdio servers, OAuth and the delivery indicator are 4e-ii's. Amended after the security review of 2026-10-03 and its re-confirmation. Executed 2026-10-03, with the whole-branch review fixes completed and rebased onto merged 8e (`d54c704c`) on 2026-10-12 (see its "Execution status").
   - [Web MCP delivery and local servers (4e-ii-a)](plans/2026-10-23-web-mcp-delivery.md) — six web-only tasks over merged 8e: last-start/resume mode/count, bounded metadata refresh, host/agent predictions, full-set local stdio configuration with write-only env values and step-up, isolation refusals, and security-review amendments. Executed 2026-10-13 on `7a8dab28`; opus review APPROVE AFTER AMENDMENTS and scoped re-confirmation CONFIRMED WITH NOTES (maintainer's behalf, 2026-10-13), all N1–N3 taken. Fresh v2 replay: 88 blocks / 33 files, twelve matching phase trees; 1465 Vitest / 84 files, prior full Playwright 58 passed / 11 skipped and changed spec 8/8; 171 historical/new caught probe records. Final-tip gate is logged in the ledger before push (see Execution status). OAuth Connect is 4e-ii-b after 8f.
   - [Web MCP OAuth (4e-ii-b)](plans/2026-10-24-web-mcp-oauth.md) — five web-only tasks over merged 8f (4684d1d9): DCR/pre-registered write-only clients, isolated fresh-click consent, last gateway reports/probes and shared attention, real collector/loopback vendor at 1280/390 px. Executed 2026-10-13; opus review APPROVE AFTER AMENDMENTS, scoped re-confirmation CONFIRMED WITH NOTES (maintainer's behalf, parent, 2026-10-13), I1/M1–M10 and N1–N3 taken. Fresh post-N1 replay: 81 blocks / 24 files, ten matching phase trees; 1618 Vitest / 93 files, full Playwright 86 passed / 11 existing skips including 28 OAuth cases; 250 historical + 7 N1 caught source-probe records. Final-tip gate is logged before push. Draft PR #133 is parent-managed; hint-only browser proof, flow identity, password-manager residual and service-worker push relay remain follow-ups. No push subscription UI before testers.
   - [`public_url` over the HTTP API (4d-B4)](plans/2026-10-18-public-url-api.md) — a backend part of plan 4d, the frontend (3 tasks): `PATCH /api/settings {public_url}` does what `hennery admin reset-public-url` does, through one operator function and in one transaction: the URL checked as setup checks it, the row and the cached origin replaced, every signed-in session ended (the caller's too) and so every stream and push subscription, the passkeys removed only when the host name changes, every ceremony ended, the contact beside it in the same transaction. A body naming `public_url` needs a fresh step-up, checked before anything is read and again as the write's first statement; a contact alone needs none. The answer reports what ended and clears the cookie as the old `public_url` set it; the move is logged at `warn` with both origins. Proven against the admin socket on a copy of one database. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status"). Q1 (refuse a loopback `http` `public_url`, a lockout from a remote browser) is open for the maintainer, with parity as the default.
   - [Hat logos, server side (4d-B2)](plans/2026-10-18-hat-logos.md) — part of plan 4d, the management screens' backend (4 tasks, and a fifth from the whole-branch review): a hat's logo is a PNG of at most 64 KiB, uploaded as base64 in JSON behind step-up, its size checked from its header before anything is decoded (1024 pixels a side), decoded and written afresh as `IHDR`, `IDAT` and `IEND` alone, at most 256 KiB; SVG, WebP and JPEG refused (the browser rasterises them first); `GET /api/hats/{id}/logo` serves it as `image/png` with `nosniff`, a sandbox policy, a fixed `Content-Disposition`, same-origin CORP and a strong `ETag` revalidated each time; `HatItem.logo` carries the `ETag`; a hat frozen for its purge takes no new logo but can lose its own, and the purge leaves no logo in the database or its WAL; the next kernel migration adds the columns. Kernel §5.1 and the frontend spec's hats bullet written back. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status").
   - [The README quickstart (4f)](plans/2026-10-22-quickstart.md) — part 4f of plan 4, the frontend (1 task) — executed 2026-10-03; finalized against main `82d41c0f` on 2026-10-13 after #133. Source/Nix build, up/setup, SSH-tunnel pairing, first session, static-token/OAuth/local stdio MCP and admin recovery match the merged code. All nine shell blocks have test/CI runners; OAuth and SSH are prose. The accuracy amendments and substitution/expiry guards are recorded in the single execution status; final OAuth accuracy review and PR #125 CI remain parent-owned.
   - [Build without Nix](plans/2026-10-25-build-without-nix.md) — extends plan 4f with latest stable Rust, Node 24, pinned pnpm 12.3.4 through npx and vendored OpenSSL. The new named block has a dedicated Ubuntu/macOS CI runner and a job-scoped guard; local execution, probes and replay are recorded in its Execution status. Independent review and non-Nix CI remain parent-owned.
   - [Kernel hats (5a)](plans/2026-10-06-hats.md) — the first part of plan 5, hats (3 tasks): `hats` and `hat_path_rules` with `owner_id` and composite foreign keys, a default hat on every host from the first start (setup names it), the pure resolver (segment match, longest prefix, default fallback), and the hats, path-rules and `PATCH /api/hosts/{id}` API behind step-up. No session carries a hat yet: `resolve_path` (5b), the session's hat on start and resume (5c) and re-assignment (5d) follow. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [`resolve_path` (5b)](plans/2026-10-07-resolve-path.md) — the second part of plan 5 (3 tasks): the host resolves a typed path (`~`, symlinks, a missing tail kept under its resolved ancestor, a `..` past it refused); `resolve_path`, a probe of its own capability on plan 6c's probe map; `POST /api/hats/resolve`; and rules saved only through their connected host. Amended after the security review of 2026-10-02 (it covered 5b–5d); executed 2026-10-02 and rebased onto 6c (see its "Execution status").
   - [Session hats (5c)](plans/2026-10-08-session-hats.md) — the third part of plan 5 (3 tasks): a start resolves its cwd on the host and stores the hat its rules give with the canonical cwd (no session for a host that is away); a resume refuses a moved cwd (`cwd_moved`) or another hat (`hat_mismatch`); a case near miss is `hat_ambiguous`; the host starts an adapter only in its canonical cwd; `hat_id` on the list item, the list's `?hat=` filter, and recents under the session's hat. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Re-assigning a session's hat (5d)](plans/2026-10-09-reassign-hat.md) — the last part of plan 5's sessions side (2 tasks): `PATCH /api/sessions/{id} {hat_id}` behind step-up moves a session with no running adapter to another of the owner's hats (a presumed-parked one is refused: close it first), writes `hat_reassigned{from, to}`, and the next resume must agree with the new hat. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Connections and credentials at rest (8a)](plans/2026-10-13-gateway-store.md) — the first part of plan 8, the MCP gateway (5 tasks): the `hennery-gateway` crate and its `gateway` migration component (`gw_connections`, `gw_credentials`, `gw_mounts`, every row the owner's); the master key (`<data>/master.key`, made once, private, checked on every load; or `HENNERY_MASTER_KEY`, or a systemd credential), kept from `up`'s host child and every agent; a missing or wrong key while credentials are stored stops the start and says what to restore; credentials sealed with XChaCha20-Poly1305, bound to their row, field and key version; `GET/POST /api/mcp/connections`, `PATCH/DELETE …/{id}`, `PUT …/{id}/mounts` and the write-only `PUT …/{id}/credential`, behind step-up where a token's reach changes, `no-store` on every answer; another origin or kind deletes the credential in the same transaction; an upstream URL logged only as its origin; `purge_hat` for the purge hook; the wire types documented into the TypeScript. No proxy yet (8d). Amended after the security review of 2026-10-02 and its two re-confirmations; executed 2026-10-02 (see its "Execution status"). Q1 (what a lost key takes down) and Q2 (a secret in a vendor's URL) are open for the maintainer, with defaults in place.
   - [The outbound HTTP policy (8b)](plans/2026-10-13-egress.md) — the second part of plan 8, the MCP gateway (2 tasks): `hennery_kernel::egress`, the one policy for every request hennery sends out (the gateway's proxy and OAuth, Web Push). One `reqwest` client per allowance (public only, or internal network); no redirects followed, no proxy from the environment; `https`, or `http` to loopback only (`localhost` answered by rule); a name with any non-public address refused, IP literals checked the same way (IPv6 public only in `2000::/3` outside its special ranges); a connect timeout and a deadline (the whole exchange, or a stream's head); errors without the URL; a per-key permit limiter. Nothing calls it yet. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status"). Decision 6 (plain `http` to a LAN address under the internal-network marking) was answered by the operator: allowed, in 8b-ii.
   - [The proxy and session tokens (8d)](plans/2026-10-14-gateway-proxy.md) — the fourth part of plan 8, the MCP gateway (4 tasks): session tokens (`hnry_session_…`, SHA-256 only) minted and revoked inside the caller's transaction for plan 8e, `ClientIdentity` and `MountPolicy` with their full-mode implementation, and the proxy `POST|GET|DELETE /mcp/<slug>` for static and `none` credentials, served outside the operator's routes: one 404 for everything out of scope, header allowlists both ways, the credential under its header, streaming event by event, a 401 never passed on (502 `upstream_auth`), the tool allowlist in JSON, batches and SSE, `initialize` without sampling, elicitation and roots, server requests for them refused, the egress policy chosen from the stored flag, per-connection limits, `nosniff`, `ApiError` answers. Amended after the security review of 2026-10-02, two re-confirmations and the execution's reviews; executed 2026-10-02 (see its "Execution status"). Q1 (server requests inside a JSON answer) was decided by the lane parent: event streams only, as §5.6. Open for the maintainer: whether a revoke ends a token's open streams (8e).
   - [Differential tests for the proxy's filters](plans/2026-10-15-gateway-differential.md) — a fix-forward to 8d, before 8e mints tokens (3 tasks). Each filter that reads parsed input is driven through the real proxy with a table of vectors: key case, duplicates, escapes, marks and whitespace, lenient forms, NUL, the envelope, large ids. What crossed the gateway is decoded again as serde_json, a first-wins decoder, Go's `encoding/json`, json-c and cJSON do, each measured. The tests found that a NUL-cut key or method (json-c, cJSON), a non-string `method`, a non-object batch element or `initialize` `params`, a JSON `tools/list` answer spelt otherwise, and an event not UTF-8 all passed a filter; each is now refused, 400 up and dropped or 502 down. Amended after the security review of 2026-10-02 and its re-confirmation. Open for the lane parent: §5.5's accepted gaps and 8d's Q1, against the brief's "under any interpretation".
   - [JSON answers read whole, every tools list filtered](plans/2026-10-15-gateway-json-answers.md) — a fix-forward after the differential tests, before 8e mints tokens (3 tasks). It reverses 8d's Q1 ruling: every JSON answer is read whole (8 MiB) and judged, and one holding a refused server request is 502 `upstream_invalid` (§5.6: in any answer). Under an allowlist every `result.tools` is filtered whatever its id, on `POST`s, `GET` streams and `Last-Event-ID` replays. An id of another type and an answer on another stream are accepted and pinned by tests. The differential harness moves to `tests/support/differential.rs` for 8e and 8f. Amended after the security review of 2026-10-02. Open for 8e: the upstream `Mcp-Session-Id` is not bound to a token.
   - [Plain `http` on an internal network (8b-ii)](plans/2026-10-13-internal-http.md) — the operator's decision of 2026-10-02 (1 task and the write-back): under the internal-network marking, plain `http` to internal addresses only (RFC 1918, loopback, unique-local IPv6 except AWS's metadata address `fd00:ec2::254`); a public address, link-local, CGNAT and everything neither public nor internal stay `https` only. A literal is checked by the URL check; a name goes through a third, internal-only client whose resolver refuses it if any address is not internal. Additive: 8b's API unchanged. Q1 (link-local, metadata), Q2 (CGNAT) and Q3 (a UI warning) are open for the maintainer, with the restrictive defaults. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Per-session MCP servers on the host (8c)](plans/2026-10-13-session-mcp-host.md) — the third part of plan 8, the MCP gateway (4 tasks): `start_session` and `resume_session` carry `mcp_servers` and `hat_id`, left out when empty; a host announces `mcp_servers` and `hello.mcp_isolation` (only the pinned `claude` is `claude_strict`); the hub sends servers only to a connection that can take them (`McpUndeliverable`), and a host refuses servers it cannot isolate unless the collector waives isolation (`mcp_isolation_unavailable`), before any spawn; Claude gets `strict-mcp-config` on every `session/new` and `session/load`, so the user's own MCP servers and claude.ai connectors no longer load in hennery's Claude sessions; no token in a frame's `Debug`, a log (the ACP crate's held at `error`, tungstenite's at `info`) or the host's own text. The collector sends no servers yet (8e). Release blocker: no release with 8c but without 8e. Amended after the security review of 2026-10-02 and its re-confirmation, and after its task reviews; executed 2026-10-02 (see its "Execution status").
   - [Sessions get their MCP servers (8e)](plans/2026-10-16-gateway-session-delivery.md) — the fifth part of plan 8, the MCP gateway (12 tasks): every start and resume decides what its session gets (`isolated`, `unisolated`, `fallback`, `unsupported`) and, inside its own transaction, mints a session token and hands the hat's connections mounted on the host plus its local stdio servers (`GET/PUT /api/mcp/stdio-servers`, env values sealed per row, step-up); every site that ends a session's right to MCP revokes its token in its transaction and, once that commits, ends what is open on it (`commit_then_cut`, a source audit); a host revoke cuts at once; an upstream's `Mcp-Session-Id` is bound to the token and connection by HMAC, `Last-Event-ID` goes up only beside one, a JSON answer has a 60 s deadline; a hat's purge runs the gateway's part first; a token an agent prints is stored, published and logged redacted; `HostItem.mcp_delivery` and `SessionDetail.mcp_delivery`; `mcp_isolation_unavailable` is 409 on every path. Amended after the security review of 2026-10-03 and its re-confirmation; executed 2026-10-03, rebased onto `a3146be6` and reverified 2026-10-12: 1736 Rust tests, 1303 web tests (73 files), 132 probe anchors matched once; the historical result is 131 BITE and [11] INERT (see its "Execution status"). Deferred: the proxy's early-reject drain. Open for the maintainer: whether a connection change cuts open streams, redacting echoed stdio values, and a default-hat change revoking nothing.
   - [OAuth MCP connections (8f)](plans/2026-10-15-gateway-oauth.md) — the sixth part of plan 8, the MCP gateway (10 tasks): discovery, DCR and pre-registered clients, PKCE consent, callback, sealed grants/secrets, refresh, probe and Web Push notices. Task 10 shares failed attempts, backs off unavailable/unsaved issuance, retires only HTTP 400 invalid_grant, preserves expired Unsaved as credential_unsaved, guards status with token-read stamps and clears Attempts after committed credential changes. Parent-authorized boxing keeps the stamp while clearing the enum-size Clippy errors. Base `94121391` retains 8e, 4e-i, 4e-ii-a and #130: 1948 Rust tests, 382 gateway tests, 1465 web tests (84 files), browser 58 passed / 11 skipped. Boxing races in four copies × two rounds: 24 runs / 1144 passes; before boxing, four copies × three rounds: 36 runs / 1716 passes. Fresh v5 replay: 397 blocks, 57 files, 20 snapshots and complete tree match. 384 anchors, 383 BITE plus accepted C23; all 26 final confirmation probes BITE, and PX16 freshly BITE after boxing. Task 10 scoped re-review CONFIRMED WITH NOTES; four parent rulings implemented, final follow-up review requested. Refresh-lock/probe-slot pruning and PQ1–5 remain open with defaults unchanged; see Execution status. Opener-null in 4e-ii remains required before consent-popup shipping.
   - [Image attachments (6a)](plans/2026-10-07-images.md) — plan 6a (6 tasks): the collector checks a prompt's content before anything is written, stores its images as content-addressed files (`attachments`, `event_attachments`) referenced from the turn and its `user_turn`, serves them at `GET /api/attachments/{sha256}`, and reports their size at `GET /api/settings/attachments`; the host announces `images`, reads 32 MiB frames, and refuses images to an agent that takes none. The API only. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Session list and search (6b)](plans/2026-10-07-session-list.md) — plan 6b (7 tasks, two PRs): the `title` and `commands` extracts (a load's replay included, an early title only filling an empty one), commands in the catalogue and `catalog_changed` as the catalogue stands, fixed-width stamps and recency moved only by listed events, `GET /api/sessions` (keyset pages, a search over title, cwd, branch and id across every lifecycle, `hat` refused until hats), a list item under 1 KiB whatever the agent reports, the detail built from it with the model and mode; then the `git_state` body and the host's git probe, off the actor and bounded to 3 s (6b-ii). Amended after two security reviews of 2026-10-02; executed 2026-10-02 as PRs #46 and #48 (see its "Execution status").
   - [Release build (7a)](plans/2026-10-07-release-build.md) — the first part of plan 7, distribution (4 tasks): OpenSSL built into release binaries (`vendored-openssl`), `hennery collector healthcheck`, cargo-dist's archives and installers built and checked in CI (`build.yml`; the installer hardened to refuse what it cannot check), and the collector image started and checked. Nothing publishes; packaging/README.md lists what publishing needs. 7b (managed runtime), 7c (services), 7d (doctor) and 7e (Nix) follow. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [`close_range` (7a-ii)](plans/2026-10-10-close-range.md) — one task: on Linux 5.11 and later, an adapter's spawn marks every inherited descriptor close-on-exec with one `close_range`, past the closing loop's 65536 cap, with the loop as the fallback; CI raises its hard descriptor limit so the test can hold one past the cap. Handed over by the debt lane. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Services, supervisor and host lock (7c)](plans/2026-10-09-services.md) — the third part of plan 7, distribution (4 tasks): `host.lock` and `up.lock`; `up` restarting a crashed child with a backoff (1 s to 60 s) and giving it up after ten crashes in five minutes, with `<data>/supervisor.json` for `status` and `doctor`; `hennery service install|uninstall|status` with the login shell's PATH, a launchd user agent or a systemd user unit, linger advised and WSL explained. Amended after the security review of 2026-10-01; executed 2026-10-02 as PR #42 and its stacked follow-up (see its "Execution status").
   - [Rotating logs and children that die with up (7c-iii)](plans/2026-10-11-logs-parent-death.md) — 7c's two gaps (2 tasks): run by a service, `up`, the collector and `host run` each write a rotating log of their own (`hennery-<process>.log`, 10 MiB × 5) in §8's directory or `HENNERY_LOG_DIR`, so launchd's `<role>.log` gets crash output only; and every child of `up` holds the read end of a pipe only `up` writes to, so a killed `up` leaves no child holding the port or `host.lock`. Amended after the security review and the plan review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Project picker (6c)](plans/2026-10-07-projects.md) — plan 6c (6 tasks): the probe map shared with hats' `resolve_path`, workspace roots in `host.toml` or `--workspace-root`, `list_projects` and `browse_directory` behind the browse fence, `GET /api/hosts/{id}/projects` and `…/browse` with the 60 s cache, and recents per hat, shown for the hat a path resolves to. Amended after the security review of 2026-10-01 and, for hats 5a, of 2026-10-02; executed 2026-10-02 as PRs #41 and B (see its "Execution status").
   - [`hennery doctor` (7d)](plans/2026-10-13-doctor.md) — plan 7d, distribution, in two PRs. 7d-i (3 tasks): `hennery doctor [--data-dir]` reads only, and says `ok`, `warn` or `fail` with a fix for checks 1 (the binary and the set present), 2 (glibc ≥ 2.28 by its loader's banner, kernel ≥ 4.18, NixOS without nix-ld), 5 (the service's PATH and its drift), 6 (nesting variables, root), 9 (disk, outbox, orphaned outboxes), 10 (the service, `up`'s children as `service status` judges them, restart needed by the running executable's identity), 11 (another `hennery` on PATH), 12 (the set against the pin, the hold), 14 (`host.lock`'s holder without taking it, the directory's and key's modes) and 17 (`--use-cli`); it exits 1 only on a failure. [7d-ii](plans/2026-10-14-doctor-ii.md) (3 tasks) adds checks 3 (each adapter answers `initialize` as the host would start it, its group killed after; on macOS a silence only warns), 4 (each CLI logged in, by its exit code alone), 7 (the collector step by step: URL rule, DNS, TCP, TLS, `/healthz`, then a `hello` only while no host holds `host.lock`), 8 (the clock against the collector's `Date`), 13 and 17's gap (the bundled CLIs against the terminal's and the overrides), and 16 (listeners and `public_url`); `probe_agents` and check 15 wait for their lanes. Amended after the security reviews of 2026-10-02; 7d-i and 7d-ii executed 2026-10-02 (see their "Execution status").
   - [Nix package (7e-i)](plans/2026-10-12-nix-package.md) — 2 tasks: `nix build` gives `hennery` (crane, on nixpkgs' own toolchain and OpenSSL), and `nix flake check` runs the package, clippy, rustfmt and cargo-audit against a pinned advisory database, on Linux and macOS in a new CI job on every PR. The adapter and frontend derivations and the NixOS modules are 7e-ii's. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Nix web UI (7e-ii-b)](plans/2026-10-20-nix-web.md) — 3 tasks: the web UI as a derivation of its own (`nix/web.nix`: `fetchPnpmDeps` with `fetcherVersion = 4` on nixpkgs-web's `pnpm_12`; one dependency hash for every system, as the fetcher's `--force` takes every platform, so no `supportedArchitectures`; pnpm 12's `v11/links` dropped before the fetcher's fixup), embedded in the package through `HENNERY_WEB_DIST` with `HENNERY_WEB_REQUIRE=1`, a `web-ui` flake check on the binary, reference guards on both, and `packaging/update-web-hash.sh` for every change to `web/pnpm-lock.yaml`. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Managed runtime and pinned adapters (7b)](plans/2026-10-08-managed-runtime.md) — plan 7b (7 tasks, two PRs): the adapter manifest (`crates/hennery-host/manifest.json`, compiled in) and its generator `hennery-pins`, the pin-bump job, the installer (resumable verified downloads, safe extraction, sets with `current`/`previous`, rollback hold, collection), `hennery host adapters update|rollback`, `join` installing the runtime, `host run`'s default agents from the installed set, and `--use-cli`. Pins proposed, operator to confirm. Amended after the security review of 2026-10-01 and the plan review of 2026-10-02; executed 2026-10-02 as PR #51 and its stacked follow-up (see its "Execution status").
   - [Web Push: the VAPID key, subscriptions and hat policies (10a)](plans/2026-10-14-push.md) — the first part of plan 10, Web Push (2 tasks): `<data>/vapid.key` (made once, never replaced; a damaged, symlinked, FIFO or readable one stops the start), the RFC 8292 token signed by hand with `p256` (ES256 as raw `r ‖ s`, checked against RFC 6979's and RFC 8292's vectors), push subscriptions that end with the signed-in session that made them (subscribing needs step-up; a push service's rotation needs none), endpoints checked as `https` on a public domain name and stored as parsed, per-hat push policies, the push contact in `GET/PATCH /api/settings`. Nothing is sent: delivery and the triggers are 10b's. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Web Push: the push triggers (10b-i)](plans/2026-10-15-push-triggers.md) — the second part of plan 10 (3 tasks): `pending_opened` carries the question's title from the host; the store reports the push edge a host fact crosses (a turn blocked on its first question, a turn ended `completed` or `failed`), read in the fact's own transaction with the session as it left it; one function decides what notifies; a per-tag coalescing queue that never blocks ingest; a resent backlog notifies only once reconciled and only what still holds; a question asked again after a withdrawal is quiet. A question outside a turn is an edge of its own; it notified nothing here, and 10b-iii makes it notify (the operator's decision). Nothing is sent: delivery is 10b-ii's. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Web Push: delivery (10b-ii)](plans/2026-10-17-push-delivery.md) — the third part of plan 10 (2 tasks): the collector sends its notices. Each goes to every subscription of the owner's under the hat's policy (muted, generic title, details), encrypted to the browser (RFC 8291, `web-push-native` with default features off), signed with 10a's VAPID token (reused until an hour before it expires), padded to 512-byte buckets, `TTL` 3600 and `Urgency` high or normal, never `Topic`. It goes through the shared egress client, public addresses only; one `Egress` is built in `main.rs` and the gateway shares it. A 429, 5xx, timeout or failed connection is retried (1 s, 4 s, `Retry-After` up to 10 s; 10 s a try, 30 s a subscription); 404/410 removes the subscription and expired ones are pruned, an outcome landing only on the endpoint pushed to. Amended after the security review of 2026-10-02, its re-confirmation and the whole-branch review; executed 2026-10-02 (see its "Execution status").
   - [Web Push: a question outside a turn notifies (10b-iii)](plans/2026-10-16-push-outside-turn.md) — one task, the operator's decision of 2026-10-02: a question opened while no turn runs notifies "needs your answer" like a blocked turn, under 10b-i's rules. Only the first open question notifies; one asked again after the agent withdrew one is quiet until the owner's next prompt, ordered by event id (sessions migration 11: `pending.opened_event_id`, `events_by_kind`); a resent question notifies after reconciliation if still open. A blocking question with no turn id gets the same bound. Amended after its review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Session delete (9a)](plans/2026-10-15-session-delete.md) — the first part of plan 9, delete and purge (3 tasks): `DELETE /api/sessions/{id}` behind step-up closes an attached session first, then deletes its events, turns, questions, answers, catalogue and project recent, and its images once no turn or event of any owner names them (`turn_attachments`); a scrubbed tombstone and one `session_deleted` event remain, triggers refuse any write for it, its host's frames are acked and discarded and its adapter is closed at the next handshake, or at once if the host reconnected during the delete; `secure_delete` on. The orphan sweep (9b) and the per-hat purge (9c) follow. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [The client view: the display fold (4a-i)](plans/2026-10-16-view-fold.md) — the first part of plan 4, the frontend (4 tasks): a pure crate, `hennery-view`, folds a session's stored events into the display items every client renders (client view spec §3): `user_turn`, `message`, `thinking`, `tool_call`, `plan`, `question`, `marker` and `unrecognised`, with ids stable for the session's life and the version of their last change. Groups cut at each prompt, every merge kept inside its group; tool calls merged without erasing, their output read from every shape, with the fabrication warning; questions parsed for their cards, with a monotonic verdict and `answerable` from the server's pending set; anything unknown kept as an `unrecognised` item, its JSON as text. Every agent string and count is capped, and a turn past its budget is elided behind one marker. `apply` and `take`. Golden tests over scrubbed recordings of `claude-agent-acp` 0.81.0 and `codex-acp` 1.13.0. Nothing serves the items yet: the view API is 4a-ii's. Amended after the security review of 2026-10-02, its re-confirmation and the plan review; executed 2026-10-02 (see its "Execution status").
   - [The client view: the view API (4a-ii)](plans/2026-10-17-view-api.md) — the second part of plan 4, the frontend (5 tasks): the collector serves 4a-i's display items to every client, folding the stored events as it is asked; nothing new is stored and no migration is added. `GET /api/view/sessions/{id}` answers a page of whole turns, the newest first, within a byte budget; `GET /api/stream/view/sessions/{id}` streams whole items as they change, resumable from `Last-Event-ID` or `?after=<epoch>:<revision>`, with `catalog_changed`, `session_removed` and `resync_required`; `GET /api/view/sessions` and `GET /api/stream/sessions` serve the session list as summaries, with `question_waits` and the count of sessions waiting (`waiting`, `waiting_changed`), the stream holding 250 ms after a ring and sending a summary only when it changed; `GET /api/view/sessions/{id}/turns/{turn_id}` gives the prompt of a turn not delivered, for "send again". Every route is behind `operator_only`; an unknown or foreign session is 404 before anything is read; each stream takes the hub as a doorbell and reads the store from its own cursor, through a queue bounded by count and bytes. 18 new owner-filtered statements, in the owner audit; one parser for the list's filters; `hennery-view`'s generator writes `web/src/generated/view.ts` and its schema, checked in CI. Amended after the security review of 2026-10-02, its re-confirmations and the plan review; executed 2026-10-03 (see its "Execution status").
   - [The orphan sweep (9b)](plans/2026-10-17-orphan-sweep.md) — the second part of plan 9, delete and purge (1 task): at the collector's start and then hourly, the owner's image rows that no turn or event references go, then the files in `attachments/` that no owner's row names and leftover `.tmp` files, each only past a one-hour grace; only regular files with a hash or a temporary name, never through a link, listed outside the store's lock and removed in batches under it, stopping at shutdown; an image saved again has its time refreshed. Covered by plan 9's security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The per-hat purge (9c)](plans/2026-10-18-hat-purge.md) — the third part of plan 9, delete and purge (2 tasks): `POST /api/hats/{id}/purge` behind step-up refuses a default hat and a hat with a session running on a reachable host, then freezes the hat (`purged_hats`, its rules deleted; nothing enters or leaves it), deletes each of its sessions as 9a does (unreachable ones closed collector-side, `unconfirmed`), and the hat row last, its recents and push policies with it; a re-POST resumes; `GET …/purge` previews; `forget_hat` after every handshake; the WAL checkpointed once. Amended after plan 9's security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The agent's transcript on its host, Claude (9d-i)](plans/2026-10-19-host-transcripts.md) — the fourth part of plan 9 (4 tasks, two PRs; operator delegated, parent decided 2026-10-02): the host records each session's agent home at start in a registry of its own; a delete or a purge writes a `host_forgets` record before the scrub and sends `forget_session` when the host is ready, after every handshake and after the session closes; for Claude the host runs the adapter's `session/delete`, then removes the transcript's family and the session's `file-history`, `session-env`, `tasks` and `debug` entries through directory descriptors, never through a link, and checks afterwards; what is left is reported (kinds and counts, never paths) and listed in Settings; transcripts started after a context clear inside the agent are not removed. Codex is 9d-ii. Amended after two security reviews of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The agent's transcript on its host, Codex (9d-ii)](plans/2026-10-20-codex-transcripts.md) — the last part of plan 9 (4 tasks; operator delegated, parent decided 2026-10-02): the host runs the bundled `codex app-server` against the session's recorded `CODEX_HOME` only, checks `initialize`'s `codexHome`, calls `thread/delete` and checks afterwards; when the app-server cannot be used (or timed out three times in a row) codex-acp archives and the host removes the rollouts through the descriptor walk, reporting that copies may remain in Codex's database; the call shape is pinned per Codex version in the manifest, checked by `hennery-pins` and re-read at every pin bump. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Delete and purge: the design record (plan 9)](plans/2026-10-21-delete-and-purge-design-record.md) — why plan 9 was built as it was: the decisions and the security reviews' amendments for 9a–9c and 9d, the operator's delegated decisions (the parent, 2026-10-02), and the evidence on Claude's and Codex's own session storage (claude-agent-acp 0.81.0, codex-acp 1.13.0, Codex 0.155.1) to re-read at a pin bump.
   - [Generic plug-in contract (C1)](plans/2026-10-26-plugin-contract.md) — generic owner/hat registration, completed activity with typed provenance, exposure bindings and durable deletion lifecycle; built first and replayed on merged design main (40 blocks, exact tree match). The PR #140 flake investigation fixed writer-registry identity lifetime test-first and rebased onto W1 main `26cc3cca`; current verification and historical replay are distinguished in its execution record. Parent re-review and Linux/macOS CI remain pending.
   - [Plug-in startup context (C2)](plans/2026-10-30-plugin-startup.md) — scoped opt-in context in a new session's first operator prompt, typed provenance and separate display, bounded failures and lifecycle fences. Security re-review approved at `b1f9b402`; rebased onto D2/P2 main `a58479c7` with both command/config/close fences preserved. Final six Rust checks passed (2,374 tests), web gate passed (1,823 tests), Nix flake check passed, fresh integration replay matched 790 files, four copy probes caught and 516 loaded test executions passed. Post-rebase delta review and Linux/macOS PR CI remain parent-owned.

   - [WSS transport and diagnostics (W1)](plans/2026-10-26-wss-transport.md) — merged as #139; verified HTTPS/WSS transport, private-CA trust, durable enrollment recovery, migration and diagnostics. Its record preserves the build/review history; public real-adapter/MCP acceptance is carried into W2.

   - [Proxy attribution and public deployment (W2)](plans/2026-10-27-wss-proxy.md) — built and replayed on `256691fe`: exact trusted peers across all limiter charges/clears, executed proxy/HTTPS README recipes and W1 recovery gates. PR #147 maintainer-delegated review returned APPROVE AFTER AMENDMENTS; its one request-cap coverage Minor is implemented, removal-probed and locally checked. Scoped re-confirmation, Linux/macOS CI and live public-adapter/MCP acceptance remain pending.
   - [Session-bound MCP and family identity (D1)](plans/2026-10-27-delegation-mcp.md) — collector-local opt-in MCP delivery, generation-bound grants, shared identity and immutable scoped family storage; built first, exact fresh replay and guard/load evidence recorded. Actual pinned Claude/Codex discovery passed. Maintainer-delegated review returned APPROVE; its one cycle-fixture Minor is corrected and independently probed. Linux/macOS CI remains parent-owned; tools, durable delivery and UI follow in D2–D4.
   - [Delegation tools, catalog and configuration (D2)](plans/2026-10-29-delegation-tools.md) — seven scoped tools, host catalogs and fenced owned-child commands; ordinary elicitation only, one generation. Amendments are CONFIRMED and the Nix SQL-source fix is approved. Rebased onto P2 at cdcd0cb8, preserving both implementations and all owner-audit cases. All six Rust checks (2,339 tests) and native Nix flake checks passed. Historical replay/load evidence remains in the plan; PR #149 and Linux CI remain parent-owned. D3–D4 follow.

   - [Release foundation (R1)](plans/2026-10-28-release-foundation.md) — hardware-backed inventory approval plus the executed verify-then-run README bootstrap, re-confirmed by the parent. The Linux CI tool-directory collision is repaired with duplicate-name/conflict regressions. Rebased onto W2 at `e36e66c8`; post-rebase checks, COPY probes and fresh replay evidence are recorded in the plan. PR #145 awaits review and CI; maintainer-only setup remains and publication is disabled.

   - [Homebrew tap (R2)](plans/2026-11-02-homebrew-tap.md) — frozen cargo-dist formula, secret-free native local-tap install/upgrade/uninstall CI on macOS arm64 and both Linux architectures, registered owning channel, protected signed-inventory publisher, and service/PATH guidance. Local macOS 27/CLT 26.6 refusal is retained without bypass; the parent owns native CI acceptance and independent review. Publication remains disabled.

   - [Crates.io and cargo-binstall (R3)](plans/2026-10-28-crates-io.md) — seven package-local production crates and signed R1 gates; rebased onto C2/D2 main 7fe43fbe. Fresh tarball acceptance found and fixed Cargo basename include collisions at 1dc57fe4, with real Cargo regression, test-harness refusal and production feature auditing. All seven dry runs/offline builds, locked/unlocked registry installs, UI/browser checks and Rust 1.88 pass on the new candidate. All six Rust checks pass (2376 passed, one unchanged pinned-adapter test ignored); release129, packaging82, actionlint and native full Nix checks pass. Four RED regressions, exact-tree fresh replay and ten COPY probes are recorded. Opt-in hook source is retained, disabled in production. Native binstall and both publication switches remain off; reserved GHCR stays unselectable until R4 adds its aggregate job. Scoped parent review, current PR #144 status and maintainer-only setup remain.

## Maintainer decisions (2026-09-27)

Every open design decision is resolved; the specs carry the details.

| # | Question | Decision | Where |
|---|---|---|---|
| 1 | `master.key` in the OS keystore | No — a 0600 file in v1; a separate OS user or container is the real protection | kernel §10 |
| 2 | Per-hat "isolate agent user config" | Documentation only in v1 | umbrella §8.4, ACP core §15 |
| 3 | Codex sharing a composed `CODEX_HOME` | Stays on the mixed-host fallback until measured | umbrella §8.5, ACP core §6 |
| 4 | Headless macOS hosts | A logged-in user is required in v1 | distribution §6.2, §13 |
| 5 | "Use my own CLI" | Advanced install option (`--use-cli`), not the default | distribution §13 |
| 6a | Attachment size cap | None in v1; disk usage shown in Settings | ACP core §15 |
| 6b | VAPID contact | Not asked at setup; derived from `public_url`, optional in Settings | kernel §6 |
| 6c | Multiple listeners | Supported; browser access stays bound to `public_url` | kernel §7 |
| 6d | Static-token header | Header name plus optional value prefix | gateway §1 |
| 6e | Windowing threshold, vendor token behaviour, `GET` SSE | Measured once the code exists | frontend §15, gateway §13 |
| 7 | Plain `http` to a LAN MCP server (operator, 2026-10-02) | Only for a connection marked "internal network", and only to internal addresses; a public address stays `https` only | kernel §7.1, gateway §5.7 |

---

_Generated with Claude AI — please review before distribution._
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "docs/homebrew.md", "phase": "feature", "sha256": "87e20a2391bc26e6d4c9a9e56841f7a207d3813dd7cedc6de7bb55ab4ce9ef53", "size": 3381, "task": 2} -->
````text
# Homebrew installs and services

The planned project tap is `marcinwadon/homebrew-tap`. Publication is disabled
until the maintainer enables a qualified stable release; the first alpha is
GitHub-only. The commands below become available after that enablement. The
binary formula covers Apple Silicon macOS and x86_64/aarch64 Linux, subject to
native CI acceptance. It does not qualify Intel macOS or managed Alpine hosts.

Install the versioned release archive and check the executable:

<!-- check: homebrew-install -->
```sh
brew install --formula marcinwadon/tap/hennery
hennery --version
brew --prefix hennery
```

The formula verifies archive SHA-256 and installs the same executable, embedded
UI, licence and third-party notices. The normal tap path trusts Homebrew, the
tap and GitHub release hosting; it does not independently perform the README's
hardware-inventory and Sigstore verification. Installation starts no service,
installs no agents and changes no login. A host may download its separately
pinned runtime when the operator later joins or starts it.

Before installing a service, put Homebrew's stable binary directory on the
login shell's PATH and check which Hennery executable is selected. Use Hennery's
own service installer, choosing the existing role and data directory. There is
no separate Homebrew service definition: do not register it through Homebrew's
service manager. Hennery records the invoked executable path and captures the
login shell's PATH; use the stable Homebrew binary link rather than an absolute
versioned Cellar path. A graphical macOS login is required for the user agent.

Upgrade and run the formula's version, embedded-UI and notices checks:

<!-- check: homebrew-upgrade -->
```sh
brew upgrade --formula marcinwadon/tap/hennery
hennery --version
brew test marcinwadon/tap/hennery
```

An already-running process continues to use its old executable after upgrade.
Run Hennery's service installer again with the same role and data directory to
refresh PATH and restart it. This is especially necessary for a service that
names an old Cellar path. Check service status and doctor afterwards; upgrade
never silently restarts a service or changes its role. Preserve the data backup
and migration precautions in the README.

Before package removal, explicitly stop and uninstall any Hennery service with
Hennery's service uninstaller. Then remove every installed package keg:

<!-- check: homebrew-uninstall -->
```sh
brew uninstall --force marcinwadon/tap/hennery
```

This removes package files and links, preserving user data, managed runtime,
agent logins and operator service definitions. Removing the formula alone is
not a service uninstall or a data purge.

The native PR and candidate jobs execute these exact three command blocks in a
fresh pinned Homebrew prefix and local file-based tap, with scratch home/cache/
config. The old-version fixture labels the same candidate payload as 0.0.0;
its upgrade proves Homebrew's transaction, not an older application's migration.
Both the initial and upgraded executable are compared byte-for-byte with the
candidate archive. Removal checks package leftovers and preserved data/service
sentinels. macOS 27 with CLT 26.6 refused the local proof; that check remains
intact. Native runner CI is the acceptance evidence.

Generated with Claude AI — please review before distribution.
````

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "docs/release-process.md", "phase": "feature", "sha256": "be98906e0d2f07d2fcb86e9c2a5e60f15efd28a83d38145b243a0e2ad58aa718", "size": 25234, "task": 2} -->
````text
# Release process

R1 implements a disabled release foundation. Merging it authorizes neither a
channel nor publication. First release is `0.1.0-alpha.1`, GitHub only; stable
`0.1.0` and further channels require their own maintainer go-ahead. R3 owns crate
packaging/version metadata and R4 image packaging. No publication or external
settings change was performed while building this foundation.

## Boundary and maintainer-only setup

**Parent ruling on the maintainer's behalf, 2026-10-15:** enforce the boundary on
the platform, not in branch-editable workflow code. A repository writer, including
an agent pushing with the maintainer's key, can run arbitrary code and request
ordinary `GITHUB_TOKEN` write permissions or OIDC. Static lint and job conditions
cannot stop issuance. Such a branch must neither obtain dedicated publishing
credentials nor produce a signature accepted by consumers. All signing identities
must be the exact release workflow at a protected release tag; branch identities
are rejected. The **maintainer decision, 2026-10-15**, adds the root of trust:
the exact immutable inventory must carry a detached OpenPGP signature made with
the maintainer's hardware-backed signing subkey. Someone without access to that
physical signing authority cannot authorize different release bytes, including
an agent with the maintainer's SSH push key that creates an unsigned tag and
changes its workflow to mint an exact-tag attestation. Sigstore alone is insufficient.
Consumers use a reviewed, independently trusted verifier and pinned public key.
Repository disruption/denial of service is outside that guarantee. Signed-tag
checks remain defense in depth; the inventory signature is release authority.

Before enabling any switch, the maintainer must configure and audit:

0. **Physical approval:** configure the signing slot on the YubiKey locally:
   `ykman openpgp keys set-touch sig on`. This requests touch for each signature.
   `cached-fixed` is an alternative with a 15-second reuse window after touch
   and cannot be disabled without deleting the private key; another process
   could sign within that window. Prefer `on` for release approval and remove
   the key after use. Confirm that no accessible software copy of the signing
   subkey defeats the hardware boundary. The audit records an explicit personal
   confirmation, not a remotely verified hardware property:
   `"maintainer_touch":{"confirmed":true,"fingerprint":"F26C7F594DFE84D131703AFC23E5A318AE8D2861","policy":"on"}`.
   See [Yubico's touch policies](https://docs.yubico.com/software/yubikey/tools/ykman/OpenPGP_Commands.html).

1. **Environment `release`:** required reviewer is exactly the maintainer's User
   ID; administrator bypass explicitly disabled. Deployments allow only `v*`
   tags, with no branch policy. Use `.github/release-environment.example.json`
   and `.github/release-branch-policy.json` (the latter describes a tag policy).
   Sole-maintainer self-review is allowed. Every long-lived publishing credential
   is an environment secret here, never a repository secret. The initial audit
   requires repository secrets empty, preventing opaque publishing credentials
   under unexpected names. Storage-only credentials use their restricted staging
   or audit environments; they cannot publish.
2. **Two active tag rulesets:** `.github/release-tag-creation.json` restricts
   creation of `v*`, with only the repository owner's **User** ID as an always
   bypass actor. Replace placeholder 0 with the actual owner ID; this personal
   repository has no Maintain role. `.github/release-tag-ruleset.json` separately
   restricts update/deletion with **no** bypass actors. The owner's creation
   exception cannot bypass the second ruleset. `GITHUB_TOKEN` is not a creation
   bypass actor. Never disable a rule, move a tag or reuse a version.
3. **Signed annotated tags:** use the pinned signing subkey fingerprint
   `F26C7F594DFE84D131703AFC23E5A318AE8D2861`, found with `git log --show-signature`
   in commit `3b7b5f2d2af8821f4617afb08ba1dc766c5b9f14`. The checked-in public key
   verifies that historical commit; only its personal UID was exported. It is
   distinct from GitHub's shared web-signing key. `tag_signature.py` freshly
   fetches the tag, verifies its actual signature with an isolated keyring, and
   requires its annotated object to directly point at the exact candidate commit.
   Candidate storage credentials wait for this check, and every publication gate
   repeats it. GitHub's signed-commit rule does not verify tag signatures.
4. **Immutable GitHub releases:** enable the repository setting before the first
   release. The publisher creates a draft, adds/verifies every asset and then
   publishes it, requiring the returned immutable state. After publication,
   asset changes must be refused by GitHub. Never try to repair an immutable
   release by replacing assets; use a new version. Tag rules also block ordinary
   workflows from manufacturing new `v*` tags.
5. **GitHub upload App:** narrowly scoped contents write and Actions read, installed
   only on this repository. `RELEASE_PUBLISH_APP_KEY` exists only in `release`;
   `RELEASE_PUBLISH_APP_ID` is its environment variable. No administration access
   is granted to publishers. Mint its short-lived token after preflight.
6. **crates.io trusted publishing:** every production crate must require owner/repo
   `marcinwadon/hennery`, exact workflow filename `release-publish.yml` and
   environment **`release`**. A workflow match without the environment is
   insufficient. A branch job cannot enter `release`; its environment-less OIDC
   token must be refused by crates.io. Bootstrap claiming and token handling remain
   R3's separate reviewed process, confined to the same environment. Do not enable
   this channel until every crate's actual settings and source delivery qualify.
7. **GHCR:** configure this repository's package **Manage Actions access** to
   **READ**, disabling inherited write/admin access. An arbitrary branch job's
   `packages: write` must still be unable to push. R4 uses a dedicated publishing
   credential under `GHCR_PUBLISH_TOKEN`, only in `release`; it must not use
   `github.token` to authenticate writes or signing pushes. Qualify the permitted
   dedicated credential with the maintainer before enabling GHCR. Current GitHub
   documentation describes PAT (classic) authentication, not App/fine-grained
   registry authentication; the parent's credential-kind ruling is required
   rather than assuming unsupported authentication works.
8. **Held storage:** private versioned S3 candidate/audit buckets, Object Lock
   COMPLIANCE for at least a year plus legal hold ON; no CI delete, overwrite or
   hold removal. `release-staging` allows only approved `v*` tags and holds only
   storage credentials. Configure candidate bucket/region, separate conditional
   stage and exact-version read principals, and an audit principal restricted to
   held append-only `audit/<run>/<attempt>/` writes. Enable storage only after
   IAM/retention review. Keep holds until all channels and public acceptance
   complete; source/rollback retention is a longer obligation.
9. **Negative platform acceptance:** after setup, explicitly authorize a disposable
   branch Actions job with `packages: write`, its ordinary `GITHUB_TOKEN`, **no
   environment** and no dedicated credential. Run `post_setup.py` against a known
   existing package digest. It proves read access then attempts the registry push
   authorization/write boundary and requires 403. Unexpected success or ambiguous
   errors stop qualification; a misconfigured package may receive a canary index,
   so inspect it and repair access. Record the actual result for the local audit.
   The offline tests use transport doubles; no live negative push ran here.
   Separately verify a branch OIDC token cannot satisfy crates.io's required
   environment and branch attestations fail the exact-tag consumer policy.

Official references: [environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[ruleset bypass visibility](https://docs.github.com/en/rest/repos/rules),
[immutable release lifecycle](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases),
[GHCR authentication and access](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[crates.io trusted publisher identity](https://github.com/rust-lang/rfcs/blob/master/text/3691-trusted-publishing-cratesio.md).

## Candidate and qualification

Prepare a reviewed release PR with one workspace version, exact internal crate
edges, matching web metadata and a tracked `CHANGELOG.md`. Record tested platform
floors, runtime pins, security/migration/config changes, backups/restarts and early
tester limits. Build from the approved signed tag and exact commit. Candidate
creation is not publication approval.

`release-candidate.yml` verifies the pinned tag signature before storage
credentials, builds fresh with fixed native runners and pinned Rust/cargo-dist/
actions/locked web tools, and restores no Actions caches. Build the UI once.
Linux x86_64/arm64 musl and macOS arm64 archives carry notices before final hashes.
Each target records runner/SDK/toolchain identity, SPDX 2.3 Rust/native/frontend
components, corresponding third-party source, and current Rust/frontend audit
reports. Missing licence text/findings stop freeze. Supplemental licences retain
exact upstream bytes; fonts/assets/redistribution/AGPL corresponding-source and
static OpenSSL support still need maintainer clearance. Runtime Node/agent
payloads are inventoried separately and not redistributed.

The common manifest resolver accepts either the original adapter path or R3's
host-crate path, hashes the original bytes, and rejects conflicting dual copies.
Source archives preserve checkout/lockfiles/licences/build instructions. Mixed
candidates contain executable and source tarballs; installer acceptance counts
only executable archives and still requires each intended archive to be offered.
It verifies hashes, provenance invocation, refusal paths and atomic installation
on every native target. Fixture signatures are mocked before candidate signing;
that is not public signature qualification.

Freeze one complete channel/target set and every final payload. The inventory
includes exact executable hashes, source/tag and candidate run/attempt; checksum
and signature sidecars avoid cycles. No rebuild or byte addition under an old
inventory. Held receipts identify exact object versions. Expiring Actions copies
are convenience only. Require completed successful exact-source push/manual runs
of `ci.yml`, `build.yml`, `nix.yml` and `release-tests.yml`; missing, skipped,
pending, failed, cancelled, fork/PR-merge or wrong-SHA evidence refuses.

Before the first release, qualify real logged-in agent/UI/doctor/session/MCP,
service install/restart/upgrade/uninstall and platform floors using disposable
homes. Containers/shell fixtures do not qualify native services, Intel macOS,
older OS versions, managed Alpine hosts or notarization. GNU/native package
repositories, Apple notarization, public caches and R6 modules retain their gates.

## Settings audit and publication approval

Inspect the final digest set, source, channels and targets through trusted local
tools. Enter the reviewed `nix develop .#release` shell. At approval time, sign
the **exact held canonical inventory bytes** locally:

```sh
packaging/hennery-release sign-approval --inventory candidate/release-inventory.json \
  --signature release-inventory.json.asc --confirm-hardware-touch
```

This invokes `gpg --detach-sign` with the full pinned signing fingerprint, using
the local hardware/PIN/touch interaction. It refuses CI and existing output;
never run signing in Actions or give CI a private key. The CLI cannot prove touch
configuration; the explicit confirmation is the maintainer's assertion. The
signature is a public sidecar, outside the frozen candidate, avoiding a digest
cycle. Supply its complete armored bytes as dispatch input `maintainer_signature`.
Gates require it before issuing publication credentials and at every boundary;
publishers verify and upload it as `release-inventory.json.asc`, and retain it
with approval evidence. A new inventory requires a new physical approval.

Run the reviewed `settings_audit.py` locally with the maintainer's own `gh`
authentication, after the candidate run completes. It independently verifies the pinned tag signature before using owner settings
authentication, then checks the actual owner, environment, both rulesets including bypass actors, secret locations and immutable
release setting. Publishers cannot read private bypass lists and never receive an
administration token. Where no settings API exists, the maintainer personally
checks GHCR package Actions access/negative-push result and crates.io publisher
records, supplies the observations JSON and explicitly confirms the displayed
result. It is an authenticated maintainer inspection ratified by the review,
not an artifact-supplied authorization or automatic UI verification.

Retain the canonical report and its SHA-256. Its candidate/source/tag/channels/
targets/global inventory/run attempt must match, it must postdate candidate
completion and be at most 24 hours old. Dispatch `release-publish.yml` at that
**same signed tag**, supplying the complete event inputs documented in the
[gate contract](../packaging/release/README.md), including the report and digest.
The run summary prints the approval tuple and publishing run/attempt. Approve
only with the exact `approve-release-v1:<tuple-hash>` review comment. The tuple
includes the audit digest; changing the audit or retry attempt needs new approval.
Any rejection requires a fresh dispatch. A stale audit requires a new local audit
and newly approved dispatch, even for unchanged held bytes.

Protected read-only `authorize` fetches held bytes and validates before writer
jobs, whose local conditions match the current digest/attempt. Every writer still
uses `release`, fetches exact held versions, runs in-job preflight, obtains only
its dedicated authority, then revalidates at each sign/upload/final-publication
boundary. Runtime evidence is limited to ordinary readable runs/jobs/reviews/tag
objects plus cryptographic signed-tag verification. Hold every gate receipt before
writing; storage failure stops. Channel reconciliation must verify actual remote
bytes/digests and upload only authoritatively missing artifacts. Only after all
enabled channels and public-path acceptance succeed may moving aliases or
announcements advance.

## Consumer verification and recovery

The authenticated bootstrap is the executed
[README shell block](../README.md#verify-a-release-installer-before-running-it),
named `release-bootstrap` under the README guardrails. It uses trusted installed
GnuPG, curl, jq and a SHA-256 tool, not a verifier downloaded from a release.
First compare full signing fingerprint
`F26C7F594DFE84D131703AFC23E5A318AE8D2861` through the README on main,
`https://github.com/marcinwadon.gpg`, and
`https://keys.openpgp.org/vks/v1/by-fingerprint/F26C7F594DFE84D131703AFC23E5A318AE8D2861`.
These are independent of release assets. The block fetches each, compares the
full public signing-subkey fingerprint with installed GnuPG/awk and imports keys
only into a fresh isolated keyring. Stop if a channel is absent or disagrees;
the maintainer must publish/confirm these keys before enabling releases. The
[keyserver API](https://keys.openpgp.org/about/api/) supports lookup by the full
primary or subkey fingerprint.

Next download `release-inventory.json`, `release-inventory.json.asc` and the
installer as data. Require successful `gpg --verify` and a pinned `VALIDSIG`,
extract the unique installer's SHA-256 from the authenticated inventory and check
it with `sha256sum -c` or `shasum -a 256 -c`. Only then execute the installer.
It continues to authenticate archives itself. A malicious release cannot replace
this bootstrap's verifier/key; use the inline commands reviewed on main and
independently confirm the pin before execution. Release-contained verification
code is usable only after its own bytes have been authenticated this way.

Every consumer first requires the valid detached maintainer signature over the
exact inventory, pinned to signing subkey
`F26C7F594DFE84D131703AFC23E5A318AE8D2861` (primary key
`1CE2B7354FC6ED5D9DE12DF664C16DED80CCEABA`). Missing, malformed, wrong-key and
different-inventory signatures refuse even when Sigstore passes. The helper
commands below are not the initial bootstrap: first authenticate the inventory
with installed GnuPG as in the README. Fetch its exact `source_sha` into a clean
checkout without executing repository code; compare `git rev-parse HEAD` with
that authenticated SHA and require `git status --porcelain` to be empty before
running a helper. A tag name or a verifier obtained from a release is insufficient.
Then use that authenticated source checkout for additional provenance checking:

```sh
packaging/hennery-release verify-approval --inventory candidate/release-inventory.json \
  --signature release-inventory.json.asc
python3 packaging/release/verify.py --candidate candidate --tag v0.1.0 \
  --source-sha "$SOURCE_SHA" --bundle release.sigstore.jsonl \
  --approval-signature release-inventory.json.asc
```

Both verifications are mandatory. Every accepted Sigstore signature must have certificate identity
`https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<exact-release-tag>`,
GitHub OIDC issuer and matching source ref. `verify.py` checks the inventory's
hardware approval first, then attestation, source/tag, every payload/checksum/binary digest and each
payload attestation. It also supports immutable OCI digests and relevant SLSA/
SPDX predicates; R4 applies the same policy to platforms and final index. A
branch's valid cryptographic signature is rejected. Do not trust an unsigned
checksum or execute a downloaded installer before authenticating it through a
trusted copy of this verifier. The verifier itself must come from reviewed,
trusted source, not arbitrary branch code or an unverified artifact.

The hardened installer requires GnuPG, jq and the real GitHub CLI. It verifies the
inventory against its embedded pinned public key, binds the archive's SHA-256
and release tag to that signed inventory, and requires the exact Sigstore tag
identity before extraction/execution. A caller may supply durable local sidecars;
they are still fully
verified. No missing verifier/hash/signature fallback is accepted. It stages in a
private sibling directory and atomically creates the destination without
replacing files, links, directories or races. It uses no sudo and starts no
services/runtime downloads. Upgrade by stopping services and explicitly removing
the previous chosen user binary or choosing an empty directory, then run doctor.

Native cargo-binstall documents minisign-only support. It cannot enforce this
Sigstore workflow identity through invented metadata. Freeze and live gates read the final CLI crate metadata, disable all native
binstall strategies and require the exact tag identity for the external verifier.
Keep native acceptance disabled pending the parent's capability ruling and a reviewed
R3 bridge; do not claim it is an authenticated install path. The common external
verifier enforces both the hardware approval and exact tag identity. See [upstream signing support](https://github.com/cargo-bins/cargo-binstall/blob/main/SIGNING.md).

OCI verification additionally requires the complete frozen inventory directory
and detached signature: pass `--image ghcr.io/marcinwadon/hennery@sha256:...`,
`--inventory-directory candidate`, `--approval-signature release-inventory.json.asc`
and `--tag` to `verify.py`. The hashed `ghcr-index.json` must contain a `digest`
matching the requested immutable image. R4 must normalize that index descriptor
and apply this policy before accepting an OCI subject; an attestation alone or a
mutable image tag is insufficient.

Retries recover held exact versions, recheck holds/digests and renew audit/attempt
approval. Reconcile every remote artifact, including lost upload responses. Reuse
an existing cryptographically verified bundle safely across reconcile then upload;
never replace a differing local/remote bundle. Only verified absence permits an
upload; ambiguous auth/network responses or mismatches stop. Published GitHub
assets are immutable; incomplete/conflicting releases require a new version.
Retain and reuse the identical approved `.asc` on retries; regenerating a
different signature cannot replace an already published immutable sidecar.

Before evaluating a release flake, use the independently trusted verifier to
authenticate the inventory and its source commit. Check the fetched source is
that exact full commit SHA and verify the annotated tag as defense in depth;
invoke Nix with the authenticated full SHA. A tag name or an unverified flake
cannot authenticate its own code. This also applies to replacement verifier
code downloaded from a tag. Nix builds the real UI and
retains reference guards and source/UI/adapter identity. Native Linux arm64 is in
CI; no public cache or unqualified platform is implied. Public-path acceptance
belongs to the maintainer after authorized publication. Before rollback, stop
services, back up the complete data/config/keys, and check schema compatibility;
restore a matching backup or ship a forward fix if downgrade is unsafe. Withdraw
bad versions with remediation and retained corresponding source; never rewrite
assets/tags/crate/image versions. Revoke affected credentials where appropriate.

## Homebrew channel setup (R2)

Create the public `marcinwadon/homebrew-tap` repository with a `main` branch.
Store `RELEASE_HOMEBREW_TOKEN` only in this repository's protected `release`
environment. It may be a fine-grained PAT or a live GitHub App installation
token with contents write limited to that tap. No workflows/admin permission,
main-repository publication authority or repository-level secret is needed.
An App token supplied this way must remain valid for the job; this workflow
does not mint or refresh it. Maintainer rotation/revocation remains explicit.

The maintainer's local settings observations include this scope confirmation;
these are personally inspected properties, not remotely inferred token rights:

```json
{"homebrew":{"repository":"marcinwadon/homebrew-tap","branch":"main","environment":"release","credential":"RELEASE_HOMEBREW_TOKEN","kind":"fine-grained-pat","repositories":["marcinwadon/homebrew-tap"],"permissions":{"contents":"write"},"scope_confirmed":true}}
```

For an App installation token, the kind is `app-installation`. Merge these
observations with the existing hardware-touch and other selected-channel
observations before producing the local settings audit. Its digest is bound
into the authenticated approval tuple, alongside the YubiKey-signed inventory,
candidate and publishing attempts. Selecting Homebrew requires its secret and
scope observations; a GitHub-only candidate does not.

Both `RELEASE_PUBLICATION_ENABLED` and `RELEASE_HOMEBREW_ENABLED` default to off.
Enable GitHub first, then Homebrew, crates.io and GHCR as independently qualified
channels. Homebrew waits for the GitHub publishing job and requires a public,
immutable stable release whose formula, referenced archives and inventory
match the frozen candidate. Prereleases remain GitHub-only. A merge never
publishes; dispatch, exact protected tag, current authorization and selected
signed channel are all required.

The tap job validates preflight, verifies the maintainer signature and exact-tag
Sigstore provenance, checks public bytes, and obtains a fresh boundary receipt
before exposing the tap credential to its final step. The writer revalidates
the live gate and immutable bytes before its single atomic [Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents) update
of `Formula/hennery.rb`. It never regenerates a formula. Identical remote bytes
are an idempotent no-op; the same version with other bytes, a downgrade, an
unparseable remote formula, conflict or ambiguous response stops. Reconcile
manually after uncertainty; never force an update to repair it. A confirmed
update is read back and compared with the frozen formula.

The secret-free `release-homebrew` PR workflow builds the native candidate
through the release's archive helper and tests the guide's local-tap commands
on macOS arm64 and both Linux architectures. The release-candidate workflow
also tests the complete frozen candidate on all three platforms, with the
registered `homebrew` aggregate as the owning job. Unselected native jobs are
successful no-ops and only the aggregate is skipped. All native acceptance must
pass before enabling publication. See [service/PATH guidance](homebrew.md).

Generated with Claude AI — please review before distribution.
````

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/README.md", "phase": "feature", "sha256": "e5d91d20999fc5d54123116caf4a767174470ea0edf147a0506ae8e328e8db8b", "size": 17408, "task": 2} -->
````text
# Release builds

What a hennery release would ship is built by the `build` workflow
(`.github/workflows/build.yml`) on every pull request and every push to
`main` (distribution spec §2, plan 7a). It is checked, then kept as workflow
artifacts for a week. **Nothing is published:** there are no releases yet.

R1 adds separate, disabled-by-default candidate and publication workflows.
They rebuild at the approved tag, add notices/SBOM/source, retain exact candidate
versions, and bind protected-environment approval to inventory/run attempts.
The [release process](../docs/release-process.md) lists maintainer setup and the
[shared gate interface](release/README.md) is the R3/R4 integration contract.
The original `build` workflow remains a qualification probe; its artifacts are
never promoted to a release.

| Artifact | Built by | Checked by |
|---|---|---|
| `hennery-x86_64-unknown-linux-musl.tar.xz`, `hennery-aarch64-unknown-linux-musl.tar.xz` | `dist build`, natively on each architecture, with `musl-gcc` | `check-archive.sh` (the binary, its licence and README, nothing else); `check-linkage.sh` (no shared library, no loader); runs on the runner and on Alpine |
| `hennery-aarch64-apple-darwin.tar.xz` | `dist build` on macOS arm64 | `check-archive.sh`; `check-linkage.sh` (system libraries only); runs |
| `hennery-installer.sh` | `dist build --artifacts=global`, then `harden-installer.py` | `test-installer.sh`, on Linux x86_64 and on macOS |
| `hennery.rb` (Homebrew formula) | `dist build --artifacts=global` | `check-formula.sh` |
| `sha256.sum` | `dist build --artifacts=global` | — |
| the collector image, one architecture per Linux runner | `docker build` of `Dockerfile` on the staged musl binary | `smoke-image.sh` |

Every archive builds with the `vendored-openssl` feature
(`dist-workspace.toml`). OpenSSL, which `webauthn-rs-core` links, is then
compiled in from source. Without it, the macOS binary would load Homebrew's
`libssl` and fail on a Mac without it, and a static musl build would not
link at all (distribution §1.1). Cargo builds now enable vendored OpenSSL by default (R3); Nix opts out with
`--no-default-features` and uses its system-library inputs.

Third-party actions are pinned by commit, every image by its multi-arch
digest, and cargo-dist by the SHA-256 in `install-dist.sh`.

## OpenSSL

The release binaries carry their own OpenSSL: 3.6.3, from `openssl-src`
300.6.1+3.6.3 in `Cargo.lock`. Updating the system's OpenSSL does not
reach them. An OpenSSL fix reaches users only when `openssl-src` is bumped
in `Cargo.lock` and a new release is made. `webauthn-rs` passes what a
browser sends (attestation and assertion data) through it, so OpenSSL's
advisories are this project's to follow.

OpenSSL 3.6 is not a long-term-support line. Check its end of support
against openssl.org's release strategy before the first release, and move
to a supported line if it ends first.

## Locally

The dev shell's toolchain links Nix's `libiconv` on macOS, so a local
release build is for trying out, not for handing on; `check-linkage.sh` says
so. Linux archives and the image are built in CI only.

```sh
nix develop -c cargo build --profile dist -p hennery --features vendored-openssl
sh packaging/check-linkage.sh target/dist/hennery
```

## Pin bumps

A bump of `adapters/pins.toml` is `hennery-pins lock`, then `generate`,
then the pin-bump job (`.github/workflows/pins.yml`). These checks are
live, with logged-in agents, and the operator's to run before it merges:

- the live e2e gate (umbrella spec §14) on every platform;
- **Codex's `thread/delete` still removes everything** (plan 9d
  decision 14). After a turn in a scratch `CODEX_HOME`, delete the session
  from hennery and check that nothing of the thread is left: its rollout
  files in `sessions/` and `archived_sessions/`, its rows in
  `thread_history_1.sqlite` (`thread_items`, `thread_turns`,
  `thread_realtime_items`), its rows in the state DB (`state_5.sqlite`),
  and its entries in `session_index.jsonl`. hennery itself only checks the
  rollout files: the rest is `thread/delete`'s contract. If the bundled
  Codex version changed, read `thread/delete`'s call shape from its source
  first and update `[codex_app_server]` in `pins.toml`.
- **What the host reads from Codex is still what it says** (the 9d-ii
  review). Re-read, in the bumped version's source and against a live run
  in a scratch `CODEX_HOME`:
  - the refusal texts `classify_delete` matches (`forked history still
    references it`, `thread is not persisted`, `live internal threads`,
    `no rollout found for thread id`, `thread not found:`, and the
    `Invalid request: unknown variant` / `missing field` / `invalid type`
    prefixes);
  - the `codexHome` field of `initialize`'s answer, canonical;
  - `--version`'s `codex-cli X.Y.Z` line.

## Crates.io and cargo-binstall (R3)

The seven production crates opt into crates.io at one exact version. Publish
in this order: hennery-proto, hennery-kernel, hennery-view, hennery-host,
hennery-gateway, hennery-sessions, hennery. The workspace default, testkit and
pin generator remain private. Library compatibility is pre-1.0 application
support, not a separately stable SDK. Protocol/view generators are build tools,
not advertised install products.

The `crates` CI workflow prepares from a fresh git-archive snapshot outside the
checkout. `packaging/prepare-crates.mjs` builds the locked web UI, copies only
its distributable output into the kernel, gathers licence texts for production
dependencies and configured build tools (including emitted helpers and CSS), and
writes its source/UI inventories.
The canonical host manifest is `crates/hennery-host/manifest.json`; pin generation,
CI and Nix read that same file. No agent or managed Node payload is packaged.
Each final tarball is inspected for actual AGPL text, normalized registry
metadata and its exact production dependency versions, and the 10 MB size cap.
The kernel also carries FRONTEND-NOTICES.txt and SOURCE.json, and its README
links to the immutable corresponding-source archive and SHA-256. The complete
source archive includes Rust/web sources, lockfiles, build scripts, repository
tests and fixtures. Individual crates intentionally omit the workspace's tests.

`packaging/check-crates.mjs` creates a temporary loopback sparse registry
containing these seven exact candidates and prefetched upstream dependencies.
The overlay only exists in a scratch CARGO_HOME; it is never a real publishing
registry or user configuration. Cargo package verification and publish dry runs
run on extracted tarballs, then builds/installations run with Cargo offline and
OS network access denied to subprocesses. The OS restriction includes build
scripts and is tested with a reachable loopback positive control. Cargo's
publish dry run itself needs registry HTTP, so it is separate from that phase.
Both locked and unlocked registry installs run from an empty directory. Their
collectors run in disposable homes with Node/pnpm absent from PATH, serve all
HTML-referenced assets and render the app in the pinned Chromium. A separate
Rust 1.88 toolchain builds the extracted CLI's complete dependency graph.
Source installs need Rust, a C compiler, make and Perl (macOS: Xcode Command
Line Tools); default vendored OpenSSL removes the system OpenSSL prerequisite.

Native cargo-binstall is disabled. Pinned 1.24.0 refusal tests offer real loopback
archives, but all seven attempts must refuse without fetching or installing an
archive. All native strategies (`crate-meta-data`, `quick-install`, `compile`)
are disabled in the final CLI metadata. Native binstall cannot enforce the
required OpenPGP and Sigstore policy. The `hennery-release` metadata namespace
records the maintainer fingerprint and concrete version's exact tagged workflow
identity for an external verifier. A native bridge needs separate review;
archive URL mappings remain dormant data for that future integration.

Before running any release-contained installer or verifier, follow the reviewed
[verify-then-run bootstrap](../README.md#verify-a-release-installer-before-running-it).
Use installed GnuPG and independently corroborate the full signing fingerprint;
authenticate the exact inventory and installer digest before execution. Then
use a clean source checkout at that authenticated inventory's full source SHA
and the [common verifier](release/verify.py), requiring both
`release-inventory.json.asc` and the exact tagged Sigstore identity. Bare Cargo
installation waits for non-prerelease publication and separate public-path
qualification. The first alpha remains GitHub-only.

### R1 integration and maintainer-only setup

The crate writer lives in R1's manual tagged `release-publish.yml`, in environment
`release`, with direct `needs: [github, authorize]` and the exact authorized
inventory/current-attempt condition. `RELEASE_PUBLICATION_ENABLED` and
`RELEASE_CRATES_ENABLED` remain unset/disabled. The complete candidate comes
from exact held object versions. Preparation qualifies all seven packages using
R1's single retained UI build and exports only final crates, their channel
inventory and immutable source into R1's flat candidate before freeze.
Publication never rebuilds those bytes.

The shared `packaging/release-gate crates` receives the complete root, approved
global digest, explicit preflight/boundary phase and a fresh receipt outside the
candidate. Each call verifies approval, inventory digest, maintainer signature,
signed tag and current exact-SHA evidence, then retains its audit. The publisher
also binds and rechecks channel inventory, source/version and all crate/source
bytes against that global inventory before and after each call. It renews the
boundary gate before every upload and index-readiness operation.

The workflow verifies both the detached maintainer signature and exact tagged
Sigstore provenance before the official pinned OIDC action, then repeats the
frozen-byte/public-source preflight immediately before OIDC. Only the action's
short-lived output reaches upload; its post step revokes it. Every publishing
credential belongs only in protected environment `release`.

R1 must retain all seven .crate files, crates-inventory.json and
`hennery-source-<sha>.tar.gz` unchanged. Publish and verify the source archive
at its inventory URL before enabling crates.io. Its digest must also appear in
R1's authenticated inventory; retain it for the required AGPL availability
period. The publisher fetches it without credentials and refuses unavailable
or mismatched bytes. Missing candidate bytes stop recovery; never rebuild them
under old approval. A fresh approved attempt reconciles each existing registry
package against its digest and waits for index resolution before consumers.
Ambiguous uploads or conflicting remote bytes stop, requiring renewed approval
and a new candidate/version where immutable published versions prevent repair.
The uploader uses the documented registry API to send frozen tarball bytes;
it does not invoke Cargo publication and repackage approved inputs.

Maintainer steps, never performed by a builder:

1. Approve the exact source/version/channels, all platform/MSRV/licence/advisory
   gates, protected tag/environment rules with bypass disabled, candidate
   retention and the unauthenticated source-delivery URL. Review the full notice
   closure and application assets/fonts; no licence permission is inferred for
   third-party agent binaries. No real publication is authorized by CI green.
2. For the first versions, arrange a one-off R1-gated bootstrap using a narrowly
   scoped, short-lived crates.io token held only in environment `release`.
   The same approval tuple and exact-byte
   uploader apply. Do not add a standing all-crates token to this workflow.
3. After each of the seven crates exists, configure its trusted publisher for
   repository `marcinwadon/hennery`, exact workflow filename `release-publish.yml`
   and environment `release` together. Check
   current crates.io support/settings and pin the official auth action. Test
   the OIDC identity in the gated workflow; no local registry login substitutes.
4. Revoke the bootstrap token immediately after successful bootstrap/trusted
   publishing configuration. Remove any temporary secret and verify it is no
   longer usable. Future runs use the short-lived OIDC token and revoke it via
   the auth action's post step. The builder never receives any token.
5. Verify public installs and UI from clean scratch homes before advertising the
   channel. Keep the early-testing data/migration guarantees unchanged.

Cargo's [registry API](https://doc.rust-lang.org/cargo/reference/registry-web-api.html#publish),
[source replacement](https://doc.rust-lang.org/cargo/reference/source-replacement.html),
[binstall metadata](https://github.com/cargo-bins/cargo-binstall/blob/main/SUPPORT.md)
and [trusted publishing bootstrap](https://blog.rust-lang.org/2025/07/11/crates-io-development-update-2025-07/)
are the implementation contracts to recheck on changes.

## Publishing is the operator's

These need the operator's decision, credentials, or both. None is set up:

- **GitHub Releases.** `dist generate` writes a `release.yml` that builds the
  same archives and creates a release on every version tag. It is not
  committed (`allow-dirty = ["ci"]` in `dist-workspace.toml`). Any generated
  replacement for R1's explicit gated workflows must:
  - keep this workflow's checks: `check-archive.sh`, `check-linkage.sh`,
    `test-installer.sh`, `check-formula.sh`;
  - run `harden-installer.py` before the installer is uploaded, and before
    it is attested;
  - pin every action by commit;
  - restore no Actions cache (no `rust-cache`), since anything a `main`
    workflow runs can write one;
  - build with a pinned toolchain (`rust-toolchain.toml`).

  The `build` workflow's artifacts are never promoted to a release: a pull
  request's are built from code nobody has reviewed yet.
- **Artifact attestations** (`github-attestations = true`): protected release-tag
  jobs need OIDC/attestation authority and write to the public Sigstore log.
  Neither repository-only nor exact-tag Sigstore verification authorizes a
  release by itself. The common verifier first requires the detached
  `release-inventory.json.asc` from the pinned hardware-backed maintainer key
  over the exact inventory digest set. Its trusted public key comes from the
  reviewed verifier, not a downloaded replacement. The common
  [verifier](release/verify.py) pins the exact certificate identity to
  `marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<release-tag>`
  and rejects branch signers. The [guarded README bootstrap](../README.md#verify-a-release-installer-before-running-it)
  authenticates the inventory using a full fingerprint checked through main,
  the maintainer's account keys and keys.openpgp.org, then checks the installer
  SHA-256 before executing it. No release-supplied verifier or key is its trust anchor;
  its archive verifier requires both the maintainer-approved digest and this identity. Native binstall signature
  support needs a reviewed bridge; no unverified strategy is an accepted path.
- **The Homebrew tap** (`marcinwadon/homebrew-tap`): the repository and a
  token allowed to push to it.
- **The image on GHCR:** a dedicated credential held only in `release`, with
  this repository's package Actions access READ, one multi-arch manifest from
  the per-architecture images, and its provenance attestation. Its docs
  should say: publish the port on loopback behind a TLS proxy
  (`-p 127.0.0.1:8080:8080`); read the setup link with
  `docker exec … hennery admin setup-url`, not from `docker logs` (with
  `docker run -t` the link itself is logged); a bind mount keeps the host's
  owner, so it must belong to 65532; change the port with `HENNERY_LISTEN`,
  not `--listen` on the command, because the `HEALTHCHECK` reads
  `HENNERY_LISTEN`.
- **Third-party licence notices:** the archives carry only hennery's
  `LICENSE` in the original `build` probe, and its image none. R1's candidates
  generate target-specific notices, SPDX and corresponding-source bundles;
  their immutable supplemental licence texts need maintainer review. Before
  the first release, review the
  notices for the Rust crates and the vendored OpenSSL (Apache-2.0), e.g.
  with `cargo-about`; ship them in each archive and in the image; and
  update `check-archive.sh`'s exact list and the `.dockerignore`.
- **Dependency updates** (Dependabot, or another bot): for `openssl-src`
  above all, the pinned actions and the image digests. It opens pull
  requests on its own schedule, so it is the operator's to switch on.
- **Fork pull requests:** require approval before their workflows run.

---

## Homebrew (R2)

The generated formula is hardened with version, embedded-UI and notice checks
before R1 freezes it. The secret-free native proof and the release candidate
exercise a scratch file-based tap; a protected manual publisher writes only the
signed frozen formula after GitHub's immutable release bytes match. The channel
and global publication switches remain disabled. See the [operator guide](../docs/homebrew.md)
and [maintainer setup](../docs/release-process.md#homebrew-channel-setup-r2).

Generated with Claude AI — please review before distribution.
````

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/homebrew-proof.sh", "phase": "feature", "sha256": "6fc0461c5b9310ee6231763ce9cd231e10472c037b571734748579b609cbf377", "size": 1839, "task": 2} -->
```text
#!/bin/sh
# PR-only native candidate, using the same archive finalizer as release-candidate.
# CI supplies the same pinned Rust toolchain/targets as release-candidate.
# Local callers run inside the default Nix shell with one-off Python.
set -eu
TARGET=$1
scratch=$2
export TARGET
case "$TARGET" in
    aarch64-apple-darwin|aarch64-unknown-linux-musl|x86_64-unknown-linux-musl) ;;
    *) echo 'unqualified Homebrew proof target' >&2; exit 1 ;;
esac
sh packaging/install-dist.sh "$scratch/dist-bin"
PATH="$scratch/dist-bin:$PATH"
export PATH
nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
cargo metadata --locked --all-features --filter-platform "$TARGET" --format-version=1 > "$scratch/cargo-metadata.json"
nix develop .#web -c pnpm --dir web licenses list --json > "$scratch/frontend-licences.json"
source_sha=$(git rev-parse HEAD)
tag=$(python3 -c 'import tomllib; print("v"+tomllib.load(open("Cargo.toml","rb"))["workspace"]["package"]["version"])')
python3 packaging/release/supply.py materials --output release-materials --source-sha "$source_sha" --target "$TARGET" \
    --cargo-metadata "$scratch/cargo-metadata.json" --frontend-licences "$scratch/frontend-licences.json"
python3 -c 'import json,sys; sys.path.insert(0,"packaging/release"); import gate; gate.require(not json.load(open("release-materials/licence-findings.json"))["findings"], "unresolved proof licence findings")'
sh packaging/release/native-archive.sh
dist build --artifacts=global --target="$TARGET" --output-format=json > "$scratch/proof-dist-manifest.json"
python3 packaging/release/homebrew.py prepare target/distrib --tag "$tag" --targets "$TARGET"
python3 packaging/release/homebrew.py freeze-proof target/distrib "$scratch/homebrew-candidate" \
    --tag "$tag" --targets "$TARGET" --source-sha "$source_sha"
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/homebrew.py", "phase": "feature", "sha256": "330dff9e94e217dd187d806ec385ca136c5f6fc7b180ca4d2b45033785c4f8d6", "size": 4730, "task": 2} -->
```text
#!/usr/bin/env python3
"""Add acceptance tests to cargo-dist's formula before freezing; validate final bytes."""
import argparse
from pathlib import Path
import re
import shutil

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
    raw = path.read_bytes()
    try:
        formula = raw.decode('utf-8')
    except UnicodeError as error:
        raise gate.Refused('formula must be UTF-8') from error
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
    return raw


def prepare(root, tag, targets):
    check(root, tag, targets, require_test=False)
    path = Path(root) / 'hennery.rb'
    formula = path.read_text()
    if TEST_BLOCK not in formula:
        path.write_text(formula[:-4] + TEST_BLOCK + 'end\n')
    check(root, tag, targets)


def freeze_proof(source, destination, tag, targets, source_sha):
    """Unsigned native PR fixture; it cannot authorize any publication."""
    gate.require(re.fullmatch('[0-9a-f]{40}', source_sha), 'invalid proof source SHA')
    check(source, tag, targets)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    for name in ['hennery.rb', *['hennery-' + t + '.tar.xz' for t in targets]]:
        shutil.copyfile(Path(source) / name, destination / name)
    inventory = {'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': source_sha,
                 'tag': tag, 'channels': ['github'], 'targets': sorted(targets),
                 'candidate': {'run_id': 1, 'run_attempt': 1},
                 'artifacts': [{'name': p.name, 'size': p.stat().st_size, 'sha256': gate.digest(p.read_bytes())}
                               for p in sorted(destination.iterdir())]}
    (destination / 'release-inventory.json').write_bytes(gate.canonical(inventory))
    gate.verify_files(inventory, destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['prepare', 'check', 'freeze-proof'])
    parser.add_argument('candidate', type=Path)
    parser.add_argument('destination', nargs='?', type=Path)
    parser.add_argument('--source-sha')
    parser.add_argument('--tag', required=True)
    parser.add_argument('--targets', required=True)
    args = parser.parse_args()
    try:
        if args.operation == 'freeze-proof':
            if args.destination is None or args.source_sha is None:
                parser.error('freeze-proof needs a fresh destination and --source-sha')
            freeze_proof(args.candidate, args.destination, args.tag, args.targets.split(','), args.source_sha)
        else:
            (prepare if args.operation == 'prepare' else check)(args.candidate, args.tag, args.targets.split(','))
    except (gate.Refused, OSError) as error:
        raise SystemExit(f'Homebrew refused: {error}') from error
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/homebrew_accept.py", "phase": "feature", "sha256": "a638ff629484391a98e598eab3918bb5d38b0c2c57ebb6d91918ad3fa10ac1f5", "size": 7819, "task": 2} -->
```text
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
import subprocess

import gate
import homebrew

BREW_COMMIT = '00001bedf8eac442bdabd327148be0b97998b27b'  # Homebrew 4.6.18
ROOT = Path(__file__).resolve().parents[2]


def recipes():
    result = {}
    for operation in ('install', 'upgrade', 'uninstall'):
        result[operation] = subprocess.check_output(
            ['sh', str(ROOT / 'packaging/readme-blocks.sh'), str(ROOT / 'docs/homebrew.md'), 'homebrew-' + operation], text=True)
    return result


def smoke(binary, expected, tag, env, work):
    gate.require(Path(binary).read_bytes() == expected, 'Homebrew changed executable bytes')
    result = subprocess.run([str(binary), '--version'], env=env, cwd=work, check=True, capture_output=True, text=True)
    gate.require(result.stdout.strip() == 'hennery ' + tag.removeprefix('v'), 'installed Homebrew executable has wrong version')
    print(result.stdout, end='')


def commit_formula(tap, formula, env, work, message):
    path = Path(tap) / 'Formula/hennery.rb'
    path.write_text(formula)
    for args in (['add', 'Formula/hennery.rb'],
                 ['-c', 'user.name=Marcin Wadoń', '-c', 'user.email=marcin.wadon@gmail.com',
                  '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', message, '--', 'Formula/hennery.rb']):
        subprocess.run(['git', '-C', str(tap), *args], env=env, cwd=work, check=True)


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
    command('git', '-C', str(tap), 'init', '-q', '--initial-branch=main')
    command('git', '-C', str(tap), 'remote', 'add', 'origin', str(tap))
    local = original
    for target in inventory['targets']:
        name = 'hennery-' + target + '.tar.xz'
        local = local.replace(f'https://github.com/{gate.REPOSITORY}/releases/download/{inventory["tag"]}/{name}', (candidate / name).as_uri())
    old = local.replace(f'version "{inventory["tag"][1:]}"', 'version "0.0.0"')
    commit_formula(tap, old, env, work, 'test(formula): install old-version fixture')
    sentinels = [work / 'data/hennery/preserve', work / 'home/Library/LaunchAgents/hennery-preserve.plist']
    for path in sentinels:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b'operator-owned sentinel\n')
    # Extract and compare without executing or unpacking arbitrary extra files.
    import tarfile
    with tarfile.open(candidate / ('hennery-' + native + '.tar.xz')) as archive:
        entries = [m for m in archive.getmembers() if m.isfile() and m.name.endswith('/hennery')]
        gate.require(len(entries) == 1, 'candidate executable ambiguous')
        expected = archive.extractfile(entries[0]).read()
    scripts = recipes()
    # First install is a real older-keg fixture using the exact candidate payload.
    command('sh', '-eu', '-c', scripts['install'])
    installed = prefix / 'bin/hennery'
    smoke(installed, expected, inventory['tag'], env, work)
    gate.require((prefix / 'Cellar/hennery/0.0.0/bin/hennery').is_file(), 'old keg missing')
    commit_formula(tap, local, env, work, 'test(formula): upgrade to frozen candidate')
    command('sh', '-eu', '-c', scripts['upgrade'])
    gate.require(installed.resolve().parent.parent.name == inventory['tag'][1:], 'upgrade did not select candidate keg')
    smoke(installed, expected, inventory['tag'], env, work)
    command('sh', '-eu', '-c', scripts['uninstall'])
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

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/homebrew_publish.py", "phase": "feature", "sha256": "f257bd681984b66a2862790af7f28b1ce6746282acff828d09ce3300f5b97cc6", "size": 8002, "task": 2} -->
```text
#!/usr/bin/env python3
"""Protected tap Contents API writer; imports and verification never publish.

No git push, formula regeneration, redirect, overwrite of the same release,
downgrade or automatic retry. Only the maintainer may enable this entry point.
"""
import argparse
import base64
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.error
import urllib.request

import gate
import homebrew
import publish

ROOT = Path(__file__).resolve().parents[2]
TAP_PATH = '/repos/marcinwadon/homebrew-tap/contents/Formula/hennery.rb'


def blob_sha(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw, usedforsecurity=False).hexdigest()


def load(candidate, digest):
    candidate = Path(candidate)
    raw = (candidate / 'release-inventory.json').read_bytes()
    inventory = gate.strict_json(raw)
    gate.require(raw == gate.canonical(inventory) and gate.digest(raw) == digest, 'Homebrew inventory digest changed')
    gate.verify_files(inventory, candidate)
    gate.require({'github', 'homebrew'} <= set(inventory['channels']), 'Homebrew and GitHub must both be approved')
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+', inventory['tag']), 'normal Homebrew formula requires a stable release')
    formula = homebrew.check(candidate, inventory['tag'], inventory['targets'])
    return inventory, formula


def run_gate(candidate, digest, phase):
    # CLI checks the YubiKey-backed signature, exact source/ref, live approvals,
    # current attempt, all owning acceptance jobs and retained candidate bytes.
    # It persists a held audit receipt before returning. No tap token is passed.
    env = {k: v for k, v in os.environ.items() if k != 'HOMEBREW_TAP_TOKEN'}
    with tempfile.TemporaryDirectory(prefix='homebrew-gate-') as tmp:
        subprocess.run([str(ROOT / 'packaging/release-gate'), 'homebrew', '--candidate', str(Path(candidate).resolve()),
                        '--inventory-sha256', digest, '--phase', phase, '--receipt', str(Path(tmp) / 'receipt.json')],
                       env=env, check=True)


def check_public_release(candidate, inventory):
    release = publish.api(f'/repos/{gate.REPOSITORY}/releases/tags/{inventory["tag"]}')
    gate.require(isinstance(release, dict) and release.get('tag_name') == inventory['tag']
                 and release.get('draft') is False and release.get('prerelease') is False
                 and release.get('immutable') is True, 'Homebrew requires a public immutable stable GitHub release')
    assets = publish.release_assets(release)
    gate.require(len({a['name'] for a in assets}) == len(assets), 'duplicate public release assets')
    expected = {'hennery.rb', 'release-inventory.json'} | {'hennery-' + t + '.tar.xz' for t in inventory['targets']}
    found = {a['name']: a for a in assets}
    gate.require(expected <= set(found), 'referenced public Homebrew artifacts are missing')
    for name in sorted(expected):
        gate.require(publish.asset_bytes(found[name]) == (Path(candidate) / name).read_bytes(), 'public Homebrew artifact differs: ' + name)


public_release = check_public_release


def tap_api(method='GET', data=None):
    gate.require(method in ('GET', 'PUT'), 'unsupported tap operation')
    headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    if method == 'PUT':
        token = os.environ.get('HOMEBREW_TAP_TOKEN')
        gate.require(token, 'protected tap credential absent')
        headers['Authorization'] = 'Bearer ' + token
        headers['Content-Type'] = 'application/json'
    # Public reads do not need the tap credential. Only this one fixed path
    # can receive it; the main-repository GH_TOKEN remains read-only.
    url = 'https://api.github.com' + TAP_PATH + ('?ref=main' if method == 'GET' else '')
    request = urllib.request.Request(url, method=method, data=gate.canonical(data) if data is not None else None, headers=headers)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
            return gate.strict_json(response.read())
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == 'GET':
            return None
        raise gate.Refused(f'tap HTTP {error.code}; reconcile manually before retry') from error
    except urllib.error.URLError as error:
        raise gate.Refused('ambiguous tap response; reconcile manually before retry') from error


def remote_bytes(remote):
    gate.require(isinstance(remote, dict) and remote.get('type') == 'file' and remote.get('path') == 'Formula/hennery.rb'
                 and remote.get('encoding') == 'base64', 'unexpected tap formula object')
    try:
        raw = base64.b64decode(''.join(remote['content'].splitlines()), validate=True)
    except (KeyError, TypeError, ValueError) as error:
        raise gate.Refused('invalid tap formula encoding') from error
    gate.require(remote.get('sha') == blob_sha(raw), 'tap formula blob digest differs')
    return raw


def version(raw):
    versions = re.findall(rb'^\s*version "([0-9]+)\.([0-9]+)\.([0-9]+)"$', raw, re.M)
    gate.require(len(versions) == 1, 'tap formula must have one stable version')
    return tuple(int(n) for n in versions[0])


def upload(candidate, digest):
    gate.require(os.environ.get('RELEASE_PUBLICATION_ENABLED') == 'true'
                 and os.environ.get('RELEASE_HOMEBREW_ENABLED') == 'true', 'Homebrew publication is disabled')
    inventory, frozen = load(candidate, digest)
    run_gate(candidate, digest, 'preflight')
    public_release(candidate, inventory)
    remote = tap_api('GET')
    if remote is not None:
        previous = remote_bytes(remote)
        if previous == frozen:
            return {'state': 'already-present', 'sha': remote['sha']}
        gate.require(version(previous) < version(frozen), 'tap same-version conflict or downgrade refused')
    payload = {'message': 'chore(formula): release hennery ' + inventory['tag'],
               'branch': 'main', 'content': base64.b64encode(frozen).decode(),
               'committer': {'name': 'Marcin Wadoń', 'email': 'marcin.wadon@gmail.com'}}
    if remote is not None:
        payload['sha'] = remote['sha']  # Atomic blob compare-and-swap, no force.
    run_gate(candidate, digest, 'boundary')
    current, current_formula = load(candidate, digest)
    gate.require(current == inventory and current_formula == frozen, 'formula changed at tap write boundary')
    public_release(candidate, current)
    result = tap_api('PUT', payload)
    gate.require(isinstance(result, dict) and result.get('content', {}).get('sha') == blob_sha(frozen)
                 and re.fullmatch('[0-9a-f]{40}', result.get('commit', {}).get('sha', '')), 'tap write was not confirmed')
    gate.require(remote_bytes(tap_api('GET')) == frozen, 'tap readback differs; reconcile manually')
    return {'state': 'published', 'commit': result['commit']['sha'], 'formula_sha256': gate.digest(frozen)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('candidate', type=Path)
    parser.add_argument('inventory_sha256')
    args = parser.parse_args()
    try:
        if args.verify:
            inventory, _ = load(args.candidate, args.inventory_sha256)
            run_gate(args.candidate, args.inventory_sha256, 'preflight')
            public_release(args.candidate, inventory)
            print('signed Homebrew candidate and public release bytes verified')
        else:
            print(gate.canonical(upload(args.candidate, args.inventory_sha256)).decode(), end='')
    except (gate.Refused, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'Homebrew publication refused: {error}') from error
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/native-archive.sh", "phase": "feature", "sha256": "219e3dbe0d6df4c7207c2192267b82b86475f1464379fbffa22f07c334d27af2", "size": 2030, "task": 2} -->
```text
#!/bin/sh
# Shared native release archive construction; caller supplies dist and materials.
set -eu
case "$TARGET" in
    aarch64-apple-darwin|aarch64-unknown-linux-musl|x86_64-unknown-linux-musl) ;;
    *) echo 'unqualified native release target' >&2; exit 1 ;;
esac
export HENNERY_WEB_REQUIRE=1
HENNERY_BUILD_SOURCE_SHA=$(python3 -c 'import json; print(json.load(open("release-materials/build-identity.json"))["source_sha"])')
HENNERY_BUILD_UI_SHA256=$(python3 -c 'import json; print(json.load(open("release-materials/build-identity.json"))["ui_sha256"])')
HENNERY_BUILD_MANIFEST_SHA256=$(python3 -c 'import json; print(json.load(open("release-materials/build-identity.json"))["adapter_manifest_sha256"])')
export HENNERY_BUILD_SOURCE_SHA HENNERY_BUILD_UI_SHA256 HENNERY_BUILD_MANIFEST_SHA256
dist build --artifacts=local --target="$TARGET" --print=linkage --output-format=json > target-manifest.json
archive="hennery-$TARGET"
mkdir -p unpacked
tar -xJf "target/distrib/$archive.tar.xz" -C unpacked
cp release-materials/THIRD-PARTY-NOTICES.txt "unpacked/$archive/"
tar -cJf "target/distrib/$archive.tar.xz" -C unpacked "$archive"
(cd target/distrib && shasum -a 256 "$archive.tar.xz" > "$archive.tar.xz.sha256")
sh packaging/check-archive.sh "target/distrib/$archive.tar.xz" "$TARGET" --notices
binary="$PWD/unpacked/$archive/hennery"
sh packaging/check-linkage.sh "$binary"
sh packaging/check-web-ui.sh "$binary"
"$binary" --version
cp target-manifest.json "target/distrib/$TARGET-dist-manifest.json"
python3 packaging/release/refresh_manifest.py "target/distrib/$TARGET-dist-manifest.json" "target/distrib/$archive.tar.xz"
cp release-materials/* target/distrib/
python3 - <<'PY' > target/distrib/builder.json
import json,os,platform,subprocess
print(json.dumps({'os':platform.platform(),'runner_image':os.environ.get('ImageVersion'),'rust':subprocess.check_output(['rustc','-vV'],text=True),'sdk':subprocess.getoutput('xcrun --show-sdk-version') if platform.system()=='Darwin' else subprocess.getoutput('ldd --version')}))
PY
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/settings_audit.py", "phase": "feature", "sha256": "96ec294279f38920c99bdbbba41b93ce0c80c9a4be2adc1d6b8a4ed898946ae3", "size": 10032, "task": 2} -->
```text
#!/usr/bin/env python3
"""Maintainer-local platform settings audit; publishers only validate its digest.

No runtime publisher needs ruleset administration. UI-only registry settings are
observations explicitly confirmed by the authenticated owner, then bound into the
platform review comment. This tool is never invoked by a publishing job.
"""
import argparse
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import subprocess

import gate

CRATES = ('hennery-proto', 'hennery-view', 'hennery-gateway', 'hennery-sessions', 'hennery-host', 'hennery-kernel', 'hennery')
MAX_AGE = timedelta(hours=24)


def tag_rulesets(owner_id):
    common = {'target': 'tag', 'enforcement': 'active', 'conditions': {'ref_name': {'include': ['refs/tags/v*'], 'exclude': []}}}
    return [common | {'name': 'release-tag-creation', 'bypass_actors': [{'actor_type': 'User', 'actor_id': owner_id, 'bypass_mode': 'always'}], 'rules': [{'type': 'creation'}]},
            common | {'name': 'release-tags-immutable', 'bypass_actors': [], 'rules': [{'type': 'update'}, {'type': 'deletion'}]}]


def validate_settings(settings, channels):
    owner = settings['owner']
    gate.require(owner.get('login') == gate.REPOSITORY.split('/')[0] and owner.get('type') == 'User' and type(owner.get('id')) is int and owner['id'] > 0, 'settings audit requires the personal repository owner')
    import tag_signature
    touch = settings.get('maintainer_touch', {})
    gate.require(touch.get('confirmed') is True and touch.get('fingerprint') == tag_signature.FINGERPRINT and touch.get('policy') in ('on', 'cached-fixed'), 'maintainer hardware touch confirmation missing; remote verification is impossible')
    env = settings['environment']
    gate.require(env.get('name') == 'release' and env.get('can_admins_bypass') is False, 'release environment missing or bypass not explicitly disabled')
    reviewers = [r for rule in env.get('protection_rules', []) if rule.get('type') == 'required_reviewers' for r in rule.get('reviewers', [])]
    gate.require(len(reviewers) == 1 and reviewers[0].get('type') == 'User' and reviewers[0].get('reviewer', {}).get('id') == owner['id'], 'release reviewer must be exactly the maintainer')
    gate.require(env.get('deployment_branch_policy') == {'protected_branches': False, 'custom_branch_policies': True}, 'release environment deployment restrictions missing')
    gate.require(settings.get('deployment_policies') == [{'name': 'v*', 'type': 'tag'}], 'release deployment must permit protected v* tags only')
    gate.check_tag_rules(settings.get('rulesets', []), owner['id'])
    gate.require(settings.get('repository_secrets') == [], 'repository secrets must be empty; publishing credentials belong only in release')
    gate.require(settings.get('immutable_releases') is True, 'immutable GitHub releases must be enabled')
    secrets = settings.get('release_secrets', [])
    if 'github' in channels:
        gate.require('RELEASE_PUBLISH_APP_KEY' in secrets, 'GitHub publishing credential must exist only in release')
    if 'homebrew' in channels:
        tap = settings.get('homebrew', {})
        gate.require('RELEASE_HOMEBREW_TOKEN' in secrets, 'Homebrew credential must exist only in release')
        gate.require(tap.get('repository') == 'marcinwadon/homebrew-tap' and tap.get('branch') == 'main'
                     and tap.get('environment') == 'release' and tap.get('credential') == 'RELEASE_HOMEBREW_TOKEN',
                     'Homebrew audit must name the protected tap credential and destination')
        gate.require(tap.get('kind') in ('fine-grained-pat', 'app-installation')
                     and tap.get('repositories') == ['marcinwadon/homebrew-tap']
                     and tap.get('permissions') == {'contents': 'write'} and tap.get('scope_confirmed') is True,
                     'maintainer must confirm tap-only contents scope; no broad token')
    if 'ghcr' in channels:
        ghcr = settings.get('ghcr', {})
        gate.require(ghcr.get('repository') == gate.REPOSITORY and ghcr.get('actions_access') == 'read', 'GHCR Actions access must be READ')
        gate.require(ghcr.get('dedicated_credential') == 'GHCR_PUBLISH_TOKEN' and 'GHCR_PUBLISH_TOKEN' in secrets, 'GHCR requires its dedicated release environment credential')
        denial = ghcr.get('negative_push', {})
        gate.require(denial.get('credential') == 'GITHUB_TOKEN' and denial.get('read_status') == 200 and denial.get('push_status') == 403, 'post-setup GITHUB_TOKEN push denial must be observed with working read access')
    if 'crates' in channels:
        configs = settings.get('crates', [])
        gate.require(len(configs) == len(CRATES) and {c.get('crate') for c in configs} == set(CRATES), 'trusted publisher configuration missing for production crate closure')
        gate.require(all(c.get('repository') == gate.REPOSITORY and c.get('workflow') == 'release-publish.yml' and c.get('environment') == 'release' for c in configs), 'crates.io trusted publishing must require exact workflow and release environment')


def report(inventory, inventory_sha256, settings, now=None):
    now = now or datetime.now(timezone.utc)
    validate_settings(settings, inventory['channels'])
    return {'schema': 1, **{k: inventory[k] for k in ('repository', 'source_sha', 'tag', 'channels', 'targets', 'candidate')},
            'inventory_sha256': inventory_sha256, 'issued_at': now.isoformat(), 'auditor': settings['owner'], 'settings': settings}


def validate_report(value, expected_digest, inventory, inventory_sha256, candidate_completed_at, now=None):
    now = now or datetime.now(timezone.utc)
    gate.require(gate.digest(gate.canonical(value)) == expected_digest, 'settings audit digest differs from approval')
    gate.require(value.get('schema') == 1 and all(value.get(k) == inventory[k] for k in ('repository', 'source_sha', 'tag', 'channels', 'targets', 'candidate')) and value.get('inventory_sha256') == inventory_sha256, 'settings audit belongs to another candidate')
    issued = datetime.fromisoformat(value['issued_at'].replace('Z', '+00:00'))
    if isinstance(candidate_completed_at, str):
        candidate_completed_at = datetime.fromisoformat(candidate_completed_at.replace('Z', '+00:00'))
    gate.require(issued.tzinfo is not None and candidate_completed_at.tzinfo is not None and timedelta(0) <= now-issued <= MAX_AGE and issued >= candidate_completed_at, 'settings audit is stale, future-dated or precedes candidate completion')
    validate_settings(value['settings'], inventory['channels'])
    gate.require(value.get('auditor') == value['settings']['owner'], 'settings auditor is not the maintainer')
    return value['settings']


def gh(path):
    # Deliberately local-only. Use the maintainer's own gh login, never a CI
    # administration token or a branch-supplied evidence collector.
    gate.require(os.environ.get('GITHUB_ACTIONS') != 'true', 'settings audit must run locally by the maintainer')
    return gate.strict_json(subprocess.run(['gh', 'api', '--hostname', 'github.com', path], check=True, capture_output=True).stdout)


def pages(path, key=None):
    values = []
    for page in range(1, 101):
        result = gh(path + ('&' if '?' in path else '?') + f'per_page=100&page={page}')
        batch = result[key] if key else result
        gate.require(isinstance(batch, list), 'incomplete settings audit page')
        values.extend(batch)
        if len(batch) < 100:
            return values
    raise gate.Refused('incomplete settings audit pagination')


def collect(observations):
    user = gh('/user')
    repo = gh('/repos/' + gate.REPOSITORY)
    owner = {k: repo['owner'][k] for k in ('login', 'id', 'type')}
    gate.require(user['id'] == owner['id'] and user['login'] == owner['login'], 'local gh account must be the personal repository owner')
    prefix = '/repos/' + gate.REPOSITORY
    environment = gh(prefix + '/environments/release')
    rulesets = [gh(prefix + '/rulesets/' + str(r['id'])) for r in pages(prefix + '/rulesets')]
    return {'owner': owner, 'environment': environment,
            'deployment_policies': [{k: p[k] for k in ('name', 'type')} for p in pages(prefix + '/environments/release/deployment-branch-policies', 'branch_policies')],
            'rulesets': rulesets, 'repository_secrets': [s['name'] for s in pages(prefix + '/actions/secrets', 'secrets')],
            'release_secrets': [s['name'] for s in pages(prefix + '/environments/release/secrets', 'secrets')],
            'immutable_releases': gh(prefix + '/immutable-releases')['enabled'],
            'maintainer_touch': observations.get('maintainer_touch'),
            'ghcr': observations.get('ghcr'), 'crates': observations.get('crates'), 'homebrew': observations.get('homebrew')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--observations', required=True, type=Path, help='maintainer inspection: GHCR access, crates.io trusted publishers, Homebrew tap-only credential scope')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    raw = (args.candidate / 'release-inventory.json').read_bytes(); inventory = gate.strict_json(raw)
    gate.verify_files(inventory, args.candidate)
    import tag_signature
    signed_tag = tag_signature.verify(inventory['tag'], inventory['source_sha'])
    value = report(inventory, gate.digest(raw), collect(gate.strict_json(args.observations.read_bytes()))) | {'signed_tag': signed_tag}
    print(gate.canonical(value).decode())
    gate.require(input('Confirm the displayed API settings AND personally checked registry observations by typing ' + gate.REPOSITORY + ': ') == gate.REPOSITORY, 'maintainer settings confirmation absent')
    with args.output.open('xb') as output:
        output.write(gate.canonical(value))
    print('settings_audit_sha256=' + gate.digest(gate.canonical(value)))


if __name__ == '__main__':
    main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/supply.py", "phase": "feature", "sha256": "93706821150de351bb6e2ced380b05900cf606a1acd49a5c170dfbf7c68885c6", "size": 17260, "task": 2} -->
```text
#!/usr/bin/env python3
"""Generate notices, source material, SPDX and final inventories before signing.

Includes build/dev dependencies conservatively. Missing licence material is a
finding, never automatically treated as permission to redistribute. Downloaded
host runtimes are described separately and never included as payloads.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import tarfile
import uuid
import urllib.parse

import gate
from adapter_manifest import read_manifest


def tree_digest(files):
    return gate.digest(gate.canonical([{'name': name, 'sha256': gate.digest(data)} for name, data in sorted(files.items())]))


def component(name, version, licence, root, ecosystem):
    notices = []
    for path in sorted(root.rglob('*')):
        if path.is_file() and not path.is_symlink() and not any(p in ('node_modules', '.git', 'target') for p in path.relative_to(root).parts[:-1]):
            if path.name.lower().startswith(('license', 'licence', 'copying', 'notice', 'copyright')) or any(part.lower() in ('licenses', 'licences') for part in path.relative_to(root).parts[:-1]):
                notices.append((str(path.relative_to(root)), path.read_text(errors='replace')))
    identifier = 'SPDXRef-' + gate.digest(f'{ecosystem}:{name}@{version}'.encode())[:24]
    return {'SPDXID': identifier, 'name': name, 'versionInfo': version, 'downloadLocation': 'NOASSERTION',
            'filesAnalyzed': False, 'licenseConcluded': 'NOASSERTION', 'licenseDeclared': ('MIT OR Apache-2.0' if licence == 'MIT/Apache-2.0' else licence) or 'NOASSERTION',
            'copyrightText': 'NOASSERTION', 'externalRefs': [{'referenceCategory': 'PACKAGE-MANAGER', 'referenceType': 'purl',
                                                            'referenceLocator': f'pkg:{ecosystem}/{urllib.parse.quote(name, safe="/")}@{urllib.parse.quote(version, safe="")}'}]}, notices



def frontend_sources(frontend):
    # pnpm 12 groups by licence and coalesces package versions/paths. Read
    # each package manifest so a coalesced entry never pairs the wrong version.
    for licence, group in frontend.items():
        for p in group:
            for raw_path in p['paths']:
                root = Path(raw_path)
                manifest = gate.strict_json((root / 'package.json').read_bytes())
                gate.require(manifest['name'] == p['name'] and manifest['version'] in p['versions'], 'frontend licence input differs from package bytes')
                yield p['name'], manifest['version'], licence, root, 'npm'



def rust_packages(cargo):
    if not cargo.get('resolve'):
        return cargo['packages']
    nodes = {node['id']: node for node in cargo['resolve']['nodes']}
    reachable, todo = set(), list(cargo['workspace_members'])
    while todo:
        node = todo.pop()
        if node not in reachable:
            reachable.add(node)
            todo.extend(nodes[node]['dependencies'])
    return [p for p in cargo['packages'] if p['id'] in reachable]


def supplemental(ecosystem, name, version):
    root = Path(__file__).resolve().parent / 'licences'
    path = root / 'manifest.json'
    if not path.is_file():
        return []
    manifest = gate.strict_json(path.read_bytes())
    texts = []
    for entry in manifest.get(f'{ecosystem}:{name}@{version}', []):
        text = (root / entry['file']).read_bytes()
        gate.require(gate.digest(text) == entry['sha256'], 'supplemental licence text changed')
        texts.append((entry['source'], text.decode()))
    return texts


def components(cargo, frontend):
    packages, notices, findings = [], [], []
    sources = []
    for p in rust_packages(cargo):
        if p.get('source') is not None:
            sources.append((p['name'], p['version'], p.get('license'), Path(p['manifest_path']).parent, 'cargo'))
    sources.extend(frontend_sources(frontend))
    seen = set()
    for name, version, licence, root, ecosystem in sorted(sources):
        if (ecosystem, name, version) in seen:
            continue
        seen.add((ecosystem, name, version))
        p, texts = component(name, version, licence, root, ecosystem)
        packages.append(p)
        if not texts:
            texts = supplemental(ecosystem, name, version)
        if not licence or licence in ('UNKNOWN', 'UNLICENSED', 'NOASSERTION') or not texts:
            findings.append(f'{ecosystem}:{name}@{version}: missing licence expression or text')
        notices.append(f'\n===== {ecosystem}:{name}@{version} ({licence}) =====\n')
        for path, text in texts:
            notices.append(f'\n--- {path} ---\n{text}\n')
    # Name the native libraries separately, rather than implying their Rust
    # wrapper's version is the bundled C library version.
    for native in rust_packages(cargo):
        root = Path(native['manifest_path']).parent
        if native['name'] == 'libsqlite3-sys':
            header = root / 'sqlite3/sqlite3.h'
            if header.is_file():
                version = re.search(r'#define SQLITE_VERSION\s+"([^"]+)"', header.read_text())
                gate.require(version is not None, 'bundled SQLite version missing')
                p, _ = component('SQLite', version.group(1), None, root / 'sqlite3', 'generic')
                p['sourceInfo'] = 'Bundled SQLite C source in libsqlite3-sys; public-domain declaration preserved in sqlite3.c and corresponding source.'
                packages.append(p)
                notices.append('\n===== Bundled SQLite public-domain declaration =====\n' + (root / 'sqlite3/sqlite3.c').read_text()[:1000])
        if native['name'] == 'openssl-src':
            version_file = root / 'openssl/VERSION.dat'
            if version_file.is_file():
                fields = dict(re.findall(r'^(MAJOR|MINOR|PATCH)=(\d+)$', version_file.read_text(), re.M))
                gate.require(set(fields) == {'MAJOR', 'MINOR', 'PATCH'}, 'bundled OpenSSL version missing')
                p, _ = component('OpenSSL', '.'.join(fields[k] for k in ('MAJOR', 'MINOR', 'PATCH')), 'Apache-2.0', root / 'openssl', 'generic')
                p['sourceInfo'] = 'Vendored OpenSSL source shipped by openssl-src; exact source preserved.'
                packages.append(p)
    return packages, ''.join(notices), findings


def spdx(packages, source_sha, target):
    return {'spdxVersion': 'SPDX-2.3', 'dataLicense': 'CC0-1.0', 'SPDXID': 'SPDXRef-DOCUMENT',
            'name': f'hennery-{target}', 'documentNamespace': f'https://github.com/{gate.REPOSITORY}/releases/spdx/{source_sha}/{target}/{uuid.uuid4()}',
            'creationInfo': {'created': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'creators': ['Tool: hennery-release-r1']},
            'packages': packages, 'relationships': [{'spdxElementId': 'SPDXRef-DOCUMENT', 'relationshipType': 'DESCRIBES',
                                                   'relatedSpdxElement': p['SPDXID']} for p in packages]}


def checksums(root):
    files = sorted(p for p in Path(root).iterdir() if p.name not in ('sha256.sum', 'release-inventory.json'))
    gate.require(all(p.is_file() and not p.is_symlink() for p in files), 'checksum inventory contains nonregular file')
    (Path(root) / 'sha256.sum').write_text(''.join(f'{gate.digest(p.read_bytes())}  {p.name}\n' for p in files))
    verify_checksums(root)


def verify_checksums(root):
    root = Path(root)
    listed = {}
    for line in (root / 'sha256.sum').read_text().splitlines():
        match = re.fullmatch(r'([0-9a-f]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)', line)
        gate.require(match is not None, 'malformed combined checksum list')
        sha, name = match.groups()
        gate.require(name not in listed and name not in ('sha256.sum', 'release-inventory.json'), 'duplicate/cyclic checksum entry')
        listed[name] = sha
    actual = {p.name: gate.digest(p.read_bytes()) for p in root.iterdir() if p.name not in ('sha256.sum', 'release-inventory.json') and p.is_file() and not p.is_symlink()}
    gate.require(listed and listed == actual, 'combined checksum inventory incomplete or digest mismatch')


def dependency_sources(cargo, frontend, destination):
    # Include registry source, native vendored source (OpenSSL, SQLite), web
    # packages and licence texts. No managed Node or agent downloads.
    roots = [('cargo', p['name'], p['version'], Path(p['manifest_path']).parent) for p in rust_packages(cargo) if p.get('source')]
    roots += [(ecosystem, name, version, root) for name, version, _, root, ecosystem in frontend_sources(frontend)]
    seen = set()
    with tarfile.open(destination, 'w:xz', dereference=False, preset=1) as archive:
        for ecosystem, name, version, root in sorted(roots):
            prefix = f'{ecosystem}/{name.replace("/", "_")}@{version}'
            if prefix in seen:
                continue
            seen.add(prefix)
            for path in sorted(root.rglob('*')):
                relative = path.relative_to(root)
                if any(part in ('node_modules', '.git', 'target') for part in relative.parts):
                    continue
                gate.require(not path.is_symlink(), f'third-party source symlink needs review: {prefix}/{relative}')
                if path.is_file():
                    archive.add(path, arcname=f'{prefix}/{relative}', recursive=False)




def binary_inventory(root, targets):
    binaries = {}
    for target in targets:
        base = 'hennery-' + target
        archive = Path(root) / (base + '.tar.xz')
        with tarfile.open(archive, 'r:xz') as tar:
            members = tar.getmembers()
            expected = {base, base + '/hennery', base + '/LICENSE', base + '/README.md', base + '/THIRD-PARTY-NOTICES.txt'}
            gate.require(len(members) == len(expected) and {m.name.rstrip('/') for m in members} == expected,
                         'release archive content inventory differs')
            gate.require(all(m.isdir() if m.name.rstrip('/') == base else m.isfile() for m in members), 'release archive contains nonregular payload')
            data = tar.extractfile(base + '/hennery').read()
        sidecar = (Path(root) / (archive.name + '.sha256')).read_text().split()
        gate.require(sidecar == [gate.digest(archive.read_bytes()), archive.name], 'per-archive checksum sidecar differs')
        binaries[target] = {'sha256': gate.digest(data), 'size': len(data), 'archive': archive.name, 'member': base + '/hennery'}
    return binaries


def verify_binary_inventory(inventory, root):
    gate.require(inventory.get('binaries') == binary_inventory(root, inventory['targets']), 'approved binary inventory differs from archive bytes')


def required_payloads(channels, targets, tag):
    required = {'hennery-installer.sh', 'hennery.rb', 'hennery-source.tar.xz', 'dist-manifest.json',
                'THIRD-PARTY-NOTICES.txt', 'licence-findings.json', 'runtime-inventory.json', 'build-identity.json', 'release-notes.md'}
    for target in targets:
        base = 'hennery-' + target
        required.update({base + '.tar.xz', base + '.tar.xz.sha256', base + '.spdx.json',
                         target + '-third-party-source.tar.xz', target + '-builder.json', target + '-rust-advisories.json',
                         target + '-rust-advisory-revision.txt', target + '-web-advisories.json'})
    if 'crates' in channels:
        required.update(name + '-' + tag.removeprefix('v') + '.crate' for name in
                        ('hennery-proto', 'hennery-kernel', 'hennery-view', 'hennery-host', 'hennery-gateway', 'hennery-sessions', 'hennery'))
    if 'ghcr' in channels:
        required.update({'ghcr-index.json', 'ghcr-oci-layout.tar'})
    return required


def require_contract(root, channels, targets, tag):
    gate.require(set(channels) <= gate.CHANNELS and set(targets) <= gate.TARGETS, 'unqualified release channel/target')
    gate.require('-' not in tag or channels == ['github'], 'prerelease channels are GitHub only')
    gate.require(required_payloads(channels, targets, tag) <= {p.name for p in Path(root).iterdir()}, 'required release/channel payload missing')
    if 'homebrew' in channels:
        import homebrew
        homebrew.check(root, tag, targets)
    if 'crates' in channels:
        import tomllib
        import verify
        base = 'hennery-' + tag.removeprefix('v')
        with tarfile.open(Path(root) / (base + '.crate'), 'r:gz') as archive:
            entries = [m for m in archive.getmembers() if m.name == base + '/Cargo.toml']
            gate.require(len(entries) == 1 and entries[0].isfile() and entries[0].size <= 1024*1024, 'crate metadata must be one bounded regular file')
            with archive.extractfile(entries[0]) as metadata:
                package = tomllib.loads(metadata.read().decode())['package']
        verify.require_binstall_metadata(package.get('metadata', {}), tag)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['materials', 'freeze'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--target')
    parser.add_argument('--cargo-metadata', type=Path)
    parser.add_argument('--frontend-licences', type=Path)
    parser.add_argument('--channels', default='github')
    parser.add_argument('--targets', default=','.join(sorted(gate.TARGETS)))
    parser.add_argument('--tag')
    parser.add_argument('--run-id', type=int)
    parser.add_argument('--run-attempt', type=int)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if args.operation == 'materials':
        cargo = gate.strict_json(args.cargo_metadata.read_bytes())
        frontend = gate.strict_json(args.frontend_licences.read_bytes())
        packages, notices, findings = components(cargo, frontend)
        (args.output / 'THIRD-PARTY-NOTICES.txt').write_text(notices)
        (args.output / f'hennery-{args.target}.spdx.json').write_bytes(gate.canonical(spdx(packages, args.source_sha, args.target)))
        (args.output / 'licence-findings.json').write_bytes(gate.canonical({'findings': findings, 'scope': 'Rust and frontend including build/dev; assets and corresponding source still require maintainer review'}))
        dependency_sources(cargo, frontend, args.output / 'third-party-source.tar.xz')
        manifest = read_manifest()
        (args.output / 'runtime-inventory.json').write_bytes(gate.canonical({'adapter_manifest_sha256': gate.digest(manifest),
                                                                          'redistributed': False, 'manifest': gate.strict_json(manifest)}))
        ui = {str(p.relative_to('web/dist')): p.read_bytes() for p in Path('web/dist').rglob('*') if p.is_file()}
        gate.require('index.html' in ui, 'release UI missing')
        identity = {'source_sha': args.source_sha, 'ui_sha256': tree_digest(ui), 'adapter_manifest_sha256': gate.digest(manifest),
                    'cargo_lock_sha256': gate.digest(Path('Cargo.lock').read_bytes()), 'web_lock_sha256': gate.digest(Path('web/pnpm-lock.yaml').read_bytes())}
        (args.output / 'build-identity.json').write_bytes(gate.canonical(identity))
    else:
        gate.require(not (args.output / 'release-inventory.json').exists(), 'candidate already frozen')
        findings = gate.strict_json((args.output / 'licence-findings.json').read_bytes())
        gate.require(not findings['findings'], 'unresolved licence findings: maintainer review/materials required')
        require_contract(args.output, sorted(args.channels.split(',')), sorted(args.targets.split(',')), args.tag)
        manifest_path = args.output / 'dist-manifest.json'
        manifest = gate.strict_json(manifest_path.read_bytes())
        # Acyclic extension: native dist entries remain available to binstall;
        # the extension covers added material without hashing itself/checksums.
        manifest['hennery_release_materials'] = [{'name': p.name, 'sha256': gate.digest(p.read_bytes()), 'size': p.stat().st_size}
            for p in sorted(args.output.iterdir()) if p.name not in ('dist-manifest.json', 'sha256.sum', 'release-inventory.json')]
        manifest_path.write_bytes(gate.canonical(manifest))
        checksums(args.output)
        inventory = {'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': args.source_sha, 'tag': args.tag,
                     'channels': sorted(args.channels.split(',')), 'targets': sorted(args.targets.split(',')),
                     'candidate': {'run_id': args.run_id, 'run_attempt': args.run_attempt},
                     'artifacts': [{'name': p.name, 'sha256': gate.digest(p.read_bytes()), 'size': p.stat().st_size} for p in sorted(args.output.iterdir())]}
        gate.verify_files(inventory, args.output)
        inventory['binaries'] = binary_inventory(args.output, inventory['targets'])
        raw = gate.canonical(inventory)
        (args.output / 'release-inventory.json').write_bytes(raw)
        print(gate.digest(raw))


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, KeyError, OSError, ValueError) as error:
        raise SystemExit(f'release materials refused: {error}') from error
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew.py", "phase": "tests", "sha256": "14318459c72c1db37c5e3f48dda564024767ad99a682b783938093d57cd9559b", "size": 6482, "task": 2} -->
```text
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


    def test_unsigned_native_proof_freezes_exact_files_and_refuses_reuse(self):
        self.prepare()
        destination = self.root / 'proof'
        homebrew.freeze_proof(self.root, destination, self.tag, self.targets, 'a' * 40)
        inventory = gate.strict_json((destination / 'release-inventory.json').read_bytes())
        gate.verify_files(inventory, destination)
        self.assertEqual(inventory['channels'], ['github'])
        self.assertEqual(inventory['source_sha'], 'a' * 40)
        self.assertEqual((destination / 'hennery.rb').read_bytes(), self.path.read_bytes())
        self.assertEqual(len(inventory['artifacts']), len(self.targets) + 1)
        with self.assertRaises(FileExistsError):
            homebrew.freeze_proof(self.root, destination, self.tag, self.targets, 'a' * 40)
        archive = destination / ('hennery-' + self.targets[0] + '.tar.xz')
        archive.write_bytes(b'changed')
        with self.assertRaises(gate.Refused):
            gate.verify_files(inventory, destination)


    def test_selected_channel_contract_checks_actual_formula_not_only_payload_names(self):
        import supply
        self.prepare()
        channels = ['github', 'homebrew']
        for name in supply.required_payloads(channels, self.targets, self.tag):
            path = self.root / name
            if not path.exists():
                path.write_bytes(b'fixture payload')
        supply.require_contract(self.root, channels, self.targets, self.tag)
        self.path.write_text(self.path.read_text().replace(homebrew.TEST_BLOCK, ''))
        with self.assertRaises(gate.Refused):
            supply.require_contract(self.root, channels, self.targets, self.tag)


    def test_formula_line_endings_are_never_normalized_after_freezing(self):
        self.prepare()
        self.path.write_bytes(self.path.read_bytes().replace(b'\n', b'\r\n'))
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)


if __name__ == '__main__':
    unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew_accept.py", "phase": "tests", "sha256": "772af7c469ae50c473ab8b0e56e528868797be975a0613a8d67003ebd1bd2927", "size": 2535, "task": 2} -->
```text
"""Smoke refusals execute tiny local fixtures under an isolated home."""
import os
import subprocess
from pathlib import Path
import tempfile
import unittest

import gate
import homebrew_accept


class Smoke(unittest.TestCase):
    def test_exact_installed_bytes_and_version_are_both_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); binary=root/'hennery'
            raw=b'#!/bin/sh\nprintf "hennery 0.1.0\\n"\n'
            binary.write_bytes(raw);binary.chmod(0o755)
            env={'HOME':str(root),'PATH':'/usr/bin:/bin'}
            homebrew_accept.smoke(binary,raw,'v0.1.0',env,root)
            for expected,tag in ((b'changed','v0.1.0'),(raw,'v9.0.0')):
                with self.subTest(expected=expected,tag=tag),self.assertRaises(gate.Refused):
                    homebrew_accept.smoke(binary,expected,tag,env,root)

    def test_documented_tap_recipes_are_the_executed_three_operations(self):
        recipes=homebrew_accept.recipes()
        self.assertEqual(set(recipes),{'install','upgrade','uninstall'})
        self.assertIn('brew install --formula marcinwadon/tap/hennery',recipes['install'])
        self.assertIn('hennery --version',recipes['install'])
        self.assertIn('brew upgrade --formula marcinwadon/tap/hennery',recipes['upgrade'])
        self.assertIn('brew test marcinwadon/tap/hennery',recipes['upgrade'])
        self.assertIn('brew uninstall --force marcinwadon/tap/hennery',recipes['uninstall'])


    def test_local_tap_formula_has_a_real_commit_and_personal_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);tap=root/'tap';(tap/'Formula').mkdir(parents=True)
            env={'HOME':str(root),'PATH':os.environ['PATH']}
            subprocess.run(['git','-C',str(tap),'init','-q','--initial-branch=main'],env=env,check=True)
            for text in ('old fixture\n','candidate formula\n'):
                homebrew_accept.commit_formula(tap,text,env,root,'test(formula): local fixture')
                raw=subprocess.check_output(['git','-C',str(tap),'show','HEAD:Formula/hennery.rb'],env=env)
                self.assertEqual(raw,text.encode())
                author=subprocess.check_output(['git','-C',str(tap),'show','-s','--format=%ae','HEAD'],env=env,text=True).strip()
                self.assertEqual(author,'marcin.wadon@gmail.com')
                self.assertEqual(subprocess.check_output(['git','-C',str(tap),'status','--porcelain'],env=env),b'')


if __name__=='__main__': unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew_publish.py", "phase": "tests", "sha256": "d184f48d11a7c1d98395630ce6e39a1bcd08b372143699033e18de2951a881e7", "size": 12581, "task": 2} -->
```text
"""Offline transport only: no token, signature, registry or tap access."""
import base64
import copy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import test_homebrew
import homebrew_publish as publisher


class Publisher(unittest.TestCase):
    def setUp(self):
        fixture = test_homebrew.Formula(); fixture.setUp(); self.addCleanup(fixture.tmp.cleanup)
        fixture.prepare(); self.root = fixture.root
        self.inventory = {'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': 'a'*40,
                          'tag': fixture.tag, 'channels': ['github', 'homebrew'], 'targets': fixture.targets,
                          'candidate': {'run_id': 10, 'run_attempt': 1},
                          'artifacts': [{'name': p.name, 'size': p.stat().st_size, 'sha256': gate.digest(p.read_bytes())}
                                        for p in sorted(self.root.iterdir())]}
        raw = gate.canonical(self.inventory); self.digest = gate.digest(raw)
        (self.root/'release-inventory.json').write_bytes(raw)
        self.formula = (self.root/'hennery.rb').read_bytes()
        self.env = patch.dict(os.environ, {'RELEASE_PUBLICATION_ENABLED': 'true', 'RELEASE_HOMEBREW_ENABLED': 'true'})
        self.env.start(); self.addCleanup(self.env.stop)
        # Any omitted boundary is a test failure; no real transports can run.
        for name in ('run_gate', 'public_release', 'tap_api'):
            stub = patch.object(publisher, name, side_effect=AssertionError('unstubbed '+name))
            stub.start(); self.addCleanup(stub.stop)

    def remote(self, raw):
        return {'type':'file', 'path':'Formula/hennery.rb', 'encoding':'base64',
                'sha':publisher.blob_sha(raw), 'content':base64.b64encode(raw).decode()}

    def execute(self, previous=None, before_boundary=None):
        self.calls=[]; self.writes=[]
        def live(candidate, digest, phase):
            self.calls.append(phase)
            if phase == 'boundary' and before_boundary: before_boundary()
        def public(candidate, inventory): self.calls.append('public')
        def tap(method='GET', data=None):
            self.calls.append(method)
            if method == 'GET': return self.remote(self.formula) if self.writes else previous
            self.writes.append(data)
            return {'content': {'sha': publisher.blob_sha(self.formula)}, 'commit': {'sha':'b'*40}}
        with patch.object(publisher,'run_gate',side_effect=live), patch.object(publisher,'public_release',side_effect=public), patch.object(publisher,'tap_api',side_effect=tap):
            return publisher.upload(self.root, self.digest)

    def test_create_uploads_exact_frozen_bytes_after_fresh_boundary(self):
        self.execute()
        self.assertEqual(self.calls, ['preflight','public','GET','boundary','public','PUT','GET'])
        self.assertEqual(base64.b64decode(self.writes[0]['content']), self.formula)
        self.assertNotIn('sha', self.writes[0])
        self.assertEqual(self.writes[0]['branch'], 'main')

    def test_existing_older_formula_uses_compare_and_swap(self):
        old=self.formula.replace(b'version "0.1.0"',b'version "0.0.1"')
        self.execute(self.remote(old))
        self.assertIn('sha', self.writes[0])
        self.assertEqual(self.writes[0]['sha'], publisher.blob_sha(old))

    def test_exact_remote_bytes_are_idempotent_without_write(self):
        self.execute(self.remote(self.formula))
        self.assertEqual(self.writes, [])
        self.assertNotIn('PUT', self.calls)

    def test_same_version_conflict_downgrade_and_invalid_remote_refuse(self):
        for previous in (self.remote(self.formula+b'# conflicting bytes\n'),
                         self.remote(self.formula.replace(b'version "0.1.0"',b'version "9.0.0"')),
                         self.remote(b'unrecognised formula'),
                         dict(self.remote(self.formula),sha='0'*40),
                         dict(self.remote(self.formula),encoding='raw'),
                         dict(self.remote(self.formula),path='other.rb'),
                         dict(self.remote(self.formula),type='symlink'),
                         dict(self.remote(self.formula),content='not base64')):
            with self.subTest(previous=previous), self.assertRaises(gate.Refused): self.execute(previous)
            self.assertEqual(self.writes, [])

    def test_both_switches_must_be_explicit_before_any_transport(self):
        for key in ('RELEASE_PUBLICATION_ENABLED','RELEASE_HOMEBREW_ENABLED'):
            for value in ('', 'false'):
                with patch.dict(os.environ,{key:value}), self.subTest(key=key,value=value), self.assertRaises(gate.Refused):
                    publisher.upload(self.root,self.digest)

    def test_inventory_digest_channel_prerelease_and_bytes_refuse(self):
        for mutation in ('digest','channel','prerelease','bytes'):
            inv=copy.deepcopy(self.inventory)
            (self.root/'hennery.rb').write_bytes(self.formula)
            if mutation=='channel': inv['channels']=['github']
            if mutation=='prerelease':
                inv['tag']='v0.1.0-alpha.1'
                path=self.root/'hennery.rb';path.write_bytes(self.formula.replace(b'0.1.0',b'0.1.0-alpha.1'))
                item=next(a for a in inv['artifacts'] if a['name']=='hennery.rb')
                item.update(size=path.stat().st_size,sha256=gate.digest(path.read_bytes()))
            if mutation=='bytes': (self.root/'hennery.rb').write_bytes(self.formula.replace(b'bin.install "hennery"',b'bin.install "hennery" # unapproved bytes'))
            raw=gate.canonical(inv);(self.root/'release-inventory.json').write_bytes(raw)
            digest='0'*64 if mutation=='digest' else gate.digest(raw)
            with self.subTest(mutation=mutation), self.assertRaises(gate.Refused): publisher.upload(self.root,digest)

    def test_gate_rejection_and_boundary_byte_change_prevent_write(self):
        for phase in ('preflight','boundary'):
            def refuse(candidate,digest,actual):
                if phase==actual: raise gate.Refused('rejected signed inventory/fresh approval')
            with patch.object(publisher,'run_gate',side_effect=refuse),patch.object(publisher,'public_release'),patch.object(publisher,'tap_api',return_value=None) as transport:
                with self.subTest(phase=phase),self.assertRaises(gate.Refused): publisher.upload(self.root,self.digest)
                self.assertTrue(all(c.args[0]=='GET' for c in transport.call_args_list))
        with self.assertRaises(gate.Refused):
            self.execute(before_boundary=lambda:(self.root/'hennery.rb').write_bytes(b'changed'))
        self.assertEqual(self.writes,[])

    def test_ambiguous_write_never_retries_and_unconfirmed_content_refuses(self):
        for result in (gate.Refused('ambiguous write'), {'content':{'sha':'0'*40},'commit':{'sha':'b'*40}}):
            written=[]
            def transport(method='GET',data=None):
                if method=='GET': return self.remote(self.formula) if written else None
                written.append(data)
                if isinstance(result,Exception): raise result
                return result
            with patch.object(publisher,'run_gate'),patch.object(publisher,'public_release'),patch.object(publisher,'tap_api',side_effect=transport) as api:
                with self.subTest(result=result),self.assertRaises(gate.Refused): publisher.upload(self.root,self.digest)
                self.assertEqual(sum(c.args[0]=='PUT' for c in api.call_args_list),1)

    def test_public_release_must_be_immutable_and_all_referenced_bytes_match(self):
        valid={'id':1,'tag_name':'v0.1.0','draft':False,'prerelease':False,'immutable':True}
        assets=[{'name':p.name,'url':str(p)} for p in self.root.iterdir()]
        # The class-level safety stub is bypassed only for this pure mocked transport test.
        with patch.object(publisher.publish,'release_assets',return_value=assets),patch.object(publisher.publish,'asset_bytes',side_effect=lambda a:Path(a['url']).read_bytes()):
            for change in ({'draft':True},{'prerelease':True},{'immutable':False},{'tag_name':'v9.9.9'}):
                with patch.object(publisher.publish,'api',return_value=valid|change),self.subTest(change=change),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)
            with patch.object(publisher.publish,'api',return_value=valid):
                publisher.check_public_release(self.root,self.inventory)
                with patch.object(publisher.publish,'asset_bytes',return_value=b'wrong'),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)
                with patch.object(publisher.publish,'release_assets',return_value=assets+assets[:1]),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)
                with patch.object(publisher.publish,'release_assets',return_value=[]),self.assertRaises(gate.Refused):
                    publisher.check_public_release(self.root,self.inventory)


    def test_confirmed_write_still_requires_exact_remote_readback(self):
        written=[]
        def transport(method='GET',data=None):
            if method=='GET': return self.remote(self.formula+b'# changed remote bytes\n') if written else None
            written.append(data)
            return {'content':{'sha':publisher.blob_sha(self.formula)},'commit':{'sha':'b'*40}}
        with patch.object(publisher,'run_gate'),patch.object(publisher,'public_release'),patch.object(publisher,'tap_api',side_effect=transport):
            with self.assertRaises(gate.Refused): publisher.upload(self.root,self.digest)
        self.assertEqual(len(written),1)


class Transport(unittest.TestCase):
    def test_fixed_tap_path_credential_confinement_and_no_redirect(self):
        calls=[]
        class Response:
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self): return b'{}'
        class Opener:
            def open(self,request,timeout): calls.append(request);return Response()
        def opener(handler):
            self.assertIsNone(handler.redirect_request(None,None,302,None,None,'https://example.invalid'))
            return Opener()
        with patch.object(publisher.urllib.request,'build_opener',side_effect=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
            publisher.tap_api('GET');publisher.tap_api('PUT',{'content':'eA==','branch':'main'})
        self.assertEqual(calls[0].full_url,'https://api.github.com'+publisher.TAP_PATH+'?ref=main')
        self.assertNotIn('Authorization',calls[0].headers)
        self.assertEqual(calls[1].full_url,'https://api.github.com'+publisher.TAP_PATH)
        self.assertEqual(calls[1].headers['Authorization'],'Bearer offline-fixture')
        self.assertEqual(calls[1].data,gate.canonical({'content':'eA==','branch':'main'}))

    def test_only_authoritative_get_404_is_absence(self):
        import urllib.error
        for method in ('GET','PUT'):
            for code in (301,302,403,404,409,500):
                opener=unittest.mock.Mock()
                import io
                error=urllib.error.HTTPError('https://example.invalid',code,'fixture',{},io.BytesIO())
                self.addCleanup(error.close)
                opener.open.side_effect=error
                with patch.object(publisher.urllib.request,'build_opener',return_value=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
                    if method=='GET' and code==404:self.assertIsNone(publisher.tap_api(method))
                    else:
                        with self.subTest(method=method,code=code),self.assertRaises(gate.Refused):publisher.tap_api(method)
                self.assertEqual(opener.open.call_count,1)

    def test_live_gate_uses_homebrew_and_removes_tap_credential_from_child(self):
        with patch.object(publisher.subprocess,'run') as run,patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
            publisher.run_gate(Path('/tmp/frozen-candidate'),'0'*64,'boundary')
        run.assert_called_once()
        args,kwargs=run.call_args
        self.assertEqual(args[0][1],'homebrew')
        self.assertNotIn('HOMEBREW_TAP_TOKEN',kwargs['env'])
        self.assertIn('--receipt',args[0]);self.assertTrue(kwargs['check'])


if __name__=='__main__': unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew_settings.py", "phase": "tests", "sha256": "c510779ad0194f538b8b413a0862cd7c4ddd4202cd36718951aaa29b7cde56bf", "size": 1754, "task": 2} -->
```text
import copy
import unittest
import gate
import settings_audit
from test_settings import settings


def tap_settings():
    return {'repository':'marcinwadon/homebrew-tap','branch':'main','environment':'release',
            'credential':'RELEASE_HOMEBREW_TOKEN','kind':'fine-grained-pat',
            'repositories':['marcinwadon/homebrew-tap'],'permissions':{'contents':'write'},
            'scope_confirmed':True}


class TapSettings(unittest.TestCase):
    def test_selected_homebrew_requires_protected_tap_only_credential_and_scope_confirmation(self):
        valid=settings();valid['release_secrets'].append('RELEASE_HOMEBREW_TOKEN');valid['homebrew']=tap_settings()
        settings_audit.validate_settings(valid,['github','homebrew'])
        app=copy.deepcopy(valid);app['homebrew']['kind']='app-installation'
        settings_audit.validate_settings(app,['github','homebrew'])
        mutations=[lambda s:s.pop('homebrew'),lambda s:s['release_secrets'].remove('RELEASE_HOMEBREW_TOKEN')]
        for key,value in (('repository','other/tap'),('branch','other'),('environment','repository'),
                          ('credential','GITHUB_TOKEN'),('kind','classic-pat'),('scope_confirmed',False),
                          ('repositories',['marcinwadon/homebrew-tap',gate.REPOSITORY]),
                          ('permissions',{'contents':'write','workflows':'write'})):
            mutations.append(lambda s,key=key,value=value:s['homebrew'].update({key:value}))
        for mutate in mutations:
            bad=copy.deepcopy(valid);mutate(bad)
            with self.subTest(settings=bad),self.assertRaises(gate.Refused):settings_audit.validate_settings(bad,['github','homebrew'])
        settings_audit.validate_settings(settings(),['github'])
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew_workflows.py", "phase": "tests", "sha256": "c9cfc9fc31d343e1d287970dbb1c9e3375bac4ab1df9086f1931357a925d8784", "size": 5443, "task": 2} -->
```text
import copy
from pathlib import Path
import unittest
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def workflow(name): return workflow_policy.load_workflow((ROOT/'.github/workflows'/name).read_text())


class HomebrewWorkflows(unittest.TestCase):
    def test_channel_has_an_owning_aggregate_job_and_native_acceptance(self):
        data=workflow('release-candidate.yml')
        self.assertEqual(workflow_policy.CHANNEL_JOB_IDS['homebrew'],'homebrew')
        job=data['jobs']['homebrew']
        self.assertEqual(job['name'],'homebrew')
        self.assertIn('homebrew-native',job['needs'])
        native=data['jobs']['homebrew-native']
        self.assertNotIn('if',native, 'unselected native jobs must succeed as no-ops')
        self.assertEqual({x['runner'] for x in native['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew_accept.py',str(native))
        self.assertIn('homebrew.py prepare',str(data['jobs']['assemble']))
        self.assertIn('native-archive.sh',str(data['jobs']['archive']))

    def test_pr_proof_is_secret_free_pinned_and_covers_every_advertised_platform(self):
        data=workflow('release-homebrew.yml')
        trigger=data.get('on',data.get(True))
        self.assertIn('pull_request',trigger)
        self.assertIn('packaging/**',trigger['pull_request']['paths'])
        self.assertEqual(data['permissions'],{'contents':'read'})
        self.assertNotIn('secrets.',str(data))
        job=data['jobs']['proof']
        self.assertEqual({x['runner'] for x in job['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew-proof.sh',str(job))
        workflow_policy.check(data,'release-homebrew.yml')

    def test_writer_exposes_tap_credential_only_after_signature_and_both_gates(self):
        data=workflow('release-publish.yml'); job=data['jobs']['homebrew']
        self.assertEqual(job['needs'],['github','authorize'])
        self.assertEqual(job['permissions'],{'contents':'read','actions':'read'})
        self.assertIn("vars.RELEASE_HOMEBREW_ENABLED == 'true'",job['if'])
        steps=job['steps']
        credential=[i for i,s in enumerate(steps) if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s)]
        self.assertEqual(len(credential),1)
        boundary=next(i for i,s in enumerate(steps) if s.get('with',{}).get('phase')=='boundary')
        signature=next(i for i,s in enumerate(steps) if 'verify.py --candidate' in s.get('run',''))
        self.assertLess(signature,boundary);self.assertLess(boundary,credential[0])
        self.assertNotIn('RELEASE_HOMEBREW_TOKEN',str(job.get('env',{})))
        workflow_policy.check(data,'release-publish.yml')

    def test_policy_refuses_early_credential_missing_integrity_or_switch(self):
        data=workflow('release-publish.yml')
        for kind in ('early','job-env','missing-signature','missing-byte-check','missing-switch','ignored-upload','skip-signature'):
            changed=copy.deepcopy(data);job=changed['jobs']['homebrew'];steps=job['steps']
            if kind=='early':
                step=next(s for s in steps if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s));steps.remove(step);steps.insert(0,step)
            elif kind=='job-env': job.setdefault('env',{})['HOMEBREW_TAP_TOKEN']='${{ secrets.RELEASE_HOMEBREW_TOKEN }}'
            elif kind=='missing-signature': job['steps']=[s for s in steps if 'verify.py --candidate' not in s.get('run','')]
            elif kind=='missing-byte-check': job['steps']=[s for s in steps if 'homebrew_publish.py --verify' not in s.get('run','')]
            elif kind=='missing-switch': job['if']=workflow_policy.CREDENTIAL_CONDITION
            elif kind=='ignored-upload': steps[-1]['continue-on-error']=True
            else: next(s for s in steps if 'verify.py --candidate' in s.get('run',''))['if']='false'
            with self.subTest(kind=kind),self.assertRaises(ValueError): workflow_policy.check(changed,'release-publish.yml')

    def test_registered_homebrew_name_cannot_be_stolen_or_missing_when_selected(self):
        data=workflow('release-candidate.yml');data['jobs'].pop('homebrew')
        data['jobs']['ordinary']={'name':'homebrew','timeout-minutes':5,'steps':[{'run':'false'}]}
        with self.assertRaises(ValueError): workflow_policy.check(data,'release-candidate.yml')


    def test_workflow_level_credential_aliases_refuse_before_any_job(self):
        for expression in ("${{ secrets.RELEASE_HOMEBREW_TOKEN }}", "${{ secrets.release_homebrew_token }}",
                           "${{ secrets['RELEASE_HOMEBREW_TOKEN'] }}", '${{ secrets["release_homebrew_token"] }}'):
            data=workflow('release-publish.yml');data['env']={'HOMEBREW_TAP_TOKEN':expression}
            with self.subTest(expression=expression),self.assertRaises(ValueError):workflow_policy.check(data,'release-publish.yml')


    def test_renamed_job_and_workflow_cannot_hide_an_early_tap_credential(self):
        data=workflow('release-publish.yml')
        job=data['jobs'].pop('homebrew');data['jobs']['tap-mirror']=job
        steps=job['steps'];step=next(s for s in steps if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s))
        steps.remove(step);steps.insert(0,step)
        with self.assertRaises(ValueError): workflow_policy.check(data,'generated.yml')


if __name__=='__main__': unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_platform.py", "phase": "tests", "sha256": "9d389234c24a2618d085728030504bf9c1489f733bbac2bf0383e7ab1fffcd26", "size": 13695, "task": 2} -->
```text
import copy
import base64
import json
import unittest

import gate
import test_gate
import settings_audit


def workflow_content(workflow):
    return {'type':'file','path':'.github/workflows/release-candidate.yml','encoding':'base64',
            'content':base64.b64encode(json.dumps(workflow).encode()).decode()}


class Platform(unittest.TestCase):
    def fixture(self):
        fixture = test_gate.Gates()
        fixture.setUp()
        self.addCleanup(fixture.tmp.cleanup)
        return fixture

    def test_skipped_jobs_cannot_hide_in_successful_workflow(self):
        fixture = self.fixture()
        class Fake(gate.GitHub):
            def verify_tag(self, inventory, object_sha):
                return fixture.snapshot['tag_signature']

            def get(self, path):
                if path == '/contents/.github/workflows/release-candidate.yml?ref='+fixture.inventory['source_sha']:
                    return workflow_content({'jobs':{'archive':{},'crates':{},'ghcr':{},'homebrew':{}}})
                if path.startswith('/git/ref/'):
                    return fixture.snapshot['tag']
                if path.startswith('/git/tags/'):
                    return fixture.snapshot['tag_object']
                if path.startswith('/rulesets/'):
                    raise AssertionError('publishers must not read private ruleset settings')
                if path == '/environments/release':
                    raise AssertionError('publishers must not read private environment settings')
                if path == '/actions/runs/10':
                    return fixture.snapshot['candidate_run']
                if path == '/actions/runs/20':
                    return fixture.snapshot['publisher_run']
                if path == '/actions/runs/20/approvals':
                    return fixture.snapshot['reviews']
                raise AssertionError(path)

            def pages(self, path, key=None):
                if path == '/rulesets':
                    raise AssertionError('publishers must not inspect ruleset bypass actors')
                if path.endswith('/deployment-branch-policies'):
                    raise AssertionError('publishers must use the approved settings audit')
                if path.startswith('/actions/runs?'):
                    return [dict(r, run_attempt=1) for r in fixture.snapshot['checks']]
                if path.endswith('/jobs'):
                    return self.jobs
                raise AssertionError(path)

        client = Fake('offline-fixture')
        client.jobs = [{'status': 'completed', 'conclusion': 'success'}]
        snapshot = client.evidence(fixture.inventory, fixture.context, fixture.snapshot['settings_audit'])
        gate.validate(fixture.inventory, fixture.digest, fixture.root, fixture.context, snapshot)
        for jobs in ([], [{'status': 'completed', 'conclusion': 'skipped'}], [{'status': 'queued', 'conclusion': None}],
                     [{'status': 'completed', 'conclusion': 'cancelled'}]):
            client.jobs = jobs
            with self.subTest(jobs=jobs), self.assertRaises(gate.Refused):
                client.evidence(fixture.inventory, fixture.context, fixture.snapshot['settings_audit'])

    def test_checked_in_settings_match_the_validated_policy(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        rules = gate.strict_json((root / '.github/release-tag-ruleset.json').read_bytes())
        creation = gate.strict_json((root / '.github/release-tag-creation.json').read_bytes())
        self.assertEqual([creation, rules], settings_audit.tag_rulesets(0))
        gate.check_tag_rules([creation, rules], 0)
        environment = gate.strict_json((root / '.github/release-environment.example.json').read_bytes())
        self.assertIs(environment['can_admins_bypass'], False)
        self.assertEqual(environment['reviewers'], [{'type': 'User', 'id': 0}])
        self.assertEqual(gate.strict_json((root / '.github/release-branch-policy.json').read_bytes()), {'name': 'v*', 'type': 'tag'})

    def candidate_evidence(self, channels, jobs, required_jobs=None, workflow=None, validate=False):
        fixture = self.fixture()
        fixture.inventory['channels'] = channels
        if workflow is None: workflow={'jobs':{'archive':{},'crates':{},'ghcr':{},'homebrew':{}}}
        class Fake(gate.GitHub):
            def verify_tag(self, inventory, object_sha):
                return fixture.snapshot['tag_signature']

            def get(self, path):
                if path == '/contents/.github/workflows/release-candidate.yml?ref='+fixture.inventory['source_sha']:
                    if workflow is False: raise gate.Refused('fixture workflow unavailable')
                    return workflow_content(workflow)
                if path.startswith('/git/ref/'): return fixture.snapshot['tag']
                if path.startswith('/git/tags/'): return fixture.snapshot['tag_object']
                return {
                    '/actions/runs/10': fixture.snapshot['candidate_run'],
                    '/actions/runs/20': fixture.snapshot['publisher_run'],
                    '/actions/runs/20/approvals': fixture.snapshot['reviews'],
                }[path]

            def pages(self, path, key=None):
                if path.startswith('/actions/runs?'):
                    return [dict(r, run_attempt=1) for r in fixture.snapshot['checks']]
                if path == '/actions/runs/10/attempts/1/jobs': return jobs
                if path.endswith('/jobs'):
                    return required_jobs if required_jobs is not None else [{'status':'completed','conclusion':'success'}]
                raise AssertionError(path)
        snapshot=Fake('offline-fixture').evidence(fixture.inventory, fixture.context, fixture.snapshot['settings_audit'])
        if validate: gate.validate(fixture.inventory, fixture.digest, fixture.root, fixture.context, snapshot)
        return snapshot

    @staticmethod
    def job(name, conclusion='success', status='completed'):
        return {'name':name,'status':status,'conclusion':conclusion}

    def test_github_only_accepts_unselected_crates_and_ghcr_skips(self):
        self.candidate_evidence(['github'], [self.job('archive'), self.job('crates','skipped'), self.job('ghcr','skipped')])
        self.candidate_evidence(['github'], [self.job('archive')])
        self.candidate_evidence(['github'], [self.job('archive'),self.job('crates'),self.job('ghcr')])

    def test_github_only_homebrew_native_noops_succeed_but_skipped_native_jobs_refuse(self):
        native=[self.job('homebrew-native ('+runner+')') for runner in ('macos-15','ubuntu-24.04','ubuntu-24.04-arm')]
        optional=[self.job(channel,'skipped') for channel in ('crates','ghcr','homebrew')]
        self.candidate_evidence(['github'],[self.job('archive'),*optional,*native])
        for skipped in native:
            with self.subTest(skipped=skipped),self.assertRaises(gate.Refused):
                self.candidate_evidence(['github'],[self.job('archive'),*optional,self.job(skipped['name'],'skipped')])

    def test_selected_channel_acceptance_must_exist_and_succeed(self):
        for channel in ('crates','ghcr','homebrew'):
            self.candidate_evidence(['github',channel], [self.job('archive'),self.job(channel)])
            for jobs in ([], [self.job(channel,'skipped')], [self.job(channel,'failure')],
                         [self.job(channel,'cancelled')], [self.job(channel,None,'queued')],
                         [self.job(channel),self.job(channel)]):
                with self.subTest(channel=channel,jobs=jobs), self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github',channel], [self.job('archive'),*jobs])

    def test_optional_channels_do_not_waive_failures_or_other_skipped_jobs(self):
        for channel in ('crates','ghcr','homebrew'):
            for job in (self.job(channel,'failure'),self.job(channel,'skipped','queued'),self.job(channel,'cancelled')):
                with self.subTest(channel=channel,job=job), self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github'],[self.job('archive'),job])
            with self.subTest(duplicate=channel), self.assertRaises(gate.Refused):
                self.candidate_evidence(['github'],[self.job('archive'),self.job(channel,'skipped'),self.job(channel,'skipped')])
        with self.assertRaises(gate.Refused):
            self.candidate_evidence(['github'],[self.job('archive','skipped'),self.job('crates','skipped')])

    def test_unselected_channel_cannot_skip_a_required_workflow_job(self):
        with self.assertRaises(gate.Refused):
            self.candidate_evidence(['github'],[self.job('archive')],required_jobs=[self.job('crates','skipped')])

    def test_each_selected_channel_is_required_when_all_are_selected(self):
        channels=['github','crates','ghcr','homebrew']
        self.candidate_evidence(channels,[self.job('archive'),self.job('crates'),self.job('ghcr'),self.job('homebrew')])
        for channel in ('crates','ghcr','homebrew'):
            with self.subTest(channel=channel), self.assertRaises(gate.Refused):
                self.candidate_evidence(channels,[self.job('archive'),self.job(channel)])

    def test_candidate_crates_job_has_registered_platform_name(self):
        from pathlib import Path
        import yaml
        workflow=yaml.safe_load((Path(__file__).resolve().parents[2]/'.github/workflows/release-candidate.yml').read_text())
        self.assertEqual(workflow['jobs']['crates'].get('name','crates'),'crates')
        self.assertIn("',crates,'",workflow['jobs']['crates']['if'])

    def test_ordinary_job_renamed_to_reserved_channel_cannot_be_exempted(self):
        for channel in ('crates','ghcr','homebrew'):
            for owner_present in (False,True):
                workflow={'jobs':{'archive':{},'licence-review':{'name':channel}}}
                if owner_present: workflow['jobs'][channel]={'name':channel}
                with self.subTest(channel=channel,owner_present=owner_present), self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github'],[self.job('archive'),self.job(channel,'skipped')],workflow=workflow,validate=True)

    def test_dynamic_job_name_cannot_claim_reserved_channel_at_runtime(self):
        for expression in ("${{ 'ghcr' }}",'${{ matrix.name }}'):
            workflow={'jobs':{'archive':{},'licence-review':{'name':expression}}}
            with self.subTest(expression=expression), self.assertRaises(gate.Refused):
                self.candidate_evidence(['github'],[self.job('archive'),self.job('ghcr','skipped')],workflow=workflow)

    def test_reserved_evidence_name_requires_owner_in_tagged_workflow(self):
        for channel in ('crates','ghcr','homebrew'):
            for selected in (False,True):
                with self.subTest(channel=channel,selected=selected),self.assertRaises(gate.Refused):
                    self.candidate_evidence(['github',channel] if selected else ['github'],
                                            [self.job('archive'),self.job(channel,'success' if selected else 'skipped')],
                                            workflow={'jobs':{'archive':{}}})

    def test_tagged_workflow_unavailable_refuses_even_unselected_channels(self):
        with self.assertRaises(gate.Refused):
            self.candidate_evidence(['github'],[self.job('archive')],workflow=False)

    def test_ghcr_waits_for_its_registered_owner_in_the_tagged_workflow(self):
        from pathlib import Path
        import yaml
        workflow=yaml.safe_load((Path(__file__).resolve().parents[2]/'.github/workflows/release-candidate.yml').read_text())
        # Model a signed workflow before R4 adds its aggregate owner. This
        # negative fixture must remain valid after that integration lands.
        workflow['jobs'].pop('ghcr',None)
        for extra in ([],[self.job('ghcr')]):
            with self.subTest(extra=extra),self.assertRaises(gate.Refused):
                self.candidate_evidence(['github','ghcr'],[self.job('archive'),*extra],workflow=workflow)

    def test_runtime_registry_uses_explicit_channel_to_owner_mapping(self):
        from unittest.mock import patch
        import workflow_policy
        workflow={'jobs':{'archive':{},'container-acceptance':{'name':'ghcr'}}}
        with patch.dict(workflow_policy.CHANNEL_JOB_IDS,{'ghcr':'container-acceptance'}):
            self.candidate_evidence(['github','ghcr'],[self.job('archive'),self.job('ghcr')],workflow=workflow)

    def test_candidate_workflow_content_must_be_a_valid_file_at_the_pinned_path(self):
        from unittest.mock import patch
        valid=workflow_content({'jobs':{'archive':{}}})
        for change in ({'type':'dir'},{'path':'another.yml'},{'encoding':'raw'},{'content':'not-base64'},
                       {'content':None},{'content':base64.b64encode(b'[]').decode()},
                       {'content':base64.b64encode(b'jobs: {archive: {}, archive: {}}').decode()}):
            client=gate.GitHub('offline-fixture')
            with self.subTest(change=change),patch.object(client,'get',return_value=valid|change),self.assertRaises(gate.Refused):
                client.candidate_channels('a'*40)

    def test_environment_bypass_must_be_explicit_false(self):
        fixture = self.fixture()
        for value in (None, True, 'false'):
            fixture.snapshot['settings_audit']['settings']['environment']['can_admins_bypass'] = value
            with self.subTest(value=value), self.assertRaises(gate.Refused):
                fixture.validate()


if __name__ == '__main__':
    unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_workflows.py", "phase": "tests", "sha256": "002bb5cc580a0a16753d45b8584607b6dbd574489994ca4a8e8264c91aa902d1", "size": 12282, "task": 2} -->
```text
"""Workflow structure is part of the gate; every privileged job is checked."""
import copy
from pathlib import Path
import re
import unittest
import tempfile
import shutil

import yaml

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]


class Workflows(unittest.TestCase):
    def candidate(self):
        return yaml.safe_load((ROOT / '.github/workflows/release-candidate.yml').read_text())

    def test_reserved_channel_names_belong_only_to_their_job_ids(self):
        for channel in ('crates','ghcr','homebrew'):
            data=self.candidate()
            data['jobs'].pop(channel,None)
            data['jobs']['licence-review']={'name':channel,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(channel=channel), self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check(data,'release-candidate.yml')

    def test_candidate_job_names_cannot_be_dynamic_or_collide(self):
        for display in ('archive',"${{ 'ghcr' }}",'${{ matrix.name }}',None,42):
            data=self.candidate()
            data['jobs']['licence-review']={'name':display,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(display=display), self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check(data,'release-candidate.yml')

    def test_candidate_job_identity_requires_a_valid_jobs_mapping(self):
        for jobs in (None,{},[],{'ordinary':None},{'ordinary.name':{}},{True:{}}):
            with self.subTest(jobs=jobs),self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check({'jobs':jobs},'release-candidate.yml')

    def test_channel_owner_has_literal_own_name_and_no_matrix(self):
        for channel in ('crates','ghcr','homebrew'):
            for changed in ({},{'name':channel}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                workflow_policy.check(data,'release-candidate.yml')
            for changed in ({'name':'archive'},{'name':'ordinary-display'},{'name':"${{ '"+channel+"' }}"},{'strategy':{'matrix':{'os':['ubuntu-24.04']}}}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                with self.subTest(channel=channel,changed=changed), self.assertRaisesRegex(ValueError,'candidate job identity'):
                    workflow_policy.check(data,'release-candidate.yml')

    def test_channel_registry_explicitly_maps_a_channel_to_its_owning_job_id(self):
        from unittest.mock import patch
        data=self.candidate()
        data['jobs']['container-acceptance']={'name':'ghcr','timeout-minutes':5,'steps':[{'run':'true'}]}
        with patch.dict(workflow_policy.CHANNEL_JOB_IDS,{'ghcr':'container-acceptance'}):
            workflow_policy.check(data,'release-candidate.yml')
            data['jobs']['unrelated']=data['jobs'].pop('container-acceptance')
            with self.assertRaisesRegex(ValueError,'candidate job identity'):
                workflow_policy.check(data,'release-candidate.yml')

    def test_candidate_yaml_decoding_cannot_hide_reserved_name_or_duplicate(self):
        base=(ROOT/'.github/workflows/release-candidate.yml').read_text()
        variants=[
            '\ufeff'+base+'\n  licence-review:\n    name: "\\u0067hcr"\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
            base+'\n  licence-review:\n    name: ghcr\n    name: ordinary\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
        ]
        for raw in variants:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                (root/'.github/workflows/release-candidate.yml').write_text(raw)
                with self.subTest(raw=raw[-150:]),self.assertRaises(ValueError):
                    workflow_policy.check_repository(root)

    def test_all_release_workflows(self):
        workflow_policy.check_repository(ROOT)

    def test_arbitrary_workflow_filename_cannot_hide_write_authority(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shutil.copytree(ROOT / '.github', root / '.github')
            data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
            data['on'] = data.pop(True) if True in data else data['on']
            data['jobs']['sign'].pop('environment')
            data['jobs']['sign']['steps'] = [s for s in data['jobs']['sign']['steps'] if s.get('uses') != './.github/actions/release-gate']
            (root / '.github/workflows/release.yml').write_text(yaml.safe_dump(data))
            with self.assertRaises(ValueError):
                workflow_policy.check_repository(root)

    def test_credentials_cannot_start_without_current_bound_authorization(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for kind in ('missing-authorize', 'missing-auth-gate', 'old-attempt-condition', 'ignored-authorize-dependency', 'or-bypass'):
            changed = copy.deepcopy(data)
            if kind == 'missing-authorize':
                changed['jobs'].pop('authorize')
            elif kind == 'missing-auth-gate':
                changed['jobs']['authorize']['steps'] = [s for s in changed['jobs']['authorize']['steps'] if s.get('uses') != './.github/actions/release-gate']
            elif kind == 'old-attempt-condition':
                changed['jobs']['sign']['if'] = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == 'refs/heads/main'"
            elif kind == 'ignored-authorize-dependency':
                changed['jobs']['sign']['needs'] = 'approval-tuple'
            else:
                changed['jobs']['sign']['if'] += ' || true'
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_authorization_job_is_protected_and_has_no_publication_authority(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for field, value in [('environment', None), ('permissions', {'contents': 'write'}), ('permissions', {'id-token': 'write'})]:
            changed = copy.deepcopy(data)
            changed['jobs']['authorize'][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_gate_cannot_be_skipped_or_ignore_failure(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for name in ('authorize', 'sign', 'github'):
            for field, value in [('if', 'false'), ('continue-on-error', True)]:
                changed = copy.deepcopy(data)
                step = next(s for s in changed['jobs'][name]['steps'] if s.get('uses') == './.github/actions/release-gate')
                step[field] = value
                with self.subTest(job=name, field=field), self.assertRaises(ValueError):
                    workflow_policy.check(changed, 'release-publish.yml')

    def test_read_only_job_with_release_secrets_still_requires_authorization(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        data['jobs']['bootstrap-crates'] = {
            'runs-on': 'ubuntu-24.04', 'timeout-minutes': 10, 'environment': 'release',
            'permissions': {'contents': 'read'}, 'steps': [{'run': 'echo protected credential job'}],
        }
        with self.assertRaises(ValueError):
            workflow_policy.check(data, 'release-publish.yml')

    def test_authorization_job_cannot_ignore_failures(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        data['jobs']['authorize']['continue-on-error'] = True
        with self.assertRaises(ValueError):
            workflow_policy.check(data, 'release-publish.yml')

    def test_each_privileged_job_requires_environment(self):
        for workflow in (ROOT / '.github/workflows').glob('release-*.yml'):
            data = yaml.safe_load(workflow.read_text())
            for name, job in data['jobs'].items():
                if workflow_policy.privileged(job):
                    for value in (None, 'unguarded'):
                        with self.subTest(workflow=workflow.name, job=name, value=value):
                            mutated = copy.deepcopy(data)
                            mutated['jobs'][name]['environment'] = value
                            with self.assertRaises(ValueError):
                                workflow_policy.check(mutated, workflow.name)

    def test_remove_either_boundary_refuses(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for phase in ('preflight', 'boundary'):
            changed = copy.deepcopy(data)
            # Isolate phase completeness from the independent credential-order
            # guards. Removing this guard must fail our assertion, not a later
            # gates['phase'] lookup with KeyError.
            steps = [s for s in changed['jobs']['github']['steps'] if s.get('uses') == './.github/actions/release-gate']
            changed['jobs']['github']['steps'] = [s for s in steps if s.get('with', {}).get('phase') != phase]
            with self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_credentials_and_writes_cannot_precede_their_gates(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for job_name, match in [('sign', 'actions/attest'), ('github', 'actions/create-github-app-token')]:
            changed = copy.deepcopy(data)
            steps = changed['jobs'][job_name]['steps']
            step = next(s for s in steps if s.get('uses', '').startswith(match))
            steps.remove(step)
            steps.insert(0, step)
            with self.subTest(job=job_name), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_reusable_job_cannot_hide_its_environment(self):
        with self.assertRaises(ValueError):
            workflow_policy.check({'jobs': {'sign': {'uses': './.github/workflows/release-sign.yml'}}}, 'release-wrapper.yml')

    def test_unpinned_action_and_cache_refuse(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-candidate.yml').read_text())
        for action in ('actions/checkout@v4', 'Swatinem/rust-cache@' + 'a' * 40):
            changed = copy.deepcopy(data)
            changed['jobs']['archive']['steps'].append({'uses': action})
            with self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-candidate.yml')



class PlatformBoundary(unittest.TestCase):
    def test_release_jobs_run_on_the_release_tag_without_admin_policy_tokens(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for name in ('authorize', 'sign', 'github'):
            job = data['jobs'][name]
            self.assertNotIn('refs/heads/', job.get('if', ''))
            self.assertIn('refs/tags/', job.get('if', ''))
        text = (ROOT / '.github/workflows/release-publish.yml').read_text()
        self.assertNotIn('RELEASE_POLICY_READ_TOKEN', text)
        self.assertNotIn('permission-administration', text)
        self.assertIn('settings_audit_sha256:', text)
        self.assertIn('settings_audit:', text)

    def test_candidate_retention_requires_prior_tag_signature_validation(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-candidate.yml').read_text())
        self.assertIn('tag-signature', data['jobs'])
        job = data['jobs']['tag-signature']
        self.assertIn('tag_signature.py', str(job))
        for name, job in data['jobs'].items():
            if job.get('environment') == 'release-staging':
                self.assertIn('tag-signature', job['needs'])


if __name__ == '__main__':
    unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/workflow_policy.py", "phase": "feature", "sha256": "b75e47ab365667b2eaec96453ae2865868c664186e721e2da32dc6583e6c7978", "size": 12015, "task": 2} -->
```text
#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys



CREDENTIAL_CONDITION = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256"
# Channel -> owning YAML job ID. The literal API display name is the channel.
# R4's name is reserved now; selection refuses until its owning job exists.
CHANNEL_JOB_IDS = {'crates': 'crates', 'ghcr': 'ghcr', 'homebrew': 'homebrew'}


def load_workflow(raw):
    # Most release helpers use only the stdlib parts of gate/workflow_policy.
    # The signed-workflow binding always needs the pinned parser and refuses
    # explicitly when it is unavailable; there is no permissive fallback.
    try:
        import yaml
    except ImportError as error:
        raise ValueError('workflow parser unavailable; run inside nix develop .#release') from error

    class UniqueSafeLoader(yaml.SafeLoader):
        def construct_mapping(self, node, deep=False):
            self.flatten_mapping(node)
            seen = set()
            for key_node, _ in node.value:
                key = self.construct_object(key_node, deep=deep)
                if key in seen:
                    raise ValueError('duplicate workflow YAML key')
                seen.add(key)
            return super().construct_mapping(node, deep=deep)

    try:
        data = yaml.load(raw, Loader=UniqueSafeLoader)
    except yaml.YAMLError as error:
        raise ValueError('invalid workflow YAML') from error
    if not isinstance(data, dict):
        raise ValueError('workflow mapping required')
    return data


def candidate_channel_jobs(data):
    """Bind job API names to owning IDs in the exact candidate workflow."""
    jobs = data.get('jobs')
    if not isinstance(jobs, dict) or not jobs:
        raise ValueError('candidate job identity: jobs mapping required')
    seen = set()
    for job_id, job in jobs.items():
        if not isinstance(job_id, str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]*', job_id) or not isinstance(job, dict):
            raise ValueError('candidate job identity: invalid job ID or definition')
        display = job.get('name', job_id)
        if not isinstance(display, str) or not display or '${{' in display:
            raise ValueError('candidate job identity: names must be literal strings')
        if display in seen:
            raise ValueError('candidate job identity: display name collision')
        seen.add(display)
        if display in CHANNEL_JOB_IDS and CHANNEL_JOB_IDS[display] != job_id:
            raise ValueError('candidate job identity: reserved name belongs to another job ID')
        for channel, owner in CHANNEL_JOB_IDS.items():
            if job_id == owner and (display != channel or 'strategy' in job):
                raise ValueError('candidate job identity: channel owner requires its literal name and no matrix')
    return {channel: owner for channel, owner in CHANNEL_JOB_IDS.items() if owner in jobs}


def tap_credential(value):
    return bool(re.search(r"secrets\s*(?:\.\s*release_homebrew_token|\[\s*['\"]release_homebrew_token['\"]\s*\])", str(value), re.I))


def privileged(job):
    return tap_credential(job) or any(job.get('permissions', {}).get(scope) == 'write' for scope in ('contents', 'packages', 'attestations', 'id-token')) or any(
        s.get('uses', '').startswith(('actions/create-github-app-token@', 'rust-lang/crates-io-auth-action@')) or 'publish.py upload' in s.get('run', '')
        for s in job.get('steps', []))


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def writer(name, job):
    # Protected-environment secrets can be publication credentials even when
    # the ordinary job token is read-only (for example crates.io bootstrap).
    return privileged(job) or (environment_name(job) == 'release' and name != 'authorize')


def homebrew_writer(job):
    """A tap secret is exposed only to the final, gated, exact-byte writer."""
    if job.get('if') != CREDENTIAL_CONDITION + " && vars.RELEASE_HOMEBREW_ENABLED == 'true'":
        raise ValueError('Homebrew needs its separate publication switch')
    if job.get('needs') != ['github', 'authorize'] or job.get('permissions') != {'contents': 'read', 'actions': 'read'}:
        raise ValueError('Homebrew must follow GitHub with a read-only ordinary token')
    if tap_credential(job.get('env', {})):
        raise ValueError('tap credential must not be job-scoped')
    steps = job.get('steps', [])
    def one(predicate):
        positions = [i for i, step in enumerate(steps) if predicate(step)]
        if len(positions) != 1:
            raise ValueError('Homebrew requires one signature, byte check, boundary and credential step')
        step = steps[positions[0]]
        if step.get('if') is not None or step.get('continue-on-error') not in (None, False):
            raise ValueError('Homebrew integrity and write steps must be unconditional and fatal')
        return positions[0]
    preflight = one(lambda s: s.get('with', {}).get('phase') == 'preflight')
    signature = one(lambda s: 'verify.py --candidate' in s.get('run', ''))
    integrity = one(lambda s: 'homebrew_publish.py --verify' in s.get('run', ''))
    boundary = one(lambda s: s.get('with', {}).get('phase') == 'boundary')
    credential = one(tap_credential)
    if not preflight < signature < integrity < boundary < credential or credential != len(steps) - 1:
        raise ValueError('Homebrew signature and fresh gates must precede the tap credential')
    if 'homebrew_publish.py candidate' not in steps[credential].get('run', ''):
        raise ValueError('tap credential may only reach the frozen formula writer')


def check(data, name):
    if tap_credential(data.get('env', {})):
        raise ValueError('tap credential must not be workflow-scoped')
    if name == 'release-candidate.yml':
        candidate_channel_jobs(data)
    jobs = data.get('jobs', {})
    writers = [j for key, j in jobs.items() if writer(key, dict(j, permissions=j.get('permissions', data.get('permissions', {}))))]
    if writers:
        authorization = jobs.get('authorize', {})
        effective = dict(authorization, permissions=authorization.get('permissions', data.get('permissions', {})))
        if not authorization or privileged(effective) or authorization.get('environment') != 'release':
            raise ValueError('a protected read-only authorization job must precede credential issuance')
        proof = [s.get('with', {}).get('phase') for s in authorization.get('steps', []) if s.get('uses') == './.github/actions/release-gate']
        if proof != ['preflight']:
            raise ValueError('credential authorization must run the live preflight gate')
    for key, job in jobs.items():
        if tap_credential(job) or (name == 'release-publish.yml' and key == 'homebrew'):
            homebrew_writer(job)
        if 'uses' in job:
            raise ValueError(f'{name}/{key}: reusable jobs need explicit authority review; put the gate inside the protected callee')
        if not job.get('timeout-minutes'):
            raise ValueError(f'{name}/{key}: timeout required')
        permissions = job.get('permissions', data.get('permissions', {}))
        effective = dict(job, permissions=permissions)
        if job.get('continue-on-error') not in (None, False):
            raise ValueError('release jobs cannot ignore failures')
        for step in job.get('steps', []):
            if step.get('uses') == './.github/actions/release-gate' and (step.get('if') is not None or step.get('continue-on-error') not in (None, False)):
                raise ValueError('release gates must run unconditionally and stop on failure')
        if writer(key, effective):
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if 'authorize' not in needs:
                raise ValueError('writer must depend on protected credential authorization')
            condition = ' '.join(job.get('if', '').split())
            allowed = {CREDENTIAL_CONDITION} | {CREDENTIAL_CONDITION + " && vars.RELEASE_" + channel + "_ENABLED == 'true'" for channel in ('GITHUB', 'CRATES', 'GHCR', 'HOMEBREW')}
            if condition not in allowed:
                raise ValueError('credential issuance must match the authorized inventory and current run attempt')
            env = job.get('environment')
            if (env.get('name') if isinstance(env, dict) else env) != 'release':
                raise ValueError(f'{name}/{key}: protected release environment required')
            steps = job.get('steps', [])
            phases = [s.get('with', {}).get('phase') for s in steps if s.get('uses') == './.github/actions/release-gate']
            if phases != ['preflight', 'boundary']:
                raise ValueError(f'{name}/{key}: live preflight and boundary gates required')
            gates = {s['with']['phase']: i for i, s in enumerate(steps) if s.get('uses') == './.github/actions/release-gate'}
            for i, step in enumerate(steps):
                uses, run = step.get('uses', ''), step.get('run', '')
                if uses.startswith(('actions/create-github-app-token@', 'rust-lang/crates-io-auth-action@')) and not gates['preflight'] < i < gates['boundary']:
                    raise ValueError('publication credentials must be acquired after preflight and before revalidation')
                if (uses.startswith('actions/attest') or 'publish.py upload' in run) and not gates['boundary'] < i:
                    raise ValueError('signing/upload must follow boundary revalidation')
        for step in job.get('steps', []):
            uses = step.get('uses', '')
            if uses and not uses.startswith('./') and not re.fullmatch(r'[^@]+@[0-9a-f]{40}', uses):
                raise ValueError(f'{name}/{key}: action must be pinned by commit')
            if name == 'release-candidate.yml' and ('cache' in uses.lower() or 'cache:' in str(step.get('with', {}))):
                raise ValueError('candidate builds must restore no Actions cache')
    if name == 'release-publish.yml':
        # Safe defaults: dispatch only; per-channel opt-in is a separate switch.
        trigger = data.get('on', data.get(True, {}))
        if set(trigger) != {'workflow_dispatch'}:
            raise ValueError('publication must be manual only')
        for job in data['jobs'].values():
            if privileged(job) and "vars.RELEASE_PUBLICATION_ENABLED == 'true'" not in job.get('if', ''):
                raise ValueError('publication switch missing')


def check_repository(root):
    directory = Path(root) / '.github/workflows'
    paths = sorted(set(directory.glob('*.yml')) | set(directory.glob('*.yaml')))
    if not {'release-candidate.yml', 'release-publish.yml', 'release-tests.yml'} <= {p.name for p in paths}:
        raise ValueError('candidate, publish and negative-test workflows required')
    for path in paths:
        data = load_workflow(path.read_text())
        authority = tap_credential(data.get('env', {})) or any(privileged(dict(job, permissions=job.get('permissions', data.get('permissions', {}))))
                        or environment_name(job) == 'release' or 'uses' in job for job in data.get('jobs', {}).values())
        # Read-only legacy qualification jobs retain their existing style.
        # Every writer/signer or reusable indirection is checked, whatever
        # the filename: a generated release.yml cannot bypass this policy.
        if path.name.startswith('release-') or authority:
            check(data, path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
```


## Task 3: Review amendment — skipped optional ancestors

Source commit: `cabc7420`, following reviewed head `05a55db6`. PR #155's Medium
finding exposed Actions skip propagation (actions/runner#2205): an optional
`crates` skip survives the successful `assemble` join and suppresses descendants
whose conditions retain implicit `success()`. The old test incorrectly required
the native job to have no condition. The same audit found `installer` and
`retain` affected. The parent reported the rest of the review clean.

### Step 1 — RED, then apply the feature blocks

Replace the incorrect assertion and add the test blocks below first. The first
run executed six tests and exited 1 (20 failing subtests and two errors for the
missing Actions fixture). A later CI-lint coverage regression executed eight
tests and exited 1 with one failure: CI omitted the native and scheduling
workflows. No implementation guard was relaxed to obtain GREEN.

The tests require cancellation and successful direct-result guards, including
native acceptance before the selected Homebrew aggregate, and the existing
storage switch before retention. They reject missing/implicit status conditions
on current and future optional descendants, including multiple ancestor hops,
and refuse status-function text hidden inside string literals. Ordinary DAGs
without optional ancestors retain their implicit status behavior.

### Step 2 — GREEN and actual scheduler regression

Apply all feature blocks. Both native acceptance and installer jobs use explicit
`!cancelled()` plus successful `assemble`. The selected Homebrew aggregate also
requires native success; retention also requires installer and tag verification
success. Channel selection, protected environment and storage opt-in persist.
The publisher, its credential boundary, frozen bytes and channel ownership do
not change.

Workflow policy walks all descendants of conditional jobs in the candidate and
scheduling qualification DAGs. This is a lint for explicit status conditions;
the exact production guard semantics are bound by tests to the live regression.

`release-scheduling.yml` uses no secrets, actions, protected environments or
release artifacts, has empty permissions and two-minute job limits. It runs on
PRs/main changes to packaging or workflows, and accepts only `github` or
`github,homebrew` for manual runs. Its real optional `crates` job skips. The
native matrix covers both channel selections; selected and unselected aggregates,
installer and retention use the production guards with only the channel/storage
inputs substituted. An unconditional final assertion requires every expected
success and skip, so a suppressed descendant fails the workflow. The exact
assertion shell was executed locally against one passing result set and all
27 single-result corruptions (skipped, failure, cancelled or unexpected success).
CI actionlint now covers every `release-*.yml` workflow.

Commands actually run, all final exits 0:

- `nix develop .#release -c python3 -B -m unittest discover -s packaging/release -p 'test_*.py'`: 171 tests.
- `nix develop .#release -c python3 -B packaging/release/workflow_policy.py`: authority graph checked.
- `nix develop .#release -c actionlint .github/workflows/release-*.yml`: five workflows.
- `nix develop .#release -c nix shell nixpkgs#shellcheck -c shellcheck packaging/release/native-archive.sh packaging/release/homebrew-proof.sh`.

### Step 3 — amendment probes, byte checks and parent handoff

Fifteen guard mutations were caught in `.superpowers/probe-scheduling-2`, with a
separately APFS-cloned target: native and installer status, aggregate status,
native/assemble results, retention status/installer result, channel selection,
policy hookup, quoted literals, transitive traversal, fixture native status,
final assertion behavior/status, and CI actionlint coverage. The restored
eight-test suite passed; all six staged source files matched the tested worktree
and restored copy exactly. No probe mutation touched this worktree.

No Rust sources or timing-dependent runtime tests changed. The parent explicitly
requested no Rust full run; the amendment budget excludes a second fresh replay.
The original full replay and workspace count above remain evidence for the
initial build. Retain both scheduling scratch copies for parent cleanup; the
first contains only copied sources after GNU `cp` refused the APFS `-c` flag.
The successful second copy uses macOS `/bin/cp -c -R`.

Parent's last CI relay for PR #155: Linux archives, readme and refusal tests
passed; all three native proof jobs were pending. No new native success or live
Actions scheduling success is claimed here. The parent owns checks,
reviewDecision, mergeStateStatus and every unresolved review thread. Request
re-review of the amendment range, focusing on skipped-ancestor behavior,
failure/cancellation rejection, qualification DAG lint and the secret-free
regression. Publication remains disabled and no merge publishes anything.

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew_workflows.py", "phase": "tests", "sha256": "878e390af15eb787f9129c9897cc6e9a5f52f9f11b48ed90322ec0c5c61f9e41", "size": 5456, "task": 3} -->
```text
import copy
from pathlib import Path
import unittest
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def workflow(name): return workflow_policy.load_workflow((ROOT/'.github/workflows'/name).read_text())


class HomebrewWorkflows(unittest.TestCase):
    def test_channel_has_an_owning_aggregate_job_and_native_acceptance(self):
        data=workflow('release-candidate.yml')
        self.assertEqual(workflow_policy.CHANNEL_JOB_IDS['homebrew'],'homebrew')
        job=data['jobs']['homebrew']
        self.assertEqual(job['name'],'homebrew')
        self.assertIn('homebrew-native',job['needs'])
        native=data['jobs']['homebrew-native']
        self.assertEqual(native['if'], "${{ !cancelled() && needs.assemble.result == 'success' }}")
        self.assertEqual({x['runner'] for x in native['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew_accept.py',str(native))
        self.assertIn('homebrew.py prepare',str(data['jobs']['assemble']))
        self.assertIn('native-archive.sh',str(data['jobs']['archive']))

    def test_pr_proof_is_secret_free_pinned_and_covers_every_advertised_platform(self):
        data=workflow('release-homebrew.yml')
        trigger=data.get('on',data.get(True))
        self.assertIn('pull_request',trigger)
        self.assertIn('packaging/**',trigger['pull_request']['paths'])
        self.assertEqual(data['permissions'],{'contents':'read'})
        self.assertNotIn('secrets.',str(data))
        job=data['jobs']['proof']
        self.assertEqual({x['runner'] for x in job['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew-proof.sh',str(job))
        workflow_policy.check(data,'release-homebrew.yml')

    def test_writer_exposes_tap_credential_only_after_signature_and_both_gates(self):
        data=workflow('release-publish.yml'); job=data['jobs']['homebrew']
        self.assertEqual(job['needs'],['github','authorize'])
        self.assertEqual(job['permissions'],{'contents':'read','actions':'read'})
        self.assertIn("vars.RELEASE_HOMEBREW_ENABLED == 'true'",job['if'])
        steps=job['steps']
        credential=[i for i,s in enumerate(steps) if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s)]
        self.assertEqual(len(credential),1)
        boundary=next(i for i,s in enumerate(steps) if s.get('with',{}).get('phase')=='boundary')
        signature=next(i for i,s in enumerate(steps) if 'verify.py --candidate' in s.get('run',''))
        self.assertLess(signature,boundary);self.assertLess(boundary,credential[0])
        self.assertNotIn('RELEASE_HOMEBREW_TOKEN',str(job.get('env',{})))
        workflow_policy.check(data,'release-publish.yml')

    def test_policy_refuses_early_credential_missing_integrity_or_switch(self):
        data=workflow('release-publish.yml')
        for kind in ('early','job-env','missing-signature','missing-byte-check','missing-switch','ignored-upload','skip-signature'):
            changed=copy.deepcopy(data);job=changed['jobs']['homebrew'];steps=job['steps']
            if kind=='early':
                step=next(s for s in steps if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s));steps.remove(step);steps.insert(0,step)
            elif kind=='job-env': job.setdefault('env',{})['HOMEBREW_TAP_TOKEN']='${{ secrets.RELEASE_HOMEBREW_TOKEN }}'
            elif kind=='missing-signature': job['steps']=[s for s in steps if 'verify.py --candidate' not in s.get('run','')]
            elif kind=='missing-byte-check': job['steps']=[s for s in steps if 'homebrew_publish.py --verify' not in s.get('run','')]
            elif kind=='missing-switch': job['if']=workflow_policy.CREDENTIAL_CONDITION
            elif kind=='ignored-upload': steps[-1]['continue-on-error']=True
            else: next(s for s in steps if 'verify.py --candidate' in s.get('run',''))['if']='false'
            with self.subTest(kind=kind),self.assertRaises(ValueError): workflow_policy.check(changed,'release-publish.yml')

    def test_registered_homebrew_name_cannot_be_stolen_or_missing_when_selected(self):
        data=workflow('release-candidate.yml');data['jobs'].pop('homebrew')
        data['jobs']['ordinary']={'name':'homebrew','timeout-minutes':5,'steps':[{'run':'false'}]}
        with self.assertRaises(ValueError): workflow_policy.check(data,'release-candidate.yml')


    def test_workflow_level_credential_aliases_refuse_before_any_job(self):
        for expression in ("${{ secrets.RELEASE_HOMEBREW_TOKEN }}", "${{ secrets.release_homebrew_token }}",
                           "${{ secrets['RELEASE_HOMEBREW_TOKEN'] }}", '${{ secrets["release_homebrew_token"] }}'):
            data=workflow('release-publish.yml');data['env']={'HOMEBREW_TAP_TOKEN':expression}
            with self.subTest(expression=expression),self.assertRaises(ValueError):workflow_policy.check(data,'release-publish.yml')


    def test_renamed_job_and_workflow_cannot_hide_an_early_tap_credential(self):
        data=workflow('release-publish.yml')
        job=data['jobs'].pop('homebrew');data['jobs']['tap-mirror']=job
        steps=job['steps'];step=next(s for s in steps if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s))
        steps.remove(step);steps.insert(0,step)
        with self.assertRaises(ValueError): workflow_policy.check(data,'generated.yml')


if __name__=='__main__': unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_optional_scheduling.py", "phase": "tests", "sha256": "92b3d24ed49fedc3c83223f32d024a0dd72702cf48064536fc4040b9f205587d", "size": 7704, "task": 3} -->
```text
"""Skipped optional ancestors must not suppress candidate acceptance descendants."""
import copy
import json
import os
from pathlib import Path
import subprocess
import shlex
import unittest

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]
NATIVE = "${{ !cancelled() && needs.assemble.result == 'success' }}"
SELECT = "contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')"
AGGREGATE = "${{ !cancelled() && needs.assemble.result == 'success' && needs.homebrew-native.result == 'success' && " + SELECT + " }}"
RETAIN = "${{ !cancelled() && needs.assemble.result == 'success' && needs.installer.result == 'success' && needs.tag-signature.result == 'success' && vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true' }}"


def workflow(name):
    return workflow_policy.load_workflow((ROOT / '.github/workflows' / name).read_text())


class OptionalScheduling(unittest.TestCase):
    def test_ci_actionlint_covers_every_release_workflow(self):
        steps = workflow('release-tests.yml')['jobs']['refusal-tests']['steps']
        command = next(step['run'] for step in steps if step.get('name') == 'Actionlint')
        words = shlex.split(command)
        patterns = words[words.index('actionlint') + 1:]
        checked = {path for pattern in patterns for path in ROOT.glob(pattern)}
        self.assertLessEqual(set((ROOT / '.github/workflows').glob('release-*.yml')), checked)

    def test_native_installer_aggregate_and_retention_have_explicit_safe_conditions(self):
        jobs = workflow('release-candidate.yml')['jobs']
        for name, expected in (('homebrew-native', NATIVE), ('installer', NATIVE),
                               ('homebrew', AGGREGATE), ('retain', RETAIN)):
            with self.subTest(job=name):
                self.assertEqual(jobs[name].get('if'), expected)

    def test_policy_refuses_missing_or_implicit_status_on_transitive_descendants(self):
        original = workflow('release-candidate.yml')
        for name in ('assemble', 'installer', 'homebrew-native', 'homebrew', 'retain'):
            for condition in (None, "needs.assemble.result == 'success'", "contains('success()', 'success')"):
                data = copy.deepcopy(original)
                if condition is None:
                    data['jobs'][name].pop('if', None)
                else:
                    data['jobs'][name]['if'] = condition
                with self.subTest(job=name, condition=condition), self.assertRaisesRegex(ValueError, 'optional.*status'):
                    workflow_policy.check(data, 'release-candidate.yml')

    def test_policy_walks_new_optional_jobs_and_multiple_ancestor_hops(self):
        data = workflow('release-candidate.yml')
        data['jobs']['future-channel'] = {'if': "inputs.channels == 'future'", 'timeout-minutes': 1,
                                         'steps': [{'run': 'true'}]}
        data['jobs']['join'] = {'needs': ['archive', 'future-channel'], 'if': 'always()',
                               'timeout-minutes': 1, 'steps': [{'run': 'true'}]}
        data['jobs']['middle'] = {'needs': 'join', 'timeout-minutes': 1, 'steps': [{'run': 'true'}]}
        data['jobs']['later'] = {'needs': 'middle', 'timeout-minutes': 1, 'steps': [{'run': 'true'}]}
        with self.assertRaisesRegex(ValueError, 'later.*optional.*status'):
            workflow_policy.check(data, 'release-candidate.yml')
        data['jobs']['middle']['if'] = "!cancelled() && needs.join.result == 'success'"
        data['jobs']['later']['if'] = "!cancelled() && needs.middle.result == 'success'"
        workflow_policy.check(data, 'release-candidate.yml')

    def test_nonoptional_ancestors_keep_implicit_success(self):
        data = {'jobs': {'build': {'timeout-minutes': 1, 'steps': [{'run': 'true'}]},
                         'test': {'needs': 'build', 'timeout-minutes': 1, 'steps': [{'run': 'true'}]}}}
        workflow_policy.check(data, 'release-candidate.yml')

    def test_secret_free_actions_regression_uses_production_guards(self):
        data = workflow('release-scheduling.yml')
        trigger = data.get('on', data.get(True))
        self.assertIn('pull_request', trigger)
        self.assertEqual(trigger['workflow_dispatch']['inputs']['channels']['options'], ['github', 'github,homebrew'])
        self.assertEqual(data['permissions'], {})
        self.assertNotIn('secrets.', str(data))
        jobs = data['jobs']
        self.assertEqual(jobs['crates']['if'], workflow('release-candidate.yml')['jobs']['crates']['if'])
        self.assertEqual(jobs['assemble']['if'], workflow('release-candidate.yml')['jobs']['assemble']['if'])
        for name in ('homebrew-native', 'installer'):
            self.assertEqual(jobs[name]['if'], NATIVE)
        self.assertEqual(jobs['homebrew-native']['strategy']['matrix']['channels'], ['github', 'github,homebrew'])
        native_steps = jobs['homebrew-native']['steps']
        self.assertNotIn('if', native_steps[0])
        self.assertEqual(native_steps[1]['if'], SELECT.replace("github.event.inputs.channels || 'github'", 'matrix.channels'))
        for name, channels in (('homebrew', 'github,homebrew'), ('homebrew-unselected', 'github')):
            self.assertEqual(jobs[name]['if'], AGGREGATE.replace("github.event.inputs.channels || 'github'", repr(channels)))
        self.assertEqual(jobs['retain']['if'], RETAIN.replace("vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true'", 'true'))
        assertion = jobs['assert-scheduling']
        self.assertEqual(assertion['if'], 'always()')
        self.assertEqual(set(assertion['needs']), set(jobs) - {'assert-scheduling'})
        run = assertion['steps'][0]['run']
        self.assertIn("'crates': 'skipped'", run)
        self.assertIn("'homebrew-unselected': 'skipped'", run)
        for name in ('assemble', 'homebrew-native', 'installer', 'homebrew', 'retain'):
            self.assertIn(repr(name) + ": 'success'", run)
        workflow_policy.check(data, 'release-scheduling.yml')

    def test_execute_exact_actions_assertion_accepts_only_expected_job_results(self):
        job = workflow('release-scheduling.yml')['jobs']['assert-scheduling']
        script = job['steps'][0]['run']
        expected = {key: {'result': 'skipped' if key in ('crates', 'homebrew-unselected') else 'success'}
                    for key in job['needs']}
        result = subprocess.run(['bash', '-eu', '-c', script], env=dict(os.environ, RESULTS=json.dumps(expected)),
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in expected:
            for status in ('skipped', 'failure', 'cancelled', 'success'):
                if status == expected[name]['result']:
                    continue
                changed = copy.deepcopy(expected)
                changed[name]['result'] = status
                result = subprocess.run(['bash', '-eu', '-c', script],
                                        env=dict(os.environ, RESULTS=json.dumps(changed)),
                                        capture_output=True, text=True, check=False)
                with self.subTest(job=name, status=status):
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('Scheduling regression:', result.stderr)

    def test_regression_workflow_is_also_subject_to_optional_dag_policy(self):
        data = workflow('release-scheduling.yml')
        data['jobs']['installer'].pop('if')
        with self.assertRaisesRegex(ValueError, 'installer.*optional.*status'):
            workflow_policy.check(data, 'release-scheduling.yml')


if __name__ == '__main__':
    unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": ".github/workflows/release-candidate.yml", "phase": "feature", "sha256": "bd16b9708fd05f1a30e2d60522a06321b16137db46e8f4bd4aedc9eccf43bcec", "size": 16788, "task": 3} -->
```text
name: release-candidate
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      tag:
        description: Annotated approved release tag; candidate creation only
        required: true
        type: string
      channels:
        description: Comma-separated channels; first alpha is github only
        default: github
        required: true
        type: string
permissions:
  contents: read
concurrency:
  group: release-candidate-${{ github.event.inputs.tag || github.ref }}-${{ github.run_id }}
  cancel-in-progress: false
jobs:
  tag-signature:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
      - name: Verify pinned maintainer signature and exact candidate SHA before storage credentials
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: nix develop .#release -c python3 packaging/release/tag_signature.py --tag "$RELEASE_TAG" --source-sha "$GITHUB_SHA"
  web-ui:
    needs: tag-signature
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Build the UI once from the pinned lock
        run: nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: release-ui
          retention-days: 90
          if-no-files-found: error
          path: web/dist/
  archive:
    needs: web-ui
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-unknown-linux-musl
            runner: ubuntu-24.04
            image: amd64
          - target: aarch64-unknown-linux-musl
            runner: ubuntu-24.04-arm
            image: arm64
          - target: aarch64-apple-darwin
            runner: macos-15
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - name: Annotated tag, exact source and workspace version
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: |
          test "$(git cat-file -t "$RELEASE_TAG")" = tag
          source_sha=$(git rev-parse "$RELEASE_TAG^{commit}")
          test "$source_sha" = "$(git rev-parse HEAD)"
          echo "RELEASE_SOURCE_SHA=$source_sha" >> "$GITHUB_ENV"
          python3 -c 'import os,tomllib; from pathlib import Path; v=tomllib.loads(Path("Cargo.toml").read_text())["workspace"]["package"]["version"]; assert os.environ["RELEASE_TAG"] == "v"+v'
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: 1.98.1
          targets: ${{ matrix.target }}
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Native build tools
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y musl-tools
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: release-ui
          path: web/dist/
      - name: Pinned dist and source and licence inputs
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web licenses list --json > frontend-licences.json'
          cargo metadata --locked --all-features --filter-platform '${{ matrix.target }}' --format-version=1 > cargo-metadata.json
          nix develop .#release -c python3 packaging/release/supply.py materials --output release-materials \
            --source-sha "$RELEASE_SOURCE_SHA" --target '${{ matrix.target }}' \
            --cargo-metadata cargo-metadata.json --frontend-licences frontend-licences.json
      - name: Current advisory databases; findings stop candidate creation
        run: |
          nix develop .#release -c cargo-audit audit --file Cargo.lock --db "$RUNNER_TEMP/release-advisories" --json > release-materials/rust-advisories.json
          git -C "$RUNNER_TEMP/release-advisories" rev-parse HEAD > release-materials/rust-advisory-revision.txt
          nix develop .#web -c pnpm --dir web audit --json > release-materials/web-advisories.json
      - name: Build fresh final archive with notices
        env:
          HENNERY_WEB_REQUIRE: '1'
        run: |
          python3 - <<'PY' >> "$GITHUB_ENV"
          import json
          i=json.load(open('release-materials/build-identity.json'))
          for key, field in [('HENNERY_BUILD_SOURCE_SHA','source_sha'),('HENNERY_BUILD_UI_SHA256','ui_sha256'),('HENNERY_BUILD_MANIFEST_SHA256','adapter_manifest_sha256')]:
              print(key+'='+i[field])
          PY
      - name: Archive and content acceptance
        env:
          HENNERY_WEB_REQUIRE: '1'
          TARGET: ${{ matrix.target }}
        run: |
          sh packaging/release/native-archive.sh
      - name: Alpine executable and collector image smoke
        if: runner.os == 'Linux'
        env:
          IMAGE_ARCH: ${{ matrix.image }}
          TARGET: ${{ matrix.target }}
        run: |
          binary="$PWD/unpacked/hennery-$TARGET/hennery"
          docker run --rm -v "$binary:/hennery:ro" alpine:3@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 /hennery --version
          mkdir -p "dist/linux-$IMAGE_ARCH"
          cp "$binary" "dist/linux-$IMAGE_ARCH/hennery"
          docker build -t hennery-collector:candidate .
          sh packaging/smoke-image.sh hennery-collector:candidate
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: candidate-${{ matrix.target }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  crates:
    # Channel -> owning job ID: workflow_policy.CHANNEL_JOB_IDS. R4 uses "ghcr".
    name: crates
    needs: web-ui
    if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',crates,')
    runs-on: ubuntu-24.04
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          fetch-depth: 0
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: release-ui
          path: web/dist/
      - name: Isolate package acceptance homes and the MSRV toolchain
        run: |
          mkdir -p "$RUNNER_TEMP/r3-home"
          for name in HOME CARGO_HOME RUSTUP_HOME XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME npm_config_userconfig npm_config_cache; do
            case "$name" in
              HOME) value="$RUNNER_TEMP/r3-home" ;;
              *) value="$RUNNER_TEMP/r3-home/$name" ;;
            esac
            echo "$name=$value" >> "$GITHUB_ENV"
          done
      - name: Prepare and qualify all seven using the already built candidate UI
        run: |
          nix develop -c rustup toolchain install 1.88.0 --profile minimal
          nix develop -c node packaging/prepare-crates.mjs "$RUNNER_TEMP/crates-prepared" "$GITHUB_SHA" "$PWD/web/dist"
          nix develop -c sh packaging/ci-crates.sh "$RUNNER_TEMP/crates-prepared"
          mkdir crates-flat
          nix develop -c node packaging/prepare-crates.mjs --stage "$RUNNER_TEMP/crates-prepared" crates-flat
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: release-crates
          retention-days: 90
          if-no-files-found: error
          path: crates-flat/
  assemble:
    needs: [archive, crates]
    if: always() && needs.archive.result == 'success' && (needs.crates.result == 'success' || needs.crates.result == 'skipped')
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: candidate-*
          path: candidates
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        if: needs.crates.result == 'success'
        with:
          name: release-crates
          path: crates-flat
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Assemble global inputs; never silently merge conflicting materials
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
          RELEASE_CHANNELS: ${{ github.event.inputs.channels || 'github' }}
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          python3 packaging/release/assemble.py candidates target/distrib
          if test -d crates-flat; then
            nix develop -c node packaging/prepare-crates.mjs --stage crates-flat target/distrib
          fi
          "$RUNNER_TEMP/dist-bin/dist" build --artifacts=global --output-format=json > target/distrib/dist-manifest.json
          python3 packaging/harden-installer.py target/distrib/hennery-installer.sh
          sh packaging/test-installer.sh target/distrib
          sh packaging/check-formula.sh target/distrib
          nix develop .#release -c python3 packaging/release/homebrew.py prepare target/distrib --tag "$RELEASE_TAG" --targets aarch64-apple-darwin,aarch64-unknown-linux-musl,x86_64-unknown-linux-musl
          git show HEAD:CHANGELOG.md > target/distrib/release-notes.md
          git archive --format=tar --prefix=hennery-source/ HEAD | xz > target/distrib/hennery-source.tar.xz
          python3 packaging/release/supply.py freeze --output target/distrib \
            --source-sha "$(git rev-parse HEAD)" --tag "$RELEASE_TAG" --channels "$RELEASE_CHANNELS" \
            --run-id "$GITHUB_RUN_ID" --run-attempt "$GITHUB_RUN_ATTEMPT" > inventory-sha256.txt
          cat inventory-sha256.txt >> "$GITHUB_STEP_SUMMARY"
          echo 'Candidate still needs Object Lock retention and channel acceptance before approval.' >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  installer:
    needs: assemble
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    strategy:
      fail-fast: false
      matrix:
        runner: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Native installer positives and refusals
        run: sh packaging/test-installer.sh candidate
  homebrew-native:
    needs: assemble
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - runner: macos-15
          - runner: ubuntu-24.04
          - runner: ubuntu-24.04-arm
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 30
    steps:
      - name: Preserve successful native no-ops for unselected Homebrew
        run: echo 'Native acceptance executes only for a selected Homebrew channel'
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Real isolated tap install, smoke, upgrade and uninstall of frozen bytes
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        run: nix develop .#release -c python3 packaging/release/homebrew_accept.py candidate "$RUNNER_TEMP/homebrew-proof"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,')
        with:
          name: homebrew-proof-${{ matrix.runner }}
          if-no-files-found: error
          path: ${{ runner.temp }}/homebrew-proof/result.json
  homebrew:
    name: homebrew
    needs: [assemble, homebrew-native]
    if: ${{ !cancelled() && needs.assemble.result == 'success' && needs.homebrew-native.result == 'success' && contains(format(',{0},', github.event.inputs.channels || 'github'), ',homebrew,') }}
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - name: All advertised native Homebrew platforms passed
        run: echo 'Native local-tap acceptance passed on all three platforms'
  retain:
    needs: [assemble, installer, tag-signature]
    if: ${{ !cancelled() && needs.assemble.result == 'success' && needs.installer.result == 'success' && needs.tag-signature.result == 'success' && vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true' }}
    environment: release-staging
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Retain exact versions under compliance retention and legal hold
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          inventory=$(sha256sum candidate/release-inventory.json | cut -d' ' -f1)
          nix develop .#release -c python3 packaging/release/retention.py stage \
            --candidate candidate --bucket "$RELEASE_BUCKET" --inventory-sha256 "$inventory" --receipt retention-receipt.json
          echo "Held candidate inventory: $inventory" >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: retention-receipt-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: retention-receipt.json
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": ".github/workflows/release-scheduling.yml", "phase": "feature", "sha256": "b770ca78c0bc400f0353db8524f4b03206b9492b1c2bfb58a391c2b65d92d073", "size": 3992, "task": 3} -->
```text
name: release-scheduling
on:
  pull_request:
    paths:
      - '.github/workflows/**'
      - 'packaging/**'
  push:
    branches: [main]
    paths:
      - '.github/workflows/**'
      - 'packaging/**'
  workflow_dispatch:
    inputs:
      channels:
        description: Both selections omit the optional crates channel
        type: choice
        options: [github, 'github,homebrew']
        default: github
permissions: {}
jobs:
  # Exercise the real Actions skipped-ancestor scheduler (actions/runner#2205).
  # Tests bind these guards to release-candidate.yml; no release artifacts,
  # protected environments, actions, credentials or publication are involved.
  crates:
    if: contains(format(',{0},', github.event.inputs.channels || 'github'), ',crates,')
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: exit 1
  archive:
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: 'true'
  tag-signature:
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: 'true'
  assemble:
    needs: [archive, crates]
    if: always() && needs.archive.result == 'success' && (needs.crates.result == 'success' || needs.crates.result == 'skipped')
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: 'true'
  installer:
    needs: assemble
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: 'true'
  homebrew-native:
    needs: assemble
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    strategy:
      fail-fast: false
      matrix:
        channels: [github, 'github,homebrew']
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - name: Both channel selections must reach the native job
        run: echo 'Explicit status permits the skipped optional ancestor'
      - name: Selected acceptance stand-in
        if: contains(format(',{0},', matrix.channels), ',homebrew,')
        run: echo 'Selected Homebrew acceptance reached'
  homebrew:
    needs: [assemble, homebrew-native]
    if: ${{ !cancelled() && needs.assemble.result == 'success' && needs.homebrew-native.result == 'success' && contains(format(',{0},', 'github,homebrew'), ',homebrew,') }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: 'true'
  homebrew-unselected:
    needs: [assemble, homebrew-native]
    if: ${{ !cancelled() && needs.assemble.result == 'success' && needs.homebrew-native.result == 'success' && contains(format(',{0},', 'github'), ',homebrew,') }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: exit 1
  retain:
    needs: [assemble, installer, tag-signature]
    if: ${{ !cancelled() && needs.assemble.result == 'success' && needs.installer.result == 'success' && needs.tag-signature.result == 'success' && true }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: 'true'
  assert-scheduling:
    needs: [crates, archive, tag-signature, assemble, installer, homebrew-native, homebrew, homebrew-unselected, retain]
    if: always()
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - name: Fail if any expected acceptance or no-op was skipped
        env:
          RESULTS: ${{ toJSON(needs) }}
        run: |
          python3 - <<'PY'
          import json
          import os
          expected = {
              'crates': 'skipped', 'archive': 'success', 'tag-signature': 'success',
              'assemble': 'success', 'installer': 'success', 'homebrew-native': 'success',
              'homebrew': 'success', 'homebrew-unselected': 'skipped', 'retain': 'success',
          }
          actual = {key: value['result'] for key, value in json.loads(os.environ['RESULTS']).items()}
          if actual != expected:
              raise SystemExit(f'Scheduling regression: expected {expected}, got {actual}')
          print('Skipped optional crates: github and github,homebrew descendants passed')
          PY
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": ".github/workflows/release-tests.yml", "phase": "feature", "sha256": "8c4f27cb9774a5a2b6bc52b366b4dda66ec51f26a9510f7971359cc68601559d", "size": 1873, "task": 3} -->
```text
name: release-tests
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  refusal-tests:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Negative gates, recovery, supply chain and workflow graph
        run: nix develop .#release -c python3 -m unittest discover -s packaging/release -p 'test_*.py'
      - name: Execute the exact README bootstrap against signed offline releases
        run: |
          sh packaging/readme-blocks.sh README.md release-bootstrap > "$RUNNER_TEMP/release-bootstrap.sh"
          nix develop .#release -c python3 packaging/release/test_bootstrap.py --script "$RUNNER_TEMP/release-bootstrap.sh"
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: 1.98.1
      - name: cargo-dist's actual installer with tiny shell executables
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          "$RUNNER_TEMP/dist-bin/dist" build --artifacts=global
          python3 packaging/release/make_installer_fixture.py target/distrib/hennery-installer.sh "$RUNNER_TEMP/installer-fixture"
          python3 packaging/harden-installer.py "$RUNNER_TEMP/installer-fixture/hennery-installer.sh"
          sh packaging/test-installer.sh "$RUNNER_TEMP/installer-fixture"
      - name: Actionlint
        run: nix develop .#release -c actionlint .github/workflows/release-*.yml
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/workflow_policy.py", "phase": "feature", "sha256": "63e6a129d712fc1b27ec1f4a4e0545b8df932403080a1b334e4af3f9e6f85f4e", "size": 13484, "task": 3} -->
```text
#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys



CREDENTIAL_CONDITION = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256"
# Channel -> owning YAML job ID. The literal API display name is the channel.
# R4's name is reserved now; selection refuses until its owning job exists.
CHANNEL_JOB_IDS = {'crates': 'crates', 'ghcr': 'ghcr', 'homebrew': 'homebrew'}


def load_workflow(raw):
    # Most release helpers use only the stdlib parts of gate/workflow_policy.
    # The signed-workflow binding always needs the pinned parser and refuses
    # explicitly when it is unavailable; there is no permissive fallback.
    try:
        import yaml
    except ImportError as error:
        raise ValueError('workflow parser unavailable; run inside nix develop .#release') from error

    class UniqueSafeLoader(yaml.SafeLoader):
        def construct_mapping(self, node, deep=False):
            self.flatten_mapping(node)
            seen = set()
            for key_node, _ in node.value:
                key = self.construct_object(key_node, deep=deep)
                if key in seen:
                    raise ValueError('duplicate workflow YAML key')
                seen.add(key)
            return super().construct_mapping(node, deep=deep)

    try:
        data = yaml.load(raw, Loader=UniqueSafeLoader)
    except yaml.YAMLError as error:
        raise ValueError('invalid workflow YAML') from error
    if not isinstance(data, dict):
        raise ValueError('workflow mapping required')
    return data


def candidate_channel_jobs(data):
    """Bind job API names to owning IDs in the exact candidate workflow."""
    jobs = data.get('jobs')
    if not isinstance(jobs, dict) or not jobs:
        raise ValueError('candidate job identity: jobs mapping required')
    seen = set()
    for job_id, job in jobs.items():
        if not isinstance(job_id, str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]*', job_id) or not isinstance(job, dict):
            raise ValueError('candidate job identity: invalid job ID or definition')
        display = job.get('name', job_id)
        if not isinstance(display, str) or not display or '${{' in display:
            raise ValueError('candidate job identity: names must be literal strings')
        if display in seen:
            raise ValueError('candidate job identity: display name collision')
        seen.add(display)
        if display in CHANNEL_JOB_IDS and CHANNEL_JOB_IDS[display] != job_id:
            raise ValueError('candidate job identity: reserved name belongs to another job ID')
        for channel, owner in CHANNEL_JOB_IDS.items():
            if job_id == owner and (display != channel or 'strategy' in job):
                raise ValueError('candidate job identity: channel owner requires its literal name and no matrix')
    return {channel: owner for channel, owner in CHANNEL_JOB_IDS.items() if owner in jobs}


def tap_credential(value):
    return bool(re.search(r"secrets\s*(?:\.\s*release_homebrew_token|\[\s*['\"]release_homebrew_token['\"]\s*\])", str(value), re.I))


def optional_job_status(data, name):
    """Actions propagates skips through ancestors unless an explicit status is used.

    Qualification DAGs may join an optional channel, then continue through
    several unconditional jobs. Check every descendant, not only direct needs.
    This lint does not prove the guard's result semantics; production guards
    are also bound to the secret-free Actions scheduling regression.
    """
    jobs = data.get('jobs', {})
    optional = {key for key, job in jobs.items() if 'if' in job}
    descendants = set()
    frontier = set(optional)
    while frontier:
        following = set()
        for key, job in jobs.items():
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if key not in descendants and frontier.intersection(needs):
                following.add(key)
        descendants.update(following)
        frontier = following
    for key in sorted(descendants):
        # A status-looking string literal is not an Actions status function.
        condition = re.sub(r"'(?:[^']|'')*'|\"(?:[^\"\\]|\\.)*\"", '', str(jobs[key].get('if', '')))
        if not re.search(r'(?<![\w.])(?:always|cancelled|failure|success)\s*\(', condition):
            raise ValueError(f'{name}/{key}: optional job ancestor requires an explicit status condition')


def privileged(job):
    return tap_credential(job) or any(job.get('permissions', {}).get(scope) == 'write' for scope in ('contents', 'packages', 'attestations', 'id-token')) or any(
        s.get('uses', '').startswith(('actions/create-github-app-token@', 'rust-lang/crates-io-auth-action@')) or 'publish.py upload' in s.get('run', '')
        for s in job.get('steps', []))


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def writer(name, job):
    # Protected-environment secrets can be publication credentials even when
    # the ordinary job token is read-only (for example crates.io bootstrap).
    return privileged(job) or (environment_name(job) == 'release' and name != 'authorize')


def homebrew_writer(job):
    """A tap secret is exposed only to the final, gated, exact-byte writer."""
    if job.get('if') != CREDENTIAL_CONDITION + " && vars.RELEASE_HOMEBREW_ENABLED == 'true'":
        raise ValueError('Homebrew needs its separate publication switch')
    if job.get('needs') != ['github', 'authorize'] or job.get('permissions') != {'contents': 'read', 'actions': 'read'}:
        raise ValueError('Homebrew must follow GitHub with a read-only ordinary token')
    if tap_credential(job.get('env', {})):
        raise ValueError('tap credential must not be job-scoped')
    steps = job.get('steps', [])
    def one(predicate):
        positions = [i for i, step in enumerate(steps) if predicate(step)]
        if len(positions) != 1:
            raise ValueError('Homebrew requires one signature, byte check, boundary and credential step')
        step = steps[positions[0]]
        if step.get('if') is not None or step.get('continue-on-error') not in (None, False):
            raise ValueError('Homebrew integrity and write steps must be unconditional and fatal')
        return positions[0]
    preflight = one(lambda s: s.get('with', {}).get('phase') == 'preflight')
    signature = one(lambda s: 'verify.py --candidate' in s.get('run', ''))
    integrity = one(lambda s: 'homebrew_publish.py --verify' in s.get('run', ''))
    boundary = one(lambda s: s.get('with', {}).get('phase') == 'boundary')
    credential = one(tap_credential)
    if not preflight < signature < integrity < boundary < credential or credential != len(steps) - 1:
        raise ValueError('Homebrew signature and fresh gates must precede the tap credential')
    if 'homebrew_publish.py candidate' not in steps[credential].get('run', ''):
        raise ValueError('tap credential may only reach the frozen formula writer')


def check(data, name):
    if tap_credential(data.get('env', {})):
        raise ValueError('tap credential must not be workflow-scoped')
    if name == 'release-candidate.yml':
        candidate_channel_jobs(data)
    if name in ('release-candidate.yml', 'release-scheduling.yml'):
        optional_job_status(data, name)
    jobs = data.get('jobs', {})
    writers = [j for key, j in jobs.items() if writer(key, dict(j, permissions=j.get('permissions', data.get('permissions', {}))))]
    if writers:
        authorization = jobs.get('authorize', {})
        effective = dict(authorization, permissions=authorization.get('permissions', data.get('permissions', {})))
        if not authorization or privileged(effective) or authorization.get('environment') != 'release':
            raise ValueError('a protected read-only authorization job must precede credential issuance')
        proof = [s.get('with', {}).get('phase') for s in authorization.get('steps', []) if s.get('uses') == './.github/actions/release-gate']
        if proof != ['preflight']:
            raise ValueError('credential authorization must run the live preflight gate')
    for key, job in jobs.items():
        if tap_credential(job) or (name == 'release-publish.yml' and key == 'homebrew'):
            homebrew_writer(job)
        if 'uses' in job:
            raise ValueError(f'{name}/{key}: reusable jobs need explicit authority review; put the gate inside the protected callee')
        if not job.get('timeout-minutes'):
            raise ValueError(f'{name}/{key}: timeout required')
        permissions = job.get('permissions', data.get('permissions', {}))
        effective = dict(job, permissions=permissions)
        if job.get('continue-on-error') not in (None, False):
            raise ValueError('release jobs cannot ignore failures')
        for step in job.get('steps', []):
            if step.get('uses') == './.github/actions/release-gate' and (step.get('if') is not None or step.get('continue-on-error') not in (None, False)):
                raise ValueError('release gates must run unconditionally and stop on failure')
        if writer(key, effective):
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if 'authorize' not in needs:
                raise ValueError('writer must depend on protected credential authorization')
            condition = ' '.join(job.get('if', '').split())
            allowed = {CREDENTIAL_CONDITION} | {CREDENTIAL_CONDITION + " && vars.RELEASE_" + channel + "_ENABLED == 'true'" for channel in ('GITHUB', 'CRATES', 'GHCR', 'HOMEBREW')}
            if condition not in allowed:
                raise ValueError('credential issuance must match the authorized inventory and current run attempt')
            env = job.get('environment')
            if (env.get('name') if isinstance(env, dict) else env) != 'release':
                raise ValueError(f'{name}/{key}: protected release environment required')
            steps = job.get('steps', [])
            phases = [s.get('with', {}).get('phase') for s in steps if s.get('uses') == './.github/actions/release-gate']
            if phases != ['preflight', 'boundary']:
                raise ValueError(f'{name}/{key}: live preflight and boundary gates required')
            gates = {s['with']['phase']: i for i, s in enumerate(steps) if s.get('uses') == './.github/actions/release-gate'}
            for i, step in enumerate(steps):
                uses, run = step.get('uses', ''), step.get('run', '')
                if uses.startswith(('actions/create-github-app-token@', 'rust-lang/crates-io-auth-action@')) and not gates['preflight'] < i < gates['boundary']:
                    raise ValueError('publication credentials must be acquired after preflight and before revalidation')
                if (uses.startswith('actions/attest') or 'publish.py upload' in run) and not gates['boundary'] < i:
                    raise ValueError('signing/upload must follow boundary revalidation')
        for step in job.get('steps', []):
            uses = step.get('uses', '')
            if uses and not uses.startswith('./') and not re.fullmatch(r'[^@]+@[0-9a-f]{40}', uses):
                raise ValueError(f'{name}/{key}: action must be pinned by commit')
            if name == 'release-candidate.yml' and ('cache' in uses.lower() or 'cache:' in str(step.get('with', {}))):
                raise ValueError('candidate builds must restore no Actions cache')
    if name == 'release-publish.yml':
        # Safe defaults: dispatch only; per-channel opt-in is a separate switch.
        trigger = data.get('on', data.get(True, {}))
        if set(trigger) != {'workflow_dispatch'}:
            raise ValueError('publication must be manual only')
        for job in data['jobs'].values():
            if privileged(job) and "vars.RELEASE_PUBLICATION_ENABLED == 'true'" not in job.get('if', ''):
                raise ValueError('publication switch missing')


def check_repository(root):
    directory = Path(root) / '.github/workflows'
    paths = sorted(set(directory.glob('*.yml')) | set(directory.glob('*.yaml')))
    if not {'release-candidate.yml', 'release-publish.yml', 'release-tests.yml'} <= {p.name for p in paths}:
        raise ValueError('candidate, publish and negative-test workflows required')
    for path in paths:
        data = load_workflow(path.read_text())
        authority = tap_credential(data.get('env', {})) or any(privileged(dict(job, permissions=job.get('permissions', data.get('permissions', {}))))
                        or environment_name(job) == 'release' or 'uses' in job for job in data.get('jobs', {}).values())
        # Read-only legacy qualification jobs retain their existing style.
        # Every writer/signer or reusable indirection is checked, whatever
        # the filename: a generated release.yml cannot bypass this policy.
        if path.name.startswith('release-') or authority:
            check(data, path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
```


## Task 4: Native CI amendment — CLI identity and candidate Cellar version

Source commit: `12b11772`; parent-rebased starting head `d04c32fe` on main
`6cb867c6`. The parent reported the scheduling re-review APPROVE with identical
range-diff after the rebase. Initial native CI logs are retained under
`.superpowers/sdd/dist-homebrew/ci-proof-*.log`: all three platforms completed
a real isolated Homebrew install of the labelled `0.0.0` upgrade fixture, then
stopped at the same smoke assertion.

### Step 1 — establish both causes and see tests RED

The binary legitimately reports four lines: version, source commit, UI hash and
adapter manifest hash. Comparing its entire stdout against one version line
incorrectly refused the installed binary. `smoke()` now requires an exact first
line and exactly one `source:` line matching the frozen inventory's source SHA.
It still requires byte-for-byte executable equality before invoking the binary.
Missing, mismatched and duplicate source lines refuse, as do empty, prefixed,
whitespace-padded and incorrect version lines.

The workspace version is `0.1.0-alpha.1`, and the proof script derives its tag
from that workspace. `homebrew.check()` already requires the generated formula
version to equal that tag before freezing; no cargo-dist version-source bug was
found. The harness itself changed the local formula to `0.0.0` before its first
install. That was the intentionally labelled lower fixture, but it meant the
proof had never performed a normal candidate-version install. Changing the
frozen formula to hide this distinction would weaken its integrity contract.

Apply the test block first. The corrected RED run of seven tests exited 1
(`native-smoke-red-2.log`); the full sequence reproduced the original multiline
refusal. New required source and Cellar checks were absent. The first test run
also exposed a `/tmp` versus `/private/tmp` mismatch in the offline fixture;
the fixture now canonicalizes its scratch root, matching the real harness.

### Step 2 — candidate install, separate old fixture, candidate upgrade

Apply the remaining blocks. The local-tap sequence is now:

1. Commit the candidate formula with only archive origins changed to file URLs.
   Install its actual version, require the linked executable to be the regular
   file at `Cellar/hennery/<candidate version>/bin/hennery`, and check bytes,
   exact version line and source commit.
2. Uninstall it and require no package files or dangling links before seeding
   the separate, explicitly labelled `0.0.0` fixture with the same archive.
   Require that fixture's own Cellar version and the candidate payload identity.
3. Restore the candidate local formula, upgrade, run the existing formula tests,
   and require the exact candidate Cellar path and payload identity again.
4. Uninstall all package kegs and links; preserve data/service sentinels and
   recheck every original frozen candidate byte. The result records candidate
   install version, separate old fixture version, upgrade version and source SHA.

Wrong initial or upgraded Cellar versions refuse even when the executable bytes
and CLI identity are correct. A same-version executable outside the scratch
Cellar also refuses. Tests use a tiny four-line executable and an offline
orchestration fixture; they do not pretend to execute Homebrew. Actual runner
Homebrew remains the native proof of record. The guide's three shell recipes
are unchanged and remain the commands executed by native acceptance. Its prose
now explains the separate candidate install and lower fixture.

Commands actually run, final exits 0:

- `nix develop .#release -c python3 -B -m unittest discover -s packaging/release -p test_homebrew_accept.py`: seven tests.
- `nix develop .#release -c python3 -B -m unittest discover -s packaging/release -p 'test_*.py'`: 175 tests.
- `nix develop .#release -c python3 -B packaging/release/workflow_policy.py`: authority graph checked.
- `nix develop .#release -c actionlint .github/workflows/release-*.yml`: all five workflows.

### Step 3 — cloned-copy guard probes and review handoff

Thirteen mutations were caught in `.superpowers/probe-native-fix-1`, using a
separate APFS clone of target: the old whole-output comparison, version-prefix
and whitespace weakening, absent/duplicate source binding, wrong inventory
source, absent Cellar check, wrong linked keg, outside-Cellar same-version path,
old fixture as initial install, missing initial/upgraded keg checks and a
fixture that lost its separate lower version. The restored seven-test suite
passed and all three source files matched the tested worktree and index.
The ledger retains the test output, probe output and tested source hashes.

All 35 embedded block hashes are checked; the three task-4 snapshots match the
source commit's bytes and modes. The old snapshots preserve the original build:
`docs/README.md` already differs after the parent's rebase and is unchanged by
this amendment. The record does not claim a fresh replay of the rebased tree.

No Rust, timing-sensitive runtime logic, workflow authority, credential order,
channel registry or frozen candidate generation changed. No new full replay,
Rust suite or load run was performed under the amendment verification budget.
The parent's local CLT ruling remains binding; no local Homebrew retry or
operator package manager change was attempted. Retain the new scratch copy for
parent cleanup along with the earlier retained copies.

Request review of this amendment and the next native CI result on all three
platforms. The prior failures demonstrate real old-fixture installs, not a
completed install/upgrade/uninstall proof. Native acceptance is not green until
the complete corrected sequence passes. No release or tap publication occurred.

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/test_homebrew_accept.py", "phase": "tests", "sha256": "0db1f0f3d1ec6d8bf813d07b35ba4014faace77fa40024166d4cab74df14b823", "size": 9379, "task": 4} -->
```text
"""Smoke refusals execute tiny local fixtures under an isolated home."""
import os
import io
import re
import subprocess
import tarfile
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import homebrew_accept
import homebrew

SOURCE = 'a' * 40
VERSION_OUTPUT = 'hennery 0.1.0-alpha.1\nsource: ' + SOURCE + '\nUI SHA-256: ' + 'b' * 64 + '\nadapter manifest SHA-256: ' + 'c' * 64 + '\n'


class Smoke(unittest.TestCase):
    def test_exact_installed_bytes_and_version_are_both_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); binary=root/'hennery'
            raw=('#!/bin/sh\nprintf "%s" "' + VERSION_OUTPUT + '"\n').encode()
            binary.write_bytes(raw);binary.chmod(0o755)
            env={'HOME':str(root),'PATH':'/usr/bin:/bin'}
            homebrew_accept.smoke(binary,raw,'v0.1.0-alpha.1',SOURCE,env,root)
            for expected,tag in ((b'changed','v0.1.0-alpha.1'),(raw,'v9.0.0')):
                with self.subTest(expected=expected,tag=tag),self.assertRaises(gate.Refused):
                    homebrew_accept.smoke(binary,expected,tag,SOURCE,env,root)

    def test_first_line_is_exact_and_source_is_required_unique_and_matches_inventory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);binary=root/'hennery';env={'HOME':str(root),'PATH':'/usr/bin:/bin'}
            for output in ('', '\n' + VERSION_OUTPUT, ' ' + VERSION_OUTPUT,
                           VERSION_OUTPUT.replace('alpha.1', 'alpha.10', 1),
                           VERSION_OUTPUT.replace('source: ' + SOURCE + '\n', ''),
                           VERSION_OUTPUT.replace(SOURCE, 'd' * 40),
                           VERSION_OUTPUT + 'source: ' + SOURCE + '\n',
                           VERSION_OUTPUT + 'source: ' + 'd' * 40 + '\n'):
                raw=('#!/bin/sh\nprintf "%s" "' + output + '"\n').encode()
                binary.write_bytes(raw);binary.chmod(0o755)
                with self.subTest(output=output),self.assertRaises(gate.Refused):
                    homebrew_accept.smoke(binary,raw,'v0.1.0-alpha.1',SOURCE,env,root)

    def test_keg_must_be_the_exact_version_inside_the_scratch_cellar(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);prefix=root/'prefix';(prefix/'bin').mkdir(parents=True)
            installed=prefix/'bin/hennery'
            paths=[prefix/'Cellar/hennery/0.1.0-alpha.1/bin/hennery',
                   prefix/'Cellar/hennery/0.0.0/bin/hennery',root/'outside/0.1.0-alpha.1/bin/hennery']
            for path in paths:
                path.parent.mkdir(parents=True);path.write_bytes(b'candidate')
                installed.symlink_to(path)
                if path==paths[0]: homebrew_accept.check_keg(installed,prefix,'0.1.0-alpha.1')
                else:
                    with self.subTest(path=path),self.assertRaises(gate.Refused):
                        homebrew_accept.check_keg(installed,prefix,'0.1.0-alpha.1')
                installed.unlink()
            paths[0].unlink();paths[0].symlink_to(paths[2]);installed.symlink_to(paths[0])
            with self.assertRaises(gate.Refused): homebrew_accept.check_keg(installed,prefix,'0.1.0-alpha.1')

    def test_documented_tap_recipes_are_the_executed_three_operations(self):
        recipes=homebrew_accept.recipes()
        self.assertEqual(set(recipes),{'install','upgrade','uninstall'})
        self.assertIn('brew install --formula marcinwadon/tap/hennery',recipes['install'])
        self.assertIn('hennery --version',recipes['install'])
        self.assertIn('brew upgrade --formula marcinwadon/tap/hennery',recipes['upgrade'])
        self.assertIn('brew test marcinwadon/tap/hennery',recipes['upgrade'])
        self.assertIn('brew uninstall --force marcinwadon/tap/hennery',recipes['uninstall'])


    def test_local_tap_formula_has_a_real_commit_and_personal_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);tap=root/'tap';(tap/'Formula').mkdir(parents=True)
            env={'HOME':str(root),'PATH':os.environ['PATH']}
            subprocess.run(['git','-C',str(tap),'init','-q','--initial-branch=main'],env=env,check=True)
            for text in ('old fixture\n','candidate formula\n'):
                homebrew_accept.commit_formula(tap,text,env,root,'test(formula): local fixture')
                raw=subprocess.check_output(['git','-C',str(tap),'show','HEAD:Formula/hennery.rb'],env=env)
                self.assertEqual(raw,text.encode())
                author=subprocess.check_output(['git','-C',str(tap),'show','-s','--format=%ae','HEAD'],env=env,text=True).strip()
                self.assertEqual(author,'marcin.wadon@gmail.com')
                self.assertEqual(subprocess.check_output(['git','-C',str(tap),'status','--porcelain'],env=env),b'')


class ProofSequence(unittest.TestCase):
    def execute(self, root, bad_keg_at=None):
        # Offline orchestration fixture; the real Homebrew transaction remains CI's job.
        root=root.resolve()
        source=root/'source';source.mkdir();candidate=root/'candidate';work=root/'work'
        target='x86_64-unknown-linux-musl';tag='v0.1.0-alpha.1'
        payload=('#!/bin/sh\nprintf "%s" "' + VERSION_OUTPUT + '"\n').encode()
        archive=source/('hennery-'+target+'.tar.xz')
        with tarfile.open(archive,'w:xz') as output:
            entry=tarfile.TarInfo('hennery-'+target+'/hennery');entry.size=len(payload);entry.mode=0o755
            output.addfile(entry,io.BytesIO(payload))
        formula=('class Hennery < Formula\n  version "0.1.0-alpha.1"\n'
                 f'  url "https://github.com/{gate.REPOSITORY}/releases/download/{tag}/{archive.name}"\n'
                 f'  sha256 "{gate.digest(archive.read_bytes())}"\n  def install\n    bin.install "hennery"\n  end\nend\n')
        (source/'hennery.rb').write_text(formula)
        homebrew.prepare(source,tag,[target]);homebrew.freeze_proof(source,candidate,tag,[target],SOURCE)
        frozen=(candidate/'hennery.rb').read_bytes();prefix=work/'prefix';installed=prefix/'bin/hennery'
        tap=prefix/'Library/Taps/marcinwadon/homebrew-tap/Formula/hennery.rb'
        events=[]
        def command(args,**kwargs):
            args=list(args);stdout=''
            if args[:2]==['git','clone']:
                (prefix/'bin').mkdir(parents=True);(prefix/'bin/brew').touch()
            elif args[-2:]==['rev-parse','HEAD']: stdout=homebrew_accept.BREW_COMMIT+'\n'
            elif args[0]==str(prefix/'bin/brew'): stdout=str(prefix)+'\n'
            elif args[:3]==['sh','-eu','-c']:
                operation=args[3];version=re.search(r'version "([^"]+)"',tap.read_text())[1]
                events.append((operation,version))
                if operation=='uninstall':
                    installed.unlink()
                    for binary in (prefix/'Cellar/hennery').glob('*/bin/hennery'):
                        binary.unlink();binary.parent.rmdir();binary.parent.parent.rmdir()
                    (prefix/'Cellar/hennery').rmdir()
                else:
                    actual='0.0.0' if operation==bad_keg_at else version
                    binary=prefix/'Cellar/hennery'/actual/'bin/hennery'
                    binary.parent.mkdir(parents=True,exist_ok=True);binary.write_bytes(payload)
                    if installed.is_symlink(): installed.unlink()
                    installed.symlink_to(binary)
            elif args==[str(installed),'--version']: stdout=VERSION_OUTPUT
            elif args[0]!='git': raise AssertionError(args)
            return subprocess.CompletedProcess(args,0,stdout=stdout)
        scripts={operation:operation for operation in ('install','upgrade','uninstall')}
        with patch.object(homebrew_accept.platform,'system',return_value='Linux'), \
             patch.object(homebrew_accept.platform,'machine',return_value='x86_64'), \
             patch.object(homebrew_accept,'recipes',return_value=scripts), \
             patch.object(homebrew_accept.subprocess,'run',side_effect=command):
            homebrew_accept.run(candidate,work)
        self.assertEqual((candidate/'hennery.rb').read_bytes(),frozen)
        return events,gate.strict_json((work/'result.json').read_bytes())

    def test_candidate_install_then_distinct_lower_fixture_then_candidate_upgrade(self):
        with tempfile.TemporaryDirectory() as tmp:
            events,report=self.execute(Path(tmp))
            self.assertEqual(events,[('install','0.1.0-alpha.1'),('uninstall','0.1.0-alpha.1'),
                                     ('install','0.0.0'),('upgrade','0.1.0-alpha.1'),('uninstall','0.1.0-alpha.1')])
            self.assertEqual(report['install'],'0.1.0-alpha.1')
            self.assertEqual(report['old_fixture'],'0.0.0')
            self.assertEqual(report['upgrade'],'0.1.0-alpha.1')
            self.assertEqual(report['source_sha'],SOURCE)
            self.assertTrue(report['uninstall'])

    def test_wrong_candidate_cellar_version_refuses_at_install_and_upgrade(self):
        for operation in ('install','upgrade'):
            with self.subTest(operation=operation),tempfile.TemporaryDirectory() as tmp, \
                 self.assertRaisesRegex(gate.Refused,'keg'):
                self.execute(Path(tmp),bad_keg_at=operation)


if __name__=='__main__': unittest.main()
```

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "packaging/release/homebrew_accept.py", "phase": "feature", "sha256": "8e2874e1b61f1facdcebd6f6d1b962cc07aacea9be3648fcae39896501705db6", "size": 9104, "task": 4} -->
```text
#!/usr/bin/env python3
"""Real local-tap install/upgrade/remove in a fresh, pinned Homebrew prefix.

Only the URL origins are rewritten to local files, after original formula and
candidate digests are checked. Install and verify the actual candidate first.
Then seed a separate old formula using the same candidate binary with version
0.0.0: this proves Homebrew's upgrade transaction, not N-1 data migration.
No services, agents or registry credentials are used.
"""
import argparse
import json
import os
from pathlib import Path
import platform
import subprocess

import gate
import homebrew

BREW_COMMIT = '00001bedf8eac442bdabd327148be0b97998b27b'  # Homebrew 4.6.18
ROOT = Path(__file__).resolve().parents[2]


def recipes():
    result = {}
    for operation in ('install', 'upgrade', 'uninstall'):
        result[operation] = subprocess.check_output(
            ['sh', str(ROOT / 'packaging/readme-blocks.sh'), str(ROOT / 'docs/homebrew.md'), 'homebrew-' + operation], text=True)
    return result


def smoke(binary, expected, tag, source_sha, env, work):
    gate.require(Path(binary).read_bytes() == expected, 'Homebrew changed executable bytes')
    result = subprocess.run([str(binary), '--version'], env=env, cwd=work, check=True, capture_output=True, text=True)
    lines = result.stdout.splitlines()
    gate.require(lines[:1] == ['hennery ' + tag.removeprefix('v')], 'installed Homebrew executable has wrong version')
    gate.require([line for line in lines if line.startswith('source:')] == ['source: ' + source_sha],
                 'installed Homebrew executable has wrong or ambiguous source')
    print(result.stdout, end='')


def check_keg(binary, prefix, version):
    expected = Path(prefix).resolve() / 'Cellar/hennery' / version / 'bin/hennery'
    gate.require(expected.is_file() and not expected.is_symlink() and Path(binary).resolve() == expected,
                 'Homebrew link does not select the expected versioned keg')


def check_removed(prefix):
    installed = Path(prefix) / 'bin/hennery'
    gate.require(not installed.exists() and not installed.is_symlink() and not (Path(prefix) / 'Cellar/hennery').exists(),
                 'uninstall left package files')


def commit_formula(tap, formula, env, work, message):
    path = Path(tap) / 'Formula/hennery.rb'
    path.write_text(formula)
    for args in (['add', 'Formula/hennery.rb'],
                 ['-c', 'user.name=Marcin Wadoń', '-c', 'user.email=marcin.wadon@gmail.com',
                  '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', message, '--', 'Formula/hennery.rb']):
        subprocess.run(['git', '-C', str(tap), *args], env=env, cwd=work, check=True)


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
    command('git', '-C', str(tap), 'init', '-q', '--initial-branch=main')
    command('git', '-C', str(tap), 'remote', 'add', 'origin', str(tap))
    local = original
    for target in inventory['targets']:
        name = 'hennery-' + target + '.tar.xz'
        local = local.replace(f'https://github.com/{gate.REPOSITORY}/releases/download/{inventory["tag"]}/{name}', (candidate / name).as_uri())
    old = local.replace(f'version "{inventory["tag"][1:]}"', 'version "0.0.0"')
    commit_formula(tap, local, env, work, 'test(formula): install frozen candidate')
    sentinels = [work / 'data/hennery/preserve', work / 'home/Library/LaunchAgents/hennery-preserve.plist']
    for path in sentinels:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b'operator-owned sentinel\n')
    # Extract and compare without executing or unpacking arbitrary extra files.
    import tarfile
    with tarfile.open(candidate / ('hennery-' + native + '.tar.xz')) as archive:
        entries = [m for m in archive.getmembers() if m.isfile() and m.name.endswith('/hennery')]
        gate.require(len(entries) == 1, 'candidate executable ambiguous')
        expected = archive.extractfile(entries[0]).read()
    scripts = recipes()
    print('Install frozen candidate with its exact candidate formula version', flush=True)
    command('sh', '-eu', '-c', scripts['install'])
    installed = prefix / 'bin/hennery'
    check_keg(installed, prefix, inventory['tag'][1:])
    smoke(installed, expected, inventory['tag'], inventory['source_sha'], env, work)
    # Clear the candidate install before seeding the explicitly lower fixture.
    command('sh', '-eu', '-c', scripts['uninstall'])
    check_removed(prefix)
    print('Seed labelled 0.0.0 upgrade fixture using the same candidate payload', flush=True)
    commit_formula(tap, old, env, work, 'test(formula): install old-version upgrade fixture')
    command('sh', '-eu', '-c', scripts['install'])
    check_keg(installed, prefix, '0.0.0')
    smoke(installed, expected, inventory['tag'], inventory['source_sha'], env, work)
    commit_formula(tap, local, env, work, 'test(formula): upgrade to frozen candidate')
    command('sh', '-eu', '-c', scripts['upgrade'])
    check_keg(installed, prefix, inventory['tag'][1:])
    smoke(installed, expected, inventory['tag'], inventory['source_sha'], env, work)
    command('sh', '-eu', '-c', scripts['uninstall'])
    check_removed(prefix)
    gate.require(all(p.read_bytes() == b'operator-owned sentinel\n' for p in sentinels), 'package operation changed user data/service definitions')
    gate.require((candidate / 'release-inventory.json').read_bytes() == raw, 'acceptance changed frozen inventory')
    gate.verify_files(inventory, candidate)
    homebrew.check(candidate, inventory['tag'], inventory['targets'])
    report = {'brew_commit': BREW_COMMIT, 'native': native, 'inventory_sha256': gate.digest(raw),
              'install': inventory['tag'][1:], 'old_fixture': '0.0.0', 'upgrade': inventory['tag'][1:],
              'source_sha': inventory['source_sha'], 'test': 'version/source/UI/notices',
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

<!-- r2:file {"encoding": "utf-8", "mode": "100644", "path": "docs/homebrew.md", "phase": "feature", "sha256": "8a1c962b73095f6f577b24f0813e64c8a5d2991ffefd7bc25a37fc2c1de242e6", "size": 3592, "task": 4} -->
````text
# Homebrew installs and services

The planned project tap is `marcinwadon/homebrew-tap`. Publication is disabled
until the maintainer enables a qualified stable release; the first alpha is
GitHub-only. The commands below become available after that enablement. The
binary formula covers Apple Silicon macOS and x86_64/aarch64 Linux, subject to
native CI acceptance. It does not qualify Intel macOS or managed Alpine hosts.

Install the versioned release archive and check the executable:

<!-- check: homebrew-install -->
```sh
brew install --formula marcinwadon/tap/hennery
hennery --version
brew --prefix hennery
```

The formula verifies archive SHA-256 and installs the same executable, embedded
UI, licence and third-party notices. The normal tap path trusts Homebrew, the
tap and GitHub release hosting; it does not independently perform the README's
hardware-inventory and Sigstore verification. Installation starts no service,
installs no agents and changes no login. A host may download its separately
pinned runtime when the operator later joins or starts it.

Before installing a service, put Homebrew's stable binary directory on the
login shell's PATH and check which Hennery executable is selected. Use Hennery's
own service installer, choosing the existing role and data directory. There is
no separate Homebrew service definition: do not register it through Homebrew's
service manager. Hennery records the invoked executable path and captures the
login shell's PATH; use the stable Homebrew binary link rather than an absolute
versioned Cellar path. A graphical macOS login is required for the user agent.

Upgrade and run the formula's version, embedded-UI and notices checks:

<!-- check: homebrew-upgrade -->
```sh
brew upgrade --formula marcinwadon/tap/hennery
hennery --version
brew test marcinwadon/tap/hennery
```

An already-running process continues to use its old executable after upgrade.
Run Hennery's service installer again with the same role and data directory to
refresh PATH and restart it. This is especially necessary for a service that
names an old Cellar path. Check service status and doctor afterwards; upgrade
never silently restarts a service or changes its role. Preserve the data backup
and migration precautions in the README.

Before package removal, explicitly stop and uninstall any Hennery service with
Hennery's service uninstaller. Then remove every installed package keg:

<!-- check: homebrew-uninstall -->
```sh
brew uninstall --force marcinwadon/tap/hennery
```

This removes package files and links, preserving user data, managed runtime,
agent logins and operator service definitions. Removing the formula alone is
not a service uninstall or a data purge.

The native PR and candidate jobs execute these exact three command blocks in a
fresh pinned Homebrew prefix and local file-based tap, with scratch home/cache/
config. They first install the candidate with its actual formula/Cellar version,
then clear that installation and seed a separate old-version fixture labelled
0.0.0 using the same candidate payload. Upgrading it proves Homebrew's
transaction, not an older application's migration. Every installed executable
is compared byte-for-byte with the candidate archive, its exact first version
line and its candidate source commit. Both candidate kegs must match the tag.
Removal checks package leftovers and preserved data/service
sentinels. macOS 27 with CLT 26.6 refused the local proof; that check remains
intact. Native runner CI is the acceptance evidence.

Generated with Claude AI — please review before distribution.
````


## After this plan

The parent maintains PR #155 and relays the scheduling regression and three
native proof results and any failures; those checks remain required before enabling Homebrew. Run an
independent review of the complete range and the specific risks above. Preserve
both local refusals as evidence; never skip linkage or lie about CLT/OS versions.

The maintainer creates the tap/main branch, qualifies and scopes the credential
only in protected release, records the local settings observation and enables
GitHub then Homebrew, crates.io and GHCR independently. The YubiKey signature,
fresh settings audit and current publishing-attempt approval are still required.
Merging does not create a tag, dispatch a publisher or turn on either switch.

Retain this lane's scratch tool, proof, probe and replay copies for parent
cleanup. The ledger contains commands, exit statuses and test counts.

Generated with Claude AI — please review before distribution.
