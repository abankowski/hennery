#!/usr/bin/env python3
"""Protected tap Contents API writer; imports and verification never publish.

No git push, formula regeneration, redirect, overwrite of the same release,
downgrade or automatic retry. Only the maintainer may enable this entry point.
"""
import base64
import hashlib
import os
import re
import urllib.error
import urllib.request

import gate

TAP_PATH = '/repos/marcinwadon/homebrew-tap/contents/Formula/hennery.rb'


def blob_sha(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw, usedforsecurity=False).hexdigest()


def tap_api(method='GET', data=None):
    gate.require(method in ('GET', 'PUT'), 'unsupported tap operation')
    headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    token = os.environ.get('HOMEBREW_TAP_TOKEN')
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if method == 'PUT':
        gate.require(token, 'protected tap credential absent')
        headers['Content-Type'] = 'application/json'
    # Authenticate reads when available to avoid shared-runner anonymous rate
    # limits. Only this fixed path can receive the dedicated tap credential.
    url = 'https://api.github.com' + TAP_PATH + ('?ref=main' if method == 'GET' else '')
    request = urllib.request.Request(url, method=method, data=gate.canonical(data) if data is not None else None, headers=headers)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
            return gate.strict_json(response.read())
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == 'GET':
            return None
        detail = ''
        try:
            message = gate.strict_json(error.read(4096)).get('message')
            if isinstance(message, str):
                detail = ' '.join(message.split())
                if token: detail = detail.replace(token, '[REDACTED]')
                detail = detail[:300]
        except (gate.Refused, OSError, AttributeError):
            pass
        raise gate.Refused(f'tap HTTP {error.code}' + (': ' + detail if detail else '')
                           + '; reconcile manually before retry') from None
    except urllib.error.URLError as error:
        raise gate.Refused('ambiguous tap response; reconcile manually before retry') from error


def remote_bytes(remote):
    gate.require(isinstance(remote, dict) and remote.get('type') == 'file' and remote.get('path') == 'Formula/hennery.rb'
                 and remote.get('encoding') == 'base64', 'unexpected tap formula object')
    try:
        raw = base64.b64decode(''.join(remote['content'].splitlines()), validate=True)
    except (KeyError, TypeError, ValueError) as error:
        raise gate.Refused('invalid tap formula encoding') from error
    gate.require(remote.get('sha') == blob_sha(raw), 'tap formula blob digest differs')
    return raw


def version(raw):
    versions = re.findall(rb'^\s*version "([0-9]+)\.([0-9]+)\.([0-9]+)"$', raw, re.M)
    gate.require(len(versions) == 1, 'tap formula must have one stable version')
    return tuple(int(n) for n in versions[0])
