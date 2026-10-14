# hennery

hennery is a self-hosted cockpit for coding agents. It lets one developer drive
[Agent Client Protocol](https://agentclientprotocol.com) (ACP) sessions — Claude
Code, Codex, or any other ACP adapter — running on any of their machines, from a
single browser tab or a phone. It also includes an MCP gateway: connect a
server once, then choose its hat and the hosts whose sessions may use it.

hennery never proxies agent licences. You bring your own subscriptions and log in
to each agent CLI on your own machines; hennery only drives the sessions.

## Status

**Early testing.** hennery is ready for early testers who build it from
source. There are no published releases, installers or images yet, and stored
data may not survive an upgrade: expect things to change.

What works:

- **Sessions from the browser.** The collector serves its web UI from the
  binary. From it you start Claude Code and Codex sessions on a connected,
  paired machine, prompt them, answer their permission requests, and park
  and resume them.
- **Hats.** Path rules put each session in a hat by its project directory,
  for organising sessions and choosing their MCP servers.
- **MCP servers.** Connect a server with a static token or OAuth through the
  gateway, or configure local stdio servers for a host and hat, on the **MCP** screen.

Known limitations:

- One owner per collector. Setup requires a password; it also offers a
  passkey, which you can use to sign in afterwards.
- Web Push is built on the collector, but the web UI has no subscribe
  button yet.
- Codex sessions get hennery MCP servers only in the host's default hat, without per-hat isolation, and also load the user's own `~/.codex` MCP servers; other hats get none, until per-hat isolation lands.
- Hosts support verified `wss://`; the public proxy deployment and separate
  client rate-limit budgets are still pending. Restrict public ingress until
  those deployment checks are complete.
- The designs are in [`docs/specs/`](docs/specs/) and the plans in
  [`docs/plans/`](docs/plans/); [`docs/README.md`](docs/README.md) lists
  them.

## Quickstart

Build with [Nix](https://nixos.org/download/) with flakes enabled, or use
[Build without Nix](#build-without-nix) below. On every machine that runs
agents, you need the CLI for each agent you want to use
already logged in with your own subscription. The flake supports Apple
Silicon macOS, and x86_64 and aarch64 Linux.
The bundled CLIs are not added to your `PATH`. After `up` or `host join`
installs the runtime, run `hennery doctor` on each agent machine. Check 4,
**logged in**, reports whether each agent is logged in and prints a fix when
it is not; doctor does not log in for you.

### 1. Build

Get the source:

<!-- check: clone -->
```sh
git clone https://github.com/marcinwadon/hennery.git
cd hennery
```

Build the web UI, then the binary, which embeds it. The dev shell brings
Rust, Node and pnpm; with direnv, `direnv allow` once and leave out the
`nix develop -c` prefixes. `HENNERY_WEB_REQUIRE=1` makes the build fail if
the web UI was not built first, instead of embedding a placeholder page.

<!-- check: build -->
```sh
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web build
HENNERY_WEB_REQUIRE=1 nix develop -c cargo build --release --locked -p hennery
export PATH="$PWD/target/release:$PATH"
```

Or let Nix build the whole package:

<!-- check: nix -->
```sh
nix build
./result/bin/hennery --version
```

The binary is then `result/bin/hennery`; put that directory on your `PATH`
instead.

#### Build without Nix

Prerequisites (plus Git to get the source above):

- **Linux:** a C compiler, `make` and `perl` (including its core modules).
- **macOS:** Xcode Command Line Tools; macOS supplies `perl`.
- **Both:** Rust via [rustup](https://rustup.rs/) (latest stable, the
  toolchain CI uses), and Node 24 with its `npm`/`npx` on `PATH`.

From the source directory, build the web UI with the flake's pinned pnpm
12.3.4 through `npx`, without installing pnpm globally. OpenSSL is built
and linked into the binary; no system OpenSSL is needed.

<!-- check: build-without-nix -->
```sh
npx --yes pnpm@12.3.4 --dir web install --frozen-lockfile
npx --yes pnpm@12.3.4 --dir web build
HENNERY_WEB_REQUIRE=1 cargo build --release --locked -p hennery --features vendored-openssl
export PATH="$PWD/target/release:$PATH"
```

Continue with step 2 below. Starting hennery, setup, `doctor` and agent
logins are the same for both builds.

### 2. Start

<!-- check: up -->
```sh
hennery up
```

`hennery up` runs the collector and a host for this machine, and pairs the
two. It listens on `http://127.0.0.1:7117` and keeps its data in
`~/Library/Application Support/hennery` (macOS) or `$XDG_DATA_HOME/hennery`,
by default `~/.local/share/hennery` (Linux). The first start downloads Node
and the managed adapter set, including its bundled agent CLIs.

On its first start it writes a one-time setup link, valid for an hour, to
`collector/setup-url` in the data directory until setup, and prints the link
when running in a terminal. Open that link: by default it uses
`http://localhost:7117`, which is the browser origin to keep using. Choose
and confirm a password of at least 12 characters, check **Public URL** and
**Default hat**, then press **Set up**. You are signed in; add a passkey or
press **Skip** (or **Continue** if passkeys are unavailable). Back up
`collector/master.key` together with `collector/hennery.db`: the gateway's
credentials cannot be read without it.
If the setup link has expired, `hennery admin setup-url` prints a fresh one.

### 3. Pair another machine

With a verified HTTPS front end, use the public `https://` origin printed by
**Hosts → Add host**: the host enrolls over HTTPS and runs over WSS. System
roots are the default. `host join --ca-cert <file>` imports a private CA for
this collector only and saves it; browsers and adapters need their own trust
configuration. Use `hennery doctor` to check TLS, health and the host upgrade.

To move an existing tunnel pairing, park its sessions and stop the host
service, then use `hennery host transport set <https-origin> --system-roots`
(or `--ca-cert <file>`) with the existing host data directory. This verifies
the existing identity and preserves its key, roots, CLI settings and outbox.
Restarting the host parks adapters; resume sessions normally afterwards.
For CA rotation, save an old-plus-new CA bundle, restart, renew the server,
then save a bundle without the old CA and restart again. Leaf renewal under
the same CA needs no host restart. A `DurabilityUncertain` save means the new
settings are visible but may not survive a crash: inspect the saved endpoint
and repeat the explicit save after storage is healthy.

An uncertain enrollment blocks `join`, `run` and `up`. Follow doctor's attempt
id: inspect the collector's Hosts list, revoke any entry created by that
attempt, then use the explicit enrollment archive action before joining
again. Archiving preserves the journal and key locally; it cannot confirm a
remote revoke. Automatic pairing remains suppressed after an archive.

The SSH tunnel remains an optional deployment choice. On the other machine,
open it with
`ssh -N -L 7117:127.0.0.1:7117 <collector-machine>`; replace
`<collector-machine>` with your SSH destination. Keep this terminal open
while pairing and while `hennery host run` runs. If local port 7117 is
already in use, choose another local port in the tunnel and join command.

For browser access over HTTPS, a reverse proxy on the collector's machine
can serve `up` at an `https://` address, including its host WebSocket. If `up` is already running,
stop it with Ctrl-C and restart it with that address before setup:

<!-- check: up-public -->
```sh
hennery up --public-url https://hennery.example
```

Already set up at `localhost`? Then `--public-url` is ignored: move it
with `hennery admin reset-public-url` (see [Recovery](#recovery)), and from
then on open hennery at the new address, since the old one is refused.
With a same-machine reverse proxy, all remote clients share the loopback
rate-limit budget, so exposing the collector lets anyone lock out password
sign-in by submitting wrong passwords.

In the web UI, **Hosts → Add host** shows a pairing code, valid for ten
minutes, after asking for your password again if a fresh step-up is needed.
Its printed command uses the public URL; when choosing the tunnel, adapt it to the
`http://127.0.0.1` address as below. Build hennery on the other machine and
run the join command in another terminal (it also downloads the runtime).
In this block, `7117` is a placeholder for the tunnel's local port, and
`ABCD-EFGH` is a placeholder for the code shown by **Add host**. Replace
them with your port and code; leave the code out to type it instead and
keep it out of shell history. Keep the `http://127.0.0.1` scheme and host:

<!-- check: join -->
```sh
hennery host join http://127.0.0.1:7117 ABCD-EFGH
```

<!-- check: host-run -->
```sh
hennery host run
```

`host run` uses the saved `ws://127.0.0.1:<port>/api/hosts/ws` URL, including
when it reconnects. Keep the same tunnel port available on future runs.

### 4. Start a session

**New session**: pick a connected host, an agent and a project directory, then
**Start session**, and type your first prompt.
Unless workspace roots are configured, the project list is empty: use
**Browse** under the host user's home, or pass `--workspace-root <directory>`
to `up` or `host run` to list repositories under that root. The flag is
repeatable.

### 5. Connect an MCP server

For a remote server with a static token, open **MCP → Add connection**.
Fill in **Name**, **Slug**, **Server URL** and **Hat**; choose **Token** under
**Authentication**, and set **Header** and **Prefix** as the server requires
(the prefix includes any trailing space). Press **Create**, then enter the
**Token** and press **Save token**. Under **Hosts whose sessions get it**,
tick the hosts to use it; each tick saves immediately. Where delivery is
supported, sessions in that hat on those hosts receive it as
`hennery-<slug>` at their next start or resume.
The status stays **Not used yet** until traffic goes through it.
Use an HTTPS server URL; **Internal network** permits plain HTTP only to
internal addresses (loopback included), for a server you run there.

For a local stdio server, use **MCP → Local MCP servers**. Choose **Host**
and **Hat**, then **Add local server**. Fill in **Server name** and
**Command** (on that host); use **Add argument** for each argument and
**Add environment variable** for secrets. Press **Review local servers**,
check the commands, then **Save local servers**. Saving replaces the whole
set for that host and hat, including removals, at the next start or resume.
Environment values cannot be read back from hennery.

Agents without per-hat isolation receive hennery MCP servers only in the
host's default hat. Check the delivery prediction beside the host or on
**New session** for the agent you chose; the session reports what it was
given at its last start or resume.
This default-hat restriction also applies to Claude with `--use-cli`.

These actions may ask you to confirm your password again.

#### OAuth

In **MCP → Add connection**, fill in the connection fields and choose
**OAuth: automatic registration** under **Authentication** if the vendor
supports dynamic registration, or **OAuth: pre-registered client** if you
register the client yourself. Press **Create**. OAuth addresses must use
HTTPS, or HTTP to this machine.

The vendor must allow hennery's redirect URI:
`<public_url>/api/mcp/oauth/callback`, using the collector's configured
browser origin as `public_url`. The exact URI is shown in the pre-registered
add/edit form and client settings beside **Register this redirect URI at the vendor:**
For a pre-registered client, enter **Client ID**, then choose
**Public client (no secret)** or **Set a new secret** under **Client secret action**.
Enter **Client secret** if you chose **Set a new secret**. Press **Save client**.
Saved secrets are write-only and cannot be read back from hennery.

Click **Connect** or **Reconnect** when offered to open the vendor consent
popup. If popups are blocked, use **Open vendor sign-in**. Return to hennery
after consent. If a fresh confirmation is required before authorization,
the popup closes and you confirm your password in the main window (or use
**Confirm with passkey** if offered). Then follow the card and click
**Connect** or **Reconnect** again if offered; authorization is not retried
automatically.

The card shows the gateway's last report, with **Status recorded** and
**Last checked**. **Probe now** requests a report;
it does not establish live health, and **Working** is a recorded status.
**May need sign-in** (`needs_auth`) calls for **Reconnect**; read the
gateway note, since an authorization-server outage can also cause this state.

## Recovery

Run these on the collector's machine while hennery runs, as the user that
runs it; each asks for confirmation on the terminal. For a collector not in
the default place, give `--data-dir <dir>` right after `admin`.

- **A forgotten password:** set a new one. It signs out every browser session and
  removes every passkey.

  <!-- check: reset-password -->
  ```sh
  hennery admin reset-password
  ```

- **The collector moved** (another address, or behind a proxy): every
  sign-in and change is refused with `origin_mismatch` until hennery knows
  the address the browser now uses. Give it that origin: `https://`, or
  `http://` to a loopback address, with no path. It signs out every browser
  session; passkeys stop working if the host name changes, and are then
  removed.

  <!-- check: reset-public-url -->
  ```sh
  hennery admin reset-public-url https://hennery.example
  ```

## Licence

hennery is licensed under the [GNU Affero General Public License v3.0](LICENSE).
