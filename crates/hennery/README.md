# hennery

Self-hosted cockpit for ACP coding agents. Part of [hennery](https://github.com/marcinwadon/hennery),
a self-hosted ACP cockpit, licensed under AGPL-3.0-only (see LICENSE).

The internal libraries support the application and have pre-1.0 compatibility;
they are not a separately stable SDK. All seven production crates use one version.

Source installation requires Rust at the workspace rust-version, a C compiler,
make and Perl. On macOS install Xcode Command Line Tools. OpenSSL is built by
default; system-library builders may use `--no-default-features`. Node and pnpm
are not required: the kernel package carries the compiled UI.

Before the first non-prerelease publication, bare `cargo install hennery` is not
a supported installation path. Use an explicitly published version and `--locked`
once publication is approved. No packages have been published by this plan.

Native cargo-binstall stays disabled pending a reviewed verification bridge.
Release consumers first authenticate the exact inventory with the independently
confirmed maintainer OpenPGP fingerprint, then verify the exact tagged Sigstore
identity using trusted source. Follow the repository's reviewed verify-then-run
bootstrap before executing an installer or release-contained verifier.

Generated with Claude AI — please review before distribution.
