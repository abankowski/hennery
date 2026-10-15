#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys



CREDENTIAL_CONDITION = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == format('refs/tags/{0}', inputs.tag) && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256"
# Channel -> owning YAML job ID. The literal API display name is the channel.
# R4's name is reserved now; selection refuses until its owning job exists.
CHANNEL_JOB_IDS = {'crates': 'crates', 'ghcr': 'ghcr', 'homebrew': 'homebrew'}


def load_workflow(raw):
    # Most release helpers use only the stdlib parts of gate/workflow_policy.
    # The signed-workflow binding always needs the pinned parser and refuses
    # explicitly when it is unavailable; there is no permissive fallback.
    try:
        import yaml
    except ImportError as error:
        raise ValueError('workflow parser unavailable; run inside nix develop .#release') from error

    class UniqueSafeLoader(yaml.SafeLoader):
        def construct_mapping(self, node, deep=False):
            self.flatten_mapping(node)
            seen = set()
            for key_node, _ in node.value:
                key = self.construct_object(key_node, deep=deep)
                if key in seen:
                    raise ValueError('duplicate workflow YAML key')
                seen.add(key)
            return super().construct_mapping(node, deep=deep)

    try:
        data = yaml.load(raw, Loader=UniqueSafeLoader)
    except yaml.YAMLError as error:
        raise ValueError('invalid workflow YAML') from error
    if not isinstance(data, dict):
        raise ValueError('workflow mapping required')
    return data


def candidate_channel_jobs(data):
    """Bind job API names to owning IDs in the exact candidate workflow."""
    jobs = data.get('jobs')
    if not isinstance(jobs, dict) or not jobs:
        raise ValueError('candidate job identity: jobs mapping required')
    seen = set()
    for job_id, job in jobs.items():
        if not isinstance(job_id, str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]*', job_id) or not isinstance(job, dict):
            raise ValueError('candidate job identity: invalid job ID or definition')
        display = job.get('name', job_id)
        if not isinstance(display, str) or not display or '${{' in display:
            raise ValueError('candidate job identity: names must be literal strings')
        if display in seen:
            raise ValueError('candidate job identity: display name collision')
        seen.add(display)
        if display in CHANNEL_JOB_IDS and CHANNEL_JOB_IDS[display] != job_id:
            raise ValueError('candidate job identity: reserved name belongs to another job ID')
        for channel, owner in CHANNEL_JOB_IDS.items():
            if job_id == owner and (display != channel or 'strategy' in job):
                raise ValueError('candidate job identity: channel owner requires its literal name and no matrix')
    return {channel: owner for channel, owner in CHANNEL_JOB_IDS.items() if owner in jobs}


def tap_credential(value):
    return bool(re.search(r"secrets\s*(?:\.\s*release_homebrew_token|\[\s*['\"]release_homebrew_token['\"]\s*\])", str(value), re.I))


def optional_job_status(data, name):
    """Actions propagates skips through ancestors unless an explicit status is used.

    Qualification DAGs may join an optional channel, then continue through
    several unconditional jobs. Check every descendant, not only direct needs.
    This lint does not prove the guard's result semantics; production guards
    are also bound to the secret-free Actions scheduling regression.
    """
    jobs = data.get('jobs', {})
    optional = {key for key, job in jobs.items() if 'if' in job}
    descendants = set()
    frontier = set(optional)
    while frontier:
        following = set()
        for key, job in jobs.items():
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if key not in descendants and frontier.intersection(needs):
                following.add(key)
        descendants.update(following)
        frontier = following
    for key in sorted(descendants):
        # A status-looking string literal is not an Actions status function.
        condition = re.sub(r"'(?:[^']|'')*'|\"(?:[^\"\\]|\\.)*\"", '', str(jobs[key].get('if', '')))
        if not re.search(r'(?<![\w.])(?:always|cancelled|failure|success)\s*\(', condition):
            raise ValueError(f'{name}/{key}: optional job ancestor requires an explicit status condition')


