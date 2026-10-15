#!/usr/bin/env python3
"""R1 v1 gate. Read-only platform checks; no signing or publication credentials.

The Python API is deliberately usable offline. The CLI ALWAYS fetches live
platform evidence; it never accepts a snapshot supplied by a candidate.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

REPOSITORY = 'marcinwadon/hennery'
REQUIRED_WORKFLOWS = ('.github/workflows/ci.yml', '.github/workflows/build.yml', '.github/workflows/nix.yml', '.github/workflows/release-tests.yml')
CHANNELS = {'github', 'crates', 'ghcr', 'homebrew'}
# Stable GitHub job names for optional candidate acceptance. R4 must name its
# single aggregate acceptance job "ghcr"; matrix work must feed that job.
CANDIDATE_CHANNEL_JOBS = {'crates': 'crates', 'ghcr': 'ghcr'}
TARGETS = {'aarch64-apple-darwin', 'aarch64-unknown-linux-musl', 'x86_64-unknown-linux-musl'}


class Refused(ValueError):
    pass


def require(condition, reason):
    if not condition:
        raise Refused(reason)


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True) + '\n').encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def strict_json(raw):
    def pairs(items):
        result = {}
        seen = set()
        for key, value in items:
            require(key.casefold() not in seen, 'duplicate or case-ambiguous JSON key')
            seen.add(key.casefold())
            result[key] = value
        return result
    try:
        return json.loads(raw, object_pairs_hook=pairs)
    except (ValueError, UnicodeError) as error:
        raise Refused(f'invalid JSON: {error}') from error


def binding(inventory, inventory_sha256, run_id, run_attempt, settings_audit_sha256=None):
    return {key: inventory[key] for key in ('repository', 'source_sha', 'tag', 'channels', 'targets', 'candidate')} | {
        'inventory_sha256': inventory_sha256, 'settings_audit_sha256': settings_audit_sha256,
        'publishing': {'run_id': int(run_id), 'run_attempt': int(run_attempt)}}


def challenge(context):
    return 'approve-release-v1:' + digest(canonical(context))


def check_tag_rules(rulesets, owner_id):
    creation, immutable = False, False
    for rule in rulesets:
        if rule.get('target') != 'tag' or rule.get('enforcement') != 'active':
            continue
        refs = rule.get('conditions', {}).get('ref_name', {})
        if refs != {'include': ['refs/tags/v*'], 'exclude': []}:
            continue
        operations = {r['type'] for r in rule.get('rules', [])}
        creation |= operations == {'creation'} and rule.get('bypass_actors') == [{'actor_type': 'User', 'actor_id': owner_id, 'bypass_mode': 'always'}]
        immutable |= {'update', 'deletion'} <= operations and rule.get('bypass_actors') == []
    require(creation and immutable, 'release tags require owner-only creation and separately immutable update/deletion with no bypass')


def verify_files(inventory, root):
    root = Path(root)
    require(inventory.get('schema') == 1, 'unsupported inventory schema')
    require(inventory.get('repository') == REPOSITORY, 'unexpected repository')
    require(re.fullmatch(r'[0-9a-f]{40}', inventory.get('source_sha', '')), 'invalid source SHA')
    require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', inventory.get('tag', '')), 'invalid release tag')
    for field, allowed in (('channels', CHANNELS), ('targets', TARGETS)):
        values = inventory.get(field)
        require(isinstance(values, list) and values and values == sorted(set(values)) and set(values) <= allowed, f'invalid {field}')
    candidate = inventory.get('candidate', {})
    require(set(candidate) == {'run_id', 'run_attempt'} and all(type(n) is int and n > 0 for n in candidate.values()), 'invalid candidate run binding')
    artifacts = inventory.get('artifacts', [])
    require(artifacts, 'empty candidate inventory')
    names = set()
    for artifact in artifacts:
        name = artifact.get('name', '')
        require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', name) and name != 'release-inventory.json', 'unsafe artifact name')
        require(name.casefold() not in names, 'duplicate artifact')
        names.add(name.casefold())
        path = root / name
        require(path.is_file() and not path.is_symlink(), f'missing/nonregular candidate artifact: {name}')
        require(type(artifact.get('size')) is int and path.stat().st_size == artifact['size'], f'candidate size changed: {name}')
        require(re.fullmatch(r'[0-9a-f]{64}', artifact.get('sha256', '')), 'invalid artifact digest')
        require(digest(path.read_bytes()) == artifact['sha256'], f'candidate digest changed: {name}')
    actual = {p.name.casefold() for p in root.iterdir() if p.name != 'release-inventory.json'}
    require(actual == names, 'candidate contains unapproved/missing files')


def path_of(run):
    return run.get('path', '').split('@', 1)[0]


def trusted_run(run, source_sha, path):
    require(run.get('head_sha') == source_sha, f'{path}: checks are not on exact source SHA')
    require(run.get('head_repository', {}).get('full_name') == REPOSITORY, f'{path}: untrusted check repository')
    require(path_of(run) == path and run.get('event') in ('push', 'workflow_dispatch'), f'{path}: untrusted check workflow/event')
    require(run.get('status') == 'completed' and run.get('conclusion') == 'success', f'{path}: missing, pending or unsuccessful checks')


def validate(inventory, expected_digest, root, context, snapshot):
    require(digest(canonical(inventory)) == expected_digest, 'inventory digest mismatch')
    verify_files(inventory, root)
    expected = binding(inventory, expected_digest, context['publishing']['run_id'], context['publishing']['run_attempt'], context.get('settings_audit_sha256'))
    require(context == expected, 'approval tuple differs from inventory')
    import settings_audit
    settings = settings_audit.validate_report(snapshot['settings_audit'], context.get('settings_audit_sha256'), inventory, expected_digest, snapshot['candidate_run']['updated_at'])
    env = settings['environment']
    reviewers = {settings['owner']['id']}
    tag = snapshot.get('tag') or {}
    require(tag.get('object', {}).get('type') == 'tag', 'release tag missing or not annotated')
    obj = snapshot.get('tag_object') or {}
    require(obj.get('tag') == inventory['tag'] and obj.get('object', {}).get('type') == 'commit' and obj.get('object', {}).get('sha') == inventory['source_sha'], 'release tag moved/deleted or wrong SHA')
    import tag_signature
    require(snapshot.get('tag_signature') == {'object_sha': tag['object']['sha'], 'commit_sha': inventory['source_sha'], 'tag': inventory['tag'], 'fingerprint': tag_signature.FINGERPRINT}, 'release tag lacks a verified pinned-maintainer signature')
    candidate = snapshot.get('candidate_run', {})
    require(candidate.get('id') == inventory['candidate']['run_id'] and candidate.get('run_attempt') == inventory['candidate']['run_attempt'], 'candidate run attempt changed')
    trusted_run(candidate, inventory['source_sha'], '.github/workflows/release-candidate.yml')
    publisher = snapshot.get('publisher_run', {})
    require(publisher.get('id') == context['publishing']['run_id'] and publisher.get('run_attempt') == context['publishing']['run_attempt'], 'publishing run attempt changed: renew approval')
    require(publisher.get('repository', {}).get('full_name') == REPOSITORY and publisher.get('event') == 'workflow_dispatch'
            and publisher.get('head_branch') == inventory['tag'] and publisher.get('head_sha') == inventory['source_sha'] and path_of(publisher) == '.github/workflows/release-publish.yml', 'unexpected publisher workflow/ref/event')
    reviews = [r for r in snapshot.get('reviews', []) if any(e.get('id') == env.get('id') and e.get('name') == 'release' for e in r.get('environments', []))]
    require(reviews, 'environment approval absent')
    require(all(r.get('state') == 'approved' for r in reviews), 'environment review includes a rejection: start a fresh dispatch')
    reviews = [r for r in reviews if r.get('comment') == challenge(context)]
    require(reviews, 'approval does not bind this inventory and publishing attempt')
    require(all(r.get('state') == 'approved' for r in reviews), 'matching approval was rejected')
    review = reviews[-1]
    require(review.get('state') == 'approved' and review.get('user', {}).get('id') in reviewers, 'approval absent/rejected or unauthorized actor')
    require(review.get('comment') == challenge(context), 'approval does not bind this inventory and publishing attempt')
    for path in REQUIRED_WORKFLOWS:
        runs = [run for run in snapshot.get('checks', []) if path_of(run) == path]
        require(runs, f'{path}: required exact-SHA checks missing')
        trusted_run(max(runs, key=lambda r: r['id']), inventory['source_sha'], path)
    return {'schema': 1, 'binding': context, 'approver': review['user'], 'decision': 'approved', 'challenge': challenge(context)}


def reconcile(inventory, root, remote):
    """None is an ambiguous/unverifiable response; absent means verified 404 only."""
    verify_files(inventory, root)
    complete, missing = [], []
    for item in inventory['artifacts']:
        name = item['name']
        if name not in remote:
            missing.append(name)
        else:
            require(remote[name] is not None and digest(remote[name]) == item['sha256'], f'remote upload ambiguous or differs: {name}')
            complete.append(name)
    return {'complete': sorted(complete), 'missing': sorted(missing)}


class GitHub:
    """Only GET; fixed origin, bounded pagination, no credential-bearing redirects."""
    def __init__(self, token):
        self.token = token

    def get(self, suffix):
        require(suffix.startswith('/') and '..' not in suffix, 'invalid API path')
        request = urllib.request.Request('https://api.github.com/repos/' + REPOSITORY + suffix,
                                         headers={'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + self.token,
                                                  'X-GitHub-Api-Version': '2022-11-28'})
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                raise Refused('platform API redirected')
        try:
            with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
                return strict_json(response.read())
        except urllib.error.URLError as error:
            raise Refused(f'platform evidence unavailable: {error}') from error

    def pages(self, suffix, key=None):
        out = []
        for page in range(1, 101):
            data = self.get(suffix + ('&' if '?' in suffix else '?') + f'per_page=100&page={page}')
            batch = data[key] if key else data
            require(isinstance(batch, list), 'malformed platform page')
            out.extend(batch)
            if len(batch) < 100:
                return out
        raise Refused('platform pagination limit: incomplete evidence')

    def verify_tag(self, inventory, object_sha):
        import tag_signature
        return tag_signature.verify(inventory['tag'], inventory['source_sha'], object_sha)

    def evidence(self, inventory, context, settings_audit):
        tag = self.get('/git/ref/tags/' + urllib.parse.quote(inventory['tag'], safe=''))
        obj = self.get('/git/tags/' + tag['object']['sha']) if tag.get('object', {}).get('type') == 'tag' else None
        signature = self.verify_tag(inventory, tag['object']['sha'])
        checks = self.pages('/actions/runs?head_sha=' + inventory['source_sha'], 'workflow_runs')
        # Workflow success alone can hide skipped acceptance jobs. All jobs in
        # each latest qualifying workflow must have succeeded, never skipped.
        for path in REQUIRED_WORKFLOWS:
            runs = [r for r in checks if path_of(r) == path]
            if runs:
                run = max(runs, key=lambda r: r['id'])
                jobs = self.pages(f"/actions/runs/{run['id']}/attempts/{run['run_attempt']}/jobs", 'jobs')
                require(jobs and all(j.get('status') == 'completed' and j.get('conclusion') == 'success' for j in jobs), f'{path}: missing/skipped/unsuccessful jobs')
        candidate_run = self.get(f"/actions/runs/{inventory['candidate']['run_id']}")
        candidate_jobs = self.pages(f"/actions/runs/{candidate_run['id']}/attempts/{candidate_run['run_attempt']}/jobs", 'jobs')
        reason = 'candidate has skipped/missing/unsuccessful acceptance or retention jobs'
        require(candidate_jobs, reason)
        for name, channel in CANDIDATE_CHANNEL_JOBS.items():
            matches = [j for j in candidate_jobs if j.get('name') == name]
            require(len(matches) == 1 if channel in inventory['channels'] else len(matches) <= 1, reason)
        for job in candidate_jobs:
            channel = CANDIDATE_CHANNEL_JOBS.get(job.get('name'))
            unselected = channel is not None and channel not in inventory['channels']
            require(job.get('status') == 'completed' and (job.get('conclusion') == 'success'
                    or (unselected and job.get('conclusion') == 'skipped')), reason)
        return {'tag': tag, 'tag_object': obj, 'tag_signature': signature, 'settings_audit': settings_audit,
                'candidate_run': candidate_run,
                'publisher_run': self.get(f"/actions/runs/{context['publishing']['run_id']}"),
                'reviews': self.get(f"/actions/runs/{context['publishing']['run_id']}/approvals"), 'checks': checks}


def receipt_outside_candidate(candidate, receipt):
    require(not Path(receipt).resolve().is_relative_to(Path(candidate).resolve()), 'gate receipt must be outside the immutable candidate')


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--inventory-sha256', required=True)
    parser.add_argument('--channel', required=True, choices=sorted(CHANNELS))
    parser.add_argument('--phase', required=True, choices=['preflight', 'boundary'])
    parser.add_argument('--receipt', required=True, type=Path)
    args = parser.parse_args()
    receipt_outside_candidate(args.candidate, args.receipt)
    raw = (args.candidate / 'release-inventory.json').read_bytes()
    inventory = strict_json(raw)
    require(raw == canonical(inventory), 'noncanonical inventory')
    require(os.environ.get('GITHUB_REPOSITORY') == REPOSITORY and os.environ.get('GITHUB_REF') == 'refs/tags/' + inventory['tag'] and os.environ.get('GITHUB_SHA') == inventory['source_sha']
            and os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'gate must execute in the trusted manual signed-tag workflow')
    event = strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())
    inputs = event.get('inputs', {})
    context = binding(inventory, args.inventory_sha256, int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']), inputs['settings_audit_sha256'])
    for key in ('source_sha', 'tag', 'channels', 'targets', 'candidate'):
        supplied = strict_json(inputs[key]) if key in ('channels', 'targets', 'candidate') else inputs[key]
        require(supplied == inventory[key], f'dispatch {key} changed')
    require(inputs.get('inventory_sha256') == args.inventory_sha256, 'dispatch inventory changed')
    require(args.channel in inventory['channels'], 'channel not approved')
    import approval
    proof = approval.verify_dispatch(args.candidate, inputs)
    require(proof['inventory_sha256'] == args.inventory_sha256 == digest(raw), 'maintainer signature does not approve this inventory digest')
    import supply
    supply.require_contract(args.candidate, inventory['channels'], inventory['targets'], inventory['tag'])
    supply.verify_binary_inventory(inventory, args.candidate)
    snapshot = GitHub(os.environ['GH_TOKEN']).evidence(inventory, context, strict_json(inputs['settings_audit']))
    receipt = validate(inventory, args.inventory_sha256, args.candidate, context, snapshot)
    receipt['phase'] = args.phase
    receipt['channel'] = args.channel
    # Never replace an audit receipt. Store with candidate in the retained archive.
    with args.receipt.open('xb') as output:
        output.write(canonical(receipt))
    import retention
    retention.audit(args.receipt, os.environ['RELEASE_AUDIT_BUCKET'], context['publishing']['run_id'], context['publishing']['run_attempt'])
    print(challenge(context))


if __name__ == '__main__':
    try:
        main()
    except (Refused, KeyError, OSError, TypeError, ValueError) as error:
        raise SystemExit(f'release refused: {error}') from error
