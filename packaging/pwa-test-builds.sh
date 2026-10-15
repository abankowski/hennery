#!/bin/sh
# Two real embedded binaries for the worker update/deploy acceptance tests.
set -eu
cd "$(dirname "$0")/.."
pnpm --dir web build
HENNERY_WEB_DIST="$(pwd)/web/dist" cargo build -p hennery -p hennery-testkit --bins --locked
cp target/debug/hennery target/hennery-pwa-base
node web/e2e/build-pwa-variants.mjs
pwa_variant_dist=$(node -p 'JSON.parse(require("fs").readFileSync("target/pwa-variant.json", "utf8")).dist')
HENNERY_WEB_DIST="$pwa_variant_dist" cargo build -p hennery --bins --locked
cp target/debug/hennery target/hennery-pwa-update
HENNERY_WEB_DIST="$(pwd)/web/dist" cargo build -p hennery -p hennery-testkit --bins --locked
