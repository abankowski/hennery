import unittest
import gate
import post_setup

class PlatformAcceptance(unittest.TestCase):
    def test_real_push_operation_is_refused_after_working_read(self):
        calls=[]
        def transport(operation):
            calls.append(operation)
            return (200,b'known') if operation=='read' else (403,b'denied')
        record=post_setup.assert_ghcr_denied(transport,gate.digest(b'known'))
        self.assertEqual(calls,['read','push'])
        self.assertEqual(record,{'read_status':200,'push_status':403,'credential':'GITHUB_TOKEN'})

    def test_success_ambiguous_errors_and_bad_reads_never_qualify(self):
        for read,push in [(200,201),(200,202),(200,500),(401,403),(404,403)]:
            with self.subTest(read=read,push=push),self.assertRaises(gate.Refused):
                post_setup.assert_ghcr_denied(lambda operation:(read,b'known') if operation=='read' else (push,b'result'),gate.digest(b'known'))
        with self.assertRaises(gate.Refused):
            post_setup.assert_ghcr_denied(lambda operation:(200,b'wrong') if operation=='read' else (403,b'denied'),gate.digest(b'known'))
