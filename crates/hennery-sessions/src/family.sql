-- Sessions migration 21: operator projection, never agent authority.
ALTER TABLE sessions ADD COLUMN family_dirty INTEGER NOT NULL DEFAULT 0;
CREATE INDEX family_dirty_ready ON sessions(owner_id,id) WHERE family_dirty=1 AND lifecycle<>'deleted';
CREATE VIEW delegation_question_routing AS
SELECT p.owner_id,p.session_id,p.pending_id,p.kind,
 CASE WHEN EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id=p.owner_id AND a.pending_id=p.pending_id)
      THEN 'answer_queued'
      WHEN p.kind='elicitation' AND EXISTS(
        SELECT 1 FROM delegation_notices n
        JOIN session_families f ON f.owner_id=p.owner_id AND f.child_id=p.session_id AND f.parent_id=n.parent_id
        JOIN sessions c ON c.owner_id=p.owner_id AND c.id=p.session_id
        JOIN sessions r ON r.owner_id=p.owner_id AND r.id=f.parent_id
        JOIN hat_session_tools g ON g.owner_id=p.owner_id AND g.hat_id=f.hat_id
        WHERE n.owner_id=p.owner_id AND n.child_id=p.session_id AND n.pending_id=p.pending_id AND n.kind='question'
          AND n.state IN ('parent_queued','parent_delivered','waiting_config','awaiting_reconciliation')
          AND f.detached=0 AND c.hat_id=f.hat_id AND r.hat_id=f.hat_id
          AND c.close_requested=0 AND r.close_requested=0 AND r.lifecycle IN ('starting','active','parked')
          AND g.delegation_enabled=1 AND g.revision=n.accepted_revision
          AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id=p.owner_id AND h.hat_id=f.hat_id))
      THEN COALESCE((SELECT n.state FROM delegation_notices n WHERE n.owner_id=p.owner_id
          AND n.child_id=p.session_id AND n.pending_id=p.pending_id AND n.kind='question'
          ORDER BY n.source_event_id DESC LIMIT 1),'parent_queued')
      ELSE 'operator_required' END AS handling,
 COALESCE((SELECT a.reason FROM delegation_attention a WHERE a.owner_id=p.owner_id
    AND a.child_id=p.session_id AND a.pending_id=p.pending_id AND a.state='open' LIMIT 1),
    CASE WHEN p.kind='permission' THEN 'permission' END) AS reason
FROM pending p WHERE p.state='open';
-- Durable invalidations allow ordinary SSE resume/resync to include routing
-- transitions with no ACP fact (deadline, acknowledgement and takeover).
CREATE TRIGGER family_view_attention_insert AFTER INSERT ON delegation_attention WHEN NEW.state='open'
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_attention_update AFTER UPDATE OF state,reason ON delegation_attention
WHEN NEW.state<>OLD.state OR NEW.reason<>OLD.reason
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_edge_insert AFTER INSERT ON session_families
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.parent_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_edge_update AFTER UPDATE OF detached,reason ON session_families
WHEN NEW.detached<>OLD.detached OR NEW.reason IS NOT OLD.reason
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id IN (NEW.parent_id,NEW.child_id) AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_edge_delete AFTER DELETE ON session_families
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=OLD.owner_id AND id IN (OLD.parent_id,OLD.child_id) AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_operation_update AFTER UPDATE OF state,code ON session_operations
WHEN NEW.state<>OLD.state OR NEW.code IS NOT OLD.code
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_session_state AFTER UPDATE OF lifecycle,activity,model,mode,hat_id ON sessions
WHEN NEW.lifecycle IS NOT OLD.lifecycle OR NEW.activity IS NOT OLD.activity OR NEW.model IS NOT OLD.model
 OR NEW.mode IS NOT OLD.mode OR NEW.hat_id IS NOT OLD.hat_id
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND lifecycle<>'deleted'
 AND (id IN (SELECT parent_id FROM session_families WHERE owner_id=NEW.owner_id AND child_id=NEW.id)
     OR (id=NEW.id AND delegated_child=1));
END;
CREATE TRIGGER family_view_pending_insert AFTER INSERT ON pending
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.session_id AND delegated_child=1 AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_pending_update AFTER UPDATE OF state ON pending WHEN NEW.state<>OLD.state
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.session_id AND delegated_child=1 AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_answer_insert AFTER INSERT ON answer_queue
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.session_id AND delegated_child=1 AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_answer_delete AFTER DELETE ON answer_queue
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=OLD.owner_id AND id=OLD.session_id AND delegated_child=1 AND lifecycle<>'deleted';
END;
CREATE TRIGGER family_view_operation_insert AFTER INSERT ON session_operations
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
END;

-- A scope removal belongs to the owner, never to a now-frozen session.
-- Its sequence is separate from transcript events. Resumed list streams
-- replay frozen rows independently of their transcript-event cursor.
CREATE TABLE view_scope_invalidations (
 owner_id TEXT PRIMARY KEY,
 revision INTEGER NOT NULL DEFAULT 0
);
INSERT INTO view_scope_invalidations(owner_id,revision)
 SELECT id,(SELECT count(*) FROM purged_hats p WHERE p.owner_id=owners.id) FROM owners;
CREATE TRIGGER family_view_hat_frozen AFTER INSERT ON purged_hats
BEGIN
 UPDATE view_scope_invalidations SET revision=revision+1 WHERE owner_id=NEW.owner_id;
END;
CREATE TRIGGER family_view_notice_update AFTER UPDATE OF state,reason,accepted_revision ON delegation_notices
WHEN NEW.state IS NOT OLD.state OR NEW.reason IS NOT OLD.reason OR NEW.accepted_revision IS NOT OLD.accepted_revision
BEGIN
 UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
END;
