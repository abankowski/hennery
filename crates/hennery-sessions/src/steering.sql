-- Support belongs to the current attachment. Old hosts and sessions default off.
ALTER TABLE sessions ADD COLUMN steering_supported INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_dispatch_queue ADD COLUMN steering_anchor INTEGER;
ALTER TABLE session_dispatch_queue ADD COLUMN steering_turn_id TEXT;
ALTER TABLE session_dispatch_queue ADD COLUMN steering_deadline INTEGER;
ALTER TABLE session_dispatch_queue ADD COLUMN steering_failure TEXT;
CREATE INDEX steering_deadlines ON session_dispatch_queue(owner_id,steering_deadline) WHERE state='steering';

-- An idle response can arrive after a close, hat change, or failed turn.
-- Preserve the ordinary queue's failure decision until the adapter answers.
CREATE TRIGGER steering_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
WHEN NEW.close_requested=1 OR NEW.lifecycle IN ('closed','failed') OR NEW.hat_id<>OLD.hat_id
BEGIN
    UPDATE session_dispatch_queue SET steering_failure=COALESCE(steering_failure,
        CASE WHEN NEW.hat_id<>OLD.hat_id THEN 'hat_changed' ELSE COALESCE(NEW.failure_reason,'session_closed') END)
    WHERE owner_id=NEW.owner_id AND target_id=NEW.id AND state IN ('steering','uncertain');
END;


CREATE TRIGGER steering_detached AFTER UPDATE OF lifecycle ON sessions
WHEN NEW.lifecycle IN ('parked','closed','failed') AND OLD.lifecycle<>NEW.lifecycle
BEGIN
    UPDATE session_dispatch_queue SET state='uncertain',steering_deadline=NULL
    WHERE owner_id=NEW.owner_id AND target_id=NEW.id AND state='steering';
END;
