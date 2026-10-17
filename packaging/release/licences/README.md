# Supplemental upstream licence texts

Some locked packages declare a licence but omit the repository-root licence
file from their published tarball. `manifest.json` binds each such exact package
version to the verbatim text's SHA-256 and immutable upstream source commit.
The bytes are not a licence exception or an inference from another project.
The rolldown native packages use their own repository-root MIT licence carried
by the same-version rolldown wrapper, whose package integrity is locked in
`web/pnpm-lock.yaml` and whose source is public in the locked package on npm.

`supply.py` uses these texts only where the package has no licence file of its
own. A dependency bump requires reviewing its upstream source and updating the
mapping; no moving upstream URL is fetched by a candidate build. Unknown
licences and missing text remain findings that prevent freeze. File contents,
source relationships, frontend assets/fonts and source-location notices
still require the maintainer's redistribution review before publication.

Generated with Claude AI — please review before distribution.
