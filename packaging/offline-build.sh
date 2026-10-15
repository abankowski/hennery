#!/bin/sh
# Build subprocesses cannot reach the network, including build scripts.
set -eu
case $(uname -s) in
  Darwin) exec /usr/bin/sandbox-exec -p '(version 1)(allow default)(deny network*)' "$@" ;;
  Linux)
    if [ "$(id -u)" -eq 0 ]; then exec unshare --net -- "$@"; fi
    # CI runners allow passwordless sudo. Drop back to the caller before Cargo
    # writes anything; preserve the explicit compiler for the MSRV check too.
    exec sudo --preserve-env=HOME,CARGO_HOME,CARGO_TARGET_DIR,PKG_CONFIG_PATH,OPENSSL_DIR,OPENSSL_LIB_DIR,OPENSSL_INCLUDE_DIR,RUSTC,RUSTDOC,RUSTFLAGS,CARGO_ENCODED_RUSTFLAGS \
      /usr/bin/unshare --net -- /usr/bin/setpriv --reuid "$(id -u)" --regid "$(id -g)" --init-groups \
      /usr/bin/env "PATH=$PATH" "$@" ;;
  *) echo 'unsupported network-isolated build host' >&2; exit 1 ;;
esac
