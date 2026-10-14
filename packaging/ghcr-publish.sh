#!/bin/sh
# Runs only in the protected publishing job. No rebuilding, no mutable aliases.
# Usage: ghcr-publish.sh OCI-layout immutable-version expected-index-digest
set -eu
layout=$1
version=$2
expected=$3
# Validate before interpolating a registry reference. Do not accept tags such as
# latest, spaces, slashes or shell option injection.
printf '%s\n' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' || exit 1
printf '%s\n' "$expected" | grep -Eq '^sha256:[0-9a-f]{64}$' || exit 1
reference="ghcr.io/marcinwadon/hennery:$version"
# Inspect the authenticated registry HTTP response itself. Skopeo can flatten
# 401/403 MANIFEST_UNKNOWN responses to the same text as an absent manifest.
check_remote() {
    if python3 packaging/ghcr-remote.py "$version" "$expected" "$REGISTRY_AUTH_FILE"; then
        return 0
    else
        result=$?
    fi
    [ "$result" = 1 ] || exit "$result"
    return 1
}
sh packaging/ghcr-gate.sh preflight "ghcr-preflight-$$.json"
approved_version=$(python3 -c 'import json,os; print(json.load(open(os.environ["IMAGE_CANDIDATE"]+"/verified.json"))["version"])')
approved_digest=$(cat "$IMAGE_CANDIDATE/index-digest.txt")
[ "$version" = "$approved_version" ] && [ "$expected" = "$approved_digest" ] || {
    echo 'publish arguments differ from retained candidate' >&2
    exit 1
}
# The verified working layout is the sole upload source. A correct expected
# digest must not authorize an unrelated caller-supplied OCI directory.
python3 - "$layout" "$IMAGE_CANDIDATE/layout" <<'PY'
from pathlib import Path
import sys
if Path(sys.argv[1]).resolve() != Path(sys.argv[2]).resolve():
    raise SystemExit('layout argument differs from signed candidate')
PY
if check_remote; then
    echo "ok: already published $reference@$expected"
    exit 0
fi
# Revalidation immediately precedes the write; renewed publishing attempt
# approval is required even for the identical retained candidate.
sh packaging/ghcr-gate.sh boundary "ghcr-upload-$$.json"
skopeo copy --all --preserve-digests --authfile "$REGISTRY_AUTH_FILE" \
    "oci:$layout" "docker://$reference"
# An ambiguous upload is accepted only if remote bytes match exactly.
check_remote || { echo 'upload not visible; stop and reconcile on an approved retry' >&2; exit 1; }
echo "ok: published $reference@$expected"
