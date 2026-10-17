#!/usr/bin/env python3
"""Single tagged-run orchestration. No operation publishes without live gates."""
import argparse
from datetime import datetime, timezone
import importlib.util
import os
from pathlib import Path
import subprocess
import sys

import contract
import gate
import publication
import publish
import run_policy
import supply
import tag_signature
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def configuration():
    gate.require(os.environ.get('GITHUB_REPOSITORY')==gate.REPOSITORY and os.environ.get('GITHUB_EVENT_NAME')=='push'
                 and os.environ.get('GITHUB_REF')=='refs/tags/'+os.environ.get('GITHUB_REF_NAME','')
                 and os.environ.get('GITHUB_RUN_ATTEMPT')=='1', 'build/attest may run only on the original signed-tag attempt')
    tag=os.environ['GITHUB_REF_NAME'];source=os.environ['GITHUB_SHA']
    proof=tag_signature.verify(tag,source)
    import tomllib
    version=tomllib.loads((ROOT/'Cargo.toml').read_text())['workspace']['package']['version']
    gate.require(tag=='v'+version,'tag/workspace version differs')
    workflow=workflow_policy.load_workflow((ROOT/contract.WORKFLOW).read_bytes())
    workflow_policy.check(workflow,'release.yml')
    channels=contract.selected_channels((ROOT/'packaging/release/channels.json').read_bytes(),workflow)
    return {'channels':channels,'tag_object':proof['object_sha']}


def freeze(root):
    value=configuration()
    return freeze_payload(root, value, os.environ['GITHUB_REF_NAME'], os.environ['GITHUB_SHA'], int(os.environ['GITHUB_RUN_ID']))


def freeze_payload(root, value, tag, source, run_id):
    """Shared byte construction. Only configuration() authenticates a release."""
    gate.require(not gate.strict_json((root/'licence-findings.json').read_bytes())['findings'],'unresolved licence findings')
    supply.require_contract(root,value['channels'],sorted(gate.TARGETS),tag)
    # cargo-dist's legacy global checksum output is replaced, not authorized
    # alongside SHA256SUMS as a second global digest authority.
    legacy=root/'sha256.sum'
    if legacy.exists():
        contract.regular(legacy);legacy.unlink()
    metadata={'schema':2,'repository':gate.REPOSITORY,'source_sha':source,'tag':tag,
              'tag_object':value['tag_object'],'channels':value['channels'],'targets':sorted(gate.TARGETS),
              'attesting':{'run_id':run_id,'run_attempt':1},
              'binaries':supply.binary_inventory(root,sorted(gate.TARGETS))}
    print(contract.freeze(root,metadata))


