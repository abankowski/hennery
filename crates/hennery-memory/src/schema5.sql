-- One opaque fence per namespace, committed atomically with erased content.
-- It survives lease loss, unwinding and process restarts until a confirmed
-- full-database checkpoint removes the erased bytes from the WAL.
CREATE TABLE pending_cleanup (
 namespace TEXT PRIMARY KEY REFERENCES namespaces(id)
);
