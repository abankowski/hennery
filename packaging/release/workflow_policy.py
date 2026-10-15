#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys

import yaml


CREDENTIAL_CONDITION = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256"


def privileged(job):
    return any(job.get('permissions', {}).get(scope) == 'write' for scope in ('contents', 'packages', 'attestations', 'id-token')) or any(
        s.get('uses', '').startswith(('actions/create-github-app-token@', 'rust-lang/crates-io-auth-action@')) or 'publish.py upload' in s.get('run', '')
        for s in job.get('steps', []))


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def writer(name, job):
    # Protected-environment secrets can be publication credentials even when
    # the ordinary job token is read-only (for example crates.io bootstrap).
    return privileged(job) or (environment_name(job) == 'release' and name != 'authorize')


def check(data, name):
    jobs = data.get('jobs', {})
    writers = [j for key, j in jobs.items() if writer(key, dict(j, permissions=j.get('permissions', data.get('permissions', {}))))]
    if writers:
        authorization = jobs.get('authorize', {})
        effective = dict(authorization, permissions=authorization.get('permissions', data.get('permissions', {})))
        if not authorization or privileged(effective) or authorization.get('environment') != 'release':
            raise ValueError('a protected read-only authorization job must precede credential issuance')
        proof = [s.get('with', {}).get('phase') for s in authorization.get('steps', []) if s.get('uses') == './.github/actions/release-gate']
        if proof != ['preflight']:
            raise ValueError('credential authorization must run the live preflight gate')
    for key, job in jobs.items():
        if 'uses' in job:
            raise ValueError(f'{name}/{key}: reusable jobs need explicit authority review; put the gate inside the protected callee')
        if not job.get('timeout-minutes'):
            raise ValueError(f'{name}/{key}: timeout required')
        permissions = job.get('permissions', data.get('permissions', {}))
        effective = dict(job, permissions=permissions)
        if job.get('continue-on-error') not in (None, False):
            raise ValueError('release jobs cannot ignore failures')
        for step in job.get('steps', []):
            if step.get('uses') == './.github/actions/release-gate' and (step.get('if') is not None or step.get('continue-on-error') not in (None, False)):
                raise ValueError('release gates must run unconditionally and stop on failure')
        if writer(key, effective):
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if 'authorize' not in needs:
                raise ValueError('writer must depend on protected credential authorization')
            condition = ' '.join(job.get('if', '').split())
            allowed = {CREDENTIAL_CONDITION} | {CREDENTIAL_CONDITION + " && vars.RELEASE_" + channel + "_ENABLED == 'true'" for channel in ('GITHUB', 'CRATES', 'GHCR', 'HOMEBREW')}
            if condition not in allowed:
                raise ValueError('credential issuance must match the authorized inventory and current run attempt')
            env = job.get('environment')
            if (env.get('name') if isinstance(env, dict) else env) != 'release':
                raise ValueError(f'{name}/{key}: protected release environment required')
            steps = job.get('steps', [])
            phases = [s.get('with', {}).get('phase') for s in steps if s.get('uses') == './.github/actions/release-gate']
            if phases != ['preflight', 'boundary']:
                raise ValueError(f'{name}/{key}: live preflight and boundary gates required')
            gates = {s['with']['phase']: i for i, s in enumerate(steps) if s.get('uses') == './.github/actions/release-gate'}
            for i, step in enumerate(steps):
                uses, run = step.get('uses', ''), step.get('run', '')
                if uses.startswith(('actions/create-github-app-token@', 'rust-lang/crates-io-auth-action@')) and not gates['preflight'] < i < gates['boundary']:
                    raise ValueError('publication credentials must be acquired after preflight and before revalidation')
                if (uses.startswith('actions/attest') or 'publish.py upload' in run) and not gates['boundary'] < i:
                    raise ValueError('signing/upload must follow boundary revalidation')
        for step in job.get('steps', []):
            uses = step.get('uses', '')
            if uses and not uses.startswith('./') and not re.fullmatch(r'[^@]+@[0-9a-f]{40}', uses):
                raise ValueError(f'{name}/{key}: action must be pinned by commit')
            if name == 'release-candidate.yml' and ('cache' in uses.lower() or 'cache:' in str(step.get('with', {}))):
                raise ValueError('candidate builds must restore no Actions cache')
    if name == 'release-publish.yml':
        # Safe defaults: dispatch only; per-channel opt-in is a separate switch.
        trigger = data.get('on', data.get(True, {}))
        if set(trigger) != {'workflow_dispatch'}:
            raise ValueError('publication must be manual only')
        for job in data['jobs'].values():
            if privileged(job) and "vars.RELEASE_PUBLICATION_ENABLED == 'true'" not in job.get('if', ''):
                raise ValueError('publication switch missing')


def check_repository(root):
    directory = Path(root) / '.github/workflows'
    paths = sorted(set(directory.glob('*.yml')) | set(directory.glob('*.yaml')))
    if not {'release-candidate.yml', 'release-publish.yml', 'release-tests.yml'} <= {p.name for p in paths}:
        raise ValueError('candidate, publish and negative-test workflows required')
    for path in paths:
        data = yaml.safe_load(path.read_text())
        authority = any(privileged(dict(job, permissions=job.get('permissions', data.get('permissions', {}))))
                        or environment_name(job) == 'release' or 'uses' in job for job in data.get('jobs', {}).values())
        # Read-only legacy qualification jobs retain their existing style.
        # Every writer/signer or reusable indirection is checked, whatever
        # the filename: a generated release.yml cannot bypass this policy.
        if path.name.startswith('release-') or authority:
            check(data, path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
