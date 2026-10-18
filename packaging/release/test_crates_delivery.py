"""Real spawned uploader isolation, with no registry or GitHub transport."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

import crates_delivery
import gate


class CratesDelivery(unittest.TestCase):
    def setUp(self):
        temporary=tempfile.TemporaryDirectory(prefix='crates-delivery-test-');self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name)
        (self.root/'crates-inventory.json').write_text(json.dumps({'crates':[{}]*7}))
        self.env={'PATH':os.environ['PATH'],'GH_TOKEN':'must-not-leak','GITHUB_TOKEN':'must-not-leak',
                  'ACTIONS_ID_TOKEN_REQUEST_URL':'must-not-leak','ACTIONS_ID_TOKEN_REQUEST_TOKEN':'must-not-leak',
                  'GH_CONFIG_DIR':'/operator/config','HOME':'/operator/home','CARGO_HOME':'/operator/cargo',
                  'NODE_OPTIONS':'--require=/operator/code','SSL_CERT_FILE':'/allowed/cert'}

    def execute(self,code,**kwargs):
        return crates_delivery.run(self.root,'chosen-crates-token','a'*64,
                                   environment=self.env,command=[sys.executable,'-c',code],**kwargs)

    def test_real_child_receives_only_registry_token_and_private_paths(self):
        observed=self.root/'observed.json'
        code=f'''import json,os
from pathlib import Path
Path({str(observed)!r}).write_text(json.dumps(dict(os.environ)))
'''
        with mock.patch.dict(os.environ,{'GH_TOKEN':'parent-only'},clear=False):self.execute(code)
        env=json.loads(observed.read_text());self.assertEqual(env['CARGO_REGISTRY_TOKEN'],'chosen-crates-token')
        self.assertEqual(env['SSL_CERT_FILE'],'/allowed/cert')
        self.assertFalse(set(env)&{'GH_TOKEN','GITHUB_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL','ACTIONS_ID_TOKEN_REQUEST_TOKEN','GH_CONFIG_DIR','NODE_OPTIONS'})
        self.assertNotEqual(env['HOME'],self.env['HOME']);self.assertNotEqual(env['CARGO_HOME'],self.env['CARGO_HOME'])
        self.assertFalse(Path(env['HOME']).exists(),'private child state must be removed after reap')

    def test_timeout_kills_and_reaps_writer(self):
        pid=self.root/'pid'
        code=f"import os,time;from pathlib import Path;Path({str(pid)!r}).write_text(str(os.getpid()));time.sleep(60)"
        with self.assertRaises(gate.Refused):self.execute(code,timeout=0.5)
        if pid.exists():
            with self.assertRaises(ProcessLookupError):os.kill(int(pid.read_text()),0)

    def test_writer_stderr_is_bounded_drained_and_token_redacted(self):
        code='''import os,sys
sys.stderr.write('HTTP 400: A verified email address is required '+os.environ['CARGO_REGISTRY_TOKEN']+' '+('x'*131072)+' END-OF-STDERR')
raise SystemExit(1)
'''
        with self.assertRaises(gate.Refused) as failure:self.execute(code)
        message=str(failure.exception)
        self.assertIn('HTTP 400: A verified email address is required',message)
        self.assertIn('[REDACTED]',message)
        self.assertNotIn('chosen-crates-token',message)
        self.assertNotIn('END-OF-STDERR',message)
        self.assertLess(len(message),4300)

    def test_delivery_parameters_refuse_before_spawn(self):
        for token,digest,timeout in (('', 'a'*64,1),(None,'a'*64,1),('token','short',1),('token','a'*64,0),('token','a'*64,-1)):
            with self.subTest(token=token,digest=digest,timeout=timeout),mock.patch.object(crates_delivery.subprocess,'Popen') as spawn:
                with self.assertRaises(gate.Refused):crates_delivery.run(self.root,token,digest,environment=self.env,timeout=timeout)
                spawn.assert_not_called()

    def test_fd_cleanup_on_success_and_child_error(self):
        original=os.pipe
        for code in ('pass','raise SystemExit(7)'):
            descriptors=[]
            def pipes():
                result=original();descriptors.extend(result);return result
            with mock.patch.object(crates_delivery.os,'pipe',side_effect=pipes):
                if code=='pass':self.execute(code)
                else:
                    with self.assertRaises(gate.Refused):self.execute(code)
            for descriptor in descriptors:
                with self.subTest(code=code,descriptor=descriptor),self.assertRaises(OSError):os.fstat(descriptor)

    def test_cleanup_kills_and_reaps_before_removing_private_configuration(self):
        events=[];temporary=None
        realtemporary=tempfile.TemporaryDirectory
        class Child:
            def poll(self):return None
            def kill(self):events.append('kill')
            def wait(self,*args,**kwargs):events.append('wait');return 1
        def directory(*args,**kwargs):
            nonlocal temporary
            temporary=realtemporary(*args,**kwargs)
            original=temporary.cleanup
            def cleanup():events.append('cleanup');original()
            temporary.cleanup=cleanup
            return temporary
        with mock.patch.object(crates_delivery.tempfile,'TemporaryDirectory',side_effect=directory),mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.os,'read',side_effect=OSError('fixture stderr failure')):
            with self.assertRaises(gate.Refused):self.execute('pass')
        self.assertEqual(events,['kill','wait','cleanup'])
        self.assertFalse(Path(temporary.name).exists())

    def test_deadline_scales_with_crates_and_poll_limits(self):
        limits=crates_delivery.LIMITS
        expected=(limits['transfer_timeout_ms']+7*(limits['api_timeout_ms']+limits['transfer_timeout_ms']
                  +limits['poll_attempts']*limits['poll_interval_ms']))/1000
        self.assertEqual(crates_delivery.delivery_timeout(7),expected)
        self.assertGreater(expected,1800)
        # Changes to the poll budget must affect the actual writer deadline.
        with mock.patch.dict(limits,poll_attempts=limits['poll_attempts']+1):
            self.assertEqual(crates_delivery.delivery_timeout(7)-expected,7*limits['poll_interval_ms']/1000)
