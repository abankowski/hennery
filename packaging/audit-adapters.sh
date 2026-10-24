#!/bin/sh
# Audit the committed adapter lockfiles without installing proprietary CLIs.
set -eu
repo=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT HUP INT TERM
touch "$scratch/user-npmrc" "$scratch/global-npmrc"
for lock in "$repo"/adapters/*/package-lock.json; do
  dir=$(dirname -- "$lock")
  agent=$(basename -- "$dir")
  echo "Auditing managed $agent adapter"
  if env -i PATH="$PATH" HOME="$scratch" npm audit \
    --prefix="$dir" --package-lock-only --json --no-update-notifier \
    --registry=https://registry.npmjs.org/ --cache="$scratch/cache" \
    --userconfig="$scratch/user-npmrc" --globalconfig="$scratch/global-npmrc" \
    > "$scratch/$agent.json"; then
    cat "$scratch/$agent.json"
  else
    cat "$scratch/$agent.json"
    exit 1
  fi
done
