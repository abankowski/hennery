CREATE TABLE runtime_catalog (
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    host_id TEXT NOT NULL,
    hat_id TEXT NOT NULL,
    cwd TEXT NOT NULL,
    agent TEXT NOT NULL,
    adapter_revision TEXT NOT NULL,
    catalog TEXT NOT NULL,
    saved_at INTEGER NOT NULL,
    observation INTEGER NOT NULL,
    source_session_id TEXT,
    defaults_source_session_id TEXT,
    PRIMARY KEY(owner_id, host_id, hat_id, cwd, agent, adapter_revision),
    FOREIGN KEY(host_id, owner_id) REFERENCES hosts(id, owner_id) ON DELETE CASCADE,
    FOREIGN KEY(hat_id, owner_id) REFERENCES hats(id, owner_id) ON DELETE CASCADE,
    FOREIGN KEY(source_session_id, owner_id) REFERENCES sessions(id, owner_id) ON DELETE CASCADE
);
