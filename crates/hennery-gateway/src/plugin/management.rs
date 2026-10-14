//! Optional management state. All methods take core before control, and all
//! machine access goes through the same active registration checks.
use super::*;
use hennery_proto::plugin_management::{PluginRegistration, RotatePluginResponse};
use std::{collections::HashMap, time::{Duration, Instant}};

const MANAGEMENT_MIGRATIONS: &[&str] = &["
CREATE TABLE plugin_rotations (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, connection_id TEXT NOT NULL,
    epoch TEXT NOT NULL, handover_id TEXT NOT NULL, token_hash TEXT NOT NULL,
    PRIMARY KEY(owner_id, connection_id));
"];
#[derive(Default)]
pub(crate) struct State {
    budgets: Mutex<HashMap<String, Budget>>,
}
struct Budget { since: Instant, requests: usize, bytes: usize }

fn migrate(conn: &mut Connection) -> Result<()> {
    db::migrate_component(conn, "plugin_management", MANAGEMENT_MIGRATIONS)
}

impl Control {
    /// Owner-visible metadata only; an unconfigured GET creates nothing.
    pub fn registrations_in(&self, _: &Transaction<'_>) -> Result<Vec<PluginRegistration>> {
        Ok(self.with(false, |conn| {
            migrate(conn)?;
            let mut stmt=conn.prepare("SELECT p.connection_id,p.hat_id,p.epoch,p.state,p.activity,p.startup,
                EXISTS(SELECT 1 FROM plugin_rotations r WHERE r.owner_id = ?1 AND r.connection_id = p.connection_id AND r.epoch = p.epoch),
                (SELECT result FROM plugin_receipts r WHERE r.owner_id = ?1 AND r.request_id = p.request_id)
                FROM plugin_registrations p WHERE p.owner_id = ?1 ORDER BY p.connection_id")?;
            let rows=stmt.query_map([&self.owner],|r| {
                let receipt:Option<String>=r.get(7)?;
                Ok(PluginRegistration{connection_id:r.get(0)?,hat_id:r.get(1)?,namespace_epoch:r.get(2)?,state:r.get(3)?,activity:r.get(4)?,startup:r.get(5)?,rotation_pending:r.get(6)?,
                deletion:receipt.map(|s|if s=="confirmed" {hennery_proto::plugin::ForgetStatus::Confirmed}else{hennery_proto::plugin::ForgetStatus::Unconfirmed})})
            })?;
            Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
        })?.unwrap_or_default())
    }
    /// Explicit same-epoch handover: both hashes authenticate until finish.
    pub fn prepare_rotation_in(&self, core:&Transaction<'_>, id:&str, now:i64) -> Result<RotatePluginResponse> {
        let _=now;
        self.with(false, |conn| {
            migrate(conn)?;
            let row=Self::row(conn,&self.owner,id)?.context("registration unavailable")?;
            ensure!(row.state=="active" && epoch_anchor(core,&self.owner,id)?.as_deref()==Some(&row.grant.epoch)
                && row.fingerprint==fingerprint(core,&self.owner,id)? && scope_live(core,&self.owner,id,&row.grant.hat_id)?,"registration unavailable");
            let token=format!("{ACTIVITY_PREFIX}{}",hex::encode(random_bytes::<32>()));
            let handover_id=hex::encode(random_bytes::<32>());
            conn.execute("INSERT INTO plugin_rotations(owner_id,hat_id,connection_id,epoch,handover_id,token_hash) VALUES(?1,?2,?3,?4,?5,?6)",
                params![self.owner,row.grant.hat_id,id,row.grant.epoch,handover_id,sha256_hex(token.as_bytes())])?;
            Ok(RotatePluginResponse{namespace_epoch:row.grant.epoch,handover_id,token:Some(token)})
        })?.context("registration unavailable")
    }
    pub fn finish_rotation_in(&self, core:&Transaction<'_>, id:&str, handover:&str) -> Result<RotatePluginResponse> {
        self.with(false, |conn| {
            migrate(conn)?;
            let row=Self::row(conn,&self.owner,id)?.context("registration unavailable")?;
            ensure!(row.state=="active" && epoch_anchor(core,&self.owner,id)?.as_deref()==Some(&row.grant.epoch)
                && row.fingerprint==fingerprint(core,&self.owner,id)? && scope_live(core,&self.owner,id,&row.grant.hat_id)?,"registration unavailable");
            let tx=conn.transaction()?;
            let hash:String=tx.query_row("SELECT token_hash FROM plugin_rotations WHERE owner_id = ?1 AND connection_id = ?2 AND epoch = ?3 AND handover_id = ?4",
                params![self.owner,id,row.grant.epoch,handover],|r|r.get(0))?;
            tx.execute("UPDATE plugin_registrations SET token_hash = ?3 WHERE owner_id = ?1 AND connection_id = ?2 AND state = 'active'",params![self.owner,id,hash])?;
            tx.execute("DELETE FROM plugin_rotations WHERE owner_id = ?1 AND connection_id = ?2",params![self.owner,id])?;
            tx.commit()?;
            // No request authenticated with the retired token survives handover.
            self.work.cut(Cut(vec![id.into()]));
            Ok(RotatePluginResponse{namespace_epoch:row.grant.epoch,handover_id:handover.into(),token:None})
        })?.context("registration unavailable")
    }
    pub(crate) fn rotation_connection_in(&self, conn:&mut Connection, token:&str) -> Result<Option<String>> {
        migrate(conn)?;
        Ok(conn.query_row("SELECT r.connection_id FROM plugin_rotations r JOIN plugin_registrations p
            ON p.owner_id = ?1 AND p.connection_id = r.connection_id AND p.epoch = r.epoch
            WHERE r.owner_id = ?1 AND r.token_hash = ?2 AND p.state = 'active'",
            params![self.owner,sha256_hex(token.as_bytes())],|r|r.get(0)).optional()?)
    }
    /// Called in the terminal disposition transaction, before secrets vanish.
    pub(crate) fn erase_rotation_in(&self, conn:&Connection, id:&str) -> Result<()> {
        let exists:bool=conn.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'plugin_rotations')",[],|r|r.get(0))?;
        if exists {conn.execute("DELETE FROM plugin_rotations WHERE owner_id = ?1 AND connection_id = ?2",params![self.owner,id])?;}
        Ok(())
    }
    /// 60 requests and 8 MiB per registration/epoch per minute. No key is
    /// inserted before authentication, and expired entries are bounded.
    pub fn charge(&self, grant:&Grant, bytes:usize) -> Result<()> {
        let mut budgets=self.management.budgets.lock().expect("plug-in budgets");
        let now=Instant::now();
        budgets.retain(|_, b| now.duration_since(b.since)<Duration::from_secs(60));
        let key=format!("{}:{}",grant.connection_id,grant.epoch);
        let budget=budgets.entry(key).or_insert(Budget{since:now,requests:0,bytes:0});
        ensure!(budget.requests<60 && budget.bytes.saturating_add(bytes)<=8*1024*1024,"plug-in budget exceeded");
        budget.requests+=1; budget.bytes=budget.bytes.saturating_add(bytes);
        Ok(())
    }
    pub fn revoke_registration_in(&self, core:&Transaction<'_>, id:&str, now:i64) -> Result<()> {
        let exists=self.with(false,|conn|Ok(Self::row(conn,&self.owner,id)?.is_some()))?.unwrap_or(false);
        ensure!(exists,"registration unavailable");
        let fingerprint=fingerprint(core,&self.owner,id)?;
        self.authorize_mutation_in(core,id,&fingerprint,"revoke",&fingerprint,now)
    }
}

impl crate::store::GatewayStore {
    pub fn plugin_registrations(&self)->Result<Vec<PluginRegistration>> {
        let mut conn=self.conn(); let tx=conn.transaction()?;
        let result=self.plugins().registrations_in(&tx)?; tx.commit()?; Ok(result)
    }
    pub fn register_plugin(&self, input:RegistrationInput<'_>, key:&MasterKey, expected:&str, now:i64)->Result<IssuedGrant> {
        let mut conn=self.conn(); let tx=conn.transaction()?;
        ensure!(fingerprint(&tx,self.owner_id(),input.connection_id)?==expected,"connection changed during discovery");
        let result=self.plugins().register_in(&tx,input,key,now)?; tx.commit()?; Ok(result)
    }
    pub fn plugin_fingerprint(&self,id:&str)->Result<String>{fingerprint(&self.conn(),self.owner_id(),id)}
    pub fn revoke_plugin(&self,id:&str,now:i64)->Result<()> {
        let mut conn=self.conn(); let tx=conn.transaction()?;
        self.plugins().revoke_registration_in(&tx,id,now)?;
        tx.commit()?; self.plugins().complete_in(&conn,id)
    }
    pub fn rotate_plugin(&self,id:&str,finish:Option<&str>)->Result<RotatePluginResponse>{
        let mut conn=self.conn(); let tx=conn.transaction()?;
        let result=match finish{Some(handover)=>self.plugins().finish_rotation_in(&tx,id,handover)?,None=>self.plugins().prepare_rotation_in(&tx,id,hennery_kernel::secret::unix_now())?};
        tx.commit()?; Ok(result)
    }
    pub fn plugin_lease(&self,token:&str)->Result<hennery_proto::plugin_management::PluginLease>{
        let mut conn=self.conn();let tx=conn.transaction()?;
        let grant=self.plugins().authenticate_in(&tx,token,hennery_kernel::secret::unix_now())?.context("plug-in access denied")?;
        self.plugins().charge(&grant,128)?;
        let lease=hennery_proto::plugin_management::PluginLease{namespace_epoch:grant.epoch,lease_until:hennery_kernel::secret::unix_now().saturating_add(60)};
        tx.commit()?;Ok(lease)
    }
    pub fn watch_plugin(&self, token:&str)->Result<Watch>{
        let mut conn=self.conn();let tx=conn.transaction()?;
        let grant=self.plugins().authenticate_in(&tx,token,hennery_kernel::secret::unix_now())?.context("plug-in access denied")?;
        let watch=self.plugins().work.watch(&grant.connection_id);
        tx.commit()?;Ok(watch)
    }
}

impl crate::runtime::Runtime {
    /// An unconfigured collector has no task. Weak ownership prevents an idle
    /// recovery worker retaining Runtime, its master key or its data directory.
    pub fn ensure_plugin_worker(self:&Arc<Self>){
        if !matches!(self.store.plugins().configured(),Ok(true))
            || self.plugin_worker_started.swap(true,std::sync::atomic::Ordering::AcqRel){return;}
        let weak=Arc::downgrade(self);
        tokio::spawn(async move{
            loop{
                let Some(runtime)=weak.upgrade()else{return};
                let control=runtime.store.plugins();
                // Reconcile frozen hats first; never send an early remote wait.
                let _=runtime.recover_plugins().await;
                drop(runtime);
                tokio::select!{ _=control.pending.notified()=>{}, _=tokio::time::sleep(Duration::from_secs(1))=>{} }
                if weak.strong_count()==0{return;}
            }
        });
    }
}
