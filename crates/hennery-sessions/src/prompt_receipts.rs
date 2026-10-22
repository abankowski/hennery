//! A client submit key names one durable prompt admission, including after delivery.
use crate::{content::Checked, store::Store};
use anyhow::{Result, bail, ensure};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone)]
pub struct PromptRequestKey {
    pub key: String,
    pub digest: String,
}

impl PromptRequestKey {
    pub fn new(key: &str, prompt: &Checked) -> Result<Self> {
        ensure!(
            !key.is_empty() && key.len() <= 128 && key.bytes().all(|b| b.is_ascii() && !b.is_ascii_control()),
            "invalid_request_key"
        );
        Ok(Self {
            key: key.into(),
            digest: hex::encode(Sha256::digest(serde_json::to_vec(&prompt.stored)?)),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PromptReceipt {
    Turn { turn_id: String },
    Queued { queue_id: String },
}

#[derive(Debug, PartialEq, Eq)]
pub enum PromptAdmission {
    Opened,
    MustQueue,
    Existing(PromptReceipt),
}

pub(crate) fn lookup_in(
    conn: &Connection,
    owner: &str,
    session: &str,
    key: Option<&PromptRequestKey>,
) -> Result<Option<PromptReceipt>> {
    let Some(key) = key else { return Ok(None) };
    let stored: Option<(String, String, String)> = conn.query_row(
        "SELECT digest,receipt_kind,receipt_id FROM prompt_receipts WHERE owner_id = ?1 AND session_id=?2 AND request_key=?3",
        params![owner, session, key.key],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).optional()?;
    let Some((digest, kind, id)) = stored else {
        return Ok(None);
    };
    ensure!(digest == key.digest, "request_key_conflict");
    Ok(Some(match kind.as_str() {
        "turn" => PromptReceipt::Turn { turn_id: id },
        "queue" => PromptReceipt::Queued { queue_id: id },
        _ => bail!("invalid prompt receipt kind"),
    }))
}

pub(crate) fn record_in(
    tx: &Transaction<'_>,
    owner: &str,
    session: &str,
    key: Option<&PromptRequestKey>,
    receipt: &PromptReceipt,
) -> Result<()> {
    let Some(key) = key else { return Ok(()) };
    let (kind, id) = match receipt {
        PromptReceipt::Turn { turn_id } => ("turn", turn_id),
        PromptReceipt::Queued { queue_id } => ("queue", queue_id),
    };
    tx.execute(
        "INSERT INTO prompt_receipts(owner_id,session_id,request_key,digest,receipt_kind,receipt_id) VALUES(?1,?2,?3,?4,?5,?6)",
        params![owner, session, key.key, key.digest, kind, id],
    )?;
    Ok(())
}

impl Store {
    /// A retry is resolved before lifecycle checks, but each admission must
    /// also call lookup_in under its writer transaction before allocating.
    pub fn prompt_receipt(&self, session: &str, key: &PromptRequestKey) -> Result<Option<PromptReceipt>> {
        lookup_in(&self.conn(), self.owner_id(), session, Some(key))
    }
}
