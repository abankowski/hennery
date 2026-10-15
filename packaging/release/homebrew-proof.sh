#!/bin/sh
# PR-only native candidate, using the same archive finalizer as release-candidate.
# CI supplies the same pinned Rust toolchain/targets as release-candidate.
# Local callers run inside the default Nix shell with one-off Python.
set -eu
TARGET=$1
scratch=$2
export TARGET
case "$TARGET" in
    aarch64-apple-darwin|aarch64-unknown-linux-musl|x86_64-unknown-linux-musl) ;;
    *) echo 'unqualified Homebrew proof target' >&2; exit 1 ;;
esac
sh packaging/install-dist.sh "$scratch/dist-bin"
PATH="$scratch/dist-bin:$PATH"
export PATH
nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
cargo metadata --locked --all-features --filter-platform "$TARGET" --format-version=1 > "$scratch/cargo-metadata.json"
nix develop .#web -c pnpm --dir web licenses list --json > "$scratch/frontend-licences.json"
source_sha=$(git rev-parse HEAD)
tag=$(python3 -c 'import tomllib; print("v"+tomllib.load(open("Cargo.toml","rb"))["workspace"]["package"]["version"])')
python3 packaging/release/supply.py materials --output release-materials --source-sha "$source_sha" --target "$TARGET" \
    --cargo-metadata "$scratch/cargo-metadata.json" --frontend-licences "$scratch/frontend-licences.json"
python3 -c 'import json,sys; sys.path.insert(0,"packaging/release"); import gate; gate.require(not json.load(open("release-materials/licence-findings.json"))["findings"], "unresolved proof licence findings")'
sh packaging/release/native-archive.sh
dist build --artifacts=global --target="$TARGET" --output-format=json > "$scratch/proof-dist-manifest.json"
python3 packaging/release/homebrew.py prepare target/distrib --tag "$tag" --targets "$TARGET"
python3 packaging/release/homebrew.py freeze-proof target/distrib "$scratch/homebrew-candidate" \
    --tag "$tag" --targets "$TARGET" --source-sha "$source_sha"
