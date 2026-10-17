"""Real cargo-dist output crosses the shared archive/advisory/staging boundary."""
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile
import unittest

import assemble
import gate
import test_assemble

ROOT = Path(__file__).resolve().parents[2]


@unittest.skipUnless(os.environ.get('HENNERY_TEST_DIST'), 'requires pinned cargo-dist (release-tests CI)')
class NativeDist(unittest.TestCase):
    def run_archive(self, root, missing=None):
        target = {('Darwin', 'arm64'): 'aarch64-apple-darwin',
                  ('Linux', 'x86_64'): 'x86_64-unknown-linux-musl',
                  ('Linux', 'aarch64'): 'aarch64-unknown-linux-musl'}[(platform.system(), platform.machine())]
        (root / 'src').mkdir()
        (root / 'src/main.rs').write_text('fn main() { println!("hennery 0.1.0-alpha.3"); }\n')
        (root / 'Cargo.toml').write_text(
            '[package]\nname="hennery"\nversion="0.1.0-alpha.3"\nedition="2024"\n'
            'repository="https://github.com/marcinwadon/hennery"\nlicense="AGPL-3.0-only"\n'
            '[profile.dist]\ninherits="release"\n')
        (root / 'dist-workspace.toml').write_text(
            '[workspace]\nmembers=["cargo:."]\n[dist]\ncargo-dist-version="0.30.4"\n'
            'targets=' + json.dumps([target]) + '\nci="github"\nallow-dirty=["ci"]\n'
            'checksum="sha256"\ninstallers=["shell","homebrew"]\n')
        for name in ('README.md', 'CHANGELOG.md', 'LICENSE'):
            (root / name).write_text('fixture documentation\n')
        (root / 'packaging').symlink_to(ROOT / 'packaging', target_is_directory=True)
        materials = root / 'release-materials'; materials.mkdir()
        seed = test_assemble.candidates(root / 'seed') / ('candidate-' + target)
        for name in ('THIRD-PARTY-NOTICES.txt', 'licence-findings.json', 'third-party-source.tar.xz',
                     'rust-advisories.json', 'rust-advisory-revision.txt', 'web-advisories.json',
                     'runtime-inventory.json', 'hennery-' + target + '.spdx.json'):
            shutil.copyfile(seed / name, materials / name)
        (materials / 'build-identity.json').write_text(json.dumps({
            'source_sha': 'a' * 40, 'ui_sha256': 'b' * 64, 'adapter_manifest_sha256': 'c' * 64}))
        if missing:
            (materials / missing).unlink()
        (root / 'home').mkdir()
        env = dict(os.environ, HOME=str(root / 'home'), CARGO_HOME=str(root / 'home/cargo'),
                   XDG_CONFIG_HOME=str(root / 'home/config'), XDG_CACHE_HOME=str(root / 'home/cache'),
                   GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_SYSTEM=os.devnull, TARGET=target,
                   PATH=str(Path(os.environ['HENNERY_TEST_DIST']).resolve().parent) + os.pathsep + os.environ['PATH'])
        for args in (['init', '-q'], ['add', '.'],
                     ['-c', 'commit.gpgsign=false', '-c', 'user.name=Marcin Wadoń',
                      '-c', 'user.email=marcin.wadon@gmail.com', 'commit', '-qm', 'fixture']):
            subprocess.run(['git', *args], cwd=root, env=env, check=True, capture_output=True)
        result = subprocess.run(['sh', str(ROOT / 'packaging/release/native-archive.sh')],
                                cwd=root, env=env, capture_output=True, text=True)
        return result, target

    def test_real_native_output_preserves_the_transport_inventory_and_expanded_staging(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result, target = self.run_archive(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            assemble.check_native(root / 'target/distrib', target)
            self.assertEqual({p.name for p in (root / 'target/distrib').iterdir()},
                             assemble.native_files(target) | {'hennery-' + target})

    def test_missing_advisory_input_stops_before_any_archive_can_reach_homebrew(self):
        for name in ('rust-advisories.json', 'rust-advisory-revision.txt', 'web-advisories.json'):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                result, target = self.run_archive(root, missing=name)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((root / 'target/distrib' / ('hennery-' + target + '.tar.xz')).exists(),
                                 result.stdout + result.stderr)
