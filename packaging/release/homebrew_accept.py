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
