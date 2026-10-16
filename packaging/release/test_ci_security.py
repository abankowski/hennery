"""Keep release qualification and fresh dependency checks runnable before tagging."""
from pathlib import Path
import unittest

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]


class CiSecurity(unittest.TestCase):
    def workflow(self, name):
        return workflow_policy.load_workflow((ROOT / '.github/workflows' / name).read_bytes())

    def test_release_and_ci_share_linux_test_environment(self):
        ci = self.workflow('ci.yml')['jobs']['rust']
        release = self.workflow('release.yml')['jobs']['qualification']
        for job in (ci, release):
            steps = [s for s in job['steps'] if 'sh packaging/ci-rust-tests.sh' in s.get('run', '')]
            self.assertEqual(len(steps), 1)
            self.assertEqual(steps[0]['env']['HENNERY_REQUIRE_SHELLS'], "${{ runner.os == 'Linux' && 'bash,zsh,fish' || '' }}")
            self.assertEqual(steps[0]['env']['HENNERY_REQUIRE_SYSTEMD_ANALYZE'], "${{ runner.os == 'Linux' && '1' || '' }}")
        script = (ROOT / 'packaging/ci-rust-tests.sh').read_text()
        for guard in ('set -eu', '--no-run', 'unshare --net', 'ip link set lo up',
                      'prlimit --nofile=65536:1048576', '--reuid="$SUDO_UID"',
                      '--regid="$SUDO_GID"', '--init-groups', '--locked --offline'):
            self.assertIn(guard, script)

    def test_audits_run_on_pr_and_schedule_without_publication_authority(self):
        data = self.workflow('security-audit.yml')
        workflow_policy.check(data, 'security-audit.yml')
        trigger = data.get('on', data.get(True))
        self.assertIn('pull_request', trigger)
        self.assertTrue(trigger['schedule'][0]['cron'])
        self.assertEqual(data['permissions'], {'contents': 'read'})
        jobs = data['jobs']
        self.assertEqual(set(jobs), {'rust', 'web'})
        commands = '\n'.join(s.get('run', '') for j in jobs.values() for s in j['steps'])
        self.assertIn('mktemp -d', commands)
        self.assertIn('cargo-audit audit --file Cargo.lock --db "$audit_db"', commands)
        self.assertNotIn('--no-fetch', commands)
        self.assertNotIn('--stale', commands)
        self.assertNotIn('--ignore', commands)
        self.assertIn('pnpm --dir web audit', commands)
        self.assertNotIn('--offline', commands)
        self.assertNotIn('continue-on-error', str(data))
        for job in jobs.values():
            self.assertGreater(job['timeout-minutes'], 0)
            self.assertNotIn('environment', job)
            for step in job['steps']:
                if step.get('uses', '').startswith('actions/checkout@'):
                    self.assertIs(step['with']['persist-credentials'], False)
