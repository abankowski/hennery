-- Sessions migration 22: persisted pin and transactional hold invalidations.
ALTER TABLE sessions ADD COLUMN idle_pinned INTEGER NOT NULL DEFAULT 0 CHECK(idle_pinned IN (0,1));
ALTER TABLE sessions ADD COLUMN idle_hold_dirty INTEGER NOT NULL DEFAULT 1;
CREATE INDEX idle_hold_ready ON sessions(owner_id,id) WHERE idle_hold_dirty=1 AND lifecycle<>'deleted';
CREATE TRIGGER idle_hold_session AFTER UPDATE OF lifecycle,idle_pinned ON sessions
WHEN NEW.lifecycle IS NOT OLD.lifecycle OR NEW.idle_pinned<>OLD.idle_pinned
BEGIN
 UPDATE sessions SET idle_hold_dirty=1 WHERE owner_id=NEW.owner_id AND lifecycle<>'deleted'
 AND (id=NEW.id OR id IN (SELECT parent_id FROM session_families WHERE owner_id=NEW.owner_id AND child_id=NEW.id));
END;
CREATE TRIGGER idle_hold_family_insert AFTER INSERT ON session_families
BEGIN
 UPDATE sessions SET idle_hold_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.parent_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER idle_hold_family_delete AFTER DELETE ON session_families
BEGIN
 UPDATE sessions SET idle_hold_dirty=1 WHERE owner_id=OLD.owner_id AND id=OLD.parent_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER idle_hold_notice_insert AFTER INSERT ON delegation_notices
BEGIN
 UPDATE sessions SET idle_hold_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.parent_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER idle_hold_notice_update AFTER UPDATE OF state ON delegation_notices WHEN NEW.state<>OLD.state
BEGIN
 UPDATE sessions SET idle_hold_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.parent_id AND lifecycle<>'deleted';
END;
CREATE TRIGGER idle_hold_notice_delete AFTER DELETE ON delegation_notices
BEGIN
 UPDATE sessions SET idle_hold_dirty=1 WHERE owner_id=OLD.owner_id AND id=OLD.parent_id AND lifecycle<>'deleted';
END;
