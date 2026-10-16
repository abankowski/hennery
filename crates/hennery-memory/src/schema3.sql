-- The independent UI auth principal is bound explicitly by local bootstrap.
CREATE TABLE ui_bindings (principal TEXT PRIMARY KEY, owner TEXT NOT NULL);
