"""Read-only run evidence for original attestation and renewed publish approval."""
from datetime import datetime, timezone, timedelta

import contract
import gate


def integer(value):
    gate.require(isinstance(value, str) and value.isascii() and value.isdigit() and int(value) > 0, 'invalid workflow integer')
    return int(value)

def validate(metadata, evidence, environment, now):
    contract.validate_metadata({k:v for k,v in metadata.items() if k!='artifacts'})
    gate.require(metadata['targets']==sorted(gate.TARGETS), 'publication requires every qualified target')
    expected={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_REF':'refs/tags/'+metadata['tag'],
              'GITHUB_SHA':metadata['source_sha'],'GITHUB_EVENT_NAME':'push',
              'GITHUB_WORKFLOW_REF':f'{gate.REPOSITORY}/{contract.WORKFLOW}@refs/tags/{metadata["tag"]}',
              'RELEASE_PUBLICATION_ENABLED':'true','RELEASE_GITHUB_ENABLED':'true'}
    gate.require(all(environment.get(k)==v for k,v in expected.items()), 'untrusted or disabled publication context')
    run_id=integer(environment.get('GITHUB_RUN_ID'))
    publishing=integer(environment.get('GITHUB_RUN_ATTEMPT'))
    original=integer(environment.get('RELEASE_ATTESTING_ATTEMPT'))
    artifact_id=integer(environment.get('RELEASE_ARTIFACT_ID'))
    gate.require(metadata['attesting']=={'run_id':run_id,'run_attempt':original} and original==1
                 and original<=publishing<=51, 'original attesting attempt changed or rerun budget exhausted')
    run=evidence['original']
    gate.require(run.get('id')==run_id and run.get('run_attempt')==original and run.get('head_sha')==metadata['source_sha']
                 and run.get('head_branch')==metadata['tag'] and run.get('event')=='push'
                 and run.get('path')==contract.WORKFLOW and run.get('repository',{}).get('full_name')==gate.REPOSITORY,
                 'original attesting run differs')
    created=datetime.fromisoformat(run['created_at'].replace('Z','+00:00'))
    gate.require(timedelta(0)<=now-created<timedelta(days=30),'publish-only recovery window expired; use a new signed version')
    artifact=evidence['artifact']
    gate.require(artifact.get('id')==artifact_id and artifact.get('name')==f'attested-release-{run_id}-{original}'
                 and artifact.get('expired') is False and artifact.get('workflow_run',{}).get('id')==run_id
                 and artifact.get('workflow_run',{}).get('head_sha')==metadata['source_sha'], 'original attested artifact unavailable or changed')
    jobs=evidence['jobs']
    required={'tag-signature','qualification','web-ui','archive','assemble','installer','attest','homebrew-native'}
    gate.require(required<={j.get('name') for j in jobs}, 'required acceptance job missing')
    for name in required:
        count=3 if name in ('qualification','archive','installer','homebrew-native') else 1
        gate.require(sum(j.get('name')==name for j in jobs)==count, 'acceptance matrix missing or duplicated: '+name)
    owners=set(gate.CHANNEL_JOB_IDS)
    for channel in owners:
        matches=[j for j in jobs if j.get('name')==channel]
        gate.require(len(matches)==1, 'channel acceptance owner missing/duplicated')
    for job in jobs:
        if job.get('name')=='publish':continue
        optional=job.get('name') in owners and job['name'] not in metadata['channels']
        gate.require(job.get('status')=='completed' and (job.get('conclusion')=='success'
                     or (optional and job.get('conclusion')=='skipped')), 'acceptance job failed, pending or skipped')
    owner=evidence['owner']
    gate.require(owner.get('login')=='marcinwadon' and type(owner.get('id')) is int, 'unexpected repository owner')
    reviews=[r for r in evidence['reviews'] if any(e.get('name')=='release' for e in r.get('environments',[]))]
    gate.require(reviews and reviews[-1].get('state')=='approved' and reviews[-1].get('user',{}).get('id')==owner['id'],
                 'maintainer release approval absent or rejected')
    if publishing>original:
        gate.require(reviews[-1].get('comment')==f'publish-run:{run_id}:attempt:{publishing}', 'retry needs renewed current-attempt approval comment')
    return metadata


def evidence(api, metadata, environment):
    run=metadata['attesting'];run_id=run['run_id'];attempt=run['run_attempt']
    return {'original':api.get(f'/actions/runs/{run_id}/attempts/{attempt}'),
            'jobs':api.pages(f'/actions/runs/{run_id}/attempts/{attempt}/jobs','jobs'),
            'artifact':api.get('/actions/artifacts/'+str(integer(environment.get('RELEASE_ARTIFACT_ID')))),
            'owner':api.get('/')['owner'],'reviews':api.get(f'/actions/runs/{run_id}/approvals')}
