# Homebrew installs and services

The planned project tap is `marcinwadon/homebrew-tap`. Publication is disabled
until the maintainer enables a qualified stable release; the first alpha is
GitHub-only. The commands below become available after that enablement. The
binary formula covers Apple Silicon macOS and x86_64/aarch64 Linux, subject to
native CI acceptance. It does not qualify Intel macOS or managed Alpine hosts.

Install the versioned release archive and check the executable:

<!-- check: homebrew-install -->
```sh
brew install --formula marcinwadon/tap/hennery
hennery --version
brew --prefix hennery
```

The formula verifies archive SHA-256 and installs the same executable, embedded
UI, licence and third-party notices. The normal tap path trusts Homebrew, the
tap and GitHub release hosting; it does not independently perform the README's
hardware-inventory and Sigstore verification. Installation starts no service,
installs no agents and changes no login. A host may download its separately
pinned runtime when the operator later joins or starts it.

Before installing a service, put Homebrew's stable binary directory on the
login shell's PATH and check which Hennery executable is selected. Use Hennery's
own service installer, choosing the existing role and data directory. There is
no separate Homebrew service definition: do not register it through Homebrew's
service manager. Hennery records the invoked executable path and captures the
login shell's PATH; use the stable Homebrew binary link rather than an absolute
versioned Cellar path. A graphical macOS login is required for the user agent.

Upgrade and run the formula's version, embedded-UI and notices checks:

<!-- check: homebrew-upgrade -->
```sh
brew upgrade --formula marcinwadon/tap/hennery
hennery --version
brew test marcinwadon/tap/hennery
```

An already-running process continues to use its old executable after upgrade.
Run Hennery's service installer again with the same role and data directory to
refresh PATH and restart it. This is especially necessary for a service that
names an old Cellar path. Check service status and doctor afterwards; upgrade
never silently restarts a service or changes its role. Preserve the data backup
and migration precautions in the README.

Before package removal, explicitly stop and uninstall any Hennery service with
Hennery's service uninstaller. Then remove every installed package keg:

<!-- check: homebrew-uninstall -->
```sh
brew uninstall --force marcinwadon/tap/hennery
```

This removes package files and links, preserving user data, managed runtime,
agent logins and operator service definitions. Removing the formula alone is
not a service uninstall or a data purge.

The native PR and candidate jobs execute these exact three command blocks in a
fresh pinned Homebrew prefix and local file-based tap, with scratch home/cache/
config. They first install the candidate with its actual formula/Cellar version,
then clear that installation and seed a separate old-version fixture labelled
0.0.0 using the same candidate payload. Upgrading it proves Homebrew's
transaction, not an older application's migration. Every installed executable
is compared byte-for-byte with the candidate archive, its exact first version
line and its candidate source commit. Both candidate kegs must match the tag.
Removal checks package leftovers and preserved data/service
sentinels. macOS 27 with CLT 26.6 refused the local proof; that check remains
intact. Native runner CI is the acceptance evidence.

Generated with Claude AI — please review before distribution.
