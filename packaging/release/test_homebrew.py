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
