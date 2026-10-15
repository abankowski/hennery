"""Exercise restricted installer tool directories, including merged /usr bins."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class InstallerTools(unittest.TestCase):
    def fixture(self, root, *, conflicting=False, missing_gh=False):
        source = (ROOT / 'packaging/test-installer.sh').read_text()
        functions = source[source.index('# tools <dir>'):source.index('# copy <name>')]
        self.assertEqual(functions.count('for from in /usr/bin /bin; do'), 1)
        functions = functions.replace('for from in /usr/bin /bin; do',
                                      'for from in "$scratch/first" "$scratch/second"; do')
        for name in ('first', 'second', 'verifier-tools'):
            (root / name).mkdir()
        for name in ('system-gpg', 'other-gpg', 'system-jq'):
            (root / name).write_text(name + '\n')
        for directory in ('first', 'second'):
            target = 'other-gpg' if conflicting and directory == 'second' else 'system-gpg'
            (root / directory / 'gpg').symlink_to(root / target)
            (root / directory / 'jq').symlink_to(root / 'system-jq')
            (root / directory / 'gh').symlink_to(root / 'system-gpg')
        for name in ('gpg', 'jq'):
            (root / 'verifier-tools' / name).write_text('offline ' + name + '\n')
        if missing_gh:
            start = source.index('tools "$scratch/no-gh-tools"')
            setup = source[start:source.index('(PATH="$scratch/no-gh-tools"', start)]
        else:
            setup = 'tools "$scratch/no-gh-tools" gh\n'
        script = 'set -eu\nfail() { printf "%s\\n" "$*" >&2; exit 1; }\n'
        script += 'scratch=$1\n' + functions + setup + 'printf ready > "$scratch/ready"\n'
        return subprocess.run(['sh', '-c', script, 'installer-tools', str(root)],
                              capture_output=True, text=True)

    def test_missing_gh_setup_reserves_the_offline_signer_when_system_gpg_exists(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = self.fixture(root, missing_gh=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / 'ready').exists())
            for name in ('gpg', 'jq'):
                self.assertTrue((root / 'no-gh-tools' / name).samefile(root / 'verifier-tools' / name))
            self.assertFalse((root / 'no-gh-tools' / 'gh').exists())

    def test_duplicate_tool_names_resolving_to_the_same_binary_are_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = self.fixture(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / 'ready').exists())
            self.assertTrue((root / 'no-gh-tools' / 'gpg').is_symlink())
            self.assertTrue((root / 'no-gh-tools' / 'gpg').samefile(root / 'system-gpg'))

    def test_duplicate_tool_names_with_different_binaries_refuse_without_replacement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = self.fixture(root, conflicting=True)
            self.assertNotEqual(result.returncode, 0, 'conflicting binary was silently accepted')
            self.assertFalse((root / 'ready').exists())
            self.assertTrue((root / 'no-gh-tools' / 'gpg').samefile(root / 'system-gpg'))


if __name__ == '__main__':
    unittest.main()
