import subprocess
import unittest
from unittest.mock import patch

import gate
import tag_signature


class TagSignature(unittest.TestCase):
    def test_only_pinned_nonexpired_valid_signature_is_accepted(self):
        good = '[GNUPG:] VALIDSIG ' + tag_signature.FINGERPRINT + ' 2026-10-15 123 0 4 0 1 10 00\n'
        tag_signature.check_status(0, good)
        for code, status in [(1, good), (0, good.replace(tag_signature.FINGERPRINT, 'a' * 40)), (0, ''), (0, good + '[GNUPG:] EXPKEYSIG old\n'), (0, good + '[GNUPG:] REVKEYSIG old\n')]:
            with self.subTest(code=code, status=status), self.assertRaises(gate.Refused):
                tag_signature.check_status(code, status)

    def test_live_fetched_tag_object_signature_and_exact_commit_are_bound(self):
        def backend(args, **kwargs):
            if 'init' in args:
                self.assertIn('--bare', args)
                self.assertIn('--template=', args)
                out = ''
            elif 'fetch' in args:
                self.assertIn('https://github.com/' + gate.REPOSITORY + '.git', args)
                out = ''
            elif 'rev-parse' in args:
                out = 'b' * 40 + '\n'
            elif 'cat-file' in args:
                out = 'object ' + 'a' * 40 + '\ntype commit\ntag v0.1.0\ntagger Maintainer\n\nmessage\n'
            elif 'verify-tag' in args:
                return subprocess.CompletedProcess(args, 0, '', '[GNUPG:] VALIDSIG ' + tag_signature.FINGERPRINT + ' 2026 1 0\n')
            else:
                self.assertIn('--no-autostart', args)
                out = ''
            return subprocess.CompletedProcess(args, 0, out, '')
        with patch.object(tag_signature.subprocess, 'run', side_effect=backend):
            proof = tag_signature.verify('v0.1.0', 'a' * 40, 'b' * 40)
            self.assertEqual(proof['fingerprint'], tag_signature.FINGERPRINT)
            for tag, commit, obj in [('v0.1.0', 'c' * 40, 'b' * 40), ('v9.0.0', 'a' * 40, 'b' * 40), ('v0.1.0', 'a' * 40, 'c' * 40)]:
                with self.subTest(tag=tag, commit=commit, obj=obj), self.assertRaises(gate.Refused):
                    tag_signature.verify(tag, commit, obj)
