-- Sessions migration 29: only results produced after this upgrade enter the inbox.
CREATE TABLE session_reviews (
    owner_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_id INTEGER NOT NULL CHECK(event_id > 0),
    read_event_id INTEGER NOT NULL DEFAULT 0 CHECK(read_event_id >= 0 AND read_event_id <= event_id),
    PRIMARY KEY(owner_id,session_id),
    FOREIGN KEY(session_id,owner_id) REFERENCES sessions(id,owner_id));
CREATE TRIGGER review_delete AFTER UPDATE OF lifecycle ON sessions
WHEN NEW.lifecycle = 'deleted'
BEGIN
    DELETE FROM session_reviews WHERE owner_id = NEW.owner_id AND session_id = NEW.id;
END;
