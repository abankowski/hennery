-- Sessions migration 18: delegation commands, dispatch eligibility and receipts.
ALTER TABLE sessions ADD COLUMN delegated_child INTEGER NOT NULL DEFAULT 0;
UPDATE sessions SET delegated_child = 1 WHERE EXISTS (SELECT 1 FROM session_families f WHERE f.owner_id = sessions.owner_id AND f.child_id = sessions.id);
CREATE TRIGGER delegation_child_identity AFTER INSERT ON session_families
BEGIN UPDATE sessions SET delegated_child = 1 WHERE owner_id = NEW.owner_id AND id = NEW.child_id; END;
CREATE TRIGGER delegation_child_immutable BEFORE UPDATE OF delegated_child ON sessions
WHEN OLD.delegated_child = 1 AND NEW.delegated_child <> 1
BEGIN SELECT RAISE(ABORT,'immutable delegated identity'); END;
CREATE TABLE session_operations (
    owner_id TEXT NOT NULL, caller_id TEXT NOT NULL, operation_key TEXT NOT NULL,
    operation_id TEXT NOT NULL, digest TEXT NOT NULL, tool TEXT NOT NULL,
    child_id TEXT NOT NULL, state TEXT NOT NULL, code TEXT,
    turn_id TEXT, pending_id TEXT, request_id TEXT, accepted_revision INTEGER NOT NULL DEFAULT 0,
    epoch INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(owner_id, caller_id, operation_key), UNIQUE(owner_id, operation_id),
    FOREIGN KEY(caller_id, owner_id) REFERENCES sessions(id, owner_id),
    FOREIGN KEY(child_id, owner_id) REFERENCES sessions(id, owner_id));
CREATE INDEX delegation_operations_child ON session_operations(owner_id, child_id);
CREATE TABLE session_dispatch_queue (
    position INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL,
    operation_id TEXT NOT NULL, source_id TEXT NOT NULL, target_id TEXT NOT NULL,
    accepted_revision INTEGER NOT NULL, payload TEXT NOT NULL,
    required_config TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'queued',
    UNIQUE(owner_id,operation_id),
    FOREIGN KEY(owner_id,operation_id) REFERENCES session_operations(owner_id,operation_id),
    FOREIGN KEY(source_id,owner_id) REFERENCES sessions(id,owner_id),
    FOREIGN KEY(target_id,owner_id) REFERENCES sessions(id,owner_id));
CREATE INDEX delegation_queue_ready ON session_dispatch_queue(owner_id, target_id, position);
CREATE TABLE session_attach_evidence (
    owner_id TEXT NOT NULL, session_id TEXT NOT NULL, attach_generation INTEGER NOT NULL,
    config_revision INTEGER NOT NULL DEFAULT 0, evidence TEXT,
    requested_config TEXT NOT NULL, launch_sent INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(owner_id,session_id),
    FOREIGN KEY(session_id,owner_id) REFERENCES sessions(id,owner_id));
CREATE TABLE delegation_execution_policy (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
    allowed TEXT NOT NULL DEFAULT '{}', configured INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(owner_id,hat_id),
    FOREIGN KEY(hat_id,owner_id) REFERENCES hats(id,owner_id) ON DELETE CASCADE);
ALTER TABLE turns ADD COLUMN input_origin TEXT NOT NULL DEFAULT '{"kind":"operator"}';
ALTER TABLE answer_queue ADD COLUMN input_origin TEXT NOT NULL DEFAULT '{"kind":"operator"}';
ALTER TABLE answer_queue ADD COLUMN delegation_handoff INTEGER NOT NULL DEFAULT 1;
CREATE TRIGGER delegation_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
WHEN NEW.close_requested = 1 OR NEW.lifecycle IN ('closed','deleted','failed') OR NEW.hat_id <> OLD.hat_id
BEGIN
    UPDATE session_operations SET state = CASE WHEN NEW.lifecycle = 'failed' AND child_id = NEW.id THEN 'failed' ELSE 'cancelled' END,
        code = CASE WHEN NEW.lifecycle = 'failed' AND child_id = NEW.id THEN COALESCE(NEW.failure_reason,'start_failed') ELSE 'endpoint_unavailable' END
    WHERE owner_id = NEW.owner_id AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')))
      AND (caller_id = NEW.id OR child_id = NEW.id);
    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
    WHERE owner_id = NEW.owner_id AND (source_id = NEW.id OR target_id = NEW.id)
      AND state IN ('queued','waiting_config');
    UPDATE session_attach_evidence SET evidence = NULL
    WHERE owner_id = NEW.owner_id AND session_id = NEW.id;
    UPDATE session_dispatch_queue SET payload = '', required_config = '{}'
    WHERE owner_id = NEW.owner_id AND (source_id = NEW.id OR target_id = NEW.id) AND NEW.lifecycle = 'deleted';
    DELETE FROM session_attach_evidence WHERE owner_id = NEW.owner_id AND session_id = NEW.id AND NEW.lifecycle = 'deleted';
END;
CREATE TRIGGER delegation_family_end AFTER UPDATE OF detached ON session_families
WHEN NEW.detached = 1
BEGIN
    UPDATE session_operations SET state = 'cancelled', code = 'family_detached'
    WHERE owner_id = NEW.owner_id AND caller_id = NEW.parent_id AND child_id = NEW.child_id
      AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')));
    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
    WHERE owner_id = NEW.owner_id AND source_id = NEW.parent_id AND target_id = NEW.child_id
      AND state IN ('queued','waiting_config');
END;
CREATE TRIGGER delegation_grant_end AFTER UPDATE OF revision ON hat_session_tools
BEGIN
    UPDATE session_operations SET state = 'cancelled', code = 'grant_changed'
    WHERE owner_id = NEW.owner_id AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')))
      AND caller_id IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id);
    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
    WHERE owner_id = NEW.owner_id AND accepted_revision <> NEW.revision
      AND source_id IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id)
      AND state IN ('queued','waiting_config');
END;
CREATE TRIGGER delegation_answer_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
WHEN NEW.close_requested = 1 OR NEW.lifecycle IN ('closed','deleted','failed') OR NEW.hat_id <> OLD.hat_id
BEGIN
    DELETE FROM answer_queue WHERE owner_id = NEW.owner_id AND delegation_handoff = 0
      AND (session_id = NEW.id OR json_extract(input_origin,'$.session_id') = NEW.id);
END;
CREATE TRIGGER delegation_answer_grant_end AFTER UPDATE OF revision ON hat_session_tools
BEGIN
    DELETE FROM answer_queue WHERE owner_id = NEW.owner_id AND delegation_handoff = 0
      AND json_extract(input_origin,'$.session_id') IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id);
END;
CREATE TRIGGER delegation_config_invalidated AFTER UPDATE OF model,mode,config_axes ON sessions
BEGIN
    UPDATE session_attach_evidence SET evidence = NULL
    WHERE owner_id = NEW.owner_id AND session_id = NEW.id;
END;
ALTER TABLE session_operations ADD COLUMN validated_attach INTEGER;
ALTER TABLE session_operations ADD COLUMN validated_config INTEGER;
ALTER TABLE session_operations ADD COLUMN validated_policy INTEGER;
ALTER TABLE session_attach_evidence ADD COLUMN request_id TEXT;