def image_inputs(root,work):
    # Unprivileged local-data inspection. Credentialed qualification calls the
    # shared verifier first; this entry point never conveys publish authority.
    spec=importlib.util.spec_from_file_location('release_image',ROOT/'packaging/ghcr-candidate.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    value=contract.load(root)
    return module.inspect_release(root,work,value)


def check_original(root):
    value=contract.load(root)
    gate.require(os.environ.get('GITHUB_RUN_ATTEMPT')=='1'
                 and value['attesting']=={'run_id':int(os.environ['GITHUB_RUN_ID']),'run_attempt':1},
                 'attestation may only use original run inputs; publish-only retry must not re-attest')
    supply.require_contract(root,value['channels'],value['targets'],value['tag'])
    supply.verify_binary_inventory(value,root)
    return value


def require_public(root,signatures,metadata):
    remote=publish.api(f'/repos/{gate.REPOSITORY}/releases/tags/{metadata["tag"]}')
    gate.require(isinstance(remote,dict) and remote.get('tag_name')==metadata['tag'] and remote.get('draft') is False
                 and remote.get('immutable') is True,'channel requires public immutable GitHub release')
    expected={p.name:gate.digest(contract.regular(p)) for directory in (root,signatures) for p in directory.iterdir()}
    gate.require(not publish.plan(expected,publish.release_assets(remote))['missing'],'immutable public release is incomplete')


def verify(root,signatures,channel='github',public=False):
    value=contract.load(root)
    api=gate.GitHub(os.environ['GH_TOKEN'])
    run_policy.validate(value,run_policy.evidence(api,value,os.environ),os.environ,datetime.now(timezone.utc))
    gate.require(channel in value['channels'],'channel is not selected')
    if channel!='github':
        gate.require(os.environ.get('RELEASE_'+channel.upper()+'_ENABLED')=='true','channel publication is disabled')
    # Validate ownership against the checked-out, signature-verified source,
    # not a name supplied by the run artifact.
    workflow=workflow_policy.load_workflow((ROOT/contract.WORKFLOW).read_bytes())
    workflow_policy.check(workflow,'release.yml')
    gate.require(contract.selected_channels((ROOT/'packaging/release/channels.json').read_bytes(),workflow)==value['channels'],
                 'artifact channel selection differs from signed source')
    contract.verify(root,value['tag'],os.environ['GITHUB_SHA'],signatures/contract.BUNDLE,
                    int(os.environ['GITHUB_RUN_ID']),int(os.environ['RELEASE_ATTESTING_ATTEMPT']))
    supply.require_contract(root,value['channels'],value['targets'],value['tag'])
    supply.verify_binary_inventory(value,root)
    if 'ghcr' in value['channels']:
        import channel_publish
        channel_publish.verify_images(root,signatures,value)
    if public or channel!='github':require_public(root,signatures,value)
    return value


def summary(root,signatures):
    value=contract.load(root)
    gate.require(value['attesting']=={'run_id':int(os.environ['GITHUB_RUN_ID']),'run_attempt':1}
                 and os.environ['GITHUB_RUN_ATTEMPT']=='1','attesting attempt changed; never rerun all for recovery')
    print('# Release approval inputs\n')
    print('Source: `'+value['source_sha']+'`; tag: `'+value['tag']+'`; original run: `'+str(value['attesting']['run_id'])+'`, attesting attempt: `1`.\n')
    print('Channels: `'+','.join(value['channels'])+'`; targets: `'+','.join(value['targets'])+'`.\n')
    print('| Asset | SHA-256 |\n|---|---|')
    for directory in (root,signatures):
        for path in sorted(directory.iterdir()):print('| `'+path.name+'` | `'+gate.digest(contract.regular(path))+'` |')
    print('\nNo draft exists before approval. A publish-only retry reuses these bytes and the original attesting attempt.')
    print('For a retry, approve with comment `publish-run:'+str(value['attesting']['run_id'])+':attempt:<current publishing attempt>`. Never rerun all.')


def main():
    parser=argparse.ArgumentParser(description=__doc__,allow_abbrev=False)
    parser.add_argument('operation',choices=['configure','freeze','check','summary','image-inputs','verify','publish','channel'])
    parser.add_argument('root',nargs='?',type=Path)
    parser.add_argument('other',nargs='?',type=Path)
    parser.add_argument('channel',nargs='?',choices=sorted(gate.CHANNELS))
    parser.add_argument('--outputs',type=Path)
    args=parser.parse_args()
    if args.operation=='configure':
        value=configuration();print('channels='+gate.canonical(value['channels']).decode().strip());print('channels_csv='+','.join(value['channels']));print('tag_object='+value['tag_object'])
    elif args.operation=='freeze':freeze(args.root)
    elif args.operation=='check':check_original(args.root)
    elif args.operation=='summary':summary(args.root,args.other)
    elif args.operation=='image-inputs':image_inputs(args.root,args.other)
    elif args.operation=='verify':
        value=verify(args.root,args.other,args.channel)
        if args.outputs:
            with args.outputs.open('a') as output:output.write('channels='+gate.canonical(value['channels']).decode())
    elif args.operation=='publish':
        result=publication.release(args.root,args.other,lambda:verify(args.root,args.other))
        print(gate.canonical(result).decode(),end='')
    else:
        import channel_publish
        channel_publish.publish(args.root,args.other,args.channel)


if __name__=='__main__':
    try:main()
    except (gate.Refused,KeyError,ValueError,OSError,subprocess.CalledProcessError) as error:
        raise SystemExit('release refused: '+str(error)) from error
