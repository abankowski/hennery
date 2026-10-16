#!/usr/bin/env python3
"""Maintainer-only post-setup negative push acceptance; NEVER run by unit tests.

Run in an explicitly authorized disposable branch job with packages:write,
GITHUB_TOKEN, no environment and no dedicated publishing credential. If setup
is wrong this can create a canary index: stop and repair access before release.
"""
import argparse
import base64
import os
import re
import urllib.error
import urllib.request

import gate


def assert_ghcr_denied(transport, expected_digest):
    status, data = transport('read')
    gate.require(status == 200 and gate.digest(data) == expected_digest, 'negative push check needs working verified read access')
    status, _ = transport('push')
    gate.require(status == 403, 'GITHUB_TOKEN push was not authoritatively refused; stop publication and repair package access')
    return {'read_status': 200, 'push_status': 403, 'credential': 'GITHUB_TOKEN'}


def require_no_release_credentials(environment):
    gate.require(not any(environment.get(name) for name in
                 ('GHCR_PUBLISH_TOKEN', 'RELEASE_HOMEBREW_TOKEN', 'RELEASE_CRATES_BOOTSTRAP_TOKEN', 'CARGO_REGISTRY_TOKEN')),
                 'negative acceptance must never receive dedicated release credentials')


def request(url, headers, method='GET', data=None):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url, headers=headers, method=method, data=data), timeout=30) as response:
            return response.status, response.read(1024*1024)
    except urllib.error.HTTPError as error:
        return error.code, error.read(1024*1024)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-digest', required=True, help='SHA256 of a known existing package manifest/index, without prefix')
    args = parser.parse_args()
    gate.require(re.fullmatch('[0-9a-f]{64}', args.expected_digest), 'invalid known image digest')
    gate.require(os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('GITHUB_REPOSITORY') == gate.REPOSITORY and os.environ.get('GITHUB_REF', '').startswith('refs/heads/'), 'acceptance must use a branch Actions job')
    require_no_release_credentials(os.environ)
    basic = base64.b64encode((os.environ['GITHUB_ACTOR']+':'+os.environ['GITHUB_TOKEN']).encode()).decode()
    token_url = 'https://ghcr.io/token?service=ghcr.io&scope=repository:marcinwadon/hennery:'
    status, data = request(token_url+'pull', {'Authorization':'Basic '+basic})
    gate.require(status == 200, 'read authentication failed; not a valid negative push test')
    read_token = gate.strict_json(data)['token']
    def transport(operation):
        if operation == 'read':
            return request('https://ghcr.io/v2/marcinwadon/hennery/manifests/sha256:'+args.expected_digest, {'Authorization':'Bearer '+read_token,'Accept':'application/vnd.oci.image.index.v1+json,application/vnd.oci.image.manifest.v1+json'})
        status, data = request(token_url+'pull,push', {'Authorization':'Basic '+basic})
        if status != 200:
            return status, data
        push_token = gate.strict_json(data)['token']
        canary = 'release-negative-' + str(int(os.environ['GITHUB_RUN_ID'])) + '-' + str(int(os.environ['GITHUB_RUN_ATTEMPT']))
        return request('https://ghcr.io/v2/marcinwadon/hennery/manifests/'+canary, {'Authorization':'Bearer '+push_token,'Content-Type':'application/vnd.oci.image.index.v1+json'}, 'PUT', gate.canonical({'schemaVersion':2,'mediaType':'application/vnd.oci.image.index.v1+json','manifests':[]}))
    print(gate.canonical(assert_ghcr_denied(transport,args.expected_digest)).decode())


if __name__ == '__main__':
    main()
