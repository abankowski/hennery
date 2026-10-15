-- Sessions migration 19: source references and reverse-delivery reservations.
CREATE TABLE delegation_notices (
    owner_id TEXT NOT NULL, delivery_id TEXT NOT NULL, child_id TEXT NOT NULL,
    parent_id TEXT NOT NULL, root_id TEXT NOT NULL, hat_id TEXT NOT NULL,
    source_event_id INTEGER NOT NULL, source_events TEXT NOT NULL,
    kind TEXT NOT NULL, source_turn TEXT, pending_id TEXT, incident TEXT NOT NULL,
    accepted_revision INTEGER NOT NULL, created_at INTEGER NOT NULL, deadline INTEGER NOT NULL,
    state TEXT NOT NULL DEFAULT 'parent_queued', reason TEXT,
    target_turn TEXT, required_config TEXT NOT NULL,
    PRIMARY KEY(owner_id,delivery_id), UNIQUE(owner_id,child_id,incident),
    FOREIGN KEY(child_id,owner_id) REFERENCES sessions(id,owner_id),
    FOREIGN KEY(parent_id,owner_id) REFERENCES sessions(id,owner_id),
    FOREIGN KEY(root_id,owner_id) REFERENCES sessions(id,owner_id));
CREATE INDEX delegation_notice_ready ON delegation_notices(owner_id,parent_id,state,source_event_id);
CREATE INDEX delegation_notice_pending ON delegation_notices(owner_id,child_id,pending_id);
CREATE TABLE delegation_budgets (
    owner_id TEXT NOT NULL, root_id TEXT NOT NULL, epoch INTEGER NOT NULL,
    wakes INTEGER NOT NULL CHECK(wakes >= 0 AND wakes <= 20),
    PRIMARY KEY(owner_id,root_id,epoch),
    FOREIGN KEY(root_id,owner_id) REFERENCES sessions(id,owner_id));
CREATE TRIGGER notice_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
WHEN NEW.close_requested = 1 OR NEW.lifecycle IN ('closed','deleted','failed') OR NEW.hat_id <> OLD.hat_id
BEGIN
    UPDATE delegation_notices SET state = 'operator_required',reason = 'endpoint_unavailable'
    WHERE owner_id = NEW.owner_id AND (parent_id = NEW.id OR (child_id = NEW.id AND NEW.lifecycle <> 'failed'))
      AND state IN ('parent_queued','waiting_config');
    DELETE FROM delegation_notices WHERE owner_id = NEW.owner_id
      AND (child_id = NEW.id OR parent_id = NEW.id) AND NEW.lifecycle = 'deleted';
    DELETE FROM delegation_budgets WHERE owner_id = NEW.owner_id AND root_id = NEW.id AND NEW.lifecycle = 'deleted';
END;
CREATE TRIGGER notice_family_end AFTER UPDATE OF detached ON session_families WHEN NEW.detached = 1
BEGIN
    UPDATE delegation_notices SET state = 'operator_required',reason = 'family_detached'
    WHERE owner_id = NEW.owner_id AND child_id = NEW.child_id AND parent_id = NEW.parent_id
      AND state IN ('parent_queued','waiting_config');
END;
CREATE TRIGGER notice_grant_end AFTER UPDATE OF revision ON hat_session_tools
BEGIN
    UPDATE delegation_notices SET state = 'operator_required',reason = 'grant_changed'
    WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id
      AND state IN ('parent_queued','waiting_config');
END;
