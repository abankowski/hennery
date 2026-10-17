#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys



# Legacy publisher switch names. No Actions API job-name reconstruction.
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
    require(set(jobs) == {'packaging', 'attest', 'publish'}, 'single release graph incomplete')
    build = jobs['packaging']
    require(build.get('uses') == './.github/workflows/packaging.yml'
            and build.get('with') == {'release': True}
            and build.get('permissions') == {'contents': 'read', 'actions': 'read'}
            and not has_secrets(build), 'release must use the read-only packaging workflow')
    budgets={'attest':{'contents':'read','id-token':'write','attestations':'write'},
             'publish':{'contents':'write','actions':'read','attestations':'read','id-token':'write'}}
    for key in ('attest', 'publish'):
        job=jobs[key]
        require('uses' not in job, 'publisher/attester must remain in the tag workflow')
        require(type(job.get('timeout-minutes')) is int and job['timeout-minutes']>0, 'timeout required')
        require(job.get('continue-on-error') in (None,False), 'jobs must fail closed')
        require(job.get('permissions',data['permissions'])==budgets[key], 'excess job permissions')
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
    require(attest.get('needs') == ['packaging']
            and attest.get('if') == "${{ !cancelled() && needs.packaging.result == 'success' }}",
            'attestation must await complete packaging acceptance')
    checks=[i for i,s in enumerate(attest['steps']) if 'release_run.py check payload' in s.get('run','')]
    signers=[i for i,s in enumerate(attest['steps']) if s.get('uses','').startswith('actions/attest')]
    require(len(checks)==1 and signers and checks[0]<min(signers) and attest['steps'][checks[0]].get('if') is None,
            'original-attempt byte check must precede attestation')
    summaries=[s for s in attest['steps'] if s.get('id')=='summary']
    require(len(summaries)==1 and summaries[0].get('if') is None and 'release_run.py summary ' in summaries[0].get('run',''), 'asset digest summary required')
    publisher=jobs['publish']
    require(publisher.get('needs')==['attest'], 'publisher must depend on attestation')
    require(publisher.get('if')=="${{ !cancelled() && needs.attest.result == 'success' }}",
            'publisher requires successful attestation')
    steps=publisher['steps'];positions={s.get('id'):i for i,s in enumerate(steps) if s.get('id')}
    require('verified' in positions and 'github-publish' in positions and positions['verified']<positions['github-publish'], 'verification must precede publication')
    for key,command in [('verified','verify original/payload original/signatures github'),('github-publish','publish original/payload original/signatures')]:
        step=steps[positions[key]]
        require(step.get('if') is None and 'release_run.py '+command in step.get('run','') and '||' not in step['run'], 'integrity gate must be unconditional and fatal')
    verified=steps[positions['verified']]
    for switch in ('RELEASE_PUBLICATION_ENABLED', 'RELEASE_GITHUB_ENABLED'):
        require(verified.get('env', {}).get(switch)=='${{ vars.'+switch+' }}',
                'protected verification must receive publication switches')
    downloads=[s for s in steps if s.get('uses','').startswith('actions/download-artifact@')]
    require(len(downloads)==1 and downloads[0].get('with',{}).get('artifact-ids')=='${{ needs.attest.outputs.artifact_id }}'
            and downloads[0]['with'].get('path')=='original' and downloads[0]['with'].get('merge-multiple') is True,
            'original artifact ID and flat verifier layout required')
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


def check_repository(root):
    paths=sorted((Path(root)/'.github/workflows').glob('*.y*ml'))
    if not {'release.yml','release-tests.yml','packaging.yml'} <= {p.name for p in paths}:
        raise ValueError('tagged release and refusal-test workflows required')
    for path in paths:
        data=load_workflow(path.read_bytes())
        # Lint all workflows for unexpected write/environment/reusable authority.
        # Other CI may use its explicitly reviewed secret-free OIDC cache signer.
        if path.name.startswith('release') or path.name == 'packaging.yml' or path.name == 'security-audit.yml' or has_secrets(data) or 'write' in data.get('permissions',{}).values() or any(environment_name(j)=='release' or 'write' in j.get('permissions',{}).values() or 'uses' in j for j in data.get('jobs',{}).values()):
            check(data,path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
