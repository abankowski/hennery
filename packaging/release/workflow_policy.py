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
    if name == 'release.yml':
        return check_simplified(data)
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


def check_simplified(data):
    """Police the authorized workflow, not arbitrary repository writers."""
    def require(value, message):
        if not value:
            raise ValueError(message)
    trigger = data.get('on', data.get(True))
    require(trigger == {'push': {'tags': ['v*']}}, 'release must be tag-push only')
    require(data.get('permissions') == {'contents': 'read'}, 'release default must be read-only')
    require('secrets.' not in str(data.get('env', {})), 'workflow secrets forbidden')
    jobs = data.get('jobs', {})
    required = {'tag-signature','web-ui','qualification','archive','crates','assemble','ghcr',
                'installer','homebrew-native','homebrew','attest','publish'}
    require(required <= set(jobs), 'single release graph incomplete')
    candidate_channel_jobs(data)
    # Explicit status conditions are essential after optional channel ancestors.
    optional_job_status(data, 'release.yml')
    visiting, visited = set(), set()
    def walk(name):
        require(name in jobs, 'DAG dependency missing')
        require(name not in visiting, 'DAG cycle')
        if name in visited:
            return
        visiting.add(name)
        needs=jobs[name].get('needs',[])
        for parent in ([needs] if isinstance(needs,str) else needs):walk(parent)
        visiting.remove(name);visited.add(name)
    for key in jobs:walk(key)
    budgets={'attest':{'contents':'read','id-token':'write','attestations':'write'},
             'publish':{'contents':'write','actions':'read','attestations':'read','id-token':'write'}}
    for key,job in jobs.items():
        require('uses' not in job, 'reusable jobs forbidden')
        require(type(job.get('timeout-minutes')) is int and job['timeout-minutes']>0, 'timeout required')
        require(job.get('continue-on-error') in (None,False), 'jobs must fail closed')
        require(job.get('permissions',data['permissions'])==budgets.get(key,{'contents':'read'}), 'excess job permissions')
        require(environment_name(job)==('release' if key=='publish' else None), 'only publisher enters protected release')
        require('secrets.' not in str(job.get('env',{})), 'job secrets forbidden')
        for step in job.get('steps',[]):
            uses=step.get('uses','')
            require(not uses or uses.startswith('./') or re.fullmatch(r'[^@]+@[0-9a-f]{40}',uses), 'action must be pinned')
            require('cache' not in uses.casefold(), 'release cache restore forbidden')
            require(step.get('continue-on-error') in (None,False), 'steps must fail closed')
            if uses.startswith('actions/checkout@'):
                require(step.get('with',{}).get('ref')=='${{ github.sha }}' and step['with'].get('persist-credentials') is False,
                        'checkout must use exact source without persisted authority')
            if 'secrets.' in str(step):require(key=='publish', 'publication secret outside release')
    attest=jobs['attest']
    require(set(attest.get('needs',[])) >= required-{'publish','attest','archive','web-ui'}, 'attestation must await complete acceptance')
    selection=lambda c:"contains(fromJSON(needs.tag-signature.outputs.channels), '"+c+"')"
    condition="!cancelled() && "+' && '.join("needs."+key+".result == 'success'" for key in ['tag-signature','qualification','assemble','installer','homebrew-native'])
    for channel in ['homebrew','crates','ghcr']:
        condition+=" && (needs."+channel+".result == 'success' || (needs."+channel+".result == 'skipped' && !"+selection(channel)+'))'
    require(attest.get('if')=='${{ '+condition+' }}', 'attestation cannot bypass selected or required acceptance')
    checks=[i for i,s in enumerate(attest['steps']) if 'release_run.py check payload' in s.get('run','')]
    signers=[i for i,s in enumerate(attest['steps']) if s.get('uses','').startswith('actions/attest')]
    require(len(checks)==1 and signers and checks[0]<min(signers) and attest['steps'][checks[0]].get('if') is None,
            'original-attempt byte check must precede attestation')
    summaries=[s for s in attest['steps'] if s.get('id')=='summary']
    require(len(summaries)==1 and summaries[0].get('if') is None and 'release_run.py summary ' in summaries[0].get('run',''), 'asset digest summary required')
    publisher=jobs['publish']
    require(publisher.get('needs')==['attest'], 'publisher must depend on attestation')
    require(publisher.get('if')=="${{ !cancelled() && needs.attest.result == 'success' && vars.RELEASE_PUBLICATION_ENABLED == 'true' && vars.RELEASE_GITHUB_ENABLED == 'true' }}",
            'publisher switches and successful attestation required')
    steps=publisher['steps'];positions={s.get('id'):i for i,s in enumerate(steps) if s.get('id')}
    require('verified' in positions and 'github-publish' in positions and positions['verified']<positions['github-publish'], 'verification must precede publication')
    for key,command in [('verified','verify original/payload original/signatures github'),('github-publish','publish original/payload original/signatures')]:
        step=steps[positions[key]]
        require(step.get('if') is None and 'release_run.py '+command in step.get('run','') and '||' not in step['run'], 'integrity gate must be unconditional and fatal')
    for channel in CHANNEL_JOB_IDS:
        condition="${{ vars.RELEASE_"+channel.upper()+"_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), '"+channel+"') }}"
        require(channel+'-verify' in positions and channel+'-publish' in positions, 'folded channel gate required')
        before,write=positions[channel+'-verify'],positions[channel+'-publish']
        require(positions['github-publish']<before<write, 'channel must follow immutable publication and verification')
        for index in (before,write):require(steps[index].get('if')==condition, 'channel needs switch and selection')
        require('release_run.py verify ' in steps[before].get('run','') and 'release_run.py channel ' in steps[write].get('run',''), 'channel verifier/writer command required')
    for index,step in enumerate(steps):
        if 'secrets.' in str(step):
            require(index in {positions[c+'-publish'] for c in CHANNEL_JOB_IDS}, 'credentials must follow channel verification')
        if step.get('uses','').startswith('rust-lang/crates-io-auth-action@'):
            require(positions['crates-verify']<index<positions['crates-publish'], 'OIDC exchange must follow verification')
            require(step.get('if')=="${{ vars.RELEASE_CRATES_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'crates') && vars.RELEASE_CRATES_BOOTSTRAP_ENABLED != 'true' }}",
                    'OIDC exchange requires selection/switch and must not bootstrap')


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
