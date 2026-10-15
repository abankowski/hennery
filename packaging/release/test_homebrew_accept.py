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
