"""Revert-probeable smoke assertions. Docker and HTTP are fully stubbed."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / 'smoke-image.sh'


class Smoke(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.env = dict(os.environ, PATH=str(root) + os.pathsep + os.environ['PATH'],
                        HTML_CONTENT='<html><div id="root"></div><script src="/assets/index-123.js"></script></html>',
                        JS_CONTENT='compiled module')
        scripts = {
            'docker': '''#!/bin/sh
case "$1" in
 run) case "$*" in *--entrypoint*) echo "${DATA_MODE:-65532:65532 700}";; *) echo container;; esac;;
 exec|rm|logs) exit 0;;
 inspect) case "$*" in *Mounts*) echo volume;; *State.Health*) echo healthy;; *Config.User*) echo "${IMAGE_USER:-65532:65532}";; esac;;
 top)
   if [ "$3" != -eo ] || [ "$4" != pid,uid,user ]; then
     echo "Error response from daemon: Couldn't find PID field in ps output" >&2
     exit 1
   fi
   printf 'PID UID USER\\n123 %s user\\n' "${PROCESS_UID:-65532}"
   exit "${TOP_STATUS:-0}";;
 port) echo "${PORT:-127.0.0.1:12345}";;
 export) exit 0;;
 *) exit 90;;
esac
''',
            'curl': '''#!/bin/sh
case "$*" in
 *assets*) printf '%s' "$JS_CONTENT";;
 *) printf '%s' "$HTML_CONTENT";;
esac
''',
            'tar': '''#!/bin/sh
printf '%s\\n' 'drwx------ 65532/65532 0 date var/lib/hennery/' 'drwxr-xr-x 0/0 0 date var/lib/'
''',
        }
        for name, body in scripts.items():
            path = root / name
            path.write_text(body)
            path.chmod(0o755)

    def run_smoke(self):
        return subprocess.run(['sh', str(SCRIPT), 'stub-image'], env=self.env,
                               capture_output=True, text=True)

    def test_all_smoke_assertions_pass(self):
        result = self.run_smoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('embedded UI and module asset served', result.stdout)

    def test_actual_process_root_is_refused(self):
        self.env['PROCESS_UID'] = '0'
        result = self.run_smoke()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('running process UID', result.stderr)

    def test_failed_docker_top_is_refused_even_with_valid_stdout(self):
        self.env['TOP_STATUS'] = '1'
        result = self.run_smoke()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('cannot inspect running processes', result.stderr)

    def test_image_config_root_is_refused(self):
        self.env['IMAGE_USER'] = '0:0'
        self.assertIn('image runs as', self.run_smoke().stderr)

    def test_open_volume_is_refused(self):
        self.env['DATA_MODE'] = '65532:65532 755'
        self.assertIn('data directory', self.run_smoke().stderr)

    def test_public_port_is_refused(self):
        self.env['PORT'] = '0.0.0.0:12345'
        self.assertIn('not loopback', self.run_smoke().stderr)

    def test_missing_ui_root_is_refused(self):
        self.env['HTML_CONTENT'] = '<html>not the UI</html>'
        self.assertIn('UI root missing', self.run_smoke().stderr)

    def test_placeholder_is_refused(self):
        self.env['HTML_CONTENT'] = '<div id="root">hennery-web-ui-not-embedded</div>'
        self.assertIn('placeholder UI', self.run_smoke().stderr)

    def test_missing_chunk_is_refused(self):
        self.env['HTML_CONTENT'] = '<div id="root"></div>'
        self.assertIn('no embedded module', self.run_smoke().stderr)

    def test_empty_chunk_is_refused(self):
        self.env['JS_CONTENT'] = ''
        self.assertIn('empty UI module', self.run_smoke().stderr)


class ProcessListing(unittest.TestCase):
    def parse(self, listing):
        return subprocess.run(['awk', '-f', str(SCRIPT.with_name('image-processes.awk'))],
                              input=listing, capture_output=True, text=True)

    def test_numeric_uid_with_pid_and_arbitrary_user_name(self):
        for listing in ['PID UID USER\n123 65532 nonroot\n',
                        '    PID   UID USER\n  456 65532 65532\n',
                        'PID UID USER\n123 65532 nonroot\n124 65532 nonroot\n']:
            with self.subTest(listing=listing):
                result = self.parse(listing)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, '65532\n')

    def test_root_or_ambiguous_process_listing_is_refused(self):
        for listing in ['', 'UID\n65532\n', 'PID UID USER\n',
                        'PID UID USER\n123 0 root\n',
                        'PID UID USER\n123 65532 nonroot\n124 0 root\n',
                        'PID UID USER\n123 nonroot nonroot\n',
                        'PID UID USER\n123 1000 user\n',
                        'PID UID USER\nzero 65532 nonroot\n',
                        'PID UID USER\n123x 65532 nonroot\n',
                        'PID UID USER\n0 65532 nonroot\n',
                        'PID UID USER\n123 65532\n',
                        'PID UID USER\n123 65532 nonroot extra\n',
                        'PID USER UID\n123 nonroot 65532\n',
                        'UID PID USER\n123 65532 nonroot\n',
                        'PID USER UID\n123 65532 nonroot\n',
                        'PID UID NAME\n123 65532 nonroot\n',
                        'PID UID USER\n123 65532 nonroot\n\n']:
            with self.subTest(listing=listing):
                result = self.parse(listing)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, '')


if __name__ == '__main__':
    unittest.main()
