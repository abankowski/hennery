-- Only hashes and opaque entry IDs: retries never overwrite edits or resurrect
-- deleted imports. Namespace purge removes this evidence as well.
CREATE TABLE imports (
 namespace TEXT NOT NULL REFERENCES namespaces(id), vault TEXT NOT NULL,
 path TEXT NOT NULL, digest TEXT NOT NULL, entry_id TEXT NOT NULL,
 PRIMARY KEY(namespace,vault,path)
);
