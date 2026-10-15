# Session-bound MCP and family identity (D1) Implementation Plan

**Goal:** implement D1 from the approved [delegation design](../specs/2026-10-14-delegation-design.md): shared identity/delivery, revision-bound opt-in, strict collector MCP transport and scoped family storage. No control tool is enabled.

**Architecture:** the gateway owns the shared session bearer/generation seam and typed optional fixed descriptor; the sessions module verifies the caller against its canonical row, constructs a private context, and serves the collector-local endpoint. Kernel migration 13 owns the opt-in; gateway migration 5 binds its delivered revision to the token; sessions migration 17 holds family assignment and lifecycle fences. Existing C1 coordination serializes policy and store mutations. No new dependency.

**Tech stack:** existing Rust workspace, SQLite, axum, tokio; C1 provenance and PluginContext remain the single shared definitions.

## Execution status (2026-10-15)

Built first on **plan/deleg-d1**, based on merged C1/W1 main. Each test task was seen RED before its feature. Final fresh replay applied 11 nonempty blocks, reproduced all 22 expected command exits and matched the complete implementation tree. All six Rust checks passed (2,183 tests), as did the affected web checks (1,618 tests), 69 named mutation cases, 12 race load runs and actual pinned Claude/Codex discovery. The execution record preserves initial failures and fixes. Codex gpt-6-astra, reviewing on the maintainer's behalf, returned APPROVE on 6f686151..fd2e47ee with no Critical or Important findings; its one Minor cycle-fixture correction and copy probe are recorded below. Linux/macOS CI remains parent-owned. Local discovery proves startup, not provider inference or the D4 runtime matrix.

Implementation base: **6f68615183de3e1badc12a3d650eca27b8901261**. Embedded implementation head: **7f2e20480ad51e7f1acfe1e2f366679e4485b608**.

## Scope

In: one shared token for built-in and external HTTP entries, opt-in GET/PATCH with browser auth and step-up; monotonic revision and NULL old/external-only grants; independent grant cuts; shared transaction-bound identity; current session/isolation admission; strict single-tree JSON-RPC, bounded bodies/deadlines/drain/permits; starting discovery; immutable same-owner/hat/host family edges; atomic session/edge/token allocation; close/reassign/delete fences; generated policy/family types; owner audit and kernel/gateway spec amendments.

Out: D2's seven tools, configuration catalogue, operation receipts and queued commands; D3's scheduler, provenance production, attention, cancellation/replay of work and durable delivery; D4 UI and live cross-runtime matrix. D1 has no undispatched commands to cancel on disable. Its transaction-bound accepted-revision predicate is the D2/D3 queue admission/dispatch seam.

## Decisions this plan makes where the spec is silent

| Detail | Choice and consequence | Review authority |
|---|---|---|
| Token generation | Existing token SHA-256 is an opaque non-serializable fence; Debug redacts it. No second token or generation table | Codex gpt-6-astra, maintainer's behalf: APPROVE |
| Full-mode descriptor | GatewayMcp::for_collector opts into a typed descriptor whose path/name cannot be supplied by a connection or tool argument; default GatewayMcp and NoSessionMcp deliver no built-in entry | Approved design; Codex gpt-6-astra: APPROVE |
| Grant coordination | Shared watches keyed by live database coordination identity; weak coordination keys neither alias an unrelated database nor retain writer ownership; the namespace stays alive across facade replacement. Watch installation and policy changes share C1's owner gate | Codex gpt-6-astra, maintainer's behalf: APPROVE |
| Protocol versions | Stateless Streamable HTTP supports 2025-03-26, 2025-06-18, 2025-11-25; an unsupported initialize version negotiates latest, unsupported/repeated version headers are 400 | [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), [transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports); local pinned Claude/Codex discovery passed; provider/inference acceptance is outside D1 |
| Discovery before D2 | Empty tool list, no executable lifecycle handler; calls return matching structured/text isError with session_starting or tool_unavailable | D1/D2 boundary |
| Local names | Local stdio configuration already validates nonempty slug names and always prefixes delivered names with hennery-; no such descriptor can equal reserved hennery | Existing delivery contract |
| Family detachment | Assignment remains immutable; close/reassign permanently fence an edge until a future explicit, reviewed restoration mechanism. Delete removes links without deleting a surviving session | Codex gpt-6-astra, maintainer's behalf: APPROVE |
| Q1/Q2 | Default ordinary elicitation only and one generation belong to D2/D3; neither changes D1 transport. Storage can represent a deeper tree but grants no recursive control | Operator questions remain open |

## Global Constraints

- Gateway imports no sessions or memory implementation; plug-ins keep C1 namespace credentials and do not receive raw session bearer or verified context headers.
- Reuse plugin::InputOrigin, Provenance and PluginContext. D1 never writes Parent/ChildReport activity or treats text as authority.
- Bind delivered revision and token hash in one mint; transitions are monotonic, rollback cuts nothing, external-only NULL is never upgraded by enabling a flag.
- Watch token before resolving it, grant under owner coordination before rechecking it, hold both through response consumption. Policy disable never cuts unrelated external mounts.
- Every future mutation calls session_tool_context_in/granted_in in its own transaction. Queued accepted revisions cannot borrow a newer generation.
- Current delivery mode, host default hat and current hello capability/isolation are checked; startup discovery does not grant mutation rights.
- Exact built-in route precedes proxy wildcard semantics; external builtin slug remains valid; no authority-bearing queries, cookies as bearer fallback, CORS, SSE channel or MCP session id.
- Strict duplicate-free retained JSON tree; typed dispatch, no validation/forwarding representation split. Refusals never echo raw inputs; assembled first-party token redaction includes JSON-RPC ids.
- No global installs, real data-directory writes, GitHub actions or shared Cargo target; scratch directories are retained for parent cleanup. Binary-spawning acceptance must clear SSL_CERT_FILE/SSL_CERT_DIR and use scratch HOME/XDG and first_exec.

## Review Focus

1. Atomic revision/token delivery, rollback and disable/re-enable, separate cancellation and response watch lifetime.
2. Shared identity owner/generation checks and isolation after default-hat change/reconnect; future D2 must recheck current hello eligibility at mutation/dispatch fences.
3. Family assignment immutability, no cycle/adoption/cross-hat access; child allocation shares one commit; C1 exposure reassignment restrictions remain intact.
4. Exact router integration, external slug builtin, strict single-parse dispatch and differential decoder inputs; bounded upload, drain and concurrency.
5. Empty discovery is intentional D1 gating. No durable queue, spawn, attention or provenance-production claim before D2/D3.
6. Kernel 13/gateway 5/sessions 17 append only; owner_filter.rs prepares every new statement. Local pinned Claude/Codex discovery is recorded; Linux evidence remains a parent acceptance gate.

## File structure

- hennery-proto/src/delegation.rs plus codegen: policy request/response and family metadata; generated schema/TypeScript.
- hennery-kernel/src/schema.rs: migration 13 opt-in policy.
- hennery-gateway/src/{identity,session,tokens,schema}.rs: shared identity, typed descriptor and delivered revision; shared safe proxy body/header/parser primitives.
- hennery-sessions/src/{delegation,builtin,store,lib}.rs: verified context, atomic family allocation and terminal fences; built-in HTTP and operator policy route.
- hennery/src/main.rs: trusted full-mode wiring and exact route.
- Gateway/session/testkit contract, differential, rollback, lifecycle and HTTP tests; owner-filter sources; amended gateway/kernel specs.

**Reading the steps:** each fenced diff is an exact apply operation against the preceding state, including generated artifacts and actual base anchors. Apply with **git apply --index**. All tool commands run inside plain **nix develop -c**. Expected exit 101 means observed RED, never a green check. Replay refuses zero blocks and compares every tracked file with the embedded implementation head. This plan and the final docs index execution line are written after that head.

### Task 1, step 1: test(delegation): specify generation-bound MCP delivery and grants

Specify the behavior first; the missing feature must produce the recorded RED exit.

<!-- replay {"sha":"8be788dc4548ebc8079a4e80034d7964803fb557","subject":"test(delegation): specify generation-bound MCP delivery and grants","checks":[["cargo test -p hennery-gateway --test builtin --locked",101]]} -->
```diff
diff --git a/crates/hennery-gateway/tests/builtin.rs b/crates/hennery-gateway/tests/builtin.rs
new file mode 100644
index 0000000000000000000000000000000000000000..b71c6cda56dd9522e59cf31a50f30857a9f2a978
--- /dev/null
+++ b/crates/hennery-gateway/tests/builtin.rs
@@ -0,0 +1,96 @@
+mod support;
+
+use hennery_gateway::session::{GatewayMcp, SessionMcp, SessionRef};
+use hennery_gateway::tokens;
+use hennery_kernel::operator::{Operator, SetupOutcome};
+use hennery_kernel::secret::unix_now;
+use hennery_proto::frames::McpServer;
+use hennery_proto::rest::McpSessionDeliveryMode;
+use support::World;
+
+fn world() -> World {
+    let w = World::new();
+    w.host("host", 1);
+    let op = Operator::open(&w.db).unwrap();
+    let setup = op.issue_setup_token(unix_now()).unwrap().unwrap();
+    assert!(matches!(op.set_up(&setup, "correct horse battery", "https://hennery.example", unix_now()).unwrap(), SetupOutcome::Done { .. }));
+    w
+}
+fn deliver(w: &World, full: bool, mode: McpSessionDeliveryMode) -> Vec<McpServer> {
+    let mcp = if full { GatewayMcp::for_collector(&w.gateway()) } else { GatewayMcp::new(&w.gateway()) };
+    let mut conn = w.raw();
+    let tx = conn.transaction().unwrap();
+    let given = mcp.servers_in(&tx, SessionRef { session_id: "s", host_id: "host", hat_id: &w.hat() }, mode).unwrap();
+    tx.commit().unwrap();
+    mcp.cut(given.cut);
+    given.servers
+}
+fn bearer(servers: &[McpServer]) -> String {
+    let McpServer::Http { headers, .. } = &servers[0] else { panic!() };
+    headers[0].value.strip_prefix("Bearer ").unwrap().into()
+}
+#[test]
+fn opt_in_delivers_builtin_without_mounts_only_in_collector_mode() {
+    let w = world();
+    assert!(deliver(&w, true, McpSessionDeliveryMode::Isolated).is_empty());
+    let setting = w.store.set_session_tools(&w.hat(), true).unwrap().unwrap();
+    assert_eq!(setting.revision, 1);
+    assert!(deliver(&w, false, McpSessionDeliveryMode::Isolated).is_empty());
+    for mode in [McpSessionDeliveryMode::Fallback, McpSessionDeliveryMode::Unsupported] {
+        assert!(deliver(&w, true, mode).is_empty());
+    }
+    let servers = deliver(&w, true, McpSessionDeliveryMode::Isolated);
+    let McpServer::Http { name, url, .. } = &servers[0] else { panic!() };
+    assert_eq!(name, "hennery");
+    assert_eq!(url, "https://hennery.example/mcp/builtin/hennery");
+    assert!(w.store.authenticate_session(&bearer(&servers)).unwrap().is_some());
+}
+#[test]
+fn delivered_revision_never_upgrades_external_tokens_or_revives_old_grants() {
+    let w = world();
+    let connection = w.connection("builtin", "http://127.0.0.1:9/mcp", hennery_gateway::model::CredKind::None);
+    w.mount(&connection, &["host"]);
+    let external = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    let identity = w.store.authenticate_session(&external).unwrap().unwrap();
+    assert!(identity.delivered_delegation_revision().is_none());
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    assert!(w.store.delegation_granted(&identity).unwrap().is_none());
+    let servers = deliver(&w, true, McpSessionDeliveryMode::Isolated);
+    let token = bearer(&servers);
+    assert_eq!(servers.len(), 2);
+    let McpServer::Http { headers, .. } = &servers[1] else { panic!() };
+    assert_eq!(headers[0].value, format!("Bearer {token}"));
+    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
+    let grant = w.store.delegation_granted(&identity).unwrap().unwrap();
+    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
+    let token_watch = w.revocations.watch(identity.generation().as_str());
+    w.store.set_session_tools(&w.hat(), false).unwrap();
+    assert!(watch.token().is_cancelled());
+    assert!(!token_watch.token().is_cancelled());
+    assert!(w.proxy_store_resolve(&token).is_some());
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    assert!(w.store.delegation_granted(&identity).unwrap().is_none());
+    assert!(!w.store.recheck_delegation(&identity, grant).unwrap());
+    let fresh = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    assert!(w.store.delegation_granted(&w.store.authenticate_session(&fresh).unwrap().unwrap()).unwrap().is_some());
+    assert!(w.store.authenticate_session(&token).unwrap().is_none());
+}
+#[test]
+fn transaction_rollback_keeps_grants_and_token_generations_and_watches() {
+    let w = world();
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    let token = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
+    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
+    let mut conn = w.raw();
+    let tx = conn.transaction().unwrap();
+    let fresh = tokens::mint_delegation_in(&tx, w.store.owner_id(), "s", "host", &w.hat(), Some(99), unix_now()).unwrap();
+    drop(tx);
+    assert!(w.store.authenticate_session(fresh.expose()).unwrap().is_none());
+    assert!(w.store.authenticate_session(&token).unwrap().is_some());
+    let tx = conn.transaction().unwrap();
+    tx.execute("UPDATE hat_session_tools SET delegation_enabled = 0, revision = revision + 1 WHERE owner_id = ?1", [w.store.owner_id()]).unwrap();
+    drop(tx);
+    assert!(!watch.token().is_cancelled());
+    assert!(w.store.delegation_granted(&identity).unwrap().is_some());
+}
```

Run (expected exit 101):

```bash
nix develop -c cargo test -p hennery-gateway --test builtin --locked
```

### Task 1, step 2: feat(delegation): bind delivered MCP grants to token generations

Implement the preceding contract; all listed GREEN commands must succeed.

