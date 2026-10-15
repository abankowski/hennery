use hennery_memory::store::{Query, Remember, Store};

fn memory(key: &str, body: &str) -> Remember {
    serde_json::from_value(serde_json::json!({"title":"Observation", "body":body,"idempotency_key":key})).unwrap()
}
#[test]
fn namespaces_isolate_search_recent_brief_and_idempotency() {
    let dir = tempfile::tempdir().unwrap();
    let s = Store::open(&dir.path().join("memory.db")).unwrap();
    let a = s.create("owner-a", "hat-a").unwrap();
    let b = s.create("owner-b", "hat-a").unwrap();
    let first = s.remember(&a.tool, memory("key", "private café alpha")).unwrap();
    assert_eq!(first, s.remember(&a.tool, memory("key", "private café alpha")).unwrap());
    assert!(s.remember(&a.tool, memory("key", "changed")).is_err());
    let q = Query::search("cafe");
    let before = s.search(&a.tool, &q).unwrap();
    assert_eq!(before.entries.len(), 1);
    assert!(s.search(&b.tool, &q).unwrap().entries.is_empty());
    for i in 0..12 {
        s.remember(&b.tool, memory(&i.to_string(), "cafe foreign")).unwrap();
    }
    assert_eq!(before, s.search(&a.tool, &q).unwrap());
    assert!(s.recent(&a.tool, &Query::default()).unwrap().entries.is_empty());
    assert!(
        s.brief(&a.tool, "cafe", None)
            .unwrap()
            .to_string()
            .contains("unverified")
    );
    assert!(s.search(&a.lifecycle, &q).is_err());
    assert!(s.remember("unknown", memory("x", "x")).is_err());
}
#[test]
fn fts_uses_literal_bounded_terms_not_syntax() {
    let dir = tempfile::tempdir().unwrap();
    let s = Store::open(&dir.path().join("memory.db")).unwrap();
    let a = s.create("owner", "hat").unwrap();
    s.remember(&a.tool, memory("k", "alpha café 東京")).unwrap();
    for q in ["alpha", "cafe", "東京"] {
        assert_eq!(s.search(&a.tool, &Query::search(q)).unwrap().entries.len(), 1);
    }
    for q in ["\" OR *", "NEAR(alpha)", "alpha' ; DROP TABLE entries; --"] {
        let _ = s.search(&a.tool, &Query::search(q)).unwrap();
    }
    assert!(s.search(&a.tool, &Query::search(&"a ".repeat(40))).is_err());
    assert_eq!(s.search(&a.tool, &Query::search("alpha")).unwrap().entries.len(), 1);
}
#[test]
fn redact_before_storage_index_and_dedup_bounds() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("memory.db");
    let s = Store::open(&path).unwrap();
    let a = s.create("o", "h").unwrap();
    let r = s
        .remember(&a.tool, memory("k", "HNRY_PLUGIN_DEADBEEF arbitrary-provider-secret"))
        .unwrap();
    assert!(r.redacted);
    let hit = s.search(&a.tool, &Query::search("arbitrary")).unwrap();
    assert!(!serde_json::to_string(&hit).unwrap().contains("DEADBEEF"));
    assert!(
        s.search(&a.tool, &Query::search("DEADBEEF"))
            .unwrap()
            .entries
            .is_empty()
    );
    assert!(s.remember(&a.tool, memory("large", &"x".repeat(16385))).is_err());
    let raw = rusqlite::Connection::open(&path).unwrap();
    let hashes: String = raw
        .query_row("SELECT tool_hash FROM namespaces", [], |r| r.get(0))
        .unwrap();
    assert!(!hashes.contains("hnry_"));
}
#[test]
fn query_cursor_is_bound_to_namespace_and_query_and_response_is_bounded() {
    let dir = tempfile::tempdir().unwrap();
    let s = Store::open(&dir.path().join("memory.db")).unwrap();
    let a = s.create("o", "a").unwrap();
    let b = s.create("o", "b").unwrap();
    for i in 0..25 {
        s.remember(&a.tool, memory(&i.to_string(), &format!("alpha {}", "x".repeat(15000))))
            .unwrap();
    }
    let mut q = Query::search("alpha");
    q.limit = Some(20);
    let page = s.search(&a.tool, &q).unwrap();
    assert!(serde_json::to_vec(&page).unwrap().len() <= 16384);
    let cursor = page.next_cursor.unwrap();
    q.cursor = Some(cursor.clone());
    assert!(!s.search(&a.tool, &q).unwrap().entries.is_empty());
    assert!(s.search(&b.tool, &q).is_err());
    q.query = Some("other".into());
    assert!(s.search(&a.tool, &q).is_err());
}

#[test]
fn empty_input_has_no_invented_brief_and_scoped_coverage_beats_recency() {
    let dir = tempfile::tempdir().unwrap();
    let s = Store::open(&dir.path().join("memory.db")).unwrap();
    let a = s.create("o", "h").unwrap();
    let best = s.remember(&a.tool, memory("a", "alpha beta")).unwrap();
    s.remember(&a.tool, memory("b", "alpha")).unwrap();
    assert_eq!(
        s.search(&a.tool, &Query::search("alpha beta")).unwrap().entries[0].id,
        best.id
    );
    assert_eq!(s.brief(&a.tool, "", None).unwrap()["sources"], serde_json::json!([]));
    assert_eq!(s.search(&a.tool, &Query::search("***")).unwrap().entries.len(), 0);
}

#[test]
fn different_redacted_inputs_still_conflict() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("m.db")).unwrap();
    let a = s.create("o", "h").unwrap();
    s.remember(&a.tool, memory("key", "hnry_plugin_aaaaaaaa")).unwrap();
    assert!(s.remember(&a.tool, memory("key", "hnry_plugin_bbbbbbbb")).is_err());
}
#[test]
fn redaction_expansion_cannot_exceed_persisted_field_bounds() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("m.db")).unwrap();
    let a = s.create("o", "h").unwrap();
    let mut m = memory("k", "body");
    m.tags = vec![format!("{}hnry_plugin_deadbeef", "x".repeat(44))];
    assert!(s.remember(&a.tool, m).is_err());
}
#[test]
fn escaped_entry_cannot_return_an_empty_nonadvancing_page() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("m.db")).unwrap();
    let a = s.create("o", "h").unwrap();
    let mut m = memory("k", &format!("alpha {}", "\0".repeat(1018)));
    m.title = "\0".repeat(160);
    m.tags = vec!["\0".repeat(64); 16];
    s.remember(&a.tool, m).unwrap();
    let page = s.search(&a.tool, &Query::search("alpha")).unwrap();
    assert_eq!(page.entries.len(), 1);
    assert!(page.entries[0].truncated);
    assert!(page.next_cursor.is_none());
    assert!(
        serde_json::to_vec(&serde_json::to_string(&page).unwrap())
            .unwrap()
            .len()
            < 16384
    );
}
