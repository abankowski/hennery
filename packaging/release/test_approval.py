"""The detached, touched maintainer signature is the release trust root."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import gate
import approval
import verify


class Approval(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.inventory = self.root / 'release-inventory.json'
        self.inventory.write_bytes(gate.canonical({'repository': gate.REPOSITORY, 'tag': 'v0.1.0', 'source_sha': 'a'*40, 'artifacts': []}))
        self.signature = self.root / 'release-inventory.json.asc'
        self.signature.write_text('-----BEGIN PGP SIGNATURE-----\nfixture\n-----END PGP SIGNATURE-----\n')

    def transport(self, command, **kwargs):
        if '--verify' in command:
            self.assertEqual(Path(command[-1]).read_bytes(), self.inventory.read_bytes())
            return subprocess.CompletedProcess(command, 0, '[GNUPG:] VALIDSIG '+approval.FINGERPRINT+' 0 0 0 4 0 1 10 00\n', '')
        return subprocess.CompletedProcess(command, 0, '', '')

    def test_exact_inventory_verified_with_isolated_pinned_key(self):
        with patch.object(approval.subprocess, 'run', side_effect=self.transport) as run:
            self.assertEqual(approval.verify(self.inventory, self.signature)['inventory_sha256'], gate.digest(self.inventory.read_bytes()))
        self.assertTrue(any('--no-autostart' in c.args[0] for c in run.call_args_list))

    def test_missing_malformed_other_key_and_different_inventory_refused(self):
        for kind in ('missing', 'malformed', 'other-key', 'different-inventory'):
            with self.subTest(kind=kind):
                self.signature.write_text('-----BEGIN PGP SIGNATURE-----\nfixture\n-----END PGP SIGNATURE-----\n')
                if kind == 'missing': self.signature.unlink()
                if kind == 'malformed': self.signature.write_text('not a detached signature')
                def transport(command, **kwargs):
                    if '--verify' in command:
                        key = '0'*40 if kind == 'other-key' else approval.FINGERPRINT
                        return subprocess.CompletedProcess(command, 1 if kind == 'different-inventory' else 0, '[GNUPG:] VALIDSIG '+key+' 0\n', '')
                    return subprocess.CompletedProcess(command, 0, '', '')
                with patch.object(approval.subprocess, 'run', side_effect=transport), self.assertRaises(gate.Refused):
                    approval.verify(self.inventory, self.signature)

    def test_unsigned_tag_with_valid_looking_attestation_has_no_authority(self):
        import test_gate
        fixture=test_gate.Gates();fixture.setUp();self.addCleanup(fixture.tmp.cleanup)
        (fixture.root/'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        # Keep the old API and every other candidate check valid so the old
        # verifier demonstrably accepts this exact-tag attestation alone.
        with patch.object(verify.subprocess, 'run') as attest, patch.object(verify.supply,'verify_checksums'), patch.object(verify.supply,'verify_binary_inventory'), self.assertRaises(gate.Refused):
            verify.verify(fixture.root, Path('valid-exact-tag-bundle'), fixture.inventory['source_sha'], fixture.inventory['tag'])
        attest.assert_not_called()

    def test_signing_never_runs_in_ci_and_requires_explicit_touch_confirmation(self):
        for environment, confirmation in [({'CI':'true'},True), ({'GITHUB_ACTIONS':'true'},True), ({},False)]:
            with patch.dict(os.environ, environment, clear=True), patch.object(approval.subprocess, 'run') as run, self.assertRaises(gate.Refused):
                approval.sign(self.inventory, self.signature.with_name('new.asc'), confirmation)
            run.assert_not_called()

    def test_sign_cli_pins_subkey_and_uses_detach_sign_without_overwrite(self):
        output = self.signature.with_name('new.asc')
        def run(command, **kwargs):
            if '--detach-sign' in command: output.write_text(self.signature.read_text())
            return self.transport(command, **kwargs)
        with patch.dict(os.environ, {}, clear=True), patch.object(approval.subprocess,'run',side_effect=run) as call:
            approval.sign(self.inventory, output, True)
            command=next(c.args[0] for c in call.call_args_list if '--detach-sign' in c.args[0])
            self.assertIn(approval.FINGERPRINT+'!',command)
            self.assertNotIn('--pinentry-mode',command)
            with self.assertRaises(gate.Refused): approval.sign(self.inventory,output,True)

    def test_touch_confirmation_is_required_in_settings_audit(self):
        import test_settings, settings_audit
        for claim in ({}, {'confirmed':False}, {'confirmed':1,'fingerprint':approval.FINGERPRINT,'policy':'on'}, {'confirmed':True,'fingerprint':'0'*40,'policy':'on'}, {'confirmed':True,'fingerprint':approval.FINGERPRINT,'policy':'off'}):
            settings=test_settings.settings();settings['maintainer_touch']=claim
            with self.subTest(claim=claim),self.assertRaisesRegex(gate.Refused,'touch'):
                settings_audit.validate_settings(settings,['github'])

    def test_channel_gate_requires_hardware_approval_before_live_evidence(self):
        import sys, json, test_gate, supply
        fixture=test_gate.Gates();fixture.setUp();self.addCleanup(fixture.tmp.cleanup)
        (fixture.root/'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        inputs={key:fixture.inventory[key] for key in ('source_sha','tag','channels','targets','candidate')}
        for key in ('channels','targets','candidate'): inputs[key]=json.dumps(inputs[key])
        inputs.update(inventory_sha256=fixture.digest,settings_audit_sha256='b'*64,settings_audit='{}')
        event=self.root/'event.json';event.write_text(json.dumps({'inputs':inputs}))
        environment={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_REF':'refs/tags/'+fixture.inventory['tag'],'GITHUB_SHA':fixture.inventory['source_sha'],'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_EVENT_PATH':str(event),'GITHUB_RUN_ID':'20','GITHUB_RUN_ATTEMPT':'1','GH_TOKEN':'offline','RELEASE_AUDIT_BUCKET':'offline'}
        args=['gate.py','--candidate',str(fixture.root),'--inventory-sha256',fixture.digest,'--channel','github','--phase','preflight','--receipt',str(self.root/'receipt.json')]
        with patch.dict(os.environ,environment,clear=True),patch.object(sys,'argv',args),patch.object(supply,'require_contract'),patch.object(supply,'verify_binary_inventory'),patch.object(gate.GitHub,'evidence',return_value={}) as live,patch.object(gate,'validate',return_value={}),patch('retention.audit'),self.assertRaises(gate.Refused):
            gate.main()
        live.assert_not_called()

    def test_actual_openpgp_checks_exact_bytes_and_pinned_key(self):
        # Disposable software key tests cryptography only, never the maintainer
        # key or hardware-touch claim. No private key leaves this temp keyring.
        import json
        with tempfile.TemporaryDirectory(prefix='r1-gpg-') as home:
            env=dict(os.environ, GNUPGHOME=home)
            def gpg(*args):
                return subprocess.run(['gpg','--batch','--pinentry-mode','loopback','--passphrase','',*args],env=env,check=True,capture_output=True,text=True)
            try:
                gpg('--quick-generate-key','R1 disposable test','ed25519','sign','1d')
                keys=gpg('--with-colons','--list-keys').stdout
                fingerprint=next(line.split(':')[9] for line in keys.splitlines() if line.startswith('fpr:'))
                public=self.root/'test-public.asc';public.write_text(gpg('--armor','--export',fingerprint).stdout)
                self.signature.unlink()
                gpg('--armor','--output',str(self.signature),'--detach-sign',str(self.inventory))
                import shutil
                actual_run=subprocess.run
                def pinned_import(command, **kwargs):
                    if '--import' in command: command=[*command[:-1],str(public)]
                    return actual_run(command,**kwargs)
                with patch.object(approval.subprocess,'run',side_effect=pinned_import):
                    # Valid cryptography from another key must still refuse.
                    with self.assertRaises(gate.Refused): approval.verify(self.inventory,self.signature)
                    with patch.object(approval,'FINGERPRINT',fingerprint):
                        approval.verify(self.inventory,self.signature)
                        self.inventory.write_bytes(gate.canonical({'different':'inventory'}))
                        with self.assertRaises(gate.Refused): approval.verify(self.inventory,self.signature)
            finally:
                subprocess.run(['gpgconf','--kill','gpg-agent'],env=env,check=True,capture_output=True)

    def test_publisher_missing_root_signature_stops_before_remote_access(self):
        import sys, publish, test_gate
        fixture=test_gate.Gates();fixture.setUp();self.addCleanup(fixture.tmp.cleanup)
        (fixture.root/'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        (self.root/'release.sigstore.jsonl').write_bytes(b'valid-looking exact-tag attestation')
        with patch.object(publish,'api') as remote, patch.object(sys,'argv',['publish.py','upload','--candidate',str(fixture.root),'--signatures',str(self.root),'--output',str(self.root/'result')]), self.assertRaises(gate.Refused):
            publish.main()
        remote.assert_not_called()

    def test_image_requires_signature_and_signed_digest_set(self):
        # A certificate identity alone, even on an unsigned exact tag, is no
        # release authority. Then verify signed digest membership separately.
        image='ghcr.io/marcinwadon/hennery@sha256:'+'b'*64
        import test_gate
        fixture=test_gate.Gates();fixture.setUp();self.addCleanup(fixture.tmp.cleanup)
        index=gate.canonical({'digest':'sha256:'+'b'*64})
        (fixture.root/'ghcr-index.json').write_bytes(index)
        fixture.inventory['channels']=['ghcr']
        fixture.inventory['artifacts'].append({'name':'ghcr-index.json','sha256':gate.digest(index),'size':len(index)})
        (fixture.root/'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        with patch.object(verify.subprocess,'run') as attest, self.assertRaises(gate.Refused):
            verify.verify_image(image,fixture.inventory['tag'],candidate=fixture.root,approval_signature=self.root/'missing.asc')
        attest.assert_not_called()
        index=gate.canonical({'digest':'sha256:'+'a'*64})
        (self.root/'ghcr-index.json').write_bytes(index)
        inventory={'tag':'v0.1.0','channels':['ghcr']}
        self.inventory.write_bytes(gate.canonical(inventory))
        proof={'inventory_sha256':gate.digest(self.inventory.read_bytes())}
        with patch.object(approval,'verify',return_value=proof) as checked, patch.object(gate,'verify_files'), patch.object(verify.subprocess,'run') as attest, self.assertRaisesRegex(gate.Refused,'image digest'):
            verify.verify_image(image,'v0.1.0',candidate=self.root,approval_signature=self.signature)
        checked.assert_called_once();attest.assert_not_called()

if __name__ == '__main__': unittest.main()
