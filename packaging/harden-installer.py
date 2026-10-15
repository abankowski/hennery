#!/usr/bin/env python3
"""Make cargo-dist's shell installer refuse to install what it cannot check.

The distribution spec (§2) asks the installer to refuse to continue when no
SHA-256 tool is available, rather than skipping the check. cargo-dist's
installer (0.30.4) skips it, with a message, in four places: no `sha256sum`,
no checksum for the archive, an archive with no checksum style, and a style
it does not know. Each is replaced by an error. Where `sha256sum` is missing,
`shasum -a 256` (macOS's, and Perl's) is tried before refusing. Every
replaced text must occur exactly once: a cargo-dist upgrade that changes the
installer fails this script, and so the build, instead of shipping an
installer that skips the check again.

Usage: harden-installer.py <path to hennery-installer.sh>  (edited in place)
"""

import sys
from pathlib import Path

MAINTAINER_KEY = (Path(__file__).parent / 'release/maintainer.asc').read_text()
MAINTAINER_VERIFICATION = r'''    # The maintainer's touch-approved digest set is the root of trust.
    check_cmd gpg || err "gpg is required for maintainer release signature verification"
    check_cmd jq || err "jq is required for maintainer release inventory verification"
    local _inventory="${HENNERY_RELEASE_INVENTORY:-$_dir/release-inventory.json}"
    local _signature="${HENNERY_RELEASE_SIGNATURE:-$_dir/release-inventory.json.asc}"
    if [ -z "${HENNERY_RELEASE_INVENTORY:-}" ]; then
        downloader "$ARTIFACT_DOWNLOAD_URL/release-inventory.json" "$_inventory" || err "cannot download maintainer release inventory"
    fi
    if [ -z "${HENNERY_RELEASE_SIGNATURE:-}" ]; then
        downloader "$ARTIFACT_DOWNLOAD_URL/release-inventory.json.asc" "$_signature" || err "cannot download maintainer release signature"
    fi
    [ -s "$_inventory" ] && [ -s "$_signature" ] || err "missing maintainer release signature or inventory"
    local _keyring="$_dir/maintainer-keyring"
    mkdir -m 0700 "$_keyring" || err "cannot isolate maintainer verification keyring"
    cat > "$_keyring/key.asc" <<'HENNERY_MAINTAINER_KEY'
''' + MAINTAINER_KEY + r'''HENNERY_MAINTAINER_KEY
    gpg --batch --no-options --homedir "$_keyring" --no-autostart --no-auto-key-retrieve \
        --import "$_keyring/key.asc" >/dev/null 2>&1 || err "cannot import pinned maintainer public key"
    local _status
    _status=$(gpg --batch --no-options --homedir "$_keyring" --no-autostart --no-auto-key-retrieve \
        --status-fd 1 --verify "$_signature" "$_inventory" 2>/dev/null) || err "invalid maintainer release signature"
    printf '%s\n' "$_status" | awk '
        $1 == "[GNUPG:]" && $2 == "VALIDSIG" { count++; if ($3 != "F26C7F594DFE84D131703AFC23E5A318AE8D2861") bad=1 }
        $1 == "[GNUPG:]" && $2 ~ /^(BADSIG|ERRSIG|EXPSIG|EXPKEYSIG|REVKEYSIG|KEYEXPIRED|SIGEXPIRED|KEYREVOKED|NO_PUBKEY|NODATA|FAILURE|ERROR)$/ { bad=1 }
        END { exit !(count == 1 && !bad) }
    ' || err "release signature is not from the pinned maintainer signing key"
    local _approved_sha _actual_sha
    _approved_sha=$(jq -er --arg tag "v$APP_VERSION" --arg archive "$_artifact_name" '
        if .schema != 1 or .repository != "marcinwadon/hennery" or .tag != $tag then error("release schema/repository/tag mismatch") else
            [.artifacts[] | select(.name == $archive)] |
            if length != 1 then error("archive missing or duplicated") else .[0].sha256 end |
            if type == "string" and test("^[0-9a-f]{64}$") then . else error("invalid archive digest") end
        end' "$_inventory") || err "maintainer inventory does not authorize this archive and tag"
    if check_cmd sha256sum; then
        _actual_sha=$(sha256sum -b "$_file" | awk '{ print $1 }')
    elif check_cmd shasum; then
        _actual_sha=$(shasum -a 256 -b "$_file" | awk '{ print $1 }')
    else
        err "cannot check maintainer inventory without a SHA-256 tool"
    fi
    [ "$_actual_sha" = "$_approved_sha" ] || err "archive differs from maintainer-approved inventory"

'''

REFUSE_UNCHECKED = (
    'err "refusing to install an archive whose checksum cannot be checked; '
    'install sha256sum or shasum and run the installer again"'
)

