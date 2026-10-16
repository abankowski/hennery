#!/usr/bin/env python3
"""Reconcile GHCR bytes: 0 matching, 1 verified absent, 2 ambiguous/refused.

Never classify Skopeo stderr: it discards HTTP status for registry errors.
Credentials/token stay in memory, requests use fixed HTTPS origins, and neither
redirects nor ambient proxy configuration may forward authorization elsewhere.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def reconcile(version, expected, authfile, opener=None):
    if not re.fullmatch(r'(?:[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?|sha256:[0-9a-f]{64})', version):
        raise ValueError('invalid image version')
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', expected):
        raise ValueError('invalid image digest')
    auth = json.loads(Path(authfile).read_bytes())['auths']['ghcr.io']['auth']
    if b':' not in base64.b64decode(auth, validate=True):
        raise ValueError('missing registry credentials')
    opener = opener or urllib.request.build_opener(
        urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(
        'https://ghcr.io/token?service=ghcr.io&scope=repository%3Amarcinwadon%2Fhennery%3Apull',
        headers={'Authorization': 'Basic ' + auth})
    with opener.open(request, timeout=30) as response:
        if response.status != 200:
            raise ValueError('registry authorization failed')
        token = json.load(response)['token']
    if not isinstance(token, str) or not token or '\r' in token or '\n' in token:
        raise ValueError('invalid registry authorization')
    request = urllib.request.Request(
        'https://ghcr.io/v2/marcinwadon/hennery/manifests/' + version,
        headers={'Authorization': 'Bearer ' + token,
                 'Accept': ', '.join(['application/vnd.oci.image.index.v1+json',
                     'application/vnd.docker.distribution.manifest.list.v2+json',
                     'application/vnd.oci.image.manifest.v1+json',
                     'application/vnd.docker.distribution.manifest.v2+json'])})
    try:
        with opener.open(request, timeout=30) as response:
            if response.status != 200:
                raise ValueError('unexpected registry status')
            actual = 'sha256:' + hashlib.sha256(response.read()).hexdigest()
        if actual != expected:
            raise ValueError('published image digest mismatch; new candidate/approval required')
        return 0
    except urllib.error.HTTPError as error:
        # Only an authenticated 404 with an explicit registry classification is
        # absent. Identical MANIFEST_UNKNOWN bodies on 401/403 fail closed.
        if error.code == 404:
            errors = json.load(error).get('errors')
            if (isinstance(errors, list) and errors and
                    all(item.get('code') in ('MANIFEST_UNKNOWN', 'NAME_UNKNOWN') for item in errors)):
                return 1
        raise ValueError('remote image cannot be reconciled; refusing recovery') from None


def main():
    try:
        return reconcile(*sys.argv[1:])
    except ValueError as error:
        # Only our fixed messages are useful. JSON/base64 errors can contain
        # registry data, so the CLI emits a generic refusal for those too.
        if str(error).startswith('published image digest mismatch'):
            print(str(error), file=sys.stderr)
        else:
            print('remote image cannot be reconciled; refusing recovery', file=sys.stderr)
        return 2
    except Exception:
        print('remote image cannot be reconciled; refusing recovery', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
