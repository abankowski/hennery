#!/bin/sh
# Two real embedded binaries for the worker update/deploy acceptance tests.
set -eu
cd "$(dirname "$0")/.."
# Replacing an executable in place can leave macOS's cached code signature
# bound to the old inode. Publish each copied build with a fresh inode instead.
copy_variant() {
  pwa_copy=$(mktemp "$2.XXXXXX")
  cp -p "$1" "$pwa_copy"
  mv -f "$pwa_copy" "$2"
}
pnpm --dir web build
HENNERY_WEB_DIST="$(pwd)/web/dist" cargo build -p hennery -p hennery-testkit --bins --locked
copy_variant target/debug/hennery target/hennery-pwa-base
node web/e2e/build-pwa-variants.mjs
pwa_variant_dist=$(node -p 'JSON.parse(require("fs").readFileSync("target/pwa-variant.json", "utf8")).dist')
HENNERY_WEB_DIST="$pwa_variant_dist" cargo build -p hennery --bins --locked
copy_variant target/debug/hennery target/hennery-pwa-update
HENNERY_WEB_DIST="$(pwd)/web/dist" cargo build -p hennery -p hennery-testkit --bins --locked
