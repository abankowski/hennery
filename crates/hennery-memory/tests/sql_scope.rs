/// Every string literal in `source`, in order, skipping comments and char
/// literals. Enough of Rust's lexer for these files: plain and raw
/// strings, the common escapes and line continuations.
fn string_literals(source: &str) -> Vec<String> {
    let s: Vec<char> = source.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < s.len() {
        let rest = &s[i..];
        if rest.starts_with(&['/', '/']) {
            while i < s.len() && s[i] != '\n' {
                i += 1;
            }
        } else if rest.starts_with(&['/', '*']) {
            i += 2;
            while i + 1 < s.len() && !(s[i] == '*' && s[i + 1] == '/') {
                i += 1;
            }
            i += 2;
        } else if s[i] == 'r'
            && matches!(s.get(i + 1), Some('"' | '#'))
            && (i == 0 || !(s[i - 1].is_alphanumeric() || s[i - 1] == '_'))
        {
            let mut hashes = 0;
            i += 1;
            while s[i] == '#' {
                hashes += 1;
                i += 1;
            }
            i += 1;
            let mut lit = String::new();
            loop {
                if s[i] == '"' && s[i + 1..].iter().take(hashes).filter(|c| **c == '#').count() == hashes {
                    i += 1 + hashes;
                    break;
                }
                lit.push(s[i]);
                i += 1;
            }
            out.push(lit);
        } else if s[i] == '"' {
            i += 1;
            let mut lit = String::new();
            while s[i] != '"' {
                if s[i] == '\\' {
                    i += 1;
                    match s[i] {
                        'n' => lit.push('\n'),
                        't' => lit.push('\t'),
                        '\n' => {
                            while s[i + 1].is_whitespace() {
                                i += 1;
                            }
                        }
                        c => lit.push(c),
                    }
                } else {
                    lit.push(s[i]);
                }
                i += 1;
            }
            i += 1;
            out.push(lit);
        } else if s[i] == '\'' {
            // A char literal ('x', '\n', '"'), or a lifetime ('a).
            if s.get(i + 1) == Some(&'\\') {
                i += 2;
                while s[i] != '\'' {
                    i += 1;
                }
                i += 1;
            } else if s.get(i + 2) == Some(&'\'') {
                i += 3;
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    out
}

#[test]
fn every_memory_statement_prepares_and_scopes_before_data_access() {
    let db = rusqlite::Connection::open_in_memory().unwrap();
    db.execute_batch(include_str!("../src/schema.sql")).unwrap();
    db.execute_batch(include_str!("../src/schema2.sql")).unwrap();
    db.execute_batch(include_str!("../src/schema3.sql")).unwrap();
    db.execute_batch(include_str!("../src/schema4.sql")).unwrap();
    let source = include_str!("../src/store.rs");
    let fragments = string_literals(source);
    let coverage = fragments
        .iter()
        .find(|s| s.starts_with("CASE WHEN "))
        .expect("actual coverage SQL")
        .replace("{}", "7");
    let mut count = [0, 0, 0, 0];
    for (file, source) in [
        source,
        include_str!("../src/consumer.rs"),
        include_str!("../src/management.rs"),
        include_str!("../src/import.rs"),
    ]
    .into_iter()
    .enumerate()
    {
        for sql in string_literals(source).into_iter().filter(|s| {
            ["SELECT ", "INSERT ", "DELETE ", "UPDATE "]
                .iter()
                .any(|v| s.starts_with(v))
        }) {
            count[file] += 1;
            let tables = if sql.contains("{table}") {
                vec![
                    "entries",
                    "sources",
                    "requests",
                    "suppressed",
                    "seen",
                    "feeds",
                    "receipts",
                    "imports",
                ]
            } else {
                vec!["entries"]
            };
            for table in tables {
                let sql = sql
                    .replace("{table}", table)
                    .replace("{column}", "tool_hash")
                    .replace("{coverage}", &coverage)
                    .replace("{}", "0");
                db.prepare(&sql).unwrap_or_else(|e| panic!("{sql}: {e}"));
                if sql.starts_with("SELECT seq,id,data FROM entries ") {
                    let mut stmt = db.prepare(&format!("EXPLAIN QUERY PLAN {sql}")).unwrap();
                    let descriptions = stmt
                        .query_map(["scope", "memory", "0", "10000"], |r| r.get::<_, String>(3))
                        .unwrap()
                        .collect::<rusqlite::Result<Vec<_>>>()
                        .unwrap();
                    assert!(
                        descriptions.iter().any(|s| s.contains("scoped_entries")),
                        "reset keyset reads need the namespace/kind/seq index: {descriptions:?}"
                    );
                    assert!(
                        !descriptions.iter().any(|s| s.contains("TEMP B-TREE")),
                        "reset chunks must not sort the entire corpus: {descriptions:?}"
                    );
                }
                let compact = sql.split_whitespace().collect::<String>();
                if file >= 2 && sql.contains(" FROM namespaces ") {
                    assert!(sql.contains("owner=?"), "management owner boundary: {sql}");
                    continue;
                }
                if file == 2 && sql.contains("ui_bindings") {
                    assert!(
                        sql == "SELECT owner FROM ui_bindings WHERE principal=?1"
                            || sql == "INSERT INTO ui_bindings(principal,owner) VALUES(?1,?2)",
                        "local immutable auth binding: {sql}"
                    );
                    continue;
                }
                if sql.starts_with("INSERT INTO namespaces(") {
                    continue;
                } // Explicit local bootstrap, never a mounted operation.
                if sql.contains("FROM namespaces WHERE tool_hash=?1") {
                    continue;
                } // Credential lookup fixes immutable namespace.
                if sql.contains("FROM namespaces WHERE id=?1")
                    || (sql.starts_with("UPDATE namespaces ") && sql.contains("WHERE id=?1"))
                {
                    continue;
                } // Credential-selected or filesystem-owner namespace metadata.
                if ["SELECT count(*) FROM feeds","SELECT EXISTS(SELECT 1 FROM feeds)","SELECT f.namespace FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE n.state='active' ORDER BY f.namespace LIMIT 129"].contains(&sql.as_str()){continue;} // Bounded local worker/key inventory only; never exposed to mounted tools.
                assert!(
                    compact.contains("namespace=?") || (sql.starts_with("INSERT ") && compact.contains("(namespace,")),
                    "missing parameterized namespace: {sql}"
                );
                if sql.contains("entries_fts MATCH") {
                    assert!(sql.contains("rowid=e.seq"), "FTS must be correlated to the scoped row");
                    let plan = format!("EXPLAIN QUERY PLAN {sql}");
                    let mut stmt = db.prepare(&plan).unwrap();
                    let mut query = stmt.raw_query();
                    let mut descriptions = Vec::new();
                    while let Some(r) = query.next().unwrap() {
                        descriptions.push(r.get::<_, String>(3).unwrap());
                    }
                    assert!(descriptions.iter().any(|s| s.contains("CORRELATED")));
                    assert!(
                        !descriptions.iter().any(|s| s.contains("LIST SUBQUERY")),
                        "{descriptions:?}"
                    );
                }
            }
        }
    }
    assert_eq!(count, [10, 52, 14, 7], "new statements need explicit audit coverage");
}
