#!/usr/bin/env python3
"""Maintainer-local platform settings audit; publishers only validate its digest.

No runtime publisher needs ruleset administration. UI-only registry settings are
observations explicitly confirmed by the authenticated owner, then bound into the
platform review comment. This tool is never invoked by a publishing job.
"""
import argparse
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import subprocess

import gate

CRATES = ('hennery-proto', 'hennery-view', 'hennery-gateway', 'hennery-sessions', 'hennery-host', 'hennery-kernel', 'hennery')
MAX_AGE = timedelta(hours=24)


def tag_rulesets(owner_id):
    common = {'target': 'tag', 'enforcement': 'active', 'conditions': {'ref_name': {'include': ['refs/tags/v*'], 'exclude': []}}}
    return [common | {'name': 'release-tag-creation', 'bypass_actors': [{'actor_type': 'User', 'actor_id': owner_id, 'bypass_mode': 'always'}], 'rules': [{'type': 'creation'}]},
            common | {'name': 'release-tags-immutable', 'bypass_actors': [], 'rules': [{'type': 'update'}, {'type': 'deletion'}]}]


def validate_settings(settings, channels):
    owner = settings['owner']
    gate.require(owner.get('login') == gate.REPOSITORY.split('/')[0] and owner.get('type') == 'User' and type(owner.get('id')) is int and owner['id'] > 0, 'settings audit requires the personal repository owner')
    env = settings['environment']
    gate.require(env.get('name') == 'release' and env.get('can_admins_bypass') is False, 'release environment missing or bypass not explicitly disabled')
    reviewers = [r for rule in env.get('protection_rules', []) if rule.get('type') == 'required_reviewers' for r in rule.get('reviewers', [])]
    gate.require(len(reviewers) == 1 and reviewers[0].get('type') == 'User' and reviewers[0].get('reviewer', {}).get('id') == owner['id'], 'release reviewer must be exactly the maintainer')
    gate.require(env.get('deployment_branch_policy') == {'protected_branches': False, 'custom_branch_policies': True}, 'release environment deployment restrictions missing')
    gate.require(settings.get('deployment_policies') == [{'name': 'v*', 'type': 'tag'}], 'release deployment must permit protected v* tags only')
    gate.check_tag_rules(settings.get('rulesets', []), owner['id'])
    gate.require(settings.get('repository_secrets') == [], 'repository secrets must be empty; publishing credentials belong only in release')
    gate.require(settings.get('immutable_releases') is True, 'immutable GitHub releases must be enabled')
    secrets = settings.get('release_secrets', [])
    if 'github' in channels:
        gate.require('RELEASE_PUBLISH_APP_KEY' in secrets, 'GitHub publishing credential must exist only in release')
    if 'ghcr' in channels:
        ghcr = settings.get('ghcr', {})
        gate.require(ghcr.get('repository') == gate.REPOSITORY and ghcr.get('actions_access') == 'read', 'GHCR Actions access must be READ')
        gate.require(ghcr.get('dedicated_credential') == 'GHCR_PUBLISH_TOKEN' and 'GHCR_PUBLISH_TOKEN' in secrets, 'GHCR requires its dedicated release environment credential')
        denial = ghcr.get('negative_push', {})
        gate.require(denial.get('credential') == 'GITHUB_TOKEN' and denial.get('read_status') == 200 and denial.get('push_status') == 403, 'post-setup GITHUB_TOKEN push denial must be observed with working read access')
    if 'crates' in channels:
        configs = settings.get('crates', [])
        gate.require(len(configs) == len(CRATES) and {c.get('crate') for c in configs} == set(CRATES), 'trusted publisher configuration missing for production crate closure')
        gate.require(all(c.get('repository') == gate.REPOSITORY and c.get('workflow') == 'release-publish.yml' and c.get('environment') == 'release' for c in configs), 'crates.io trusted publishing must require exact workflow and release environment')


def report(inventory, inventory_sha256, settings, now=None):
    now = now or datetime.now(timezone.utc)
    validate_settings(settings, inventory['channels'])
    return {'schema': 1, **{k: inventory[k] for k in ('repository', 'source_sha', 'tag', 'channels', 'targets', 'candidate')},
            'inventory_sha256': inventory_sha256, 'issued_at': now.isoformat(), 'auditor': settings['owner'], 'settings': settings}


