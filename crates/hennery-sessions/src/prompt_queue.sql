-- Sessions migration 29: shared durable operator/delegation prompt FIFO.
-- Attempt ownership survives an operation's reassociation to a retry.
ALTER TABLE turns ADD COLUMN operator_queued INTEGER NOT NULL DEFAULT 0;
ALTER TABLE turns ADD COLUMN queue_retry_released INTEGER NOT NULL DEFAULT 0;
CREATE TABLE prompt_receipts (
    owner_id TEXT NOT NULL, session_id TEXT NOT NULL, request_key TEXT NOT NULL,
    digest TEXT NOT NULL, receipt_kind TEXT NOT NULL CHECK(receipt_kind IN ('turn','queue')),
    receipt_id TEXT NOT NULL,
    PRIMARY KEY(owner_id,session_id,request_key),
    FOREIGN KEY(session_id,owner_id) REFERENCES sessions(id,owner_id));
ALTER TABLE session_dispatch_queue ADD COLUMN origin TEXT NOT NULL DEFAULT 'parent' CHECK(origin IN ('parent','operator'));
ALTER TABLE session_dispatch_queue ADD COLUMN image_bytes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN prompt_queue_dirty INTEGER NOT NULL DEFAULT 0;
-- 0: runnable; 1: explicit operator hold; 2: Send releases after park acknowledgement.
ALTER TABLE sessions ADD COLUMN prompt_queue_held INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_dispatch_queue ADD COLUMN failed_at INTEGER;
ALTER TABLE session_dispatch_queue ADD COLUMN busy_refusals INTEGER NOT NULL DEFAULT 0;
-- Unix epoch milliseconds: whole-second rounding could immediately expire a retry.
ALTER TABLE session_dispatch_queue ADD COLUMN retry_after INTEGER NOT NULL DEFAULT 0;
CREATE TRIGGER prompt_queue_failed AFTER UPDATE OF state ON session_dispatch_queue
WHEN NEW.origin='operator' AND NEW.state='failed' AND OLD.state<>'failed'
BEGIN UPDATE session_dispatch_queue SET failed_at=unixepoch() WHERE owner_id=NEW.owner_id AND operation_id=NEW.operation_id; END;
CREATE TABLE prompt_queue_attachments (
    owner_id TEXT NOT NULL, operation_id TEXT NOT NULL, sha256 TEXT NOT NULL, position INTEGER NOT NULL,
    PRIMARY KEY(owner_id,operation_id,position),
    FOREIGN KEY(owner_id,operation_id) REFERENCES session_dispatch_queue(owner_id,operation_id) ON DELETE CASCADE,
    FOREIGN KEY(owner_id,sha256) REFERENCES attachments(owner_id,sha256));
CREATE INDEX prompt_queue_attachment_hash ON prompt_queue_attachments(owner_id,sha256);
CREATE TRIGGER prompt_queue_insert AFTER INSERT ON session_dispatch_queue WHEN NEW.origin='operator'
BEGIN UPDATE sessions SET prompt_queue_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.target_id; END;
CREATE TRIGGER prompt_queue_update AFTER UPDATE OF state,payload ON session_dispatch_queue WHEN NEW.origin='operator'
BEGIN UPDATE sessions SET prompt_queue_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.target_id; END;
CREATE TRIGGER prompt_queue_delete AFTER DELETE ON session_dispatch_queue WHEN OLD.origin='operator'
BEGIN
    UPDATE sessions SET prompt_queue_dirty=1 WHERE owner_id=OLD.owner_id AND id=OLD.target_id;
    DELETE FROM prompt_receipts WHERE owner_id = OLD.owner_id AND session_id=OLD.target_id AND receipt_kind='queue' AND receipt_id=OLD.operation_id;
END;
DROP TRIGGER delegation_endpoint_end;
CREATE TRIGGER delegation_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
WHEN NEW.close_requested = 1 OR NEW.lifecycle IN ('closed','deleted','failed') OR NEW.hat_id <> OLD.hat_id
BEGIN
    UPDATE session_operations SET state = CASE WHEN NEW.lifecycle = 'failed' AND child_id = NEW.id THEN 'failed' ELSE 'cancelled' END,
        code = CASE WHEN NEW.lifecycle = 'failed' AND child_id = NEW.id THEN COALESCE(NEW.failure_reason,'start_failed') ELSE 'endpoint_unavailable' END
    WHERE tool <> 'operator_prompt' AND owner_id = NEW.owner_id AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')))
      AND (caller_id = NEW.id OR child_id = NEW.id);
    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
    WHERE origin <> 'operator' AND owner_id = NEW.owner_id AND (source_id = NEW.id OR target_id = NEW.id)
      AND state IN ('queued','waiting_config');
    UPDATE session_operations SET state='failed',code=CASE WHEN NEW.hat_id <> OLD.hat_id THEN 'hat_changed' ELSE COALESCE(NEW.failure_reason,'session_closed') END
    WHERE owner_id=NEW.owner_id AND child_id=NEW.id AND tool='operator_prompt'
      AND (state IN ('queued','waiting_config') OR (state='awaiting_reconciliation' AND NEW.lifecycle IN ('closed','failed')));
    UPDATE session_dispatch_queue SET state='failed'
    WHERE owner_id=NEW.owner_id AND target_id=NEW.id AND origin='operator'
      AND (state IN ('queued','waiting_config') OR (state='awaiting_reconciliation' AND NEW.lifecycle IN ('closed','failed')));
    UPDATE session_attach_evidence SET evidence = NULL
    WHERE owner_id = NEW.owner_id AND session_id = NEW.id;
    DELETE FROM session_dispatch_queue
    WHERE owner_id = NEW.owner_id AND (source_id = NEW.id OR target_id = NEW.id) AND NEW.lifecycle = 'deleted';
    DELETE FROM session_operations
    WHERE owner_id = NEW.owner_id AND caller_id = NEW.id AND NEW.lifecycle = 'deleted';
    DELETE FROM prompt_receipts WHERE owner_id=NEW.owner_id AND session_id=NEW.id AND NEW.lifecycle='deleted';
    UPDATE session_operations SET child_id = NULL, tool = '', state = 'failed', code = 'gone',
        turn_id = NULL, pending_id = NULL, request_id = NULL, accepted_revision = 0, epoch = 0,
        validated_attach = NULL, validated_config = NULL, validated_policy = NULL
    WHERE owner_id = NEW.owner_id AND child_id = NEW.id AND NEW.lifecycle = 'deleted';
    DELETE FROM delegation_start_budgets
    WHERE owner_id = NEW.owner_id AND caller_id = NEW.id AND NEW.lifecycle = 'deleted';
    DELETE FROM session_attach_evidence WHERE owner_id = NEW.owner_id AND session_id = NEW.id AND NEW.lifecycle = 'deleted';
END;

DROP TRIGGER delegation_grant_end;
CREATE TRIGGER delegation_grant_end AFTER UPDATE OF revision ON hat_session_tools
BEGIN
    UPDATE session_operations SET state = 'cancelled', code = 'grant_changed'
    WHERE tool <> 'operator_prompt' AND owner_id = NEW.owner_id AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')))
      AND caller_id IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id);
    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
    WHERE origin <> 'operator' AND owner_id = NEW.owner_id AND accepted_revision <> NEW.revision
      AND source_id IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id)
      AND state IN ('queued','waiting_config');
END;
