-- Test-only rollback of sessions migration 29 before historical fixtures.
DROP TRIGGER review_delete;
DROP TABLE session_reviews;
-- Test-only rollback of sessions migrations 28/27: restore the v26 budget CHECK.
DROP TABLE runtime_catalog;
DROP TABLE delegation_limits;
DROP TRIGGER notice_endpoint_end;
ALTER TABLE delegation_budgets RENAME TO delegation_budgets_old;
CREATE TABLE delegation_budgets (
    owner_id TEXT NOT NULL, root_id TEXT NOT NULL, epoch INTEGER NOT NULL,
    wakes INTEGER NOT NULL CHECK(wakes >= 0 AND wakes <= 20),
    PRIMARY KEY(owner_id,root_id,epoch),
    FOREIGN KEY(root_id,owner_id) REFERENCES sessions(id,owner_id));
INSERT INTO delegation_budgets(owner_id,root_id,epoch,wakes)
    SELECT owner_id,root_id,epoch,wakes FROM delegation_budgets_old;
DROP TABLE delegation_budgets_old;
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
