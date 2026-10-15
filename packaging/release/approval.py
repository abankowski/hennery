#!/usr/bin/env python3
"""Offline maintainer inventory signature: the root of release authority."""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile

import gate
from tag_signature import FINGERPRINT


def verify(inventory, signature):
    inventory, signature = Path(inventory), Path(signature)
    gate.require(inventory.is_file() and not inventory.is_symlink(), 'maintainer inventory missing/nonregular')
    gate.require(signature.is_file() and not signature.is_symlink() and 0 < signature.stat().st_size <= 16384, 'maintainer inventory signature missing/nonregular')
    raw = inventory.read_bytes()
    value = gate.strict_json(raw)
    gate.require(raw == gate.canonical(value), 'maintainer signature requires canonical inventory bytes')
    armored = signature.read_bytes()
    gate.require(armored.startswith(b'-----BEGIN PGP SIGNATURE-----\n') and armored.rstrip().endswith(b'-----END PGP SIGNATURE-----'), 'malformed maintainer inventory signature')
    with tempfile.TemporaryDirectory(prefix='hennery-approval-') as temporary:
        environment = dict(os.environ, GNUPGHOME=temporary)
        Path(temporary, 'gpg.conf').write_text('no-autostart\nno-auto-key-retrieve\n')
        subprocess.run(['gpg', '--batch', '--no-autostart', '--import', str(Path(__file__).with_name('maintainer.asc'))], env=environment, check=True, capture_output=True, text=True)
        frozen_inventory = Path(temporary) / 'inventory.json'
        frozen_signature = Path(temporary) / 'inventory.json.asc'
        frozen_inventory.write_bytes(raw); frozen_signature.write_bytes(armored)
        result = subprocess.run(['gpg', '--batch', '--no-autostart', '--status-fd', '1', '--verify', str(frozen_signature), str(frozen_inventory)], env=environment, capture_output=True, text=True)
        records = [line.split()[1:] for line in result.stdout.splitlines() if line.startswith('[GNUPG:] ')]
        valid = [r for r in records if r and r[0] == 'VALIDSIG']
        gate.require(result.returncode == 0 and len(valid) == 1 and len(valid[0]) > 1 and valid[0][1] == FINGERPRINT and not any(r and r[0] in {'BADSIG','ERRSIG','REVKEYSIG','EXPKEYSIG','EXPSIG','KEYEXPIRED','SIGEXPIRED','KEYREVOKED','NO_PUBKEY','NODATA','FAILURE','ERROR'} for r in records), 'maintainer inventory signature invalid or not from pinned key')
    return {'inventory_sha256': gate.digest(raw), 'signature_sha256': gate.digest(armored), 'fingerprint': FINGERPRINT}


def verify_dispatch(candidate, inputs):
    """The dispatch carries public signature bytes, never a signing credential."""
    signature = inputs.get('maintainer_signature')
    gate.require(isinstance(signature, str) and len(signature) <= 16384, 'maintainer inventory signature input missing')
    with tempfile.TemporaryDirectory(prefix='hennery-dispatch-approval-') as temporary:
        path = Path(temporary) / 'release-inventory.json.asc'
        path.write_text(signature)
        return verify(Path(candidate) / 'release-inventory.json', path)


def sign(inventory, output, touch_confirmed):
    gate.require(not os.environ.get('CI') and not os.environ.get('GITHUB_ACTIONS') and not os.environ.get('GITHUB_RUN_ID'), 'maintainer signing must never run in CI')
    gate.require(touch_confirmed is True, 'maintainer must confirm signing-subkey hardware touch is configured')
    inventory, output = Path(inventory), Path(output)
    gate.require(not output.exists() and not output.is_symlink(), 'refusing to overwrite maintainer signature')
    raw = inventory.read_bytes()
    gate.require(raw == gate.canonical(gate.strict_json(raw)), 'sign only canonical frozen inventory')
    # GnuPG performs hardware/PIN/touch interaction locally. No passphrase,
    # loopback pinentry, secret export or unattended fallback is provided.
    subprocess.run(['gpg', '--armor', '--local-user', FINGERPRINT+'!', '--output', str(output), '--detach-sign', str(inventory)], check=True)
    gate.require(inventory.read_bytes() == raw, 'inventory changed during maintainer signing')
    return verify(inventory, output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['sign-approval','verify-approval'])
    parser.add_argument('--inventory', required=True, type=Path)
    parser.add_argument('--signature', required=True, type=Path)
    parser.add_argument('--confirm-hardware-touch', action='store_true')
    args = parser.parse_args()
    result = sign(args.inventory,args.signature,args.confirm_hardware_touch) if args.operation == 'sign-approval' else verify(args.inventory,args.signature)
    print(gate.canonical(result).decode(),end='')

if __name__ == '__main__': main()
