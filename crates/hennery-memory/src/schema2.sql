ALTER TABLE seen ADD COLUMN digest TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN project_digest TEXT;
CREATE INDEX scoped_project ON entries(namespace,project_digest,seq);
ALTER TABLE namespaces ADD COLUMN erasure_confirmed INTEGER NOT NULL DEFAULT 0;