<!-- replay {"sha":"28715de8d5cced3a77754112adcb426f0ca4b977","subject":"feat(delegation): bind delivered MCP grants to token generations","checks":[["cargo test -p hennery-gateway --test builtin --test session_mcp --locked",0],["cargo run -p hennery-proto --bin gen --locked -- --check",0]]} -->
```diff
diff --git a/crates/hennery-gateway/src/identity.rs b/crates/hennery-gateway/src/identity.rs
new file mode 100644
index 0000000000000000000000000000000000000000..71cba6cefbd30ee12c6fc5369ef9c060e93ce27a
--- /dev/null
+++ b/crates/hennery-gateway/src/identity.rs
@@ -0,0 +1,214 @@
+//! Shared session identity and delivered delegation grants. This seam never
+//! imports sessions, exports a bearer upstream, or trusts caller arguments.
+use crate::revocation::{Cut, Revocations, Watch};
+use crate::scope::{Principal, PrincipalKind};
+use crate::store::GatewayStore;
+use crate::tokens::{is_session_token, token_hash};
+use anyhow::Result;
+use hennery_proto::delegation::HatSessionTools;
+use hennery_proto::frames::{McpServer, NameValue};
+use rusqlite::{OptionalExtension, Transaction, params};
+use std::sync::{Arc, Mutex, OnceLock, Weak};
+
+/// Opaque generation fence. Debug intentionally reveals no hash.
+#[derive(Clone, PartialEq, Eq)]
+pub struct TokenGeneration(String);
+impl TokenGeneration {
+    pub fn as_str(&self) -> &str {
+        &self.0
+    }
+}
+impl std::fmt::Debug for TokenGeneration {
+    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+        f.write_str("TokenGeneration(<redacted>)")
+    }
+}
+#[derive(Debug, Clone)]
+pub struct SessionIdentity {
+    pub owner_id: String,
+    pub principal: Principal,
+    generation: TokenGeneration,
+    delivered_revision: Option<i64>,
+}
+impl SessionIdentity {
+    pub fn generation(&self) -> &TokenGeneration {
+        &self.generation
+    }
+    pub fn delivered_delegation_revision(&self) -> Option<i64> {
+        self.delivered_revision
+    }
+}
+
+/// Cannot be constructed from connection URLs, tool JSON or arbitrary names.
+pub(crate) struct BuiltinDescriptor {
+    pub revision: i64,
+}
+impl BuiltinDescriptor {
+    pub fn server(self, origin: &str, token: &str) -> McpServer {
+        McpServer::Http {
+            name: "hennery".into(),
+            url: format!("{origin}/mcp/builtin/hennery"),
+            headers: vec![NameValue::new("Authorization", format!("Bearer {token}"))],
+        }
+    }
+}
+
+pub(crate) fn setting_in(tx: &Transaction<'_>, owner: &str, hat: &str) -> Result<Option<HatSessionTools>> {
+    Ok(tx
+        .query_row(
+            "SELECT COALESCE(t.delegation_enabled, 0), COALESCE(t.revision, 0)
+        FROM hats h LEFT JOIN hat_session_tools t ON t.owner_id = ?1 AND t.hat_id = h.id
+        WHERE h.owner_id = ?1 AND h.id = ?2
+        AND NOT EXISTS (SELECT 1 FROM purged_hats p WHERE p.owner_id = ?1 AND p.hat_id = h.id)",
+            params![owner, hat],
+            |r| {
+                Ok(HatSessionTools {
+                    delegation_enabled: r.get(0)?,
+                    revision: r.get(1)?,
+                })
+            },
+        )
+        .optional()?)
+}
+pub(crate) fn builtin_in(tx: &Transaction<'_>, owner: &str, hat: &str) -> Result<Option<BuiltinDescriptor>> {
+    Ok(setting_in(tx, owner, hat)?
+        .filter(|s| s.delegation_enabled)
+        .map(|s| BuiltinDescriptor { revision: s.revision }))
+}
+
+type WatchRegistry = Vec<(Arc<hennery_kernel::coordination::Coordination>, Weak<Revocations>)>;
+pub(crate) fn grant_watches(coordination: Arc<hennery_kernel::coordination::Coordination>) -> Arc<Revocations> {
+    static REGISTRY: OnceLock<Mutex<WatchRegistry>> = OnceLock::new();
+    let mut registry = REGISTRY.get_or_init(Mutex::default).lock().expect("grant registry");
+    registry.retain(|(_, watches)| watches.strong_count() > 0);
+    if let Some(watches) = registry
+        .iter()
+        .find_map(|(key, watches)| Arc::ptr_eq(key, &coordination).then(|| watches.upgrade()).flatten())
+    {
+        return watches;
+    }
+    let watches = Arc::new(Revocations::new());
+    registry.push((coordination, Arc::downgrade(&watches)));
+    watches
+}
+fn grant_key(owner: &str, hat: &str, revision: i64) -> String {
+    format!("{owner}:{hat}:{revision}")
+}
+
+/// Resolve generation in the caller's transaction: starting sessions have the
+/// same committed identity as active ones. Lifecycle is the sessions module's.
+pub fn resolve_in(tx: &Transaction<'_>, owner: &str, generation: &TokenGeneration) -> Result<Option<SessionIdentity>> {
+    Ok(tx
+        .query_row(
+            "SELECT t.session_id, t.host_id, t.hat_id, t.delivered_delegation_revision
+        FROM gw_session_tokens t JOIN hosts h ON h.id = t.host_id AND h.owner_id = ?1
+        WHERE t.owner_id = ?1 AND t.token_hash = ?2 AND t.revoked_at IS NULL AND h.revoked_at IS NULL
+        AND NOT EXISTS (SELECT 1 FROM purged_hats p WHERE p.owner_id = ?1 AND p.hat_id = t.hat_id)",
+            params![owner, generation.as_str()],
+            |r| {
+                Ok(SessionIdentity {
+                    owner_id: owner.into(),
+                    principal: Principal {
+                        hat_id: r.get(2)?,
+                        kind: PrincipalKind::Session {
+                            session_id: r.get(0)?,
+                            host_id: r.get(1)?,
+                        },
+                    },
+                    generation: generation.clone(),
+                    delivered_revision: r.get(3)?,
+                })
+            },
+        )
+        .optional()?)
+}
+/// Recheck the exact accepted generation and policy revision in a mutation's
+/// own transaction. A fresh token cannot authorize an old queued revision.
+pub fn granted_in(
+    tx: &Transaction<'_>,
+    owner: &str,
+    identity: &SessionIdentity,
+    accepted_revision: i64,
+) -> Result<bool> {
+    if identity.owner_id != owner {
+        return Ok(false);
+    }
+    let Some(current) = resolve_in(tx, owner, identity.generation())? else {
+        return Ok(false);
+    };
+    if current.principal != identity.principal || current.delivered_revision != Some(accepted_revision) {
+        return Ok(false);
+    }
+    Ok(setting_in(tx, owner, &current.principal.hat_id)?
+        .is_some_and(|s| s.delegation_enabled && s.revision == accepted_revision))
+}
+impl GatewayStore {
+    pub fn session_tools(&self, hat: &str) -> Result<Option<HatSessionTools>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        setting_in(&tx, self.owner_id(), hat)
+    }
+    pub fn set_session_tools(&self, hat: &str, enabled: bool) -> Result<Option<HatSessionTools>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let Some(before) = setting_in(&tx, self.owner_id(), hat)? else {
+            return Ok(None);
+        };
+        if before.delegation_enabled == enabled {
+            return Ok(Some(before));
+        }
+        let revision = before
+            .revision
+            .checked_add(1)
+            .ok_or_else(|| anyhow::anyhow!("grant revision exhausted"))?;
+        tx.execute(
+            "INSERT INTO hat_session_tools(owner_id, hat_id, delegation_enabled, revision)
+            VALUES (?1, ?2, ?3, ?4) ON CONFLICT(owner_id, hat_id) DO UPDATE SET
+            delegation_enabled = excluded.delegation_enabled, revision = excluded.revision
+            WHERE hat_session_tools.owner_id = ?1",
+            params![self.owner_id(), hat, enabled, revision],
+        )?;
+        tx.commit()?;
+        self.delegation_watches
+            .cut(Cut(vec![grant_key(self.owner_id(), hat, before.revision)]));
+        Ok(Some(HatSessionTools {
+            delegation_enabled: enabled,
+            revision,
+        }))
+    }
+    pub fn authenticate_session(&self, token: &str) -> Result<Option<SessionIdentity>> {
+        if !is_session_token(token) {
+            return Ok(None);
+        }
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        resolve_in(&tx, self.owner_id(), &TokenGeneration(token_hash(token)))
+    }
+    pub fn delegation_granted(&self, identity: &SessionIdentity) -> Result<Option<i64>> {
+        let Some(revision) = identity.delivered_revision else {
+            return Ok(None);
+        };
+        Ok(self.recheck_delegation(identity, revision)?.then_some(revision))
+    }
+    pub fn recheck_delegation(&self, identity: &SessionIdentity, revision: i64) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        granted_in(&tx, self.owner_id(), identity, revision)
+    }
+    /// Install under the same owner gate as policy mutation, before resolving
+    /// its current grant. The token watch must already exist before auth.
+    pub fn watch_delegation(&self, identity: &SessionIdentity) -> Result<Option<Watch>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let Some(revision) = identity.delivered_revision else {
+            return Ok(None);
+        };
+        let watch = self
+            .delegation_watches
+            .watch(&grant_key(self.owner_id(), &identity.principal.hat_id, revision));
+        Ok(granted_in(&tx, self.owner_id(), identity, revision)?.then_some(watch))
+    }
+    pub fn watch_session(&self, token: &str, revocations: &Revocations) -> Option<Watch> {
+        is_session_token(token).then(|| revocations.watch(&token_hash(token)))
+    }
+}
diff --git a/crates/hennery-gateway/src/lib.rs b/crates/hennery-gateway/src/lib.rs
index 2764a1b4d8095145d4e1f48e922c932e5047ceb0..391e0b12a509f7ee454dfdd5515790c930d5a78a 100644
--- a/crates/hennery-gateway/src/lib.rs
+++ b/crates/hennery-gateway/src/lib.rs
@@ -8,6 +8,7 @@ pub mod api;
 pub mod callback;
 pub mod crypto;
 pub mod flows;
+pub mod identity;
 mod jsonrpc;
 pub mod key;
 pub mod model;
diff --git a/crates/hennery-gateway/src/schema.rs b/crates/hennery-gateway/src/schema.rs
index 741c31f5356004154e39ea75536bd8fb2f1e376e..d2763890a48869ffcb6990eef35ad4b7be02d4e5 100644
--- a/crates/hennery-gateway/src/schema.rs
+++ b/crates/hennery-gateway/src/schema.rs
@@ -152,4 +152,9 @@ pub(crate) const MIGRATIONS: &[&str] = &[
         pending_token_endpoint TEXT,
         FOREIGN KEY (connection_id, owner_id) REFERENCES gw_connections(id, owner_id));
     ",
+    // D1: old generations have no delivered built-in grant. Revision is
+    // monotonic for a hat's lifetime; no enabled default rows are inserted.
+    "
+    ALTER TABLE gw_session_tokens ADD COLUMN delivered_delegation_revision INTEGER;
+    ",
 ];
diff --git a/crates/hennery-gateway/src/session.rs b/crates/hennery-gateway/src/session.rs
index 4a870acef68ce604e4acd067e7c74c322ad92308..b5dcdd241fc317587d48710dbe5d44922392170c 100644
--- a/crates/hennery-gateway/src/session.rs
+++ b/crates/hennery-gateway/src/session.rs
@@ -49,6 +49,8 @@ pub struct Delivered {
 
 /// The gateway, as the sessions module sees it (umbrella §9, ACP core §1).
 pub trait SessionMcp: Send + Sync {
+    /// Shared authentication seam; provided only by full collector wiring.
+    fn authenticator(&self) -> Option<Arc<GatewayStore>> { None }
     fn plugin_control(&self) -> Option<Arc<crate::plugin::Control>> {
         None
     }
@@ -117,6 +119,7 @@ pub struct GatewayMcp {
     key: Arc<MasterKey>,
     operator: Arc<Operator>,
     revocations: Revocations,
+    builtin: bool,
 }
 
 impl GatewayMcp {
@@ -124,6 +127,7 @@ impl GatewayMcp {
     /// `Revocations` its proxy watches.
     pub fn new(gateway: &GatewayState) -> Self {
         Self {
+            builtin: false,
             runtime: gateway.runtime.clone(),
             store: gateway.runtime.store.clone(),
             key: gateway.runtime.key.clone(),
@@ -132,6 +136,14 @@ impl GatewayMcp {
         }
     }
 
+    /// Full collector wiring only; standalone gateways never deliver this server.
+    pub fn for_collector(gateway: &GatewayState) -> Self {
+        Self {
+            builtin: true,
+            ..Self::new(gateway)
+        }
+    }
+
     fn owner(&self) -> &str {
         self.store.owner_id()
     }
@@ -154,6 +166,7 @@ fn mounted_slugs_in(tx: &Transaction<'_>, owner: &str, host_id: &str, hat_id: &s
 }
 
 impl SessionMcp for GatewayMcp {
+    fn authenticator(&self) -> Option<Arc<GatewayStore>> { self.builtin.then(|| self.store.clone()) }
     fn plugin_control(&self) -> Option<Arc<crate::plugin::Control>> {
         Some(self.store.plugins())
     }
@@ -180,8 +193,13 @@ impl SessionMcp for GatewayMcp {
             });
         }
         let slugs = mounted_slugs_in(tx, owner, session.host_id, session.hat_id)?;
-        let mut servers = Vec::with_capacity(slugs.len());
-        if slugs.is_empty() {
+        let builtin = if self.builtin {
+            crate::identity::builtin_in(tx, owner, session.hat_id)?
+        } else {
+            None
+        };
+        let mut servers = Vec::with_capacity(slugs.len() + usize::from(builtin.is_some()));
+        if slugs.is_empty() && builtin.is_none() {
             // No connection to reach: no token at all.
             tokens::revoke_in(tx, owner, session.session_id, now)?;
         } else {
@@ -189,7 +207,18 @@ impl SessionMcp for GatewayMcp {
                 .operator
                 .public_url()
                 .ok_or_else(|| anyhow!("no public_url to name the gateway's /mcp/ by"))?;
-            let token = tokens::mint_in(tx, owner, session.session_id, session.host_id, session.hat_id, now)?;
+            let token = tokens::mint_delegation_in(
+                tx,
+                owner,
+                session.session_id,
+                session.host_id,
+                session.hat_id,
+                builtin.as_ref().map(|b| b.revision),
+                now,
+            )?;
+            if let Some(builtin) = builtin {
+                servers.push(builtin.server(public.origin(), token.expose()));
+            }
             for slug in slugs {
                 let connection: String = tx.query_row(
                     "SELECT id FROM gw_connections WHERE owner_id = ?1 AND slug = ?2 AND hat_id = ?3",
diff --git a/crates/hennery-gateway/src/store.rs b/crates/hennery-gateway/src/store.rs
index 1026b771586a9156a3fdb93e8bcb92c108a29385..ff4f942423bbbae29456baa6034f84ebc3c37f62 100644
--- a/crates/hennery-gateway/src/store.rs
+++ b/crates/hennery-gateway/src/store.rs
@@ -61,6 +61,7 @@ pub struct GatewayStore {
     /// The database's owner (`db::kernel_owner`), whom every query names.
     owner: String,
     refresh_caches: Mutex<Vec<Weak<crate::refresh::Attempts>>>,
+    pub(crate) delegation_watches: Arc<crate::revocation::Revocations>,
 }
 
 impl GatewayStore {
@@ -78,7 +79,9 @@ impl GatewayStore {
         let owner = db::kernel_owner(&mut conn)?;
         db::migrate_component(&mut conn, COMPONENT, MIGRATIONS)?;
         let plugins = crate::plugin::Control::for_core(path, &owner, conn.coordination());
+        let delegation_watches = crate::identity::grant_watches(conn.coordination());
         Ok(Self {
+            delegation_watches,
             conn: hennery_kernel::db::CoordinatedConnection::new(conn),
             plugins,
             owner,
diff --git a/crates/hennery-gateway/src/tokens.rs b/crates/hennery-gateway/src/tokens.rs
index 709f74d6a7b6f9b2b9d5988822465f95bb1c90b0..26c1f239b19fbd128e6ce68301ee851c57e49327 100644
--- a/crates/hennery-gateway/src/tokens.rs
+++ b/crates/hennery-gateway/src/tokens.rs
@@ -69,6 +69,20 @@ pub fn mint_in(
     host_id: &str,
     hat_id: &str,
     now: i64,
+) -> Result<SessionToken> {
+    mint_delegation_in(tx, owner_id, session_id, host_id, hat_id, None, now)
+}
+
+/// Atomically bind the delivered built-in revision to this token generation.
+#[allow(clippy::too_many_arguments)]
+pub fn mint_delegation_in(
+    tx: &Transaction<'_>,
+    owner_id: &str,
+    session_id: &str,
+    host_id: &str,
+    hat_id: &str,
+    delivered_revision: Option<i64>,
+    now: i64,
 ) -> Result<SessionToken> {
     let random = Zeroizing::new(hex::encode(Zeroizing::new(random_bytes::<32>()).as_slice()));
     // Built at its final size, so no grown-out buffer keeps part of it.
@@ -76,13 +90,13 @@ pub fn mint_in(
     token.push_str(SESSION_TOKEN_PREFIX);
     token.push_str(&random);
     let changed = tx.execute(
-        "INSERT INTO gw_session_tokens(session_id, owner_id, host_id, hat_id, token_hash, created_at)
-         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
+        "INSERT INTO gw_session_tokens(session_id, owner_id, host_id, hat_id, token_hash, created_at, delivered_delegation_revision)
+         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
          ON CONFLICT(session_id) DO UPDATE SET host_id = excluded.host_id, hat_id = excluded.hat_id,
              token_hash = excluded.token_hash, created_at = excluded.created_at, last_used_at = NULL,
-             revoked_at = NULL
+             revoked_at = NULL, delivered_delegation_revision = excluded.delivered_delegation_revision
              WHERE gw_session_tokens.owner_id = excluded.owner_id",
-        params![session_id, owner_id, host_id, hat_id, token_hash(&token), now],
+        params![session_id, owner_id, host_id, hat_id, token_hash(&token), now, delivered_revision],
     )?;
     // Another owner's row under this id: never taken over.
     anyhow::ensure!(changed == 1, "session {session_id} has a token of another owner's");
diff --git a/crates/hennery-gateway/tests/builtin.rs b/crates/hennery-gateway/tests/builtin.rs
index b71c6cda56dd9522e59cf31a50f30857a9f2a978..eb887af9a26c6e5e472f0f568205ae11bb5b42db 100644
--- a/crates/hennery-gateway/tests/builtin.rs
+++ b/crates/hennery-gateway/tests/builtin.rs
@@ -13,20 +13,40 @@ fn world() -> World {
     w.host("host", 1);
     let op = Operator::open(&w.db).unwrap();
     let setup = op.issue_setup_token(unix_now()).unwrap().unwrap();
-    assert!(matches!(op.set_up(&setup, "correct horse battery", "https://hennery.example", unix_now()).unwrap(), SetupOutcome::Done { .. }));
+    assert!(matches!(
+        op.set_up(&setup, "correct horse battery", "https://hennery.example", unix_now())
+            .unwrap(),
+        SetupOutcome::Done { .. }
+    ));
     w
 }
 fn deliver(w: &World, full: bool, mode: McpSessionDeliveryMode) -> Vec<McpServer> {
-    let mcp = if full { GatewayMcp::for_collector(&w.gateway()) } else { GatewayMcp::new(&w.gateway()) };
+    let mcp = if full {
+        GatewayMcp::for_collector(&w.gateway())
+    } else {
+        GatewayMcp::new(&w.gateway())
+    };
     let mut conn = w.raw();
     let tx = conn.transaction().unwrap();
-    let given = mcp.servers_in(&tx, SessionRef { session_id: "s", host_id: "host", hat_id: &w.hat() }, mode).unwrap();
+    let given = mcp
+        .servers_in(
+            &tx,
+            SessionRef {
+                session_id: "s",
+                host_id: "host",
+                hat_id: &w.hat(),
+            },
+            mode,
+        )
+        .unwrap();
     tx.commit().unwrap();
     mcp.cut(given.cut);
     given.servers
 }
 fn bearer(servers: &[McpServer]) -> String {
-    let McpServer::Http { headers, .. } = &servers[0] else { panic!() };
+    let McpServer::Http { headers, .. } = &servers[0] else {
+        panic!()
+    };
     headers[0].value.strip_prefix("Bearer ").unwrap().into()
 }
 #[test]
@@ -40,7 +60,9 @@ fn opt_in_delivers_builtin_without_mounts_only_in_collector_mode() {
         assert!(deliver(&w, true, mode).is_empty());
     }
     let servers = deliver(&w, true, McpSessionDeliveryMode::Isolated);
-    let McpServer::Http { name, url, .. } = &servers[0] else { panic!() };
+    let McpServer::Http { name, url, .. } = &servers[0] else {
+        panic!()
+    };
     assert_eq!(name, "hennery");
     assert_eq!(url, "https://hennery.example/mcp/builtin/hennery");
     assert!(w.store.authenticate_session(&bearer(&servers)).unwrap().is_some());
@@ -48,7 +70,11 @@ fn opt_in_delivers_builtin_without_mounts_only_in_collector_mode() {
 #[test]
 fn delivered_revision_never_upgrades_external_tokens_or_revives_old_grants() {
     let w = world();
-    let connection = w.connection("builtin", "http://127.0.0.1:9/mcp", hennery_gateway::model::CredKind::None);
+    let connection = w.connection(
+        "builtin",
+        "http://127.0.0.1:9/mcp",
+        hennery_gateway::model::CredKind::None,
+    );
     w.mount(&connection, &["host"]);
     let external = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
     let identity = w.store.authenticate_session(&external).unwrap().unwrap();
@@ -58,7 +84,9 @@ fn delivered_revision_never_upgrades_external_tokens_or_revives_old_grants() {
     let servers = deliver(&w, true, McpSessionDeliveryMode::Isolated);
     let token = bearer(&servers);
     assert_eq!(servers.len(), 2);
-    let McpServer::Http { headers, .. } = &servers[1] else { panic!() };
+    let McpServer::Http { headers, .. } = &servers[1] else {
+        panic!()
+    };
     assert_eq!(headers[0].value, format!("Bearer {token}"));
     let identity = w.store.authenticate_session(&token).unwrap().unwrap();
     let grant = w.store.delegation_granted(&identity).unwrap().unwrap();
@@ -72,7 +100,12 @@ fn delivered_revision_never_upgrades_external_tokens_or_revives_old_grants() {
     assert!(w.store.delegation_granted(&identity).unwrap().is_none());
     assert!(!w.store.recheck_delegation(&identity, grant).unwrap());
     let fresh = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
-    assert!(w.store.delegation_granted(&w.store.authenticate_session(&fresh).unwrap().unwrap()).unwrap().is_some());
+    assert!(
+        w.store
+            .delegation_granted(&w.store.authenticate_session(&fresh).unwrap().unwrap())
+            .unwrap()
+            .is_some()
+    );
     assert!(w.store.authenticate_session(&token).unwrap().is_none());
 }
 #[test]
@@ -84,12 +117,17 @@ fn transaction_rollback_keeps_grants_and_token_generations_and_watches() {
     let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
     let mut conn = w.raw();
     let tx = conn.transaction().unwrap();
-    let fresh = tokens::mint_delegation_in(&tx, w.store.owner_id(), "s", "host", &w.hat(), Some(99), unix_now()).unwrap();
+    let fresh =
+        tokens::mint_delegation_in(&tx, w.store.owner_id(), "s", "host", &w.hat(), Some(99), unix_now()).unwrap();
     drop(tx);
     assert!(w.store.authenticate_session(fresh.expose()).unwrap().is_none());
     assert!(w.store.authenticate_session(&token).unwrap().is_some());
     let tx = conn.transaction().unwrap();
-    tx.execute("UPDATE hat_session_tools SET delegation_enabled = 0, revision = revision + 1 WHERE owner_id = ?1", [w.store.owner_id()]).unwrap();
+    tx.execute(
+        "UPDATE hat_session_tools SET delegation_enabled = 0, revision = revision + 1 WHERE owner_id = ?1",
+        [w.store.owner_id()],
+    )
+    .unwrap();
     drop(tx);
     assert!(!watch.token().is_cancelled());
     assert!(w.store.delegation_granted(&identity).unwrap().is_some());
diff --git a/crates/hennery-kernel/src/schema.rs b/crates/hennery-kernel/src/schema.rs
index ef975584498b678fb607568091e778c2040c8617..986861216092abcb52e46b8bd37aa4e2a068250c 100644
--- a/crates/hennery-kernel/src/schema.rs
+++ b/crates/hennery-kernel/src/schema.rs
@@ -254,6 +254,16 @@ pub(crate) const MIGRATIONS: &[&str] = &[
     "
     ALTER TABLE hosts ADD COLUMN mcp_isolation TEXT;
     ",
+    // D1: delegation is disabled unless explicitly enabled by the owner.
+    "
+    CREATE TABLE hat_session_tools (
+        owner_id TEXT NOT NULL,
+        hat_id TEXT NOT NULL,
+        delegation_enabled INTEGER NOT NULL CHECK (delegation_enabled IN (0, 1)),
+        revision INTEGER NOT NULL CHECK (revision > 0),
+        PRIMARY KEY (owner_id, hat_id),
+        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id) ON DELETE CASCADE);
+    ",
 ];
 
 #[cfg(test)]
diff --git a/crates/hennery-proto/src/codegen.rs b/crates/hennery-proto/src/codegen.rs
index ba9ab15a8b1460ed5e83afb150c43aadf51e49b7..f6c2749f19b7699acffbe3d223354b3f246b26de 100644
--- a/crates/hennery-proto/src/codegen.rs
+++ b/crates/hennery-proto/src/codegen.rs
@@ -2,7 +2,7 @@
 //! with `--check`, fails if the checked-in copies differ.
 
 use crate::plugin_management;
-use crate::{frames, plugin, rest};
+use crate::{delegation, frames, plugin, rest};
 use schemars::generate::SchemaSettings;
 use ts_rs::{Config, TS};
 
@@ -44,6 +44,9 @@ pub fn render_schema() -> String {
         plugin::PluginActivityPage,
         plugin::PluginSourceInventoryPage,
         plugin::PluginContext,
+        delegation::HatSessionTools,
+        delegation::SetSessionTools,
+        delegation::SessionFamily,
         plugin::PluginCapabilities,
         plugin::ForgetReceipt,
         frames::HostFrame,
@@ -211,6 +214,9 @@ pub fn render_ts() -> String {
         plugin::Provenance,
         plugin::ContextEntry,
         plugin::PluginContext,
+        delegation::HatSessionTools,
+        delegation::SetSessionTools,
+        delegation::SessionFamily,
         plugin::TextRole,
         plugin::Excerpt,
         plugin::PluginActivityItem,
diff --git a/crates/hennery-proto/src/delegation.rs b/crates/hennery-proto/src/delegation.rs
new file mode 100644
index 0000000000000000000000000000000000000000..27ea723bab64741b1f2ed44e34042868c647b6c1
--- /dev/null
+++ b/crates/hennery-proto/src/delegation.rs
@@ -0,0 +1,32 @@
+//! D1 policy and family metadata. Delegated inputs and plug-in context use
+//! `plugin::{InputOrigin, Provenance, PluginContext}`; no parallel types.
+use schemars::JsonSchema;
+use serde::{Deserialize, Serialize};
+use ts_rs::TS;
+
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(deny_unknown_fields)]
+pub struct HatSessionTools {
+    pub delegation_enabled: bool,
+    #[ts(type = "number")]
+    pub revision: i64,
+}
+
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(deny_unknown_fields)]
+pub struct SetSessionTools {
+    pub delegation_enabled: bool,
+}
+
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(deny_unknown_fields)]
+pub struct SessionFamily {
+    pub child_id: String,
+    pub parent_id: String,
+    pub root_id: String,
+    pub hat_id: String,
+    #[ts(type = "number")]
+    pub created_event_id: i64,
+    pub detached: bool,
+    pub reason: Option<String>,
+}
diff --git a/crates/hennery-proto/src/lib.rs b/crates/hennery-proto/src/lib.rs
index 80f066464efbbe0cfa005583149b90e6d1148912..e47bc59876091b463b81ae414f8397730b6ef87f 100644
--- a/crates/hennery-proto/src/lib.rs
+++ b/crates/hennery-proto/src/lib.rs
@@ -40,4 +40,5 @@ pub fn hello_proof_message(nonce: &[u8], host_id: &str, protocol_version: &str)
     out
 }
 pub mod codegen;
+pub mod delegation;
 pub mod plugin_management;
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 2285d6f5bd49432ec73c4be19381d1ab8127dd93..a0d96eed32caf0c9676ffb5f15541251d199f53a 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -35,6 +35,11 @@ use std::sync::{Arc, Mutex};
 
 /// The audited sources, and the fewest statements each holds.
 const SOURCES: &[(&str, &str, usize)] = &[
+    (
+        "hennery-gateway/src/identity.rs",
+        include_str!("../../hennery-gateway/src/identity.rs"),
+        3,
+    ),
     (
         "hennery-gateway/src/plugin/recovery.rs",
         include_str!("../../hennery-gateway/src/plugin/recovery.rs"),
diff --git a/schema/hennery-protocol.schema.json b/schema/hennery-protocol.schema.json
index f69436c39691ad908f171ed1aa4aa4d6ecf1e7a5..27686f385e2da37113630f1ce1ba7612a0ff001d 100644
--- a/schema/hennery-protocol.schema.json
+++ b/schema/hennery-protocol.schema.json
@@ -1383,6 +1383,23 @@
       ],
       "type": "object"
     },
+    "HatSessionTools": {
+      "additionalProperties": false,
+      "properties": {
+        "delegation_enabled": {
+          "type": "boolean"
+        },
+        "revision": {
+          "format": "int64",
+          "type": "integer"
+        }
+      },
+      "required": [
+        "delegation_enabled",
+        "revision"
+      ],
+      "type": "object"
+    },
     "HostFrame": {
       "description": "Host -> collector.",
       "oneOf": [
@@ -4529,6 +4546,45 @@
       ],
       "type": "object"
     },
+    "SessionFamily": {
+      "additionalProperties": false,
+      "properties": {
+        "child_id": {
+          "type": "string"
+        },
+        "created_event_id": {
+          "format": "int64",
+          "type": "integer"
+        },
+        "detached": {
+          "type": "boolean"
+        },
+        "hat_id": {
+          "type": "string"
+        },
+        "parent_id": {
+          "type": "string"
+        },
+        "reason": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "root_id": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "child_id",
+        "parent_id",
+        "root_id",
+        "hat_id",
+        "created_event_id",
+        "detached"
+      ],
+      "type": "object"
+    },
     "SessionItem": {
       "description": "One session as the session list shows it (ACP core §8, §9; frontend\n§5), read from `sessions` alone: never the catalogue, commands or plan\n(P-23). The detail serves it as stored; the list, `bounded`.",
       "properties": {
@@ -4659,6 +4715,18 @@
       ],
       "type": "object"
     },
+    "SetSessionTools": {
+      "additionalProperties": false,
+      "properties": {
+        "delegation_enabled": {
+          "type": "boolean"
+        }
+      },
+      "required": [
+        "delegation_enabled"
+      ],
+      "type": "object"
+    },
     "SettingsResponse": {
       "description": "`GET /api/settings` (kernel spec §8).",
       "properties": {
diff --git a/web/src/generated/protocol.ts b/web/src/generated/protocol.ts
index 50512c368568f3604f0131223d3efbcded4fb799..ca1ee9090bc00b69eccdb61e82ab740c6d675ed0 100644
--- a/web/src/generated/protocol.ts
+++ b/web/src/generated/protocol.ts
@@ -47,6 +47,12 @@ export type ContextEntry = { text: string, source_refs: Array<SourceRef>, proven
 
 export type PluginContext = { entries: Array<ContextEntry>, generated_at: string, truncated: boolean, };
 
+export type HatSessionTools = { delegation_enabled: boolean, revision: number, };
+
+export type SetSessionTools = { delegation_enabled: boolean, };
+
+export type SessionFamily = { child_id: string, parent_id: string, root_id: string, hat_id: string, created_event_id: number, detached: boolean, reason: string | null, };
+
 export type TextRole = "user" | "assistant";
 
 export type Excerpt = { role: TextRole, text: string, };
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-gateway --test builtin --test session_mcp --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
```

### Task 2, step 1: test(delegation): specify caller context and family scope fences

Specify the behavior first; the missing feature must produce the recorded RED exit.

<!-- replay {"sha":"3b98576c9800de66ba9ce408b45b13164628d068","subject":"test(delegation): specify caller context and family scope fences","checks":[["cargo test -p hennery-sessions --test delegation --locked",101]]} -->
```diff
diff --git a/crates/hennery-sessions/tests/delegation.rs b/crates/hennery-sessions/tests/delegation.rs
new file mode 100644
index 0000000000000000000000000000000000000000..1497349d3de1e6130ceafdab0beefc08bd51fc7f
--- /dev/null
+++ b/crates/hennery-sessions/tests/delegation.rs
@@ -0,0 +1,88 @@
+use hennery_gateway::api::GatewayState;
+use hennery_gateway::identity::SessionIdentity;
+use hennery_gateway::key::MasterKey;
+use hennery_gateway::scope::ProxyStore;
+use hennery_gateway::session::GatewayMcp;
+use hennery_gateway::store::GatewayStore;
+use hennery_kernel::hats::HatChange;
+use hennery_kernel::hosts::{Enrollment, Hosts};
+use hennery_kernel::operator::{Operator, SetupOutcome};
+use hennery_kernel::secret::unix_now;
+use hennery_proto::frames::{McpIsolation, McpServer, SessionBody};
+use hennery_sessions::store::{McpContext, Store};
+use std::sync::Arc;
+struct World { _dir: tempfile::TempDir, db: std::path::PathBuf, store: Store, gateway: Arc<GatewayStore>, hat: String, other: String }
+impl World {
+    fn new() -> Self {
+        let dir = tempfile::tempdir().unwrap(); let db = dir.path().join("hennery.db");
+        let hosts = Hosts::open(&db).unwrap();
+        hosts.register("host", &Enrollment { public_key: "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a".into(), name: "test".into(), host_version: "0".into(), platform: "linux".into() }, 1).unwrap();
+        let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
+        let HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else { panic!() };
+        let operator = Arc::new(Operator::open(&db).unwrap());
+        let setup = operator.issue_setup_token(unix_now()).unwrap().unwrap();
+        assert!(matches!(operator.set_up(&setup, "correct horse battery", "https://hennery.example", unix_now()).unwrap(), SetupOutcome::Done { .. }));
+        let gateway = Arc::new(GatewayStore::open(&db).unwrap());
+        let runtime = Arc::new(hennery_gateway::runtime::Runtime::new(gateway.clone(), Arc::new(ProxyStore::open(&db).unwrap()), Arc::new(MasterKey::from_bytes([7;32])), hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(), Arc::new(hennery_gateway::notify::Silent)));
+        let state = GatewayState { runtime, operator };
+        let store = Store::open(&db).unwrap(); store.set_session_mcp(Arc::new(GatewayMcp::for_collector(&state)));
+        gateway.set_session_tools(&hat, true).unwrap(); gateway.set_session_tools(&other.id, true).unwrap();
+        Self { _dir: dir, db, store, gateway, hat, other: other.id }
+    }
+    fn start(&self, id: &str, hat: &str, isolation: McpIsolation) -> Option<SessionIdentity> {
+        let given = self.store.create_session_with_mcp(id, "host", "claude", "/project", hat, None, McpContext { capable: true, isolation, rules_name_other_hats: false }).unwrap().unwrap();
+        given.servers.iter().find_map(|s| match s { McpServer::Http { name, headers, .. } if name == "hennery" => self.gateway.authenticate_session(headers[0].value.strip_prefix("Bearer ").unwrap()).unwrap(), _ => None })
+    }
+    fn active(&self, id: &str) {
+        self.store.ingest(id, 1, &SessionBody::session_started("request", format!("agent-{id}"))).unwrap();
+    }
+}
+#[test]
+fn verified_context_checks_generation_session_owner_hat_cwd_and_live_isolation() {
+    let w = World::new();
+    let identity = w.start("parent", &w.hat, McpIsolation::None).unwrap();
+    let ctx = w.store.session_tool_context(&identity, 1, false).unwrap().unwrap();
+    assert_eq!(ctx.session_id(), "parent"); assert_eq!(ctx.canonical_cwd(), "/project");
+    assert!(w.store.session_tool_context(&identity, 1, true).unwrap().is_none());
+    w.active("parent");
+    assert!(w.store.session_tool_context(&identity, 1, true).unwrap().is_some());
+    let mut forged = identity.clone(); forged.owner_id = "foreign".into();
+    assert!(w.store.session_tool_context(&forged, 1, false).unwrap().is_none());
+    forged = identity.clone(); forged.principal.hat_id = w.other.clone();
+    assert!(w.store.session_tool_context(&forged, 1, false).unwrap().is_none());
+    let raw = hennery_kernel::db::open(&w.db).unwrap();
+    raw.execute("UPDATE hosts SET default_hat_id = ?1 WHERE id = 'host'", [&w.other]).unwrap();
+    assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_none());
+    assert!(w.start("fallback", &w.hat, McpIsolation::None).is_none());
+    let isolated = w.start("isolated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    assert!(w.store.session_tool_context(&isolated, 1, false).unwrap().is_some());
+    raw.execute("UPDATE sessions SET cwd = '/project/../escape' WHERE id = 'isolated'", []).unwrap();
+    assert!(w.store.session_tool_context(&isolated, 1, false).unwrap().is_none());
+}
+#[test]
+fn family_storage_is_immutable_direct_scoped_and_terminally_detached() {
+    let w = World::new();
+    let identity = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    w.start("child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.start("sibling", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.start("foreign-hat", &w.other, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = hennery_kernel::db::open(&w.db).unwrap();
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &identity, 1, "child", 0).unwrap());
+    assert!(!w.store.bind_family_in(&tx, &identity, 1, "child", 0).unwrap());
+    assert!(!w.store.bind_family_in(&tx, &identity, 1, "parent", 0).unwrap());
+    assert!(!w.store.bind_family_in(&tx, &identity, 1, "foreign-hat", 0).unwrap());
+    tx.commit().unwrap();
+    assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_some());
+    for id in ["sibling", "parent", "foreign-hat", "absent"] { assert!(w.store.direct_child(&identity, 1, id).unwrap().is_none()); }
+    conn.execute("UPDATE sessions SET close_requested = 1 WHERE id = 'parent'", []).unwrap();
+    assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_none());
+    conn.execute("UPDATE sessions SET close_requested = 0, lifecycle = 'active' WHERE id = 'parent'", []).unwrap();
+    assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_none(), "resume cannot revive a detached edge");
+    conn.execute("UPDATE sessions SET lifecycle = 'deleted' WHERE id = 'parent'", []).unwrap();
+    let count: i64 = conn.query_row("SELECT count(*) FROM session_families", [], |r| r.get(0)).unwrap();
+    assert_eq!(count, 0);
+    let state: String = conn.query_row("SELECT lifecycle FROM sessions WHERE id = 'child'", [], |r| r.get(0)).unwrap();
+    assert_ne!(state, "deleted");
+}
```

