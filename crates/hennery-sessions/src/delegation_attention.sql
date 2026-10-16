-- Sessions migration 20: durable operator work, independent of push delivery.
-- Reserve an inert row with each source notice; triggers only activate it.
CREATE TABLE delegation_attention (
    owner_id TEXT NOT NULL, attention_id TEXT NOT NULL, delivery_id TEXT,
    child_id TEXT NOT NULL, hat_id TEXT NOT NULL, reason TEXT NOT NULL, pending_id TEXT,
    state TEXT NOT NULL DEFAULT 'standby', operator_epoch INTEGER NOT NULL DEFAULT 0, incident TEXT NOT NULL,
    push_run TEXT NOT NULL DEFAULT '', push_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(owner_id,attention_id), UNIQUE(owner_id,child_id,incident),
    FOREIGN KEY(child_id,owner_id) REFERENCES sessions(id,owner_id));
CREATE INDEX delegation_attention_ready ON delegation_attention(owner_id,state,attention_id);
CREATE INDEX delegation_attention_child ON delegation_attention(owner_id,child_id);
CREATE INDEX delegation_notice_deadline ON delegation_notices(owner_id,deadline,state);
CREATE TRIGGER attention_notice_update AFTER UPDATE OF state ON delegation_notices
BEGIN
    UPDATE delegation_attention SET state = 'open',reason = COALESCE(NEW.reason,'operator_required'),
        operator_epoch = CASE WHEN state = 'open' THEN operator_epoch ELSE
            COALESCE((SELECT MAX(event_id) FROM events WHERE owner_id = NEW.owner_id AND session_id = NEW.root_id
                AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'),0) END
    WHERE owner_id = NEW.owner_id AND delivery_id = NEW.delivery_id AND NEW.state = 'operator_required'
      AND (NEW.kind <> 'question' OR EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = NEW.owner_id
          AND p.session_id = NEW.child_id AND p.pending_id = NEW.pending_id AND p.state = 'open'
          AND NOT EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = NEW.owner_id AND a.pending_id = p.pending_id)));
    UPDATE delegation_attention SET state = 'resolved'
    WHERE owner_id = NEW.owner_id AND delivery_id = NEW.delivery_id
      AND (NEW.state IN ('obsolete','resolved') OR (NEW.state = 'parent_delivered' AND NEW.kind <> 'question'));
END;
-- D3a scrubs parent-related notices on deletion. Preserve only surviving work,
-- without a parent/source reference. Retain only canonical open questions and
-- coalescible incident tombstones; ordinary resolved report metadata is removed.
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
    -- A queued answer can still be cancelled by the endpoint AFTER trigger.
    -- Preserve its inert reservation so that cancellation restores it atomically.
    UPDATE delegation_attention SET delivery_id = NULL,reason = 'parent_deleted',
        operator_epoch = 0,push_run = '',push_at = 0
    WHERE owner_id = NEW.owner_id AND delivery_id IN (
        SELECT n.delivery_id FROM delegation_notices n JOIN pending p ON p.owner_id = NEW.owner_id
            AND p.session_id = n.child_id AND p.pending_id = n.pending_id AND p.state = 'open'
        WHERE n.owner_id = NEW.owner_id AND n.parent_id = NEW.id AND n.kind = 'question');
    -- Later frames of this same crash/start incident must not recreate work.
    -- Replace the former delivery-shaped ID and scrub all routing/push evidence.
    UPDATE delegation_attention SET attention_id = lower(hex(randomblob(16))),delivery_id = NULL,
        pending_id = NULL,reason = 'incident_resolved',operator_epoch = 0,push_run = '',push_at = 0
    WHERE owner_id = NEW.owner_id AND state = 'resolved' AND delivery_id IN (
        SELECT n.delivery_id FROM delegation_notices n WHERE n.owner_id = NEW.owner_id AND n.parent_id = NEW.id
            AND n.kind IN ('session_unavailable','session_failed'));
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
CREATE TRIGGER attention_answer_cancelled AFTER DELETE ON answer_queue
WHEN OLD.delegation_handoff = 0 AND OLD.delivered IS NULL AND json_extract(OLD.input_origin,'$.kind') = 'parent'
BEGIN
    UPDATE delegation_attention SET state = 'open',delivery_id = NULL,reason = 'answer_cancelled',
        operator_epoch = 0,push_run = '',push_at = 0
    WHERE owner_id = OLD.owner_id AND child_id = OLD.session_id AND pending_id = OLD.pending_id
      AND EXISTS(SELECT 1 FROM sessions c WHERE c.owner_id = OLD.owner_id AND c.id = OLD.session_id AND c.lifecycle <> 'deleted')
      AND EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = OLD.owner_id AND p.session_id = OLD.session_id
          AND p.pending_id = OLD.pending_id AND p.state = 'open')
      AND NOT EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = OLD.owner_id AND a.pending_id = OLD.pending_id);
END;
INSERT INTO delegation_attention(owner_id,attention_id,delivery_id,child_id,hat_id,reason,pending_id,state,operator_epoch,incident)
SELECT n.owner_id,n.delivery_id,n.delivery_id,n.child_id,c.hat_id,COALESCE(n.reason,'operator_required'),
    CASE WHEN n.kind = 'question' THEN n.pending_id END,
    CASE WHEN n.state = 'operator_required' THEN 'open'
         WHEN n.state IN ('obsolete','resolved') OR (n.state = 'parent_delivered' AND n.kind <> 'question') THEN 'resolved'
         ELSE 'standby' END,
    COALESCE((SELECT MAX(event_id) FROM events WHERE owner_id = n.owner_id AND session_id = n.root_id
        AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'),0),n.incident
FROM delegation_notices n JOIN sessions c ON c.owner_id = n.owner_id AND c.id = n.child_id
WHERE c.lifecycle <> 'deleted';
-- D3a deletion can leave canonical callbacks without notices or family edges.
-- Accepted answers stay resolved; their inert reservation is needed only if
-- the undelivered answer is subsequently cancelled by a lifecycle/grant fence.
INSERT INTO delegation_attention(owner_id,attention_id,child_id,hat_id,reason,pending_id,state,incident)
SELECT p.owner_id,lower(hex(randomblob(16))),c.id,c.hat_id,'parent_unavailable',p.pending_id,
    CASE WHEN EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = p.owner_id AND a.pending_id = p.pending_id)
        THEN 'resolved' ELSE 'open' END,
    CASE WHEN p.opened_event_id IS NULL THEN 'pending:' || p.pending_id ELSE CAST(p.opened_event_id AS TEXT) || ':question' END
FROM pending p JOIN sessions c ON c.owner_id = p.owner_id AND c.id = p.session_id
WHERE p.state = 'open' AND c.delegated_child = 1 AND c.lifecycle <> 'deleted'
    AND NOT EXISTS(SELECT 1 FROM delegation_attention a WHERE a.owner_id = p.owner_id
        AND a.child_id = p.session_id AND a.pending_id = p.pending_id);
