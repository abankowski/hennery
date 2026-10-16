"""Reconcile deterministic Sigstore OCI referrers, then return fetched bundle bytes.

No keyless verification occurs here. The caller verifies returned bundle paths
against its local frozen OCI manifests before considering publication complete.
"""
from pathlib import Path
import re
import subprocess
import tempfile

import contract
import gate

BUNDLE = 'application/vnd.dev.sigstore.bundle.v0.3+json'
MANIFEST = 'application/vnd.oci.image.manifest.v1+json'
INDEX = 'application/vnd.oci.image.index.v1+json'
EMPTY = 'application/vnd.oci.empty.v1+json'
CREATED = '1970-01-01T00:00:00Z'
PROVENANCE = 'https://slsa.dev/provenance/v1'
SPDX = 'https://spdx.dev/Document'
REPOSITORY = 'ghcr.io/marcinwadon/hennery'
DIGEST = r'sha256:[0-9a-f]{64}'
MAX_BYTES = 16*1024*1024
# Use only the caller's private tool configuration and explicitly provided
# transport settings. Never inherit job tokens or OIDC authority into ORAS.
ENVIRONMENT = {'PATH','HOME','TMPDIR','TMP','TEMP','SYSTEMROOT','LANG','LC_ALL',
               'SSL_CERT_FILE','SSL_CERT_DIR','NIX_SSL_CERT_FILE','XDG_CONFIG_HOME',
               'DOCKER_CONFIG','GH_CONFIG_DIR','GNUPGHOME','GIT_CONFIG_GLOBAL',
               'GIT_CONFIG_SYSTEM','GIT_TERMINAL_PROMPT','HTTP_PROXY','HTTPS_PROXY',
               'ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'}


def descriptor(raw, media):
    return {'mediaType':media,'digest':'sha256:'+gate.digest(raw),'size':len(raw)}


def json_bytes(raw):
    try:
        # Decode explicitly: json.loads(bytes) accepts a BOM whereas the string
        # decoder rejects it. No encoding-dependent verdict is permitted.
        return gate.strict_json(raw.decode('utf-8'))
    except UnicodeError as error:
        raise gate.Refused('invalid OCI JSON encoding') from error


def valid_descriptor(expected):
    gate.require(isinstance(expected,dict) and isinstance(expected.get('digest'),str)
                 and re.fullmatch(DIGEST,expected['digest']) and type(expected.get('size')) is int
                 and 0 < expected['size'] <= MAX_BYTES,'invalid OCI referrer descriptor')


def checked(raw, expected):
    valid_descriptor(expected)
    gate.require(len(raw)==expected['size'] and 'sha256:'+gate.digest(raw)==expected['digest'],
                 'fetched OCI manifest/blob digest or size differs')
    return raw


def inputs(subjects):
    subjects=list(subjects)
    expected={('index','provenance')} | {(arch,kind) for arch in ('amd64','arm64')
               for kind in ('provenance','image-sbom','binary-sbom')}
    gate.require(len(subjects)==7 and all(isinstance(item,(list,tuple)) and len(item)==5
                 and all(isinstance(part,str) for part in item[:4]) for item in subjects),
                 'exactly seven frozen OCI bundle subjects required')
    gate.require({(item[0],item[1]) for item in subjects}==expected,'duplicate or unknown OCI bundle selection')
    digests={}
    rows=[]
    for subject,kind,digest,predicate,path in subjects:
        gate.require(isinstance(digest,str) and re.fullmatch(DIGEST,digest)
                     and predicate==(PROVENANCE if kind=='provenance' else SPDX),'invalid OCI bundle digest/predicate')
        gate.require(subject not in digests or digests[subject]==digest,'platform bundle subjects disagree')
        digests[subject]=digest
        path=Path(path)
        gate.require(path.name==f'ghcr-{subject}-{kind}.json','unexpected frozen OCI bundle filename')
        raw=contract.regular(path)
        gate.require(0 < len(raw) <= MAX_BYTES,'frozen OCI bundle size outside permitted limit')
        rows.append((subject,kind,digest,predicate,path,raw))
    gate.require(len(set(digests.values()))==3,'index/platform digests must be distinct')
    return rows


def frozen(rows):
    gate.require(all(contract.regular(row[4])==row[5] for row in rows),'frozen OCI bundle changed during reconciliation')


def pinned_manifest(subject, predicate, path, raw):
    config=descriptor(b'{}',EMPTY) | {'data':'e30='}
    layer=descriptor(raw,BUNDLE) | {'annotations':{'org.opencontainers.image.title':path.name}}
    return gate.canonical({'schemaVersion':2,'mediaType':MANIFEST,'artifactType':BUNDLE,
                           'config':config,'layers':[layer],'subject':subject,
                           'annotations':{'org.opencontainers.image.created':CREATED,
                                          'dev.sigstore.bundle.predicateType':predicate,
                                          'dev.sigstore.bundle.content':'dsse-envelope'}})