Run (expected exit 101):

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --locked
```

### Task 2, step 2: feat(delegation): verify session context and fence family routing

Implement the preceding contract; all listed GREEN commands must succeed.

<!-- replay {"sha":"16a0d7836807621292c2ae8f0b2a133a8ea980e5","subject":"feat(delegation): verify session context and fence family routing","checks":[["cargo test -p hennery-sessions --test delegation --locked",0],["cargo test -p hennery-testkit --test owner_filter --locked",0]]} -->
```diff
diff --git a/crates/hennery-sessions/src/delegation.rs b/crates/hennery-sessions/src/delegation.rs
new file mode 100644
index 0000000000000000000000000000000000000000..aff42aea4001aea83e660dbfc6e8be8733fd8c68
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation.rs
@@ -0,0 +1,176 @@
+//! D1's internal verified caller and family storage. No handler receives the
+//! bearer; upstream plug-ins continue using C1 namespace authentication.
+use crate::store::Store;
+use anyhow::Result;
+use hennery_gateway::identity::{SessionIdentity, TokenGeneration, granted_in};
+use hennery_gateway::scope::PrincipalKind;
+use hennery_proto::delegation::SessionFamily;
+use rusqlite::{OptionalExtension, Transaction, params};
+
+#[derive(Debug, Clone)]
+pub struct SessionToolContext {
+    owner_id: String,
+    session_id: String,
+    host_id: String,
+    hat_id: String,
+    canonical_cwd: String,
+    agent: String,
+    token_generation: TokenGeneration,
+    delivered_revision: i64,
+}
+impl SessionToolContext {
+    pub fn owner_id(&self) -> &str {
+        &self.owner_id
+    }
+    pub fn session_id(&self) -> &str {
+        &self.session_id
+    }
+    pub fn host_id(&self) -> &str {
+        &self.host_id
+    }
+    pub fn hat_id(&self) -> &str {
+        &self.hat_id
+    }
+    pub fn canonical_cwd(&self) -> &str {
+        &self.canonical_cwd
+    }
+    pub fn agent(&self) -> &str {
+        &self.agent
+    }
+    pub fn generation(&self) -> &TokenGeneration {
+        &self.token_generation
+    }
+    pub fn grant_revision(&self) -> i64 {
+        self.delivered_revision
+    }
+}
+impl Store {
+    pub fn session_tool_context(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        mutation: bool,
+    ) -> Result<Option<SessionToolContext>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        self.session_tool_context_in(&tx, identity, revision, mutation)
+    }
+    /// Reads and future mutations use this exact transaction-bound predicate.
+    pub fn session_tool_context_in(
+        &self,
+        tx: &Transaction<'_>,
+        identity: &SessionIdentity,
+        revision: i64,
+        mutation: bool,
+    ) -> Result<Option<SessionToolContext>> {
+        if !granted_in(tx, self.owner_id(), identity, revision)? {
+            return Ok(None);
+        }
+        let PrincipalKind::Session { session_id, host_id } = &identity.principal.kind;
+        let row: Option<(String, String)> = tx.query_row(
+            "SELECT s.cwd, s.agent FROM sessions s JOIN hosts h ON h.id = s.host_id AND h.owner_id = ?1
+             WHERE s.owner_id = ?1 AND s.id = ?2 AND s.host_id = ?3 AND s.hat_id = ?4
+               AND s.close_requested = 0 AND s.lifecycle IN ('starting', 'active') AND s.presumed_parked = 0
+               AND (?5 = 0 OR s.lifecycle = 'active') AND h.revoked_at IS NULL
+               AND (s.mcp_delivery_mode = 'isolated' OR (s.mcp_delivery_mode = 'unisolated' AND s.hat_id = h.default_hat_id))
+               AND NOT EXISTS (SELECT 1 FROM purged_hats p WHERE p.owner_id = ?1 AND p.hat_id = s.hat_id)",
+             params![self.owner_id(), session_id, host_id, identity.principal.hat_id, mutation],
+             |r| Ok((r.get(0)?, r.get(1)?))).optional()?;
+        let Some((cwd, agent)) = row else { return Ok(None) };
+        if !hennery_kernel::hats::is_canonical(&cwd) {
+            return Ok(None);
+        }
+        Ok(Some(SessionToolContext {
+            owner_id: self.owner_id().into(),
+            session_id: session_id.clone(),
+            host_id: host_id.clone(),
+            hat_id: identity.principal.hat_id.clone(),
+            canonical_cwd: cwd,
+            agent,
+            token_generation: identity.generation().clone(),
+            delivered_revision: revision,
+        }))
+    }
+    /// D2 calls this only after allocating a new starting child in this same
+    /// transaction. No public endpoint can adopt an unrelated session.
+    pub fn bind_family_in(
+        &self,
+        tx: &Transaction<'_>,
+        identity: &SessionIdentity,
+        revision: i64,
+        child: &str,
+        created_event_id: i64,
+    ) -> Result<bool> {
+        let Some(caller) = self.session_tool_context_in(tx, identity, revision, true)? else {
+            return Ok(false);
+        };
+        let root: String = tx.query_row("SELECT COALESCE((SELECT root_id FROM session_families WHERE owner_id = ?1 AND child_id = ?2 AND detached = 0), ?2)",
+            params![self.owner_id(), caller.session_id()], |r| r.get(0))?;
+        // The trigger independently enforces immutable scope and no cycles.
+        let valid: bool = tx.query_row(
+            "SELECT EXISTS(SELECT 1 FROM sessions c
+            WHERE c.owner_id = ?1 AND c.id = ?2 AND c.hat_id = ?3 AND c.host_id = ?4
+              AND c.lifecycle = 'starting' AND c.close_requested = 0 AND c.id <> ?5 AND c.id <> ?6
+              AND NOT EXISTS (SELECT 1 FROM session_families f WHERE f.owner_id = ?1 AND f.child_id = c.id))",
+            params![
+                self.owner_id(),
+                child,
+                caller.hat_id(),
+                caller.host_id(),
+                caller.session_id(),
+                root
+            ],
+            |r| r.get(0),
+        )?;
+        if !valid {
+            return Ok(false);
+        }
+        tx.execute(
+            "INSERT INTO session_families(owner_id, child_id, parent_id, root_id, hat_id, created_event_id)
+            VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
+            params![
+                self.owner_id(),
+                child,
+                caller.session_id(),
+                root,
+                caller.hat_id(),
+                created_event_id
+            ],
+        )?;
+        Ok(true)
+    }
+    pub fn direct_child(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        child: &str,
+    ) -> Result<Option<SessionFamily>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let Some(caller) = self.session_tool_context_in(&tx, identity, revision, true)? else {
+            return Ok(None);
+        };
+        Ok(tx
+            .query_row(
+                "SELECT f.child_id, f.parent_id, f.root_id, f.hat_id, f.created_event_id, f.detached, f.reason
+            FROM session_families f JOIN sessions c ON c.id = f.child_id AND c.owner_id = ?1
+            JOIN sessions r ON r.id = f.root_id AND r.owner_id = ?1
+            WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.child_id = ?3 AND f.hat_id = ?4 AND f.detached = 0
+              AND c.hat_id = ?4 AND r.hat_id = ?4 AND c.close_requested = 0 AND r.close_requested = 0
+              AND c.lifecycle NOT IN ('closed', 'deleted') AND r.lifecycle NOT IN ('closed', 'deleted')",
+                params![self.owner_id(), caller.session_id(), child, caller.hat_id()],
+                |r| {
+                    Ok(SessionFamily {
+                        child_id: r.get(0)?,
+                        parent_id: r.get(1)?,
+                        root_id: r.get(2)?,
+                        hat_id: r.get(3)?,
+                        created_event_id: r.get(4)?,
+                        detached: r.get(5)?,
+                        reason: r.get(6)?,
+                    })
+                },
+            )
+            .optional()?)
+    }
+}
diff --git a/crates/hennery-sessions/src/lib.rs b/crates/hennery-sessions/src/lib.rs
index ba08e3b6b0a1c2b5021fa6b0822629a39b8805bb..1677f23630dc0ac7e42f92bd15d57363debdd8b0 100644
--- a/crates/hennery-sessions/src/lib.rs
+++ b/crates/hennery-sessions/src/lib.rs
@@ -3,6 +3,7 @@
 pub mod api;
 pub mod attachments;
 pub mod content;
+pub mod delegation;
 pub mod forget;
 pub mod hats;
 pub mod hosts;
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index 338cf31547ca38186c39d163844e9bf38ade9786..be689a8b8f655c142cd10f7fdf1a31408504361c 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -322,6 +322,55 @@ const MIGRATIONS: &[&str] = &[
     ALTER TABLE sessions ADD COLUMN mcp_delivery_servers INTEGER;
     ALTER TABLE sessions ADD COLUMN mcp_delivery_at TEXT;
 ",
+    // D1 (17): immutable family assignment, same-owner composite references,
+    // terminal routing fences. New children are allocated by D2, not here.
+    "
+    CREATE UNIQUE INDEX sessions_by_owner_identity ON sessions(id, owner_id);
+    CREATE TABLE session_families (
+        owner_id TEXT NOT NULL,
+        child_id TEXT NOT NULL,
+        parent_id TEXT NOT NULL,
+        root_id TEXT NOT NULL,
+        hat_id TEXT NOT NULL,
+        created_event_id INTEGER NOT NULL,
+        detached INTEGER NOT NULL DEFAULT 0 CHECK (detached IN (0, 1)),
+        reason TEXT,
+        PRIMARY KEY (child_id, owner_id),
+        CHECK (child_id <> parent_id AND child_id <> root_id),
+        FOREIGN KEY (child_id, owner_id) REFERENCES sessions(id, owner_id),
+        FOREIGN KEY (parent_id, owner_id) REFERENCES sessions(id, owner_id),
+        FOREIGN KEY (root_id, owner_id) REFERENCES sessions(id, owner_id),
+        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id));
+    CREATE INDEX families_by_parent ON session_families(owner_id, parent_id);
+    CREATE TRIGGER family_assignment_immutable BEFORE UPDATE ON session_families
+    WHEN NEW.owner_id <> OLD.owner_id OR NEW.child_id <> OLD.child_id
+      OR NEW.parent_id <> OLD.parent_id OR NEW.root_id <> OLD.root_id
+      OR NEW.hat_id <> OLD.hat_id OR NEW.created_event_id <> OLD.created_event_id
+      OR (OLD.detached = 1 AND NEW.detached = 0)
+    BEGIN SELECT RAISE(ABORT, 'immutable family assignment'); END;
+    CREATE TRIGGER family_scope BEFORE INSERT ON session_families
+    WHEN NOT EXISTS (SELECT 1 FROM sessions c JOIN sessions p ON p.owner_id = NEW.owner_id
+        JOIN sessions r ON r.owner_id = NEW.owner_id
+        WHERE c.owner_id = NEW.owner_id AND c.id = NEW.child_id AND p.id = NEW.parent_id
+          AND r.id = NEW.root_id AND c.hat_id = NEW.hat_id AND p.hat_id = NEW.hat_id
+          AND r.hat_id = NEW.hat_id AND c.host_id = p.host_id AND p.host_id = r.host_id
+          AND c.lifecycle = 'starting' AND p.lifecycle = 'active'
+          AND c.close_requested = 0 AND p.close_requested = 0 AND r.close_requested = 0)
+      OR EXISTS (WITH RECURSIVE ancestors(id) AS (
+            SELECT NEW.parent_id UNION SELECT f.parent_id FROM session_families f
+            JOIN ancestors a ON a.id = f.child_id WHERE f.owner_id = NEW.owner_id)
+            SELECT 1 FROM ancestors WHERE id = NEW.child_id)
+    BEGIN SELECT RAISE(ABORT, 'invalid family scope'); END;
+    CREATE TRIGGER family_scope_end AFTER UPDATE OF hat_id, lifecycle, close_requested ON sessions
+    BEGIN
+      DELETE FROM session_families WHERE owner_id = NEW.owner_id
+        AND (child_id = NEW.id OR parent_id = NEW.id OR root_id = NEW.id) AND NEW.lifecycle = 'deleted';
+      UPDATE session_families SET detached = 1,
+        reason = CASE WHEN NEW.hat_id <> OLD.hat_id THEN 'reassigned' ELSE 'closed' END
+        WHERE owner_id = NEW.owner_id AND (child_id = NEW.id OR parent_id = NEW.id OR root_id = NEW.id)
+          AND detached = 0 AND (NEW.hat_id <> OLD.hat_id OR NEW.close_requested = 1 OR NEW.lifecycle = 'closed');
+    END;
+    ",
 ];
 
 /// The most distinct (agent session id, roots) pairs a session records
diff --git a/crates/hennery-sessions/tests/delegation.rs b/crates/hennery-sessions/tests/delegation.rs
index 1497349d3de1e6130ceafdab0beefc08bd51fc7f..379939b77fa8dbc4f9c15edd568f9eb0177b4e3d 100644
--- a/crates/hennery-sessions/tests/delegation.rs
+++ b/crates/hennery-sessions/tests/delegation.rs
@@ -11,30 +11,95 @@ use hennery_kernel::secret::unix_now;
 use hennery_proto::frames::{McpIsolation, McpServer, SessionBody};
 use hennery_sessions::store::{McpContext, Store};
 use std::sync::Arc;
-struct World { _dir: tempfile::TempDir, db: std::path::PathBuf, store: Store, gateway: Arc<GatewayStore>, hat: String, other: String }
+struct World {
+    _dir: tempfile::TempDir,
+    db: std::path::PathBuf,
+    store: Store,
+    gateway: Arc<GatewayStore>,
+    hat: String,
+    other: String,
+}
 impl World {
     fn new() -> Self {
-        let dir = tempfile::tempdir().unwrap(); let db = dir.path().join("hennery.db");
+        let dir = tempfile::tempdir().unwrap();
+        let db = dir.path().join("hennery.db");
         let hosts = Hosts::open(&db).unwrap();
-        hosts.register("host", &Enrollment { public_key: "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a".into(), name: "test".into(), host_version: "0".into(), platform: "linux".into() }, 1).unwrap();
+        hosts
+            .register(
+                "host",
+                &Enrollment {
+                    public_key: "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a".into(),
+                    name: "test".into(),
+                    host_version: "0".into(),
+                    platform: "linux".into(),
+                },
+                1,
+            )
+            .unwrap();
         let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
-        let HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else { panic!() };
+        let HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else {
+            panic!()
+        };
         let operator = Arc::new(Operator::open(&db).unwrap());
         let setup = operator.issue_setup_token(unix_now()).unwrap().unwrap();
-        assert!(matches!(operator.set_up(&setup, "correct horse battery", "https://hennery.example", unix_now()).unwrap(), SetupOutcome::Done { .. }));
+        assert!(matches!(
+            operator
+                .set_up(&setup, "correct horse battery", "https://hennery.example", unix_now())
+                .unwrap(),
+            SetupOutcome::Done { .. }
+        ));
         let gateway = Arc::new(GatewayStore::open(&db).unwrap());
-        let runtime = Arc::new(hennery_gateway::runtime::Runtime::new(gateway.clone(), Arc::new(ProxyStore::open(&db).unwrap()), Arc::new(MasterKey::from_bytes([7;32])), hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(), Arc::new(hennery_gateway::notify::Silent)));
+        let runtime = Arc::new(hennery_gateway::runtime::Runtime::new(
+            gateway.clone(),
+            Arc::new(ProxyStore::open(&db).unwrap()),
+            Arc::new(MasterKey::from_bytes([7; 32])),
+            hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
+            Arc::new(hennery_gateway::notify::Silent),
+        ));
         let state = GatewayState { runtime, operator };
-        let store = Store::open(&db).unwrap(); store.set_session_mcp(Arc::new(GatewayMcp::for_collector(&state)));
-        gateway.set_session_tools(&hat, true).unwrap(); gateway.set_session_tools(&other.id, true).unwrap();
-        Self { _dir: dir, db, store, gateway, hat, other: other.id }
+        let store = Store::open(&db).unwrap();
+        store.set_session_mcp(Arc::new(GatewayMcp::for_collector(&state)));
+        gateway.set_session_tools(&hat, true).unwrap();
+        gateway.set_session_tools(&other.id, true).unwrap();
+        Self {
+            _dir: dir,
+            db,
+            store,
+            gateway,
+            hat,
+            other: other.id,
+        }
     }
     fn start(&self, id: &str, hat: &str, isolation: McpIsolation) -> Option<SessionIdentity> {
-        let given = self.store.create_session_with_mcp(id, "host", "claude", "/project", hat, None, McpContext { capable: true, isolation, rules_name_other_hats: false }).unwrap().unwrap();
-        given.servers.iter().find_map(|s| match s { McpServer::Http { name, headers, .. } if name == "hennery" => self.gateway.authenticate_session(headers[0].value.strip_prefix("Bearer ").unwrap()).unwrap(), _ => None })
+        let given = self
+            .store
+            .create_session_with_mcp(
+                id,
+                "host",
+                "claude",
+                "/project",
+                hat,
+                None,
+                McpContext {
+                    capable: true,
+                    isolation,
+                    rules_name_other_hats: false,
+                },
+            )
+            .unwrap()
+            .unwrap();
+        given.servers.iter().find_map(|s| match s {
+            McpServer::Http { name, headers, .. } if name == "hennery" => self
+                .gateway
+                .authenticate_session(headers[0].value.strip_prefix("Bearer ").unwrap())
+                .unwrap(),
+            _ => None,
+        })
     }
     fn active(&self, id: &str) {
-        self.store.ingest(id, 1, &SessionBody::session_started("request", format!("agent-{id}"))).unwrap();
+        self.store
+            .ingest(id, 1, &SessionBody::session_started("request", format!("agent-{id}")))
+            .unwrap();
     }
 }
 #[test]
@@ -42,21 +107,29 @@ fn verified_context_checks_generation_session_owner_hat_cwd_and_live_isolation()
     let w = World::new();
     let identity = w.start("parent", &w.hat, McpIsolation::None).unwrap();
     let ctx = w.store.session_tool_context(&identity, 1, false).unwrap().unwrap();
-    assert_eq!(ctx.session_id(), "parent"); assert_eq!(ctx.canonical_cwd(), "/project");
+    assert_eq!(ctx.session_id(), "parent");
+    assert_eq!(ctx.canonical_cwd(), "/project");
     assert!(w.store.session_tool_context(&identity, 1, true).unwrap().is_none());
     w.active("parent");
     assert!(w.store.session_tool_context(&identity, 1, true).unwrap().is_some());
-    let mut forged = identity.clone(); forged.owner_id = "foreign".into();
+    let mut forged = identity.clone();
+    forged.owner_id = "foreign".into();
     assert!(w.store.session_tool_context(&forged, 1, false).unwrap().is_none());
-    forged = identity.clone(); forged.principal.hat_id = w.other.clone();
+    forged = identity.clone();
+    forged.principal.hat_id = w.other.clone();
     assert!(w.store.session_tool_context(&forged, 1, false).unwrap().is_none());
     let raw = hennery_kernel::db::open(&w.db).unwrap();
-    raw.execute("UPDATE hosts SET default_hat_id = ?1 WHERE id = 'host'", [&w.other]).unwrap();
+    raw.execute("UPDATE hosts SET default_hat_id = ?1 WHERE id = 'host'", [&w.other])
+        .unwrap();
     assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_none());
     assert!(w.start("fallback", &w.hat, McpIsolation::None).is_none());
     let isolated = w.start("isolated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
     assert!(w.store.session_tool_context(&isolated, 1, false).unwrap().is_some());
-    raw.execute("UPDATE sessions SET cwd = '/project/../escape' WHERE id = 'isolated'", []).unwrap();
+    raw.execute(
+        "UPDATE sessions SET cwd = '/project/../escape' WHERE id = 'isolated'",
+        [],
+    )
+    .unwrap();
     assert!(w.store.session_tool_context(&isolated, 1, false).unwrap().is_none());
 }
 #[test]
@@ -75,14 +148,29 @@ fn family_storage_is_immutable_direct_scoped_and_terminally_detached() {
     assert!(!w.store.bind_family_in(&tx, &identity, 1, "foreign-hat", 0).unwrap());
     tx.commit().unwrap();
     assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_some());
-    for id in ["sibling", "parent", "foreign-hat", "absent"] { assert!(w.store.direct_child(&identity, 1, id).unwrap().is_none()); }
-    conn.execute("UPDATE sessions SET close_requested = 1 WHERE id = 'parent'", []).unwrap();
+    for id in ["sibling", "parent", "foreign-hat", "absent"] {
+        assert!(w.store.direct_child(&identity, 1, id).unwrap().is_none());
+    }
+    conn.execute("UPDATE sessions SET close_requested = 1 WHERE id = 'parent'", [])
+        .unwrap();
     assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_none());
-    conn.execute("UPDATE sessions SET close_requested = 0, lifecycle = 'active' WHERE id = 'parent'", []).unwrap();
-    assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_none(), "resume cannot revive a detached edge");
-    conn.execute("UPDATE sessions SET lifecycle = 'deleted' WHERE id = 'parent'", []).unwrap();
-    let count: i64 = conn.query_row("SELECT count(*) FROM session_families", [], |r| r.get(0)).unwrap();
+    conn.execute(
+        "UPDATE sessions SET close_requested = 0, lifecycle = 'active' WHERE id = 'parent'",
+        [],
+    )
+    .unwrap();
+    assert!(
+        w.store.direct_child(&identity, 1, "child").unwrap().is_none(),
+        "resume cannot revive a detached edge"
+    );
+    conn.execute("UPDATE sessions SET lifecycle = 'deleted' WHERE id = 'parent'", [])
+        .unwrap();
+    let count: i64 = conn
+        .query_row("SELECT count(*) FROM session_families", [], |r| r.get(0))
+        .unwrap();
     assert_eq!(count, 0);
