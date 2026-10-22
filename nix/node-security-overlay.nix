# CVE-2026-111497 (Brotli decoder in Node): the locked nixpkgs still ships
# Node 24.22.0. Use nodejs.org's release binaries of 24.22.1, the archives
# and digests of the managed runtime (crates/hennery-host/manifest.json,
# verified against the release-key-signed SHASUMS256.txt), so nothing is
# built from source. Passes through once nixpkgs ships the fix: remove then.
_final: prev:
let
  inherit (prev) lib stdenv;
  version = "24.22.1";
  dists = {
    aarch64-darwin = { name = "darwin-arm64"; sha256 = "89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7"; };
    aarch64-linux = { name = "linux-arm64"; sha256 = "33c37be234ba8bee041961047b19160f4d7d0f164e8e246f78bdd10feff148b3"; };
    x86_64-linux = { name = "linux-x64"; sha256 = "eb6728e77c576a35162c122c45ccadf224d89ff00abc8dae46cc2897c6002d7c"; };
  };
  dist = dists.${stdenv.hostPlatform.system};
  node = stdenv.mkDerivation {
    pname = "nodejs";
    inherit version;
    src = prev.fetchurl {
      url = "https://nodejs.org/dist/v${version}/node-v${version}-${dist.name}.tar.gz";
      inherit (dist) sha256;
    };
    nativeBuildInputs = lib.optionals stdenv.hostPlatform.isLinux [ prev.autoPatchelfHook ];
    buildInputs = lib.optionals stdenv.hostPlatform.isLinux [ stdenv.cc.cc.lib ];
    dontConfigure = true;
    dontBuild = true;
    # Stripping the signed macOS binary breaks its signature; the fixup only
    # rewrites npm's and corepack's `env node` shebangs to this node.
    dontStrip = true;
    preFixup = ''
      HOST_PATH="$out/bin:$HOST_PATH"
    '';
    installPhase = ''
      runHook preInstall
      mkdir -p $out
      cp -R bin include lib share $out/
      runHook postInstall
    '';
    # What npm and pnpm builders read from the Node they are given.
    passthru = { inherit (prev.nodejs-slim_24) interpreterName python; };
    meta = prev.nodejs-slim_24.meta // { mainProgram = "node"; };
  };
  # Overlay attribute names must not depend on `prev`; the choice is per value.
  fixed = lib.versionOlder prev.nodejs-slim_24.version version;
in
{
  nodejs-slim_24 = if fixed then node else prev.nodejs-slim_24;
  nodejs_24 = if fixed then node else prev.nodejs_24;
}
