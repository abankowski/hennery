-- Sessions migration 20: durable operator work, independent of push delivery.
-- Reserve an inert row with each source notice; triggers only activate it.
CREATE TABLE delegation_attention (
    owner_id TEXT NOT NULL, attention_id TEXT NOT NULL, delivery_id TEXT,
    child_id TEXT NOT NULL, hat_id TEXT NOT NULL, reason TEXT NOT NULL, pending_id TEXT,
    state TEXT NOT NULL DEFAULT 'standby', operator_epoch INTEGER NOT NULL DEFAULT 0,
    push_run TEXT NOT NULL DEFAULT '', push_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(owner_id,attention_id),
    FOREIGN KEY(child_id,owner_id) REFERENCES sessions(id,owner_id));
CREATE INDEX delegation_attention_ready ON delegation_attention(owner_id,state,attention_id);
CREATE INDEX delegation_attention_child ON delegation_attention(owner_id,child_id);
CREATE INDEX delegation_notice_deadline ON delegation_notices(owner_id,deadline,state);
CREATE TRIGGER attention_notice_update AFTER UPDATE OF state ON delegation_notices
BEGIN
    UPDATE delegation_attention SET state = 'open',reason = COALESCE(NEW.reason,'operator_required')
    WHERE owner_id = NEW.owner_id AND delivery_id = NEW.delivery_id AND NEW.state = 'operator_required'
      AND (NEW.kind <> 'question' OR EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = NEW.owner_id
          AND p.session_id = NEW.child_id AND p.pending_id = NEW.pending_id AND p.state = 'open'
          AND NOT EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = NEW.owner_id AND a.pending_id = p.pending_id)));
    UPDATE delegation_attention SET state = 'resolved'
    WHERE owner_id = NEW.owner_id AND delivery_id = NEW.delivery_id
      AND (NEW.state IN ('obsolete','resolved') OR (NEW.state = 'parent_delivered' AND NEW.kind <> 'question'));
END;
-- D3a scrubs parent-related notices on deletion. Preserve only surviving work,
-- without a parent/source reference; remove inert/resolved metadata entirely.
CREATE TRIGGER attention_parent_delete BEFORE UPDATE OF lifecycle ON sessions
WHEN NEW.lifecycle = 'deleted' AND OLD.lifecycle <> 'deleted'
BEGIN
    UPDATE delegation_attention SET state = 'open',delivery_id = NULL,reason = 'parent_deleted'
    WHERE owner_id = NEW.owner_id AND delivery_id IN (
        SELECT n.delivery_id FROM delegation_notices n JOIN sessions c ON c.owner_id = NEW.owner_id AND c.id = n.child_id
        WHERE n.owner_id = NEW.owner_id AND n.parent_id = NEW.id AND c.lifecycle <> 'deleted'
          AND n.state NOT IN ('obsolete','resolved') AND (n.kind = 'question' OR n.state <> 'parent_delivered')
          AND (n.kind <> 'question' OR EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = NEW.owner_id
              AND p.session_id = n.child_id AND p.pending_id = n.pending_id AND p.state = 'open'
              AND NOT EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = NEW.owner_id AND a.pending_id = p.pending_id))));
    DELETE FROM delegation_attention WHERE owner_id = NEW.owner_id AND delivery_id IN (
        SELECT delivery_id FROM delegation_notices WHERE owner_id = NEW.owner_id AND parent_id = NEW.id);
END;
CREATE TRIGGER attention_child_end AFTER UPDATE OF lifecycle,hat_id ON sessions
BEGIN
    DELETE FROM delegation_attention WHERE owner_id = NEW.owner_id AND child_id = NEW.id AND NEW.lifecycle = 'deleted';
    UPDATE delegation_attention SET hat_id = NEW.hat_id,delivery_id = NULL,reason = 'reassigned',push_run = '',push_at = 0,
        state = CASE WHEN state = 'standby' THEN 'open' ELSE state END
    WHERE owner_id = NEW.owner_id AND child_id = NEW.id AND NEW.hat_id <> OLD.hat_id;
END;
CREATE TRIGGER attention_pending_end AFTER UPDATE OF state ON pending WHEN NEW.state <> 'open'
BEGIN
    UPDATE delegation_attention SET state = 'resolved' WHERE owner_id = NEW.owner_id
        AND child_id = NEW.session_id AND pending_id = NEW.pending_id;
END;
CREATE TRIGGER attention_answer AFTER INSERT ON answer_queue
BEGIN
    UPDATE delegation_attention SET state = 'resolved' WHERE owner_id = NEW.owner_id
        AND child_id = NEW.session_id AND pending_id = NEW.pending_id;
END;
INSERT INTO delegation_attention(owner_id,attention_id,delivery_id,child_id,hat_id,reason,pending_id,state,operator_epoch)
SELECT n.owner_id,n.delivery_id,n.delivery_id,n.child_id,c.hat_id,COALESCE(n.reason,'operator_required'),
    CASE WHEN n.kind = 'question' THEN n.pending_id END,
    CASE WHEN n.state = 'operator_required' THEN 'open'
         WHEN n.state IN ('obsolete','resolved') OR (n.state = 'parent_delivered' AND n.kind <> 'question') THEN 'resolved'
         ELSE 'standby' END,
    COALESCE((SELECT MAX(event_id) FROM events WHERE owner_id = n.owner_id AND session_id = n.root_id
        AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'),0)
FROM delegation_notices n JOIN sessions c ON c.owner_id = n.owner_id AND c.id = n.child_id
WHERE c.lifecycle <> 'deleted';