def validate_report(value, expected_digest, inventory, inventory_sha256, candidate_completed_at, now=None):
    now = now or datetime.now(timezone.utc)
    gate.require(gate.digest(gate.canonical(value)) == expected_digest, 'settings audit digest differs from approval')
    gate.require(value.get('schema') == 1 and all(value.get(k) == inventory[k] for k in ('repository', 'source_sha', 'tag', 'channels', 'targets', 'candidate')) and value.get('inventory_sha256') == inventory_sha256, 'settings audit belongs to another candidate')
    issued = datetime.fromisoformat(value['issued_at'].replace('Z', '+00:00'))
    if isinstance(candidate_completed_at, str):
        candidate_completed_at = datetime.fromisoformat(candidate_completed_at.replace('Z', '+00:00'))
    gate.require(issued.tzinfo is not None and candidate_completed_at.tzinfo is not None and timedelta(0) <= now-issued <= MAX_AGE and issued >= candidate_completed_at, 'settings audit is stale, future-dated or precedes candidate completion')
    validate_settings(value['settings'], inventory['channels'])
    gate.require(value.get('auditor') == value['settings']['owner'], 'settings auditor is not the maintainer')
    return value['settings']


def gh(path):
    # Deliberately local-only. Use the maintainer's own gh login, never a CI
    # administration token or a branch-supplied evidence collector.
    gate.require(os.environ.get('GITHUB_ACTIONS') != 'true', 'settings audit must run locally by the maintainer')
    return gate.strict_json(subprocess.run(['gh', 'api', '--hostname', 'github.com', path], check=True, capture_output=True).stdout)


def pages(path, key=None):
    values = []
    for page in range(1, 101):
        result = gh(path + ('&' if '?' in path else '?') + f'per_page=100&page={page}')
        batch = result[key] if key else result
        gate.require(isinstance(batch, list), 'incomplete settings audit page')
        values.extend(batch)
        if len(batch) < 100:
            return values
    raise gate.Refused('incomplete settings audit pagination')


def collect(observations):
    user = gh('/user')
    repo = gh('/repos/' + gate.REPOSITORY)
    owner = {k: repo['owner'][k] for k in ('login', 'id', 'type')}
    gate.require(user['id'] == owner['id'] and user['login'] == owner['login'], 'local gh account must be the personal repository owner')
    prefix = '/repos/' + gate.REPOSITORY
    environment = gh(prefix + '/environments/release')
    rulesets = [gh(prefix + '/rulesets/' + str(r['id'])) for r in pages(prefix + '/rulesets')]
    return {'owner': owner, 'environment': environment,
            'deployment_policies': [{k: p[k] for k in ('name', 'type')} for p in pages(prefix + '/environments/release/deployment-branch-policies', 'branch_policies')],
            'rulesets': rulesets, 'repository_secrets': [s['name'] for s in pages(prefix + '/actions/secrets', 'secrets')],
            'release_secrets': [s['name'] for s in pages(prefix + '/environments/release/secrets', 'secrets')],
            'immutable_releases': gh(prefix + '/immutable-releases')['enabled'],
            'ghcr': observations.get('ghcr'), 'crates': observations.get('crates')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--observations', required=True, type=Path, help='maintainer UI inspection: GHCR Actions READ + negative push result, crates.io exact trusted publishers')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    raw = (args.candidate / 'release-inventory.json').read_bytes(); inventory = gate.strict_json(raw)
    gate.verify_files(inventory, args.candidate)
    import tag_signature
    signed_tag = tag_signature.verify(inventory['tag'], inventory['source_sha'])
    value = report(inventory, gate.digest(raw), collect(gate.strict_json(args.observations.read_bytes()))) | {'signed_tag': signed_tag}
    print(gate.canonical(value).decode())
    gate.require(input('Confirm the displayed API settings AND personally checked registry observations by typing ' + gate.REPOSITORY + ': ') == gate.REPOSITORY, 'maintainer settings confirmation absent')
    with args.output.open('xb') as output:
        output.write(gate.canonical(value))
    print('settings_audit_sha256=' + gate.digest(gate.canonical(value)))


if __name__ == '__main__':
    main()