def privileged(job):
    return tap_credential(job) or any(job.get('permissions', {}).get(scope) == 'write' for scope in ('contents', 'packages', 'attestations', 'id-token')) or any(
        s.get('uses', '').startswith(('actions/create-github-app-token@', 'rust-lang/crates-io-auth-action@')) or
        'publish.py upload' in s.get('run', '') or
        re.search(r'(?m)(?:^|[|;&])\s*(?:nix\s+develop\s+\S+\s+-c\s+)?(?:(?:ba)?sh\s+|python3\s+)?(?:packaging/ghcr-publish\.sh|packaging/ghcr-verify\.py\s+publish|docker\s+login)(?:\s|$)', s.get('run', ''))
        for s in job.get('steps', []))


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def writer(name, job):
    # Protected-environment secrets can be publication credentials even when
    # the ordinary job token is read-only (for example crates.io bootstrap).
    return privileged(job) or (environment_name(job) == 'release' and name != 'authorize')


def homebrew_writer(job):
    """A tap secret is exposed only to the final, gated, exact-byte writer."""
    if job.get('if') != CREDENTIAL_CONDITION + " && vars.RELEASE_HOMEBREW_ENABLED == 'true'":
        raise ValueError('Homebrew needs its separate publication switch')
    if job.get('needs') != ['github', 'authorize'] or job.get('permissions') != {'contents': 'read', 'actions': 'read'}:
        raise ValueError('Homebrew must follow GitHub with a read-only ordinary token')
    if tap_credential(job.get('env', {})):
        raise ValueError('tap credential must not be job-scoped')
    steps = job.get('steps', [])
    def one(predicate):
        positions = [i for i, step in enumerate(steps) if predicate(step)]
        if len(positions) != 1:
            raise ValueError('Homebrew requires one signature, byte check, boundary and credential step')
        step = steps[positions[0]]
        if step.get('if') is not None or step.get('continue-on-error') not in (None, False):
            raise ValueError('Homebrew integrity and write steps must be unconditional and fatal')
        return positions[0]
    preflight = one(lambda s: s.get('with', {}).get('phase') == 'preflight')
    signature = one(lambda s: 'verify.py --candidate' in s.get('run', ''))
    integrity = one(lambda s: 'homebrew_publish.py --verify' in s.get('run', ''))
    boundary = one(lambda s: s.get('with', {}).get('phase') == 'boundary')
    credential = one(tap_credential)
    if not preflight < signature < integrity < boundary < credential or credential != len(steps) - 1:
        raise ValueError('Homebrew signature and fresh gates must precede the tap credential')
    if 'homebrew_publish.py candidate' not in steps[credential].get('run', ''):
        raise ValueError('tap credential may only reach the frozen formula writer')


def check(data, name):
    if tap_credential(data.get('env', {})):
        raise ValueError('tap credential must not be workflow-scoped')
    if name == 'release-candidate.yml':
        candidate_channel_jobs(data)
    if name in ('release-candidate.yml', 'release-scheduling.yml'):
        optional_job_status(data, name)
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
        if tap_credential(job) or (name == 'release-publish.yml' and key == 'homebrew'):
            homebrew_writer(job)
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
            allowed = {CREDENTIAL_CONDITION} | {CREDENTIAL_CONDITION + " && vars.RELEASE_" + channel + "_ENABLED == 'true'" for channel in ('GITHUB', 'CRATES', 'HOMEBREW')}
            allowed.add(CREDENTIAL_CONDITION + " && vars.RELEASE_GHCR_ENABLED == 'true' && contains(fromJSON(inputs.channels), 'ghcr')")
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
        data = load_workflow(path.read_text())
        authority = tap_credential(data.get('env', {})) or any(privileged(dict(job, permissions=job.get('permissions', data.get('permissions', {}))))
                        or environment_name(job) == 'release' or 'uses' in job for job in data.get('jobs', {}).values())
        # Read-only legacy qualification jobs retain their existing style.
        # Every writer/signer or reusable indirection is checked, whatever
        # the filename: a generated release.yml cannot bypass this policy.
        if path.name.startswith('release-') or authority:
            check(data, path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
