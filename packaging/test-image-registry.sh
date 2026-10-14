#!/bin/sh
# Only a loopback registry is allowed here. No credentials; no real push.
# Usage: test-image-registry.sh OCI-layout [amd64|arm64]
set -eu
layout=$1
arch=${2:-}
case "$arch" in ''|amd64|arm64) ;; *) echo 'unsupported architecture' >&2; exit 1 ;; esac
name="hennery-registry-$$"
registry_image=docker.io/library/registry:3@sha256:ddf754342cfc8acc51a56d5d0ab6af06826461864460636d8bd5c546dab2a7b8
scratch=$(mktemp -d)
trap 'docker rm -fv "$name" >/dev/null 2>&1 || true; rm -f "$scratch/remote.json"; rmdir "$scratch"' EXIT
# The registry and all test volumes disappear, never any existing container.
docker run -d --name "$name" -p 127.0.0.1::5000 "$registry_image" >/dev/null
endpoint=$(docker port "$name" 5000/tcp)
case "$endpoint" in 127.0.0.1:*) ;; *) echo 'refusing non-loopback registry' >&2; exit 1 ;; esac
for attempt in $(seq 1 30); do
    if curl --fail --silent "http://$endpoint/v2/" >/dev/null; then break; fi
    [ "$attempt" != 30 ] || { echo 'registry did not start' >&2; exit 1; }
    sleep 1
done
reference="$endpoint/hennery:test"
# preserve-digests refuses a registry that rewrites approved OCI bytes.
skopeo copy --all --preserve-digests --dest-tls-verify=false \
    "oci:$layout" "docker://$reference"
skopeo inspect --raw --tls-verify=false "docker://$reference" > "$scratch/remote.json"
expected=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["manifests"][0]["digest"])' "$layout/index.json")
actual="sha256:$(shasum -a 256 "$scratch/remote.json" | cut -d ' ' -f 1)"
[ "$actual" = "$expected" ] || { echo 'registry index digest mismatch' >&2; exit 1; }
echo "ok: loopback registry retained $actual"
# Pull by immutable digest, then smoke. The native matrix tests each platform;
# the assembled index job verifies both descriptors without emulation.
if [ -n "$arch" ]; then
    docker pull --platform "linux/$arch" "$endpoint/hennery@$actual"
    sh packaging/smoke-image.sh "$endpoint/hennery@$actual"
fi
