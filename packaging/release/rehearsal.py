#!/usr/bin/env python3
"""Generate the real release graph with unsigned local authentication stubs.

No tag is created. No attestations or publication entry points are invoked.
Production configuration/verify remain signed-tag and provenance gates.
"""
import argparse
import copy
import os
from pathlib import Path
import tomllib

import contract
import gate
import release_run
import supply
import workflow_policy

ROOT = Path(__file__).resolve().parents[2]
SHARED_JOBS = ('web-ui', 'archive', 'crates', 'assemble', 'ghcr', 'installer',
               'homebrew-native', 'homebrew', 'qualification')
# Every production job needs an explicit rehearsal decision. Adding a job must
# fail generation until its execution/authority boundary has been reviewed.
JOB_DECISIONS = {
    **dict.fromkeys(SHARED_JOBS, 'include: copy complete qualification job'),
    'tag-signature': 'replace: unsigned local configuration; exclude signed-tag authentication',
    'attest': 'replace: local byte verification; exclude OIDC/signing and attested upload',
    'publish': 'exclude: protected publication and all credentials',
}
# Identity, triggers, permissions, caching and cancellation use the PR context;
# env/defaults are carried through and jobs use JOB_DECISIONS.
WORKFLOW_FIELDS = {'name', 'on', True, 'permissions', 'jobs', 'env', 'defaults', 'concurrency'}
JOB_FIELDS = {'name', 'needs', 'if', 'runs-on', 'timeout-minutes', 'permissions',
              'strategy', 'steps', 'env', 'defaults', 'concurrency', 'continue-on-error'}
STEP_FIELDS = {'name', 'id', 'if', 'uses', 'with', 'env', 'run', 'shell',
               'working-directory', 'timeout-minutes', 'continue-on-error'}
PATHS = ['.github/workflows/**', '.github/actions/**', 'packaging/**', 'Cargo.toml', 'Cargo.lock', 'dist-workspace.toml', 'flake.nix', 'flake.lock', 'nix/**', '.cargo/**', 'rust-toolchain*', 'crates/**/build.rs', 'web/package.json', 'web/pnpm-lock.yaml', 'web/*.config.*', 'web/tsconfig*.json', 'adapters/**', 'crates/hennery-host/manifest.json']
CHECKOUT = 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262'
NIX = 'cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24'
NIX_CACHE = 'DeterminateSystems/magic-nix-cache-action@565684385bcd71bad329742eefe8d12f2e765b39'


def require_handled(real):
    def fields(value, allowed, location):
        unknown = set(value) - allowed
        if unknown:
            raise ValueError(f'unhandled production {location} fields: {unknown}')
    fields(real, WORKFLOW_FIELDS, 'workflow')
    if set(real['jobs']) != set(JOB_DECISIONS):
        raise ValueError('production jobs require explicit rehearsal include/exclude decisions')
    if 'concurrency' in real:
        fields(real['concurrency'], {'group', 'cancel-in-progress'}, 'concurrency')
    for name, job in real['jobs'].items():
        if name == 'tag-signature':
            # The whole authentication job is replaced, including its execution
            # settings. Reject new settings rather than silently dropping them.
            allowed = {'name', 'runs-on', 'timeout-minutes', 'permissions', 'outputs', 'steps'}
        elif name == 'publish':
            allowed = {'name', 'needs', 'if', 'environment', 'runs-on',
                       'timeout-minutes', 'permissions', 'steps'}
        else:
            allowed = JOB_FIELDS | ({'outputs'} if name == 'attest' else set())
        fields(job, allowed, name)
        for step in job['steps']:
            fields(step, STEP_FIELDS, name + ' step')


def context():
    # A synthetic tag *context* matching the built version, never a git ref.
    version = tomllib.loads((ROOT / 'Cargo.toml').read_text())['workspace']['package']['version']
    real = workflow_policy.load_workflow((ROOT / contract.WORKFLOW).read_bytes())
    channels = contract.selected_channels((ROOT / 'packaging/release/channels.json').read_bytes(), real)
    return {'tag': 'v' + version, 'tag_object': '0' * 40, 'channels': channels}


def source():
    import subprocess
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    gate.require(sha == os.environ['GITHUB_SHA'], 'rehearsal source differs from checkout')
    print('RELEASE_SOURCE_SHA=' + sha)


def freeze(root):
    value = context()
    release_run.freeze_payload(root, value, value['tag'], os.environ['GITHUB_SHA'], int(os.environ['GITHUB_RUN_ID']))


def verify(root):
    """Local byte/supply checks only; explicitly no signed-tag/provenance claim."""
    value = release_run.check_original(root)
    expected = context()
    gate.require(value['source_sha'] == os.environ['GITHUB_SHA'] and value['tag'] == expected['tag']
                 and value['tag_object'] == expected['tag_object'] and value['channels'] == expected['channels'],
                 'unsigned rehearsal context differs')
    print('UNSIGNED REHEARSAL: checksum, supply and binary inventory verified; no tag or provenance verification')


