CREATE TABLE namespaces (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, hat TEXT NOT NULL, epoch TEXT NOT NULL,
 tool_hash TEXT NOT NULL UNIQUE, lifecycle_hash TEXT NOT NULL UNIQUE,
 cursor_key TEXT NOT NULL, registered INTEGER NOT NULL DEFAULT 0,
 writes INTEGER NOT NULL DEFAULT 1, state TEXT NOT NULL DEFAULT 'active',
 UNIQUE(owner,hat,epoch)
);
CREATE TABLE entries (
 seq INTEGER PRIMARY KEY, namespace TEXT NOT NULL REFERENCES namespaces(id),
 id TEXT NOT NULL, kind TEXT NOT NULL, project TEXT, title TEXT NOT NULL, body TEXT NOT NULL,
 data TEXT NOT NULL, UNIQUE(namespace,id)
);
CREATE INDEX scoped_entries ON entries(namespace,kind,seq);
CREATE VIRTUAL TABLE entries_fts USING fts5(title,body,tokenize='unicode61 remove_diacritics 2');
INSERT INTO entries_fts(entries_fts,rank) VALUES('secure-delete',1);
CREATE TRIGGER index_add AFTER INSERT ON entries BEGIN
 INSERT INTO entries_fts(rowid,title,body) VALUES(new.seq,new.title,new.body);
END;
CREATE TRIGGER index_remove AFTER DELETE ON entries BEGIN
 DELETE FROM entries_fts WHERE rowid=old.seq;
END;
CREATE TABLE requests(namespace TEXT NOT NULL REFERENCES namespaces(id), key TEXT NOT NULL,
 digest TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(namespace,key));
CREATE TABLE receipts(namespace TEXT NOT NULL REFERENCES namespaces(id), request TEXT NOT NULL,
 epoch TEXT NOT NULL, target TEXT NOT NULL, PRIMARY KEY(namespace,request));
CREATE TABLE sources(namespace TEXT NOT NULL REFERENCES namespaces(id), session TEXT NOT NULL,
 event_key TEXT NOT NULL, PRIMARY KEY(namespace,session));
CREATE TABLE suppressed(namespace TEXT NOT NULL REFERENCES namespaces(id), session TEXT NOT NULL,
 PRIMARY KEY(namespace,session));
CREATE TABLE seen(namespace TEXT NOT NULL REFERENCES namespaces(id), event_key TEXT NOT NULL,
 PRIMARY KEY(namespace,event_key));
CREATE TABLE feeds(namespace TEXT PRIMARY KEY REFERENCES namespaces(id), config BLOB NOT NULL,
 cursor TEXT, revision INTEGER NOT NULL DEFAULT 1);
