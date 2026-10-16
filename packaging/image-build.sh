#!/bin/sh
# Native runner only. R1 stages approved bytes and includes this OCI output in
# its checksum-bound metadata BEFORE approval. No registry credential or push.
# Usage: image-build.sh amd64|arm64 output-directory version revision epoch
set -eu
arch=$1
output=$2
version=$3
revision=$4
epoch=$5
case "$arch" in amd64|arm64) ;; *) echo 'unsupported image architecture' >&2; exit 1 ;; esac
case "$(uname -m):$arch" in x86_64:amd64|aarch64:arm64|arm64:arm64) ;; *) echo 'native Linux runner required' >&2; exit 1 ;; esac
[ "$(uname -s)" = Linux ] || { echo 'native Linux runner required' >&2; exit 1; }
[ ! -e "$output" ] || { echo 'output already exists' >&2; exit 1; }
for file in hennery THIRD-PARTY-NOTICES binary.spdx.json; do
    [ -s "dist/linux-$arch/$file" ] || { echo "missing R1 input: $file" >&2; exit 1; }
done
mkdir -p "$output"
# Pinned scanner/base and no restored build cache. OCI export preserves
# BuildKit's SBOM/provenance descriptors, unlike a classic docker save.
# The local export name supplies BuildKit's per-platform self subjects.
docker buildx build --no-cache --platform "linux/$arch" --target release \
    --tag "localhost/hennery-collector:$revision-$arch" \
    --build-arg "VERSION=$version" --build-arg "REVISION=$revision" \
    --build-arg "SOURCE_DATE_EPOCH=$epoch" \
    --provenance=mode=max \
    --attest type=sbom,generator=docker.io/docker/buildkit-syft-scanner:stable-1@sha256:ae4f3b554449e7e25548e7d8ccc029d17357348e30c6e3df01b92bc93654d6a9 \
    --output "type=oci,dest=$output/image.tar,compression=gzip,force-compression=true" .
mkdir "$output/layout"
tar -xf "$output/image.tar" -C "$output/layout"
rm "$output/image.tar"
