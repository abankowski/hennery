"""Credential-free process boundary for unprivileged release verification."""
from contextlib import contextmanager
import os
from pathlib import Path
import subprocess
import tempfile


@contextmanager
def environment():
    # Unknown future credentials must also be excluded. Certificate paths
    # contain public trust data only; no ambient helper/config paths survive.
    inherited = ('PATH', 'SSL_CERT_FILE', 'NIX_SSL_CERT_FILE', 'SSL_CERT_DIR')
    env = {key: os.environ[key] for key in inherited if key in os.environ}
    with tempfile.TemporaryDirectory(prefix='hennery-verify-', dir='/tmp') as temporary:
        home = Path(temporary)
        dirs = {'HOME': home, 'TMPDIR': home / 'tmp',
                'XDG_CONFIG_HOME': home / 'config', 'XDG_CACHE_HOME': home / 'cache',
                'XDG_DATA_HOME': home / 'data', 'XDG_STATE_HOME': home / 'state',
                'GH_CONFIG_DIR': home / 'gh', 'GNUPGHOME': home / 'gpg',
                'DOCKER_CONFIG': home / 'docker', 'ORAS_CONFIG_HOME': home / 'oras'}
        for key, path in dirs.items():
            path.mkdir(mode=0o700, exist_ok=True)
            env[key] = str(path)
        (dirs['GNUPGHOME'] / 'gpg.conf').write_text('no-autostart\nno-auto-key-retrieve\n')
        auth = dirs['DOCKER_CONFIG'] / 'config.json'
        auth.write_text('{"auths":{}}\n')
        env.update(REGISTRY_AUTH_FILE=str(auth), ORAS_CONFIG=str(auth),
                   GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null',
                   GIT_CONFIG_NOSYSTEM='1', GIT_TERMINAL_PROMPT='0',
                   GIT_NO_REPLACE_OBJECTS='1', LC_ALL='C.UTF-8')
        yield env


def run(command, **kwargs):
    """Run a verifier without inheriting parent transport authority."""
    if 'env' in kwargs:
        raise TypeError('verifier environment cannot be overridden')
    with environment() as env:
        return subprocess.run(command, env=env, **kwargs)
