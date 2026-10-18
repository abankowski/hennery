#!/bin/sh
# CI and release qualification must exercise the same Linux isolation and fd cap.
set -eu
if [ "$RUNNER_OS" != Linux ]; then
  cargo nextest run --workspace --locked --no-fail-fast
  exec cargo test --workspace --locked --doc
fi
cargo nextest run --workspace --locked --no-run
sudo --preserve-env env "PATH=$PATH" "HOME=$HOME" unshare --net -- sh -c '
  ip link set lo up
  exec prlimit --nofile=65536:1048576 -- setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups -- sh -e -c "
    cargo nextest run --workspace --locked --offline --no-fail-fast
    cargo test --workspace --locked --offline --doc
  "
'
