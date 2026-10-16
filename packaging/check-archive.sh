#!/bin/sh
# An archive holds the `hennery` binary, CHANGELOG.md, LICENSE and README.md;
# final releases also require dependency notices. Never an adapter, nor the Claude
# CLI, which hennery does not redistribute.
#
# Usage: check-archive.sh <archive.tar.xz> <target>
set -eu

archive=$1
dir="hennery-$2"
listed=$(tar -tJf "$archive" | sort)
notices=
case "${3:-}" in
    --notices) notices="$dir/THIRD-PARTY-NOTICES.txt" ;;
    "") ;;
    *) echo "unknown archive policy: $3" >&2; exit 1 ;;
esac
expected=$(printf '%s\n' "$dir/" "$dir/CHANGELOG.md" "$dir/LICENSE" "$dir/README.md" "$dir/hennery" ${notices:+"$notices"} | sort)
if [ "$listed" != "$expected" ]; then
    echo "FAIL: $archive holds:" >&2
    echo "$listed" >&2
    echo "and should hold exactly:" >&2
    echo "$expected" >&2
    exit 1
fi
echo "ok: $archive holds exactly the binary and required documentation"