def reconcile(subjects, output_directory, before_write, *, environment, auth=None, layout=None):
    """Verify existing seven referrers, copy only missing, return fetched tuples.

    before_write is required and authorizes each content-addressed ORAS copy.
    ORAS transfers only absent graph objects. An ambiguous copy never implies
    success; a renewed invocation must rediscover and verify the stored bytes.
    layout selects disposable offline transport; production origin is fixed.
    """
    rows=inputs(subjects)
    gate.require(callable(before_write),'OCI bundle writer requires a live verification callback')
    env={key:value for key,value in environment.items() if key in ENVIRONMENT}
    gate.require(env.get('HOME') and env.get('DOCKER_CONFIG'),'private OCI tool environment required')
    if layout is None:
        gate.require(auth is not None,'dedicated registry auth file required')
        auth=Path(auth);contract.regular(auth);auth=auth.resolve()
        target=REPOSITORY;options=['--registry-config',str(auth)]
        copy_options=['--to-registry-config',str(auth)]
    else:
        gate.require(auth is None,'offline OCI layout must not receive registry credentials')
        layout=Path(layout)
        gate.require(layout.is_dir() and not layout.is_symlink(),'nonregular OCI layout')
        target=str(layout.resolve());options=['--oci-layout'];copy_options=['--to-oci-layout']

    def run(arguments):
        try:
            return subprocess.run(['oras',*arguments],check=True,capture_output=True,env=env).stdout
        except subprocess.CalledProcessError as error:
            # Never log credentials/config contents or attempt alternate auth.
            raise gate.Refused('OCI referrer transport failed; reconcile under renewed approval') from error

    def fetch(kind,digest):
        return run([kind,'fetch',*options,*(['--output','-'] if kind=='blob' else []),target+'@'+digest])

    # Pin subject descriptors to actual bytes at each independently expected
    # digest, not untrusted discover annotations or mutable version tags.
    subject_bytes={};subject_descriptors={}
    for row in rows:
        digest=row[2]
        if digest in subject_bytes:continue
        raw=fetch('manifest',digest)
        value=json_bytes(raw)
        gate.require(isinstance(value,dict) and value.get('schemaVersion')==2 and value.get('mediaType') in (MANIFEST,INDEX),
                     'unexpected OCI subject manifest type')
        actual=descriptor(raw,value['mediaType'])
        gate.require(actual['digest']==digest,'fetched OCI subject digest differs')
        subject_bytes[digest]=raw;subject_descriptors[digest]=actual

    records={}
    for row in rows:
        manifest=pinned_manifest(subject_descriptors[row[2]],row[3],row[4],row[5])
        ref=descriptor(manifest,MANIFEST)
        records[ref['digest']]={'row':row,'manifest':manifest,'descriptor':ref}

    def scan(digest):
        result=json_bytes(run(['discover',*options,'--artifact-type',BUNDLE,'--depth','1','--format','json',target+'@'+digest]))
        gate.require(isinstance(result,dict) and isinstance(result.get('referrers'),list),'invalid OCI referrer discovery')
        present={}
        for desc in result['referrers']:
            gate.require(isinstance(desc,dict) and desc.get('artifactType')==BUNDLE
                         and desc.get('mediaType')==MANIFEST,'unexpected OCI referrer type')
            valid_descriptor(desc)
            raw=checked(fetch('manifest',desc['digest']),desc)
            # Strict decoding rejects duplicate/escaped/case-ambiguous keys even
            # when a downstream JSON parser might interpret them differently.
            value=json_bytes(raw)
            record=records.get(desc['digest'])
            gate.require(record is not None and raw==record['manifest']
                         and value.get('subject')==subject_descriptors[digest],
                         'existing OCI referrer differs from its frozen manifest')
            gate.require(desc['digest'] not in present,'duplicate OCI referrer digest')
            config=value['config'];checked(fetch('blob',config['digest']),config)
            layer=value['layers'][0];bundle=checked(fetch('blob',layer['digest']),layer)
            gate.require(bundle==record['row'][5],'fetched OCI bundle differs from frozen bytes')
            present[desc['digest']]=bundle
        return present

    present={}
    for digest in subject_bytes:present.update(scan(digest))
    with tempfile.TemporaryDirectory(prefix='release-referrer-layout-') as temporary:
        stage=Path(temporary);blobs=stage/'blobs/sha256';blobs.mkdir(parents=True)
        (stage/'oci-layout').write_bytes(gate.canonical({'imageLayoutVersion':'1.0.0'}))
        (stage/'index.json').write_bytes(gate.canonical({'schemaVersion':2,'manifests':[
            record['descriptor'] | {'artifactType':BUNDLE} for record in records.values()]}))
        def store(raw):
            (blobs/gate.digest(raw)).write_bytes(raw)
        store(b'{}')
        for raw in subject_bytes.values():store(raw)
        for record in records.values():store(record['manifest']);store(record['row'][5])
        for digest,record in records.items():
            if digest in present:continue
            before_write()
            frozen(rows)
            # A gate may outlast another successful attachment. Reconcile again
            # after approval to avoid duplicating matching completed work.
            present.update(scan(record['row'][2]))
            if digest in present:continue
            run(['copy','--from-oci-layout',*copy_options,'--concurrency','1',
                 str(stage)+'@'+digest,target+'@'+digest])
            present.update(scan(record['row'][2]))
            gate.require(digest in present,'new OCI referrer missing from read-back discovery')

    fetched={}
    for digest in subject_bytes:fetched.update(scan(digest))
    gate.require(set(fetched)==set(records),'OCI referrer set incomplete after reconciliation')
    frozen(rows)
    output=Path(output_directory)
    gate.require(not output.is_symlink() and (not output.exists() or output.is_dir()),'nonregular fetched bundle output')
    output.mkdir(parents=True,exist_ok=True)
    paths={}
    for digest,record in records.items():
        path=output/record['row'][4].name
        if path.exists() or path.is_symlink():
            gate.require(contract.regular(path)==fetched[digest],'fetched bundle output changed')
        else:
            with path.open('xb') as destination:destination.write(fetched[digest])
        paths[record['row'][4].name]=path
    return [tuple(row[:4])+(paths[row[4].name],) for row in rows]
