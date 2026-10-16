"""Offline transport only: no token, signature, registry or tap access."""
import base64
import copy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import test_homebrew
import homebrew_publish as publisher


class Transport(unittest.TestCase):
    def test_fixed_tap_path_credential_confinement_and_no_redirect(self):
        calls=[]
        class Response:
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self): return b'{}'
        class Opener:
            def open(self,request,timeout): calls.append(request);return Response()
        def opener(handler):
            self.assertIsNone(handler.redirect_request(None,None,302,None,None,'https://example.invalid'))
            return Opener()
        with patch.object(publisher.urllib.request,'build_opener',side_effect=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
            publisher.tap_api('GET');publisher.tap_api('PUT',{'content':'eA==','branch':'main'})
        self.assertEqual(calls[0].full_url,'https://api.github.com'+publisher.TAP_PATH+'?ref=main')
        self.assertNotIn('Authorization',calls[0].headers)
        self.assertEqual(calls[1].full_url,'https://api.github.com'+publisher.TAP_PATH)
        self.assertEqual(calls[1].headers['Authorization'],'Bearer offline-fixture')
        self.assertEqual(calls[1].data,gate.canonical({'content':'eA==','branch':'main'}))

    def test_only_authoritative_get_404_is_absence(self):
        import urllib.error
        for method in ('GET','PUT'):
            for code in (301,302,403,404,409,500):
                opener=unittest.mock.Mock()
                import io
                error=urllib.error.HTTPError('https://example.invalid',code,'fixture',{},io.BytesIO())
                self.addCleanup(error.close)
                opener.open.side_effect=error
                with patch.object(publisher.urllib.request,'build_opener',return_value=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
                    if method=='GET' and code==404:self.assertIsNone(publisher.tap_api(method))
                    else:
                        with self.subTest(method=method,code=code),self.assertRaises(gate.Refused):publisher.tap_api(method)
                self.assertEqual(opener.open.call_count,1)
