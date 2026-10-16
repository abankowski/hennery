#!/bin/sh
# Both native release and PR proof candidates carry the same current audits.
set -eu
nix develop .#release -c cargo-audit audit --file Cargo.lock --db "$RUNNER_TEMP/release-advisories" --json > release-materials/rust-advisories.json
git -C "$RUNNER_TEMP/release-advisories" rev-parse HEAD > release-materials/rust-advisory-revision.txt
nix develop .#web -c pnpm --dir web audit --json > release-materials/web-advisories.json
