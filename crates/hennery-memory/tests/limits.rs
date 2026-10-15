use hennery_memory::store::{Entry, Remember, Store};
use rusqlite::params;
fn remember(key: &str, body: &str) -> Remember {
    serde_json::from_value(serde_json::json!({"title":"quota fixture","body":body,"idempotency_key":key})).unwrap()
}
fn fill(s: &Store, path: &std::path::Path, token: &str, namespace: &str, large: bool) {
    let body = if large { "x".repeat(16000) } else { "fixture".into() };
    s.remember(token, remember("seed", &body)).unwrap();
    let mut db = rusqlite::Connection::open(path).unwrap();
    let data: String = db
        .query_row("SELECT data FROM entries WHERE namespace=?1", [namespace], |r| r.get(0))
        .unwrap();
    let mut entry: Entry = serde_json::from_str(&data).unwrap();
    let total = if large {
        (64 * 1024 * 1024 - 1) / data.len()
    } else {
        10000
    };
    let tx = db.transaction().unwrap();
    {
        let mut insert = tx
            .prepare(
                "INSERT INTO entries(namespace,id,kind,project,title,body,data) VALUES(?1,?2,'memory',NULL,?3,?4,?5)",
            )
            .unwrap();
        for i in 1..total {
            entry.id = format!("{i:064x}");
            let data = serde_json::to_string(&entry).unwrap();
            insert
                .execute(params![namespace, entry.id, entry.title, entry.body, data])
                .unwrap();
        }
    }
    tx.commit().unwrap();
    if large {
        let bytes: i64 = db
            .query_row(
                "SELECT sum(length(CAST(data AS BLOB))) FROM entries WHERE namespace=?1",
                [namespace],
                |r| r.get(0),
            )
            .unwrap();
        assert!(bytes < 64 * 1024 * 1024 && bytes > 64 * 1024 * 1024 - 20000);
    }
}
#[test]
fn entry_quota_is_scoped_and_rejection_does_not_commit_an_entry_or_request() {
    let d = tempfile::tempdir().unwrap();
    let path = d.path().join("memory.db");
    let s = Store::open(&path).unwrap();
    let a = s.create("owner", "a").unwrap();
    let b = s.create("owner", "b").unwrap();
    fill(&s, &path, &a.tool, &a.namespace, false);
    assert!(s.remember(&a.tool, remember("overflow", "excess")).is_err());
    assert!(s.remember(&b.tool, remember("other", "independent")).is_ok());
    let db = rusqlite::Connection::open(&path).unwrap();
    assert_eq!(
        db.query_row("SELECT count(*) FROM entries WHERE namespace=?1", [&a.namespace], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        10000
    );
    assert_eq!(
        db.query_row(
            "SELECT count(*) FROM requests WHERE namespace=?1",
            [&a.namespace],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        1
    );
}
#[test]
fn byte_quota_includes_the_new_canonical_entry_before_commit() {
    let d = tempfile::tempdir().unwrap();
    let path = d.path().join("memory.db");
    let s = Store::open(&path).unwrap();
    let a = s.create("owner", "hat").unwrap();
    fill(&s, &path, &a.tool, &a.namespace, true);
    assert!(
        s.remember(&a.tool, remember("overflow", &"y".repeat(16384))).is_err(),
        "the pending entry must count against the namespace byte budget"
    );
    let db = rusqlite::Connection::open(&path).unwrap();
    let bytes: i64 = db
        .query_row(
            "SELECT sum(length(CAST(data AS BLOB))) FROM entries WHERE namespace=?1",
            [&a.namespace],
            |r| r.get(0),
        )
        .unwrap();
    assert!(bytes <= 64 * 1024 * 1024);
    assert_eq!(
        db.query_row(
            "SELECT count(*) FROM requests WHERE namespace=?1",
            [&a.namespace],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        1
    );
}
