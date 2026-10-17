"""Exercise selection through the real git diff producer and CLI output."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('ci-paths.py')


class ChangedPaths(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.env = dict(os.environ, GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM='1',
                        GIT_AUTHOR_NAME='Marcin Wadoń', GIT_COMMITTER_NAME='Marcin Wadoń',
                        GIT_AUTHOR_EMAIL='marcin.wadon@gmail.com', GIT_COMMITTER_EMAIL='marcin.wadon@gmail.com')
        self.git('init', '-q')
        for name in ('docs/design.md', 'crates/hennery-view/src/lib.rs', 'web/src/main.ts'):
            self.write(name)
        self.commit()
        self.base = self.git('rev-parse', 'HEAD').strip()

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, env=self.env, text=True)

    def write(self, name):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('changed\n')

    def commit(self):
        self.git('add', '--all')
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture')

    def select(self, base=None):
        result = subprocess.run([sys.executable, str(SCRIPT), '--base', self.base if base is None else base],
                                cwd=self.root, env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return dict(line.split('=', 1) for line in result.stdout.splitlines())

    def test_documentation_selects_only_checks_and_result(self):
        self.write('docs/nested/new design.md')
        self.commit()
        outputs = self.select()
        for key in ('rust', 'macos', 'web', 'nix', 'recipes', 'audit_rust', 'audit_web'):
            self.assertEqual(outputs[key], 'false', key)

    def test_source_and_unknown_paths_select_all_core_jobs(self):
        for path in ('crates/hennery-view/src/new.rs', 'web/src/new.ts', 'new-build-input',
                     'crates/fixture/input.md', 'odd\nname.rs'):
            self.write(path)
        self.commit()
        outputs = self.select()
        for key in ('rust', 'macos', 'web', 'nix'):
            self.assertEqual(outputs[key], 'true', key)
        self.assertEqual(outputs['macos_full'], 'false')
        self.assertEqual(outputs['recipes'], 'false')
        self.assertEqual(len(json.loads(outputs['nix_matrix'])['include']), 1)

    def test_platform_changes_escalate_native_tests(self):
        for path in ('crates/hennery/src/service/path.rs', 'crates/hennery-proto/src/paths.rs',
                     'crates/hennery-kernel/src/admin.rs'):
            base = self.git('rev-parse', 'HEAD').strip()
            self.write(path)
            self.commit()
            with self.subTest(path=path):
                self.assertEqual(self.select(base)['macos_full'], 'true')

    def test_nix_changes_select_all_supported_platforms_and_recipes(self):
        self.write('nix/package.nix')
        self.commit()
        outputs = self.select()
        self.assertEqual(outputs['recipes'], 'true')
        self.assertEqual(outputs['macos_full'], 'true')
        self.assertEqual({x['system'] for x in json.loads(outputs['nix_matrix'])['include']},
                         {'x86_64-linux', 'aarch64-linux', 'aarch64-darwin'})

    def test_readme_selects_actual_recipes(self):
        self.write('README.md')
        self.commit()
        outputs = self.select()
        self.assertEqual(outputs['recipes'], 'true')
        self.assertEqual(outputs['nix'], 'true')
        self.assertEqual(outputs['rust'], 'false')

    def test_rust_lock_selects_its_fresh_audit(self):
        self.write('Cargo.lock')
        self.commit()
        outputs = self.select()
        self.assertEqual(outputs['audit_rust'], 'true')
        self.assertEqual(outputs['audit_web'], 'false')

    def test_web_lock_selects_its_fresh_audit(self):
        self.write('web/pnpm-lock.yaml')
        self.commit()
        outputs = self.select()
        self.assertEqual(outputs['audit_rust'], 'false')
        self.assertEqual(outputs['audit_web'], 'true')

    def test_source_renamed_into_docs_keeps_deletion_in_selection(self):
        self.git('mv', 'web/src/main.ts', 'docs/moved.md')
        self.commit()
        self.assertEqual(self.select()['rust'], 'true')

    def test_initial_push_uses_the_actual_tree(self):
        self.assertEqual(self.select('0' * 40)['rust'], 'true')

    def test_missing_base_fails_instead_of_reporting_unselected(self):
        result = subprocess.run([sys.executable, str(SCRIPT), '--base', 'f' * 40], cwd=self.root,
                                env=self.env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('rust=false', result.stdout)
