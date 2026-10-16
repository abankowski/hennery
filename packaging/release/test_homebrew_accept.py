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
