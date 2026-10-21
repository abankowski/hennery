//! Owner-scoped operator limits, read under the transaction that consumes them.
use crate::store::Store;
use anyhow::Result;
use hennery_kernel::{
    operator::{Authenticated, STEP_UP_SECS},
    secret::unix_now,
};
use hennery_proto::delegation_status::{OperatorDelegationLimits, PatchDelegationLimits};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};

#[derive(Debug, PartialEq)]
pub enum LimitsChange {
    Done(OperatorDelegationLimits),
    Invalid,
    StepUpRequired,
}

impl Store {
    pub fn delegation_limits(&self) -> Result<OperatorDelegationLimits> {
        self.delegation_limits_in(&self.conn())
    }

    pub(crate) fn delegation_limits_in(&self, conn: &Connection) -> Result<OperatorDelegationLimits> {
        Ok(conn
            .query_row(
                "SELECT children, starts_per_operator_epoch, automatic_wakes_per_operator_epoch
             FROM delegation_limits WHERE owner_id = ?1",
                [self.owner_id()],
                |r| {
                    Ok(OperatorDelegationLimits {
                        children: r.get(0)?,
                        starts_per_operator_epoch: r.get(1)?,
                        automatic_wakes_per_operator_epoch: r.get(2)?,
                    })
                },
            )
            .optional()?
            .unwrap_or_default())
    }

    pub fn patch_delegation_limits(&self, patch: &PatchDelegationLimits, auth: &Authenticated) -> Result<LimitsChange> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let now = unix_now();
        let authorized = auth.owner_id == self.owner_id()
            && tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM auth_sessions WHERE id_hash = ?1 AND owner_id = ?2
             AND expires_at > ?3 AND last_step_up_at > ?4)",
                params![auth.session_id, self.owner_id(), now, now - STEP_UP_SECS],
                |r| r.get::<_, bool>(0),
            )?;
        if !authorized {
            return Ok(LimitsChange::StepUpRequired);
        }
        if [
            patch.children,
            patch.starts_per_operator_epoch,
            patch.automatic_wakes_per_operator_epoch,
        ]
        .into_iter()
        .flatten()
        .any(|v| !(1..=64).contains(&v))
        {
            return Ok(LimitsChange::Invalid);
        }
        let old = self.delegation_limits_in(&tx)?;
        let limits = OperatorDelegationLimits {
            children: patch.children.unwrap_or(old.children),
            starts_per_operator_epoch: patch.starts_per_operator_epoch.unwrap_or(old.starts_per_operator_epoch),
            automatic_wakes_per_operator_epoch: patch
                .automatic_wakes_per_operator_epoch
                .unwrap_or(old.automatic_wakes_per_operator_epoch),
        };
        tx.execute(
            "INSERT INTO delegation_limits(owner_id, children, starts_per_operator_epoch, automatic_wakes_per_operator_epoch)
             VALUES (?1,?2,?3,?4) ON CONFLICT(owner_id) DO UPDATE SET children=excluded.children,
             starts_per_operator_epoch=excluded.starts_per_operator_epoch,
             automatic_wakes_per_operator_epoch=excluded.automatic_wakes_per_operator_epoch
             WHERE delegation_limits.owner_id = ?1",
            params![self.owner_id(), limits.children, limits.starts_per_operator_epoch, limits.automatic_wakes_per_operator_epoch],
        )?;
        tx.commit()?;
        Ok(LimitsChange::Done(limits))
    }
}