def workflow(real):
    """All native jobs/steps come from release.yml, including artifact transport.

    Authentication and CI caching/cancellation differ; permissions, runners, matrices, needs,
    conditions, build commands and upload/download steps remain identical.
    The policy compares the entire generated object, making drift a failure.
    """
    require_handled(real)
    jobs = {'tag-signature': {
        'name': 'tag-signature', 'runs-on': 'ubuntu-24.04', 'timeout-minutes': 15,
        'permissions': {'contents': 'read'},
        'outputs': {key: '${{ steps.configuration.outputs.' + key + ' }}'
                    for key in ('channels', 'channels_csv', 'tag_object', 'tag')},
        'steps': [
            {'uses': CHECKOUT, 'with': {'ref': '${{ github.sha }}', 'fetch-depth': 0, 'persist-credentials': False}},
            {'uses': NIX},
            {'id': 'configuration', 'name': 'UNSIGNED rehearsal context; no tag-signature verification',
             'run': 'nix develop .#release -c python3 packaging/release/rehearsal.py configure >> "$GITHUB_OUTPUT"'},
        ],
    }}
    for name in SHARED_JOBS:
        job = copy.deepcopy(real['jobs'][name])
        for step in job['steps']:
            # Avoid passing even the read-only built-in token to Nix setup.
            if step.get('uses') == NIX:
                step.get('with', {}).pop('github_access_token', None)
                if step.get('with') == {}:
                    step.pop('with')
            for key, value in step.get('env', {}).items():
                if value == '${{ github.ref_name }}':
                    step['env'][key] = '${{ needs.tag-signature.outputs.tag }}'
            if step.get('name') == 'Annotated tag, exact source and workspace version':
                step['name'] = 'UNSIGNED rehearsal exact source; no git tag required'
                step['run'] = 'python3 packaging/release/rehearsal.py source >> "$GITHUB_ENV"'
            if 'run' in step:
                step['run'] = step['run'].replace('packaging/release/release_run.py freeze target/distrib',
                                                'packaging/release/rehearsal.py freeze target/distrib')
        jobs[name] = job
    jobs['verify'] = {
        'name': 'verify', 'needs': copy.deepcopy(real['jobs']['attest']['needs']),
        'if': real['jobs']['attest']['if'],
        'runs-on': copy.deepcopy(real['jobs']['attest']['runs-on']),
        'timeout-minutes': real['jobs']['attest']['timeout-minutes'], 'permissions': {'contents': 'read'},
        'steps': [
            {'uses': CHECKOUT, 'with': {'ref': '${{ github.sha }}', 'persist-credentials': False}},
            {'uses': NIX},
            # Exactly the same payload download as the production attester.
            copy.deepcopy(next(s for s in real['jobs']['attest']['steps']
                               if s.get('uses', '').startswith('actions/download-artifact@'))),
            {'name': 'UNSIGNED local verification stub; no attest or publish',
             'run': 'nix develop .#release -c python3 packaging/release/rehearsal.py verify payload'},
        ],
    }
    # Preserve attester execution settings around the local verification stub;
    # its outputs/steps/permissions are authority and intentionally substituted.
    for field in JOB_FIELDS - {'name', 'needs', 'if', 'runs-on', 'timeout-minutes', 'permissions', 'steps'}:
        if field in real['jobs']['attest']:
            jobs['verify'][field] = copy.deepcopy(real['jobs']['attest'][field])
    result = {'name': 'release-rehearsal',
            'on': {'pull_request': {'paths': PATHS}, 'push': {'branches': ['main'], 'paths': PATHS}},
            'permissions': {'contents': 'read'}}
    for field in ('env', 'defaults'):
        if field in real:
            result[field] = copy.deepcopy(real[field])
    # Superseded PRs cancel; main commits remain independent of each other.
    # The real tag workflow retains its per-tag publication serialization.
    result['concurrency'] = {
        'group': '${{ github.workflow }}-${{ github.event.pull_request.number || github.run_id }}',
        'cancel-in-progress': "${{ github.event_name == 'pull_request' }}",
    }
    for name, job in jobs.items():
        # Package acceptance intentionally changes HOME/config directories;
        # keep that complete candidate build uncached, like crates.yml.
        if name == 'crates':
            continue
        steps = []
        for step in job['steps']:
            steps.append(step)
            if step.get('uses') == NIX:
                cache = {'uses': NIX_CACHE, 'with': {
                    'use-gha-cache': True, 'use-flakehub': False, 'diagnostic-endpoint': '',
                }}
                if 'if' in step:
                    cache['if'] = step['if']
                steps.append(cache)
        job['steps'] = steps
    result['jobs'] = jobs
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('operation', choices=('generate', 'configure', 'source', 'freeze', 'verify'))
    parser.add_argument('root', nargs='?', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.operation == 'generate':
        import yaml
        real = workflow_policy.load_workflow((ROOT / contract.WORKFLOW).read_bytes())
        data = workflow(real)
        path = ROOT / '.github/workflows/release-rehearsal.yml'
        if args.check:
            gate.require(workflow_policy.load_workflow(path.read_bytes()) == data, 'release rehearsal drift; regenerate')
        else:
            path.write_text('# Generated from release.yml by packaging/release/rehearsal.py generate.\n'
                            '# UNSIGNED local verification replaces tag authentication and attest; nothing publishes.\n'
                            + yaml.safe_dump(data, sort_keys=False))
    elif args.operation == 'configure':
        value = context()
        print('channels=' + gate.canonical(value['channels']).decode().strip())
        print('channels_csv=' + ','.join(value['channels']) + '\ntag_object=' + value['tag_object'] + '\ntag=' + value['tag'])
    elif args.operation == 'source': source()
    else:
        if args.root is None: parser.error('payload directory required')
        (freeze if args.operation == 'freeze' else verify)(args.root)


if __name__ == '__main__':
    main()
