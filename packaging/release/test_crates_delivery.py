"""Real spawned writer/broker isolation, with no registry or GitHub transport."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest import mock

import gate

FILE=Path(__file__).with_name('crates_delivery.py')
if FILE.is_file():
    import crates_delivery
else:
    crates_delivery=None


class CratesDelivery(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(crates_delivery,'private parent-owned crates gate broker missing')
        temporary=tempfile.TemporaryDirectory(prefix='crates-delivery-test-');self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name);self.signature=self.root/'signatures';self.signature.mkdir()
        self.env={'PATH':os.environ['PATH'],'GH_TOKEN':'must-not-leak','GITHUB_TOKEN':'must-not-leak',
                  'ACTIONS_ID_TOKEN_REQUEST_URL':'must-not-leak','ACTIONS_ID_TOKEN_REQUEST_TOKEN':'must-not-leak',
                  'GH_CONFIG_DIR':'/operator/config','HOME':'/operator/home','CARGO_HOME':'/operator/cargo',
                  'NODE_OPTIONS':'--require=/operator/code','SSL_CERT_FILE':'/allowed/cert'}

    def command(self,code):
        return [sys.executable,'-c',code]

    def execute(self,code,callback=lambda:'a'*64,**kwargs):
        return crates_delivery.run(self.root,self.signature,'chosen-crates-token',callback,
                                   environment=self.env,command=self.command(code),**kwargs)

    def test_real_child_receives_only_registry_token_private_paths_and_broker_fds(self):
        observed=self.root/'observed.json';seen=[]
        code=f'''import json,os
from pathlib import Path
request=int(os.environ['CRATES_GATE_REQUEST_FD']);reply=int(os.environ['CRATES_GATE_REPLY_FD'])
os.write(request,b'gate-v1:1\\n')
response=os.fdopen(reply,'rb').readline()
assert response==b'ok-v1:1:'+b'a'*64+b'\\n',response
Path({str(observed)!r}).write_text(json.dumps(dict(os.environ)))
'''
        def callback():seen.append(os.environ.get('GH_TOKEN'));return 'a'*64
        with mock.patch.dict(os.environ,{'GH_TOKEN':'parent-only'},clear=False):self.execute(code,callback)
        self.assertEqual(seen,['parent-only'])
        env=json.loads(observed.read_text());self.assertEqual(env['CARGO_REGISTRY_TOKEN'],'chosen-crates-token')
        self.assertEqual(env['SSL_CERT_FILE'],'/allowed/cert')
        self.assertFalse(set(env)&{'GH_TOKEN','GITHUB_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL','ACTIONS_ID_TOKEN_REQUEST_TOKEN','GH_CONFIG_DIR','NODE_OPTIONS'})
        self.assertNotEqual(env['HOME'],self.env['HOME']);self.assertNotEqual(env['CARGO_HOME'],self.env['CARGO_HOME'])
        self.assertFalse(Path(env['HOME']).exists(),'private child state must be removed after reap')

    def test_parent_denial_stops_child_and_returns_no_token_or_exception_detail(self):
        marker=self.root/'continued'
        code=f'''import os
from pathlib import Path
os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n')
data=os.read(int(os.environ['CRATES_GATE_REPLY_FD']),128)
if data.startswith(b'ok-'):Path({str(marker)!r}).touch()
'''
        def denied():raise RuntimeError('parent-only-GitHub-token')
        with self.assertRaises(gate.Refused) as failure:self.execute(code,denied)
        self.assertNotIn('parent-only-GitHub-token',str(failure.exception));self.assertFalse(marker.exists())

    def test_bad_sequence_duplicate_extra_and_oversized_requests_refuse(self):
        for request in (b'gate-v1:2\n',b'gate-v1:1 extra\n',b'GATE-v1:1\n',b'gate-v1:1\nextra\n',b'x'*129+b'\n',b'gate-v1:1\n'+b'x'*129+b'\n'):
            calls=[]
            code=f"import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),{request!r});os.read(int(os.environ['CRATES_GATE_REPLY_FD']),256)"
            with self.subTest(request=request[:25]),self.assertRaises(gate.Refused):self.execute(code,lambda:calls.append(1) or 'a'*64)
            if request!=b'gate-v1:1\nextra\n':self.assertEqual(calls,[])

    def test_missing_gate_requests_partial_eof_child_failure_and_bad_digest_refuse(self):
        for code in ('pass',"import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:')",'raise SystemExit(3)'):
            with self.subTest(code=code),self.assertRaises(gate.Refused):self.execute(code)
        for digest in ('short','A'*64,None):
            code="import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n');os.read(int(os.environ['CRATES_GATE_REPLY_FD']),256)"
            with self.subTest(digest=digest),self.assertRaises(gate.Refused):self.execute(code,lambda:digest)

    def test_timeout_kills_and_reaps_writer(self):
        pid=self.root/'pid'
        code=f"import os,time;from pathlib import Path;Path({str(pid)!r}).write_text(str(os.getpid()));time.sleep(60)"
        with self.assertRaises(gate.Refused):self.execute(code,timeout=0.5)
        if pid.exists():
            with self.assertRaises(ProcessLookupError):os.kill(int(pid.read_text()),0)

    def test_multiple_requests_require_fresh_parent_checks(self):
        calls=[]
        code='''import os
request=int(os.environ['CRATES_GATE_REQUEST_FD']);reply=os.fdopen(int(os.environ['CRATES_GATE_REPLY_FD']),'rb')
for i in range(1,4):
 os.write(request,f'gate-v1:{i}\\n'.encode())
 assert reply.readline()==f'ok-v1:{i}:'.encode()+b'a'*64+b'\\n'
'''
        self.execute(code,lambda:calls.append(1) or 'a'*64)
        self.assertEqual(calls,[1,1,1])

    def test_refusal_details_from_parent_are_not_exposed(self):
        code="import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n');os.read(int(os.environ['CRATES_GATE_REPLY_FD']),128)"
        def denied():raise gate.Refused('sensitive-parent-context')
        with self.assertRaises(gate.Refused) as failure:self.execute(code,denied)
        self.assertNotIn('sensitive-parent-context',str(failure.exception))

    def test_actual_node_broker_strict_reply_shape_sequence_and_eof(self):
        import subprocess
        publisher=Path(__file__).resolve().parents[2]/'packaging/publish-crates.mjs'
        program=f"import {{gateBroker}} from {str(publisher)!r};if(gateBroker()!=='{'a'*64}')process.exitCode=3;"
        responses=[b'ok-v1:1:'+b'a'*64+b'\n',b'ok-v1:2:'+b'a'*64+b'\n',b'ok-v1:1:'+b'A'*64+b'\n',
                   b'ok-v1:1:'+b'a'*64,b'wrong\n',b'x'*129+b'\n',b'',
                   b'\xefk-v1:1:'+b'a'*64+b'\n']
        for index,response in enumerate(responses):
            request_read,request_write=os.pipe();reply_read,reply_write=os.pipe()
            try:
                environment={'PATH':os.environ['PATH'],'HOME':str(self.root),'CRATES_GATE_REQUEST_FD':str(request_write),'CRATES_GATE_REPLY_FD':str(reply_read)}
                process=subprocess.Popen(['node','--input-type=module','-e',program],env=environment,stdin=subprocess.DEVNULL,
                                         stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,pass_fds=(request_write,reply_read))
                os.close(request_write);request_write=None;os.close(reply_read);reply_read=None
                os.write(reply_write,response);os.close(reply_write);reply_write=None
                self.assertEqual(os.read(request_read,128),b'gate-v1:1\n')
                result=process.wait(timeout=10)
                with self.subTest(response=response[:25]):
                    if index==0:self.assertEqual(result,0)
                    else:self.assertNotEqual(result,0)
            finally:
                for descriptor in (request_read,request_write,reply_read,reply_write):
                    if descriptor is not None:os.close(descriptor)
                if process.poll() is None:process.kill()
                process.wait()

    def test_delivery_parameters_refuse_before_spawn(self):
        for token,timeout in (('',1),(None,1),('token',0),('token',-1)):
            with self.subTest(token=token,timeout=timeout),mock.patch.object(crates_delivery.subprocess,'Popen') as spawn:
                with self.assertRaises(gate.Refused):crates_delivery.run(self.root,self.signature,token,lambda:'a'*64,environment=self.env,timeout=timeout)
                spawn.assert_not_called()

    def test_fd_cleanup_on_success_denial_and_child_error(self):
        original=os.pipe
        for mode in ('success','denial','child-error','closed-reply'):
            descriptors=[]
            def pipes():
                result=original();descriptors.extend(result);return result
            code="import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n');os.read(int(os.environ['CRATES_GATE_REPLY_FD']),128)"
            if mode=='child-error':code+=';raise SystemExit(7)'
            if mode=='closed-reply':code="import os;os.close(int(os.environ['CRATES_GATE_REPLY_FD']));os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n')"
            def callback():
                if mode=='denial':raise gate.Refused('denied')
                return 'a'*64
            with mock.patch.object(crates_delivery.os,'pipe',side_effect=pipes):
                if mode=='success':self.execute(code,callback)
                else:
                    with self.assertRaises(gate.Refused):self.execute(code,callback)
            for descriptor in descriptors:
                with self.subTest(mode=mode,descriptor=descriptor),self.assertRaises(OSError):os.fstat(descriptor)

    def test_request_budget_refuses_before_another_parent_authorization(self):
        calls=[]
        code='''import os
request=int(os.environ['CRATES_GATE_REQUEST_FD']);reply=os.fdopen(int(os.environ['CRATES_GATE_REPLY_FD']),'rb')
for i in range(1,3):
 os.write(request,f'gate-v1:{i}\\n'.encode())
 reply.readline()
'''
        with mock.patch.object(crates_delivery,'MAX_REQUESTS',1),self.assertRaises(gate.Refused):
            self.execute(code,lambda:calls.append(1) or 'a'*64)
        self.assertEqual(calls,[1])

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
        with mock.patch.object(crates_delivery.tempfile,'TemporaryDirectory',side_effect=directory),mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.os,'read',return_value=b''):
            with self.assertRaises(gate.Refused):self.execute('pass')
        self.assertEqual(events,['kill','wait','cleanup'])
        self.assertFalse(Path(temporary.name).exists())

    def test_partial_reply_write_is_a_refusal(self):
        class Child:
            def poll(self):return 0
            def wait(self,*args,**kwargs):return 0
        with mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.select,'select',return_value=([1],[],[])),mock.patch.object(crates_delivery.os,'read',side_effect=[b'gate-v1:1\n',b'']),mock.patch.object(crates_delivery.os,'write',return_value=0):
            with self.assertRaises(gate.Refused):self.execute('pass')

    def test_expired_deadline_does_not_invoke_parent_authorization(self):
        class Child:
            def poll(self):return 0
            def wait(self,*args,**kwargs):return 0
        callback=mock.Mock(return_value='a'*64)
        with mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.time,'monotonic',side_effect=[0,2,2,2]),mock.patch.object(crates_delivery.select,'select',return_value=([1],[],[])),mock.patch.object(crates_delivery.os,'read',side_effect=[b'gate-v1:1\n',b'']),mock.patch.object(crates_delivery.os,'write',return_value=80):
            with self.assertRaises(gate.Refused):self.execute('pass',callback,timeout=1)
            callback.assert_not_called()

    def test_expired_parent_check_never_sends_an_authorization_reply(self):
        class Child:
            def poll(self):return 0
            def wait(self,*args,**kwargs):return 0
        clock=[0]
        def callback():clock[0]=2;return 'a'*64
        with mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.time,'monotonic',side_effect=lambda:clock[0]),mock.patch.object(crates_delivery.select,'select',return_value=([1],[],[])),mock.patch.object(crates_delivery.os,'read',side_effect=[b'gate-v1:1\n',b'']),mock.patch.object(crates_delivery.os,'write',return_value=80) as write:
            with self.assertRaises(gate.Refused):self.execute('pass',callback,timeout=1)
            write.assert_not_called()