REPLACEMENTS = [
    (
        '    # ...and then the updater, if it exists',
        MAINTAINER_VERIFICATION + '''    # Authenticate the downloaded archive before extraction or execution.
    check_cmd gh || err "GitHub CLI is required for release signature verification"
    local _bundle="${HENNERY_ATTESTATION_BUNDLE:-$_dir/release.sigstore.jsonl}"
    if [ -z "${HENNERY_ATTESTATION_BUNDLE:-}" ]; then
        downloader "$ARTIFACT_DOWNLOAD_URL/release.sigstore.jsonl" "$_bundle" || err "cannot download release attestation bundle"
    fi
    gh attestation verify "$_file" --bundle "$_bundle" --repo marcinwadon/hennery \\
        --signer-workflow marcinwadon/hennery/.github/workflows/release-publish.yml \\
        --cert-identity "https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/v$APP_VERSION" \\
        --source-ref "refs/tags/v$APP_VERSION" --cert-oidc-issuer https://token.actions.githubusercontent.com \\
        --deny-self-hosted-runners || err "refusing an archive without valid release-tag provenance"

    # ...and then the updater, if it exists''',
    ),
    (
        '    case "$_checksum_style" in\n        sha256)',
        '    [ "$_checksum_style" = sha256 ] || ' + REFUSE_UNCHECKED + '\n'
        '    [ "${#_checksum_value}" = 64 ] || ' + REFUSE_UNCHECKED + '\n'
        '    case "$_checksum_value" in *[!0-9a-f]*) ' + REFUSE_UNCHECKED + ' ;; esac\n'
        '    case "$_checksum_style" in\n        sha256)',
    ),
    (
        '''        ensure mv "$_bin" "$_install_dir"
        # unzip seems to need this chmod
        ensure chmod +x "$_install_dir/$_bin_name"''',
        '''        # Refuse existing package-manager files, directories and dangling links.
        if [ -e "$_install_dir/$_bin_name" ] || [ -L "$_install_dir/$_bin_name" ]; then
            err "refusing to overwrite an existing installation; choose an empty user directory"
        fi
        local _stage
        _stage=$(mktemp -d "$_install_dir/.hennery-install.XXXXXX") || err "cannot stage installation"
        if ! cp "$_bin" "$_stage/$_bin_name" || ! chmod 0755 "$_stage/$_bin_name"; then
            rm -f "$_stage/$_bin_name"
            rmdir "$_stage"
            err "cannot prepare installation"
        fi
        # Target is the directory operand: link(2) atomically creates its
        # basename, refusing EEXIST, including a concurrently created link.
        if ! ln "$_stage/$_bin_name" "$_install_dir/"; then
            rm -f "$_stage/$_bin_name"
            rmdir "$_stage"
            err "refusing to overwrite an existing installation"
        fi
        rm -f "$_stage/$_bin_name"
        rmdir "$_stage"''',
    ),
    (
        # No `sha256sum`: `shasum`, else no SHA-256 tool at all.
        '''            if ! check_cmd sha256sum; then
                say "skipping sha256 checksum verification (it requires the 'sha256sum' command)"
                return 0
            fi
            _calculated_checksum="$(sha256sum -b "$_file" | awk '{printf $1}')"''',
        '''            if check_cmd sha256sum; then
                _calculated_checksum="$(sha256sum -b "$_file" | awk '{printf $1}')"
            elif check_cmd shasum; then
                _calculated_checksum="$(shasum -a 256 -b "$_file" | awk '{printf $1}')"
            else
                '''
        + REFUSE_UNCHECKED
        + '''
            fi''',
    ),
    (
        # A checksum style it does not know.
        '''        *)
            say "skipping unknown checksum style: $_checksum_style"
            return 0
            ;;''',
        '''        *)
            '''
        + REFUSE_UNCHECKED
        + '''
            ;;''',
    ),
    (
        # An empty checksum for the archive.
        '''    if [ -z "$_checksum_value" ]; then
        return 0
    fi''',
        '''    if [ -z "$_checksum_value" ]; then
        '''
        + REFUSE_UNCHECKED
        + '''
    fi''',
    ),
    (
        # An archive with no checksum at all.
        '''    else
        say "no checksums to verify"
    fi''',
        '''    else
        '''
        + REFUSE_UNCHECKED
        + '''
    fi''',
    ),
]


def harden(text: str) -> str:
    for old, new in REPLACEMENTS:
        count = text.count(old)
        if count != 1:
            raise SystemExit(
                f"harden-installer: expected one copy of this text, found {count}:\n{old}"
            )
        text = text.replace(old, new)
    return text


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        text = f.read()
    # Before the file is opened for writing: a failure leaves it as it was.
    hardened = harden(text)
    with open(path, "w", encoding="utf-8") as f:
        f.write(hardened)


if __name__ == "__main__":
    main()
