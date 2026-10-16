"""Real local tags must not depend on an operator's Git identity/configuration."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from installer_fixtures import ConsumerFixtures, FINGERPRINT


class FixtureIsolation(ConsumerFixtures, unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outer = tempfile.TemporaryDirectory(prefix='consumer-empty-home-')
        cls.addClassCleanup(cls.outer.cleanup)
        empty = {'PATH': os.environ['PATH'], 'HOME': cls.outer.name,
                 'XDG_CONFIG_HOME': str(Path(cls.outer.name) / 'xdg'),
                 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_NOSYSTEM': '1',
                 # macOS Git can infer a tagger from Directory Services even
                 # with no configuration; disable that fallback for the RED.
                 'GIT_CONFIG_COUNT': '1', 'GIT_CONFIG_KEY_0': 'user.useConfigOnly',
                 'GIT_CONFIG_VALUE_0': 'true'}
        with patch.dict(os.environ, empty, clear=True):
            super().setUpClass()

    def test_signed_and_unsigned_fixture_tags_have_an_explicit_tagger(self):
        # This script tests fixture construction only. The real bootstrap suite
        # independently requires that an unsigned tag is refused.
        script = 'release_fingerprint=' + FINGERPRINT + '\nexit 0\n'
        for case in ('unsigned-tag', 'valid'):
            with self.subTest(case=case):
                try:
                    _, marker = self.fixture(case, script)
                except subprocess.CalledProcessError as error:
                    self.fail('fixture construction failed: ' + error.stderr)
                raw = subprocess.check_output(['git', '-C', str(marker.parent / 'source'),
                                               'cat-file', 'tag', 'v0.1.0-alpha.1'],
                                              env=self.environment, text=True)
                self.assertTrue('tagger Disposable fixture <fixture@example.invalid> ' in raw,
                                'fixture used an ambient or inferred tagger')

    def test_fixture_configuration_is_private_even_with_an_empty_caller_home(self):
        self.assertIn('HOME', self.environment)
        self.assertIn('XDG_CONFIG_HOME', self.environment)
        self.assertNotEqual(self.environment['HOME'], self.outer.name)
        self.assertTrue(Path(self.environment['HOME']).is_relative_to(self.root))
        self.assertTrue(Path(self.environment['XDG_CONFIG_HOME']).is_relative_to(self.root))
        self.assertEqual(self.environment.get('GIT_CONFIG_GLOBAL'), '/dev/null')
        self.assertEqual(self.environment.get('GIT_CONFIG_SYSTEM'), '/dev/null')
        self.assertEqual(self.environment.get('GIT_CONFIG_NOSYSTEM'), '1')
        for key in ('GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0'):
            self.assertNotIn(key, self.environment)

    def test_fixture_subprocess_failure_includes_stderr(self):
        with self.assertRaises(AssertionError) as failure:
            self.gpg('--hennery-fixture-stderr-canary')
        self.assertIn('hennery-fixture-stderr-canary', str(failure.exception))
        self.assertIn('invalid option', str(failure.exception))
        self.assertIn('exit ', str(failure.exception))
