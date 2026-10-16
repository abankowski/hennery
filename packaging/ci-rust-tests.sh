#!/bin/sh
# CI and release qualification must exercise the same Linux isolation and fd cap.
set -eu
if [ "$RUNNER_OS" != Linux ]; then
  exec cargo test --workspace --locked
fi
cargo test --workspace --locked --no-run
sudo --preserve-env env "PATH=$PATH" "HOME=$HOME" unshare --net -- sh -c '
  ip link set lo up
  exec prlimit --nofile=65536:1048576 -- setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups -- cargo test --workspace --locked --offline
'
