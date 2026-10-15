#!/usr/bin/env python3
"""Check Crane's rendered Cargo commands for every supported system before builds."""
import json
import shlex
import subprocess


expression = 'systems: builtins.mapAttrs (_: checks: { clippy = checks.clippy.buildPhase; package = checks.package.buildPhase; }) systems'
systems = json.loads(subprocess.check_output(['nix','eval','--json','.#checks','--apply',expression],text=True))
assert set(systems)=={'aarch64-darwin','aarch64-linux','x86_64-linux'}, 'unexpected supported systems'
for system,phases in systems.items():
    for kind,subcommand in [('clippy','clippy'),('package','build')]:
        commands=[shlex.split(line) for line in phases[kind].splitlines() if line.startswith('cargoWithProfile '+subcommand+' ')]
        assert len(commands)==1, f'{system}/{kind}: expected one rendered Cargo command'
        args=commands[0]
        assert args.count('--no-default-features')==1, f'{system}/{kind}: feature selection duplicated or missing: {args}'
        if kind=='clippy':
            assert args.count('--workspace')==1 and args.count('--all-targets')==1, f'{system}: clippy scope duplicated or missing: {args}'
            assert args[-3:]==['--','-D','warnings'], f'{system}: clippy warnings must remain errors'
        else:
            assert '--workspace' not in args and args.count('--locked')==1 and args.count('-p')==1, f'{system}: release package scope changed: {args}'
            assert args[args.index('-p')+1]=='hennery', f'{system}: release must build hennery'
        print(system,kind,':',' '.join(args))
