import io
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

import gate
import supply

ROOT = Path(__file__).resolve().parents[2]


class ArchivePolicy(unittest.TestCase):
    def test_release_requires_notices_and_refuses_extra_payload(self):
        for notices, extra, expected in [(True, False, 0), (False, False, 1), (True, True, 1)]:
            with self.subTest(notices=notices, extra=extra), tempfile.TemporaryDirectory() as tmp:
                archive = Path(tmp) / 'hennery-aarch64-apple-darwin.tar.xz'
                base = 'hennery-aarch64-apple-darwin'
                with tarfile.open(archive, 'w:xz') as tar:
                    directory = tarfile.TarInfo(base + '/')
                    directory.type = tarfile.DIRTYPE
                    tar.addfile(directory)
                    files = ['hennery', 'CHANGELOG.md', 'LICENSE', 'README.md']
                    if notices:
                        files.append('THIRD-PARTY-NOTICES.txt')
                    if extra:
                        files.append('unapproved-agent')
                    for name in files:
                        entry = tarfile.TarInfo(base + '/' + name)
                        entry.size = 1
                        tar.addfile(entry, io.BytesIO(b'x'))
                (Path(tmp) / (archive.name + '.sha256')).write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
                if expected:
                    with self.assertRaises(gate.Refused):
                        supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                else:
                    result = supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                    self.assertEqual(result['aarch64-apple-darwin']['sha256'], gate.digest(b'x'))
                    (Path(tmp) / (archive.name + '.sha256')).write_text('0' * 64 + '  ' + archive.name + '\n')
                    with self.assertRaises(gate.Refused):
                        supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                result = subprocess.run(['sh', str(ROOT / 'packaging/check-archive.sh'), str(archive), 'aarch64-apple-darwin', '--notices'],
                                        capture_output=True, text=True)
                self.assertEqual(result.returncode, expected, result.stdout + result.stderr)


    def test_each_required_member_is_enforced_by_both_archive_checks(self):
        files = ['CHANGELOG.md', 'LICENSE', 'README.md', 'THIRD-PARTY-NOTICES.txt', 'hennery']
        for missing in [None, *files]:
            with self.subTest(missing=missing), tempfile.TemporaryDirectory() as tmp:
                base = 'hennery-aarch64-apple-darwin'
                archive = Path(tmp) / (base + '.tar.xz')
                with tarfile.open(archive, 'w:xz') as tar:
                    directory = tarfile.TarInfo(base + '/')
                    directory.type = tarfile.DIRTYPE
                    tar.addfile(directory)
                    for name in files:
                        if name != missing:
                            entry = tarfile.TarInfo(base + '/' + name)
                            entry.size = 1
                            tar.addfile(entry, io.BytesIO(b'x'))
                (Path(tmp) / (archive.name + '.sha256')).write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
                result = subprocess.run(['sh', str(ROOT / 'packaging/check-archive.sh'), str(archive), 'aarch64-apple-darwin', '--notices'],
                                        capture_output=True, text=True)
                self.assertEqual(result.returncode, 1 if missing else 0, result.stdout + result.stderr)
                if missing:
                    with self.assertRaises(gate.Refused):
                        supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                else:
                    supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                # Qualification archives omit only the separately generated notices.
                if missing == 'THIRD-PARTY-NOTICES.txt':
                    result = subprocess.run(['sh', str(ROOT / 'packaging/check-archive.sh'), str(archive), 'aarch64-apple-darwin'],
                                            capture_output=True, text=True)
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


    def test_nonregular_and_duplicate_archive_members_refuse(self):
        for symlink, duplicate in [('hennery', None), ('CHANGELOG.md', None), (None, 'LICENSE'), (None, 'CHANGELOG.md')]:
            with self.subTest(symlink=symlink, duplicate=duplicate), tempfile.TemporaryDirectory() as tmp:
                base = 'hennery-aarch64-apple-darwin'
                archive = Path(tmp) / (base + '.tar.xz')
                with tarfile.open(archive, 'w:xz') as tar:
                    directory = tarfile.TarInfo(base + '/')
                    directory.type = tarfile.DIRTYPE
                    tar.addfile(directory)
                    names = ['CHANGELOG.md', 'LICENSE', 'README.md', 'THIRD-PARTY-NOTICES.txt', 'hennery']
                    if duplicate:
                        names.append(duplicate)
                    for name in names:
                        entry = tarfile.TarInfo(base + '/' + name)
                        if name == symlink:
                            entry.type, entry.linkname = tarfile.SYMTYPE, 'README.md'
                            tar.addfile(entry)
                        else:
                            entry.size = 1
                            tar.addfile(entry, io.BytesIO(b'x'))
                (Path(tmp) / (archive.name + '.sha256')).write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
                if symlink:
                    # The link must resolve: removing the regular-file guard
                    # should fail our refusal assertion, not tarfile's lookup.
                    with tarfile.open(archive, 'r:xz') as tar:
                        self.assertEqual(tar.extractfile(base + '/' + symlink).read(), b'x')
                with self.assertRaises(gate.Refused):
                    supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])


if __name__ == '__main__':
    unittest.main()
