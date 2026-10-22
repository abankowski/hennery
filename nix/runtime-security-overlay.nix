# CVE-2026-111497: Nix links Node to shared Brotli, so update both.
# Keep the Rust, pnpm and Playwright package sets at their existing locks.
_final: prev:
let
  brotli = prev.brotli.overrideAttrs (_old: {
    version = "1.2.1";
    src = prev.fetchFromGitHub {
      owner = "google";
      repo = "brotli";
      tag = "v1.2.1";
      hash = "sha256-llY72cYffDv0ugsH0p89xIPEbElV4L8u7U/Fe8hT3gI=";
    };
    # The LoongArch/IA64 fix in the locked package is included upstream.
    patches = [ ];
  });
  # Reuse the pinned Node builder and its platform patches, including the
  # Darwin libc++20 selection. Override the builder's version arguments so
  # configure, outputs and passthru checks all describe the security release.
  nodejs-slim_24 = prev.nodejs-slim_24.override {
    callPackage = path: args: nodeArgs:
      (prev.callPackage path (args // { inherit brotli; })) (nodeArgs // {
        version = "24.22.1";
        # Already included in 24.22.1; applying it again fails patchPhase.
        patches = prev.lib.filter
          (patch: !(prev.lib.hasInfix "a37601c99d7bde9abb3b3ae57b2fb2bacd81ec9d" (toString patch)))
          nodeArgs.patches;

        # From Node's release-key-verified SHASUMS256.txt.
        sha256 = "4f5379796280cdaeb0c2f358fd04b6a16cc4fb7dfa83b5a8c91a9d963b435231";
      });
  };
in
{
  inherit nodejs-slim_24;
}
