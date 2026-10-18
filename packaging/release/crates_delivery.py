"""Run the verified crates writer without the parent's GitHub credentials."""
import json
import os
from pathlib import Path
import re
import select
import subprocess
import tempfile
import time

import gate

ROOT=Path(__file__).resolve().parents[2]
MAX_STDERR=4096
LIMITS=json.loads((ROOT/'packaging/crates-publish-limits.json').read_text())


def delivery_timeout(crate_count):
    # Each crate gets an existence check, upload (or existing download), and
    # one shared API/CDN/index propagation window. Allow one transfer timeout
    # for process startup and local hashing as well. Seven crates: 75.5 minutes.
    return (LIMITS['transfer_timeout_ms']+crate_count*(LIMITS['api_timeout_ms']
            +LIMITS['transfer_timeout_ms']+LIMITS['poll_attempts']*LIMITS['poll_interval_ms']))/1000


def run(root, token, digest, *, environment, command=None, timeout=None):
    """Run the frozen uploader with only its chosen registry credential.

    The parent has already verified the full release and passes the authenticated
    inventory digest. The uploader checks local bytes at each upload boundary.
    """
    gate.require(isinstance(token,str) and bool(token),'crates publishing credential absent')
    gate.require(isinstance(digest,str) and re.fullmatch('[0-9a-f]{64}',digest),'verified crates inventory digest absent')
    if timeout is None:
        inventory=gate.strict_json((Path(root)/'crates-inventory.json').read_bytes())
        timeout=delivery_timeout(len(inventory['crates']))
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
        stderr_read,stderr_write=os.pipe();descriptors.extend((stderr_read,stderr_write))
        args=command if command is not None else ['node',str(ROOT/'packaging/publish-crates.mjs'),str(root),digest]
        process=subprocess.Popen(args,env=child,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
                                 stderr=stderr_write)
        os.close(stderr_write);descriptors.remove(stderr_write)
        deadline=time.monotonic()+timeout;stderr=b''
        readers=[stderr_read]
        # Retain only a bounded prefix, but keep draining so a verbose child
        # cannot block on its stderr pipe. Look ahead enough to redact a token
        # crossing the displayed prefix boundary before truncating the message.
        stderr_limit=MAX_STDERR+len(token.encode())
        while readers:
            remaining=deadline-time.monotonic()
            gate.require(remaining>0,'crates writer deadline exceeded')
            ready,_,_=select.select(readers,[],[],min(remaining,1))
            for descriptor in ready:
                chunk=os.read(descriptor,4096)
                if not chunk:
                    readers.remove(descriptor);continue
                stderr=(stderr+chunk)[:stderr_limit]
        detail=stderr.decode('utf-8',errors='replace').replace(token,'[REDACTED]')[:MAX_STDERR].strip()
        try:result=process.wait(timeout=max(0.001,deadline-time.monotonic()))
        except subprocess.TimeoutExpired:raise gate.Refused('crates writer deadline exceeded') from None
        gate.require(result==0,'crates writer failed; reconcile frozen bytes before retry' + (': '+detail if detail else ''))
        return {'state':'published'}
    except gate.Refused:
        raise
    except Exception:
        # Unexpected exceptions may include credentials. Only explicitly
        # captured, bounded and redacted child stderr is safe to expose above.
        raise gate.Refused('crates writer refused; reconcile before retry') from None
    finally:
        for descriptor in descriptors:
            try:os.close(descriptor)
            except OSError:pass
        if process is not None:
            if process.poll() is None:process.kill()
            process.wait()
        if temporary is not None:temporary.cleanup()
