"""Read-only run evidence for original attestation and renewed publish approval."""
from datetime import datetime, timezone, timedelta
from itertools import product
from pathlib import Path

import contract
import gate
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def acceptance_names():
    """Bind actual Actions API names to the exact checked-out workflow matrix.

    Actions appends every matrix value to a literal job name. Included rows
    may have different fields (the macOS archive has no image architecture).
    Never normalize an API name by stripping its suffix: that would accept an
    unknown platform or three copies of the same successful matrix job.
    """
    workflow=workflow_policy.load_workflow((ROOT/contract.WORKFLOW).read_bytes())
    workflow_policy.channel_jobs(workflow)
    expected={}
    for key,job in workflow['jobs'].items():
        name=job.get('name',key)
        strategy=job.get('strategy')
        if strategy is None:
            names=[name]
        else:
            gate.require(isinstance(strategy,dict) and isinstance(strategy.get('matrix'),dict), 'literal acceptance matrix required')
            matrix=strategy['matrix']
            if set(matrix)=={'include'}:
                rows=matrix['include']
                gate.require(isinstance(rows,list) and rows and all(isinstance(row,dict) and row for row in rows),
                             'literal acceptance include rows required')
                values=[list(row.values()) for row in rows]
            else:
                gate.require(matrix and not {'include','exclude'}.intersection(matrix)
                             and all(isinstance(axis,list) and axis for axis in matrix.values()),
                             'unsupported acceptance matrix')
                values=list(product(*matrix.values()))
            gate.require(all(all(isinstance(value,str) and value and '${{' not in value for value in row) for row in values),
                         'literal acceptance matrix values required')
            names=[name+' ('+', '.join(row)+')' for row in values]
        for display in names:
            gate.require(display not in expected,'acceptance API name collision')
            expected[display]=key
    return expected


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
    expected=acceptance_names()
    required={name for name,key in expected.items() if key!='publish'}
    gate.require(isinstance(jobs,list) and all(isinstance(job,dict) for job in jobs), 'invalid acceptance jobs')
    names=[job.get('name') for job in jobs]
    gate.require(all(isinstance(name,str) and name in expected for name in names), 'unknown acceptance job')
    gate.require(len(names)==len(set(names)) and required<=set(names), 'acceptance matrix missing or duplicated')
    owners=set(gate.CHANNEL_JOB_IDS)
    for channel in owners:
        matches=[j for j in jobs if j.get('name')==channel]
        gate.require(len(matches)==1, 'channel acceptance owner missing/duplicated')
    for job in jobs:
        owner=expected.get(job['name'])
        if owner=='publish':continue
        optional=owner in owners and owner not in metadata['channels']
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