-    let state: String = conn.query_row("SELECT lifecycle FROM sessions WHERE id = 'child'", [], |r| r.get(0)).unwrap();
+    let state: String = conn
+        .query_row("SELECT lifecycle FROM sessions WHERE id = 'child'", [], |r| r.get(0))
+        .unwrap();
     assert_ne!(state, "deleted");
 }
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index a0d96eed32caf0c9676ffb5f15541251d199f53a..5ba51790c992f097b1f9ce96748513ded18bf69d 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -35,6 +35,11 @@ use std::sync::{Arc, Mutex};
 
 /// The audited sources, and the fewest statements each holds.
 const SOURCES: &[(&str, &str, usize)] = &[
+    (
+        "hennery-sessions/src/delegation.rs",
+        include_str!("../../hennery-sessions/src/delegation.rs"),
+        5,
+    ),
     (
         "hennery-gateway/src/identity.rs",
         include_str!("../../hennery-gateway/src/identity.rs"),
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-testkit --test owner_filter --locked
```

### Task 3, step 1: test(delegation): specify strict collector MCP transport

Specify the behavior first; the missing feature must produce the recorded RED exit.

<!-- replay {"sha":"f4b29957874b3ef283c882ffc85976cec7776d27","subject":"test(delegation): specify strict collector MCP transport","checks":[["cargo test -p hennery-testkit --test delegation_mcp --locked",101],["cargo test -p hennery-sessions --test delegation --locked",101]]} -->
```diff
diff --git a/crates/hennery-gateway/tests/builtin.rs b/crates/hennery-gateway/tests/builtin.rs
index eb887af9a26c6e5e472f0f568205ae11bb5b42db..8c4b4cf82d95540f1c57f7c71c8bbdec1deefd15 100644
--- a/crates/hennery-gateway/tests/builtin.rs
+++ b/crates/hennery-gateway/tests/builtin.rs
@@ -132,3 +132,41 @@ fn transaction_rollback_keeps_grants_and_token_generations_and_watches() {
     assert!(!watch.token().is_cancelled());
     assert!(w.store.delegation_granted(&identity).unwrap().is_some());
 }
+
+#[test]
+fn independent_store_policy_edits_cut_the_same_grant_without_keeping_writer_ownership() {
+    let w = world();
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    let token = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
+    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
+    let other = hennery_gateway::store::GatewayStore::open(&w.db).unwrap();
+    other.set_session_tools(&w.hat(), false).unwrap();
+    assert!(watch.token().is_cancelled());
+}
+#[test]
+fn foreign_owner_session_and_grant_are_not_visible() {
+    let w = world();
+    let mut conn = w.raw();
+    conn.execute_batch("INSERT INTO owners(id, created_at) VALUES ('foreign', 9223372036854775807);
+        INSERT INTO hats(id, owner_id, name, colour, created_at) VALUES ('foreign-hat','foreign','Other','#000000',0);
+        INSERT INTO hosts(id, owner_id, name, public_key, platform, host_version, default_hat_id, created_at)
+            VALUES ('foreign-host','foreign','other','other-key','linux','0','foreign-hat',0);
+        INSERT INTO hat_session_tools(owner_id,hat_id,delegation_enabled,revision) VALUES ('foreign','foreign-hat',1,1);").unwrap();
+    let tx = conn.transaction().unwrap();
+    let token = tokens::mint_delegation_in(
+        &tx,
+        "foreign",
+        "foreign-session",
+        "foreign-host",
+        "foreign-hat",
+        Some(1),
+        unix_now(),
+    )
+    .unwrap();
+    tx.commit().unwrap();
+    assert!(w.store.authenticate_session(token.expose()).unwrap().is_none());
+    assert!(w.store.session_tools("foreign-hat").unwrap().is_none());
+    assert!(w.store.set_session_tools("foreign-hat", false).unwrap().is_none());
+    assert!(w.store.set_session_tools("absent", true).unwrap().is_none());
+}
diff --git a/crates/hennery-sessions/tests/delegation.rs b/crates/hennery-sessions/tests/delegation.rs
index 379939b77fa8dbc4f9c15edd568f9eb0177b4e3d..d97ec0e1ddd20dcaebfc813bfc332851331fda25 100644
--- a/crates/hennery-sessions/tests/delegation.rs
+++ b/crates/hennery-sessions/tests/delegation.rs
@@ -174,3 +174,109 @@ fn family_storage_is_immutable_direct_scoped_and_terminally_detached() {
         .unwrap();
     assert_ne!(state, "deleted");
 }
+
+#[test]
+fn delegated_allocation_commits_session_family_token_together_and_rolls_back_all_three() {
+    let w = World::new();
+    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    let mcp = McpContext {
+        capable: true,
+        isolation: McpIsolation::ClaudeStrict,
+        rules_name_other_hats: false,
+    };
+    assert!(
+        w.store
+            .create_delegated_session(&parent, 1, "child", "claude", "/child", mcp, 0)
+            .unwrap()
+            .is_some()
+    );
+    assert!(w.store.direct_child(&parent, 1, "child").unwrap().is_some());
+    let conn = hennery_kernel::db::open(&w.db).unwrap();
+    conn.execute_batch("CREATE TRIGGER refuse_child_mint BEFORE INSERT ON gw_session_tokens WHEN NEW.session_id = 'fail' BEGIN SELECT RAISE(ABORT, 'test mint failure'); END;").unwrap();
+    assert!(
+        w.store
+            .create_delegated_session(&parent, 1, "fail", "claude", "/child", mcp, 0)
+            .is_err()
+    );
+    for table in ["sessions", "session_families", "gw_session_tokens"] {
+        let key = if table == "sessions" {
+            "id"
+        } else if table == "session_families" {
+            "child_id"
+        } else {
+            "session_id"
+        };
+        let count: i64 = conn
+            .query_row(&format!("SELECT count(*) FROM {table} WHERE {key} = 'fail'"), [], |r| {
+                r.get(0)
+            })
+            .unwrap();
+        assert_eq!(count, 0);
+    }
+    w.gateway.set_session_tools(&w.hat, false).unwrap();
+    assert!(
+        w.store
+            .create_delegated_session(&parent, 1, "stale", "claude", "/child", mcp, 0)
+            .unwrap()
+            .is_none()
+    );
+}
+
+#[test]
+fn family_rollback_immutability_reassignment_delete_and_purge_cannot_restore_authority() {
+    for transition in ["reassign", "delete-child", "purge"] {
+        let w = World::new();
+        let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+        w.active("parent");
+        w.start("child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+        let mut conn = hennery_kernel::db::open(&w.db).unwrap();
+        let tx = conn.transaction().unwrap();
+        assert!(w.store.bind_family_in(&tx, &parent, 1, "child", 0).unwrap());
+        drop(tx);
+        assert!(w.store.direct_child(&parent, 1, "child").unwrap().is_none());
+        let tx = conn.transaction().unwrap();
+        assert!(w.store.bind_family_in(&tx, &parent, 1, "child", 0).unwrap());
+        tx.commit().unwrap();
+        assert!(
+            conn.execute("UPDATE session_families SET parent_id = 'child'", [])
+                .is_err()
+        );
+        // Reverse the endpoints' lifecycles so only the recursive cycle
+        // guard rejects this otherwise valid insertion. Roll back the fixture
+        // change before exercising the original family's terminal transitions.
+        let tx = conn.transaction().unwrap();
+        tx.execute(
+            "UPDATE sessions SET lifecycle = CASE id WHEN 'parent' THEN 'starting' ELSE 'active' END
+             WHERE id IN ('parent', 'child')",
+            [],
+        )
+        .unwrap();
+        assert!(tx.execute("INSERT INTO session_families(owner_id,child_id,parent_id,root_id,hat_id,created_event_id) VALUES (?1,'parent','child','child',?2,0)",rusqlite::params![w.store.owner_id(),w.hat]).is_err());
+        tx.rollback().unwrap();
+        match transition {
+            "reassign" => {
+                conn.execute("UPDATE sessions SET hat_id = ?1 WHERE id = 'child'", [&w.other])
+                    .unwrap();
+                conn.execute("UPDATE sessions SET hat_id = ?1 WHERE id = 'child'", [&w.hat])
+                    .unwrap();
+            }
+            "delete-child" => {
+                conn.execute("UPDATE sessions SET lifecycle = 'deleted' WHERE id = 'child'", [])
+                    .unwrap();
+            }
+            "purge" => {
+                conn.execute(
+                    "INSERT INTO purged_hats(hat_id,owner_id,purged_at) VALUES (?1,?2,0)",
+                    rusqlite::params![w.hat, w.store.owner_id()],
+                )
+                .unwrap();
+            }
+            _ => unreachable!(),
+        }
+        assert!(
+            w.store.direct_child(&parent, 1, "child").unwrap().is_none(),
+            "{transition}"
+        );
+    }
+}
diff --git a/crates/hennery-testkit/tests/delegation_mcp.rs b/crates/hennery-testkit/tests/delegation_mcp.rs
new file mode 100644
index 0000000000000000000000000000000000000000..df1e893f79aad4c291ef8eceba875723fe78948c
--- /dev/null
+++ b/crates/hennery-testkit/tests/delegation_mcp.rs
@@ -0,0 +1,745 @@
+use axum::Router;
+use hennery_gateway::api::GatewayState;
+use hennery_gateway::key::MasterKey;
+use hennery_gateway::scope::ProxyStore;
+use hennery_gateway::session::GatewayMcp;
+use hennery_gateway::store::GatewayStore;
+use hennery_kernel::hosts::{Enrollment, Hosts};
+use hennery_kernel::operator::{Operator, SetupOutcome};
+use hennery_kernel::secret::unix_now;
+use hennery_proto::frames::{AgentIsolation, Capabilities, Capability, McpIsolation, McpServer};
+use hennery_sessions::{
+    AppState,
+    store::{McpContext, Store},
+};
+use reqwest::{Client, StatusCode};
+use serde_json::{Value, json};
+use std::sync::Arc;
+const ORIGIN: &str = "https://hennery.example";
+struct Harness {
+    _dir: tempfile::TempDir,
+    state: AppState,
+    gateway: GatewayState,
+    task: tokio::task::JoinHandle<()>,
+    url: String,
+    token: String,
+    hat: String,
+}
+impl Drop for Harness {
+    fn drop(&mut self) {
+        self.task.abort();
+    }
+}
+impl Harness {
+    async fn new() -> Self {
+        Self::with_limits(Default::default()).await
+    }
+    async fn with_limits(limits: hennery_gateway::proxy::Limits) -> Self {
+        let dir = tempfile::tempdir().unwrap();
+        let db = dir.path().join("hennery.db");
+        let hosts = Hosts::open(&db).unwrap();
+        hosts
+            .register(
+                "host",
+                &Enrollment {
+                    public_key: "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a".into(),
+                    name: "test".into(),
+                    host_version: "0".into(),
+                    platform: "linux".into(),
+                },
+                1,
+            )
+            .unwrap();
+        let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
+        let operator = Operator::open(&db).unwrap();
+        let setup = operator.issue_setup_token(unix_now()).unwrap().unwrap();
+        assert!(matches!(
+            operator
+                .set_up(&setup, "correct horse battery", ORIGIN, unix_now())
+                .unwrap(),
+            SetupOutcome::Done { .. }
+        ));
+        let state = AppState::new(Store::open(&db).unwrap(), hosts, operator);
+        let gateway_store = Arc::new(GatewayStore::open(&db).unwrap());
+        let runtime = Arc::new(hennery_gateway::runtime::Runtime::new(
+            gateway_store.clone(),
+            Arc::new(ProxyStore::open(&db).unwrap()),
+            Arc::new(MasterKey::from_bytes([7; 32])),
+            hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
+            Arc::new(hennery_gateway::notify::Silent),
+        ));
+        let gateway = GatewayState {
+            runtime,
+            operator: state.operator.clone(),
+        };
+        state
+            .store
+            .set_session_mcp(Arc::new(GatewayMcp::for_collector(&gateway)));
+        gateway_store.set_session_tools(&hat, true).unwrap();
+        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
+        let registered = state
+            .hub
+            .register(
+                "host",
+                tx,
+                Capabilities(vec![Capability::McpServers]),
+                AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
+            )
+            .unwrap();
+        state.hub.mark_ready("host", registered.conn_id);
+        let given = state
+            .store
+            .create_session_with_mcp(
+                "session",
+                "host",
+                "claude",
+                "/project",
+                &hat,
+                None,
+                McpContext {
+                    capable: true,
+                    isolation: McpIsolation::ClaudeStrict,
+                    rules_name_other_hats: false,
+                },
+            )
+            .unwrap()
+            .unwrap();
+        let McpServer::Http { headers, .. } = &given.servers[0] else {
+            panic!()
+        };
+        let token = headers[0].value.strip_prefix("Bearer ").unwrap().into();
+        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+        let url = format!("http://{}/mcp/builtin/hennery", listener.local_addr().unwrap());
+        let proxy = hennery_gateway::proxy::ProxyState::for_sessions(gateway.runtime.clone(), Default::default());
+        let app: Router = hennery_sessions::router(state.clone())
+            .merge(hennery_sessions::builtin::router_with_limits(
+                state.clone(),
+                gateway.clone(),
+                limits,
+            ))
+            .merge(hennery_gateway::proxy::router(proxy));
+        let task = tokio::spawn(async move {
+            axum::serve(
+                listener,
+                app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
+            )
+            .await
+            .unwrap();
+        });
+        Self {
+            _dir: dir,
+            state,
+            gateway,
+            task,
+            url,
+            token,
+            hat,
+        }
+    }
+    async fn post(&self, body: impl Into<Vec<u8>>) -> reqwest::Response {
+        Client::new()
+            .post(&self.url)
+            .bearer_auth(&self.token)
+            .header("content-type", "application/json")
+            .header("accept", "application/json, text/event-stream")
+            .body(body.into())
+            .send()
+            .await
+            .unwrap()
+    }
+    async fn rpc(&self, message: Value) -> Value {
+        let response = self.post(serde_json::to_vec(&message).unwrap()).await;
+        assert_eq!(response.status(), StatusCode::OK);
+        assert_eq!(response.headers()["cache-control"], "no-store");
+        assert_eq!(response.headers()["x-content-type-options"], "nosniff");
+        assert!(!response.headers().contains_key("mcp-session-id"));
+        assert!(!response.headers().contains_key("access-control-allow-origin"));
+        response.json().await.unwrap()
+    }
+}
+#[tokio::test]
+async fn starting_discovery_stateless_protocol_and_no_enabled_tools() {
+    let h = Harness::new().await;
+    for version in ["2025-03-26", "2025-06-18", "2025-11-25"] {
+        let response = h.rpc(json!({"jsonrpc":"2.0", "id":1, "method":"initialize", "params":{"protocolVersion":version,"capabilities":{},"clientInfo":{"name":"fixture", "version":"1"}}})).await;
+        assert_eq!(response["result"]["protocolVersion"], version);
+        assert_eq!(response["result"]["capabilities"], json!({"tools":{}}));
+    }
+    let initialized = h
+        .post(br#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#.to_vec())
+        .await;
+    assert_eq!(initialized.status(), StatusCode::ACCEPTED);
+    assert!(initialized.bytes().await.unwrap().is_empty());
+    assert_eq!(
+        h.rpc(json!({"jsonrpc":"2.0","id":"list","method":"tools/list"})).await["result"],
+        json!({"tools":[]})
+    );
+    assert_eq!(
+        h.rpc(json!({"jsonrpc":"2.0","id":2,"method":"ping"})).await["result"],
+        json!({})
+    );
+    let call = h
+        .rpc(json!({"jsonrpc":"2.0","id":3,"method":"tools/call", "params":{"name":"session_spawn","arguments":{}}}))
+        .await;
+    assert_eq!(call["result"]["isError"], true);
+    assert_eq!(call["result"]["structuredContent"]["code"], "session_starting");
+    h.state
+        .store
+        .ingest(
+            "session",
+            1,
+            &hennery_proto::frames::SessionBody::session_started("r", "agent"),
+        )
+        .unwrap();
+    let call = h
+        .rpc(json!({"jsonrpc":"2.0","id":3,"method":"tools/call", "params":{"name":"session_spawn","arguments":{}}}))
+        .await;
+    assert_eq!(call["result"]["structuredContent"]["code"], "tool_unavailable");
+    assert_eq!(
+        serde_json::from_str::<Value>(call["result"]["content"][0]["text"].as_str().unwrap()).unwrap(),
+        call["result"]["structuredContent"]
+    );
+    for method in [reqwest::Method::GET, reqwest::Method::DELETE] {
+        assert_eq!(
+            Client::new()
+                .request(method, &h.url)
+                .bearer_auth(&h.token)
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            StatusCode::METHOD_NOT_ALLOWED
+        );
+    }
+}
+#[tokio::test]
+async fn authority_and_origin_are_header_only_and_uniformly_refused() {
+    let h = Harness::new().await;
+    let body = r#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#;
+    for auth in [
+        None,
+        Some("Bearer bad"),
+        Some("Bearer hnry_client_bad"),
+        Some("Basic xxx"),
+    ] {
+        let mut req = Client::new()
+            .post(&h.url)
+            .header("content-type", "application/json")
+            .body(body);
+        if let Some(auth) = auth {
+            req = req.header("authorization", auth);
+        }
+        assert_eq!(req.send().await.unwrap().status(), StatusCode::NOT_FOUND);
+    }
+    let repeated = Client::new()
+        .post(&h.url)
+        .header("authorization", format!("Bearer {}", h.token))
+        .header("authorization", format!("Bearer {}", h.token))
+        .body(body)
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(repeated.status(), StatusCode::NOT_FOUND);
+    assert_eq!(
+        Client::new()
+            .post(&h.url)
+            .header("cookie", format!("hennery_session={}", h.token))
+            .body(body)
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::NOT_FOUND
+    );
+    for origin in [
+        "https://foreign.example",
+        "null",
+        "https://hennery.example/path",
+        "garbage",
+    ] {
+        assert_eq!(
+            Client::new()
+                .post(&h.url)
+                .bearer_auth(&h.token)
+                .header("origin", origin)
+                .body(body)
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            StatusCode::FORBIDDEN
+        );
+    }
+    assert_eq!(
+        Client::new()
+            .post(&h.url)
+            .bearer_auth(&h.token)
+            .header("origin", ORIGIN)
+            .header("content-type", "application/json")
+            .header("accept", "application/json, text/event-stream")
+            .body(body)
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::OK
+    );
+    assert_eq!(
+        Client::new()
+            .post(format!("{}?caller=session", h.url))
+            .bearer_auth(&h.token)
+            .body(body)
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::NOT_FOUND
+    );
+    let response = h.post(body.as_bytes().to_vec()).await.text().await.unwrap();
+    assert!(!response.contains(&h.token));
+    h.gateway.runtime.store.set_session_tools(&h.hat, false).unwrap();
+    assert_eq!(h.post(body.as_bytes().to_vec()).await.status(), StatusCode::NOT_FOUND);
+    h.gateway.runtime.store.set_session_tools(&h.hat, true).unwrap();
+    assert_eq!(h.post(body.as_bytes().to_vec()).await.status(), StatusCode::NOT_FOUND);
+}
+#[tokio::test]
+async fn strict_dispatch_has_deterministic_differential_refusals_and_positive_escapes() {
+    let h = Harness::new().await;
+    for body in [
+        r#"[{"jsonrpc":"2.0","id":1,"method":"ping"}]"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"ping","method":"tools/call"}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"ping","\u006dethod":"tools/call"}"#,
+        r#"{"jsonrpc":"2.0","id":1,"Method":"ping"}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_spawn","arguments":{"owner_id":"foreign"},"caller":"spoof"}}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_spawn","arguments":[]}}"#,
+        r#"{"jsonrpc":"2.0","id":true,"method":"ping"}"#,
+        "\u{feff}{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"ping\"}",
+    ] {
+        let response = h.post(body.as_bytes().to_vec()).await;
+        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{body}");
+        let answer: Value = response.json().await.unwrap();
+        assert!(answer["error"]["code"].as_i64().is_some());
+    }
+    assert_eq!(h.post(vec![0xff, 0xfe]).await.status(), StatusCode::BAD_REQUEST);
+    for body in [
+        r#"{ "jsonrpc" : "2.0", "id" : 1, "\u006dethod" : "ping" }"#,
+        "\r\n\t{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"ping\"}\t",
+    ] {
+        assert_eq!(h.post(body.as_bytes().to_vec()).await.status(), StatusCode::OK);
+    }
+    assert_eq!(
+        Client::new()
+            .post(&h.url)
+            .bearer_auth(&h.token)
+            .header("mcp-protocol-version", "unknown")
+            .body("{}")
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::BAD_REQUEST
+    );
+    let unknown = h.rpc(json!({"jsonrpc":"2.0","id":1,"method":"resources/list"})).await;
+    assert_eq!(unknown["error"]["code"], -32601);
+    assert_eq!(
+        Client::new()
+            .get(h.url.replace("/mcp/builtin/hennery", "/mcp/builtin/other"))
+            .bearer_auth(&h.token)
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::NOT_FOUND
+    );
+}
+
+#[tokio::test]
+async fn race_disable_or_revoke_cuts_body_read_and_keeps_external_identity() {
+    for revoke in [false, true] {
+        let h = Harness::new().await;
+        let (send, receive) = tokio::sync::mpsc::channel::<Result<axum::body::Bytes, std::io::Error>>(2);
+        send.send(Ok(axum::body::Bytes::from_static(b"{"))).await.unwrap();
+        let stream = futures::stream::unfold(receive, |mut receive| async move {
+            receive.recv().await.map(|chunk| (chunk, receive))
+        });
+        let client = Client::new();
+        let request = client
+            .post(&h.url)
+            .bearer_auth(&h.token)
+            .header("content-type", "application/json")
+            .header("accept", "application/json, text/event-stream")
+            .body(reqwest::Body::wrap_stream(stream))
+            .send();
+        tokio::pin!(request);
+        let wait = async {
+            while h.gateway.runtime.revocations.watched() == 0 {
+                tokio::task::yield_now().await;
+            }
+        };
+        tokio::select! { result = &mut request => panic!("request ended before cut: {result:?}"), result = tokio::time::timeout(std::time::Duration::from_secs(5), wait) => result.unwrap() }
+        if revoke {
+            use hennery_gateway::session::SessionMcp;
+            let mcp = GatewayMcp::for_collector(&h.gateway);
+            let mut conn = hennery_kernel::db::open(&h._dir.path().join("hennery.db")).unwrap();
+            let tx = conn.transaction().unwrap();
+            let cut = mcp.revoke_in(&tx, "session").unwrap();
+            tx.commit().unwrap();
+            mcp.cut(cut);
+        } else {
+            h.gateway.runtime.store.set_session_tools(&h.hat, false).unwrap();
+        }
+        drop(send);
+        let response = tokio::time::timeout(std::time::Duration::from_secs(5), request)
+            .await
+            .unwrap()
+            .unwrap();
+        assert_eq!(response.status(), StatusCode::NOT_FOUND);
+        assert!(!response.text().await.unwrap().contains(&h.token));
+        assert_eq!(
+            h.gateway
+                .runtime
+                .store
+                .authenticate_session(&h.token)
+                .unwrap()
+                .is_some(),
+            !revoke
+        );
+    }
+}
+
+#[tokio::test]
+async fn response_ids_are_redacted_after_assembly() {
+    let h = Harness::new().await;
+    h.state
+        .store
+        .ingest(
+            "session",
+            1,
+            &hennery_proto::frames::SessionBody::session_started("r", "agent"),
+        )
+        .unwrap();
+    let id = h.token.clone();
+    let result = h.rpc(json!({"jsonrpc":"2.0","id":id,"method":"ping"})).await;
+    assert!(!result.to_string().contains(&h.token));
+}
+
+#[tokio::test]
+async fn repeated_origin_null_notification_and_nested_duplicates_are_refused() {
+    let h = Harness::new().await;
+    let response = Client::new()
+        .post(&h.url)
+        .bearer_auth(&h.token)
+        .header("origin", ORIGIN)
+        .header("origin", ORIGIN)
+        .body("{}")
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(response.status(), StatusCode::FORBIDDEN);
+    for raw in [
+        r#"{"jsonrpc":"2.0","id":null,"method":"notifications/initialized"}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"x","arguments":{"x":1,"\u0078":2}}}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":[],"clientInfo":{"name":"x","version":"1"}}}"#,
+    ] {
+        assert_eq!(
+            h.post(raw.as_bytes().to_vec()).await.status(),
+            StatusCode::BAD_REQUEST,
+            "{raw}"
+        );
+    }
+}
+
+#[tokio::test]
+async fn policy_management_requires_browser_auth_origin_and_fresh_step_up() {
+    let h = Harness::new().await;
+    let endpoint = h
+        .url
+        .replace("/mcp/builtin/hennery", &format!("/api/hats/{}/session-tools", h.hat));
+    let phc = h
+        .state
+        .operator
+        .verify_password("correct horse battery")
+        .unwrap()
+        .unwrap();
+    let fresh = h
+        .state
+        .operator
+        .open_session("test", &phc, unix_now())
+        .unwrap()
+        .unwrap();
+    let stale = h
+        .state
+        .operator
+        .open_session("test", &phc, unix_now() - 600)
+        .unwrap()
+        .unwrap();
+    let client = Client::new();
+    for (session, origin, status) in [
+        (Some(stale.as_str()), Some(ORIGIN), StatusCode::FORBIDDEN),
+        (None, Some(ORIGIN), StatusCode::UNAUTHORIZED),
+        (Some(fresh.as_str()), None, StatusCode::FORBIDDEN),
+        (
+            Some(fresh.as_str()),
+            Some("https://foreign.example"),
+            StatusCode::FORBIDDEN,
+        ),
+    ] {
+        let mut request = client.patch(&endpoint).json(&json!({"delegation_enabled":false}));
+        if let Some(session) = session {
+            request = request.header("cookie", format!("hennery_session={session}"));
+        }
+        if let Some(origin) = origin {
+            request = request.header("origin", origin);
+        }
+        assert_eq!(request.send().await.unwrap().status(), status);
+    }
+    let get = client
+        .get(&endpoint)
+        .header("cookie", format!("hennery_session={stale}"))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(get.status(), StatusCode::OK);
+    assert_eq!(
+        get.json::<Value>().await.unwrap(),
+        json!({"delegation_enabled":true,"revision":1})
+    );
+    for body in [
+        r#"{"delegation_enabled":false,"delegation_enabled":true}"#,
+        r#"{"delegation_enabled":false,"owner_id":"foreign"}"#,
+    ] {
+        assert!(
+            !client
+                .patch(&endpoint)
+                .header("cookie", format!("hennery_session={fresh}"))
+                .header("origin", ORIGIN)
+                .header("content-type", "application/json")
+                .body(body)
+                .send()
+                .await
+                .unwrap()
+                .status()
+                .is_success()
+        );
+    }
+    let changed = client
+        .patch(&endpoint)
+        .header("cookie", format!("hennery_session={fresh}"))
+        .header("origin", ORIGIN)
+        .json(&json!({"delegation_enabled":false}))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(changed.status(), StatusCode::OK);
+    assert_eq!(
+        changed.json::<Value>().await.unwrap(),
+        json!({"delegation_enabled":false,"revision":2})
+    );
+    assert_eq!(
+        h.post(br#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#.to_vec())
+            .await
+            .status(),
+        StatusCode::NOT_FOUND
+    );
+}
+
+#[tokio::test]
+async fn body_caps_deadlines_content_types_and_request_permits_are_bounded() {
+    use hennery_gateway::proxy::Limits;
+    use std::time::Duration;
+    let h = Harness::with_limits(Limits::new(64, 32, Duration::from_secs(1), Duration::from_millis(50))).await;
+    assert_eq!(
+        h.post(vec![b' '; hennery_gateway::proxy::MAX_REQUEST_BODY + 1])
+            .await
+            .status(),
+        StatusCode::PAYLOAD_TOO_LARGE
+    );
+    let (send, receive) = tokio::sync::mpsc::channel::<Result<axum::body::Bytes, std::io::Error>>(1);
+    let stream = futures::stream::unfold(receive, |mut receive| async move {
+        receive.recv().await.map(|v| (v, receive))
+    });
+    let stalled = Client::new()
+        .post(&h.url)
+        .bearer_auth(&h.token)
+        .header("content-type", "application/json")
+        .header("accept", "application/json, text/event-stream")
+        .body(reqwest::Body::wrap_stream(stream))
+        .send();
+    tokio::pin!(stalled);
+    let response = tokio::time::timeout(Duration::from_secs(2), &mut stalled)
+        .await
+        .unwrap()
+        .unwrap();
+    assert_eq!(response.status(), StatusCode::REQUEST_TIMEOUT);
+    drop(send);
+    for (content, accept, status) in [
+        ("text/plain", "application/json", StatusCode::UNSUPPORTED_MEDIA_TYPE),
+        ("application/json", "text/event-stream", StatusCode::NOT_ACCEPTABLE),
+    ] {
+        assert_eq!(
+            Client::new()
+                .post(&h.url)
+                .bearer_auth(&h.token)
+                .header("content-type", content)
+                .header("accept", accept)
+                .body("{}")
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            status
+        );
+    }
+    let busy = Harness::with_limits(Limits::new(0, 32, Duration::from_secs(1), Duration::from_secs(1))).await;
+    assert_eq!(
+        busy.post(b"{}".to_vec()).await.status(),
+        StatusCode::SERVICE_UNAVAILABLE
+    );
+    assert_eq!(
+        h.post(br#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#.to_vec())
+            .await
+            .status(),
+        StatusCode::OK
+    );
+}
+
+#[path = "../../hennery-gateway/tests/support/differential.rs"]
+mod differential;
+#[tokio::test]
+async fn differential_decoders_cannot_change_the_builtin_dispatch() {
+    use differential::{DECODERS, Node};
+    let h = Harness::new().await;
+    for (raw, accepted) in [
+        (r#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#, true),
+        (r#"{ "jsonrpc" : "2.0", "id":1, "\u006dethod" : "ping" }"#, true),
+        (
+            r#"{"jsonrpc":"2.0","id":1,"method":"ping","method":"tools/list"}"#,
+            false,
+        ),
+        (
+            r#"{"jsonrpc":"2.0","id":1,"method":"ping","Method":"tools/list"}"#,
+            false,
+        ),
+        (r#"{"jsonrpc":"2.0","id":1,"METHOD":"ping"}"#, false),
+        (r#"{"jsonrpc":"2.0","id":1,"me_thod":"ping"}"#, false),
+        (r#"{"jsonrpc":"2.0","id":1,"method\u0000x":"ping"}"#, false),
+    ] {
+        let tree: Node = serde_json::from_slice(raw.as_bytes()).unwrap();
+        let decoded: Vec<_> = DECODERS.iter().map(|d| d.str(d.get(&tree, "method"))).collect();
+        let response = h.post(raw.as_bytes().to_vec()).await;
+        if accepted {
+            assert!(
+                decoded.iter().all(|m| m.as_deref() == Some("ping")),
+                "{raw}: {decoded:?}"
+            );
+            assert_eq!(response.status(), StatusCode::OK);
+            assert_eq!(response.json::<Value>().await.unwrap()["result"], json!({}));
+        } else {
+            assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{raw}: {decoded:?}");
+        }
+    }
+}
+
+#[tokio::test]
+async fn exact_builtin_route_preserves_external_builtin_slug_and_rejects_deeper_paths() {
+    let h = Harness::new().await;
+    let upstream = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let upstream_url = format!("http://{}/mcp", upstream.local_addr().unwrap());
+    let app = Router::new().route(
+        "/mcp",
+        axum::routing::post(|| async { axum::Json(json!({"jsonrpc":"2.0","id":1,"result":{"external":true}})) }),
+    );
+    let upstream_task = tokio::spawn(async move { axum::serve(upstream, app).await.unwrap() });
+    let new = hennery_gateway::model::NewConnection {
+        slug: "builtin".into(),
+        label: "external".into(),
+        url: upstream_url,
+        hat_id: h.hat.clone(),
+        cred_kind: hennery_gateway::model::CredKind::None,
+        static_header: None,
+        static_prefix: None,
+        tool_allowlist: None,
+        internal_network: true,
+    };
+    let hennery_gateway::model::Change::Done(connection) = h.gateway.runtime.store.create(&new, unix_now()).unwrap()
+    else {
+        panic!()
+    };
+    h.gateway
+        .runtime
+        .store
+        .replace_mounts(&connection.id, &["host".into()])
+        .unwrap();
+    let external = h.url.replace("/mcp/builtin/hennery", "/mcp/builtin");
+    for disabled in [false, true] {
+        if disabled {
+            h.gateway.runtime.store.set_session_tools(&h.hat, false).unwrap();
+        }
+        let response = Client::new()
+            .post(&external)
+            .bearer_auth(&h.token)
+            .header("content-type", "application/json")
+            .json(&json!({"jsonrpc":"2.0","id":1,"method":"ping"}))
+            .send()
+            .await
+            .unwrap();
+        assert_eq!(response.status(), StatusCode::OK);
+        assert_eq!(response.json::<Value>().await.unwrap()["result"]["external"], true);
+        assert_eq!(
+            h.post(br#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#.to_vec())
+                .await
+                .status(),
+            if disabled {
+                StatusCode::NOT_FOUND
+            } else {
+                StatusCode::OK
+            }
+        );
+    }
+    for path in ["/mcp/builtin/hennery/other", "/mcp/builtin/other", "/mcp/other/deeper"] {
+        assert_eq!(
+            Client::new()
+                .post(h.url.replace("/mcp/builtin/hennery", path))
+                .bearer_auth(&h.token)
+                .body("{}")
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            StatusCode::NOT_FOUND
+        );
+    }
+    upstream_task.abort();
+}
+
+#[tokio::test]
+async fn current_host_capability_and_isolation_are_rechecked_after_reconnect() {
+    let h = Harness::new().await;
+    for (capable, isolation, status) in [
+        (false, McpIsolation::ClaudeStrict, StatusCode::NOT_FOUND),
+        (true, McpIsolation::None, StatusCode::NOT_FOUND),
+        (true, McpIsolation::ClaudeStrict, StatusCode::OK),
+    ] {
+        if let Some(connection) = h.state.hub.routable_conn("host") {
+            h.state.hub.unregister("host", connection);
+        }
+        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
+        let registration = h
+            .state
+            .hub
+            .register(
+                "host",
+                tx,
+                Capabilities(if capable { vec![Capability::McpServers] } else { vec![] }),
+                AgentIsolation([("claude".into(), isolation)].into_iter().collect()),
+            )
+            .unwrap();
+        h.state.hub.mark_ready("host", registration.conn_id);
+        assert_eq!(
+            h.post(br#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#.to_vec())
+                .await
+                .status(),
+            status
+        );
+    }
+}
```

Run (expected exit 101):

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_mcp --locked
```

Run (expected exit 101):

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --locked
```

### Task 3, step 2: feat(delegation): serve collector MCP with revocable session admission

Implement the preceding contract; all listed GREEN commands must succeed.

<!-- replay {"sha":"0b60fdb24806b3eb1fbe7cd71e30ad7ac584369a","subject":"feat(delegation): serve collector MCP with revocable session admission","checks":[["cargo test -p hennery-gateway --test builtin --test session_mcp --locked",0],["cargo test -p hennery-sessions --test delegation --lib --locked",0],["cargo test -p hennery-testkit --test delegation_mcp --test owner_filter --locked",0]]} -->
```diff
diff --git a/crates/hennery-gateway/src/identity.rs b/crates/hennery-gateway/src/identity.rs
index 71cba6cefbd30ee12c6fc5369ef9c060e93ce27a..b823e2df33ce72c180a4795153fb27fc1ea38cb6 100644
--- a/crates/hennery-gateway/src/identity.rs
+++ b/crates/hennery-gateway/src/identity.rs
@@ -76,19 +76,20 @@ pub(crate) fn builtin_in(tx: &Transaction<'_>, owner: &str, hat: &str) -> Result
         .map(|s| BuiltinDescriptor { revision: s.revision }))
 }
 
-type WatchRegistry = Vec<(Arc<hennery_kernel::coordination::Coordination>, Weak<Revocations>)>;
+type WatchRegistry = Vec<(Weak<hennery_kernel::coordination::Coordination>, Weak<Revocations>)>;
 pub(crate) fn grant_watches(coordination: Arc<hennery_kernel::coordination::Coordination>) -> Arc<Revocations> {
     static REGISTRY: OnceLock<Mutex<WatchRegistry>> = OnceLock::new();
     let mut registry = REGISTRY.get_or_init(Mutex::default).lock().expect("grant registry");
-    registry.retain(|(_, watches)| watches.strong_count() > 0);
-    if let Some(watches) = registry
-        .iter()
-        .find_map(|(key, watches)| Arc::ptr_eq(key, &coordination).then(|| watches.upgrade()).flatten())
-    {
+    registry.retain(|(key, watches)| key.strong_count() > 0 && watches.strong_count() > 0);
+    if let Some(watches) = registry.iter().find_map(|(key, watches)| {
+        key.upgrade()
+            .filter(|key| Arc::ptr_eq(key, &coordination))
+            .and_then(|_| watches.upgrade())
+    }) {
         return watches;
     }
     let watches = Arc::new(Revocations::new());
-    registry.push((coordination, Arc::downgrade(&watches)));
+    registry.push((Arc::downgrade(&coordination), Arc::downgrade(&watches)));
     watches
 }
 fn grant_key(owner: &str, hat: &str, revision: i64) -> String {
diff --git a/crates/hennery-gateway/src/jsonrpc.rs b/crates/hennery-gateway/src/jsonrpc.rs
index 707b6b1739062e682ec3533bab6bbca7f7924547..ddb4824ca077b2cd5ba7b22a7ec2454b896180cc 100644
--- a/crates/hennery-gateway/src/jsonrpc.rs
+++ b/crates/hennery-gateway/src/jsonrpc.rs
@@ -24,7 +24,6 @@
 
 use serde::de::{self, Deserialize, Deserializer, MapAccess, SeqAccess, Visitor};
 use serde_json::{Value, json};
-use std::collections::HashSet;
 
 /// The client capabilities never sent upstream (gateway spec §5.6).
 pub const STRIPPED_CAPABILITIES: &[&str] = &["sampling", "elicitation", "roots"];
@@ -391,8 +390,7 @@ pub fn take_refused_requests(value: Value) -> (Option<Value>, Vec<Value>) {
 /// reading for both ways: a request, an event, and a `tools/list` answer
 /// read whole (plan 2026-10-15).
 pub fn read(bytes: &[u8]) -> Option<Value> {
-    serde_json::from_slice::<Unique>(bytes).ok()?;
-    let value = serde_json::from_slice::<Value>(bytes).ok()?;
+    let value = decode_once(bytes)?;
     (!ambiguous(&value)).then_some(value)
 }
 
@@ -404,7 +402,10 @@ pub(crate) fn unique_keys(bytes: &[u8]) -> bool {
 }
 
 /// Any JSON, refusing a key twice in one object at any depth.
-struct Unique;
+pub fn decode_once(bytes: &[u8]) -> Option<Value> {
+    serde_json::from_slice::<Unique>(bytes).ok().map(|v| v.0)
+}
+struct Unique(Value);
 
 impl<'de> Deserialize<'de> for Unique {
     fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
@@ -421,44 +422,51 @@ impl<'de> Visitor<'de> for UniqueVisitor {
         f.write_str("JSON without duplicate keys")
     }
 
-    fn visit_bool<E>(self, _: bool) -> Result<Unique, E> {
-        Ok(Unique)
+    fn visit_bool<E>(self, value: bool) -> Result<Unique, E> {
+        Ok(Unique(Value::Bool(value)))
     }
 
-    fn visit_i64<E>(self, _: i64) -> Result<Unique, E> {
-        Ok(Unique)
+    fn visit_i64<E>(self, value: i64) -> Result<Unique, E> {
+        Ok(Unique(Value::Number(value.into())))
     }
 
-    fn visit_u64<E>(self, _: u64) -> Result<Unique, E> {
-        Ok(Unique)
+    fn visit_u64<E>(self, value: u64) -> Result<Unique, E> {
+        Ok(Unique(Value::Number(value.into())))
     }
 
-    fn visit_f64<E>(self, _: f64) -> Result<Unique, E> {
-        Ok(Unique)
+    fn visit_f64<E>(self, value: f64) -> Result<Unique, E> {
+        Ok(Unique(
+            serde_json::Number::from_f64(value)
+                .map(Value::Number)
+                .unwrap_or(Value::Null),
+        ))
     }
 
-    fn visit_str<E>(self, _: &str) -> Result<Unique, E> {
-        Ok(Unique)
+    fn visit_str<E>(self, value: &str) -> Result<Unique, E> {
+        Ok(Unique(Value::String(value.into())))
     }
 
     fn visit_unit<E>(self) -> Result<Unique, E> {
-        Ok(Unique)
+        Ok(Unique(Value::Null))
     }
 
     fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Unique, A::Error> {
-        while seq.next_element::<Unique>()?.is_some() {}
-        Ok(Unique)
+        let mut values = Vec::new();
+        while let Some(value) = seq.next_element::<Unique>()? {
+            values.push(value.0);
+        }
+        Ok(Unique(Value::Array(values)))
     }
 
     fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Unique, A::Error> {
-        let mut seen = HashSet::new();
+        let mut values = serde_json::Map::new();
         while let Some(key) = map.next_key::<String>()? {
-            if !seen.insert(key) {
+            if values.contains_key(&key) {
                 return Err(de::Error::custom("a key twice in one object"));
             }
-            map.next_value::<Unique>()?;
+            values.insert(key, map.next_value::<Unique>()?.0);
         }
-        Ok(Unique)
+        Ok(Unique(Value::Object(values)))
     }
 }
 
diff --git a/crates/hennery-gateway/src/lib.rs b/crates/hennery-gateway/src/lib.rs
index 391e0b12a509f7ee454dfdd5515790c930d5a78a..398013b170cd7699132b58fbd6d7c1fec1e527aa 100644
--- a/crates/hennery-gateway/src/lib.rs
+++ b/crates/hennery-gateway/src/lib.rs
@@ -10,6 +10,7 @@ pub mod crypto;
 pub mod flows;
 pub mod identity;
 mod jsonrpc;
+pub use jsonrpc::decode_once as decode_json_once;
 pub mod key;
 pub mod model;
 pub mod notify;
diff --git a/crates/hennery-gateway/src/proxy.rs b/crates/hennery-gateway/src/proxy.rs
index e2835a96e8b96cd3ff90a20ab4b143dc772f63b4..b2e22ba83d637da7e419597771714a44c41b89e2 100644
--- a/crates/hennery-gateway/src/proxy.rs
+++ b/crates/hennery-gateway/src/proxy.rs
@@ -267,14 +267,14 @@ async fn reject_route(State(state): State<ProxyState>, headers: HeaderMap, body:
 
 /// Track whether hyper was asked for body data. An unpolled Expect upload
 /// can be refused without polling and thus without sending 100 Continue.
-struct RequestBody {
+pub struct RequestBody {
     stream: BodyDataStream,
     polled: bool,
     expect_continue: bool,
 }
 
 impl RequestBody {
-    fn new(body: Body, headers: &HeaderMap) -> Self {
+    pub fn new(body: Body, headers: &HeaderMap) -> Self {
         Self {
             stream: body.into_data_stream(),
             polled: false,
@@ -310,7 +310,7 @@ impl Stream for RequestBody {
 /// An unpolled Expect: 100-continue body is closed without draining, so
 /// a head-time refusal never invites the client to begin its upload.
 /// Past the cap, deadline or a read error, close HTTP/1 after the answer.
-async fn drain_rejected(mut body: RequestBody, mut answer: Response, limits: &Limits) -> Response {
+pub async fn drain_rejected(mut body: RequestBody, mut answer: Response, limits: &Limits) -> Response {
     let unstarted_expect = body.expect_continue && !body.polled;
     let drain = async {
         let mut remaining = limits.drain_cap;
@@ -345,7 +345,7 @@ fn upstream_auth(connection: &ScopedConnection) -> Response {
 }
 
 /// The bearer token of `Authorization`, if there is exactly one.
-fn bearer(headers: &HeaderMap) -> Option<&str> {
+pub fn bearer(headers: &HeaderMap) -> Option<&str> {
     let mut values = headers.get_all(header::AUTHORIZATION).iter();
     let value = values.next()?;
     if values.next().is_some() {
diff --git a/crates/hennery-gateway/src/session.rs b/crates/hennery-gateway/src/session.rs
index b5dcdd241fc317587d48710dbe5d44922392170c..e7278a00299537078c4602723385ac2eec5e7adb 100644
--- a/crates/hennery-gateway/src/session.rs
+++ b/crates/hennery-gateway/src/session.rs
@@ -50,7 +50,9 @@ pub struct Delivered {
 /// The gateway, as the sessions module sees it (umbrella §9, ACP core §1).
 pub trait SessionMcp: Send + Sync {
     /// Shared authentication seam; provided only by full collector wiring.
-    fn authenticator(&self) -> Option<Arc<GatewayStore>> { None }
+    fn authenticator(&self) -> Option<Arc<GatewayStore>> {
+        None
+    }
     fn plugin_control(&self) -> Option<Arc<crate::plugin::Control>> {
         None
     }
@@ -166,7 +168,9 @@ fn mounted_slugs_in(tx: &Transaction<'_>, owner: &str, host_id: &str, hat_id: &s
 }
 
 impl SessionMcp for GatewayMcp {
-    fn authenticator(&self) -> Option<Arc<GatewayStore>> { self.builtin.then(|| self.store.clone()) }
+    fn authenticator(&self) -> Option<Arc<GatewayStore>> {
+        self.builtin.then(|| self.store.clone())
+    }
     fn plugin_control(&self) -> Option<Arc<crate::plugin::Control>> {
         Some(self.store.plugins())
     }
diff --git a/crates/hennery-sessions/src/builtin.rs b/crates/hennery-sessions/src/builtin.rs
new file mode 100644
index 0000000000000000000000000000000000000000..0ca842c14f596726ada93770d8b22e68d3a31f16
--- /dev/null
+++ b/crates/hennery-sessions/src/builtin.rs
@@ -0,0 +1,433 @@
+//! Collector-local session MCP. Stateless JSON responses; no control tools are
+//! enabled until D2/D3. The proxy's safe body/header primitives are shared,
+//! never its upstream forwarding path.
+use crate::{AppState, api::error};
+use axum::handler::Handler;
+use axum::{
+    Json, Router,
+    body::Body,
+    extract::{OriginalUri, State},
+    http::{HeaderMap, Method, StatusCode, header},
+    response::{IntoResponse, Response},
+    routing::any,
+};
+use futures::{StreamExt, stream};
+use hennery_gateway::{
+    api::GatewayState,
+    identity::SessionIdentity,
+    proxy::{Limits, MAX_REQUEST_BODY, RequestBody, bearer, drain_rejected},
+    revocation::Watch,
+};
+use hennery_proto::{
+    delegation::{HatSessionTools, SetSessionTools},
+    frames::McpIsolation,
+};
+use serde::Deserialize;
+use serde_json::{Value, json};
+use std::sync::Arc;
+
+pub const VERSIONS: &[&str] = &["2025-03-26", "2025-06-18", "2025-11-25"];
+#[derive(Clone)]
+struct BuiltinState {
+    app: AppState,
+    gateway: GatewayState,
+    limits: Arc<Limits>,
+}
+pub fn router(app: AppState, gateway: GatewayState) -> Router {
+    router_with_limits(app, gateway, Limits::default())
+}
+pub fn router_with_limits(app: AppState, gateway: GatewayState, limits: Limits) -> Router {
+    Router::new()
+        .route("/mcp/builtin/hennery", any(endpoint))
+        .with_state(BuiltinState {
+            app,
+            gateway,
+            limits: Arc::new(limits),
+        })
+}
+fn no_scope() -> Response {
+    error(StatusCode::NOT_FOUND, "not_found", "not found")
+}
+fn rpc_error(id: Value, code: i64, status: StatusCode) -> Response {
+    (
+        status,
+        json_response(
+            json!({"jsonrpc":"2.0", "id":id, "error":{"code":code,"message":"invalid or unavailable request"}}),
+        ),
+    )
+        .into_response()
+}
+fn one_header<'a>(headers: &'a HeaderMap, name: &str) -> Result<Option<&'a str>, ()> {
+    let mut values = headers.get_all(name).iter();
+    let Some(value) = values.next() else { return Ok(None) };
+    if values.next().is_some() {
+        return Err(());
+    }
+    value.to_str().map(Some).map_err(|_| ())
+}
+fn origin_ok(headers: &HeaderMap, public: Option<&str>) -> bool {
+    matches!(one_header(headers, "origin"), Ok(None))
+        || matches!(one_header(headers, "origin"), Ok(Some(origin)) if Some(origin) == public)
+}
+
+async fn endpoint(
+    State(state): State<BuiltinState>,
+    OriginalUri(uri): OriginalUri,
+    method: Method,
+    headers: HeaderMap,
+    body: Body,
+) -> Response {
+    let mut body = RequestBody::new(body, &headers);
+    let Ok(permit) = state.limits.requests.try_acquire("builtin") else {
+        return secure(
+            drain_rejected(
+                body,
+                error(StatusCode::SERVICE_UNAVAILABLE, "busy", "busy"),
+                &state.limits,
+            )
+            .await,
+        );
+    };
+    let origin = state.app.operator.public_url();
+    let mut token_watch = None;
+    let mut grant_watch = None;
+    let answer = if !origin_ok(&headers, origin.as_ref().map(|p| p.origin())) {
+        error(StatusCode::FORBIDDEN, "origin_refused", "origin refused")
+    } else if uri.query().is_some() {
+        no_scope()
+    } else if let Some(token) = bearer(&headers) {
+        token_watch = state
+            .gateway
+            .runtime
+            .store
+            .watch_session(token, &state.gateway.runtime.revocations);
+        if let Some(watch) = &token_watch {
+            let cancelled = watch.token();
+            let admitted = state.gateway.runtime.store.authenticate_session(token).ok().flatten();
+            if let Some(identity) = admitted {
+                grant_watch = state.gateway.runtime.store.watch_delegation(&identity).ok().flatten();
+                if let Some(grant) = &grant_watch {
+                    let grant_cancelled = grant.token();
+                    tokio::select! { biased;
+                        () = cancelled.cancelled() => no_scope(),
+                        () = grant_cancelled.cancelled() => no_scope(),
+                        response = handle(&state, identity, method, &headers, &mut body) => response,
+                    }
+                } else {
+                    no_scope()
+                }
+            } else {
+                no_scope()
+            }
+        } else {
+            no_scope()
+        }
+    } else {
+        no_scope()
+    };
+    let answer = if answer.status().is_success() {
+        answer
+    } else {
+        drain_rejected(body, answer, &state.limits).await
+    };
+    // A cut before response acceptance returns the uniform refusal. After
+    // acceptance both watches stay on the response until its body ends.
+    if answer.status() == StatusCode::NOT_FOUND {
+        token_watch = None;
+        grant_watch = None;
+    }
+    secure(watched_response(answer, token_watch, grant_watch, Some(permit)))
+}
+fn watched_response(
+    answer: Response,
+    token: Option<Watch>,
+    grant: Option<Watch>,
+    permit: Option<hennery_kernel::egress::Permit>,
+) -> Response {
+    let (parts, body) = answer.into_parts();
+    let stream = stream::unfold(
+        (Some(body.into_data_stream()), token, grant, permit),
+        |(body, token, grant, permit)| async move {
+            let mut body = body?;
+            let token_cancelled = token.as_ref().map(Watch::token);
+            let grant_cancelled = grant.as_ref().map(Watch::token);
+            let cancelled = async move {
+                if let Some(token) = token_cancelled {
+                    token.cancelled().await;
+                } else {
+                    std::future::pending::<()>().await;
+                }
+            };
+            let grant_cancelled = async move {
+                if let Some(grant) = grant_cancelled {
+                    grant.cancelled().await;
+                } else {
+                    std::future::pending::<()>().await;
+                }
+            };
+            tokio::select! { biased;
+                () = cancelled => Some((Err(std::io::Error::other("session authority ended")), (None, None, None, None))),
+                () = grant_cancelled => Some((Err(std::io::Error::other("session authority ended")), (None, None, None, None))),
+                next = body.next() => next.map(|chunk| (chunk.map_err(std::io::Error::other), (Some(body), token, grant, permit))),
+            }
+        },
+    );
+    Response::from_parts(parts, Body::from_stream(stream))
+}
+fn secure(mut answer: Response) -> Response {
+    answer
+        .headers_mut()
+        .insert(header::CACHE_CONTROL, header::HeaderValue::from_static("no-store"));
+    answer.headers_mut().insert(
+        header::X_CONTENT_TYPE_OPTIONS,
+        header::HeaderValue::from_static("nosniff"),
+    );
+    answer
+}
+fn json_response(mut value: Value) -> Response {
+    hennery_kernel::redact::value(&mut value);
+    Json(value).into_response()
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Message {
+    jsonrpc: String,
+    #[serde(default)]
+    id: Option<Value>,
+    method: String,
+    #[serde(default)]
+    params: Option<Value>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Initialize {
+    #[serde(rename = "protocolVersion")]
+    protocol_version: String,
+    capabilities: serde_json::Map<String, Value>,
+    #[serde(rename = "clientInfo")]
+    client_info: ClientInfo,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct ClientInfo {
+    name: String,
+    version: String,
+    #[serde(default)]
+    title: Option<String>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Call {
+    name: String,
+    arguments: serde_json::Map<String, Value>,
+}
+
+async fn handle(
+    state: &BuiltinState,
+    identity: SessionIdentity,
+    method: Method,
+    headers: &HeaderMap,
+    body: &mut RequestBody,
+) -> Response {
+    let Some(revision) = identity.delivered_delegation_revision() else {
+        return no_scope();
+    };
+    let context = state
+        .app
+        .store
+        .session_tool_context(&identity, revision, false)
+        .ok()
+        .flatten();
+    let Some(context) = context else { return no_scope() };
+    // Current hello eligibility, not a stale delivery flag. Unisolated is
+    // restricted to the host's current default hat by the store predicate.
+    let Some((capable, isolation)) = state.app.hub.mcp_isolation(context.host_id(), context.agent()) else {
+        return no_scope();
+    };
+    if !capable
+        || (isolation == McpIsolation::None
+            && state
+                .app
+                .store
+                .mcp_delivery(context.session_id())
+                .ok()
+                .flatten()
+                .is_none_or(|d| d.mode != hennery_proto::rest::McpSessionDeliveryMode::Unisolated))
+    {
+        return no_scope();
+    }
+    if method != Method::POST {
+        return StatusCode::METHOD_NOT_ALLOWED.into_response();
+    }
+    if !matches!(
+        one_header(headers, "mcp-protocol-version"),
+        Ok(None) | Ok(Some("2025-03-26" | "2025-06-18" | "2025-11-25"))
+    ) {
+        return rpc_error(Value::Null, -32600, StatusCode::BAD_REQUEST);
+    }
+    if !matches!(one_header(headers, "content-type"), Ok(Some(value)) if value.split(';').next().is_some_and(|v| v.trim().eq_ignore_ascii_case("application/json")))
+    {
+        return rpc_error(Value::Null, -32600, StatusCode::UNSUPPORTED_MEDIA_TYPE);
+    }
+    if !matches!(one_header(headers, "accept"), Ok(Some(value)) if value.split(',').any(|v| v.trim().split(';').next() == Some("application/json")))
+    {
+        return rpc_error(Value::Null, -32600, StatusCode::NOT_ACCEPTABLE);
+    }
+    let read = async {
+        let mut bytes = Vec::new();
+        while let Some(chunk) = body.next().await {
+            let chunk = chunk.map_err(|_| StatusCode::BAD_REQUEST)?;
+            if bytes.len() + chunk.len() > MAX_REQUEST_BODY {
+                return Err(StatusCode::PAYLOAD_TOO_LARGE);
+            }
+            bytes.extend_from_slice(&chunk);
+        }
+        Ok(bytes)
+    };
+    let bytes = match tokio::time::timeout(state.limits.body_timeout, read).await {
+        Ok(Ok(bytes)) => bytes,
+        Ok(Err(status)) => return rpc_error(Value::Null, -32600, status),
+        Err(_) => return rpc_error(Value::Null, -32600, StatusCode::REQUEST_TIMEOUT),
+    };
+    let Some(value) = hennery_gateway::decode_json_once(&bytes) else {
+        return rpc_error(Value::Null, -32700, StatusCode::BAD_REQUEST);
+    };
+    let has_id = value.as_object().is_some_and(|v| v.contains_key("id"));
+    let Ok(message) = serde_json::from_value::<Message>(value) else {
+        return rpc_error(Value::Null, -32600, StatusCode::BAD_REQUEST);
+    };
+    if message.jsonrpc != "2.0"
+        || message
+            .id
+            .as_ref()
+            .is_some_and(|id| !(id.is_string() || id.as_i64().is_some() || id.as_u64().is_some()))
+    {
+        return rpc_error(Value::Null, -32600, StatusCode::BAD_REQUEST);
+    }
+    let no_params = message.params.as_ref().is_none_or(|p| {
+        p.as_object()
+            .is_some_and(|p| p.is_empty() || (p.len() == 1 && p.contains_key("_meta")))
+    });
+    let id = message.id.unwrap_or(Value::Null);
+    if message.method == "notifications/initialized" && !has_id && no_params {
+        return StatusCode::ACCEPTED.into_response();
+    }
+    if id.is_null() {
+        return rpc_error(Value::Null, -32600, StatusCode::BAD_REQUEST);
+    }
+    let result = match message.method.as_str() {
+        "initialize" => {
+            let Ok(init) = serde_json::from_value::<Initialize>(message.params.unwrap_or(Value::Null)) else {
+                return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
+            };
+            let _ = (
+                &init.capabilities,
+                &init.client_info.name,
+                &init.client_info.version,
+                &init.client_info.title,
+            );
+            let version = if VERSIONS.contains(&init.protocol_version.as_str()) {
+                init.protocol_version.as_str()
+            } else {
+                VERSIONS[VERSIONS.len() - 1]
+            };
+            json!({"protocolVersion":version, "capabilities":{"tools":{}}, "serverInfo":{"name":"hennery","version":env!("CARGO_PKG_VERSION")}})
+        }
+        "ping" if no_params => json!({}),
+        "tools/list" if no_params => json!({"tools":[]}),
+        "tools/call" => {
+            let Ok(call) = serde_json::from_value::<Call>(message.params.unwrap_or(Value::Null)) else {
+                return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
+            };
+            let _ = (call.name, call.arguments);
+            // D2 supplies typed handlers, accepted revisions and receipts.
+            let active = state.app.hub.is_ready(context.host_id())
+                && state
+                    .app
+                    .store
+                    .session_tool_context(&identity, revision, true)
+                    .ok()
+                    .flatten()
+                    .is_some();
+            let code = if active { "tool_unavailable" } else { "session_starting" };
+            let structured = json!({"code":code});
+            json!({"isError":true, "structuredContent":structured, "content":[{"type":"text","text":structured.to_string()}]})
+        }
+        "ping" | "tools/list" => return rpc_error(id, -32602, StatusCode::BAD_REQUEST),
+        _ => return rpc_error(id, -32601, StatusCode::OK),
+    };
+    json_response(json!({"jsonrpc":"2.0","id":id,"result":result}))
+}
+
+/// Policy routes use the existing operator Origin/cookie/step-up layers.
+pub fn policy_router(state: AppState) -> Router {
+    use axum::{middleware, routing::get};
+    let routes = Router::new().route(
+        "/api/hats/{id}/session-tools",
+        get(get_policy).patch(set_policy.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
+    );
+    hennery_kernel::auth::operator_only(routes, state.operator.clone()).with_state(state)
+}
+async fn get_policy(State(state): State<AppState>, axum::extract::Path(hat): axum::extract::Path<String>) -> Response {
+    let Some(store) = state.store.mcp().authenticator() else {
+        return no_scope();
+    };
+    policy_result(store.session_tools(&hat))
+}
+async fn set_policy(
+    State(state): State<AppState>,
+    axum::extract::Path(hat): axum::extract::Path<String>,
+    Json(request): Json<SetSessionTools>,
+) -> Response {
+    let Some(store) = state.store.mcp().authenticator() else {
+        return no_scope();
+    };
+    policy_result(store.set_session_tools(&hat, request.delegation_enabled))
+}
+fn policy_result(result: anyhow::Result<Option<HatSessionTools>>) -> Response {
+    match result {
+        Ok(Some(setting)) => Json(setting).into_response(),
+        Ok(None) => no_scope(),
+        Err(_) => error(StatusCode::INTERNAL_SERVER_ERROR, "internal", "internal error"),
+    }
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    use hennery_gateway::revocation::Revocations;
+    #[tokio::test]
+    async fn response_watches_cut_after_acceptance_and_release_on_drop() {
+        for grant_cut in [false, true] {
+            let tokens = Revocations::new();
+            let grants = Revocations::new();
+            let response = watched_response(
+                Json(json!({"accepted":true})).into_response(),
+                Some(tokens.watch("generation")),
+                Some(grants.watch("grant")),
+                None,
+            );
+            assert_eq!(tokens.watched(), 1);
+            assert_eq!(grants.watched(), 1);
+            if grant_cut {
+                grants.cut_all();
+            } else {
+                tokens.cut_all();
+            }
+            assert!(axum::body::to_bytes(response.into_body(), 1024).await.is_err());
+            assert_eq!(tokens.watched(), 0);
+            assert_eq!(grants.watched(), 0);
+        }
+        let tokens = Revocations::new();
+        let grants = Revocations::new();
+        let response = watched_response(
+            Json(json!({"accepted":true})).into_response(),
+            Some(tokens.watch("generation")),
+            Some(grants.watch("grant")),
+            None,
+        );
+        assert!(axum::body::to_bytes(response.into_body(), 1024).await.is_ok());
+        assert_eq!(tokens.watched(), 0);
+        assert_eq!(grants.watched(), 0);
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation.rs b/crates/hennery-sessions/src/delegation.rs
index aff42aea4001aea83e660dbfc6e8be8733fd8c68..3c0d433bf941b5eab3582e3a52e1a00f9e1cd2bc 100644
--- a/crates/hennery-sessions/src/delegation.rs
+++ b/crates/hennery-sessions/src/delegation.rs
@@ -174,3 +174,48 @@ impl Store {
             .optional()?)
     }
 }
+
+impl Store {
+    /// D1 allocation primitive for D2's validated launch path. The session,
+    /// family assignment, delivered revision and token share one commit.
+    #[allow(clippy::too_many_arguments)]
+    pub fn create_delegated_session(
+        &self,
+        parent: &SessionIdentity,
+        revision: i64,
+        child_id: &str,
+        agent: &str,
+        canonical_cwd: &str,
+        mcp: crate::store::McpContext,
+        created_event_id: i64,
+    ) -> Result<Option<crate::store::McpGiven>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let Some(caller) = self.session_tool_context_in(&tx, parent, revision, true)? else {
+            return Ok(None);
+        };
+        if !hennery_kernel::hats::is_canonical(canonical_cwd) {
+            return Ok(None);
+        }
+        let ts = crate::store::now();
+        tx.execute(
+            "INSERT INTO sessions(id, owner_id, host_id, hat_id, agent, cwd, lifecycle, created_at, last_event_at)
+            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'starting', ?7, ?7)",
+            params![
+                child_id,
+                self.owner_id(),
+                caller.host_id(),
+                caller.hat_id(),
+                agent,
+                canonical_cwd,
+                ts
+            ],
+        )?;
+        if !self.bind_family_in(&tx, parent, revision, child_id, created_event_id)? {
+            return Ok(None);
+        }
+        let (given, _new_child_cut) = self.deliver_in(&tx, child_id, caller.host_id(), caller.hat_id(), mcp, &ts)?;
+        tx.commit()?;
+        Ok(Some(given))
+    }
+}
diff --git a/crates/hennery-sessions/src/lib.rs b/crates/hennery-sessions/src/lib.rs
index 1677f23630dc0ac7e42f92bd15d57363debdd8b0..f7803ed9f7bf1ca228f8b55ab27ac442a2dcf970 100644
--- a/crates/hennery-sessions/src/lib.rs
+++ b/crates/hennery-sessions/src/lib.rs
@@ -2,6 +2,7 @@
 
 pub mod api;
 pub mod attachments;
+pub mod builtin;
 pub mod content;
 pub mod delegation;
 pub mod forget;
@@ -165,6 +166,7 @@ pub async fn serve_all(
 /// the client's address.
 pub fn router(state: AppState) -> Router {
     api::router(state.clone())
+        .merge(builtin::policy_router(state.clone()))
         .merge(hosts::router(state.clone()))
         .merge(hats::router(state.clone()))
         .merge(projects::router(state.clone()))
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index be689a8b8f655c142cd10f7fdf1a31408504361c..258b5dd5e8d0a87d900cfc5a813ca9e6a156f486 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -848,7 +848,7 @@ fn stamp(at: time::OffsetDateTime) -> String {
     )
 }
 
-fn now() -> String {
+pub(crate) fn now() -> String {
     stamp(time::OffsetDateTime::now_utc())
 }
 
@@ -2062,7 +2062,7 @@ impl Store {
     /// session (decision E10). The session is `starting` already, so it
     /// counts itself in the mixedness: a session outside the default hat
     /// always finds its host mixed.
-    fn deliver_in(
+    pub(crate) fn deliver_in(
         &self,
         tx: &Transaction<'_>,
         session_id: &str,
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 5ba51790c992f097b1f9ce96748513ded18bf69d..fde5c5100b83d67defe2811282c24c1f09b55be9 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -38,7 +38,7 @@ const SOURCES: &[(&str, &str, usize)] = &[
     (
         "hennery-sessions/src/delegation.rs",
         include_str!("../../hennery-sessions/src/delegation.rs"),
-        5,
+        6,
     ),
     (
         "hennery-gateway/src/identity.rs",
diff --git a/crates/hennery/src/main.rs b/crates/hennery/src/main.rs
index 5c47e5d04c7f8aa8f66c3a64fc81212b26e9e4f8..cdabe779ed9e0c10ab0f79d6d198555664f4d49c 100644
--- a/crates/hennery/src/main.rs
+++ b/crates/hennery/src/main.rs
@@ -580,6 +580,7 @@ async fn run_collector(args: CollectorArgs) -> Result<()> {
     let served = hennery_sessions::serve_all(
         listeners,
         hennery_sessions::router(state.clone())
+            .merge(hennery_sessions::builtin::router(state.clone(), gateway.clone()))
             .merge(hennery_gateway::api::router(gateway))
             .merge(hennery_gateway::proxy::router(proxy)),
         state.shutdown.clone(),
@@ -1325,9 +1326,9 @@ async fn start_gateway(
         egress.clone(),
         std::sync::Arc::new(state.push.clone()),
     )?;
-    state
-        .store
-        .set_session_mcp(std::sync::Arc::new(hennery_gateway::session::GatewayMcp::new(&gateway)));
+    state.store.set_session_mcp(std::sync::Arc::new(
+        hennery_gateway::session::GatewayMcp::for_collector(&gateway),
+    ));
     gateway.runtime.recover_plugins().await?;
     gateway.runtime.ensure_plugin_worker();
     gateway.runtime.announce_startup()?;
diff --git a/docs/specs/2026-09-26-kernel-design.md b/docs/specs/2026-09-26-kernel-design.md
index e6d8180362d3a5f3218d286fabe9809695beff3b..7c1fb6148328a832d577cdd800d82b9e1b9090c7 100644
--- a/docs/specs/2026-09-26-kernel-design.md
+++ b/docs/specs/2026-09-26-kernel-design.md
@@ -66,6 +66,7 @@ hosts(id TEXT PK, owner_id, name, public_key, default_hat_id, platform,
   last_doctor JSON, last_seen_at, created_at, revoked_at NULL)
 pairing_codes(code_hash PK, owner_id, created_at, expires_at, used_at NULL)
 settings(owner_id, key, value, PRIMARY KEY(owner_id, key))   -- public_url, default_hat_id
+hat_session_tools(owner_id, hat_id, delegation_enabled, revision, PRIMARY KEY(owner_id, hat_id))
 project_recents(owner_id, host_id, hat_id, path, last_used_at,
   PRIMARY KEY(host_id, hat_id, path))
 push_subscriptions(id TEXT PK, owner_id, endpoint UNIQUE, p256dh, auth, device_label,
@@ -260,6 +261,13 @@ version may accept signed assertions only (umbrella §7.1, §15).
 
 ### 3.3 Origin rules and CSRF
 
+The session-bound MCP delivery design owns the opt-in built-in endpoint.
+`GET/PATCH /api/hats/{id}/session-tools` use these browser rules; PATCH also
+requires step-up. Every flag transition advances the revision. Enabling takes
+effect on a fresh start/resume; disabling immediately denies built-in access
+and cuts its separate grant watches without revoking external mounts. D2/D3
+attach queued cancellation and operator attention to that same revision fence.
+
 State-changing endpoints accept only `application/json`. `Origin` is checked
 per route class:
 
@@ -270,7 +278,8 @@ per route class:
 | `GET /api/hosts/ws` | Unauthenticated until a valid `hello` proof (ACP core §3.5) | Exempt |
 | `POST /api/setup` | Setup token (§3.1) | Must equal the submitted `public_url`'s origin; a missing `Origin` is rejected |
 | `POST /api/hosts/enroll` | Pairing code | Exempt |
-| `/mcp/*` (gateway proxy) | Bearer token | Exempt |
+| `/mcp/{slug}` (external gateway proxy) | Bearer token | Exempt |
+| `/mcp/builtin/hennery` (collector-local session MCP) | Live session bearer and its delivered delegation revision | Missing Origin accepted; a present Origin must exactly equal `public_url` origin, including GET/DELETE; no cookies or CORS |
 | `GET /api/mcp/oauth/callback`, `GET /api/mcp/oauth/callback.js` | `state` plus the flow cookie (gateway §4.3); the script is static, no data | Exempt |
 | `/healthz`, `/readyz` | None (no data) | Exempt |
 | `GET /setup`, `GET /setup.js` (static, no data) | None | Exempt |
diff --git a/docs/specs/2026-09-26-mcp-gateway-design.md b/docs/specs/2026-09-26-mcp-gateway-design.md
index 46ffc659262078588e9fda3f0c107e173d0bd99d..e0253b9ca50ed12eeb082c224b4367f3660f13a2 100644
--- a/docs/specs/2026-09-26-mcp-gateway-design.md
+++ b/docs/specs/2026-09-26-mcp-gateway-design.md
@@ -217,9 +217,10 @@ ACP**, not through agent config files:
    `hennery_proto::rest::mcp_session_delivery`, the one mapping the host list
    reads too, plan 8e decision E8) and, inside the start's or resume's own
    transaction, calls `SessionMcp::servers_in(tx, session, mode)`. For a
-   mode that delivers, it mints the session token when a connection is
-   mounted there (a failed mint rolls the transition back; with none it mints
-   none; the session's previous token is revoked either way) and returns every connection of the session's hat
+   mode that delivers, it mints exactly one session token when a connection is
+   mounted there or the collector supplies the opted-in built-in descriptor
+   (a failed mint rolls the transition back; with neither it mints none;
+   the session's previous token is revoked either way) and returns every connection of the session's hat
    mounted on the session's host, as
    `{type: "http", name: "hennery-<slug>", url: "<public_url>/mcp/<slug>",
    headers: [{name: "Authorization", value: "Bearer <session token>"}]}`,
@@ -236,6 +237,21 @@ ACP**, not through agent config files:
 3. A mount change affects the **next** start or resume of a session on that
    host; a removed mount is refused at request time immediately.
 
+**Session-bound MCP delivery (D1).** Full collector wiring additionally
+supplies a typed optional descriptor named `hennery`, at the fixed path
+`/mcp/builtin/hennery`. It uses the same bearer as external mounts and the
+same isolation decision. Standalone gateway wiring supplies no built-in entry.
+The nullable `gw_session_tokens.delivered_delegation_revision` is stored in
+the mint transaction only when this descriptor is delivered; migrated and
+external-only tokens have NULL. Built-in admission checks the live generation,
+current enabled revision, session owner/host/hat and current isolation eligibility.
+A disable→enable cannot revive an old grant. The gateway's public identity seam
+imports no sessions and exports no plaintext bearer to handlers or plug-ins.
+The exact built-in route coexists with an external slug `builtin` at
+`/mcp/builtin`; other deeper paths remain refused. Local stdio entries use
+validated nonempty names prefixed with `hennery-`, so cannot collide with the
+reserved delivered name `hennery`.
+
 **Token in a header, not the URL.** *(G-2: the predecessor put the token in
 the URL path because one agent's CLI could not take a header from its config
 at the time. URLs end up in logs and agent transcripts. Both agents accept
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-gateway --test builtin --test session_mcp --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --lib --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_mcp --test owner_filter --locked
```

### Task 4, step 1: test(delegation): isolate authorization fences and pinned MCP shapes

Specify the behavior first; the missing feature must produce the recorded RED exit.

<!-- replay {"sha":"4e199cddff22f5151a6151a86914fc0a16ac0c1a","subject":"test(delegation): isolate authorization fences and pinned MCP shapes","checks":[["cargo test -p hennery-sessions --test delegation --locked",101],["cargo test -p hennery-proto --test delegation --locked",101],["cargo test -p hennery-testkit --test delegation_mcp --locked",101]]} -->
```diff
diff --git a/crates/hennery-gateway/tests/builtin.rs b/crates/hennery-gateway/tests/builtin.rs
index 8c4b4cf82d95540f1c57f7c71c8bbdec1deefd15..7ed8bed801b83016fbfed8d33c2e3ca319798bde 100644
--- a/crates/hennery-gateway/tests/builtin.rs
+++ b/crates/hennery-gateway/tests/builtin.rs
@@ -170,3 +170,76 @@ fn foreign_owner_session_and_grant_are_not_visible() {
     assert!(w.store.set_session_tools("foreign-hat", false).unwrap().is_none());
     assert!(w.store.set_session_tools("absent", true).unwrap().is_none());
 }
+
+#[test]
+fn a_disabled_flag_denies_even_if_a_corrupt_policy_keeps_the_delivered_revision() {
+    let w = world();
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    let token = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
+    w.raw()
+        .execute(
+            "UPDATE hat_session_tools SET delegation_enabled = 0 WHERE owner_id = ?1",
+            [w.store.owner_id()],
+        )
+        .unwrap();
+    assert!(w.store.delegation_granted(&identity).unwrap().is_none());
+}
+
+#[test]
+fn an_accepted_revision_cannot_borrow_a_freshly_delivered_generation() {
+    let w = world();
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    let _old = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    w.store.set_session_tools(&w.hat(), false).unwrap();
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    let fresh = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    let identity = w.store.authenticate_session(&fresh).unwrap().unwrap();
+    assert_eq!(w.store.delegation_granted(&identity).unwrap(), Some(3));
+    assert!(!w.store.recheck_delegation(&identity, 1).unwrap());
+}
+
+#[test]
+fn a_grant_watch_survives_the_authentication_facade_that_created_it() {
+    let w = world();
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    let token = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
+    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
+    let World {
+        store,
+        db,
+        proxy_store,
+        hosts,
+        dir,
+        key,
+        revocations,
+    } = w;
+    drop(store);
+    let replacement = hennery_gateway::store::GatewayStore::open(&db).unwrap();
+    replacement
+        .set_session_tools(&identity.principal.hat_id, false)
+        .unwrap();
+    assert!(watch.token().is_cancelled());
+    drop((proxy_store, hosts, dir, key, revocations));
+}
+
+#[test]
+fn failed_policy_commit_rolls_back_revision_and_does_not_cut_a_grant() {
+    let w = world();
+    w.store.set_session_tools(&w.hat(), true).unwrap();
+    let token = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
+    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
+    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
+    w.raw()
+        .execute_batch(
+            "CREATE TABLE commit_fault(owner_id TEXT REFERENCES owners(id) DEFERRABLE INITIALLY DEFERRED);
+        CREATE TRIGGER fail_policy_commit AFTER UPDATE ON hat_session_tools WHEN NEW.delegation_enabled = 0
+        BEGIN INSERT INTO commit_fault(owner_id) VALUES ('missing-owner'); END;",
+        )
+        .unwrap();
+    assert!(w.store.set_session_tools(&w.hat(), false).is_err());
+    assert!(!watch.token().is_cancelled());
+    assert_eq!(w.store.delegation_granted(&identity).unwrap(), Some(1));
+    assert_eq!(w.store.session_tools(&w.hat()).unwrap().unwrap().revision, 1);
+}
diff --git a/crates/hennery-proto/tests/delegation.rs b/crates/hennery-proto/tests/delegation.rs
new file mode 100644
index 0000000000000000000000000000000000000000..75ca758a19d838a54740480ce4791096dfd70777
--- /dev/null
+++ b/crates/hennery-proto/tests/delegation.rs
@@ -0,0 +1,55 @@
+use hennery_proto::delegation::SetSessionTools;
+#[test]
+fn policy_authorization_is_a_single_strict_object() {
+    for bad in [
+        "[true]",
+        "[]",
+        "true",
+        r#"{"Delegation_enabled":true}"#,
+        r#"{"delegation_enabled":true,"delegation_enabled":false}"#,
+        r#"{"delegation_enabled":true,"\u0064elegation_enabled":false}"#,
+        r#"{"delegation_enabled":true,"owner_id":"spoof"}"#,
+    ] {
+        assert!(serde_json::from_str::<SetSessionTools>(bad).is_err(), "{bad}");
+    }
+    assert!(
+        serde_json::from_str::<SetSessionTools>(r#"{ "\u0064elegation_enabled" : true }"#)
+            .unwrap()
+            .delegation_enabled
+    );
+}
+
+#[path = "../../hennery-gateway/tests/support/differential.rs"]
+mod differential;
+#[test]
+fn policy_bytes_have_the_same_authorization_meaning_under_each_decoder() {
+    use differential::{DECODERS, Node};
+    for (raw, enabled) in [
+        (r#"{"delegation_enabled":true}"#, true),
+        ("\r\n{ \"\\u0064elegation_enabled\" : false }\t", false),
+    ] {
+        let strict: SetSessionTools = serde_json::from_slice(raw.as_bytes()).unwrap();
+        assert_eq!(strict.delegation_enabled, enabled);
+        let tree: Node = serde_json::from_slice(raw.as_bytes()).unwrap();
+        let exact: serde_json::Value = serde_json::from_slice(raw.as_bytes()).unwrap();
+        assert_eq!(exact["delegation_enabled"], enabled);
+        for decoder in DECODERS {
+            assert!(
+                matches!(decoder.get(&tree, "delegation_enabled"), Some(Node::Bool)),
+                "{decoder:?}: {raw}"
+            );
+        }
+    }
+    for raw in [
+        r#"{"delegation_enabled":true,"Delegation_enabled":false}"#,
+        r#"{"delegation_enabled":false,"delegation_enabled":true}"#,
+        r#"{"delegation_enabled":true,"\u0064elegation_enabled":false}"#,
+        "\u{feff}{\"delegation_enabled\":true}",
+    ] {
+        assert!(
+            serde_json::from_slice::<SetSessionTools>(raw.as_bytes()).is_err(),
+            "{raw}"
+        );
+    }
+    assert!(serde_json::from_slice::<SetSessionTools>(&[0xff]).is_err());
+}
diff --git a/crates/hennery-sessions/tests/delegation.rs b/crates/hennery-sessions/tests/delegation.rs
index d97ec0e1ddd20dcaebfc813bfc332851331fda25..bb844ceff90429649f85991f1e5210a1f68f4a5e 100644
--- a/crates/hennery-sessions/tests/delegation.rs
+++ b/crates/hennery-sessions/tests/delegation.rs
@@ -36,6 +36,22 @@ impl World {
                 1,
             )
             .unwrap();
+        hosts
+            .record_hello(
+                "host",
+                "0",
+                &hennery_proto::frames::Capabilities(vec![hennery_proto::frames::Capability::McpServers]),
+                unix_now(),
+            )
+            .unwrap();
+        hosts
+            .record_mcp_isolation(
+                "host",
+                &hennery_proto::frames::AgentIsolation(
+                    [("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect(),
+                ),
+            )
+            .unwrap();
         let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
         let HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else {
             panic!()
@@ -148,6 +164,10 @@ fn family_storage_is_immutable_direct_scoped_and_terminally_detached() {
     assert!(!w.store.bind_family_in(&tx, &identity, 1, "foreign-hat", 0).unwrap());
     tx.commit().unwrap();
     assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_some());
+    assert!(
+        conn.execute("UPDATE session_families SET parent_id = 'sibling'", [])
+            .is_err()
+    );
     for id in ["sibling", "parent", "foreign-hat", "absent"] {
         assert!(w.store.direct_child(&identity, 1, id).unwrap().is_none());
     }
@@ -280,3 +300,145 @@ fn family_rollback_immutability_reassignment_delete_and_purge_cannot_restore_aut
         );
     }
 }
+
+#[test]
+fn each_live_caller_row_fence_is_rechecked_inside_the_transaction() {
+    let w = World::new();
+    let identity = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let _ = w.start("sibling", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut forged = identity.clone();
+    forged.principal.kind = hennery_gateway::scope::PrincipalKind::Session {
+        session_id: "sibling".into(),
+        host_id: "host".into(),
+    };
+    assert!(w.store.session_tool_context(&forged, 1, false).unwrap().is_none());
+    let conn = hennery_kernel::db::open(&w.db).unwrap();
+    for (change, restore) in [
+        ("lifecycle = 'failed'", "lifecycle = 'starting'"),
+        ("close_requested = 1", "close_requested = 0"),
+        ("presumed_parked = 1", "presumed_parked = 0"),
+        ("mcp_delivery_mode = 'fallback'", "mcp_delivery_mode = 'isolated'"),
+        ("cwd = '/p/../escape'", "cwd = '/project'"),
+    ] {
+        conn.execute(&format!("UPDATE sessions SET {change} WHERE id = 'parent'"), [])
+            .unwrap();
+        assert!(
+            w.store.session_tool_context(&identity, 1, false).unwrap().is_none(),
+            "{change}"
+        );
+        conn.execute(&format!("UPDATE sessions SET {restore} WHERE id = 'parent'"), [])
+            .unwrap();
+        assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_some());
+    }
+    conn.execute("UPDATE sessions SET hat_id = ?1 WHERE id = 'parent'", [&w.other])
+        .unwrap();
+    assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_none());
+    conn.execute("UPDATE sessions SET hat_id = ?1 WHERE id = 'parent'", [&w.hat])
+        .unwrap();
+    conn.execute(
+        "UPDATE gw_session_tokens SET delivered_delegation_revision = NULL WHERE session_id = 'parent'",
+        [],
+    )
+    .unwrap();
+    assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_none());
+}
+
+#[test]
+fn current_persisted_hello_capability_and_isolation_are_transactional_fences() {
+    let w = World::new();
+    let identity = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_some());
+    let conn = hennery_kernel::db::open(&w.db).unwrap();
+    for capabilities in ["[]", "invalid-json"] {
+        conn.execute("UPDATE hosts SET capabilities = ?1 WHERE id = 'host'", [capabilities])
+            .unwrap();
+        assert!(
+            w.store.session_tool_context(&identity, 1, false).unwrap().is_none(),
+            "{capabilities}"
+        );
+    }
+    conn.execute(
+        "UPDATE hosts SET capabilities = '[\"mcp_servers\"]' WHERE id = 'host'",
+        [],
+    )
+    .unwrap();
+    for isolation in ["{\"claude\":\"none\"}", "invalid-json", "{}"] {
+        conn.execute("UPDATE hosts SET mcp_isolation = ?1 WHERE id = 'host'", [isolation])
+            .unwrap();
+        assert!(
+            w.store.session_tool_context(&identity, 1, false).unwrap().is_none(),
+            "{isolation}"
+        );
+    }
+    conn.execute(
+        "UPDATE hosts SET mcp_isolation = '{\"claude\":\"claude_strict\"}' WHERE id = 'host'",
+        [],
+    )
+    .unwrap();
+    assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_some());
+}
+
+#[test]
+fn allocation_rejects_noncanonical_child_input_without_storing_a_row() {
+    let w = World::new();
+    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    let mode = McpContext {
+        capable: true,
+        isolation: McpIsolation::ClaudeStrict,
+        rules_name_other_hats: false,
+    };
+    assert!(
+        w.store
+            .create_delegated_session(&parent, 1, "child", "claude", "/p/../escape", mode, 0)
+            .unwrap()
+            .is_none()
+    );
+    let conn = hennery_kernel::db::open(&w.db).unwrap();
+    let count: i64 = conn
+        .query_row("SELECT count(*) FROM sessions WHERE id = 'child'", [], |r| r.get(0))
+        .unwrap();
+    assert_eq!(count, 0);
+}
+
+#[test]
+fn purging_an_old_hat_scrubs_detached_edges_when_both_endpoints_moved() {
+    let w = World::new();
+    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    w.start("child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = hennery_kernel::db::open(&w.db).unwrap();
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &parent, 1, "child", 0).unwrap());
+    tx.commit().unwrap();
+    conn.execute(
+        "UPDATE sessions SET hat_id = ?1 WHERE id IN ('parent','child')",
+        [&w.other],
+    )
+    .unwrap();
+    conn.execute("UPDATE hosts SET default_hat_id = ?1 WHERE id = 'host'", [&w.other])
+        .unwrap();
+    conn.execute(
+        "DELETE FROM gw_session_tokens WHERE owner_id = ?1 AND hat_id = ?2",
+        rusqlite::params![w.store.owner_id(), w.hat],
+    )
+    .unwrap();
+    conn.execute(
+        "UPDATE settings SET value = ?1 WHERE key = 'default_hat_id' AND owner_id = ?2",
+        rusqlite::params![w.other, w.store.owner_id()],
+    )
+    .unwrap();
+    let hosts = Hosts::open(&w.db).unwrap();
+    hosts.begin_purge(&w.hat, unix_now()).unwrap();
+    assert!(hosts.finish_purge(&w.hat).unwrap());
+    let count: i64 = conn
+        .query_row("SELECT count(*) FROM session_families", [], |r| r.get(0))
+        .unwrap();
+    assert_eq!(count, 0);
+    let count: i64 = conn
+        .query_row("SELECT count(*) FROM sessions WHERE hat_id = ?1", [&w.other], |r| {
+            r.get(0)
+        })
+        .unwrap();
+    assert_eq!(count, 2);
+}
diff --git a/crates/hennery-testkit/tests/delegation_mcp.rs b/crates/hennery-testkit/tests/delegation_mcp.rs
index df1e893f79aad4c291ef8eceba875723fe78948c..918425eedaa42c79ba2ca80941922f71bc805c6b 100644
--- a/crates/hennery-testkit/tests/delegation_mcp.rs
+++ b/crates/hennery-testkit/tests/delegation_mcp.rs
@@ -59,6 +59,15 @@ impl Harness {
                 .unwrap(),
             SetupOutcome::Done { .. }
         ));
+        hosts
+            .record_hello("host", "0", &Capabilities(vec![Capability::McpServers]), unix_now())
+            .unwrap();
+        hosts
+            .record_mcp_isolation(
+                "host",
+                &AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
+            )
+            .unwrap();
         let state = AppState::new(Store::open(&db).unwrap(), hosts, operator);
         let gateway_store = Arc::new(GatewayStore::open(&db).unwrap());
         let runtime = Arc::new(hennery_gateway::runtime::Runtime::new(
@@ -743,3 +752,164 @@ async fn current_host_capability_and_isolation_are_rechecked_after_reconnect() {
         );
     }
 }
+
+#[tokio::test]
+async fn every_protocol_error_verdict_is_positive_and_never_echoes_the_token() {
+    let h = Harness::new().await;
+    for (raw, code, status) in [
+        ("not-json", -32700, StatusCode::BAD_REQUEST),
+        (r#"[]"#, -32600, StatusCode::BAD_REQUEST),
+        (
+            r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"x","arguments":[]}}"#,
+            -32602,
+            StatusCode::BAD_REQUEST,
+        ),
+        (
+            r#"{"jsonrpc":"2.0","id":1,"method":"resources/list"}"#,
+            -32601,
+            StatusCode::OK,
+        ),
+    ] {
+        let response = h.post(raw.as_bytes().to_vec()).await;
+        assert_eq!(response.status(), status);
+        assert_eq!(response.json::<Value>().await.unwrap()["error"]["code"], code);
+    }
+    let answer = h
+        .rpc(json!({"jsonrpc":"2.0","id":h.token,"method":"resources/list"}))
+        .await;
+    assert!(!answer.to_string().contains(&h.token));
+}
+
+#[tokio::test]
+async fn capability_guard_is_independent_of_isolation_when_old_delivery_was_unisolated() {
+    let h = Harness::new().await;
+    let conn = hennery_kernel::db::open(&h._dir.path().join("hennery.db")).unwrap();
+    conn.execute(
+        "UPDATE sessions SET mcp_delivery_mode = 'unisolated' WHERE id = 'session'",
+        [],
+    )
+    .unwrap();
+    if let Some(id) = h.state.hub.routable_conn("host") {
+        h.state.hub.unregister("host", id);
+    }
+    let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
+    let reg = h
+        .state
+        .hub
+        .register("host", tx, Capabilities(vec![]), AgentIsolation::default())
+        .unwrap();
+    h.state.hub.mark_ready("host", reg.conn_id);
+    assert_eq!(
+        h.post(br#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#.to_vec())
+            .await
+            .status(),
+        StatusCode::NOT_FOUND
+    );
+}
+
+#[tokio::test]
+async fn pinned_claude_implementation_metadata_uses_standard_optional_fields() {
+    let h = Harness::new().await;
+    let result=h.rpc(json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"claude-code","title":"Claude Code","version":"fixture","description":"Pinned SDK metadata","websiteUrl":"https://example.com"}}})).await;
+    assert_eq!(result["result"]["protocolVersion"], "2025-11-25");
+}
+
+#[tokio::test]
+async fn origin_scope_and_stateless_method_refusals_precede_the_busy_limit() {
+    use std::time::Duration;
+    let h = Harness::with_limits(hennery_gateway::proxy::Limits::new(
+        0,
+        32,
+        Duration::from_secs(1),
+        Duration::from_secs(1),
+    ))
+    .await;
+    assert_eq!(
+        Client::new()
+            .post(&h.url)
+            .header("origin", "https://foreign.example")
+            .body("{}")
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::FORBIDDEN
+    );
+    assert_eq!(
+        Client::new().post(&h.url).body("{}").send().await.unwrap().status(),
+        StatusCode::NOT_FOUND
+    );
+    assert_eq!(
+        Client::new()
+            .get(&h.url)
+            .bearer_auth(&h.token)
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::METHOD_NOT_ALLOWED
+    );
+    assert_eq!(h.post(b"{}".to_vec()).await.status(), StatusCode::SERVICE_UNAVAILABLE);
+}
+
+#[tokio::test]
+async fn positional_json_arrays_cannot_become_messages_or_typed_parameter_objects() {
+    let h = Harness::new().await;
+    for raw in [
+        r#"["2.0",1,"ping",null]"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":["x",{}]}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":["2025-03-26",{},{"name":"x","version":"1"}]}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":["x","1"]}}"#,
+    ] {
+        assert_eq!(
+            h.post(raw.as_bytes().to_vec()).await.status(),
+            StatusCode::BAD_REQUEST,
+            "{raw}"
+        );
+    }
+}
+
+#[tokio::test]
+async fn policy_parse_refusals_do_not_echo_first_party_tokens() {
+    let h = Harness::new().await;
+    let phc = h
+        .state
+        .operator
+        .verify_password("correct horse battery")
+        .unwrap()
+        .unwrap();
+    let session = h
+        .state
+        .operator
+        .open_session("test", &phc, unix_now())
+        .unwrap()
+        .unwrap();
+    let endpoint = h
+        .url
+        .replace("/mcp/builtin/hennery", &format!("/api/hats/{}/session-tools", h.hat));
+    let raw = format!("{{\"{}\":true}}", h.token);
+    let response = Client::new()
+        .patch(endpoint)
+        .header("cookie", format!("hennery_session={session}"))
+        .header("origin", ORIGIN)
+        .header("content-type", "application/json")
+        .body(raw)
+        .send()
+        .await
+        .unwrap();
+    assert!(!response.status().is_success());
+    assert!(!response.text().await.unwrap().contains(&h.token));
+}
+#[tokio::test]
+async fn standard_client_icons_are_typed_data_and_positional_icons_are_refused() {
+    let h = Harness::new().await;
+    for theme in ["light", "dark"] {
+        let response=h.rpc(json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"fixture","version":"1","icons":[{"src":"https://example.com/icon.png","mimeType":"image/png","sizes":["16x16"],"theme":theme}]}}})).await;
+        assert!(response.get("result").is_some());
+    }
+    let bad = json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"fixture","version":"1","icons":[["https://example.com/icon.png"]]}}});
+    assert_eq!(
+        h.post(serde_json::to_vec(&bad).unwrap()).await.status(),
+        StatusCode::BAD_REQUEST
+    );
+}
```

Run (expected exit 101):

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --locked
```

Run (expected exit 101):

```bash
nix develop -c cargo test -p hennery-proto --test delegation --locked
```

Run (expected exit 101):

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_mcp --locked
```

### Task 4, step 2: feat(delegation): enforce transaction and protocol lifetime fences

Implement the preceding contract; all listed GREEN commands must succeed.

<!-- replay {"sha":"7a3c19a379ab68fd486b0051273401089a0e59ea","subject":"feat(delegation): enforce transaction and protocol lifetime fences","checks":[["cargo test -p hennery-gateway --test builtin --test session_mcp --locked",0],["cargo test -p hennery-sessions --test delegation --lib --locked",0],["cargo test -p hennery-proto --test delegation --locked",0],["cargo test -p hennery-testkit --test delegation_mcp --test owner_filter --locked",0]]} -->
```diff
diff --git a/crates/hennery-gateway/src/identity.rs b/crates/hennery-gateway/src/identity.rs
index b823e2df33ce72c180a4795153fb27fc1ea38cb6..0fb19a500e93f989de854bcf024bc5395ca12f36 100644
--- a/crates/hennery-gateway/src/identity.rs
+++ b/crates/hennery-gateway/src/identity.rs
@@ -76,20 +76,20 @@ pub(crate) fn builtin_in(tx: &Transaction<'_>, owner: &str, hat: &str) -> Result
         .map(|s| BuiltinDescriptor { revision: s.revision }))
 }
 
-type WatchRegistry = Vec<(Weak<hennery_kernel::coordination::Coordination>, Weak<Revocations>)>;
+type WatchRegistry = Vec<(Weak<hennery_kernel::coordination::Coordination>, Arc<Revocations>)>;
 pub(crate) fn grant_watches(coordination: Arc<hennery_kernel::coordination::Coordination>) -> Arc<Revocations> {
     static REGISTRY: OnceLock<Mutex<WatchRegistry>> = OnceLock::new();
     let mut registry = REGISTRY.get_or_init(Mutex::default).lock().expect("grant registry");
-    registry.retain(|(key, watches)| key.strong_count() > 0 && watches.strong_count() > 0);
+    registry.retain(|(key, _)| key.strong_count() > 0);
     if let Some(watches) = registry.iter().find_map(|(key, watches)| {
         key.upgrade()
             .filter(|key| Arc::ptr_eq(key, &coordination))
-            .and_then(|_| watches.upgrade())
+            .map(|_| watches.clone())
     }) {
         return watches;
     }
     let watches = Arc::new(Revocations::new());
-    registry.push((Arc::downgrade(&coordination), Arc::downgrade(&watches)));
+    registry.push((Arc::downgrade(&coordination), watches.clone()));
     watches
 }
 fn grant_key(owner: &str, hat: &str, revision: i64) -> String {
diff --git a/crates/hennery-proto/src/delegation.rs b/crates/hennery-proto/src/delegation.rs
index 27ea723bab64741b1f2ed44e34042868c647b6c1..ff35f2116ba049176f31fdfc1e376276c290aae6 100644
--- a/crates/hennery-proto/src/delegation.rs
+++ b/crates/hennery-proto/src/delegation.rs
@@ -12,12 +12,42 @@ pub struct HatSessionTools {
     pub revision: i64,
 }
 
-#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, JsonSchema, TS)]
 #[serde(deny_unknown_fields)]
 pub struct SetSessionTools {
     pub delegation_enabled: bool,
 }
 
+// Derived struct decoding can accept positional JSON arrays. Authorization
+// requests require the schema's object shape, with one exact, nonduplicate key.
+impl<'de> Deserialize<'de> for SetSessionTools {
+    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
+        struct Policy;
+        impl<'de> serde::de::Visitor<'de> for Policy {
+            type Value = SetSessionTools;
+            fn expecting(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+                f.write_str("a session-tools policy object")
+            }
+            fn visit_map<A: serde::de::MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
+                let mut enabled = None;
+                while let Some(key) = map.next_key::<String>()? {
+                    if key != "delegation_enabled" {
+                        return Err(serde::de::Error::unknown_field(&key, &["delegation_enabled"]));
+                    }
+                    if enabled.is_some() {
+                        return Err(serde::de::Error::duplicate_field("delegation_enabled"));
+                    }
+                    enabled = Some(map.next_value::<bool>()?);
+                }
+                Ok(SetSessionTools {
+                    delegation_enabled: enabled.ok_or_else(|| serde::de::Error::missing_field("delegation_enabled"))?,
+                })
+            }
+        }
+        deserializer.deserialize_map(Policy)
+    }
+}
+
 #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
 #[serde(deny_unknown_fields)]
 pub struct SessionFamily {
diff --git a/crates/hennery-sessions/src/builtin.rs b/crates/hennery-sessions/src/builtin.rs
index 0ca842c14f596726ada93770d8b22e68d3a31f16..e30eef2dff39a4e21b9290af3550f3d312724dda 100644
--- a/crates/hennery-sessions/src/builtin.rs
+++ b/crates/hennery-sessions/src/builtin.rs
@@ -78,16 +78,7 @@ async fn endpoint(
     body: Body,
 ) -> Response {
     let mut body = RequestBody::new(body, &headers);
-    let Ok(permit) = state.limits.requests.try_acquire("builtin") else {
-        return secure(
-            drain_rejected(
-                body,
-                error(StatusCode::SERVICE_UNAVAILABLE, "busy", "busy"),
-                &state.limits,
-            )
-            .await,
-        );
-    };
+    let mut permit = None;
     let origin = state.app.operator.public_url();
     let mut token_watch = None;
     let mut grant_watch = None;
@@ -111,7 +102,7 @@ async fn endpoint(
                     tokio::select! { biased;
                         () = cancelled.cancelled() => no_scope(),
                         () = grant_cancelled.cancelled() => no_scope(),
-                        response = handle(&state, identity, method, &headers, &mut body) => response,
+                        response = handle(&state, identity, method, &headers, &mut body, &mut permit) => response,
                     }
                 } else {
                     no_scope()
@@ -136,7 +127,7 @@ async fn endpoint(
         token_watch = None;
         grant_watch = None;
     }
-    secure(watched_response(answer, token_watch, grant_watch, Some(permit)))
+    secure(watched_response(answer, token_watch, grant_watch, permit))
 }
 fn watched_response(
     answer: Response,
@@ -214,6 +205,30 @@ struct ClientInfo {
     version: String,
     #[serde(default)]
     title: Option<String>,
+    #[serde(default, rename = "description")]
+    _description: Option<String>,
+    #[serde(default, rename = "websiteUrl")]
+    _website_url: Option<String>,
+    #[serde(default, rename = "icons")]
+    _icons: Option<Vec<ClientIcon>>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct ClientIcon {
+    #[serde(rename = "src")]
+    _src: String,
+    #[serde(default, rename = "mimeType")]
+    _mime_type: Option<String>,
+    #[serde(default, rename = "sizes")]
+    _sizes: Option<Vec<String>>,
+    #[serde(default, rename = "theme")]
+    _theme: Option<IconTheme>,
+}
+#[derive(Deserialize)]
+#[serde(rename_all = "lowercase")]
+enum IconTheme {
+    Light,
+    Dark,
 }
 #[derive(Deserialize)]
 #[serde(deny_unknown_fields)]
@@ -228,6 +243,7 @@ async fn handle(
     method: Method,
     headers: &HeaderMap,
     body: &mut RequestBody,
+    permit: &mut Option<hennery_kernel::egress::Permit>,
 ) -> Response {
     let Some(revision) = identity.delivered_delegation_revision() else {
         return no_scope();
@@ -273,6 +289,10 @@ async fn handle(
     {
         return rpc_error(Value::Null, -32600, StatusCode::NOT_ACCEPTABLE);
     }
+    let Ok(acquired) = state.limits.requests.try_acquire("builtin") else {
+        return error(StatusCode::SERVICE_UNAVAILABLE, "busy", "busy");
+    };
+    *permit = Some(acquired);
     let read = async {
         let mut bytes = Vec::new();
         while let Some(chunk) = body.next().await {
@@ -292,7 +312,10 @@ async fn handle(
     let Some(value) = hennery_gateway::decode_json_once(&bytes) else {
         return rpc_error(Value::Null, -32700, StatusCode::BAD_REQUEST);
     };
-    let has_id = value.as_object().is_some_and(|v| v.contains_key("id"));
+    let Some(object) = value.as_object() else {
+        return rpc_error(Value::Null, -32600, StatusCode::BAD_REQUEST);
+    };
+    let has_id = object.contains_key("id");
     let Ok(message) = serde_json::from_value::<Message>(value) else {
         return rpc_error(Value::Null, -32600, StatusCode::BAD_REQUEST);
     };
@@ -317,7 +340,16 @@ async fn handle(
     }
     let result = match message.method.as_str() {
         "initialize" => {
-            let Ok(init) = serde_json::from_value::<Initialize>(message.params.unwrap_or(Value::Null)) else {
+            let params = message.params.unwrap_or(Value::Null);
+            if !params.is_object() || !params.get("clientInfo").is_some_and(Value::is_object) {
+                return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
+            }
+            if params["clientInfo"].get("icons").is_some_and(|icons| {
+                !icons.is_null() && !icons.as_array().is_some_and(|items| items.iter().all(Value::is_object))
+            }) {
+                return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
+            }
+            let Ok(init) = serde_json::from_value::<Initialize>(params) else {
                 return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
             };
             let _ = (
@@ -336,7 +368,11 @@ async fn handle(
         "ping" if no_params => json!({}),
         "tools/list" if no_params => json!({"tools":[]}),
         "tools/call" => {
-            let Ok(call) = serde_json::from_value::<Call>(message.params.unwrap_or(Value::Null)) else {
+            let params = message.params.unwrap_or(Value::Null);
+            if !params.is_object() {
+                return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
+            }
+            let Ok(call) = serde_json::from_value::<Call>(params) else {
                 return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
             };
             let _ = (call.name, call.arguments);
@@ -350,7 +386,12 @@ async fn handle(
                     .flatten()
                     .is_some();
             let code = if active { "tool_unavailable" } else { "session_starting" };
-            let structured = json!({"code":code});
+            let structured = serde_json::to_value(hennery_proto::rest::ApiError {
+                code: code.into(),
+                message: "session control tools are unavailable".into(),
+                session_id: None,
+            })
+            .expect("a typed error serializes");
             json!({"isError":true, "structuredContent":structured, "content":[{"type":"text","text":structured.to_string()}]})
         }
         "ping" | "tools/list" => return rpc_error(id, -32602, StatusCode::BAD_REQUEST),
@@ -377,8 +418,12 @@ async fn get_policy(State(state): State<AppState>, axum::extract::Path(hat): axu
 async fn set_policy(
     State(state): State<AppState>,
     axum::extract::Path(hat): axum::extract::Path<String>,
-    Json(request): Json<SetSessionTools>,
+    request: Result<Json<SetSessionTools>, axum::extract::rejection::JsonRejection>,
 ) -> Response {
+    let Json(request) = match request {
+        Ok(request) => request,
+        Err(rejected) => return error(rejected.status(), "invalid", "invalid request"),
+    };
     let Some(store) = state.store.mcp().authenticator() else {
         return no_scope();
     };
diff --git a/crates/hennery-sessions/src/delegation.rs b/crates/hennery-sessions/src/delegation.rs
index 3c0d433bf941b5eab3582e3a52e1a00f9e1cd2bc..9631a32c7610ec4e70e2a451e198daa26a3b2d29 100644
--- a/crates/hennery-sessions/src/delegation.rs
+++ b/crates/hennery-sessions/src/delegation.rs
@@ -7,6 +7,14 @@ use hennery_gateway::scope::PrincipalKind;
 use hennery_proto::delegation::SessionFamily;
 use rusqlite::{OptionalExtension, Transaction, params};
 
+struct CallerRow {
+    cwd: String,
+    agent: String,
+    capabilities: String,
+    isolation: Option<String>,
+    mode: String,
+}
+
 #[derive(Debug, Clone)]
 pub struct SessionToolContext {
     owner_id: String,
@@ -67,16 +75,28 @@ impl Store {
             return Ok(None);
         }
         let PrincipalKind::Session { session_id, host_id } = &identity.principal.kind;
-        let row: Option<(String, String)> = tx.query_row(
-            "SELECT s.cwd, s.agent FROM sessions s JOIN hosts h ON h.id = s.host_id AND h.owner_id = ?1
+        let row: Option<CallerRow> = tx.query_row(
+            "SELECT s.cwd, s.agent, h.capabilities, h.mcp_isolation, s.mcp_delivery_mode
+             FROM sessions s JOIN hosts h ON h.id = s.host_id AND h.owner_id = ?1
              WHERE s.owner_id = ?1 AND s.id = ?2 AND s.host_id = ?3 AND s.hat_id = ?4
                AND s.close_requested = 0 AND s.lifecycle IN ('starting', 'active') AND s.presumed_parked = 0
                AND (?5 = 0 OR s.lifecycle = 'active') AND h.revoked_at IS NULL
                AND (s.mcp_delivery_mode = 'isolated' OR (s.mcp_delivery_mode = 'unisolated' AND s.hat_id = h.default_hat_id))
                AND NOT EXISTS (SELECT 1 FROM purged_hats p WHERE p.owner_id = ?1 AND p.hat_id = s.hat_id)",
              params![self.owner_id(), session_id, host_id, identity.principal.hat_id, mutation],
-             |r| Ok((r.get(0)?, r.get(1)?))).optional()?;
-        let Some((cwd, agent)) = row else { return Ok(None) };
+             |r| Ok(CallerRow { cwd: r.get(0)?, agent: r.get(1)?, capabilities: r.get(2)?, isolation: r.get(3)?, mode: r.get(4)? })).optional()?;
+        let Some(row) = row else { return Ok(None) };
+        let capable = serde_json::from_str::<hennery_proto::frames::Capabilities>(&row.capabilities)
+            .is_ok_and(|c| c.has(hennery_proto::frames::Capability::McpServers));
+        let isolation = row
+            .isolation
+            .as_deref()
+            .and_then(|value| serde_json::from_str::<hennery_proto::frames::AgentIsolation>(value).ok())
+            .unwrap_or_default();
+        if !capable || (row.mode == "isolated" && !isolation.isolates(&row.agent)) {
+            return Ok(None);
+        }
+        let (cwd, agent) = (row.cwd, row.agent);
         if !hennery_kernel::hats::is_canonical(&cwd) {
             return Ok(None);
         }
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index 258b5dd5e8d0a87d900cfc5a813ca9e6a156f486..b2c5fa958622c4441c8d594a25d41472a5e64dcf 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -340,7 +340,7 @@ const MIGRATIONS: &[&str] = &[
         FOREIGN KEY (child_id, owner_id) REFERENCES sessions(id, owner_id),
         FOREIGN KEY (parent_id, owner_id) REFERENCES sessions(id, owner_id),
         FOREIGN KEY (root_id, owner_id) REFERENCES sessions(id, owner_id),
-        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id));
+        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id) ON DELETE CASCADE);
     CREATE INDEX families_by_parent ON session_families(owner_id, parent_id);
     CREATE TRIGGER family_assignment_immutable BEFORE UPDATE ON session_families
     WHEN NEW.owner_id <> OLD.owner_id OR NEW.child_id <> OLD.child_id
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-gateway --test builtin --test session_mcp --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --lib --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-proto --test delegation --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_mcp --test owner_filter --locked
```

### Task 5, step 1: test(delegation): verify gateway migration 5 on reopen

Update the exact migration invariant or synthetic rollback fixture found RED by the full workspace run; preserve the reopen and owner-backfill assertions.

<!-- replay {"sha":"17f6b8566f66e978eadee610e34370bf6f9c2826","subject":"test(delegation): verify gateway migration 5 on reopen","checks":[["cargo test -p hennery-gateway --test store --locked",0]]} -->
```diff
diff --git a/crates/hennery-gateway/tests/store.rs b/crates/hennery-gateway/tests/store.rs
index 967f885dc9b1cb93991ba9b6d65a862dab6f6da6..9eac8f7dd44a356bc54b0681618b526cc6e4af83 100644
--- a/crates/hennery-gateway/tests/store.rs
+++ b/crates/hennery-gateway/tests/store.rs
@@ -639,8 +639,18 @@ fn the_store_and_the_kernel_agree_on_the_owner_whichever_opens_first() {
             |r| r.get(0),
         )
         .unwrap();
-    // Connections, session tokens, stdio servers, then OAuth clients.
-    assert_eq!(version, 4);
+    // Connections, session tokens, stdio servers, OAuth clients, then D1's
+    // generation-bound delivered delegation revision.
+    assert_eq!(version, 5);
+    let connection = rusqlite::Connection::open(&last).unwrap();
+    let columns: Vec<String> = connection
+        .prepare("PRAGMA table_info(gw_session_tokens)")
+        .unwrap()
+        .query_map([], |row| row.get(1))
+        .unwrap()
+        .map(Result::unwrap)
+        .collect();
+    assert!(columns.iter().any(|column| column == "delivered_delegation_revision"));
 }
 
 /// Plan 8a decision 19 (lane L11): a connection's `Debug` shows only its
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-gateway --test store --locked
```

### Task 5, step 2: test(delegation): restore the legacy owner migration fixture

Update the exact migration invariant or synthetic rollback fixture found RED by the full workspace run; preserve the reopen and owner-backfill assertions.

<!-- replay {"sha":"d4d204cd9c533c3735765ade4f9162b4db6ca00b","subject":"test(delegation): restore the legacy owner migration fixture","checks":[["cargo test -p hennery-sessions --test owner --locked",0]]} -->
```diff
diff --git a/crates/hennery-sessions/tests/owner.rs b/crates/hennery-sessions/tests/owner.rs
index a258cbe99468b4985971cf2635f5951725f66699..9801ea0296b22805f26314dd2e0586ceef5d2c10 100644
--- a/crates/hennery-sessions/tests/owner.rs
+++ b/crates/hennery-sessions/tests/owner.rs
@@ -124,6 +124,11 @@ fn the_owner_id_migration_gives_every_row_the_owner() {
         // included; the events index (version 12) is made again if missing.
         conn.execute_batch(
             "
+            DROP TRIGGER family_scope_end;
+            DROP TRIGGER family_scope;
+            DROP TRIGGER family_assignment_immutable;
+            DROP TABLE session_families;
+            DROP INDEX sessions_by_owner_identity;
             DROP TRIGGER events_of_a_tombstone;
             DROP TRIGGER turns_of_a_tombstone;
             DROP TRIGGER pending_of_a_tombstone;
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-sessions --test owner --locked
```

### Task 5, step 3: fix(delegation): preserve canonical JSON and schema invariants

Update the exact migration invariant or synthetic rollback fixture found RED by the full workspace run; preserve the reopen and owner-backfill assertions.

<!-- replay {"sha":"7f2e20480ad51e7f1acfe1e2f366679e4485b608","subject":"fix(delegation): preserve canonical JSON and schema invariants","checks":[["cargo test -p hennery-sessions --test store --locked",0],["cargo test -p hennery-testkit --test auth --test delegation_mcp --locked",0]]} -->
```diff
diff --git a/crates/hennery-sessions/src/builtin.rs b/crates/hennery-sessions/src/builtin.rs
index e30eef2dff39a4e21b9290af3550f3d312724dda..c6bee1ec51bda1c8526d048da9c061d0c088ec0d 100644
--- a/crates/hennery-sessions/src/builtin.rs
+++ b/crates/hennery-sessions/src/builtin.rs
@@ -18,6 +18,7 @@ use hennery_gateway::{
     proxy::{Limits, MAX_REQUEST_BODY, RequestBody, bearer, drain_rejected},
     revocation::Watch,
 };
+use hennery_kernel::json::ApiJson;
 use hennery_proto::{
     delegation::{HatSessionTools, SetSessionTools},
     frames::McpIsolation,
@@ -418,12 +419,8 @@ async fn get_policy(State(state): State<AppState>, axum::extract::Path(hat): axu
 async fn set_policy(
     State(state): State<AppState>,
     axum::extract::Path(hat): axum::extract::Path<String>,
-    request: Result<Json<SetSessionTools>, axum::extract::rejection::JsonRejection>,
+    ApiJson(request): ApiJson<SetSessionTools>,
 ) -> Response {
-    let Json(request) = match request {
-        Ok(request) => request,
-        Err(rejected) => return error(rejected.status(), "invalid", "invalid request"),
-    };
     let Some(store) = state.store.mcp().authenticator() else {
         return no_scope();
     };
diff --git a/crates/hennery-sessions/tests/store.rs b/crates/hennery-sessions/tests/store.rs
index 5487b6968e45fa5b4a07f610be9f8207fd5b4535..c7854a90ca6ed42ca7dca6a59bebdb6fba71ad3f 100644
--- a/crates/hennery-sessions/tests/store.rs
+++ b/crates/hennery-sessions/tests/store.rs
@@ -376,7 +376,12 @@ fn the_teardown_migration_upgrades_skeleton_turns() {
     {
         let conn = rusqlite::Connection::open(&db).unwrap();
         conn.execute_batch(
-            "DROP TRIGGER events_of_a_tombstone;
+            "DROP TRIGGER family_scope_end;
+             DROP TRIGGER family_scope;
+             DROP TRIGGER family_assignment_immutable;
+             DROP TABLE session_families;
+             DROP INDEX sessions_by_owner_identity;
+             DROP TRIGGER events_of_a_tombstone;
              DROP TRIGGER turns_of_a_tombstone;
              DROP TRIGGER pending_of_a_tombstone;
              DROP TRIGGER answers_of_a_tombstone;
@@ -2460,7 +2465,12 @@ fn the_hat_migration_gives_each_session_its_hosts_default_hat() {
     // migration (version 11) and plan 9a's (version 13) undone too.
     let conn = rusqlite::Connection::open(&db).unwrap();
     conn.execute_batch(
-        "DROP TRIGGER events_of_a_tombstone;
+        "DROP TRIGGER family_scope_end;
+         DROP TRIGGER family_scope;
+         DROP TRIGGER family_assignment_immutable;
+         DROP TABLE session_families;
+         DROP INDEX sessions_by_owner_identity;
+         DROP TRIGGER events_of_a_tombstone;
          DROP TRIGGER turns_of_a_tombstone;
          DROP TRIGGER pending_of_a_tombstone;
          DROP TRIGGER answers_of_a_tombstone;
@@ -2733,6 +2743,7 @@ fn rows_of(conn: &Connection, id: &str, events: &[i64], turns: &[String], hashes
             .unwrap();
         let filter = match table.as_str() {
             "sessions" => format!("id = '{id}'"),
+            "session_families" => format!("child_id = '{id}' OR parent_id = '{id}' OR root_id = '{id}'"),
             "event_attachments" => format!("event_id IN ({})", list(events.iter().map(i64::to_string).collect())),
             "turn_attachments" => format!("turn_id IN ({})", quoted(turns)),
             "attachments" => format!("sha256 IN ({})", quoted(hashes)),
@@ -2785,8 +2796,6 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
     prompt_in(&store, "s1", "t2", vec![image(&b)]);
     prompt_in(&store, "s2", "t9", vec![image(&kept)]);
     store.ingest("s2", 5, &turn_started("t9")).unwrap();
-    store.close_now("s1").unwrap();
-
     let conn = Connection::open(&db).unwrap();
     let ids = |sql: &str, id: &str| -> Vec<String> {
         conn.prepare(sql)
@@ -2805,6 +2814,19 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
         .collect();
     let turns = ids("SELECT turn_id FROM turns WHERE session_id = ?1", "s1");
     let hashes = vec![sha(&a), sha(&b)];
+    // The deletion walk must exercise every new session reference, including
+    // an independently surviving child whose parent/root is being deleted.
+    conn.execute_batch(
+        "INSERT INTO hats(id, owner_id, name, colour, created_at)
+             SELECT 'hat-1', owner_id, 'Family fixture', '#123456', 0 FROM sessions WHERE id = 's1';
+         INSERT INTO sessions(id, host_id, agent, cwd, hat_id, lifecycle, created_at, last_event_at, owner_id)
+             SELECT 'family-child', host_id, agent, cwd, hat_id, 'starting', created_at, last_event_at, owner_id
+             FROM sessions WHERE id = 's1';
+         INSERT INTO session_families(owner_id, child_id, parent_id, root_id, hat_id, created_event_id)
+             SELECT owner_id, 'family-child', 's1', 's1', hat_id, 0 FROM sessions WHERE id = 's1';",
+    )
+    .unwrap();
+    store.close_now("s1").unwrap();
     let before = rows_of(&conn, "s1", &events, &turns, &hashes);
     let walked: Vec<&str> = before.iter().map(|(t, _)| t.as_str()).collect();
     for table in [
@@ -2814,6 +2836,7 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
         "events",
         "pending",
         "session_catalog",
+        "session_families",
         "sessions",
         "turn_attachments",
         "turns",
@@ -2856,6 +2879,13 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
         assert_eq!(*n, left, "{table}: {after:?}");
     }
     assert_eq!(event_kinds(&conn, "s1"), ["session_deleted"]);
+    assert_eq!(
+        conn.query_row("SELECT lifecycle FROM sessions WHERE id = 'family-child'", [], |row| {
+            row.get::<_, String>(0)
+        })
+        .unwrap(),
+        "starting"
+    );
     assert!(!has_file(&db, &sha(&a)) && !has_file(&db, &sha(&b)));
     let (s2_events, s2_turns, s2_rows) = s2_before;
     assert_eq!(rows_of(&conn, "s2", &s2_events, &s2_turns, &[sha(&kept)]), s2_rows);
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-sessions --test store --locked
```

Run (expected exit 0):

```bash
nix develop -c cargo test -p hennery-testkit --test auth --test delegation_mcp --locked
```

## Replay harness

Save the following as a scratch .cjs file and run from a fresh lane-named replay worktree at the exact base, inside the dev shell, passing this plan's absolute path. The harness rejects empty extraction, runs each RED/GREEN command, retains logs and compares complete tracked trees.

```javascript
const fs=require('fs');const cp=require('child_process');const path=require('path');
const text=fs.readFileSync(process.argv[2],'utf8');
const blocks=[...text.matchAll(/^<!-- replay (.+) -->\n```diff\n([\s\S]*?)^```/gm)].map(m=>({meta:JSON.parse(m[1]),patch:m[2]}));
if(!blocks.length)throw Error('zero extracted blocks');
const base=text.match(/Implementation base: \*\*([a-f0-9]{40})\*\*/)[1];
const expected=text.match(/Embedded implementation head: \*\*([a-f0-9]{40})\*\*/)[1];
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
if(!process.cwd().includes('/deleg-d1-replay-')||git('rev-parse','HEAD')!==base)throw Error('not fresh named replay at base');
const ledger='.superpowers/sdd/deleg-d1-replay';fs.mkdirSync(ledger,{recursive:true});
const results=[];console.log(JSON.stringify({base,expected,extractedBlocks:blocks.length}));
for(let i=0;i<blocks.length;i++) {
 const {meta,patch}=blocks[i];if(!patch.includes('diff --git '))throw Error('empty patch');
 cp.execFileSync('git',['apply','--index','-'],{input:patch,encoding:'utf8'});
 git('-c','commit.gpgsign=false','commit','-m',`chore(replay): apply ${i+1} ${meta.subject}`);
 for(let j=0;j<meta.checks.length;j++) {
  const [command,wanted]=meta.checks[j];const log=path.join(ledger,`step-${i+1}-${j+1}.log`);
  const fd=fs.openSync(log,'w');const result=cp.spawnSync('bash',['-c',command],{stdio:['ignore',fd,fd],env:process.env});fs.closeSync(fd);
  fs.appendFileSync(log,`\nEXIT=${result.status}\n`);
  const record={step:i+1,command,expected:wanted,actual:result.status,log};results.push(record);console.log(JSON.stringify(record));
  fs.writeFileSync(path.join(ledger,'checks.json'),JSON.stringify(results,null,2));
  if(result.status!==wanted)throw Error('unexpected check exit');
 }
}
git('diff','--exit-code',expected,'HEAD');
const result={base,expected,extractedBlocks:blocks.length,appliedBlocks:blocks.length,treeMatch:true,replayHead:git('rev-parse','HEAD'),checks:results.length};
fs.writeFileSync(path.join(ledger,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));

```

## After this plan

Parent review returned APPROVE on the original range; the one Minor cycle-fixture correction is recorded below. Parent owns Linux/macOS CI before merge. D2 implements tools, canonical workspace root validation, typed handler argument limits, receipts, live eligibility/config evidence and one-generation/permission defaults. D3 consumes the accepted-revision fence for transactional cancellation, provenance production, delivery and operator attention. D4 adds status/family UI and cross-runtime live acceptance. C2 continues to own startup PluginContext delivery; no feed/startup worker is implicitly enabled here.

## Execution record

**Result:** the original implementation passed full macOS checks at **f6c1f1b94e3e562977e6145519a67d18182e9494**. Codex gpt-6-astra reviewed **6f686151..fd2e47ee** on the maintainer's behalf and returned **APPROVE**, with no Critical or Important findings and one Minor fixture correction, implemented below. Production code is unchanged by the correction. The parent reports draft PR **#146**; this child has not queried its checks, reviewDecision, mergeStateStatus or review threads. Linux CI remains parent-owned.

### Test-first and compatibility evidence

The 11 embedded commits reproduce seven expected RED command exits (101) followed by fifteen GREEN command exits (0). Initial missing-feature tests fail to compile against the preceding task; refinement regressions fail runtime assertions before the fix. Live Claude metadata, transactional current hello, facade/watch lifetime, positional struct arrays, mandatory-refusal ordering and detached-hat cleanup each produced a measured RED before the final implementation. Tests preserve positive authorized paths, so blanket denial is a failure.

The first workspace run exposed the gateway migration count changing from 4 to 5. Its reopen test now checks both exact version 5 and the new nullable delivered revision column. The next run exposed an older synthetic owner migration fixture dropping columns still referenced by migration 17; it now undoes this new migration before reconstructing its earlier schema. A subsequent complete diagnostic run with `cargo test --workspace --locked --no-fail-fast` exited 101 with exactly two failing targets: sessions/store (three legacy rollback/schema-walk assertions) and testkit/auth (one canonical JSON extractor audit). The final fix preserves the original assertions, seeds a real family edge in the deletion walk, verifies its child survives, and uses the existing `ApiJson` instead of excluding the new endpoint from the audit. Targeted store **104**, auth **13**, and D1 HTTP **18** tests pass; the final complete checks below include them.

| Approved D1 obligation | Executed coverage |
|---|---|
| Disabled by default; collector only; built-in without mounts; exactly one shared token; external-only token cannot upgrade; old delivered revision cannot revive | gateway/builtin (9), existing session_mcp (13), descriptor/token rollback and generation tests |
| Independent grant cut, rollback cuts nothing, policy commit failure, accepted revision cannot borrow a fresh generation, watch outlives facade | gateway/builtin plus sessions response-watch unit test; HTTP disable/revoke body race |
| Two owners/hats, immutable current caller/principal/generation/canonical cwd; attached versus starting; close intent/presumed park/terminal rows; current hello/default-hat eligibility | sessions/delegation (8), gateway foreign-owner case, HTTP current-capability/reconnect/default-hat cases; owner SQL audit (3) |
| Same-owner/hat/host immutable direct family; no self/cycle/adoption; no sibling/ancestor authority; rollback, close/reassign/delete/purge; child allocation commits all identities together | sessions/delegation; family fixtures exercise both endpoints, independent children and old-hat cleanup; complete sessions store/owner suites |
| Starting initialize/list; exact route and external builtin slug; header-only authority; Origin/cookie/standalone/invalid credentials; bounded bodies/deadlines/drain/permits; stateless versions | testkit/delegation_mcp (18), actual pinned adapters below |
| Duplicate/nested/escaped keys, BOM/UTF-8/batches/positional arrays, typed policy and parameters; identical retained-tree dispatch verdict | proto/delegation (2), HTTP differential decoder tests and positive escaped inputs; shared gateway parser/proxy regressions |
| No bearer reflection in errors, response ids or generated identity; no CORS/SSE/session id; browser policy auth/Origin/step-up | HTTP positive verdict and redaction tests, policy echo test, auth audit; opaque redacted token-generation type |
| C1 identity/provenance contract reused | existing C1 InputOrigin/Provenance/PluginContext unchanged; no alternate enum/payload or upstream session-identity header |

Scope-changing tool cursors, operation keys, workspace-root symlink escape, runtime/config selection, durable commands/notices, permission answers and provenance production are D2/D3 obligations, not executable handlers in D1. Empty discovery and typed unavailable/starting call errors are intentional. Q1/Q2 do not affect this transport/identity implementation.

### Maintainer review amendment: isolated recursive-cycle test

The reviewer found that the old reverse-edge insert was independently invalid because its proposed child was active and its proposed parent was starting. The test now swaps those lifecycles inside a transaction: proposed child **starting**, proposed parent/root **active**, with the same valid owner, hat, host and clear close intents. It asserts cycle rejection, then rolls back the fixture change before the existing reassign/delete/purge assertions. The fix was committed as a fixup and non-interactively autosquashed into the owning `test(delegation): specify strict collector MCP transport` commit (original 4aa78c44, now f4b29957), using `git -c commit.gpgsign=false rebase -i --autosquash` with `GIT_SEQUENCE_EDITOR=true`. Staged bytes were inspected before committing.

Executed probe in fresh **deleg-d1-cycle-probe-1**, never in the implementation tree: baseline `cargo test -p hennery-sessions --test delegation --locked` exited **0**, **8 passed**. Remove only the trigger's recursive `OR EXISTS (WITH RECURSIVE ancestors...)` guard: the insert succeeds and its assertion fails, **exit 101, 7 passed / 1 failed**. The original source was restored in a finally block. Evidence: `.superpowers/sdd/deleg-d1/cycle-review/{result.json,baseline.log,without-cycle-guard.log}`; the copied tree is retained and its target cleaned.

Post-amendment verification: the same test file **8 passed, exit 0** in the implementation tree; `cargo fmt --all --check`, `cargo clippy --workspace --all-targets --locked -- -D warnings`, and `cargo clippy -p hennery --locked -- -D warnings` all **exit 0**. The full six-check, web, load and live discovery evidence below precedes this test-only correction; it was not relabelled as rerun. All embedded implementation patches and metadata were refreshed after autosquash, and a new exact replay is recorded below.

### Final full checks

All commands below ran through plain `nix develop -c` with scratch HOME/XDG/tool configuration and this worktree's own Cargo target. Logs: `.superpowers/sdd/deleg-d1/checks/{1..6}.log` and `results.json`.

| Command | Exit | Test result |
|---|---|---|
| `cargo fmt --all --check` | 0 | completed |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | 0 | completed |
| `cargo clippy -p hennery --locked -- -D warnings` | 0 | completed |
| `cargo test --workspace --locked` | 0 | 2183 passed; 0 failed; 0 ignored |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 | completed |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | 0 | completed |

Affected web verification also passed: `pnpm --dir web install --frozen-lockfile`, `pnpm --dir web typecheck`, `pnpm --dir web test` (**93 files / 1618 tests**), and `pnpm --dir web build`, all exit 0 inside the dev shell. No e2e file changed; D4 owns the UI. No lockfile or Nix dependency hash changed.

### Exact fresh replay

Final fresh directory after the review amendment: `deleg-d1-replay-5`, branch `replay/deleg-d1-5`, started at **6f68615183de3e1badc12a3d650eca27b8901261**. Extracted and applied **11 nonempty diff blocks**; **22** expected-status commands completed. Full tracked-tree comparison `git diff --exit-code 7f2e20480ad51e7f1acfe1e2f366679e4485b608 HEAD` exited **0**; replay head **f582dc9cb7d81b7c664b7c1779c72c44ea8d4e76**. This replay includes the corrected cycle fixture in its autosquashed owning test commit. This plan and the docs index line are committed after the compared implementation head.

Earlier fresh replays are retained as historical evidence: replay-1 (6 blocks/11 commands, tree 6b9a4ce6), replay-2 (8/18, tree 87c03244), replay-3 (9/19, tree 3267ca85), replay-4 (11/22, tree f6c1f1b9, replay head be1bac22d1a4f2968a333342bdd3a06adc19711e). All matched their embedded heads. They do not substitute for the final replay. Their idle targets were cleaned; directories and scratch evidence remain for parent cleanup. Every replay used its own target and copied registry/home; no shared target freshness.

### Executed guard, cut and verdict probes

**69 named mutation cases detected**, each by a real failing test/assertion and exit 101, not a compiler error. Initial matrix: 53 cases, 48 detected and 5 missed. Strengthened isolated positive fixtures then detected all five plus three additional cases (8/8); another 11-case matrix detected ten and exposed one missing icon source anchor, which was repaired and detected separately. The canonical-policy-extractor mutation detects both the static admission rule and runtime token echo. The maintainer-review amendment adds the independently isolated recursive-cycle guard probe (baseline 8 passed; mutant 7 passed / 1 failed), bringing the total to 69. These historical misses are retained in scratch rather than relabelled green. The table records the latest executed result for each case; each mutation was restored before normal checks.

Manifests/logs: `probes/`, `probes-final/`, `probes-extra/` (including `icon-result.json`), `probe-api-json.{json,log}`, `cycle-review/` copy-probe evidence, consolidated `probes-latest.json`, under `.superpowers/sdd/deleg-d1/`. The first three scripts take one source mutation at a time, run the listed target, restore the exact original in a finally block and require both exit 101 and a FAILED test result. No check was weakened to make a mutation detectable.

| Mutation | Test target | Latest exit |
|---|---|---|
| descriptor-opt-in | gateway/builtin | 101 (assertion detected) |
| collector-only-descriptor | gateway/builtin | 101 (assertion detected) |
| builtin-only-mint | gateway/builtin | 101 (assertion detected) |
| atomic-delivered-revision | gateway/builtin | 101 (assertion detected) |
| owner-identity | sessions/delegation | 101 (assertion detected) |
| principal-identity | sessions/delegation | 101 (assertion detected) |
| generation-delivered-revision | sessions/delegation | 101 (assertion detected) |
| current-revision | gateway/builtin | 101 (assertion detected) |
| current-enabled | gateway/builtin | 101 (assertion detected) |
| revision-advances | gateway/builtin | 101 (assertion detected) |
| grant-cut | gateway/builtin | 101 (assertion detected) |
| caller-lifecycle | sessions/delegation | 101 (assertion detected) |
| caller-close-intent | sessions/delegation | 101 (assertion detected) |
| caller-presumed-park | sessions/delegation | 101 (assertion detected) |
| caller-starting-mutation | sessions/delegation | 101 (assertion detected) |
| caller-hat | sessions/delegation | 101 (assertion detected) |
| caller-cwd | sessions/delegation | 101 (assertion detected) |
| caller-default-hat | sessions/delegation | 101 (assertion detected) |
| family-reassign-detach | sessions/delegation | 101 (assertion detected) |
| family-close-detach | sessions/delegation | 101 (assertion detected) |
| family-delete-scrub | sessions/delegation | 101 (assertion detected) |
| family-immutable-parent | sessions/delegation | 101 (assertion detected) |
| atomic-family-binding | sessions/delegation | 101 (assertion detected) |
| strict-duplicate-keys | testkit/delegation_mcp | 101 (assertion detected) |
| present-origin | testkit/delegation_mcp | 101 (assertion detected) |
| positive-missing-origin | testkit/delegation_mcp | 101 (assertion detected) |
| authority-query | testkit/delegation_mcp | 101 (assertion detected) |
| response-token-watch | sessions/response_watches | 101 (assertion detected) |
| response-grant-watch | sessions/response_watches | 101 (assertion detected) |
| current-hello-capability | testkit/delegation_mcp | 101 (assertion detected) |
| current-hello-isolation | testkit/delegation_mcp | 101 (assertion detected) |
| http-method | testkit/delegation_mcp | 101 (assertion detected) |
| version-header | testkit/delegation_mcp | 101 (assertion detected) |
| media-type | testkit/delegation_mcp | 101 (assertion detected) |
| accept-json | testkit/delegation_mcp | 101 (assertion detected) |
| body-cap | testkit/delegation_mcp | 101 (assertion detected) |
| body-deadline | testkit/delegation_mcp | 101 (assertion detected) |
| request-permit | testkit/delegation_mcp | 101 (assertion detected) |
| notification-has-no-id | testkit/delegation_mcp | 101 (assertion detected) |
| notification-202 | testkit/delegation_mcp | 101 (assertion detected) |
| parse-error-verdict | testkit/delegation_mcp | 101 (assertion detected) |
| invalid-request-verdict | testkit/delegation_mcp | 101 (assertion detected) |
| invalid-params-verdict | testkit/delegation_mcp | 101 (assertion detected) |
| unknown-method-verdict | testkit/delegation_mcp | 101 (assertion detected) |
| starting-call-verdict | testkit/delegation_mcp | 101 (assertion detected) |
| unavailable-call-verdict | testkit/delegation_mcp | 101 (assertion detected) |
| tool-error-bit | testkit/delegation_mcp | 101 (assertion detected) |
| matching-text-result | testkit/delegation_mcp | 101 (assertion detected) |
| assembled-redaction | testkit/delegation_mcp | 101 (assertion detected) |
| no-store | testkit/delegation_mcp | 101 (assertion detected) |
| nosniff | testkit/delegation_mcp | 101 (assertion detected) |
| owner-query-audit | testkit/owner_filter | 101 (assertion detected) |
| owner-family-audit | testkit/owner_filter | 101 (assertion detected) |
| persisted-capability | sessions/delegation | 101 (assertion detected) |
| persisted-isolation | sessions/delegation | 101 (assertion detected) |
| allocation-child-cwd | sessions/delegation | 101 (assertion detected) |
| namespace-lifetime | gateway/builtin | 101 (assertion detected) |
| grant-cut-after-commit | gateway/builtin | 101 (assertion detected) |
| old-hat-edge-cleanup | sessions/delegation | 101 (assertion detected) |
| policy-object-shape | proto/delegation | 101 (assertion detected) |
| rpc-object-shape | testkit/delegation_mcp | 101 (assertion detected) |
| init-object-shapes | testkit/delegation_mcp | 101 (assertion detected) |
| call-object-shape | testkit/delegation_mcp | 101 (assertion detected) |
| client-icons-object-shape | testkit/delegation_mcp | 101 (assertion detected) |
| mandatory-refusals-before-busy | testkit/delegation_mcp | 101 (assertion detected) |
| policy-error-redaction | testkit/delegation_mcp | 101 (assertion detected) |
| standard-client-metadata | testkit/delegation_mcp | 101 (assertion detected) |
| canonical-policy-json-extractor | testkit/auth + delegation_mcp | 101 (assertion detected) |
| family-recursive-cycle | sessions/delegation, separate copy | 101 (assertion detected) |

### Load and real adapter discovery

Load: `race_disable_or_revoke_cuts_body_read_and_keeps_external_identity` ran as **4 simultaneous executable copies × 3 rounds**, **12/12 exit 0**. Each invocation runs the exact test once; all three rounds retain logs and statuses in `load/results.json`. The test separately covers hat-disable and token-revoke cancellation while a body is incomplete and verifies the external identity survives a grant-only cut.

Actual discovery used locally pinned `@agentclientprotocol/claude-agent-acp@0.81.0` and `@agentclientprotocol/codex-acp@1.13.0` with native Codex **0.155.1**, installed only beneath scratch. A temporary harness used the production built-in router and ran real ACP initialize/session-new; both adapters completed both requests and made these bearer-authenticated MCP calls:

| Adapter | initialize | notifications/initialized | tools/list | Other observed calls |
|---|---|---|---|---|
| Claude | 200 | 202 | 200, empty D1 tool list | optional server/discover 400 (-32600); GET 405 |
| Codex | 200 | 202 | 200, empty D1 tool list | none |

Final smoke command `cargo test -p hennery-testkit --test d1_live_probe live_pinned_adapter_discovery_probe --locked -- --nocapture` exited **0**, **1 passed**, after the HTTP refinements (`/tmp/deleg-d1-live-final.log`). The temporary test was then moved out of the tests directory into `.superpowers/sdd/deleg-d1/live-probe-preserved.rs`; scrubbed field/status evidence is retained in `live-evidence.json`. Initial attempts failed probe setup (crate cwd, native executable selection and absent scratch CODEX_HOME); those logs remain historical failures. Real Claude ClientInfo description/websiteUrl exposed a protocol compatibility omission; its regression was seen RED before standard typed optional fields were added.

This proves local adapter discovery/startup only. No model prompt, provider authentication or inference was exercised; Codex received an explicit fixture key to allow local thread/MCP initialization, no operator credentials. Each spawned process used scratch HOME/XDG/runtime home, cleared SSL_CERT_FILE and SSL_CERT_DIR, was prewarmed via first_exec, and its own process group was killed/reaped. The four parent/child runtime combinations remain D4 acceptance. No fleet service was restarted.

### Parent gates and next plans

The maintainer-delegated Codex gpt-6-astra review of **6f686151..fd2e47ee** returned APPROVE, with no Critical or Important findings. Its review covered: delivered revision/token/watch atomicity and lifetime; one-tree parser/proxy sharing and refusal ordering; current persisted hello versus hub eligibility; immutable family/close/reassignment/purge scope and atomic child allocation; append-only migrations 13/5/17 and owner SQL preparation. The one Minor cycle-fixture correction is implemented and independently probed above. Parent owns PR #146 status and Linux/macOS CI; check all checks, reviewDecision, mergeStateStatus and unresolved review threads, bots included. Approval above is the parent-reported review result, not a claim about PR checks or unresolved threads.

D2/D3 must use the private verified context plus exact accepted revision inside each mutation/dispatch transaction, not merely trust initial HTTP admission. D1 starts no scheduler/feed/startup worker and exports no raw bearer or session-attestation header to plug-ins. Q1 ordinary elicitation and Q2 one generation remain defaults for those later plans.

Generated with Claude AI — please review before distribution.
