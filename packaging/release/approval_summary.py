#!/usr/bin/env python3
"""Print the immutable dispatch tuple before the environment reviewer decides."""
import json
import os
from pathlib import Path

import gate

inputs = gate.strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())['inputs']
context = {key: inputs[key] for key in ('source_sha', 'tag', 'inventory_sha256')}
context.update({key: gate.strict_json(inputs[key]) for key in ('channels', 'targets', 'candidate')})
context.update(repository=gate.REPOSITORY, publishing={'run_id': int(os.environ['GITHUB_RUN_ID']), 'run_attempt': int(os.environ['GITHUB_RUN_ATTEMPT'])})
with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
    output.write('Approve this tuple only after candidate and channel acceptance.\n\n```json\n' + json.dumps(context, sort_keys=True, indent=2) + '\n```\n\nEnvironment review comment:\n\n`' + gate.challenge(context) + '`\n')
