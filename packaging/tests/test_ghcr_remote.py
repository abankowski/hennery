"""Registry HTTP classification; fake responses, no network or credentials."""
import base64
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

SPEC = importlib.util.spec_from_file_location('ghcr_remote', Path(__file__).parents[1] / 'ghcr-remote.py')
remote = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(remote)


class Response(io.BytesIO):
    status = 200


class HTTP(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.authfile = Path(scratch.name) / 'auth.json'
        self.auth = base64.b64encode(b'fixture:never-real-credentials').decode()
        self.authfile.write_text(json.dumps({'auths': {'ghcr.io': {'auth': self.auth}}}))
        self.body = b'{"schemaVersion":2,"manifests":[]}'
        self.digest = 'sha256:' + hashlib.sha256(self.body).hexdigest()
        self.status, self.codes = 200, ['MANIFEST_UNKNOWN']
        self.token_status = 200
        self.token = 'fixture-bearer'
        self.token_response_status = self.manifest_response_status = 200
        self.calls = []

    def open(self, request, timeout):
        self.calls.append((request, timeout))
        token_request = '/token?' in request.full_url
        status = self.token_status if token_request else self.status
        if status == 200:
            response = Response(json.dumps({'token': self.token}).encode() if token_request else self.body)
            response.status = self.token_response_status if token_request else self.manifest_response_status
            return response
        body = json.dumps({'errors': [{'code': code} for code in self.codes]}).encode()
        raise urllib.error.HTTPError(request.full_url, status, 'fixture', {}, io.BytesIO(body))

    def check(self):
        return remote.reconcile('0.1.0-alpha.1', self.digest, self.authfile, self)

    def test_matching_bytes_and_fixed_authenticated_requests(self):
        self.assertEqual(self.check(), 0)
        token, manifest = [request for request, _ in self.calls]
        self.assertTrue(token.full_url.startswith('https://ghcr.io/token?'))
        self.assertEqual(token.get_header('Authorization'), 'Basic ' + self.auth)
        self.assertEqual(manifest.full_url, 'https://ghcr.io/v2/marcinwadon/hennery/manifests/0.1.0-alpha.1')
        self.assertEqual(manifest.get_header('Authorization'), 'Bearer fixture-bearer')
        self.assertEqual([timeout for _, timeout in self.calls], [30, 30])

    def test_mismatched_remote_digest_refuses(self):
        self.body = b'other manifest bytes'
        with self.assertRaisesRegex(ValueError, 'digest mismatch'):
            self.check()

    def test_only_authenticated_404_with_explicit_absence_is_absent(self):
        self.status = 404
        for code in ['MANIFEST_UNKNOWN', 'NAME_UNKNOWN']:
            self.codes = [code]
            self.assertEqual(self.check(), 1)

    def test_same_absent_body_on_auth_server_or_redirect_status_refuses(self):
        for status in [301, 302, 307, 401, 403, 408, 429, 500, 503]:
            with self.subTest(status=status):
                self.status = status
                with self.assertRaisesRegex(ValueError, 'cannot be reconciled'):
                    self.check()

    def test_ambiguous_404_refuses(self):
        self.status = 404
        for codes in [[], ['DENIED'], ['MANIFEST_UNKNOWN', 'UNAUTHORIZED']]:
            with self.subTest(codes=codes):
                self.codes = codes
                with self.assertRaisesRegex(ValueError, 'cannot be reconciled'):
                    self.check()

    def test_token_auth_failure_cannot_be_classified_as_absent(self):
        self.token_status = 401
        with self.assertRaises(urllib.error.HTTPError):
            self.check()
        self.assertEqual(len(self.calls), 1)

    def test_invalid_credentials_refuse_before_http(self):
        for auth in ['invalid', base64.b64encode(b'no-separator').decode()]:
            self.authfile.write_text(json.dumps({'auths': {'ghcr.io': {'auth': auth}}}))
            with self.assertRaises(ValueError):
                self.check()
        self.assertEqual(self.calls, [])

    def test_invalid_boundary_arguments_refuse_before_http(self):
        for version, digest in [('latest', self.digest), ('0.1.0', 'invalid')]:
            with self.subTest(version=version, digest=digest):
                with self.assertRaises(ValueError):
                    remote.reconcile(version, digest, self.authfile, self)
        self.assertEqual(self.calls, [])

    def test_invalid_token_refuses_before_manifest_request(self):
        for token in ['', None, 'injected\r\nheader']:
            with self.subTest(token=token):
                self.calls.clear()
                self.token = token
                with self.assertRaisesRegex(ValueError, 'invalid registry authorization'):
                    self.check()
                self.assertEqual(len(self.calls), 1)

    def test_unexpected_success_response_status_refuses(self):
        self.token_response_status = 202
        with self.assertRaisesRegex(ValueError, 'registry authorization failed'):
            self.check()

    def test_unexpected_manifest_success_status_refuses(self):
        self.manifest_response_status = 202
        with self.assertRaisesRegex(ValueError, 'unexpected registry status'):
            self.check()

    def test_production_opener_disables_proxy_and_redirect_forwarding(self):
        with patch.object(remote.urllib.request, 'build_opener', return_value=self) as factory:
            self.assertEqual(remote.reconcile('0.1.0', self.digest, self.authfile), 0)
        proxy, redirects = factory.call_args.args
        self.assertEqual(proxy.proxies, {})
        self.assertIsInstance(redirects, remote.NoRedirect)

    def test_redirects_are_refused(self):
        self.assertIsNone(remote.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid'))

    def test_cli_exception_output_never_contains_registry_secrets(self):
        error = io.StringIO()
        with patch.object(remote, 'reconcile', side_effect=RuntimeError('fixture-secret')):
            with contextlib.redirect_stderr(error):
                self.assertEqual(remote.main(), 2)
        self.assertNotIn('fixture-secret', error.getvalue())


if __name__ == '__main__':
    unittest.main()
