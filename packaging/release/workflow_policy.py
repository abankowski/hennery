#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys



# Channel -> owning YAML job ID. The literal API display name is the channel.
# R4's name is reserved now; selection refuses until its owning job exists.
CHANNEL_JOB_IDS = {'crates': 'crates', 'ghcr': 'ghcr', 'homebrew': 'homebrew'}


def has_secrets(value):
    return re.search(r'\bsecrets\s*(?:\.|\[)', str(value), re.I) is not None


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


def channel_jobs(data):
    """Bind job API names to owning IDs in the exact tagged workflow."""
    jobs = data.get('jobs')
    if not isinstance(jobs, dict) or not jobs:
        raise ValueError('release job identity: jobs mapping required')
    seen = set()
    for job_id, job in jobs.items():
        if not isinstance(job_id, str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]*', job_id) or not isinstance(job, dict):
            raise ValueError('release job identity: invalid job ID or definition')
        display = job.get('name', job_id)
        if not isinstance(display, str) or not display or '${{' in display:
            raise ValueError('release job identity: names must be literal strings')
        if display in seen:
            raise ValueError('release job identity: display name collision')
        seen.add(display)
        if display in CHANNEL_JOB_IDS and CHANNEL_JOB_IDS[display] != job_id:
            raise ValueError('release job identity: reserved name belongs to another job ID')
        for channel, owner in CHANNEL_JOB_IDS.items():
            if job_id == owner and (display != channel or 'strategy' in job):
                raise ValueError('release job identity: channel owner requires its literal name and no matrix')
    return {channel: owner for channel, owner in CHANNEL_JOB_IDS.items() if owner in jobs}


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


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def check_simplified(data):
    """Police the authorized workflow, not arbitrary repository writers."""
    def require(value, message):
        if not value:
            raise ValueError(message)
    trigger = data.get('on', data.get(True))
    require(trigger == {'push': {'tags': ['v*']}}, 'release must be tag-push only')
    require(data.get('permissions') == {'contents': 'read'}, 'release default must be read-only')
    require(not has_secrets(data.get('env', {})), 'workflow secrets forbidden')
    jobs = data.get('jobs', {})
    required = {'tag-signature','web-ui','qualification','archive','crates','assemble','ghcr',
                'installer','homebrew-native','homebrew','attest','publish'}
    require(required <= set(jobs), 'single release graph incomplete')
    channel_jobs(data)
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
        require(not has_secrets(job.get('env',{})), 'job secrets forbidden')
        for step in job.get('steps',[]):
            uses=step.get('uses','')
            require(not uses or uses.startswith('./') or re.fullmatch(r'[^@]+@[0-9a-f]{40}',uses), 'action must be pinned')
            require('cache' not in uses.casefold(), 'release cache restore forbidden')
            require(step.get('continue-on-error') in (None,False), 'steps must fail closed')
            if uses.startswith('actions/checkout@'):
                require(step.get('with',{}).get('ref')=='${{ github.sha }}' and step['with'].get('persist-credentials') is False,
                        'checkout must use exact source without persisted authority')
            if has_secrets(step):require(key=='publish', 'publication secret outside release')
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
        if has_secrets(step):
            require(index in {positions[c+'-publish'] for c in CHANNEL_JOB_IDS}, 'credentials must follow channel verification')
        if step.get('uses','').startswith('rust-lang/crates-io-auth-action@'):
            require(positions['crates-verify']<index<positions['crates-publish'], 'OIDC exchange must follow verification')
            require(step.get('if')=="${{ vars.RELEASE_CRATES_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'crates') && vars.RELEASE_CRATES_BOOTSTRAP_ENABLED != 'true' }}",
                    'OIDC exchange requires selection/switch and must not bootstrap')


def check(data, name):
    if name == 'release.yml':
        return check_simplified(data)
    if has_secrets(data):
        raise ValueError('release credentials outside authorized release workflow')
    if data.get('permissions', {}).get('contents') == 'write':
        raise ValueError('contents write outside authorized release workflow')
    for job in data.get('jobs', {}).values():
        if 'uses' in job or environment_name(job) == 'release' or any(v == 'write' for v in job.get('permissions', {}).values()):
            raise ValueError('release authority outside authorized workflow')
        for step in job.get('steps', []):
            uses=step.get('uses','')
            if uses and not re.fullmatch(r'[^@]+@[0-9a-f]{40}', uses):
                raise ValueError('action must be pinned')
    if name == 'release-scheduling.yml':optional_job_status(data, name)


def check_repository(root):
    paths=sorted((Path(root)/'.github/workflows').glob('*.y*ml'))
    if not {'release.yml','release-tests.yml'} <= {p.name for p in paths}:
        raise ValueError('tagged release and refusal-test workflows required')
    for path in paths:
        data=load_workflow(path.read_bytes())
        # Lint all workflows for unexpected write/environment/reusable authority.
        # Other CI may use its explicitly reviewed secret-free OIDC cache signer.
        if path.name.startswith('release') or has_secrets(data) or 'write' in data.get('permissions',{}).values() or any(environment_name(j)=='release' or 'write' in j.get('permissions',{}).values() or 'uses' in j for j in data.get('jobs',{}).values()):
            check(data,path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
