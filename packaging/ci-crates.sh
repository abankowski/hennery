#!/bin/sh
set -eu
candidate=$1
R3_MSRV_CARGO=$(rustup which --toolchain 1.88.0 cargo)
R3_MSRV_RUSTC=$(rustup which --toolchain 1.88.0 rustc)
R3_PLAYWRIGHT_MODULE="$candidate/source/web/node_modules/playwright/index.mjs"
export R3_MSRV_CARGO R3_MSRV_RUSTC R3_PLAYWRIGHT_MODULE
exec node packaging/check-crates.mjs "$candidate"
