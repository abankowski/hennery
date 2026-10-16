from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock
import io
import urllib.error

import gate
import publish


class Publication(unittest.TestCase):
    def response(self, body):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = body
        return response

    def test_upload_uses_upload_host_and_exact_binary_body(self):
        opener = Mock(); opener.open.return_value = self.response(b'{"id":123}')
        with patch.dict('os.environ', {'GH_TOKEN': 'offline-fixture'}), patch.object(publish.urllib.request, 'build_opener', return_value=opener):
            publish.api('/repos/' + gate.REPOSITORY + '/releases/42/assets?name=archive.tar.xz',
                        method='POST', data=b'archive', content_type='application/octet-stream')
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, 'https://uploads.github.com/repos/' + gate.REPOSITORY + '/releases/42/assets?name=archive.tar.xz')
        self.assertEqual(request.data, b'archive')
        self.assertEqual(request.get_header('Content-type'), 'application/octet-stream')
        self.assertEqual(request.get_header('Authorization'), 'Bearer offline-fixture')

    def test_binary_download_redirect_strips_authority_and_refuses_other_hosts(self):
        for location in ('https://release-assets.githubusercontent.com/signed?sig=fixture',
                         'https://objects.githubusercontent.com/signed',
                         'http://release-assets.githubusercontent.com/unsafe',
                         'https://other.invalid/unsafe',
                         'https://user@release-assets.githubusercontent.com/unsafe',
                         'https://release-assets.githubusercontent.com:444/unsafe'):
            with self.subTest(location=location):
                error = urllib.error.HTTPError('https://api.github.com', 302, 'redirect', {'Location': location}, io.BytesIO())
                opener = Mock(); opener.open.side_effect = [error, self.response(b'accepted bytes')]
                with patch.dict('os.environ', {'GH_TOKEN': 'offline-fixture'}), patch.object(publish.urllib.request, 'build_opener', return_value=opener):
                    if location.startswith(('https://release-assets.githubusercontent.com/', 'https://objects.githubusercontent.com/')):
                        self.assertEqual(publish.api('/repos/' + gate.REPOSITORY + '/releases/assets/7', binary=True), b'accepted bytes')
                        redirected = opener.open.call_args.args[0]
                        self.assertEqual(redirected.full_url, location)
                        self.assertFalse(redirected.has_header('Authorization'))
                        handler = publish.urllib.request.build_opener.call_args.args[0]
                        self.assertIsNone(handler.redirect_request(None, None, None, None, None, None))
                    else:
                        with self.assertRaises(gate.Refused):
                            publish.api('/repos/' + gate.REPOSITORY + '/releases/assets/7', binary=True)
                        self.assertEqual(opener.open.call_count, 1)

    def test_absent_release_is_distinguished_from_write_or_binary_failure(self):
        for method, binary in [('GET', False), ('POST', False), ('GET', True)]:
            opener = Mock(); opener.open.side_effect = urllib.error.HTTPError('https://api.github.com', 404, 'missing', {}, io.BytesIO())
            with self.subTest(method=method, binary=binary), patch.dict('os.environ', {'GH_TOKEN': 'offline-fixture'}), patch.object(publish.urllib.request, 'build_opener', return_value=opener):
                if method == 'GET' and not binary:
                    self.assertIsNone(publish.api('/repos/' + gate.REPOSITORY + '/releases/tags/v0.1.0'))
                else:
                    with self.assertRaises(gate.Refused): publish.api('/repos/' + gate.REPOSITORY + '/releases', method=method, binary=binary)

    def test_assets_are_paginated_and_truncated_or_unavailable_listing_refuses(self):
        page = [{'name': str(n)} for n in range(100)]
        with patch.object(publish, 'api', side_effect=[page, [{'name': 'last'}]]) as api:
            self.assertEqual(len(publish.release_assets({'id': 42})), 101)
            self.assertTrue(api.call_args.args[0].endswith('page=2'))
        for result in (page, None, {}):
            with self.subTest(result=type(result).__name__), patch.object(publish, 'api', return_value=result), self.assertRaises(gate.Refused):
                publish.release_assets({'id': 42})

    def test_remote_status_and_digest_reconciliation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'payload').write_bytes(b'approved')
            expected = {'payload': gate.digest(b'approved')}
            for existing, body, result in [([], None, ['payload']), ([{'name': 'payload', 'url': '/asset'}], b'approved', [])]:
                with patch.object(publish, 'asset_bytes', return_value=body):
                    self.assertEqual(publish.plan(expected, existing)['missing'], result)
            for body in (None, b'wrong'):
                with patch.object(publish, 'asset_bytes', return_value=body), self.assertRaises(gate.Refused):
                    publish.plan(expected, [{'name': 'payload', 'url': '/asset'}])
            with self.assertRaises(gate.Refused):
                publish.plan(expected, [{'name': 'extra', 'url': '/asset'}])

    def test_publication_switch_cannot_be_omitted(self):
        with patch.dict('os.environ', {}, clear=True), self.assertRaises(gate.Refused):
            publish.require_enabled()
