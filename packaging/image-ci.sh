#!/bin/sh
# PR/main qualification of the RELEASE target with explicit CI fixture legal
# inputs. These are not reviewed notices/SBOMs and MUST NEVER be promoted.
set -eu
arch=$1
revision=$2
case "$arch" in amd64|arm64) ;; *) exit 1 ;; esac
output="dist/image-$arch"
version=0.0.0
[ ! -e "$output" ] || { echo 'CI output already exists' >&2; exit 1; }
mkdir -p "$output/layout"
python3 - "$arch" "$output" <<'PY'
import hashlib
import json
from pathlib import Path
import sys
arch, output = sys.argv[1:]
staged = Path('dist') / ('linux-' + arch)
digest = hashlib.sha256((staged / 'hennery').read_bytes()).hexdigest()
(staged / 'THIRD-PARTY-NOTICES').write_text('CI FIXTURE ONLY: not reviewed release notices.\n')
(staged / 'binary.spdx.json').write_text(json.dumps({
    'spdxVersion': 'SPDX-2.3', 'SPDXID': 'SPDXRef-DOCUMENT',
    'name': 'CI FIXTURE ONLY - not a release SBOM',
    'dataLicense': 'CC0-1.0',
    'documentNamespace': 'https://hennery.dev/ci-fixture/' + digest,
    'creationInfo': {'creators': ['Tool: hennery-ci-fixture'], 'created': '1970-01-01T00:00:00Z'},
    'packages': [{'name': 'CI FIXTURE ONLY', 'SPDXID': 'SPDXRef-CIFixture',
                  'downloadLocation': 'NOASSERTION', 'filesAnalyzed': False}]}))
(Path(output) / 'binary-sha256.json').write_text(json.dumps({arch: digest}))
PY
docker buildx create --use --name hennery-ci --driver docker-container \
    --driver-opt image=moby/buildkit:buildx-stable-1@sha256:cec9f139f45e93c5c69c60f8b07cfad9f43f4ef6b6a6cd917527fea5ff2e3dea
# The local export name supplies BuildKit's per-platform self subjects.
docker buildx build --target release --platform "linux/$arch" \
    --tag "localhost/hennery-collector:$revision-$arch" \
    --build-arg "REVISION=$revision" --build-arg "VERSION=$version" --provenance=mode=max \
    --attest type=sbom,generator=docker.io/docker/buildkit-syft-scanner:stable-1@sha256:ae4f3b554449e7e25548e7d8ccc029d17357348e30c6e3df01b92bc93654d6a9 \
    --output "type=oci,dest=$output/image.tar,compression=gzip,force-compression=true" .
tar -xf "$output/image.tar" -C "$output/layout"
rm "$output/image.tar"
# Qualify the real OCI output before any loopback acceptance. The subsequent
# registry test pulls this exact digest and runs its embedded UI/non-root smoke.
python3 packaging/image.py verify "$output/layout" "$output/binary-sha256.json" \
    "$revision" "$version" > "$output/verified.json"
python3 packaging/image-signing-inputs.py "$output/layout" "$arch" "$output/signing-inputs" \
    > "$output/signing-digest.txt"
