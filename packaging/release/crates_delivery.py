"""Private gate broker: GitHub authorization stays in the credentialed parent."""
import os
from pathlib import Path
import re
import select
import subprocess
import tempfile
import time

import gate

ROOT=Path(__file__).resolve().parents[2]
MAX_LINE=128
MAX_REQUESTS=10000


def run(root, signatures, token, gatecallback, *, environment, command=None, timeout=1800):
    """Run the frozen uploader with only its chosen registry credential.

    The callback executes in this process and returns the freshly verified
    crates-inventory digest. Neither GitHub credentials nor verifier subprocesses
    cross the private request/reply pipes. No child-selected path is trusted.
    """
    gate.require(isinstance(token,str) and bool(token),'crates publishing credential absent')
    gate.require(timeout>0,'invalid crates delivery deadline')
    process=None;descriptors=[];temporary=None
    try:
        temporary=tempfile.TemporaryDirectory(prefix='release-crates-writer-')
        home=Path(temporary.name)
        # Even a caller-supplied map is filtered. Ambient process state,
        # shell hooks, proxy credentials and installed configuration are out.
        allowed=('PATH','SSL_CERT_FILE','SSL_CERT_DIR','NIX_SSL_CERT_FILE')
        child={key:environment[key] for key in allowed if key in environment}
        child['PATH']=child.get('PATH',os.defpath)
        child.update(HOME=str(home),CARGO_HOME=str(home/'cargo'),XDG_CONFIG_HOME=str(home/'config'),
                     XDG_CACHE_HOME=str(home/'cache'),XDG_DATA_HOME=str(home/'data'),
                     GITHUB_ACTIONS='true',CARGO_REGISTRY_TOKEN=token)
        request_read,request_write=os.pipe();descriptors.extend((request_read,request_write))
        reply_read,reply_write=os.pipe();descriptors.extend((reply_read,reply_write))
        child.update(CRATES_GATE_REQUEST_FD=str(request_write),CRATES_GATE_REPLY_FD=str(reply_read))
        args=command if command is not None else ['node',str(ROOT/'packaging/publish-crates.mjs'),str(root),str(signatures)]
        process=subprocess.Popen(args,env=child,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL,pass_fds=(request_write,reply_read))
        for descriptor in (request_write,reply_read):os.close(descriptor);descriptors.remove(descriptor)
        deadline=time.monotonic()+timeout;pending=b'';sequence=0;eof=False
        while not eof:
            remaining=deadline-time.monotonic()
            gate.require(remaining>0,'crates writer deadline exceeded')
            ready,_,_=select.select([request_read],[],[],min(remaining,1))
            if not ready:continue
            chunk=os.read(request_read,MAX_LINE+1)
            if not chunk:
                eof=True;break
            pending+=chunk
            gate.require(len(pending)<=MAX_LINE,'oversized crates gate request')
            while b'\n' in pending:
                line,pending=pending.split(b'\n',1)
                sequence+=1
                gate.require(sequence<=MAX_REQUESTS and line==f'gate-v1:{sequence}'.encode(),
                             'invalid crates gate protocol or sequence')
                try:current=gatecallback()
                except Exception:raise gate.Refused('parent crates authorization refused') from None
                gate.require(isinstance(current,str) and re.fullmatch('[0-9a-f]{64}',current),
                             'parent crates gate returned invalid digest')
                gate.require(deadline-time.monotonic()>0,'parent crates authorization exceeded writer deadline')
                response=f'ok-v1:{sequence}:{current}\n'.encode()
                gate.require(os.write(reply_write,response)==len(response),'incomplete crates gate response')
        gate.require(not pending and sequence>0,'crates writer ended without a complete gate request')
        try:result=process.wait(timeout=max(0.001,deadline-time.monotonic()))
        except subprocess.TimeoutExpired:raise gate.Refused('crates writer deadline exceeded') from None
        gate.require(result==0,'crates writer failed; reconcile frozen bytes before retry')
        return {'state':'published'}
    except gate.Refused:
        raise
    except Exception:
        # Callback and child exceptions may include credentials. The parent
        # records only this fixed refusal; no child stderr or exception text.
        raise gate.Refused('crates gate broker refused; reconcile before retry') from None
    finally:
        for descriptor in descriptors:
            try:os.close(descriptor)
            except OSError:pass
        if process is not None:
            if process.poll() is None:process.kill()
            process.wait()
        if temporary is not None:temporary.cleanup()
