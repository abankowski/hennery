#!/bin/sh
# R1 authenticates the live approval, signed inventory, tag, checks and attempt.
# R4 then binds the retained OCI/index and binaries to those same signed bytes.
# Usage: ghcr-gate.sh preflight|boundary fresh-receipt.json
set -eu
[ "$#" = 2 ] || { echo 'usage: ghcr-gate.sh preflight|boundary receipt' >&2; exit 1; }
case "$1" in preflight|boundary) ;; *) echo 'invalid GHCR boundary' >&2; exit 1 ;; esac
for field in INVENTORY_SHA256 RELEASE_CANDIDATE IMAGE_CANDIDATE; do
    value=$(printenv "$field") || { echo "missing R1 binding: $field" >&2; exit 1; }
    [ -n "$value" ] || { echo "empty R1 binding: $field" >&2; exit 1; }
done
[ "${RELEASE_PUBLICATION_ENABLED:-}" = true ] && [ "${RELEASE_GHCR_ENABLED:-}" = true ] || {
    echo 'GHCR publication is disabled' >&2; exit 1
}
[ -x packaging/release-gate ] || { echo 'shared release gate is required' >&2; exit 1; }
nix develop .#release -c packaging/release-gate ghcr --candidate "$RELEASE_CANDIDATE" \
    --inventory-sha256 "$INVENTORY_SHA256" --phase "$1" --receipt "$2"
# Reuse R1's pinned-key verifier on a byte snapshot, then qualify the actual
# layout against ghcr-index.json and inventory.binaries from that signed set.
nix develop .#release -c python3 packaging/ghcr-candidate.py qualify "$RELEASE_CANDIDATE" "$INVENTORY_SHA256" "$IMAGE_CANDIDATE" >/dev/null
