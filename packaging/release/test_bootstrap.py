"""Run the exact guarded README shell block against real OpenPGP fixtures."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
FINGERPRINT = 'F26C7F594DFE84D131703AFC23E5A318AE8D2861'
SCRIPT = None


def documented_script():
    environment = dict(os.environ)
    environment.pop('README_BLOCKS_AWK', None)
    result = subprocess.run(['sh', str(ROOT / 'packaging/readme-blocks.sh'), str(ROOT / 'README.md'), 'release-bootstrap'], env=environment, capture_output=True, text=True)
    if result.returncode:
        raise AssertionError('README must contain the guarded release-bootstrap block: ' + result.stderr)
    if SCRIPT is not None:
        assert SCRIPT.read_text() == result.stdout, 'workflow must execute the exact README block'
    return result.stdout


class Bootstrap(unittest.TestCase):
    def test_documented_bootstrap_is_guarded_and_runs_no_release_verifier(self):
        script = documented_script()
        self.assertEqual(script.count('release_fingerprint=' + FINGERPRINT), 1)
        self.assertNotIn('verify.py', script)
        self.assertNotIn('maintainer.asc', script)

    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='r1-bootstrap-')
        cls.root = Path(cls.temp.name)
        cls.keyring = cls.root / 'signing'; cls.keyring.mkdir(mode=0o700)
        cls.environment = dict(os.environ, GNUPGHOME=str(cls.keyring))
        cls.keys = []
        cls.primary = []
        for name in ('approved', 'another'):
            cls.gpg('--quick-generate-key', 'R1 disposable ' + name, 'ed25519', 'cert', '1d')
            listing = cls.gpg('--with-colons', '--list-keys', 'R1 disposable ' + name).stdout
            primary = next(line.split(':')[9] for line in listing.splitlines() if line.startswith('fpr:'))
            cls.primary.append(primary)
            cls.gpg('--quick-add-key', primary, 'ed25519', 'sign', '1d')
            listing = cls.gpg('--with-colons', '--with-subkey-fingerprint', '--list-keys', primary).stdout
            cls.keys.append([line.split(':')[9] for line in listing.splitlines() if line.startswith('fpr:')][-1])
        cls.public = cls.gpg('--armor', '--export', cls.primary[0]).stdout
        cls.other_public = cls.gpg('--armor', '--export', cls.primary[1]).stdout

    @classmethod
    def tearDownClass(cls):
        subprocess.run(['gpgconf', '--kill', 'gpg-agent'], env=cls.environment, check=True, capture_output=True)
        cls.temp.cleanup()

    @classmethod
    def gpg(cls, *arguments):
        return subprocess.run(['gpg', '--batch', '--pinentry-mode', 'loopback', '--passphrase', '', *arguments], env=cls.environment, check=True, capture_output=True, text=True)

    def run_fixture(self, case, hash_tool='sha256sum', conditional=False):
        import hashlib
        root = self.root / (case + '-' + hash_tool + ('-conditional' if conditional else '')); root.mkdir()
        release = root / 'release'; release.mkdir()
        installer = b'#!/bin/sh\nprintf executed > "$INSTALL_MARKER"\n'
        (release / 'hennery-installer.sh').write_bytes(installer)
        inventory = {'schema': 1, 'repository': 'marcinwadon/hennery', 'tag': 'v0.1.0-alpha.1',
                     'artifacts': [{'name': 'hennery-installer.sh', 'sha256': hashlib.sha256(installer).hexdigest(), 'size': len(installer)}]}
        if case == 'wrong-release-tag': inventory['tag'] = 'v9.9.9'
        raw = (json.dumps(inventory, sort_keys=True, separators=(',', ':'))+'\n').encode()
        (release / 'release-inventory.json').write_bytes(raw)
        self.gpg('--armor', '--local-user', self.keys[1 if case == 'wrong-key-signature' else 0] + '!', '--output', str(release / 'release-inventory.json.asc'), '--detach-sign', str(release / 'release-inventory.json'))
        if case == 'tampered-installer': (release / 'hennery-installer.sh').write_bytes(installer + b'# tampered\n')
        if case == 'tampered-inventory': (release / 'release-inventory.json').write_bytes(raw + b' ')
        if case == 'missing-signature': (release / 'release-inventory.json.asc').unlink()
        if case == 'malformed-signature': (release / 'release-inventory.json.asc').write_text('malformed')
        (release / 'github.asc').write_text(self.other_public if case == 'wrong-github-key' else self.public + self.other_public)
        (release / 'keyserver.asc').write_text(self.other_public if case == 'wrong-keyserver-key' else self.public)
        (release / 'main-readme').write_text('maintainer signing fingerprint: ' + ('0'*40 if case == 'wrong-main-pin' else self.keys[0]) + '\n')
        tools = root / 'tools'; tools.mkdir()
        # Only transport is replaced. Origins/paths are those in the README;
        # unknown URLs fail and can never fall through to the network.
        (tools / 'curl').write_text('#!' + sys.executable + '\n' + '''import os,sys
from pathlib import Path
args=sys.argv[1:]
assert args[args.index('--proto')+1]=='=https'
assert args[args.index('--proto-redir')+1]=='=https'
url=next(arg for arg in args if arg.startswith('https://'))
base='https://github.com/marcinwadon/hennery/releases/download/v0.1.0-alpha.1/'
names={'https://raw.githubusercontent.com/marcinwadon/hennery/refs/heads/main/README.md':'main-readme',
       'https://github.com/marcinwadon.gpg':'github.asc',
       'https://keys.openpgp.org/vks/v1/by-fingerprint/'+os.environ['FIXTURE_FINGERPRINT']:'keyserver.asc'}
names.update({base+name:name for name in ['release-inventory.json','release-inventory.json.asc','hennery-installer.sh']})
if url not in names: sys.exit(99)
path=Path(os.environ['FIXTURE_RELEASE'])/names[url]
if not path.is_file(): sys.exit(22)
Path(args[args.index('-o')+1]).write_bytes(path.read_bytes())
'''); (tools / 'curl').chmod(0o755)
        for tool in ('gpg','awk','grep','jq','mktemp','mkdir','chmod','sh',hash_tool):
            executable = shutil.which(tool); self.assertIsNotNone(executable, tool)
            (tools / tool).symlink_to(executable)
        script = documented_script()
        # The only substitution: a disposable key in place of the production
        # literal pin. Never substitute schemes, hosts, commands or a verifier.
        pin = 'release_fingerprint=' + FINGERPRINT
        self.assertEqual(script.count(pin), 1)
        script = script.replace(pin, 'release_fingerprint=' + self.keys[0])
        if conditional:
            # An enclosing conditional suppresses shell errexit. The exact
            # README commands must still refuse before executing the payload.
            script = 'if ' + script + 'then exit 0; else exit 1; fi\n'
        path = root / 'bootstrap.sh'; path.write_text(script)
        home = root / 'home'; home.mkdir()
        marker = root / 'executed'
        # Keep GnuPG's public-keyring socket path within macOS's Unix-socket
        # bound; case names must not accidentally become refusal mechanisms.
        env = dict(os.environ, PATH=str(tools), HOME=str(home), GNUPGHOME=str(home/'unused'), TMPDIR=str(self.root), INSTALL_MARKER=str(marker), FIXTURE_RELEASE=str(release), FIXTURE_FINGERPRINT=self.keys[0])
        result = subprocess.run([str(tools/'sh'), str(path)], env=env, cwd=root, capture_output=True, text=True)
        return result, marker

    def test_positive_with_each_documented_sha256_tool(self):
        for tool in ('sha256sum','shasum'):
            with self.subTest(tool=tool):
                result, marker = self.run_fixture('valid',tool)
                self.assertEqual(result.returncode,0,result.stdout+result.stderr)
                self.assertEqual(marker.read_text(),'executed')

    def test_tampering_wrong_key_or_missing_signature_never_executes_installer(self):
        for tool in ('sha256sum','shasum'):
            for case in ('tampered-installer','tampered-inventory','wrong-key-signature','missing-signature','malformed-signature','wrong-github-key','wrong-keyserver-key','wrong-main-pin','wrong-release-tag'):
                with self.subTest(case=case,tool=tool):
                    result, marker = self.run_fixture(case,tool)
                    self.assertNotEqual(result.returncode,0,'bootstrap accepted '+case)
                self.assertFalse(marker.exists(),'installer executed for '+case)

    def test_refusals_do_not_depend_on_shell_errexit(self):
        for tool in ('sha256sum','shasum'):
            for case in ('tampered-installer','tampered-inventory','wrong-key-signature','missing-signature'):
                with self.subTest(case=case,tool=tool):
                    result, marker = self.run_fixture(case,tool,conditional=True)
                    self.assertNotEqual(result.returncode,0,'conditional bootstrap accepted '+case)
                    self.assertFalse(marker.exists(),'installer executed for '+case)


if __name__ == '__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--script',type=Path)
    SCRIPT=parser.parse_args().script
    unittest.main(argv=[sys.argv[0]])
