from pathlib import Path
import subprocess
import tempfile
import unittest

import gate
import make_installer_fixture

ROOT = Path(__file__).resolve().parents[2]


class InstallerArchives(unittest.TestCase):
    def test_tiny_fixtures_refuse_an_unterminated_archive_arm(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pristine = root / 'installer.sh'
            pristine.write_text('\n'.join('"hennery-' + target + '.tar.xz")' for target in sorted(gate.TARGETS)))
            with self.assertRaisesRegex(gate.Refused, 'no terminator'):
                make_installer_fixture.make(pristine, root / 'fixture')

    def test_tiny_fixtures_replace_existing_checksums_and_supply_all_docs(self):
        import supply
        for embedded in (False, True):
            with self.subTest(embedded=embedded), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                pristine, output = root / 'installer.sh', root / 'fixture'
                arms = []
                for target in sorted(gate.TARGETS):
                    arm = '"hennery-' + target + '.tar.xz")\n'
                    if embedded:
                        arm += '    _checksum_style="sha256"\n    _checksum_value="' + '0' * 64 + '"\n'
                    arms.append(arm + '    ;;\n')
                pristine.write_text('case "$1" in\n' + ''.join(arms) + 'esac\nprintf "%s %s" "$_checksum_style" "$_checksum_value"\n')
                make_installer_fixture.make(pristine, output)
                for target in sorted(gate.TARGETS):
                    archive = output / ('hennery-' + target + '.tar.xz')
                    result = subprocess.run(['sh', str(output / 'hennery-installer.sh'), archive.name], capture_output=True, text=True)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stdout, 'sha256 ' + gate.digest(archive.read_bytes()))
                supply.binary_inventory(output, sorted(gate.TARGETS))

    def candidate(self, root, *, missing=False, extra=False):
        name = 'hennery-aarch64-apple-darwin.tar.xz'
        data = b'archive fixture'
        if not missing:
            (root / name).write_bytes(data)
        (root / (name + '.sha256')).write_text(gate.digest(data) + '  ' + name + '\n')
        (root / 'hennery-installer.sh').write_text(
            '#!/bin/sh\ncase "$unused" in\n"' + name + '")\n'
            '    _checksum_style="sha256"\n'
            '    _checksum_value="' + gate.digest(data) + '"\n'
            '    ;;\nesac\nexit 99\n')
        if extra:
            (root / 'hennery-x86_64-unknown-linux-musl.tar.xz').write_bytes(data)
        return name

    def check(self, root):
        return subprocess.run(['sh', str(ROOT / 'packaging/test-installer.sh'), str(root)],
                              capture_output=True, text=True)

    def test_offered_executable_archive_must_exist_even_with_sidecar(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            name = self.candidate(root, missing=True)
            result = self.check(root)
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertIn('this build has no ' + name + '\n', result.stderr)

    def test_executable_archive_must_be_offered(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.candidate(root, extra=True)
            result = self.check(root)
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertIn('the installer does not offer hennery-x86_64-unknown-linux-musl.tar.xz', result.stderr)


if __name__ == '__main__':
    unittest.main()
